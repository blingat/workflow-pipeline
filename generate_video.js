// generate_video.js — AI 툴 웹사이트 자동 시연 영상 녹화
// 사용법: node generate_video.js --url "https://example.com" --duration 20
//         node generate_video.js --queue (publish_queue에서 URL 추출)
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { spawn } = require('child_process');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
chromium.use(StealthPlugin());

const DB_URL = 'postgresql://neondb_owner:npg_OZ8lmEfJDg4e@ep-purple-recipe-a1l3vs4n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const MEDIA_DIR = path.join(__dirname, 'media', 'videos');
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR, { recursive: true });

const DISPLAY = process.env.DISPLAY || ':99';
const EXEC_PATH = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const USER_DATA = '/home/kkk/.config/google-chrome-for-testing';

// 마우스를 자연스럽게 이동시키는 Bezier 곡선
async function humanMove(page, x, y) {
  const steps = 20;
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const cx = x * t + (Math.random() - 0.5) * 30 * (1 - t);
    const cy = y * t + (Math.random() - 0.5) * 30 * (1 - t);
    await page.mouse.move(cx, cy);
    await new Promise(r => setTimeout(r, 30));
  }
}

async function recordVideo(url, duration = 20, outputPath = null) {
  if (!outputPath) {
    const ts = Date.now();
    outputPath = path.join(MEDIA_DIR, `demo_${ts}.mp4`);
  }

  // FFmpeg로 화면 녹화 시작 (spawn으로 비동기)
  const ffmpeg = spawn('ffmpeg', [
    '-y', '-f', 'x11grab', '-video_size', '1920x1080', '-framerate', '30',
    '-i', `${DISPLAY}.0`, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28',
    '-pix_fmt', 'yuv420p', '-t', String(duration), outputPath
  ]);
  let ffmpegError = '';
  ffmpeg.stderr.on('data', d => { ffmpegError += d.toString(); });
  const ffmpegDone = new Promise(resolve => ffmpeg.on('close', resolve));

  // Singleton 파일 정리
  ['SingletonLock','SingletonCookie','SingletonSocket'].forEach(f => {
    try { fs.unlinkSync(path.join(USER_DATA, f)); } catch {}
  });

  const browser = await chromium.launchPersistentContext(USER_DATA, {
    executablePath: EXEC_PATH, headless: false, noViewPort: true,
    args: ['--no-sandbox','--disable-dev-shm-use','--disable-blink-features=AutomationControlled','--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR',
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    console.log(`🎬 녹화 시작: ${url} (${duration}초)`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // 자연스러운 마우스 움직임 + 스크롤 시연
    const actions = duration * 1000;
    const elapsed = Date.now();

    while (Date.now() - elapsed < actions - 3000) {
      // 랜덤 스크롤
      const scrollY = Math.random() * 500 + 100;
      await page.evaluate((y) => window.scrollBy(0, y), scrollY);
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 2000));

      // 랜덤 마우스 이동
      await humanMove(page, Math.random() * 800 + 200, Math.random() * 400 + 200);
      await new Promise(r => setTimeout(r, 1000 + Math.random() * 1500));

      // 가끔 클릭 (안전한 영역)
      if (Math.random() > 0.7) {
        try {
          await page.mouse.click(Math.random() * 800 + 200, Math.random() * 400 + 200);
        } catch {}
      }
    }

    console.log(`✅ 브라우저 작업 완료`);
  await browser.close().catch(() => {});
  
  // FFmpeg 녹화 완료 대기
  console.log('⏳ FFmpeg 녹화 완료 대기...');
  await ffmpegDone;
  if (ffmpegError.includes('error')) console.log('⚠️ FFmpeg:', ffmpegError.substring(0, 100));
  console.log(`✅ 녹화 완료: ${outputPath}`);
  } catch (e) {
    console.log(`❌ 녹화 실패: ${e.message.substring(0, 60)}`);
  }

  await browser.close().catch(() => {});
  return outputPath;
}

// CLI 인자 파싱
const args = process.argv.slice(2);
let mode = 'url';
let targetUrl = '';
let duration = 20;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--queue') mode = 'queue';
  else if (args[i] === '--url') { targetUrl = args[++i]; }
  else if (args[i] === '--duration') { duration = parseInt(args[++i]) || 20; }
}

(async () => {
  if (mode === 'queue') {
    // publish_queue에서 source_url 추출해서 영상 녹화
    const pool = new Pool({ connectionString: DB_URL });
    const { rows } = await pool.query(
      "SELECT id, source_url, content FROM publish_queue WHERE status IN ('pending','approved') AND source_url LIKE 'http%' AND video_url IS NULL LIMIT 3"
    );

    if (rows.length === 0) {
      console.log('영상 생성 대상 없음');
      await pool.end();
      return;
    }

    // Xvfb 확인
    if (!fs.existsSync('/tmp/.X11-unix/X' + DISPLAY.replace(':', ''))) {
      console.log('❌ Xvfb가 실행 중이 아님');
      await pool.end();
      return;
    }

    for (const row of rows) {
      // URL에서 도메인만 추출 (기사 전체 URL이 아닌 서비스 URL 필요)
      // source_url에서 서비스 도메인 추출 시도
      let videoUrl = row.source_url;
      // 기사 URL인 경우 도메인만 사용
      try {
        const u = new URL(row.source_url);
        videoUrl = u.origin;
      } catch {}

      const outputPath = path.join(MEDIA_DIR, `demo_${row.id}.mp4`);
      await recordVideo(videoUrl, duration, outputPath);

      if (fs.existsSync(outputPath) && fs.statSync(outputPath).size > 10000) {
        await pool.query(
          "UPDATE publish_queue SET video_url = $1 WHERE id = $2",
          [outputPath, row.id]
        );
        console.log(`✅ queue#${row.id} 영상 연결됨`);
      } else {
        console.log(`⚠️ queue#${row.id} 영상 파일 이상`);
      }
    }
    await pool.end();
  } else if (targetUrl) {
    if (!fs.existsSync('/tmp/.X11-unix/X' + DISPLAY.replace(':', ''))) {
      console.log('❌ Xvfb가 실행 중이 아님');
      process.exit(1);
    }
    await recordVideo(targetUrl, duration);
  } else {
    console.log('사용법:');
    console.log('  node generate_video.js --url "https://example.com" --duration 20');
    console.log('  node generate_video.js --queue');
  }
})();
