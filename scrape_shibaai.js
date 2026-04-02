// scrape_shibaai.js — @itsshibaai Threads 글 스크래핑
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const USER_DATA = '/home/kkk/.config/google-chrome-for-testing';
const EXEC = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';

(async () => {
  ['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => {
    try { require('fs').unlinkSync(require('path').join(USER_DATA, f)); } catch {}
  });

  const browser = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: EXEC,
    headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const page = browser.pages()[0] || await browser.newPage();
  
  // @itsshibaai 프로필 접속
  console.log('프로필 접속 중...');
  await page.goto('https://www.threads.net/@itsshibaai', { waitUntil: 'networkidle', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const posts = [];
  
  // 스크롤하면서 글 수집
  for (let i = 0; i < 5; i++) {
    // 모든 글 텍스트 수집
    const items = await page.evaluate(() => {
      const results = [];
      // Threads 글 텍스트 선택자
      const textEls = document.querySelectorAll('[data-pressable-container="true"] span[dir="auto"]');
      const seen = new Set();
      
      for (const el of textEls) {
        const text = el.textContent.trim();
        if (text.length > 20 && !seen.has(text)) {
          seen.add(text);
          results.push(text);
        }
      }
      return results;
    });

    for (const item of items) {
      if (!posts.find(p => p === item)) {
        posts.push(item);
        console.log(`\n--- 글 ${posts.length} ---`);
        console.log(item.substring(0, 300));
      }
    }

    // 스크롤
    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise(r => setTimeout(r, 2000));
  }

  // 미디어(이미지/영상) 여부 확인
  const mediaInfo = await page.evaluate(() => {
    const videos = document.querySelectorAll('video');
    const images = document.querySelectorAll('img[src*="cdninstagram"]');
    return { videos: videos.length, images: images.length };
  });
  console.log(`\n\n미디어: 영상 ${mediaInfo.videos}, 이미지 ${mediaInfo.images}`);
  console.log(`총 수집 글: ${posts.length}개`);

  await browser.close();
})();
