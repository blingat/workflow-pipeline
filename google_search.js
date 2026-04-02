const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'ko-KR',
  });

  await page.goto('https://www.google.com/search?q=test&hl=ko', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '/tmp/google_search_debug.png' });
  
  const text = await page.textContent('body').catch(() => '');
  console.log('페이지 내용:', text.substring(0, 1000));
  console.log('URL:', page.url());

  await browser.close();
})();
