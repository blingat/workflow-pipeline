const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'ko-KR',
  });
  const page = await context.newPage();

  // 1. 인스타 로그인
  console.log('1. 인스타 로그인...');
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.fill('input[name="email"]', 'ai.pacaa');
  await page.fill('input[name="pass"]', 'tkdfhrtn0!');
  await page.press('input[name="pass"]', 'Enter');
  await page.waitForTimeout(8000);
  console.log('   URL:', page.url());

  // 2. onetap 페이지가 있으면 "나중에" 클릭 또는 그냥 넘기기
  if (page.url().includes('onetap')) {
    console.log('2. onetap 페이지 - 저장 안 함 클릭...');
    const notNow = await page.$('button:has-text("나중에")') || await page.$('button:has-text("Not Now")') || await page.$('button:has-text("Later")');
    if (notNow) await notNow.click();
    await page.waitForTimeout(3000);
    console.log('   URL:', page.url());
  }

  // 3. 알림 설정 건너뛰기
  console.log('3. 알림 건너뛰기...');
  const notNowNotif = await page.$('button:has-text("나중에")') || await page.$('button:has-text("Not Now")');
  if (notNowNotif) { await notNowNotif.click(); await page.waitForTimeout(3000); }

  // 4. 쿠키 저장
  const cookies = await context.cookies();
  fs.writeFileSync('/tmp/insta_cookies.json', JSON.stringify(cookies));
  const session = cookies.find(c => c.name === 'sessionid');
  console.log('4. 세션 쿠키:', session ? '저장됨' : '없음');
  await page.screenshot({ path: '/tmp/insta_v5_loggedin.png' });

  // 5. Threads 이동 (같은 컨텍스트 = 쿠키 공유)
  console.log('5. Threads @itsshibaai...');
  await page.goto('https://www.threads.net/@itsshibaai', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: '/tmp/threads_itsshibaai_v2.png' });

  // 6. 게시물 파싱
  const posts = await page.$$eval('[data-pressable-container] [dir="auto"]', els => 
    els.slice(0, 20).map(e => e.textContent.trim()).filter(t => t.length > 10)
  );
  console.log('6. 게시물 수:', posts.length);
  posts.forEach((p, i) => console.log(`   [${i+1}] ${p.substring(0, 200)}`));

  await browser.close();
  console.log('완료!');
})();
