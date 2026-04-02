const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'ko-KR',
  });
  const page = await context.newPage();

  // 로그인
  await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(4000);
  await page.fill('input[name="email"]', 'ai.pacaa');
  await page.fill('input[name="pass"]', 'tkdfhrtn0!');
  await page.press('input[name="pass"]', 'Enter');
  await page.waitForTimeout(8000);
  if (page.url().includes('onetap')) {
    const btn = await page.$('button:has-text("나중에")') || await page.$('button:has-text("Not Now")');
    if (btn) await btn.click();
    await page.waitForTimeout(3000);
  }

  // 프로필 페이지 상세 분석
  await page.goto('https://www.threads.net/@itsshibaai', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(8000);
  await page.screenshot({ path: '/tmp/shiba_profile.png' });

  // 첫 번째 게시물 클릭
  console.log('첫 게시물 구조 분석...');
  
  // 모든 게시물 컨테이너 찾기
  const postStructure = await page.evaluate(() => {
    const results = [];
    // 각 게시물 컨테이너를 찾기
    const containers = document.querySelectorAll('[data-pressable-container]');
    
    for (let i = 0; i < Math.min(containers.length, 5); i++) {
      const container = containers[i];
      const html = container.innerHTML.substring(0, 2000);
      const text = container.innerText.substring(0, 500);
      
      // 비디오/이미지 요소 확인
      const videos = container.querySelectorAll('video');
      const imgs = container.querySelectorAll('img');
      const svgPlay = container.querySelector('svg[aria-label="Play"]') || container.querySelector('[aria-label="재생"]');
      const svgImg = container.querySelector('svg[aria-label="Image"]') || container.querySelector('[aria-label="이미지"]');
      const links = container.querySelectorAll('a[href]');
      
      results.push({
        index: i,
        text: text,
        hasVideo: videos.length > 0,
        videoCount: videos.length,
        hasImage: imgs.length > 0,
        imageCount: imgs.length,
        hasPlayButton: !!svgPlay,
        linkCount: links.length,
        links: Array.from(links).map(l => l.href).slice(0, 5),
        htmlSnippet: html.substring(0, 500),
      });
    }
    return results;
  });

  console.log(JSON.stringify(postStructure, null, 2));

  // 첫 게시물 클릭해서 상세보기
  console.log('\n첫 게시물 클릭...');
  const firstPost = await page.$('[data-pressable-container]');
  if (firstPost) {
    await firstPost.click();
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/tmp/shiba_post_detail.png' });
    
    const detailText = await page.textContent('body').catch(() => '');
    const clean = detailText.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();
    console.log('상세 내용:', clean.substring(0, 1000));
  }

  await browser.close();
})();
