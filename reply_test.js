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

  // 상세 페이지로 이동
  console.log('Going to detail page...');
  await page.goto('https://www.threads.net/@realaiforyou/post/DGSY20iPFsb', { waitUntil: 'networkidle', timeout: 20000 });
  await sleep(5000);

  // 방법 1: SVG click force
  console.log('\n=== Method 1: SVG click({force:true}) ===');
  try {
    const svg = page.locator('svg[aria-label="답글"]').first();
    const before = await page.evaluate(() => document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]').length);
    await svg.click({ force: true, delay: rand(80, 200) });
    await sleep(3000);
    const after = await page.evaluate(() => document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]').length);
    console.log(`Before: ${before}, After: ${after}`);
  } catch(e) { console.log(`Error: ${e.message.substring(0, 60)}`); }

  // 닫기
  await page.keyboard.press('Escape');
  await sleep(1000);

  // 방법 2: dispatchEvent (pointer + mouse chain)
  console.log('\n=== Method 2: dispatchEvent pointer/mouse chain ===');
  try {
    const svgHandle = await page.locator('svg[aria-label="답글"]').first().elementHandle({ timeout: 3000 });
    const before = await page.evaluate(() => document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]').length);
    await page.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 };
      el.dispatchEvent(new PointerEvent('pointerdown', opts));
      el.dispatchEvent(new PointerEvent('pointerup', { ...opts, button: 0, buttons: 0 }));
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    }, svgHandle);
    await sleep(3000);
    const after = await page.evaluate(() => document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]').length);
    console.log(`Before: ${before}, After: ${after}`);
  } catch(e) { console.log(`Error: ${e.message.substring(0, 60)}`); }

  // 닫기
  await page.keyboard.press('Escape');
  await sleep(1000);

  // 방법 3: 부모 요소 (pressable container) dispatchEvent
  console.log('\n=== Method 3: Parent pressable container dispatchEvent ===');
  try {
    const parentHandle = await page.locator('svg[aria-label="답글"]').first().locator('xpath=./ancestor::*[@data-pressable-container][1]').elementHandle({ timeout: 3000 });
    const before = await page.evaluate(() => document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]').length);
    await page.evaluate(el => {
      const rect = el.getBoundingClientRect();
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 };
      el.dispatchEvent(new PointerEvent('pointerdown', opts));
      el.dispatchEvent(new PointerEvent('pointerup', { ...opts, button: 0, buttons: 0 }));
      el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
      el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
      el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    }, parentHandle);
    await sleep(3000);
    const after = await page.evaluate(() => document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]').length);
    console.log(`Before: ${before}, After: ${after}`);
  } catch(e) { console.log(`Error: ${e.message.substring(0, 60)}`); }

  // 닫기
  await page.keyboard.press('Escape');
  await sleep(1000);

  // 방법 4: focus + click (React focus trap 해결)
  console.log('\n=== Method 4: focus then click ===');
  try {
    const svg = page.locator('svg[aria-label="답글"]').first();
    await svg.focus();
    await sleep(500);
    await svg.click({ force: true });
    await sleep(3000);
    const after = await page.evaluate(() => document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]').length);
    console.log(`After: ${after}`);
  } catch(e) { console.log(`Error: ${e.message.substring(0, 60)}`); }

  // 닫기
  await page.keyboard.press('Escape');
  await sleep(1000);

  // 방법 5: page.click (coordinate click)
  console.log('\n=== Method 5: page.click coordinates ===');
  try {
    const box = await page.locator('svg[aria-label="답글"]').first().boundingBox({ timeout: 3000 });
    const before = await page.evaluate(() => document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]').length);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { delay: rand(100, 200) });
    await sleep(3000);
    const after = await page.evaluate(() => document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]').length);
    console.log(`Before: ${before}, After: ${after}`);
  } catch(e) { console.log(`Error: ${e.message.substring(0, 60)}`); }

  // 방법 6: double click
  console.log('\n=== Method 6: dblclick ===');
  try {
    await page.keyboard.press('Escape');
    await sleep(1000);
    const svg = page.locator('svg[aria-label="답글"]').first();
    await svg.click({ force: true, clickCount: 2 });
    await sleep(3000);
    const after = await page.evaluate(() => document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]').length);
    console.log(`After: ${after}`);
  } catch(e) { console.log(`Error: ${e.message.substring(0, 60)}`); }

  // 최종 스크린샷
  await page.screenshot({ path: '/tmp/reply_test.png' });
  console.log('\nScreenshot saved to /tmp/reply_test.png');

  // DOM 덤프: 하단 영역 전체
  const bottomDOM = await page.evaluate(() => {
    const body = document.body.innerText;
    // 하단 500자
    return body.substring(body.length - 500);
  });
  console.log('\n=== Bottom of page text ===');
  console.log(bottomDOM);

  await browser.close().catch(() => {});
  console.log('\n===== DONE =====');
})();
