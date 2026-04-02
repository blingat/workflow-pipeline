const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

chromium.use(StealthPlugin());

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--no-sandbox',
    ]
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1920, height: 1080 },
    geolocation: { latitude: 37.5665, longitude: 126.9780 },
    timezoneId: 'Asia/Seoul',
  });
  const page = await context.newPage();

  // Google 검색
  console.log('Google 검색...');
  await page.goto('https://www.google.com/search?q=Threads+automation+Playwright+스크래핑&hl=ko&num=10', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(4000);
  console.log('URL:', page.url());
  
  if (page.url().includes('sorry') || page.url().includes('captcha')) {
    console.log('Google CAPTCHA - Bing으로 시도...');
  } else {
    const h3s = await page.$$eval('h3', els => els.map(e => e.textContent.trim()).filter(t => t.length > 5));
    if (h3s.length > 0) {
      console.log(`\nGoogle 결과 ${h3s.length}개:`);
      h3s.slice(0, 10).forEach((t, i) => console.log(`  [${i+1}] ${t}`));
    } else {
      console.log('Google 결과 없음 - Bing으로 시도...');
    }
  }

  // Bing 검색
  console.log('\nBing 검색...');
  await page.goto('https://www.bing.com/search?q=Threads+automation+Playwright+scraping&setlang=ko&count=10', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());

  const bingResults = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('li.b_algo h2 a').forEach(a => {
      items.push({ title: a.textContent.trim(), url: a.href });
    });
    return items;
  });

  if (bingResults.length > 0) {
    console.log(`\nBing 결과 ${bingResults.length}개:`);
    bingResults.forEach((r, i) => console.log(`  [${i+1}] ${r.title}\n      ${r.url}`));
  } else {
    const text = await page.textContent('body').catch(() => '');
    console.log('Bing 내용:', text.substring(0, 300));
  }

  await browser.close();
  console.log('\n완료!');
})();
