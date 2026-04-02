const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const query = process.argv[2] || 'AI 자동화 도구 2025';
const num = parseInt(process.argv[3]) || 10;

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'ko-KR',
    viewport: { width: 1920, height: 1080 },
  });
  const page = await context.newPage();

  await page.goto(`https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=ko&count=${num}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForTimeout(3000);

  const results = await page.evaluate(() => {
    const items = [];
    document.querySelectorAll('li.b_algo').forEach(li => {
      const h2 = li.querySelector('h2 a');
      const p = li.querySelector('p, .b_caption p');
      if (h2) {
        items.push({
          title: h2.textContent.trim(),
          url: h2.href,
          desc: p ? p.textContent.trim() : ''
        });
      }
    });
    return items;
  });

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
})();
