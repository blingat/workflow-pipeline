const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const USER_DATA_DIR = '/home/kkk/.config/google-chrome-for-testing';
const EXEC_PATH = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const ZAI_KEY = '6728f5a9036946129f75a6cfe2baf932.ZWjgd5C43QYwOB0L';
const ZAI_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { require('fs').unlinkSync(require('path').join(USER_DATA_DIR, f)); } catch {} });

const waitForGQL = (page, timeout = 8000) => new Promise(resolve => {
  const handler = async (response) => {
    if (response.url().includes('/graphql') && response.request().method() === 'POST') {
      try {
        const body = await response.text();
        if (/following|has_liked|repost_count|like_count|text_post_app_info/i.test(body)) {
          page.off('response', handler);
          resolve({ status: response.status(), body: body.substring(0, 300) });
        }
      } catch {}
    }
  };
  page.on('response', handler);
  setTimeout(() => { page.off('response', handler); resolve(null); }, timeout);
});

// React 18 호환 클릭 - dispatchEvent 방식
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

// SVG 클릭 - y좌표 기준 하단 버튼 선택
const svgClickBottom = async (page, ariaLabel) => {
  // 같은 aria-label의 SVG 중 y좌표가 가장 큰 것(하단 고정 바) 선택
  const svgs = page.locator(`svg[aria-label="${ariaLabel}"]`);
  const count = await svgs.count();
  let target = null;
  let maxY = 0;
  for (let i = 0; i < count; i++) {
    const box = await svgs.nth(i).boundingBox().catch(() => null);
    if (box && box.y > maxY) { maxY = box.y; target = svgs.nth(i); }
  }
  if (!target) throw new Error(`SVG "${ariaLabel}" not found`);
  console.log(`  Using SVG at y=${Math.round(maxY)}`);
  await reactClick(page, target);
};

