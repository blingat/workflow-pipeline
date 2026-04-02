const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const USER_DATA_DIR = path.join(__dirname, 'browser_data', 'ai_pacaa');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';
const fs = require('fs');

['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { fs.unlinkSync(path.join(USER_DATA_DIR, f)); } catch {} });

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, userAgent: UA,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  // Instagram 로그인 페이지로 직접
  console.log('Instagram 로그인 페이지 이동...');
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));

  await page.screenshot({ path: '/tmp/instagram_login.png', fullPage: false });
  console.log('스크린샷: /tmp/instagram_login.png');
  console.log(`URL: ${page.url()}`);

  // 10분 대기 — 형이 VNC로 로그인
  console.log('\n===== 형, VNC로 접속해서 로그인해줘 =====');
  console.log('ID: ai.pacaa');
  console.log('PW: tkdfhrtn0!');
  console.log('로그인 후 자동으로 Threads로 이동해서 팔로우 테스트함');
  console.log('10분간 대기...');

  await new Promise(r => setTimeout(r, 600000));

  // 로그인 후 Threads 테스트
  console.log('\n===== 로그인 후 팔로우 테스트 =====');

  const graphqlResults = [];
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('/api/graphql') && response.request().method() === 'POST') {
      const reqData = response.request().postData() || '';
      if (reqData.includes('like') || reqData.includes('follow') || reqData.includes('Like') || reqData.includes('Follow')) {
        console.log(`\n[💥] GraphQL Mutation!`);
        console.log(`  Status: ${response.status()}`);
        try {
          const body = await response.text();
          console.log(`  Body: ${body.substring(0, 400)}`);
          graphqlResults.push({ status: response.status(), body: body.substring(0, 400) });
        } catch {
          console.log('  Body: 읽을 수 없음');
        }
      }
    }
  });

  await page.goto('https://www.threads.net/@specal1849', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 5000));

  await page.screenshot({ path: '/tmp/after_login_profile.png', fullPage: false });

  try {
    const followBtn = page.getByRole('button', { name: /^follow$|^팔로우$/i });
    await followBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('팔로우 버튼 발견, evaluate click...');
    await followBtn.evaluate(node => node.click());
    await new Promise(r => setTimeout(r, 5000));
  } catch (e) {
    console.log(`에러: ${e.message.substring(0, 100)}`);
  }

  console.log(`\nGraphQL 결과: ${graphqlResults.length}건`);
  graphqlResults.forEach(r => console.log(`  ${r.status}: ${r.body.substring(0, 150)}`));

  await browser.close().catch(() => {});
})();
