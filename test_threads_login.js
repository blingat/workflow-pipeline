const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'ko-KR',
  });
  const page = await context.newPage();

  console.log('1. threads.net 접속...');
  await page.goto('https://www.threads.net/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: '/tmp/threads_1_home.png' });
  console.log('   → 홈페이지 로드됨');

  // 로그인 버튼 찾기
  console.log('2. 로그인 페이지 이동...');
  await page.goto('https://www.threads.net/login', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: '/tmp/threads_2_login.png' });
  console.log('   → 로그인 페이지 로드됨');

  // 인스타 ID 입력
  console.log('3. 아이디 입력...');
  const usernameInput = await page.$('input[name="username"]');
  if (usernameInput) {
    await usernameInput.fill('ai.pacaa');
    await page.screenshot({ path: '/tmp/threads_3_username.png' });
    console.log('   → 아이디 입력됨');
  } else {
    console.log('   → 아이디 입력창 없음');
    await page.screenshot({ path: '/tmp/threads_3_nofield.png' });
  }

  // 비번 입력
  console.log('4. 비밀번호 입력...');
  const passwordInput = await page.$('input[name="password"]');
  if (passwordInput) {
    await passwordInput.fill('tkdfhrtn0!');
    await page.screenshot({ path: '/tmp/threads_4_password.png' });
    console.log('   → 비밀번호 입력됨');
  }

  // 로그인 버튼 클릭
  console.log('5. 로그인 버튼 클릭...');
  const loginBtn = await page.$('button[type="submit"]');
  if (loginBtn) {
    await loginBtn.click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/threads_5_after_login.png' });
    console.log('   → 로그인 버튼 클릭됨');
  }

  // 결과 확인
  const url = page.url();
  console.log('6. 현재 URL:', url);

  // 프로필 페이지 확인
  console.log('7. 프로필 확인...');
  await page.goto('https://www.threads.net/@ai.pacaa', { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: '/tmp/threads_7_profile.png' });
  console.log('   → 프로필 페이지 스크린샷 저장');

  await browser.close();
  console.log('완료!');
})();
