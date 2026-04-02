#!/usr/bin/env node
// AI파카 에이징 v7 — dispatchEvent + SVG 선택자 + GLM-5-Turbo + 댓글 좋아요
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

chromium.use(StealthPlugin());

const USER_DATA_DIR = '/home/kkk/.config/google-chrome-for-testing';
const EXEC_PATH = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const ZAI_KEY = '6728f5a9036946129f75a6cfe2baf932.ZWjgd5C43QYwOB0L';
const ZAI_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const LOG_FILE = '/tmp/aging_v7.log';
const RESULT_FILE = '/tmp/aging_result.json';
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const log = (msg) => {
  const t = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  const line = `[${t}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
};

['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { fs.unlinkSync(path.join(USER_DATA_DIR, f)); } catch {} });

const actionLog = { likes: [], follows: [], reposts: [], comments: [], commentLikes: [] };

// React 18 호환 클릭 - dispatchEvent
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

// 하단 고정 바의 SVG 선택 (y좌표 가장 큰 것)
const svgClickBottom = async (page, ariaLabel) => {
  const svgs = page.locator(`svg[aria-label="${ariaLabel}"]`);
  const count = await svgs.count();
  let target = null, maxY = 0;
  for (let i = 0; i < count; i++) {
    const box = await svgs.nth(i).boundingBox().catch(() => null);
    if (box && box.y > maxY) { maxY = box.y; target = svgs.nth(i); }
  }
  if (!target) throw new Error(`SVG "${ariaLabel}" not found`);
  await reactClick(page, target);
};

const waitForGQL = (page, timeout = 8000) => new Promise(resolve => {
  const handler = async (response) => {
    if (response.url().includes('/graphql') && response.request().method() === 'POST') {
      try {
        const body = await response.text();
        if (/following|has_liked|repost_count|like_count|text_post_app_info|direct_reply_count/i.test(body)) {
          page.off('response', handler);
          resolve({ status: response.status(), body: body.substring(0, 300) });
        }
      } catch {}
    }
  };
  page.on('response', handler);
  setTimeout(() => { page.off('response', handler); resolve(null); }, timeout);
});

const generateComment = async (postText) => {
  try {
    const res = await fetch(ZAI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ZAI_KEY}` },
      body: JSON.stringify({
        model: 'glm-5-turbo',
        messages: [
          { role: 'system', content: '너는 한국어 반말로 짧은 댓글을 달아줘. 글 내용과 관련된 반말 한 줄만 출력. 이모지 1개. 프롬프트 지시어나 설명 절대 출력 금지. 반드시 한국어 자연스러운 문장만.' },
          { role: 'user', content: postText.substring(0, 300) },
        ],
        max_tokens: 60,
        temperature: 0.9,
      }),
    });
    const data = await res.json();
    let comment = (data.choices?.[0]?.message?.content || '').trim();

    // reasoning_content는 절대 사용 안 함
    // 비정상 출력 필터링
    const badPatterns = /Tone|Style|banmal|casual|informal|Korean|반말|comment|output|instruction|프롬프트|지시/i;
    if (badPatterns.test(comment)) comment = '';

    // 5~50자, 한국어 포함, 이모지 끝에만
    if (comment.length < 3 || comment.length > 50) comment = '';
    if (!/[가-힣]/.test(comment)) comment = '';

    return comment || null;
  } catch (e) { log(`  LLM error: ${e.message.substring(0, 40)}`); return null; }
};

const humanScroll = async (page, direction = 1) => {
  await page.evaluate(y => window.scrollBy(0, y), rand(300, 600) * direction);
  await sleep(rand(2000, 5000));
  if (Math.random() < 0.15) {
    await page.evaluate(y => window.scrollBy(0, y), rand(500, 800) * direction);
    await sleep(rand(800, 1500));
    await page.evaluate(y => window.scrollBy(0, -y), rand(200, 400) * direction);
    await sleep(rand(500, 1000));
  }
};

