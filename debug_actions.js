#!/usr/bin/env node
// 네트워크 디버그 — 좋아요/Reply 클릭 시 모든 요청 기록
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const USER_DATA_DIR = '/home/kkk/.config/google-chrome-for-testing';
const EXEC_PATH = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { require('fs').unlinkSync(require('path').join(USER_DATA_DIR, f)); } catch {} });

const humanClick = async (page, element) => {
  const box = await element.boundingBox();
  if (!box) throw new Error('no box');
  const x = box.x + box.width * (rand(25, 75) / 100);
  const y = box.y + box.height * (rand(25, 75) / 100);
  await page.mouse.move(rand(100,400), rand(200,600)); await sleep(300);
  for (let i = 1; i <= 20; i++) {
    const p = i / 20, e = p < 0.5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;
    await page.mouse.move(rand(100,400)+(x-rand(100,400))*e+(Math.random()-.5)*3, rand(200,600)+(y-rand(200,600))*e+(Math.random()-.5)*3);
    await sleep(rand(10,30));
  }
  await sleep(rand(500,1000));
  await page.mouse.down(); await sleep(rand(50,150)); await page.mouse.up();
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
  });

  // 모든 요청/응답 기록
  const allRequests = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('graphql') || url.includes('api')) {
      allRequests.push({ dir: 'REQ', method: req.method(), url: url.substring(0, 150), body: (req.postData() || '').substring(0, 100) });
    }
  });
  page.on('response', async res => {
    const url = res.url();
    if (url.includes('graphql') || url.includes('api')) {
      try {
        allRequests.push({ dir: 'RES', status: res.status(), url: url.substring(0, 150), body: (await res.text()).substring(0, 100) });
      } catch {}
    }
  });

  await page.goto('https://www.threads.net/@aitrendmaster', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(5000);

  // ===== 좋아요 테스트 =====
  console.log('===== 좋아요 테스트 =====');
  const beforeLen = allRequests.length;
  const posts = page.locator('[data-pressable-container]');
  const post = posts.nth(3); // 네 번째 글
  const likeBtn = post.getByRole('button', { name: /like|좋아요/i, exact: true });

  if (await likeBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('좋아요 버튼 발견, 클릭...');
    await humanClick(page, likeBtn);
    await sleep(5000);

    // 클릭 후 요청만 필터링
    const newReqs = allRequests.slice(beforeLen);
    console.log(`\n클릭 후 ${newReqs.length}개 요청:`);
    newReqs.forEach((r, i) => {
      const tag = r.body && r.body.length > 5 ? ` body="${r.body.substring(0, 80)}"` : '';
      console.log(`  [${i}] ${r.dir} ${r.status || r.method} ${r.url}${tag}`);
    });

    if (newReqs.length === 0) {
      console.log('\n⚠️ 요청 없음! 이벤트가 안 트리거됨');
      // 버튼 상태 확인
      const btnText = await likeBtn.innerText().catch(() => '?');
      console.log(`버튼 텍스트: "${btnText}"`);
      // 대신 page.click() 시도
      console.log('\npage.click({ force: true }) 재시도...');
      const beforeLen2 = allRequests.length;
      await likeBtn.click({ force: true, delay: 150 });
      await sleep(5000);
      const newReqs2 = allRequests.slice(beforeLen2);
      console.log(`재시도 후 ${newReqs2.length}개 요청:`);
      newReqs2.forEach((r, i) => {
        console.log(`  [${i}] ${r.dir} ${r.status || r.method} ${r.url}`);
      });
    }
  } else {
    console.log('좋아요 버튼 없음');
  }

  // ===== 댓글 테스트 =====
  console.log('\n\n===== 댓글 테스트 =====');
  // 상세 페이지 직접 진입
  const postLinkEl = posts.nth(4).locator('a[href*="/post/"]').first();
  const postHref = await postLinkEl.getAttribute('href').catch(() => null);
  if (postHref) {
    const fullUrl = postHref.startsWith('http') ? postHref : `https://www.threads.net${postHref}`;
    console.log(`상세: ${fullUrl}`);
    await page.goto(fullUrl, { waitUntil: 'networkidle', timeout: 20000 });
    await sleep(3000);

    // 페이지 텍스트 덤프
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log(`페이지 텍스트 (200자): "${bodyText.substring(0, 200)}"`);

    // Reply 버튼 찾기
    const replyBtn = page.getByRole('button', { name: /reply|답글/i, exact: true });
    if (await replyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('Reply 버튼 발견, 클릭...');
      const beforeLen3 = allRequests.length;
      await humanClick(page, replyBtn);
      await sleep(5000);

      const newReqs3 = allRequests.slice(beforeLen3);
      console.log(`클릭 후 ${newReqs3.length}개 요청:`);
      newReqs3.forEach((r, i) => {
        console.log(`  [${i}] ${r.dir} ${r.status || r.method} ${r.url}`);
      });

      // textbox 찾기
      const textbox = page.getByRole('textbox');
      console.log(`textbox visible: ${await textbox.isVisible().catch(() => false)}`);

      // page.click() 재시도
      if (!await textbox.isVisible().catch(() => false)) {
        console.log('\nReply page.click({ force: true }) 재시도...');
        await replyBtn.click({ force: true, delay: 150 });
        await sleep(5000);
        console.log(`textbox visible: ${await textbox.isVisible().catch(() => false)}`);
      }
    } else {
      console.log('Reply 버튼 없음');
    }
  }

  await browser.close().catch(() => {});
  console.log('\n===== 디버그 완료 =====');
})();
