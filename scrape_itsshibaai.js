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

  // 로그인
  console.log('로그인...');
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.fill('input[name="email"]', 'ai.pacaa');
  await page.fill('input[name="pass"]', 'tkdfhrtn0!');
  await page.press('input[name="pass"]', 'Enter');
  await page.waitForTimeout(8000);
  if (page.url().includes('onetap')) {
    const btn = await page.$('button:has-text("나중에")') || await page.$('button:has-text("Not Now")');
    if (btn) await btn.click();
    await page.waitForTimeout(3000);
  }
  console.log('로그인 완료');

  // @itsshibaai 피드 - 스크롤하며 수집
  console.log('@itsshibaai 피드 수집...');
  await page.goto('https://www.threads.net/@itsshibaai', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  const allPosts = [];
  
  for (let i = 0; i < 5; i++) {
    const posts = await page.$$eval('[data-pressable-container] [dir="auto"]', els => 
      els.map(e => e.textContent.trim()).filter(t => t.length > 10)
    );
    
    // 중복 제거
    for (const p of posts) {
      if (!allPosts.includes(p)) allPosts.push(p);
    }
    
    console.log(`   스크롤 ${i+1}: 총 ${allPosts.length}개`);
    
    // 스크롤 다운
    await page.evaluate(() => window.scrollBy(0, 1500));
    await page.waitForTimeout(3000);
  }

  console.log(`\n총 수집: ${allPosts.length}개 글\n`);
  console.log('='.repeat(60));
  
  allPosts.forEach((p, i) => {
    console.log(`\n[${i+1}]`);
    console.log(p);
  });

  // JSON으로도 저장
  fs.writeFileSync('/tmp/itsshibaai_posts.json', JSON.stringify(allPosts, null, 2));
  console.log('\n저장: /tmp/itsshibaai_posts.json');

  await browser.close();
})();
