// scrape_shibaai_deep.js — @itsshibaai 글 + 첫 댓글 심층 수집
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
  
  console.log('=== @itsshibaai 프로필 접속 ===');
  await page.goto('https://www.threads.net/@itsshibaai', { waitUntil: 'networkidle', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));

  const posts = [];
  
  for (let scroll = 0; scroll < 8; scroll++) {
    // 글 목록 수집
    const items = await page.evaluate(() => {
      const results = [];
      const containers = document.querySelectorAll('[data-pressable-container="true"]');
      const seen = new Set();
      
      for (const container of containers) {
        const textEl = container.querySelector('span[dir="auto"]');
        const text = textEl?.textContent?.trim();
        if (!text || text.length < 15 || seen.has(text)) continue;
        seen.add(text);
        
        // 링크 수집
        const links = [];
        container.querySelectorAll('a[href]').forEach(a => {
          const href = a.getAttribute('href');
          if (href && !href.includes('threads.net') && !href.includes('instagram.com')) {
            links.push(href);
          }
        });
        
        // 이미지/영상 여부
        const hasVideo = !!container.querySelector('video');
        const hasImage = !!container.querySelector('img[src*="cdninstagram"]');
        
        results.push({ text, links, hasVideo, hasImage });
      }
      return results;
    });

    for (const item of items) {
      if (!posts.find(p => p.text === item.text)) {
        posts.push(item);
      }
    }

    await page.evaluate(() => window.scrollBy(0, 1500));
    await new Promise(r => setTimeout(r, 2500));
  }

  // 각 글 클릭해서 첫 댓글 수집
  console.log(`\n총 ${posts.length}개 글 발견. 댓글 수집 시작...\n`);
  
  const detailedPosts = [];
  for (let i = 0; i < Math.min(posts.length, 30); i++) {
    const post = posts[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`[${i+1}/${Math.min(posts.length, 30)}] 글: ${post.text.substring(0, 80)}`);
    console.log(`링크: ${post.links.join(', ') || '없음'}`);
    console.log(`미디어: ${post.hasVideo ? '영상' : ''}${post.hasImage ? '이미지' : ''}${!post.hasVideo && !post.hasImage ? '텍스트만' : ''}`);
    
    // 프로필로 돌아가서 첫 번째 글 클릭
    await page.goto('https://www.threads.net/@itsshibaai', { waitUntil: 'networkidle', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // i번째 글 클릭
    const containers = await page.$$('[data-pressable-container="true"]');
    if (containers[i]) {
      try {
        await containers[i].click();
        await new Promise(r => setTimeout(r, 3000));
        
        // 댓글 수집
        const comments = await page.evaluate(() => {
          const result = [];
          // 댓글 텍스트 모두 수집
          const allText = document.querySelectorAll('span[dir="auto"]');
          // 상세 페이지에서 댓글 찾기
          const commentEls = document.querySelectorAll('[role="article"] span[dir="auto"], [data-pressable-container="true"] span[dir="auto"]');
          for (const el of commentEls) {
            const t = el.textContent.trim();
            if (t.length > 5 && !result.includes(t)) result.push(t);
          }
          return result;
        });
        
        if (comments.length > 1) {
          // 첫 번째는 본문이므로 두 번째부터가 댓글
          const firstComment = comments[1] || '댓글 없음';
          console.log(`💬 첫 댓글: ${firstComment.substring(0, 150)}`);
          
          detailedPosts.push({
            post: post.text,
            links: post.links,
            hasVideo: post.hasVideo,
            hasImage: post.hasImage,
            firstComment: firstComment,
          });
        } else {
          console.log('💬 댓글 없음 (또는 로드 실패)');
          detailedPosts.push({
            post: post.text,
            links: post.links,
            hasVideo: post.hasVideo,
            hasImage: post.hasImage,
            firstComment: '',
          });
        }
        
        // 뒤로가기
        await page.goBack({ waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
        await new Promise(r => setTimeout(r, 1500));
      } catch (e) {
        console.log(`클릭 실패: ${e.message.substring(0, 40)}`);
        detailedPosts.push({ post: post.text, links: post.links, hasVideo: post.hasVideo, hasImage: post.hasImage, firstComment: 'ERROR' });
      }
    }
  }

  // JSON으로 저장
  const fs = require('fs');
  fs.writeFileSync('/home/kkk/.openclaw/workspace/workflow-pipeline/shibaai_analysis.json', JSON.stringify(detailedPosts, null, 2));
  console.log(`\n\n=== 분석 데이터 저장됨 (${detailedPosts.length}개) ===`);

  await browser.close();
})();