const generateComment = async (postText) => {
  const res = await fetch(ZAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ZAI_KEY}` },
    body: JSON.stringify({
      model: 'glm-5-turbo',
      messages: [{ role: 'user', content: `You are a Korean alpaca account. Reply in Korean casual speech (banmal), under 30 chars, 1 emoji at end. Output ONLY the comment text, nothing else.\n\nPost: ${postText}` }],
      max_tokens: 2048,
    }),
  });
  const data = await res.json();
  let comment = data.choices?.[0]?.message?.content?.trim() || '';
  if (!comment) {
    const rc = data.choices?.[0]?.message?.reasoning_content || '';
    for (const line of rc.split('\n').reverse()) {
      const l = line.trim().replace(/^[\*"→\-\d.)\s]+/, '').replace(/["']$/g, '');
      if (/[가-힣]/.test(l) && 5 < l.length < 50 && !/Draft|char|count|Idea/i.test(l)) { comment = l; break; }
    }
  }
  return comment.length >= 5 ? comment.substring(0, 50) : null;
};

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, noViewPort: true, executablePath: EXEC_PATH,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });

  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);
  console.log('Login: OK');

  // ===== TEST 1: LIKE (두 번째 글 - 안 좋아요한 글) =====
  console.log('\n===== TEST 1: LIKE (@realaiforyou 2nd post) =====');
  await page.goto('https://www.threads.net/@realaiforyou', { waitUntil: 'networkidle', timeout: 20000 });
  await sleep(5000);
  try {
    // 두 번째 게시물 상세 진입
    const link = await page.locator('[data-pressable-container]').nth(1).locator('a[href*="/post/"]').first().getAttribute('href').catch(() => null);
    if (link) {
      const fullUrl = link.startsWith('http') ? link : `https://www.threads.net${link}`;
      await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 20000 });
      await sleep(5000);
      // 좋아요 상태 확인
      const unlikeSvg = page.locator('svg[aria-label="좋아요 취소"]').last();
      const likeSvg = page.locator('svg[aria-label="좋아요"]').last();
      const alreadyLiked = await unlikeSvg.isVisible({ timeout: 1000 }).catch(() => false);
      if (alreadyLiked) {
        console.log('Already liked - skip');
      } else if (await likeSvg.isVisible({ timeout: 2000 }).catch(() => false)) {
        const gql = waitForGQL(page);
        await svgClickBottom(page, '좋아요');
        const result = await gql;
        console.log(`Like: GQL=${result ? result.status : 'none'}`);
        if (result) console.log(`  ${result.body.substring(0, 150)}`);
      } else { console.log('Like button not found'); }
    }
  } catch (e) { console.log(`Error: ${e.message.substring(0, 80)}`); }
  await sleep(3000);

  // ===== TEST 2: FOLLOW =====
  console.log('\n===== TEST 2: FOLLOW =====');
  const followTargets = ['@dev_shibaa', '@geumverse_ai'];
  let followed = false;
  for (const user of followTargets) {
    if (followed) break;
    try {
      await page.goto(`https://www.threads.net/${user}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await sleep(3000);
      // 한국어 팔로우 버튼 확인
      const followBtn = page.getByRole('button', { name: /^팔로우$/i });
      if (!await followBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`${user}: already following or not Korean UI, skip`);
        continue;
      }
      const gql = waitForGQL(page);
      await reactClick(page, followBtn);
      const result = await gql;
      await sleep(2000);
      const uiOk = await page.getByRole('button', { name: /팔로잉/i }).first().isVisible().catch(() => false);
      console.log(`${user}: GQL=${result ? result.status : 'none'} UI=${uiOk ? 'OK' : 'FAIL'}`);
      if (result) console.log(`  ${result.body.substring(0, 150)}`);
      if (uiOk) followed = true;
    } catch (e) { console.log(`${user}: error`); }
  }
  await sleep(3000);

  // ===== TEST 3: REPOST =====
  console.log('\n===== TEST 3: REPOST (@gpt_park) =====');
  await page.goto('https://www.threads.net/@gpt_park', { waitUntil: 'networkidle', timeout: 20000 });
  await sleep(5000);
  try {
    await svgClickBottom(page, '리포스트');
    await sleep(2000);
    // 팝업에서 리포스트 버튼 찾기 - 다양한 선택자
    let clicked = false;
    const selectors = [
      () => page.locator('[role="menu"]').locator('text=리포스트').first(),
      () => page.locator('[role="menu"] >> text="리포스트"').first(),
      () => page.getByRole('menuitem', { name: '리포스트' }).first(),
    ];
    for (const sel of selectors) {
      try {
        const btn = sel();
        if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
          console.log('  Found repost button in menu');
          const gql = waitForGQL(page);
          await reactClick(page, btn);
          const result = await gql;
          await sleep(2000);
          console.log(`Repost: GQL=${result ? result.status : 'none'}`);
          if (result) console.log(`  ${result.body.substring(0, 150)}`);
          clicked = true;
          break;
        }
      } catch {}
    }
    if (!clicked) {
      // 팝업 전체 덤프
      const menuText = await page.evaluate(() => {
        const menu = document.querySelector('[role="menu"]');
        if (!menu) return 'no menu element';
        const items = [];
        menu.querySelectorAll('[data-pressable-container], [role="menuitem"], [role="option"]').forEach(el => {
          items.push({ text: el.innerText?.substring(0, 50), html: el.outerHTML.substring(0, 150) });
        });
        return JSON.stringify(items);
      });
      console.log(`Repost: menu items = ${menuText}`);
      await page.keyboard.press('Escape');
    }
  } catch (e) { console.log(`Error: ${e.message.substring(0, 80)}`); }
  await sleep(3000);

  // ===== TEST 4: COMMENT =====
  console.log('\n===== TEST 4: COMMENT (@realaiforyou 2nd post) =====');
  try {
    await page.goto('https://www.threads.net/@realaiforyou', { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(5000);
    const link = await page.locator('[data-pressable-container]').nth(1).locator('a[href*="/post/"]').first().getAttribute('href').catch(() => null);
    if (!link) throw new Error('no link');
    const fullUrl = link.startsWith('http') ? link : `https://www.threads.net${link}`;
    console.log(`Detail: ${fullUrl}`);
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(5000);

    let postText = '';
    const spans = page.locator('span[dir="auto"]');
    for (let i = 0; i < Math.min(15, await spans.count()); i++) {
      const txt = await spans.nth(i).innerText({ timeout: 500 }).catch(() => '');
      if (txt && txt.length > 20 && !/조회|답글|좋아요|리포스트|공유|팔로우|활동/i.test(txt)) { postText = txt; break; }
    }
    console.log(`Post: "${postText.substring(0, 80)}"`);

    // 하단 답글 SVG 클릭
    await svgClickBottom(page, '답글');

    // textarea 대기
    let textbox = null;
    for (let attempt = 0; attempt < 5 && !textbox; attempt++) {
      await sleep(2000);
      for (const sel of [
        () => page.locator('textarea'),
        () => page.locator('div[contenteditable="true"]'),
        () => page.locator('[role="textbox"]'),
      ]) {
        try { const tb = sel(); if (await tb.isVisible({ timeout: 500 }).catch(() => false)) { textbox = tb; break; } } catch {}
      }
      if (!textbox) console.log(`  waiting... (${attempt+1}/5)`);
    }

    if (textbox) {
      console.log('Textbox found!');
      await reactClick(page, textbox);
      await sleep(1000);
      console.log('Generating comment...');
      const comment = await generateComment(postText);
      console.log(`Comment: "${comment}"`);
      if (comment) {
        await page.keyboard.type(comment, { delay: rand(80, 160) });
        await sleep(2000);
        let postBtn = null;
        for (const sel of [
          () => page.getByRole('button', { name: /^게시$/i }),
          () => page.locator('div[role="button"]').filter({ hasText: /^게시$/i }).first(),
        ]) {
          try { const b = sel(); if (await b.isVisible({ timeout: 2000 }).catch(() => false)) { postBtn = b; break; } } catch {}
        }
        if (postBtn) {
          const gql = waitForGQL(page);
          await reactClick(page, postBtn);
          const result = await gql;
          console.log(`Post comment: GQL=${result ? result.status : 'none'}`);
          if (result) console.log(`  ${result.body.substring(0, 150)}`);
        } else { console.log('Post button not found'); }
      }
    } else {
      console.log('Textbox not found');
      await page.screenshot({ path: '/tmp/comment_fail2.png' });
    }
  } catch (e) { console.log(`Error: ${e.message.substring(0, 80)}`); }

  await sleep(3000);
  await browser.close().catch(() => {});
  console.log('\n===== DONE =====');
})();
