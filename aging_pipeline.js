#!/usr/bin/env node
// aging_pipeline.js — 에이징 오케스트레이터 v9 (봇 감지 우회 강화)
// Scanner → Engager → Reposter → Commenter → Follower
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { scanFeed } = require('./scanner');
const { engage } = require('./engager');
const { repost } = require('./reposter');
const { commentOnPosts } = require('./commenter');
const { followNew } = require('./follower');
const { humanDelay, jitter, sleep, isLocked, onCheckpoint, updateTrustScore, getActionLimits, FINGERPRINT_SCRIPT } = require('./stealth_utils');

chromium.use(StealthPlugin());

const DB_URL = 'postgresql://neondb_owner:npg_OZ8lmEfJDg4e@ep-purple-recipe-a1l3vs4n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const pool = new Pool({ connectionString: DB_URL });

const USER_DATA_DIR = '/home/kkk/.config/google-chrome-for-testing';
const EXEC_PATH = '/home/kkk/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome';
const LOG_FILE = '/tmp/aging_v9.log';
const RESULT_FILE = '/tmp/aging_result.json';
const CONFIG_FILE = path.join(__dirname, '.aging_config.json');
const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

const log = (msg) => {
  const t = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  const line = `[${t}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
};

['SingletonLock', 'SingletonCookie', 'SingletonSocket'].forEach(f => {
  try { fs.unlinkSync(path.join(USER_DATA_DIR, f)); } catch {}
});

const humanScroll = async (page, dir = 1) => {
  await page.evaluate(y => window.scrollBy(0, y), jitter(300, 600) * dir);
  await sleep(jitter(2000, 5000));
  if (Math.random() < 0.15) {
    await page.evaluate(y => window.scrollBy(0, y), jitter(500, 800) * dir);
    await sleep(jitter(800, 1500));
    await page.evaluate(y => window.scrollBy(0, -y), jitter(200, 400) * dir);
    await sleep(jitter(500, 1000));
  }
};

(async () => {
  // === 체크포인트 락 확인 ===
  if (isLocked()) {
    process.exit(0);
  }

  // === Trust Score 확인 ===
  const trustLimits = getActionLimits();
  updateTrustScore();

  const startTime = Date.now();

  // 설정 읽기 (Trust Score 제한과 config 중 최소값 사용)
  let config = {};
  try { config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8')); } catch {}
  const MAX_DURATION = (config.max_duration || trustLimits.sessionMin) * 60 * 1000;
  const MAX_LIKES = Math.min(config.max_likes || 10, trustLimits.likes);
  const MAX_FOLLOWS = Math.min(config.max_follows || 5, trustLimits.follows);
  const MAX_REPOSTS = Math.min(config.max_reposts || 3, trustLimits.reposts);
  const MAX_COMMENTS = Math.min(config.max_comments || 3, trustLimits.comments);

  // 로그 초기화
  fs.writeFileSync(LOG_FILE, '');
  log(`=== AI파카 에이징 v9 (봇 감지 우회 강화) 시작 ===`);
  log(`📋 Trust Level: ${trustLimits.level} (${trustLimits.days}일 차)`);
  log(`🎯 목표: 좋아요 ${MAX_LIKES}, 팔로우 ${MAX_FOLLOWS}, 리포스트 ${MAX_REPOSTS}, 댓글 ${MAX_COMMENTS}`);

  // 브라우저 실행
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, noViewPort: true, executablePath: EXEC_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-use', '--disable-blink-features=AutomationControlled', '--lang=ko-KR'],
    viewport: { width: 1920, height: 1080 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul',
  });
  const page = browser.pages()[0] || await browser.newPage();
  await page.setViewportSize({ width: 1920, height: 1080 });

  // 기본 Stealth + 핑거프린트 무력화
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'languages', { get: () => ['ko-KR', 'ko', 'en-US', 'en'] });
  });
  await page.addInitScript(FINGERPRINT_SCRIPT);

  // GQL 로깅 + 체크포인트 감지
  page.on('response', async (r) => {
    if (r.url().includes('/graphql') && r.request().method() === 'POST') {
      const req = r.request().postData() || '';
      if (/variables|follow|like|repost|create/i.test(req)) {
        try {
          const text = await r.text();
          log(`  [GQL] ${r.status()} → ${text.substring(0, 100)}`);
          // 체크포인트 감지
          if (text.includes('checkpoint_required') || text.includes('confirm_you')) {
            log('🚨 체크포인트 감지! 락 설정.');
            onCheckpoint();
          }
        } catch {}
      }
    }
  });

  // 로그인 확인
  log('로그인 확인...');
  await page.goto('https://www.threads.net/', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await humanDelay(3000, 5000);

  // 체크포인트 페이지 감지 (UI)
  const pageContent = await page.content().catch(() => '');
  if (pageContent.includes('Confirm you') || pageContent.includes('confirm_you') || pageContent.includes('checkpoint')) {
    log('🚨 체크포인트 페이지 감지! 락 설정.');
    onCheckpoint();
    await browser.close().catch(() => {});
    process.exit(0);
  }

  if (page.url().includes('login') || page.url().includes('signin')) {
    log('❌ 로그인 필요!');
    await browser.close().catch(() => {});
    process.exit(1);
  }
  log('✅ 로그인됨');

  // 첫 화면에서 자연스러운 스크롤 (바로 액션하지 않음)
  log('👀 피드 확인 중...');
  await humanDelay(3000, 6000);
  for (let i = 0; i < 2; i++) await humanScroll(page, 1);
  await humanDelay(2000, 4000);

  // === 1단계: Scanner ===
  log('\n' + '═'.repeat(40));
  log('1️⃣ Scanner: 피드 스캔');
  log('═'.repeat(40));
  const candidates = await scanFeed(page);

  if (Date.now() - startTime > MAX_DURATION) { log('⏰ 시간 초과'); await browser.close(); return; }

  // === 2단계: Engager ===
  log('\n' + '═'.repeat(40));
  log('2️⃣ Engager: 좋아요');
  log('═'.repeat(40));
  const likes = await engage(page, candidates, { maxLikes: MAX_LIKES });

  if (Date.now() - startTime > MAX_DURATION) { log('⏰ 시간 초과'); }

  // 단계 간 휴식 (자연스러운 스크롤 + 딜레이)
  log('   ⏸️ 피드 스크롤 중...');
  try { for (let i = 0; i < 2; i++) await humanScroll(page, 1); } catch {}
  await humanDelay(8000, 15000);

  // === 3단계: Reposter ===
  log('\n' + '═'.repeat(40));
  log('3️⃣ Reposter: 리포스트');
  log('═'.repeat(40));
  const reposts = await repost(page, candidates, { maxReposts: MAX_REPOSTS });

  if (Date.now() - startTime > MAX_DURATION) { log('⏰ 시간 초과'); }

  log('   ⏸️ 피드 스크롤 중...');
  try { for (let i = 0; i < 2; i++) await humanScroll(page, 1); } catch {}
  await humanDelay(8000, 15000);

  // === 4단계: Commenter ===
  log('\n' + '═'.repeat(40));
  log('4️⃣ Commenter: 댓글 (Evaluator 검증)');
  log('═'.repeat(40));
  const comments = await commentOnPosts(page, candidates, { maxComments: MAX_COMMENTS });

  if (Date.now() - startTime > MAX_DURATION) { log('⏰ 시간 초과'); }

  log('   ⏸️ 피드 스크롤 중...');
  try { for (let i = 0; i < 2; i++) await humanScroll(page, 1); } catch {}
  await humanDelay(8000, 15000);

  // === 5단계: Follower ===
  log('\n' + '═'.repeat(40));
  log('5️⃣ Follower: 신규 팔로우 [GQL]');
  log('═'.repeat(40));
  const follows = await followNew(page, candidates, { maxFollows: MAX_FOLLOWS });

  // === 마무리: 자연스러운 스크롤 후 종료 ===
  log('\n=== 마무리 스크롤 ===');
  try {
    for (let i = 0; i < 3; i++) await humanScroll(page, 1);
  } catch {}
  await humanDelay(2000, 5000);

  // === 결과 ===
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  const newFollows = follows.length;
  const actionLog = { likes, follows, reposts, comments, commentLikes: [] };

  const result = { elapsed, newFollows, actionLog, ts: new Date().toISOString() };
  fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));

  log(`\n${'═'.repeat(50)}`);
  log(`  에이징 완료 — ${Math.floor(elapsed / 60)}분 ${elapsed % 60}초`);
  log(`${'═'.repeat(50)}`);
  log(`❤️ 좋아요: ${likes.length}개 (목표 ${MAX_LIKES})`);
  likes.forEach((r, i) => log(`  ${i + 1}. ${r.author} (${r.postId}) [${r.graphql === '200' ? '✅' : '⚠️'}${r.graphql}]`));
  log(`✅ 팔로우: ${newFollows}개 신규 (목표 ${MAX_FOLLOWS})`);
  follows.forEach((r, i) => log(`  ${i + 1}. ${r.target} [${r.ui}]`));
  log(`🔄 리포스트: ${reposts.length}개 (목표 ${MAX_REPOSTS})`);
  reposts.forEach((r, i) => log(`  ${i + 1}. ${r.author} (${r.postId}) [${r.graphql === '200' ? '✅' : '⚠️'}${r.graphql}]`));
  log(`💬 댓글: ${comments.length}개 (목표 ${MAX_COMMENTS})`);
  comments.forEach((r, i) => log(`  ${i + 1}. ${r.author}: "${r.text}" [${r.graphql === '200' ? '✅' : '⚠️'}${r.graphql}]`));
  log(`${'═'.repeat(50)}`);

  // DB 저장
  try {
    await pool.query(`INSERT INTO aging_logs (started_at, ended_at, duration_sec, likes_count, likes_detail, reposts_count, reposts_detail, comments_count, comments_detail, follows_count, follows_detail, status)
      VALUES ($1, now(), $2, $3, $4, $5, $6, $7, $8, $9, $10, 'completed')`,
      [new Date(startTime), elapsed, likes.length, JSON.stringify(likes), reposts.length, JSON.stringify(reposts), comments.length, JSON.stringify(comments), follows.length, JSON.stringify(follows)]
    );
    log('💾 DB 저장 완료');
  } catch (e) { log(`❌ DB 저장 실패: ${e.message}`); }
  await pool.end().catch(() => {});

  await browser.close().catch(() => {});
  log('✅ 브라우저 종료');
})();
