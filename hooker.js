#!/usr/bin/env node
// hooker.js — 2단계: 본문 생성 AI (The Hooker)
// 입력: collected_posts의 원시 뉴스 데이터
// 출력: 후킹 오프닝 + 순번 꿀팁 본문
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const ZAI_KEY = '6728f5a9036946129f75a6cfe2baf932.ZWjgd5C43QYwOB0L';
const ZAI_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const DB_URL = 'postgresql://neondb_owner:npg_OZ8lmEfJDg4e@ep-purple-recipe-a1l3vs4n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString: DB_URL });

// 최근 큐 오프닝 가져오기 (중복 방지)
async function getRecentOpenings(limit = 10) {
  try {
    const { rows } = await pool.query(
      "SELECT content FROM publish_queue WHERE status IN ('pending','published') ORDER BY id DESC LIMIT $1",
      [limit]
    );
    return rows.map(r => r.content.split('\n')[0].trim());
  } catch { return []; }
}

async function generateHook(post, recentOpenings) {
  const recentList = recentOpenings.length > 0
    ? `\n\n[최근 사용한 오프닝 — 절대 비슷하게 쓰지 마]\n${recentOpenings.map(o => `- "${o}"`).join('\n')}`
    : '';

  const res = await fetch(ZAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ZAI_KEY}` },
    body: JSON.stringify({
      model: 'glm-5-turbo',
      messages: [
        {
          role: 'system',
          content: `너는 최신 AI 기술/뉴스를 쉽고 재치 있게 소개하는 'AI파카(🦙)'야.
사용자가 무심코 넘기지 못하게 할 만큼 시선을 끄는 글을 써야 해.

[캐릭터]
- 반말, 가볍고 솔직한 말투
- 독자가 "저장해야겠다"고 느끼게
- 🦙 이모지 필수, 추가 이모지 1개까지만 OK

[구조 — 반드시 지킬 것]
첫 줄: 후킹 (호기심, 반전, 공감, 도발 중 하나 — 매번 다르게, 짧고 강렬하게)
빈 줄
2~3줄: 순번(1. 2. 3.)으로 구체적인 꿀팁/핵심 정보 나열
빈 줄
마지막 줄: (그 다음 계속👇)

[절대 금지]
- 뉴스 요약체 ("XX가 YY를 발표했습니다")
- 전문 용어 남발
- 글 본문에 링크
- 존댓말
- "바이브코딩"
- 결론/마무리 멘트 (끊어야 됨)
- 최근 오프닝과 비슷한 첫 줄
- 400자 초과`
        },
        {
          role: 'user',
          content: `다음 AI 뉴스를 AI파카 스타일로 재해석해줘.
이 글이 "뉴스 전달"이 아니라 "진짜 써먹을 수 있는 꿀팁"처럼 읽혀야 해.
읽는 사람이 "저장해야겠다" "이거 당장 해봐야지"라고 느끼게 써라.

[원본]
제목/내용: ${post.content?.substring(0, 500) || '없음'}
출처: ${post.author || 'AI뉴스'}
출처 URL: ${post.source_url || ''}
${recentList}

[출력]
본문만 출력. JSON 금지. 다른 설명 금지.
반드시 5줄 이상으로 작성. 첫 줄 후킹 + 빈 줄 + 순번 2~3개 + 빈 줄 + "(그 다음 계속👇)"`
        }
      ],
      max_tokens: 4000,
      temperature: 0.9,
    }),
  });

  const data = await res.json();
  // reasoning_content는 무시, content만 사용
  return (data.choices?.[0]?.message?.content || '').trim();
}

// 금지어 체크
function hasBannedWords(text) {
  const banned = ['바이브코딩', 'vibe coding', 'Vibe Coding', 'VIBE CODING'];
  return banned.some(w => text.toLowerCase().includes(w.toLowerCase()));
}

// 오프닝 추출
function extractOpening(text) {
  return text.split('\n')[0].trim();
}

// 구조 검증 (기본)
function validateStructure(text) {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return { ok: false, reason: '너무 짧음' };
  if (!/[\d]+\./.test(text)) return { ok: false, reason: '순번 없음' };
  if (!text.includes('(그 다음 계속👇)')) return { ok: false, reason: 'CTA 누락' };
  if (!text.includes('🦙')) return { ok: false, reason: '🦙 누락' };
  if (hasBannedWords(text)) return { ok: false, reason: '금지어 포함' };
  if (text.length > 500) return { ok: false, reason: '400자 초과' };
  // 존댓말 체크
  if (/해요|합니다|입니다|하세요|세요|겠습니다|있습/.test(text)) return { ok: false, reason: '존댓말 감지' };
  return { ok: true };
}

module.exports = { generateHook, getRecentOpenings, extractOpening, validateStructure, hasBannedWords };

// 직접 실행 시 테스트
if (require.main === module) {
  (async () => {
    const postId = process.argv[2];
    let posts;
    if (postId) {
      const { rows } = await pool.query('SELECT * FROM collected_posts WHERE id = $1', [postId]);
      posts = rows;
    } else {
      const { rows } = await pool.query("SELECT * FROM collected_posts WHERE id NOT IN (SELECT post_id FROM analysis_results) LIMIT 1");
      posts = rows;
    }
    if (posts.length === 0) { console.log('분석 대상 없음'); process.exit(0); }

    const post = posts[0];
    console.log(`\n📝 ${post.title}`);
    console.log('─────────────────────');

    const openings = await getRecentOpenings();
    const body = await generateHook(post, openings);
    console.log(body);

    const v = validateStructure(body);
    console.log(`\n[검증] ${v.ok ? '✅ PASS' : '❌ FAIL: ' + v.reason}`);

    await pool.end();
  })();
}
