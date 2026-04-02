const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const fs = require('fs');
const USER_DATA_DIR = path.join(__dirname, 'browser_data', 'ai_pacaa');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { fs.unlinkSync(path.join(USER_DATA_DIR, f)); } catch {} });

const graphqlResults = [];
const setupInterceptor = (page, label) => {
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/graphql') && response.request().method() === 'POST') {
      const reqData = response.request().postData() || '';
      if (reqData.includes('like') || reqData.includes('follow') || reqData.includes('Like') || reqData.includes('Follow')) {
        console.log(`\n[💥 ${label}] GraphQL Mutation 감지!`);
        console.log(`  Status: ${response.status()}`);
        try {
          const body = await response.text();
          console.log(`  Body: ${body.substring(0, 400)}`);
          graphqlResults.push({ label, status: response.status(), body: body.substring(0, 400) });
        } catch {
          console.log(`  Body: 읽을 수 없음`);
          graphqlResults.push({ label, status: response.status(), body: 'unreadable' });
        }
      }
    }
  });
};

(async () => {
  // ===== 테스트 1: element.click({ force: true, delay: 150 }) =====
  console.log('\n========== 테스트 1: Trusted Click (force + delay) ==========\n');

  let browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, userAgent: UA,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  let page = browser.pages()[0] || await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  setupInterceptor(page, 'TrustedClick');

  console.log('로그인 확인...');
  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log('@specal1849 프로필 이동...');
  await page.goto('https://www.threads.net/@specal1849', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 4000));

  try {
    const followBtn = page.getByRole('button', { name: /^follow$|^팔로우$/i });
    await followBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('팔로우 버튼 발견, element.click({ force: true, delay: 150 })...');
    await followBtn.click({ force: true, delay: 150 });
    console.log('클릭 완료, 5초 대기...');
    await new Promise(r => setTimeout(r, 5000));
  } catch (e) {
    console.log(`에러: ${e.message.substring(0, 100)}`);
  }

  if (graphqlResults.length === 0) {
    console.log('[TrustedClick] GraphQL 요청 없음');
  }

  await browser.close().catch(() => {});
  await new Promise(r => setTimeout(r, 3000));

  // ===== 테스트 2: element.evaluate(node => node.click()) =====
  console.log('\n========== 테스트 2: JS Injection Click ==========\n');

  ['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { fs.unlinkSync(path.join(USER_DATA_DIR, f)); } catch {} });

  browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, userAgent: UA,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  page = browser.pages()[0] || await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  setupInterceptor(page, 'JSInjection');

  console.log('로그인 확인...');
  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log('@aitrendmaster 프로필 이동...');
  await page.goto('https://www.threads.net/@aitrendmaster', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 4000));

  try {
    const followBtn = page.getByRole('button', { name: /^follow$|^팔로우$/i });
    await followBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('팔로우 버튼 발견, element.evaluate(node => node.click())...');
    await followBtn.evaluate(node => node.click());
    console.log('클릭 완료, 5초 대기...');
    await new Promise(r => setTimeout(r, 5000));
  } catch (e) {
    console.log(`에러: ${e.message.substring(0, 100)}`);
  }

  if (graphqlResults.filter(r => r.label === 'JSInjection').length === 0) {
    console.log('[JSInjection] GraphQL 요청 없음');
  }

  await browser.close().catch(() => {});

  // ===== 요약 =====
  console.log('\n========== 결과 요약 ==========');
  console.log(`총 GraphQL Mutation: ${graphqlResults.length}건`);
  graphqlResults.forEach((r, i) => {
    console.log(`  #${i+1} [${r.label}] ${r.status}: ${r.body.substring(0, 150)}`);
  });
  if (graphqlResults.length === 0) {
    console.log('  ❌ 두 방식 모두 GraphQL 요청 미발생');
    console.log('  → Playwright click이 React Synthetic Event를 트리거하지 못함');
  }
})();
