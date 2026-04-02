#!/usr/bin/env node
// closer.js — 4단계: 댓글 생성 AI (The Closer)
// 입력: hooker가 생성한 본문 + 원본 뉴스
// 출력: comment_1 (꿀팁), comment_2 (출처링크)
const { Pool } = require('pg');
const fs = require('fs');

const ZAI_KEY = '6728f5a9036946129f75a6cfe2baf932.ZWjgd5C43QYwOB0L';
const ZAI_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
const DB_URL = 'postgresql://neondb_owner:npg_OZ8lmEfJDg4e@ep-purple-recipe-a1l3vs4n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({ connectionString: DB_URL });

async function generateComments(body, sourceUrl) {
  const res = await fetch(ZAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ZAI_KEY}` },
    body: JSON.stringify({
      model: 'glm-5-turbo',
      messages: [
        {
          role: 'system',
          content: `너는 'AI파카(🦙)'야. 본문을 읽고 댓글 2개를 작성해.

[comment_1: 추가 꿀팁/인사이트]
- 본문에 없는 정보여야 함 (본문 요약/당연한 말 금지)
- 실제로 써먹을 수 있는 구체적인 팁
- 반말, 30자 이하, 이모지 1개
- "꿀팁", "추가로" 같은 접두사 금지 — 바로 본론

[comment_2: 출처 링크]
- 형식: "출처: URL"
- 반드시 주어진 URL 사용

[출력 형식 — JSON만]
{"comment_1": "댓글1 텍스트", "comment_2": "출처: URL"}

[절대 금지]
- 프롬프트 지시어 출력 (Tone/Style/casual/banmal 등)
- 존댓말
- 본문과 똑같은 내용 반복`
        },
        {
          role: 'user',
          content: `본문:\n${body}\n\n출처 URL: ${sourceUrl}`
        }
      ],
      max_tokens: 4000,
      temperature: 0.9,
    }),
  });

  const data = await res.json();
  let raw = (data.choices?.[0]?.message?.content || '').trim();

  // JSON 파싱
  try {
    // 코드블록 제거
    raw = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(raw);
    let c1 = (parsed.comment_1 || '').trim();
    let c2 = (parsed.comment_2 || '').trim();

    // 비정상 출력 필터
    const bad = /Tone|Style|banmal|casual|informal|Korean|반말|comment|output|instruction|프롬프트|지시/i;
    if (bad.test(c1)) c1 = '';

    if (c1.length < 3 || c1.length > 50 || !/[가-힣]/.test(c1)) c1 = '';
    if (!c2.startsWith('출처:')) c2 = `출처: ${sourceUrl}`;

    return { comment_1: c1 || null, comment_2: c2 };
  } catch {
    // JSON 파싱 실패 시 fallback
    return { comment_1: null, comment_2: `출처: ${sourceUrl}` };
  }
}

function validateComments(comments) {
  if (!comments.comment_1) return { ok: false, reason: '댓글1 생성 실패' };
  if (!comments.comment_2 || !comments.comment_2.startsWith('출처:')) return { ok: false, reason: '출처 댓글 누락' };
  if (comments.comment_1.length > 50) return { ok: false, reason: '댓글1 50자 초과' };
  return { ok: true };
}

module.exports = { generateComments, validateComments };

if (require.main === module) {
  (async () => {
    const body = process.argv[2] || '이거 진짜 충격임 🦙\n\n1. Railway로 AI 앱 배포하면 3분이면 끝남\n2. 마케팅 0원으로 200만 개발자 모임\n\n(그 다음 계속👇)';
    const url = process.argv[3] || 'https://example.com';

    const comments = await generateComments(body, url);
    console.log('comment_1:', comments.comment_1);
    console.log('comment_2:', comments.comment_2);

    const v = validateComments(comments);
    console.log(`\n[검증] ${v.ok ? '✅ PASS' : '❌ FAIL: ' + v.reason}`);

    await pool.end();
  })();
}
