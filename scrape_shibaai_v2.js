// scrape_shibaai_v2.js — 선택자 무작위 대입으로 글 수집
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
    executablePath: EXEC, headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const page = browser.pages()[0] || await browser.newPage();
  
  console.log('프로필 접속...');
  await page.goto('https://www.threads.net/@itsshibaai', { waitUntil: 'networkidle', timeout: 30000 });
  await new Promise(r => setTimeout(r, 5000));

  // 페이지 HTML 구조 파악
  const html = await page.content();
  console.log('HTML 길이:', html.length);

  // 모든 텍스트 노드 수집 (선택자 무관)
  const allTexts = await page.evaluate(() => {
    const results = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent.trim();
      if (t.length > 20 && t.length < 500) results.push(t);
    }
    return [...new Set(results)];
  });

  console.log(`텍스트 노드: ${allTexts.length}개`);
  allTexts.slice(0, 50).forEach((t, i) => console.log(`  [${i}] ${t.substring(0, 100)}`));
  
  // 다른 방법: 모든 a 태그 href 수집
  const links = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href');
      const text = a.textContent.trim();
      if (href && !href.includes('/@') && !href.includes('/explore') && text.length > 0) {
        results.push({ href, text: text.substring(0, 50) });
      }
    });
    return results;
  });
  
  console.log(`\n외부 링크: ${links.length}개`);
  links.slice(0, 20).forEach(l => console.log(`  ${l.text}: ${l.href}`));

  // 스크롤 후 다시 수집
  await page.evaluate(() => window.scrollBy(0, 3000));
  await new Promise(r => setTimeout(r, 3000));
  
  const texts2 = await page.evaluate(() => {
    const results = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent.trim();
      if (t.length > 20 && t.length < 500) results.push(t);
    }
    return [...new Set(results)];
  });
  
  console.log(`\n스크롤 후 텍스트: ${texts2.length}개`);
  const newOnes = texts2.filter(t => !allTexts.includes(t));
  newOnes.slice(0, 20).forEach((t, i) => console.log(`  [NEW ${i}] ${t.substring(0, 100)}`));

  await browser.close();
})();
