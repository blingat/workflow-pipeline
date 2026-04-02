// follow_only.js — 팔로우만 5명 진행
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
chromium.use(StealthPlugin());

const USER_DATA_DIR = '/home/kkk/.config/google-chrome-for-testing';
const EXEC_PATH = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const KNOWN = ['specal1849','geumverse_ai','realaiforyou','gpt_park','rosy_.designer','jaykimuniverse','dev.haesummy','aitrendmaster','latinus_us','dev_shibaa','itsshibaai','ai.pacaa'];
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { fs.unlinkSync(path.join(USER_DATA_DIR, f)); } catch {} });

const reactClick = async (page, locator) => {
  const el = await locator.elementHandle({ timeout: 3000 });
  if (!el) throw new Error('no element');
  await page.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const x = rect.x + rect.width / 2;
    const y = rect.y + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'mouse', button: 0, buttons: 1 };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', { ...opts, button: 0, buttons: 0 }));
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    el.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 }));
  }, el);
};

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, noViewPort: true, executablePath: EXEC_PATH,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
  });

  console.log('=== 팔로우 전용 스크립트 ===');
  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);
  if (page.url().includes('login')) { console.log('❌ 로그인 필요'); await browser.close(); return; }
  console.log('✅ 로그인됨');

  let newFollows = 0;
  const MAX_FOLLOWS = 5;
  const tried = new Set();

  // 1단계: 홈 피드 스크롤하면서 작성자 수집
  console.log('\n📡 홈 피드 스크롤...');
  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(3000);

  const feedAuthors = new Set();
  for (let s = 0; s < 8; s++) {
    const authors = await page.evaluate(() => {
      const r = [];
      document.querySelectorAll('a[href^="/@"]').forEach(a => {
        const m = (a.getAttribute('href') || '').match(/^\/@([\w.]+)/);
        if (m && m[1] !== 'ai.pacaa') r.push(m[1]);
      });
      return r;
    });
    authors.forEach(a => feedAuthors.add(a));
    await page.evaluate(() => window.scrollBy(0, 2000));
    await sleep(rand(1500, 2500));
  }
  const candidates = [...feedAuthors].filter(a => !KNOWN.includes(a));
  console.log(`📋 피드에서 ${feedAuthors.size}명, 새 후보 ${candidates.length}명`);

  // 2단계: 각 후보 프로필에서 팔로우 시도
  for (const author of candidates) {
    if (newFollows >= MAX_FOLLOWS) break;
    tried.add(author);
    try {
      console.log(`\n🔍 @${author} 프로필 확인...`);
      await page.goto(`https://www.threads.net/@${author}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await sleep(2500);

      // 방법 1: role=button name="팔로우"
      let fb = page.getByRole('button', { name: /^팔로우$/i });
      if (!(await fb.isVisible({ timeout: 1500 }).catch(() => false))) {
        // 방법 2: 텍스트가 "팔로우"인 모든 버튼/링크
        fb = page.locator('div[role="button"]:has-text("팔로우"), button:has-text("팔로우"), a:has-text("팔로우")').first();
      }
      if (!(await fb.isVisible({ timeout: 1500 }).catch(() => false))) {
        // 방법 3: 프로필 페이지 상단 버튼 영역에서 텍스트 확인
        const btnText = await page.evaluate(() => {
          const btns = document.querySelectorAll('[role="button"]');
          for (const b of btns) {
            const t = b.textContent?.trim();
            if (t === '팔로우' || t === 'Follow') return t;
          }
          // SVG 옆 텍스트
          const spans = document.querySelectorAll('span');
          for (const s of spans) {
            if (s.textContent?.trim() === '팔로우' && s.offsetParent !== null) return s.textContent.trim();
          }
          return null;
        });
        if (btnText) {
          console.log(`  발견: "${btnText}" 버튼 → 클릭 시도`);
          fb = page.locator('text=팔로우').first();
        }
      }

      if (await fb.isVisible({ timeout: 1000 }).catch(() => false)) {
        await reactClick(page, fb);
        await sleep(3000);
        
        // 팔로잉으로 바뀌었는지 확인
        const isFollowing = await page.evaluate(() => {
          const btns = document.querySelectorAll('[role="button"]');
          for (const b of btns) {
            const t = b.textContent?.trim();
            if (t === '팔로잉' || t === 'Following') return true;
          }
          return false;
        });

        if (isFollowing) {
          newFollows++;
          console.log(`  ✅ 팔로우 신규#${newFollows} → @${author}`);
        } else {
          console.log(`  ⚠️ 클릭했으나 팔로잉으로 안 바뀜`);
        }
        await sleep(rand(3000, 5000));
      } else {
        console.log(`  ⏭️ 팔로우 버튼 없음`);
      }
    } catch (e) {
      console.log(`  ❌ 에러: ${e.message.substring(0, 50)}`);
    }
  }

  // 3단계: 아직 부족하면 검색으로 추가
  if (newFollows < MAX_FOLLOWS) {
    console.log(`\n\n🔍 검색으로 추가 탐색...`);
    const terms = ['AI 크리에이터', 'ChatGPT 꿀팁', 'AI 도구 추천', '인공지능 뉴스', 'AI 자동화'];
    for (const term of terms.sort(() => Math.random() - 0.5)) {
      if (newFollows >= MAX_FOLLOWS) break;
      console.log(`\n검색: "${term}"`);
      await page.goto(`https://www.threads.net/search?q=${encodeURIComponent(term)}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(3000);
      await page.evaluate(() => window.scrollBy(0, 2000));
      await sleep(2000);

      const searchAuthors = await page.evaluate(() => {
        const r = [];
        document.querySelectorAll('a[href^="/@"]').forEach(a => {
          const m = (a.getAttribute('href') || '').match(/^\/@([\w.]+)/);
          if (m && m[1] !== 'ai.pacaa') r.push(m[1]);
        });
        return [...new Set(r)];
      });

      const newOnes = searchAuthors.filter(a => !KNOWN.includes(a) && !tried.has(a));
      console.log(`  ${searchAuthors.length}명 발견, 새 후보 ${newOnes.length}명`);

      for (const author of newOnes.slice(0, 10)) {
        if (newFollows >= MAX_FOLLOWS) break;
        tried.add(author);
        try {
          console.log(`  🔍 @${author}...`);
          await page.goto(`https://www.threads.net/@${author}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
          await sleep(2500);

          let fb = page.getByRole('button', { name: /^팔로우$/i });
          if (!(await fb.isVisible({ timeout: 1500 }).catch(() => false))) {
            fb = page.locator('div[role="button"]:has-text("팔로우"), button:has-text("팔로우"), a:has-text("팔로우")').first();
          }
          if (!(await fb.isVisible({ timeout: 1000 }).catch(() => false))) {
            const btnText = await page.evaluate(() => {
              const btns = document.querySelectorAll('[role="button"]');
              for (const b of btns) { if (b.textContent?.trim() === '팔로우' || b.textContent?.trim() === 'Follow') return b.textContent.trim(); }
              const spans = document.querySelectorAll('span');
              for (const s of spans) { if (s.textContent?.trim() === '팔로우' && s.offsetParent !== null) return s.textContent.trim(); }
              return null;
            });
            if (btnText) fb = page.locator('text=팔로우').first();
          }

          if (await fb.isVisible({ timeout: 1000 }).catch(() => false)) {
            await reactClick(page, fb);
            await sleep(3000);
            const isFollowing = await page.evaluate(() => {
              const btns = document.querySelectorAll('[role="button"]');
              for (const b of btns) { if (b.textContent?.trim() === '팔로잉' || b.textContent?.trim() === 'Following') return true; }
              return false;
            });
            if (isFollowing) {
              newFollows++;
              console.log(`  ✅ 팔로우 신규#${newFollows} → @${author}`);
            } else {
              console.log(`  ⚠️ 팔로잉 안 됨`);
            }
            await sleep(rand(3000, 5000));
          } else {
            console.log(`  ⏭️ 버튼 없음`);
          }
        } catch (e) { console.log(`  ❌ ${e.message.substring(0, 40)}`); }
      }
    }
  }

  console.log(`\n\n=== 최종 결과 ===`);
  console.log(`✅ 팔로우: ${newFollows}명 신규 (목표 ${MAX_FOLLOWS})`);
  console.log(`⏭️ 시도: ${tried.size}명`);

  await sleep(3000);
  await browser.close().catch(() => {});
})();
