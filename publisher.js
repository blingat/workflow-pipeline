// publisher.js v2 — publish_queue → ai.pacaa 발행 (이미지+댓글)
// 사용법: cd workflow-pipeline && node publisher.js
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
chromium.use(StealthPlugin());

const DB_URL = 'postgresql://neondb_owner:npg_OZ8lmEfJDg4e@ep-purple-recipe-a1l3vs4n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const USER_DATA_DIR = '/home/kkk/.config/google-chrome-for-testing';
const EXEC_PATH = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
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

// 카드 이미지가 없으면 생성
async function ensureCardImages(pool, item) {
  if (item.media_url) {
    // 쉼표로 구분된 여러 경로
    return item.media_url.split(',').map(p => p.trim()).filter(Boolean);
  }
  if (item.card_slides) {
    console.log('  카드 이미지 생성 중...');
    const { generateCards } = require('./card_generator');
    const slides = typeof item.card_slides === 'string' ? JSON.parse(item.card_slides) : item.card_slides;
    try {
      const results = await generateCards({ slides, save: true });
      const paths = results.map(r => r.path).join(',');
      await pool.query('UPDATE publish_queue SET media_url = $1, media_type = $2 WHERE id = $3', [paths, 'image', item.id]);
      console.log(`  ✅ ${results.length}장 생성`);
      return results.map(r => r.path);
    } catch (e) {
      console.log(`  ⚠️ 카드 생성 실패: ${e.message.substring(0, 40)}`);
    }
  }
  return [];
}

