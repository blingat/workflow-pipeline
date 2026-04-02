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

  // 로그인
  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));

  // @specal1849 프로필로 가서 버튼 구조 파악
  await page.goto('https://www.threads.net/@specal1849', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: '/tmp/debug_specal.png' });

  // 모든 버튼 텍스트와 role 수집
  const buttons = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('div[role="button"], button').forEach(el => {
      const text = el.innerText.trim().substring(0, 50);
      const ariaLabel = el.getAttribute('aria-label') || '';
      const ariaHidden = el.getAttribute('aria-hidden') || '';
      if (text || ariaLabel) {
        results.push({ text, ariaLabel, ariaHidden, tag: el.tagName, className: el.className.substring(0, 80) });
      }
    });
    return results;
  });

  console.log('=== @specal1849 버튼 목록 ===');
  buttons.forEach(b => console.log(`  [${b.tag}] text="${b.text}" aria="${b.ariaLabel}" hidden=${b.ariaHidden}`));

  // 좋아요 관련 SVG 수집
  const svgs = await page.evaluate(() => {
    const results = [];
    document.querySelectorAll('svg[aria-label]').forEach(el => {
      results.push({ ariaLabel: el.getAttribute('aria-label'), parentText: el.closest('div[role="button"]')?.innerText?.substring(0, 30) || '' });
    });
    return results;
  });

  console.log('\n=== SVG aria-label 목록 ===');
  svgs.forEach(s => console.log(`  svg: "${s.ariaLabel}" parent="${s.parentText}"`));

  // 첫 게시물 클릭해서 내부 구조 확인
  const posts = await page.$$('[data-pressable-container]');
  if (posts.length > 0) {
    console.log(`\n게시물 ${posts.length}개 발견, 첫 번째 클릭...`);
    await posts[0].click();
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: '/tmp/debug_post_detail.png' });

    const detailButtons = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('div[role="button"], button').forEach(el => {
        const text = el.innerText.trim().substring(0, 50);
        const ariaLabel = el.getAttribute('aria-label') || '';
        if (text || ariaLabel) {
          results.push({ text, ariaLabel });
        }
      });
      return results;
    });

    console.log('\n=== 게시물 상세 버튼 ===');
    detailButtons.forEach(b => console.log(`  "${b.text}" aria="${b.ariaLabel}"`));

    // 댓글 관련
    const textareas = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]')).map(el => ({
        tag: el.tagName, placeholder: el.placeholder || '', role: el.getAttribute('role') || '', ariaLabel: el.getAttribute('aria-label') || ''
      }));
    });
    console.log('\n=== 입력창 ===');
    textareas.forEach(t => console.log(`  [${t.tag}] placeholder="${t.placeholder}" role="${t.role}" aria="${t.ariaLabel}"`));
  }

  await browser.close();
})();
