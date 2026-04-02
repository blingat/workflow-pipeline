const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const USER_DATA_DIR = require('path').join(__dirname, 'browser_data', 'ai_pacaa');

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: true, args: ['--no-sandbox'],
  });
  const page = browser.pages()[0] || await browser.newPage();

  const allAccounts = new Set();

  // 해시태그 + 키워드로 더 넓게 검색
  const keywords = [
    'AI', 'ChatGPT', 'Claude', 'GPT', 'AI tools', 'prompt engineering',
    'AI automation', 'AI news', 'coding AI', 'artificial intelligence',
    'AI side hustle', 'AI money', 'midjourney', 'DALL-E', 'Sora AI',
    'AI website builder', 'no code AI', 'AI productivity',
    '인공지능', '챗지피티', '클로드', 'AI링', '에이아이',
    'AI 스타트업', 'AI 부업', '프롬프트', '미드저니',
  ];

  for (const kw of keywords) {
    try {
      await page.goto(`https://www.threads.net/search?q=${encodeURIComponent(kw)}&serp_type=tags`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(4000);

      const accounts = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('a[href^="/@"]').forEach(a => {
          const href = a.getAttribute('href');
          const match = href.match(/^\/@([\w.]+)/);
          if (match && match[1].length > 2 && !match[1].includes('threads.net') && !match[1].includes('instagram.com')) {
            results.push('@' + match[1]);
          }
        });
        return [...new Set(results)];
      });

      accounts.forEach(a => allAccounts.add(a));
      if (accounts.length > 0) console.log(`"${kw}" → ${accounts.length}개`);
      
      await page.waitForTimeout(2000 + Math.random() * 2000);
    } catch (e) {}
  }

  // 게시물 타입 검색도
  for (const kw of keywords.slice(0, 10)) {
    try {
      await page.goto(`https://www.threads.net/search?q=${encodeURIComponent(kw)}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(4000);

      const accounts = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('a[href^="/@"]').forEach(a => {
          const href = a.getAttribute('href');
          const match = href.match(/^\/@([\w.]+)/);
          if (match && match[1].length > 2 && !match[1].includes('threads.net') && !match[1].includes('instagram.com')) {
            results.push('@' + match[1]);
          }
        });
        return [...new Set(results)];
      });

      accounts.forEach(a => allAccounts.add(a));
      if (accounts.length > 0) console.log(`"${kw}" (posts) → ${accounts.length}개`);
      
      await page.waitForTimeout(2000 + Math.random() * 2000);
    } catch (e) {}
  }

  console.log(`\n총 ${allAccounts.size}개 고유 계정`);

  // 회사/서비스 계정 제외 필터링
  const companyKeywords = ['openai', 'google', 'meta', 'anthropic', 'microsoft', 'apple', 'vercel', 'github', 'figma', 'adobe', 'nvidia', 'samsung', 'naver', 'kakao'];
  const filtered = [...allAccounts].filter(a => {
    const name = a.toLowerCase();
    return !companyKeywords.some(c => name.includes(c));
  });

  console.log(`회사 제외 후: ${filtered.length}개\n`);

  // 프로필 확인
  const results = [];
  for (const account of filtered.slice(0, 50)) {
    try {
      await page.goto(`https://www.threads.net/${account}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(3000);
      
      const info = await page.evaluate(() => {
        const text = document.body.innerText;
        // 팔로워 추출 시도
        const patterns = [
          /([\d.]+)\s*(만|천|억)?\s*(팔로워|followers?)/i,
          /([\d.]+)\s*(만|천|억|K|M|B)?\s*(팔로워|followers?)/i,
        ];
        let followers = 'N/A';
        for (const p of patterns) {
          const m = text.match(p);
          if (m) { followers = m[1] + (m[2] || ''); break; }
        }
        
        // 게시물 수
        const postMatch = text.match(/게시물?\s*([\d,]+)/);
        const posts = postMatch ? postMatch[1] : '?';

        return { 
          followers, 
          posts,
          bio: text.substring(0, 250).replace(/\s+/g, ' ').trim() 
        };
      });
      
      results.push({ account, ...info });
      if (info.followers !== 'N/A') {
        console.log(`⭐ ${account} | ${info.followers}팔 | ${info.posts}글 | ${info.bio.substring(0, 60)}`);
      } else {
        console.log(`   ${account} | ${info.bio.substring(0, 60)}`);
      }
      
      await page.waitForTimeout(1500 + Math.random() * 2000);
    } catch (e) {
      results.push({ account, followers: '에러', posts: '?', bio: '' });
    }
  }

  require('fs').writeFileSync('/tmp/threads_ai_accounts_v2.json', JSON.stringify(results, null, 2));
  await browser.close();
})();
