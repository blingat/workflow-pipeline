#!/usr/bin/env node
// pipeline.js — 6단계 오케스트레이터
// Parser(collector) → Hooker → Visualizer → Evaluator → Closer → Evaluator → Queue INSERT
// FAIL 시 해당 단계 재실행 (최대 3회)
const { Pool } = require('pg');
const { generateHook, getRecentOpenings, extractOpening, validateStructure } = require('./hooker');
const { generateComments, validateComments } = require('./closer');
const { evaluateContent, ruleBasedCheck } = require('./evaluator');
const { visualize } = require('./visualizer');

const DB_URL = 'postgresql://neondb_owner:npg_OZ8lmEfJDg4e@ep-purple-recipe-a1l3vs4n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const MAX_RETRIES = 3;

const pool = new Pool({ connectionString: DB_URL });

const log = (msg) => {
  const t = new Date().toLocaleTimeString('ko-KR', { hour12: false });
  console.log(`[${t}] ${msg}`);
};

(async () => {
  const startTime = Date.now();
  log('=== AI파카 파이프라인 5단계 시작 ===');

  // 1. Parser: 미분석 글 조회
  const { rows: posts } = await pool.query(`
    SELECT cp.* FROM collected_posts cp
    LEFT JOIN analysis_results ar ON ar.post_id::text = cp.id::text
    WHERE ar.id IS NULL
    ORDER BY cp.created_at DESC
    LIMIT 5
  `);

  if (posts.length === 0) {
    log('⏭️ 분석 대상 없음');
    await pool.end();
    return;
  }

  log(`1️⃣ Parser: ${posts.length}개 수집된 글 발견`);

  const recentOpenings = await getRecentOpenings(15);
  log(`   최근 오프닝 ${recentOpenings.length}개 로드 (중복 방지)`);

  let successCount = 0;

  for (const post of posts) {
    log(`\n${'═'.repeat(40)}`);
    log(`📝 ${post.content?.substring(0, 60)}...`);

    // 2. Hooker: 본문 생성 (최대 3회 재시도)
    let body = null;
    let hookerPass = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      log(`2️⃣ Hooker: 본문 생성 (시도 ${attempt}/${MAX_RETRIES})`);
      body = await generateHook(post, recentOpenings);

      // 기본 구조 검증
      const sv = validateStructure(body);
      if (!sv.ok) {
        log(`   ⚠️ 구조 검증 FAIL: ${sv.reason}`);
        continue;
      }

      // 4. Evaluator: 본문 검증
      log(`4️⃣ Evaluator: 본문 검증`);
      const evalResult = await evaluateContent({ body, comments: null, recentOpenings });

      if (evalResult.pass) {
        log(`   ✅ PASS (${evalResult.score}/10)`);
        hookerPass = true;
        break;
      } else {
        log(`   ❌ FAIL: ${evalResult.reason}`);
        // 오프닝을 중복 방지 목록에 임시 추가
        recentOpenings.push(extractOpening(body));
      }
    }

    if (!hookerPass || !body) {
      log(`   🚫 본문 생성 실패 — 스킵`);
      continue;
    }

    // 3. Visualizer: 시각 자료 매칭
    log(`3️⃣ Visualizer: 시각 자료 매칭`);
    const mediaUrls = await visualize(body, post.source_url || '');
    const mediaJson = JSON.stringify(mediaUrls);
    log(`   📎 매칭 미디어: ${mediaUrls.length}개`);

    // 4. Closer: 댓글 생성 (최대 3회 재시도)
    let comments = null;
    let closerPass = false;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      log(`4️⃣ Closer: 댓글 생성 (시도 ${attempt}/${MAX_RETRIES})`);
      comments = await generateComments(body, post.source_url || '');

      const cv = validateComments(comments);
      if (!cv.ok) {
        log(`   ⚠️ 구조 검증 FAIL: ${cv.reason}`);
        continue;
      }

      // 6. Evaluator: 전체 검증 (본문 + 댓글)
      log(`6️⃣ Evaluator: 전체 검증`);
      const finalEval = await evaluateContent({ body, comments, recentOpenings });

      if (finalEval.pass) {
        log(`   ✅ PASS (${finalEval.score}/10)`);
        closerPass = true;
        break;
      } else {
        log(`   ❌ FAIL: ${finalEval.reason}`);
      }
    }

    if (!closerPass || !comments) {
      log(`   🚫 댓글 생성 실패 — 스킵`);
      continue;
    }

    // 큐에 등록
    try {
      await pool.query(`
        INSERT INTO publish_queue (persona_id, content, comment_text, comment_2, source_url, status, scheduled_at, media_url)
        VALUES (2, $1, $2, $3, $4, 'pending', NOW(), $5)
      `, [body, comments.comment_1, comments.comment_2, post.source_url || '', mediaJson]);

      // analysis_results 기록 (post_id 매칭용 — 실패해도 무시)
      try {
        await pool.query(`INSERT INTO analysis_results (post_id) VALUES ($1)`, [String(post.id)]);
      } catch {}

      successCount++;
      log(`   📦 큐 등록 완료`);
      log(`   본문: "${body.split('\n')[0]}"`);
      log(`   댓글1: "${comments.comment_1}"`);
      log(`   댓글2: "${comments.comment_2}"`);
      log(`   미디어: ${mediaUrls.length > 0 ? mediaUrls.join(', ') : '없음'}`);
    } catch (e) {
      log(`   ❌ DB 등록 실패: ${e.message.substring(0, 50)}`);
    }
  }

  log(`\n${'═'.repeat(40)}`);
  log(`✅ 파이프라인 완료: ${successCount}/${posts.length} 성공`);
  log(`${'═'.repeat(40)}`);

  // DB 로그 저장
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  try {
    await pool.query(`INSERT INTO pipeline_logs (started_at, ended_at, duration_sec, collected, hooked, evaluated, failed, queued, status)
      VALUES ($1, now(), $2, $3, $4, $5, $6, $7, 'completed')`,
      [new Date(startTime), elapsed, posts.length, successCount, successCount, posts.length - successCount, successCount]
    );
    log('💾 DB 로그 저장 완료');
  } catch (e) { log(`❌ DB 로그 저장 실패: ${e.message}`); }

  await pool.end();
})();
