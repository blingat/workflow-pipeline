const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

chromium.use(StealthPlugin());

const USER_DATA_DIR = path.join(__dirname, 'browser_data', 'ai_pacaa');

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true,
    args: ['--no-sandbox'],
  });
  const page = browser.pages()[0] || await browser.newPage();

  // 이미 로그인된 상태인지 확인
  await page.goto('https://www.threads.net/@ai.pacaa', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(5000);
  
  const url = page.url();
  const text = await page.textContent('body').catch(() => '');
  const isLoggedIn = !url.includes('login') && !url.includes('signin');

  if (isLoggedIn) {
    console.log('✅ 이미 로그인됨 (쿠키 유지 성공)');
    await page.screenshot({ path: '/tmp/persistent_login.png' });
  } else {
    console.log('로그인 필요...');
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 20000 });
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
    console.log('✅ 로그인 완료 + 쿠키 저장됨');
  }

  // 에이징: 관심 계정 팔로우
  console.log('\n에이징 시작 - 관심 계정 팔로우...');
  
  const accounts = [
    '@itsshibaai',
    '@claude.ai',
    '@openai',
    '@google_deepmind',
  ];
  
  for (const account of accounts) {
    try {
      await page.goto(`https://www.threads.net/${account}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);
      
      // 팔로우 버튼 찾기
      const followBtn = await page.$('button:has-text("팔로우")') || await page.$('button:has-text("Follow")');
      if (followBtn) {
        await followBtn.click();
        console.log(`  ✅ ${account} 팔로우`);
      } else {
        console.log(`  ⏭️ ${account} 이미 팔로우됨 또는 버튼 없음`);
      }
      await page.waitForTimeout(3000 + Math.random() * 4000); // 3~7초 랜덤 대기
    } catch (e) {
      console.log(`  ❌ ${account} 에러: ${e.message.substring(0, 50)}`);
    }
  }

  // 에이징: 첫 번째 게시물에 하트
  console.log('\n에이징 - 최신 게시물에 하트...');
  try {
    await page.goto('https://www.threads.net/@itsshibaai', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(4000);
    
    // 좋아요 버튼 (하트 아이콘)
    const likeBtn = await page.$('[aria-label="좋아요"]') || await page.$('[aria-label="Like"]') || await page.$('svg[aria-label="Like"]');
    if (likeBtn) {
      await likeBtn.click();
      console.log('  ✅ 게시물 좋아요');
    } else {
      // 더 넓은 검색
      const allBtns = await page.$$('div[role="button"]');
      console.log(`  버튼 ${allBtns.length}개 발견, 하트 찾는 중...`);
    }
    await page.waitForTimeout(2000);
  } catch (e) {
    console.log(`  ❌ 하트 에러: ${e.message.substring(0, 50)}`);
  }

  await browser.close();
  console.log('\n✅ 완료! 쿠키는 browser_data/ai_pacaa/ 에 저장됨');
})();
