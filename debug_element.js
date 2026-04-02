const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const path = require('path');
const fs = require('fs');
const USER_DATA_DIR = path.join(__dirname, 'browser_data', 'ai_pacaa');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36';

['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => { try { fs.unlinkSync(path.join(USER_DATA_DIR, f)); } catch {} });

(async () => {
  let browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, userAgent: UA,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  let page = browser.pages()[0] || await browser.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  console.log('로그인 확인...');
  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 3000));

  console.log('@specal1849 프로필 이동...');
  await page.goto('https://www.threads.net/@specal1849', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 5000));

  // 스크린샷 (형이 확인용)
  await page.screenshot({ path: '/tmp/debug_profile.png', fullPage: false });
  console.log('스크린샷: /tmp/debug_profile.png');

  // === 1. getByRole로 잡힌 엘리먼트 검증 ===
  console.log('\n===== 1. getByRole 검증 =====\n');
  const followBtn = page.getByRole('button', { name: /^follow$|^팔로우$/i });
  const isVisible = await followBtn.isVisible().catch(() => false);
  console.log(`isVisible: ${isVisible}`);

  if (isVisible) {
    // outerHTML 찍기
    const html = await followBtn.evaluate(el => el.outerHTML);
    console.log(`outerHTML: ${html}`);

    // tagName, role, class, 부모 체인
    const info = await followBtn.evaluate(el => {
      const chain = [];
      let node = el;
      for (let i = 0; i < 5 && node; i++) {
        chain.push({
          tag: node.tagName,
          role: node.getAttribute('role'),
          tabindex: node.getAttribute('tabindex'),
          class: node.className?.toString()?.substring(0, 80),
          text: node.innerText?.substring(0, 30),
          pointerEvents: getComputedStyle(node).pointerEvents,
          cursor: getComputedStyle(node).cursor,
          display: getComputedStyle(node).display,
          visibility: getComputedStyle(node).visibility,
        });
        node = node.parentElement;
      }
      return chain;
    });
    console.log('엘리먼트 체인:');
    info.forEach((n, i) => console.log(`  [${i}] <${n.tag}> role="${n.role}" tabindex="${n.tabindex}" text="${n.text}" display="${n.display}" visibility="${n.visibility}" pointerEvents="${n.pointerEvents}" cursor="${n.cursor}"`));

    // === 2. 상위 role="button" 부모로 Uplift ===
    console.log('\n===== 2. 부모 Uplift 테스트 =====\n');
    const parentBtn = followBtn.locator('xpath=./ancestor::div[@role="button"][1]');
    const parentVisible = await parentBtn.isVisible().catch(() => false);
    console.log(`부모 role=button visible: ${parentVisible}`);

    if (parentVisible) {
      const parentHtml = await parentBtn.evaluate(el => el.outerHTML);
      console.log(`부모 outerHTML: ${parentHtml.substring(0, 300)}`);
    }

    // === 3. 모든 "팔로우"/"Follow" 텍스트 버튼 수집 ===
    console.log('\n===== 3. 페이지 내 모든 팔로우 관련 버튼 =====\n');
    const allFollowBtns = await page.evaluate(() => {
      const results = [];
      const all = document.querySelectorAll('div[role="button"], button, span');
      for (const el of all) {
        const text = el.innerText?.trim();
        if (text === '팔로우' || text === 'Follow') {
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          // 상위 role=button 찾기
          let interactiveParent = el;
          while (interactiveParent && interactiveParent !== document.body) {
            if (interactiveParent.getAttribute('role') === 'button' || interactiveParent.tagName === 'BUTTON') break;
            interactiveParent = interactiveParent.parentElement;
          }
          results.push({
            tag: el.tagName,
            role: el.getAttribute('role'),
            text: text,
            rect: `${Math.round(rect.x)},${Math.round(rect.y)} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
            display: style.display,
            visibility: style.visibility,
            opacity: style.opacity,
            pointerEvents: style.pointerEvents,
            zIndex: style.zIndex,
            parentTag: interactiveParent?.tagName,
            parentRole: interactiveParent?.getAttribute('role'),
            parentText: interactiveParent?.innerText?.substring(0, 30),
            isSameElement: el === interactiveParent,
          });
        }
      }
      return results;
    });

    console.log(`"팔로우" 텍스트 버튼 총 ${allFollowBtns.length}개:`);
    allFollowBtns.forEach((b, i) => {
      console.log(`  [${i}] <${b.tag}> role="${b.role}" text="${b.text}" pos=(${b.rect}) display="${b.display}" visibility="${b.visibility}" opacity="${b.opacity}" pointerEvents="${b.pointerEvents}" z="${b.zIndex}"`);
      if (!b.isSameElement) {
        console.log(`       → 실제 인터랙션 부모: <${b.parentTag}> role="${b.parentRole}" text="${b.parentText}"`);
      }
    });
  } else {
    console.log('팔로우 버튼을 찾을 수 없음');
    // 이미 팔로잉인지 확인
    const fb = page.getByRole('button', { name: /following|팔로잉/i });
    console.log(`팔로잉 버튼: ${await fb.isVisible().catch(() => false)}`);
  }

  // 브라우저는 살려둠 — 형이 VNC로 직접 클릭 테스트 가능하게
  console.log('\n===== 브라우저 살려둠 — 수동 테스트 가능 =====');
  console.log('서버에서 VNC나 스크린샷으로 확인 가능');
  
  // 30초 대기 후 종료
  await new Promise(r => setTimeout(r, 30000));
  await browser.close().catch(() => {});
})();
