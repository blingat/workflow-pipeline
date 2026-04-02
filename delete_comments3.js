#!/usr/bin/env node
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
chromium.use(StealthPlugin());

const USER_DATA_DIR = '/home/kkk/.config/google-chrome-for-testing';
const EXEC_PATH = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = msg => console.log(`[${new Date().toLocaleTimeString('ko-KR',{hour12:false})}] ${msg}`);

['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { fs.unlinkSync(path.join(USER_DATA_DIR, f)); } catch {} });

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, noViewPort: true, executablePath: EXEC_PATH,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  // @gpt_park 첫 번째 게시물로 직접 이동
  log('=== @gpt_park 댓글 삭제 시도 ===');
  await page.goto('https://www.threads.net/@gpt_park', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(3000);

  // 첫 게시물 클릭
  await page.locator('[data-pressable-container]').first().click();
  await sleep(4000);

  // 캡처해서 상태 확인
  await page.screenshot({ path: '/tmp/delete_before.png' });
  log('스크린샷 저장: /tmp/delete_before.png');

  // 댓글 영역의 모든 버튼/아이콘 클릭 시도
  // 방법: ai.pacaa 이름 근처의 더보기 버튼 찾기
  const buttons = await page.evaluate(() => {
    const results = [];
    // 모든 role=button 요소 중 텍스트가 없는 작은 버튼들 (아이콘 버튼)
    const btns = document.querySelectorAll('[role="button"]');
    btns.forEach((b, i) => {
      const rect = b.getBoundingClientRect();
      const text = b.textContent?.trim() || '';
      if (rect.width < 50 && rect.width > 10 && rect.height < 50 && !text) {
        results.push({ i, x: rect.x + rect.width/2, y: rect.y + rect.height/2, w: rect.width, h: rect.height, ariaLabel: b.getAttribute('aria-label') || '' });
      }
    });
    return results;
  });

  log(`작은 버튼 ${buttons.length}개 발견`);
  buttons.forEach(b => log(`  btn#${b.i}: (${b.x.toFixed(0)},${b.y.toFixed(0)}) ${b.w}x${b.h} ${b.ariaLabel}`));

  // 하단 고정 바 근처의 버튼들 클릭해서 메뉴 열어보기
  // 댓글이 하단에 있으므로 y좌표 큰 것부터
  const sorted = buttons.filter(b => b.y > 900).sort((a,b) => b.y - a.y);

  for (const btn of sorted.slice(0, 5)) {
    log(`  클릭: (${btn.x.toFixed(0)},${btn.y.toFixed(0)})`);
    await page.mouse.click(btn.x, btn.y);
    await sleep(1500);

    // 삭제 버튼 appeared?
    const deleteBtn = page.getByText('삭제').first();
    if (await deleteBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      log(`  ✅ 삭제 버튼 발견!`);
      await deleteBtn.click();
      await sleep(1500);
      const confirm = page.getByText('삭제').first();
      if (await confirm.isVisible({ timeout: 1000 }).catch(() => false)) {
        await confirm.click();
        await sleep(2000);
        log(`  ✅ 댓글 삭제 완료!`);
        break;
      }
    }

    // 닫기
    await page.keyboard.press('Escape');
    await sleep(500);
  }

  await page.screenshot({ path: '/tmp/delete_after.png' });
  log('완료');
  await sleep(2000);
  await browser.close().catch(() => {});
})();
