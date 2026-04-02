const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const USER_DATA_DIR = path.join(__dirname, 'browser_data', 'ai_pacaa');
const PROXY = { server: 'http://142.111.67.146:5611', username: 'fbfiukxu', password: 'kqr8qg4mnjmh' };
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';
const fs = require('fs');

['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { fs.unlinkSync(path.join(USER_DATA_DIR, f)); } catch {} });

const humanClick = async (page, el) => {
  const box = await el.boundingBox();
  const x = box.x + box.width * (0.3 + Math.random() * 0.4);
  const y = box.y + box.height * (0.3 + Math.random() * 0.4);
  await page.mouse.move(200 + Math.random()*300, 300 + Math.random()*200);
  const steps = 20;
  const sx = 200 + Math.random()*300, sy = 300 + Math.random()*200;
  for (let i = 1; i <= steps; i++) {
    const p = i / steps;
    const e = p < 0.5 ? 2*p*p : 1 - Math.pow(-2*p+2,2)/2;
    await page.mouse.move(sx + (x-sx)*e + (Math.random()-0.5)*3, sy + (y-sy)*e + (Math.random()-0.5)*3);
    await new Promise(r => setTimeout(r, 20));
  }
  await new Promise(r => setTimeout(r, 700));
  await page.mouse.down();
  await new Promise(r => setTimeout(r, 100));
  await page.mouse.up();
};

(async () => {
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, proxy: PROXY, userAgent: UA,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1,2,3,4,5] });
  });

  // 홈 피드에서 첫 번째 게시물 작성자 찾기
  console.log('홈 피드 이동...');
  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 5000));

  // 스크롤 1회
  await page.evaluate(y => window.scrollBy(0, y), 500);
  await new Promise(r => setTimeout(r, 3000));

  // 첫 게시물 클릭해서 작성자 ID 확인
  const posts = page.locator('[data-pressable-container]');
  const count = await posts.count().catch(() => 0);
  console.log(`게시물 ${count}개`);

  if (count < 1) {
    console.log('게시물 없음');
    await browser.close().catch(() => {});
    return;
  }

  // 게시물 작성자 ID 가져오기 (클릭 전)
  let authorId = null;
  const firstPost = posts.nth(0);
  const postHtml = await firstPost.innerHTML().catch(() => '');
  
  // 작성자 링크 찾기
  const authorLinks = await firstPost.locator('a[href*="/@"]').all();
  for (const link of authorLinks) {
    const href = await link.getAttribute('href').catch(() => '');
    const match = href?.match(/\/@([\w.]+)/);
    if (match && match[1] !== 'ai.pacaa') {
      authorId = '@' + match[1];
      break;
    }
  }

  if (!authorId) {
    // fallback: 게시물 상세 들어가서 URL에서 확인
    await humanClick(page, firstPost);
    await new Promise(r => setTimeout(r, 4000));
    const url = page.url();
    const urlMatch = url.match(/\/@([\w.]+)/);
    if (urlMatch) authorId = '@' + urlMatch[1];
    if (!authorId) {
      // body에서 @mention 찾기
      const bodyText = await page.locator('body').innerText().catch(() => '');
      const mentionMatch = bodyText.match(/@([\w.]+)/);
      if (mentionMatch) authorId = '@' + mentionMatch[1];
    }
  }

  if (!authorId) {
    console.log('작성자 ID 발췌 실패');
    await browser.close().catch(() => {});
    return;
  }

  console.log(`작성자: ${authorId}`);

  // 프로필로 이동해서 팔로우
  console.log(`${authorId} 프로필 이동...`);
  await page.goto(`https://www.threads.net/${authorId}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 4000));

  // 프로필 둘러보기 (자연스러움)
  await page.evaluate(y => window.scrollBy(0, y), 300);
  await new Promise(r => setTimeout(r, 2000));

  // 팔로우 버튼
  try {
    const followBtn = page.getByRole('button', { name: /^follow$|^팔로우$/i });
    await followBtn.waitFor({ state: 'visible', timeout: 5000 });
    await humanClick(page, followBtn);
    console.log(`✅ ${authorId} 팔로우 클릭 완료 (⚠️ 서버 반영 확인 필요)`);
  } catch {
    const fb = page.getByRole('button', { name: /following|팔로잉/i });
    if (await fb.isVisible().catch(() => false)) {
      console.log(`⏭️ 이미 팔로잉: ${authorId}`);
    } else {
      console.log(`❌ 팔로우 버튼 없음: ${authorId}`);
    }
  }

  await browser.close().catch(() => {});
})();
