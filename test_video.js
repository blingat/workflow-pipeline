const { chromium } = require('playwright');
const { execSync } = require('child_process');
const fs = require('fs');

const DISPLAY = ':99';
const SCREEN = '1920x1080x24';

(async () => {
// 1. Xvfb 시작
console.log('1. Xvfb 시작...');
try {
  execSync(`Xvfb ${DISPLAY} -screen 0 ${SCREEN} &`, { stdio: 'ignore' });
  await new Promise(r => setTimeout(r, 2000));
  console.log('   ✅ Xvfb 실행중');
} catch (e) {
  console.log('   이미 실행중이거나 에러');
}

// 2. FFmpeg 녹화 시작
const ffmpegCmd = `DISPLAY=${DISPLAY} ffmpeg -y -video_size 1920x1080 -framerate 15 -f x11grab -i ${DISPLAY}.0 -t 20 -c:v libx264 -preset ultrafast -pix_fmt yuv420p /tmp/demo_video.mp4 2>/dev/null &`;
console.log('2. FFmpeg 녹화 시작 (20초)...');
execSync(ffmpegCmd, { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 2000));

// 3. Playwright로 브라우저 조작 (Xvfb에 렌더링)
console.log('3. Playwright 시작...');
const browser = await chromium.launch({
  headless: false,
  args: [`--display=${DISPLAY}`, '--no-sandbox'],
  env: { ...process.env, DISPLAY }
});
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
});
const page = await context.newPage();

// Google 접속 (데모)
console.log('4. Google 접속...');
await page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForTimeout(2000);

// 검색창 클릭 + 타이핑 (자연스럽게)
console.log('5. 검색 타이핑...');
const searchBox = await page.$('textarea[name="q"]') || await page.$('input[name="q"]');
if (searchBox) {
  // 마우스를 자연스럽게 이동
  const box = await searchBox.boundingBox();
  await page.mouse.move(box.x + 10, box.y + box.height / 2, { steps: 10 });
  await new Promise(r => setTimeout(r, 500));
  await searchBox.click();
  await new Promise(r => setTimeout(r, 300));

  // 한 글자씩 타이핑
  const query = 'AI tools 2025';
  for (const char of query) {
    await page.keyboard.type(char, { delay: 80 + Math.random() * 100 });
  }
  await new Promise(r => setTimeout(r, 1000));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(5000);
  console.log('   ✅ 검색 완료');
}

// 스크롤
console.log('6. 스크롤...');
for (let i = 0; i < 3; i++) {
  await page.mouse.wheel(0, 300);
  await new Promise(r => setTimeout(r, 800));
}

console.log('7. 브라우저 종료...');
await browser.close();

// 8. FFmpeg 종료 대기
console.log('8. 영상 저장 대기...');
await new Promise(r => setTimeout(r, 5000));

// 결과 확인
const { size } = fs.statSync('/tmp/demo_video.mp4');
console.log(`\n✅ 영상 생성 완료: /tmp/demo_video.mp4 (${(size/1024).toFixed(0)}KB)`);
})();
