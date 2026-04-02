const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const USER_DATA_DIR = '/home/kkk/.config/google-chrome-for-testing';
const EXEC_PATH = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
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
  await sleep(5000);
  await page.screenshot({ path: '/tmp/debug_feed.png' });

  // 첫 글의 SVG와 버튼 전체 덤프
  const info = await page.evaluate(() => {
    const posts = document.querySelectorAll('[data-pressable-container]');
    if (!posts.length) return { error: 'no posts', bodyText: document.body.innerText.substring(0, 300) };
    const post = posts[0];
    const svgs = [];
    post.querySelectorAll('svg').forEach(s => {
      const r = s.getBoundingClientRect();
      if (r.width > 0) svgs.push({ aria: s.getAttribute('aria-label'), parentHTML: s.parentElement?.outerHTML?.substring(0, 100), pos: `${Math.round(r.x)},${Math.round(r.y)}` });
    });
    const buttons = [];
    post.querySelectorAll('[role="button"]').forEach(b => {
      const r = b.getBoundingClientRect();
      if (r.width > 0) buttons.push({ aria: b.getAttribute('aria-label'), text: (b.innerText||'').substring(0, 30), html: b.outerHTML.substring(0, 150), pos: `${Math.round(r.x)},${Math.round(r.y)}` });
    });
    return { postCount: posts.length, svgs, buttons };
  });
  console.log(`Posts: ${info.postCount}`);
  console.log('SVGs:', JSON.stringify(info.svgs, null, 2));
  console.log('Buttons:', JSON.stringify(info.buttons, null, 2));

  // 좋아요 상태 확인 - 상세 페이지에서
  const link = await page.locator('[data-pressable-container]').nth(1).locator('a[href*="/post/"]').first().getAttribute('href').catch(() => null);
  if (link) {
    const fullUrl = link.startsWith('http') ? link : `https://www.threads.net${link}`;
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(5000);
    await page.screenshot({ path: '/tmp/debug_detail.png' });

    const detailInfo = await page.evaluate(() => {
      const svgs = [];
      document.querySelectorAll('svg').forEach(s => {
        const r = s.getBoundingClientRect();
        if (r.width > 0 && r.y > 0) svgs.push({ aria: s.getAttribute('aria-label'), pos: `${Math.round(r.x)},${Math.round(r.y)}`, parentRole: s.parentElement?.getAttribute('role') });
      });
      const inputs = [];
      document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"], input').forEach(el => {
        const r = el.getBoundingClientRect();
        inputs.push({ tag: el.tagName, role: el.getAttribute('role'), ce: el.getAttribute('contenteditable'), pos: `${Math.round(r.x)},${Math.round(r.y)}`, vis: getComputedStyle(el).visibility });
      });
      const bottomText = document.body.innerText.substring(document.body.innerText.length - 400);
      return { svgs, inputs, bottomText };
    });
    console.log('\nDetail SVGs:', JSON.stringify(detailInfo.svgs.filter(s => /좋아요|답글|리포스트|공유/i.test(s.aria || '')), null, 2));
    console.log('Inputs:', JSON.stringify(detailInfo.inputs, null, 2));
    console.log('Bottom text:', detailInfo.bottomText);
  }

  await browser.close().catch(() => {});
})();
