const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const fs = require('fs');
const USER_DATA_DIR = path.join(__dirname, 'browser_data', 'ai_pacaa');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

// User Data 초기화
if (fs.existsSync(USER_DATA_DIR)) fs.rmSync(USER_DATA_DIR, { recursive: true });
fs.mkdirSync(USER_DATA_DIR, { recursive: true });

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

  // 쿠키 주입 — Instagram
  await page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 2000));

  const igCookies = [
    { name: 'ig_nrcb', value: '1', domain: '.instagram.com', path: '/' },
    { name: 'dpr', value: '1', domain: '.instagram.com', path: '/' },
    { name: 'csrftoken', value: 'UgEi014VRLdvObtfFwHLz0UNLILJGhVV', domain: '.instagram.com', path: '/' },
    { name: 'ds_user_id', value: '37985606916', domain: '.instagram.com', path: '/' },
    { name: 'wd', value: '1516x1012', domain: '.instagram.com', path: '/' },
    { name: 'sessionid', value: '37985606916%3AneuRN5aH9YUtdK%3A8%3AAYg9SMqXBGwo3u59Felkx63dROxYKHFZ8x7fLymlvQ', domain: '.instagram.com', path: '/', httpOnly: true },
    { name: 'rur', value: 'VCN\\05437985606916\\0541806167157:01fe8425384d6fedb1fad40aadeb40bca0f48c4e1d7aa86d381119121d8e39dc1c46d3b0', domain: '.instagram.com', path: '/', httpOnly: true },
  ];

  await page.context().addCookies(igCookies);
  console.log('Instagram 쿠키 주입 완료');

  // 쿠키 주입 — Threads
  const threadsCookies = [
    { name: 'mid', value: 'abQE3QALAAFnjvrWETd5vcj3eEFL', domain: '.threads.net', path: '/' },
    { name: 'dpr', value: '1', domain: '.threads.net', path: '/' },
    { name: 'csrftoken', value: '0MySfrWsoMye5Cm35CcL2DbHpz57DOSy', domain: '.threads.net', path: '/' },
    { name: 'ds_user_id', value: '35527396544', domain: '.threads.net', path: '/' },
    { name: 'sessionid', value: '37985606916%3AneuRN5aH9YUtdK%3A8%3AAYg9SMqXBGwo3u59Felkx63dROxYKHFZ8x7fLymlvQ', domain: '.threads.net', path: '/', httpOnly: true },
    { name: 'rur', value: 'VCN\\05437985606916\\0541806167157:01fe8425384d6fedb1fad40aadeb40bca0f48c4e1d7aa86d381119121d8e39dc1c46d3b0', domain: '.threads.net', path: '/', httpOnly: true },
  ];

  await page.context().addCookies(threadsCookies);
  console.log('Threads 쿠키 주입 완료');

  // Threads 로그인 확인
  console.log('\nThreads 이동...');
  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 5000));

  await page.screenshot({ path: '/tmp/cookie_test_home.png', fullPage: false });
  console.log(`URL: ${page.url()}`);

  // GraphQL 인터셉터
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

  // 팔로우 테스트
  console.log('\n@specal1849 프로필 이동...');
  await page.goto('https://www.threads.net/@specal1849', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 5000));

  await page.screenshot({ path: '/tmp/cookie_test_profile.png', fullPage: false });

  try {
    const followBtn = page.getByRole('button', { name: /^follow$|^팔로우$/i });
    await followBtn.waitFor({ state: 'visible', timeout: 5000 });
    console.log('팔로우 버튼 발견, evaluate click...');
    await followBtn.evaluate(node => node.click());
    console.log('클릭 완료, 5초 대기...');
    await new Promise(r => setTimeout(r, 5000));
  } catch (e) {
    console.log(`에러: ${e.message.substring(0, 100)}`);
  }

  console.log(`\nGraphQL 결과: ${graphqlResults.length}건`);
  graphqlResults.forEach(r => console.log(`  ${r.status}: ${r.body.substring(0, 200)}`));

  if (graphqlResults.length > 0 && graphqlResults[0].status === 200) {
    console.log('\n✅ 성공! 형이 Threads에서 확인해봐!');
  } else if (graphqlResults.length > 0) {
    console.log(`\n❌ GraphQL 응답 코드: ${graphqlResults[0].status}`);
  } else {
    console.log('\n❌ GraphQL 요청 미발생 — 여전히 React 이벤트 트리거 실패');
  }

  await browser.close().catch(() => {});
})();
