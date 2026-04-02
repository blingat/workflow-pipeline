#!/usr/bin/env node
// delete_comments2.js — UI로 댓글 직접 삭제
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
chromium.use(StealthPlugin());

const USER_DATA_DIR = '/home/kkk/.config/google-chrome-for-testing';
const EXEC_PATH = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = (msg) => console.log(`[${new Date().toLocaleTimeString('ko-KR',{hour12:false})}] ${msg}`);

['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { fs.unlinkSync(path.join(USER_DATA_DIR, f)); } catch {} });

const BAD = ['Tone/Style', 'Tone:**'];
const TARGETS = [
  { user: '@gpt_park', posts: 1 },
  { user: '@specal1849', posts: 3 },
  { user: '@dev_shibaa', posts: 1 },
];

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, noViewPort: true, executablePath: EXEC_PATH,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  log('=== 댓글 삭제 시작 ===');

  for (const { user, posts: maxPosts } of TARGETS) {
    log(`\n═══ ${user} ═══`);
    await page.goto(`https://www.threads.net/${user}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await sleep(3000);

    const posts = page.locator('[data-pressable-container]');
    const postCount = await posts.count().catch(() => 0);

    for (let i = 0; i < Math.min(maxPosts, postCount); i++) {
      try {
        await posts.nth(i).click();
        await sleep(4000);

        // 페이지 내 모든 텍스트 노드에서 잘못된 댓글 찾기
        const found = await page.evaluate((badKeywords) => {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          let node;
          const results = [];
          while (node = walker.nextNode()) {
            const text = node.textContent.trim();
            if (badKeywords.some(k => text.includes(k)) && text.length < 100) {
              const rect = node.parentElement?.getBoundingClientRect();
              if (rect && rect.width > 0) {
                results.push({ text: text.substring(0, 40), x: rect.x + rect.width/2, y: rect.y + rect.height/2 });
              }
            }
          }
          return results;
        }, BAD);

        if (found.length > 0) {
          for (const f of found) {
            log(`  🗑️ 발견: "${f.text}..." at (${f.x.toFixed(0)}, ${f.y.toFixed(0)})`);
            
            // 길게 누르기 (모바일 UX)
            await page.mouse.move(f.x, f.y);
            await sleep(300);
            await page.mouse.down();
            await sleep(800);
            await page.mouse.up();
            await sleep(1500);

              // 삭제 버튼 찾기
              let deleted = false;
              for (const selector of ['text=삭제', 'text=Delete', 'button:has-text("삭제")']) {
                const btn = page.locator(selector).first();
                if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
                  await btn.click();
                  await sleep(1500);
                  // 확인
                  const confirm = page.locator('text=삭제').first();
                  if (await confirm.isVisible({ timeout: 1000 }).catch(() => false)) {
                    await confirm.click();
                    await sleep(2000);
                    log(`  ✅ 삭제됨`);
                    deleted = true;
                  }
                  break;
                }
              }

              if (!deleted) {
                // 더보기(...) 시도
                log(`  ⚠️ 길게 눌러도 안 됨`);
              }
          }
        } else {
          log(`  ⏭️ 잘못된 댓글 없음`);
        }

        // 뒤로
        await page.goBack({ waitUntil: 'domcontentloaded' });
        await sleep(2000);
      } catch (e) { log(`  에러: ${e.message.substring(0, 50)}`); }
    }
  }

  log('\n=== 완료 ===');
  await sleep(2000);
  await browser.close().catch(() => {});
})();
