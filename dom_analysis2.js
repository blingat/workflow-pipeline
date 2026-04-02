const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const USER_DATA_DIR = '/home/kkk/.config/google-chrome-for-testing';
const EXEC_PATH = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { require('fs').unlinkSync(require('path').join(USER_DATA_DIR, f)); } catch {} });

const svgClick = async (page, ariaLabel) => {
  const svg = page.locator(`svg[aria-label="${ariaLabel}"]`).first();
  await svg.waitFor({ state: 'visible', timeout: 3000 });
  const box = await svg.boundingBox();
  if (!box) throw new Error('no box');
  await page.mouse.move(box.x + box.width * rand(30,70)/100, box.y + box.height * rand(30,70)/100);
  await sleep(rand(200, 500));
  await svg.click({ force: true, delay: rand(80, 200) });
};

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, noViewPort: true, executablePath: EXEC_PATH,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });

  // ===== REPOST: 팝업 구조 분석 =====
  console.log('===== REPOST popup analysis =====');
  await page.goto('https://www.threads.net/@gpt_park', { waitUntil: 'networkidle', timeout: 20000 });
  await sleep(5000);
  
  // 리포스트 SVG 클릭
  await svgClick(page, '리포스트');
  await sleep(2000);
  
  // 팝업 전체 덤프
  const popupAnalysis = await page.evaluate(() => {
    const result = { dialogs: [], menus: [], allButtons: [] };
    
    // role="dialog"
    document.querySelectorAll('[role="dialog"], [role="menu"], [role="listbox"]').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0) {
        result.dialogs.push({
          role: el.getAttribute('role'),
          text: el.innerText?.substring(0, 200),
          html: el.outerHTML.substring(0, 500),
          rect: `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        });
      }
    });
    
    // data-pressable-container in popup area
    document.querySelectorAll('[data-pressable-container]').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.y > 300) { // 하단 팝업 영역
        const text = el.innerText?.trim();
        if (text) {
          result.menus.push({ text: text.substring(0, 50), html: el.outerHTML.substring(0, 200), pos: `${Math.round(rect.x)},${Math.round(rect.y)}` });
        }
      }
    });

    // 모든 버튼 전체 덤프
    document.querySelectorAll('[role="button"]').forEach(btn => {
      const rect = btn.getBoundingClientRect();
      if (rect.width > 0 && rect.y > 300) {
        result.allButtons.push({
          ariaLabel: btn.getAttribute('aria-label'),
          text: (btn.innerText || '').substring(0, 30),
          html: btn.outerHTML.substring(0, 200),
          pos: `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        });
      }
    });

    return result;
  });
  
  console.log(`Dialogs: ${popupAnalysis.dialogs.length}`);
  popupAnalysis.dialogs.forEach((d, i) => console.log(`  [${i}] role="${d.role}" text="${d.text.substring(0, 100)}" rect="${d.rect}"`));
  console.log(`Menu items: ${popupAnalysis.menus.length}`);
  popupAnalysis.menus.forEach((m, i) => console.log(`  [${i}] text="${m.text}" pos="${m.pos}" html="${m.html.substring(0, 100)}"`));
  console.log(`Bottom buttons: ${popupAnalysis.allButtons.length}`);
  popupAnalysis.allButtons.forEach((b, i) => console.log(`  [${i}] aria="${b.ariaLabel}" text="${b.text}" html="${b.html.substring(0, 100)}"`));
  
  await page.screenshot({ path: '/tmp/repost_popup.png' });
  await page.keyboard.press('Escape');

  // ===== COMMENT: Reply 클릭 후 DOM 변화 분석 =====
  console.log('\n===== COMMENT: Reply click analysis =====');
  await page.goto('https://www.threads.net/@realaiforyou/post/DGSY20iPFsb', { waitUntil: 'networkidle', timeout: 20000 });
  await sleep(5000);

  // Reply 클릭 전
  const before = await page.evaluate(() => document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]').length);
  console.log(`Before reply: ${before} input elements`);

  // Reply 클릭
  await svgClick(page, '답글');
  
  // 3초 후
  await sleep(3000);
  const after3 = await page.evaluate(() => {
    const result = { inputs: [], newElements: [] };
    document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"], input[type="text"]').forEach(el => {
      const rect = el.getBoundingClientRect();
      result.inputs.push({
        tag: el.tagName, role: el.getAttribute('role'), ce: el.getAttribute('contenteditable'),
        display: getComputedStyle(el).display, visibility: getComputedStyle(el).visibility,
        rect: `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
      });
    });
    // 하단에 새로 나타난 요소들
    document.querySelectorAll('[role="textbox"], [contenteditable="true"], textarea, form').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.y > 800) {
        result.newElements.push({
          tag: el.tagName, role: el.getAttribute('role'),
          html: el.outerHTML.substring(0, 300),
          rect: `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
        });
      }
    });
    return result;
  });
  console.log(`After 3s: ${after3.inputs.length} inputs`);
  after3.inputs.forEach((t, i) => console.log(`  [${i}] <${t.tag}> role="${t.role}" ce="${t.ce}" d="${t.display}" v="${t.visibility}" rect="${t.rect}"`));
  console.log(`New bottom elements: ${after3.newElements.length}`);
  after3.newElements.forEach((e, i) => console.log(`  [${i}] <${e.tag}> role="${e.role}" html="${e.html.substring(0, 150)}"`));
  
  await page.screenshot({ path: '/tmp/reply_after.png' });

  await browser.close().catch(() => {});
  console.log('\n===== DONE =====');
})();