(async () => {
  const startTime = Date.now();
  // 설정 파일에서 목표 읽기 (없으면 기본값)
  const CONFIG_FILE = path.join(__dirname, '.aging_config.json');
  let config = {};
  try { config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); } catch {}
  const MAX_DURATION = (config.max_duration || 25) * 60 * 1000;
  const MAX_LIKES = config.max_likes || rand(10, 15);
  const MAX_FOLLOWS_TARGET = config.max_follows || 5;
  const MAX_REPOSTS = config.max_reposts || rand(2, 3);
  const MAX_COMMENTS = config.max_comments || rand(2, 3);
  const processedPostIds = new Set();
  const likedUsers = new Set();
  const repostedUsers = new Set();
  const commentedUsers = new Set();

  // 로그 초기화
  fs.writeFileSync(LOG_FILE, '');
  log('=== AI파카 에이징 v7 시작 ===');
  log(`목표: 좋아요 ${MAX_LIKES}, 팔로우 ${MAX_FOLLOWS_TARGET}(신규), 리포스트 ${MAX_REPOSTS}, 댓글 ${MAX_COMMENTS}`);

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

  page.on('response', async (r) => {
    if (r.url().includes('/graphql') && r.request().method() === 'POST') {
      const req = r.request().postData() || '';
      if (/variables|follow|like|repost|create/i.test(req)) {
        try { log(`  [GQL] ${r.status()} → ${(await r.text()).substring(0, 100)}`); } catch {}
      }
    }
  });

  log('로그인 확인...');
  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);

  if (page.url().includes('login') || page.url().includes('signin')) {
    log('❌ 로그인 필요!');
    await browser.close().catch(() => {});
    process.exit(1);
  }
  log('✅ 로그인됨');

  // === 피드 기반 에이징 (타겟 없이 홈 피드에서 자연스럽게 상호작용) ===
  log(`\n=== 홈 피드 에이징 시작 ===`);
  log(`목표: 좋아요 ${MAX_LIKES}, 팔로우 ${MAX_FOLLOWS_TARGET}(신규), 리포스트 ${MAX_REPOSTS}, 댓글 ${MAX_COMMENTS}`);

  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(rand(3000, 5000));

  let newFollows = 0;
  let feedRound = 0;

  while (feedRound < 15) {
    if (Date.now() - startTime > MAX_DURATION) { log('⏰ 시간 초과'); break; }
    const allDone = actionLog.likes.length >= MAX_LIKES && newFollows >= MAX_FOLLOWS_TARGET && actionLog.reposts.length >= MAX_REPOSTS && actionLog.comments.length >= MAX_COMMENTS;
    if (allDone) { log('✅ 전체 목표 달성!'); break; }

    feedRound++;
    const feedPosts = page.locator('[data-pressable-container]');
    const feedCount = await feedPosts.count().catch(() => 0);
    if (feedCount === 0) { await humanScroll(page, 1); await sleep(2000); continue; }

    log(`\n── 피드 라운드 ${feedRound} (게시물 ${feedCount}개) ──`);

    for (let i = 0; i < Math.min(4, feedCount); i++) {
      if (Date.now() - startTime > MAX_DURATION) break;

      try {
        const post = feedPosts.nth(i);
        if (!(await post.isVisible().catch(() => false))) continue;

        // 작성자 확인 (본인 글 제외)
        const authorEl = post.locator('a[href^="/@"]').first();
        const authorHref = await authorEl.getAttribute('href').catch(() => '');
        const author = (authorHref || '').replace('/@', '').replace(/^\/$/, '');
        if (!author || author === 'ai.pacaa') continue;

        // post ID
        let postId = null;
        try {
          const postLink = await post.locator('a[href*="/post/"]').first().getAttribute('href').catch(() => null);
          postId = postLink?.match(/\/post\/([a-zA-Z0-9_-]+)/)?.[1];
        } catch {}

        // === 좋아요 ===
        if (actionLog.likes.length < MAX_LIKES && !processedPostIds.has(postId)) {
          try {
            const likeSvg = post.locator('svg[aria-label="좋아요"]').first();
            const unlikeSvg = post.locator('svg[aria-label="좋아요 취소"]').first();
            if (await unlikeSvg.isVisible({ timeout: 300 }).catch(() => false)) {
              // 이미 좋아요함 — 스킵
            } else if (await likeSvg.isVisible({ timeout: 1500 }).catch(() => false) && Math.random() > 0.15) {
              const gql = waitForGQL(page);
              await reactClick(page, likeSvg);
              const result = await gql;
              actionLog.likes.push({ target: `@${author}`, postId: postId || '?', graphql: result ? `${result.status}` : '미캡처' });
              processedPostIds.add(postId);
              log(`  ❤️ 좋아요#${actionLog.likes.length} → @${author} [GQL:${result ? result.status : '미캡처'}]`);
              await sleep(rand(1500, 4000));
            }
          } catch {}
        }

        // === 리포스트 ===
        if (actionLog.reposts.length < MAX_REPOSTS && Math.random() <= 0.12 && !processedPostIds.has(postId)) {
          try {
            const repostSvg = post.locator('svg[aria-label="리포스트"]').first();
            if (await repostSvg.isVisible({ timeout: 1500 }).catch(() => false)) {
              await reactClick(page, repostSvg);
              await sleep(2000);
              const confirmBtn = page.locator('[role="menu"]').locator('text=리포스트').first();
              if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                const gql = waitForGQL(page);
                await reactClick(page, confirmBtn);
                const result = await gql;
                actionLog.reposts.push({ target: `@${author}`, postId: postId || '?', graphql: result ? `${result.status}` : '미캡처' });
                processedPostIds.add(postId);
                log(`  🔄 리포스트#${actionLog.reposts.length} → @${author} [GQL:${result ? result.status : '미캡처'}]`);
                await sleep(rand(2000, 4000));
              } else {
                await page.keyboard.press('Escape');
              }
            }
          } catch {}
        }

        // === 댓글 (상세 진입) ===
        if (actionLog.comments.length < MAX_COMMENTS && Math.random() <= 0.15 && !commentedUsers.has(author) && postId) {
          try {
            const postHref = await post.locator('a[href*="/post/"]').first().getAttribute('href').catch(() => null);
            if (!postHref) continue;
            const fullUrl = postHref.startsWith('http') ? postHref : `https://www.threads.net${postHref}`;

            await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 20000 });
            await sleep(rand(3000, 5000));

            let postText = '';
            const spans = page.locator('span[dir="auto"]');
            for (let s = 0; s < Math.min(15, await spans.count()); s++) {
              const txt = await spans.nth(s).innerText({ timeout: 500 }).catch(() => '');
              if (txt && txt.length > 20 && !/조회|답글|좋아요|리포스트|공유|팔로우|활동/i.test(txt)) { postText = txt; break; }
            }
            log(`  📝 글: "${postText.substring(0, 50)}"`);

            if (postText.length > 10) {
              await svgClickBottom(page, '답글');

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
              }

              if (textbox) {
                await reactClick(page, textbox);
                await sleep(1000);
                const comment = await generateComment(postText);
                if (comment) {
                  log(`  💬 댓글 생성: "${comment}"`);
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
                    actionLog.comments.push({ target: `@${author}`, postId, text: comment, graphql: result ? `${result.status}` : '미캡처' });
                    commentedUsers.add(author);
                    log(`  ✅ 댓글#${actionLog.comments.length} → @${author}: "${comment}" [GQL:${result ? result.status : '미캡처'}]`);

                    // 댓글 단 글에 좋아요
                    await sleep(rand(1500, 3000));
                    const unlikeCheck = page.locator('svg[aria-label="좋아요 취소"]').last();
                    const likeCheck = page.locator('svg[aria-label="좋아요"]').last();
                    if (!await unlikeCheck.isVisible({ timeout: 500 }).catch(() => false) && await likeCheck.isVisible({ timeout: 1000 }).catch(() => false)) {
                      const likeGql = waitForGQL(page);
                      await svgClickBottom(page, '좋아요');
                      const likeResult = await likeGql;
                      actionLog.commentLikes.push({ target: `@${author}`, postId, graphql: likeResult ? `${likeResult.status}` : '미캡처' });
                      log(`  ❤️ 댓글글+좋아요 → @${author} [GQL:${likeResult ? likeResult.status : '미캡처'}]`);
                    }
                    await sleep(rand(2000, 4000));
                  }
                } else { log(`  ⚠️ 댓글 생성 실패`); }
              } else { log(`  ⚠️ textarea 미발견`); }
            }

            // 피드로 복귀
            await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(rand(2000, 3000));
          } catch (e) {
            log(`  댓글 에러: ${e.message.substring(0, 50)}`);
            await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(2000);
          }
        }

        // === 팔로우 (피드에서 발견한 계정 프로필 방문) ===
        if (newFollows < MAX_FOLLOWS_TARGET && Math.random() <= 0.08 && author && !likedUsers.has(author)) {
          try {
            await page.goto(`https://www.threads.net/@${author}`, { waitUntil: 'domcontentloaded', timeout: 10000 });
            await sleep(rand(2000, 3000));

            let fb = page.getByRole('button', { name: /^팔로우$/i });
            if (!(await fb.isVisible({ timeout: 1500 }).catch(() => false))) {
              fb = page.locator('div[role="button"]:has-text("팔로우")').first();
            }
            if (!(await fb.isVisible({ timeout: 1000 }).catch(() => false))) {
              const found = await page.evaluate(() => {
                for (const b of document.querySelectorAll('[role="button"]')) { if (b.textContent?.trim() === '팔로우') return true; }
                return false;
              });
              if (found) fb = page.locator('text=팔로우').first();
            }

            if (await fb.isVisible({ timeout: 1000 }).catch(() => false)) {
              await reactClick(page, fb);
              await sleep(3000);
              const isFollowing = await page.evaluate(() => {
                for (const b of document.querySelectorAll('[role="button"]')) { if (b.textContent?.trim() === '팔로잉') return true; }
                return false;
              });
              if (isFollowing) {
                newFollows++;
                actionLog.follows.push({ target: `@${author}`, ui: '✅' });
                log(`  ✅ 팔로우 신규#${newFollows} → @${author} (피드발견)`);
              }
              await sleep(rand(2000, 4000));
            }

            // 피드로 복귀
            await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 15000 });
            await sleep(rand(2000, 3000));
          } catch {}
        }

      } catch (e) { log(`  에러: ${e.message.substring(0, 40)}`); }
    }

    // 스크롤 다음 피드
    await humanScroll(page, rand(1, 3));
    await sleep(rand(2000, 5000));
  }

  // 마무리 스크롤
  log('\n=== 마무리 스크롤 ===');
  try {
    for (let i = 0; i < 3; i++) await humanScroll(page, 1);
  } catch {}

  // 결과 저장
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const result = { elapsed, newFollows, actionLog, ts: new Date().toISOString() };
  fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));

  log(`\n${'═'.repeat(50)}`);
  log(`  에이징 완료 — ${Math.floor(elapsed/60)}분 ${elapsed%60}초`);
  log(`${'═'.repeat(50)}`);
  log(`❤️ 좋아요: ${actionLog.likes.length}개 (목표 ${MAX_LIKES})`);
  actionLog.likes.forEach((r, i) => log(`  ${i+1}. ${r.target} (${r.postId}) [${r.graphql === '200' ? '✅' : '⚠️'}${r.graphql}]`));
  log(`✅ 팔로우: ${newFollows}개 신규 (목표 ${MAX_FOLLOWS_TARGET})`);
  actionLog.follows.forEach((r, i) => log(`  ${i+1}. ${r.target} [UI:${r.ui}]`));
  log(`🔄 리포스트: ${actionLog.reposts.length}개 (목표 ${MAX_REPOSTS})`);
  actionLog.reposts.forEach((r, i) => log(`  ${i+1}. ${r.target} (${r.postId}) [${r.graphql === '200' ? '✅' : '⚠️'}${r.graphql}]`));
  log(`💬 댓글: ${actionLog.comments.length}개 (목표 ${MAX_COMMENTS})`);
  actionLog.comments.forEach((r, i) => log(`  ${i+1}. ${r.target}: "${r.text}" [${r.graphql === '200' ? '✅' : '⚠️'}${r.graphql}]`));
  log(`❤️ 댓글글+좋아요: ${actionLog.commentLikes.length}개`);
  actionLog.commentLikes.forEach((r, i) => log(`  ${i+1}. ${r.target} (${r.postId}) [${r.graphql === '200' ? '✅' : '⚠️'}${r.graphql}]`));
  log(`${'═'.repeat(50)}`);

  await browser.close().catch(() => {});
  log('✅ 브라우저 종료');
})();
