const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const USER_DATA_DIR = path.join(__dirname, 'browser_data', 'ai_pacaa');

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true, args: ['--no-sandbox'],
  });
  const page = browser.pages()[0] || await browser.newPage();

  // 내 프로필 확인
  console.log('=== AI파카 프로필 확인 ===');
  await page.goto('https://www.threads.net/@ai.pacaa', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: '/tmp/aipacaa_profile.png' });

  const profileText = await page.textContent('body').catch(() => '');
  const clean = profileText.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();
  console.log(clean.substring(0, 500));

  // 팔로잉 목록 확인
  console.log('\n=== 팔로잉 목록 ===');
  await page.goto('https://www.threads.net/@ai.pacaa/following', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: '/tmp/aipacaa_following.png' });

  const followingText = await page.textContent('body').catch(() => '');
  const followingClean = followingText.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();
  console.log(followingClean.substring(0, 500));

  await browser.close();
})();