(async () => {
  const pool = new Pool({ connectionString: DB_URL });
  console.log('=== 발행 시작 ===');

  const { rows: queue } = await pool.query(
    "SELECT * FROM publish_queue WHERE status = 'approved' ORDER BY id ASC LIMIT 1"
  );

  if (queue.length === 0) {
    // pending이 있으면 확인 필요 알림
    const { rows: pending } = await pool.query("SELECT count(*) FROM publish_queue WHERE status = 'pending'");
    if (parseInt(pending[0].count) > 0) {
      console.log(`⚠️ 승인 대기 ${pending[0].count}개 — Queue에서 승인 후 다시 실행`);
    } else {
      console.log('발행할 글이 없습니다.');
    }
    await pool.end();
    return;
  }

  const item = queue[0];
  console.log(`\n발행 대상 (ID: ${item.id}):`);
  console.log(`  내용: "${item.content.substring(0, 80)}..."`);
  console.log(`  댓글: "${(item.comment_text || '').substring(0, 60)}..."`);
  console.log(`  출처: ${item.source_url || '없음'}`);

  // 카드 이미지 준비
  const cardImages = await ensureCardImages(pool, item);

  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, noViewPort: true, executablePath: EXEC_PATH,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.addInitScript(() => { Object.defineProperty(navigator, 'webdriver', { get: () => false }); });

  console.log('Threads 접속...');
  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(3000);

  // 새 글 작성
  console.log('글 작성 진입...');
  let entered = false;
  for (const sel of [
    'svg[aria-label="새 글 만들기"]',
    'svg[aria-label="Create new post"]',
    'a[href="/new"]',
  ]) {
    try {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reactClick(page, btn);
        await sleep(3000);
        entered = true;
        break;
      }
    } catch {}
  }
  if (!entered) {
    const textarea = page.locator('textarea').first();
    if (await textarea.isVisible({ timeout: 3000 }).catch(() => false)) {
      await reactClick(page, textarea);
      entered = true;
      await sleep(2000);
    }
  }
  if (!entered) {
    console.log('❌ 글 작성 진입 실패');
    await pool.query("UPDATE publish_queue SET status = 'failed' WHERE id = $1", [item.id]);
    await browser.close().catch(() => {});
    await pool.end();
    return;
  }

  // 텍스트 입력
  console.log('텍스트 입력...');
  const inputArea = page.locator('textarea, [contenteditable="true"], [role="textbox"]').first();
  if (await inputArea.isVisible({ timeout: 3000 }).catch(() => false)) {
    await reactClick(page, inputArea);
    await sleep(1000);
    await page.keyboard.type(item.content, { delay: rand(50, 120) });
    await sleep(2000);
  } else {
    console.log('❌ 입력 영역 없음');
    await pool.query("UPDATE publish_queue SET status = 'failed' WHERE id = $1", [item.id]);
    await browser.close().catch(() => {});
    await pool.end();
    return;
  }

  // 이미지 첨부 (여러 장 한 번에 → 슬라이드)
  if (cardImages.length > 0) {
    console.log(`이미지 첨부: ${cardImages.length}장`);
    const validImages = cardImages.filter(p => fs.existsSync(p));
    if (validImages.length > 0) {
      try {
        const fileInput = page.locator('input[type="file"]').first();
        if (await fileInput.count() > 0) {
          // 여러 파일 한 번에 setInputFiles → Threads가 자동 슬라이드 처리
          await fileInput.setInputFiles(validImages);
          await sleep(5000); // 여러 장 업로드는 시간 더 필요
          console.log(`  ✅ ${validImages.length}장 첨부됨 (슬라이드)`);
          validImages.forEach(p => console.log(`    ${path.basename(p)}`));
        }
      } catch (e) {
        console.log(`  ⚠️ ${e.message.substring(0, 40)}`);
      }
    }
  }

  // 발행
  console.log('발행...');
  let posted = false;
  let postUrl = null;

  for (const sel of [
    () => page.getByRole('button', { name: /^게시$/i }),
    () => page.locator('div[role="button"]').filter({ hasText: /^게시$/i }).first(),
  ]) {
    try {
      const b = sel();
      if (await b.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reactClick(page, b);
        await sleep(3000);
        posted = true;
        break;
      }
    } catch {}
  }

  if (posted) {
    await pool.query("UPDATE publish_queue SET status = 'published', published_at = NOW() WHERE id = $1", [item.id]);
    console.log(`✅ 발행 완료! (ID: ${item.id})`);

    // 댓글 2개 작성 (댓글1: 꿀팁, 댓글2: 출처)
    const comments = [];
    if (item.comment_text) comments.push(item.comment_text);
    if (item.comment_2) comments.push(item.comment_2);
    else if (item.source_url) comments.push(item.source_url);

    if (comments.length > 0) {
      console.log(`댓글 ${comments.length}개 작성 중...`);
      await sleep(3000);

      try {
        await page.goto('https://www.threads.net/@ai.pacaa', { waitUntil: 'domcontentloaded', timeout: 15000 });
        await sleep(2000);

        const firstPost = page.locator('[data-pressable-container="true"]').first();
        if (await firstPost.isVisible({ timeout: 3000 }).catch(() => false)) {
          await reactClick(page, firstPost);
          await sleep(3000);

          for (let ci = 0; ci < comments.length; ci++) {
            const commentInput = page.locator('textarea[placeholder*="댓글"], textarea[placeholder*="reply"], textarea[placeholder*="comment"]').first();
            if (await commentInput.isVisible({ timeout: 3000 }).catch(() => false)) {
              await reactClick(page, commentInput);
              await sleep(1000);
              await page.keyboard.type(comments[ci].trim(), { delay: rand(50, 100) });
              await sleep(1000);

              const commentBtn = page.getByRole('button', { name: /^게시$/i });
              if (await commentBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await reactClick(page, commentBtn);
                await sleep(3000);
                console.log(`  ✅ 댓글${ci + 1} 작성 완료`);
              } else {
                console.log(`  ⚠️ 댓글${ci + 1} 게시 버튼 없음`);
              }
            }
          }
        }
      } catch (e) {
        console.log(`  ⚠️ 댓글 실패: ${e.message.substring(0, 50)}`);
      }
    }
  } else {
    console.log('❌ 발행 버튼 없음');
    await pool.query("UPDATE publish_queue SET status = 'failed' WHERE id = $1", [item.id]);
  }

  const { rows: remaining } = await pool.query("SELECT count(*) FROM publish_queue WHERE status IN ('pending', 'approved')");
  console.log(`\n남은 글: ${remaining.rows[0].count}개`);

  await sleep(3000);
  await browser.close().catch(() => {});
  await pool.end();
  console.log('=== 발행 종료 ===');
})();
