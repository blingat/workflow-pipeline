#!/usr/bin/env node
// evaluator.js — 5단계: 검수 및 승인 AI (The Evaluator)
// 입력: 본문/댓글/카드 → PASS/FAIL 판정
// FAIL 시 재생성 트리거


const ZAI_KEY = '6728f5a9036946129f75a6cfe2baf932.ZWjgd5C43QYwOB0L';
const ZAI_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';

async function evaluateContent({ body, comments, recentOpenings = [] }) {
  const recentList = recentOpenings.length > 0
    ? `\n[최근 큐 오프닝 목록]\n${recentOpenings.map((o, i) => `${i + 1}. "${o}"`).join('\n')}`
    : '';

  const res = await fetch(ZAI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ZAI_KEY}` },
    body: JSON.stringify({
      model: 'glm-5-turbo',
      messages: [
        {
          role: 'system',
          content: `너는 소셜 미디어 콘텐츠 품질 검수관이야.
@itsshibaai, @choi.openai 같은 벤치마크 계정 수준의 퀄리티를 기준으로 매우 엄격하게 평가해.

[검증 기준 — 아래 기준 중 7개 이상 통과하면 PASS]
1. 후킹력: 첫 줄이 흥미를 유발하는가?
2. 구조: 순번(1. 2. 3.)이 포함되었는가?
3. 가독성: 빈 줄로 시각적 구분이 되는가?
4. 가치: 독자가 알아두면 좋은 정보인가? (요약이어도 PASS)
5. 톤: 반말인가?
6. 중복: 최근 오프닝과 동일하지 않은가?
7. 댓글(있는 경우): 본문과 관련 있는가?
8. 🦙 이모지 포함?
9. 금지어(바이브코딩, 본문 링크) 없는가?
10. "(그 다음 계속👇)" 마지막 줄?

[출력 형식 — JSON만]
{"result": "PASS" 또는 "FAIL", "reason": "실패 이유 (한 줄)", "score": 1-10}`
        },
        {
          role: 'user',
          content: `[검증할 콘텐츠]

[본문]
${body}

[댓글] ${comments?.comment_1 || '(아직 생성 안 됨 — 댓글 검증 스킵)'}
[출처] ${comments?.comment_2 || '(아직 생성 안 됨 — 출처 검증 스킵)'}
${recentList}

${comments ? '본문과 댓글 모두 검증해줘.' : '본문만 검증해줘. 댓글은 아직 생성 안 됐으니 댓글 관련 기준(7번)은 무시해.'}
평가해줘.`
        }
      ],
      max_tokens: 4000,
      temperature: 0.3, // 낮은 온도로 일관된 판단
    }),
  });

  const data = await res.json();
  let raw = (data.choices?.[0]?.message?.content || '').trim();
  raw = raw.replace(/```json?\n?/g, '').replace(/```/g, '').trim();

  try {
    const parsed = JSON.parse(raw);
    return {
      pass: parsed.result === 'PASS',
      reason: parsed.reason || '',
      score: parsed.score || 5,
    };
  } catch {
    // LLM 판단 실패 시 기본 규칙으로 검증
    return ruleBasedCheck(body, comments, recentOpenings);
  }
}

// LLM 실패 시 폴백: 규칙 기반 검증
function ruleBasedCheck(body, comments, recentOpenings = []) {
  const checks = [];

  if (!body) return { pass: false, reason: '본문 없음', score: 0 };

  const opening = body.split('\n')[0].trim();
  if (!opening || opening.length < 5) checks.push('오프닝 없음');
  if (!/[\d]+\./.test(body)) checks.push('순번 없음');
  if (!body.includes('(그 다음 계속👇)')) checks.push('CTA 누락');
  if (!body.includes('🦙')) checks.push('🦙 누락');
  if (/바이브코딩/i.test(body)) checks.push('금지어');
  if (/해요|합니다|입니다|세요/.test(body)) checks.push('존댓말');
  if (body.length > 500) checks.push('400자 초과');

  // 최근 오프닝 유사도 (간단 비교)
  for (const recent of recentOpenings) {
    const similarity = simpleSimilarity(opening, recent);
    if (similarity > 0.6) { checks.push('오프닝 중복'); break; }
  }

  // 댓글 검증
  if (comments?.comment_1) {
    if (comments.comment_1.length > 50) checks.push('댓글1 길음');
    const bad = /Tone|Style|banmal|casual|informal/i;
    if (bad.test(comments.comment_1)) checks.push('댓글 프롬프트 유출');
  } else {
    checks.push('댓글1 없음');
  }

  if (checks.length === 0) {
    return { pass: true, reason: '규칙 검증 통과', score: 7 };
  }
  return { pass: false, reason: checks.join(', '), score: 3 };
}

// 간단 문자열 유사도 (Jaccard)
function simpleSimilarity(a, b) {
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

module.exports = { evaluateContent, ruleBasedCheck };

if (require.main === module) {
  (async () => {
    const body = process.argv[2] || '이거 진짜 충격임 🦙\n\n1. 테스트\n2. 테스트\n\n(그 다음 계속👇)';
    const c1 = process.argv[3] || '꿀팁이야 💡';
    const c2 = process.argv[4] || '출처: https://example.com';

    const result = await evaluateContent({
      body,
      comments: { comment_1: c1, comment_2: c2 },
      recentOpenings: ['이거 진짜 충격임 🦙'],
    });

    console.log(`${result.pass ? '✅ PASS' : '❌ FAIL'} (${result.score}/10)`);
    if (!result.pass) console.log(`이유: ${result.reason}`);
  })();
}
