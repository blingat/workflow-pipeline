const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const USER_DATA_DIR = '/home/kkk/.config/google-chrome-for-testing';
const EXEC_PATH = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';

['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { require('fs').unlinkSync(require('path').join(USER_DATA_DIR, f)); } catch {} });

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, noViewPort: true, executablePath: EXEC_PATH,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });

  await page.goto('https://www.threads.net/@realaiforyou', { waitUntil: 'networkidle', timeout: 20000 });
  await new Promise(r => setTimeout(r, 5000));

  const analysis = await page.evaluate(() => {
    const posts = document.querySelectorAll('[data-pressable-container]');
    if (posts.length === 0) return { error: 'no posts' };
    const post = posts[0];
    const buttons = [];
    const svgs = [];
    
    post.querySelectorAll('button, [role="button"]').forEach(btn => {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        buttons.push({
          tag: btn.tagName, role: btn.getAttribute('role'),
          ariaLabel: btn.getAttribute('aria-label'),
          title: btn.getAttribute('title'),
          text: (btn.innerText || '').substring(0, 30),
          html: btn.outerHTML.substring(0, 300),
          pos: `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        });
      }
    });
    
    post.querySelectorAll('svg').forEach(svg => {
      const rect = svg.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        const paths = [];
        svg.querySelectorAll('path').forEach(p => paths.push((p.getAttribute('d') || '').substring(0, 40)));
        svgs.push({
          ariaLabel: svg.getAttribute('aria-label'),
          parentRole: svg.parentElement?.getAttribute('role'),
          parentAriaLabel: svg.parentElement?.getAttribute('aria-label'),
          parentHTML: svg.parentElement?.outerHTML?.substring(0, 200),
          paths, pos: `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        });
      }
    });
    
    return { postCount: posts.length, buttons, svgs };
  });

  console.log(`Posts: ${analysis.postCount}`);
  console.log('\n=== BUTTONS ===');
  analysis.buttons.forEach((b, i) => {
    console.log(`[${i}] <${b.tag}> role="${b.role}" aria="${b.ariaLabel}" title="${b.title}" text="${b.text}"`);
    console.log(`    pos=(${b.pos})`);
    console.log(`    HTML: ${b.html}`);
    console.log('');
  });

  console.log('=== SVGs ===');
  analysis.svgs.forEach((s, i) => {
    console.log(`[${i}] aria="${s.ariaLabel}" parentRole="${s.parentRole}" parentAria="${s.parentAriaLabel}"`);
    console.log(`    paths: ${s.paths.join(' | ')}`);
    console.log(`    parentHTML: ${s.parentHTML}`);
    console.log('');
  });

  await page.screenshot({ path: '/tmp/dom_analysis.png' });

  // Detail page
  console.log('\n=== DETAIL PAGE ===');
  const link = await page.evaluate(() => {
    const posts = document.querySelectorAll('[data-pressable-container]');
    if (posts.length < 2) return null;
    const a = posts[1].querySelector('a[href*="/post/"]');
    return a ? a.href : null;
  });
  if (link) {
    await page.goto(link, { waitUntil: 'networkidle', timeout: 20000 });
    await new Promise(r => setTimeout(r, 5000));
    
    const detail = await page.evaluate(() => {
      const result = { buttons: [], inputs: [] };
      document.querySelectorAll('button, [role="button"]').forEach(btn => {
        const rect = btn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          result.buttons.push({
            ariaLabel: btn.getAttribute('aria-label'), text: (btn.innerText || '').substring(0, 30),
            html: btn.outerHTML.substring(0, 200),
            pos: `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
          });
        }
      });
      document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"], input[type="text"]').forEach(el => {
        const rect = el.getBoundingClientRect();
        result.inputs.push({
          tag: el.tagName, role: el.getAttribute('role'), ce: el.getAttribute('contenteditable'),
          display: getComputedStyle(el).display, visibility: getComputedStyle(el).visibility,
          pos: `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        });
      });
      return result;
    });
    
    console.log(`Buttons: ${detail.buttons.length}`);
    detail.buttons.forEach((b, i) => console.log(`  [${i}] aria="${b.ariaLabel}" text="${b.text}" html="${b.html.substring(0, 100)}"`));
    console.log(`Inputs: ${detail.inputs.length}`);
    detail.inputs.forEach((t, i) => console.log(`  [${i}] <${t.tag}> role="${t.role}" ce="${t.ce}" display="${t.display}" visibility="${t.visibility}"`));
    await page.screenshot({ path: '/tmp/detail_analysis.png' });
  }

  await browser.close().catch(() => {});
})();
