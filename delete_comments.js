#!/usr/bin/env node
// delete_comments.js — 특정 댓글 삭제
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
chromium.use(StealthPlugin());

const USER_DATA_DIR = '/home/kkk/.config/google-chrome-for-testing';
const EXEC_PATH = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const LOG_FILE = '/tmp/delete_comments.log';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { fs.unlinkSync(path.join(USER_DATA_DIR, f)); } catch {} });

const log = (msg) => {
  const t = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  const line = `[${t}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
};

// 삭제할 댓글 텍스트
const BAD_COMMENTS = [
  'Tone/Style:** 반말 (informal/casual Korean)',
  'Tone/Style:** 반말 (Casual/informal Korean)',
  'Tone:** Casual/informal (반말 - banmal).',
];

const TARGETS = ['@gpt_park', '@specal1849', '@dev_shibaa'];

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, noViewPort: true, executablePath: EXEC_PATH,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  log('=== 댓글 삭제 시작 ===');

  for (const target of TARGETS) {
    try {
      log(`\n═══ ${target} 프로필 ===`);
      await page.goto(`https://www.threads.net/${target}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(3000);

      // 게시물 클릭
      const posts = page.locator('[data-pressable-container]');
      const postCount = await posts.count().catch(() => 0);
      log(`  게시물 ${postCount}개`);

      for (let i = 0; i < Math.min(3, postCount); i++) {
        try {
          await posts.nth(i).click();
          await sleep(3000);

          // 내 댓글 찾기 (ai.pacaa 댓글)
          const allText = await page.evaluate(() => document.body.innerText);
          let found = false;
          for (const bad of BAD_COMMENTS) {
            if (allText.includes(bad.substring(0, 20))) {
              found = true;
              log(`  🗑️ 잘못된 댓글 발견: "${bad.substring(0, 30)}..."`);

              // 댓글 길게 눌러서 메뉴 열기
              const commentEls = await page.locator('span, div').all();
              for (const el of commentEls) {
                const text = await el.textContent().catch(() => '');
                if (text.includes('Tone/Style') || text.includes('Tone:**')) {
                  // 우클릭 또는 길게 누르기
                  const box = await el.boundingBox();
                  if (box) {
                    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
                    await sleep(1000);

                    // 삭제 버튼 찾기
                    const deleteBtn = page.locator('text=삭제').first();
                    if (await deleteBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                      await deleteBtn.click();
                      await sleep(2000);
                      const confirmBtn = page.locator('text=삭제').first();
                      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                        await confirmBtn.click();
                        await sleep(2000);
                        log(`  ✅ 댓글 삭제됨`);
                      }
                    } else {
                      // 다른 방법: 더보기(...) 버튼
                      log(`  ⚠️ 삭제 메뉴 없음, 더보기 시도`);
                    }
                  }
                  break;
                }
              }
              break;
            }
          }
          if (!found) log(`  ⏭️ 잘못된 댓글 없음`);

          // 뒤로
          await page.goBack({ waitUntil: 'domcontentloaded', timeout: 10000 });
          await sleep(2000);
        } catch (e) { log(`  에러: ${e.message.substring(0, 40)}`); }
      }
    } catch (e) { log(`  ${target} 실패: ${e.message.substring(0, 40)}`); }
  }

  log('\n=== 삭제 완료 ===');
  await sleep(2000);
  await browser.close().catch(() => {});
})();
