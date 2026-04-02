// scrape_shibaai_comments.js — 글 상세 + 첫 댓글 수집
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
chromium.use(StealthPlugin());

const USER_DATA = '/home/kkk/.config/google-chrome-for-testing';
const EXEC = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';

(async () => {
  ['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => {
    try { require('fs').unlinkSync(require('path').join(USER_DATA, f)); } catch {}
  });

  const browser = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: EXEC, headless: false,
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox'],
  });

  const page = browser.pages()[0] || await browser.newPage();
  const results = [];

  // 첫 번째 글 클릭해서 상세 진입
  console.log('프로필 접속...');
  await page.goto('https://www.threads.net/@itsshibaai', { waitUntil: 'networkidle', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  // 모든 pressable container 클릭하면서 상세 페이지에서 댓글 수집
  for (let i = 0; i < 15; i++) {
    console.log(`\n[${i+1}/15] 글 진입...`);
    
    try {
      // 프로필로 돌아가기
      if (i > 0) {
        await page.goto('https://www.threads.net/@itsshibaai', { waitUntil: 'networkidle', timeout: 20000 });
        await new Promise(r => setTimeout(r, 2000));
        // 스크롤로 글 로드
        for (let s = 0; s < Math.floor(i / 3); s++) {
          await page.evaluate(() => window.scrollBy(0, 1500));
          await new Promise(r => setTimeout(r, 1500));
        }
      }

      // i번째 글 컨테이너 클릭
      const containers = await page.$$('[data-pressable-container="true"]');
      if (!containers[i]) { console.log('컨테이너 없음'); continue; }
      
      await containers[i].click();
      await new Promise(r => setTimeout(r, 4000));

      // 상세 페이지에서 모든 텍스트 수집
      const pageData = await page.evaluate(() => {
        const allTexts = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
        while (walker.nextNode()) {
          const t = walker.currentNode.textContent.trim();
          if (t.length > 15 && t.length < 1000 && !t.startsWith('{"require') && !t.startsWith('Bootloader')) {
            allTexts.push(t);
          }
        }
        
        // 링크 수집
        const links = [];
        document.querySelectorAll('a[href]').forEach(a => {
          const href = a.getAttribute('href') || '';
          if (href.includes('beehiiv') || href.includes('krea.ai') || href.includes('lumalabs') || 
              href.includes('figma.com') || href.includes('openai.com') || href.includes('cursor.com') ||
              href.includes('vercel.com') || href.includes('anthropic.com') || href.includes('github.com') ||
              href.includes('replicate.com') || href.includes('fal.ai') || href.includes('elevenlabs') ||
              href.includes('runwayml') || href.includes('capcut') || href.includes('benlog')) {
            links.push(href);
          }
        });

        // 영상/이미지 여부
        const hasVideo = !!document.querySelector('video');
        const imgs = document.querySelectorAll('img[src*="cdninstagram"], img[src*="fbcdn"]');
        const hasImage = imgs.length > 0;

        return { allTexts: [...new Set(allTexts)], links, hasVideo, hasImage };
      });

      // 본문과 댓글 분리
      // 첫 번째 텍스트 블록 = 본문, 나머지 = 댓글
      let postText = '';
      let comments = [];
      let inPost = true;
      
      for (const t of pageData.allTexts) {
        if (inPost && (t.includes('시바 충격') || t.includes('시바 속보'))) {
          postText = t;
          inPost = false;
        } else if (inPost && t.length > 30) {
          postText = t;
          inPost = false;
        } else if (!inPost) {
          comments.push(t);
        }
      }

      console.log(`본문: ${postText.substring(0, 80)}`);
      console.log(`댓글: ${comments.length}개`);
      comments.forEach((c, ci) => console.log(`  [${ci}] ${c.substring(0, 120)}`));
      console.log(`링크: ${pageData.links.join(', ')}`);
      console.log(`미디어: ${pageData.hasVideo ? '영상' : ''}${pageData.hasImage ? '이미지' : ''}${!pageData.hasVideo && !pageData.hasImage ? '없음' : ''}`);

      results.push({
        index: i + 1,
        post: postText,
        comments,
        links: pageData.links,
        hasVideo: pageData.hasVideo,
        hasImage: pageData.hasImage,
        allTexts: pageData.allTexts,
      });

      // 뒤로
      await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));

    } catch (e) {
      console.log(`에러: ${e.message.substring(0, 50)}`);
    }
  }

  const fs = require('fs');
  fs.writeFileSync('/home/kkk/.openclaw/workspace/workflow-pipeline/shibaai_deep.json', JSON.stringify(results, null, 2));
  console.log(`\n=== ${results.length}개 저장됨 ===`);
  await browser.close();
})();
