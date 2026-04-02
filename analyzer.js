// analyzer.js v3 — 5대 패턴 + 고정 오프닝 + 댓글 2개 + 하드코딩 고정
const { Pool } = require('pg');

const DB_URL = 'postgresql://neondb_owner:npg_OZ8lmEfJDg4e@ep-purple-recipe-a1l3vs4n-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
const ZAI_KEY = '6728f5a9036946129f75a6cfe2baf932.ZWjgd5C43QYwOB0L';
const ZAI_URL = 'https://api.z.ai/api/coding/paas/v4/chat/completions';

// 5대 패턴 + 오프닝 라이브러리
const PATTERNS = [
  {
    name: '무료 대안',
    openings: ['야 그거 돈 주고 씀? 🦙', '아직도 유료로 씀? 🦙', '돈 낭비하고 있음 🦙'],
    style: '그거 돈 주고 쓸 필요 없어. 무료로 쓸 수 있는 방법 알려줌.',
  },
  {
    name: '체크리스트',
    openings: ['AI로 돈 버는 법 알려줌 🦙', '이거 모르면 손해 봄 🦙', '지금 당장 해봐야 할 거 🦙'],
    style: 'N가지 핵심 포인트를 숫자로 정리해서 알려줌.',
  },
  {
    name: '숫자 인증',
    openings: ['이거 쓰고 작업시간 줄었음 ㄷㄷ 🦙', '숫자로 증명함 🦙', '이정도면 진짜임 🦙'],
    style: '구체적인 수치(X%, N배, N시간)로 효과를 증명.',
  },
  {
    name: '역발상 도발',
    openings: ['아직도 모름? 🦙', '소름 돋음 🦙', '이거 진짜 충격임 🦙', '정신 차려야 됨 🦙'],
    style: '상식을 뒤집는 도발적인 주장으로 시선 끌기.',
  },
  {
    name: 'Before/After',
    openings: ['AI 쓰기 전 vs 후 🦙', '과거 vs 지금 차이 🦙', '이런 변화가 가능함 🦙'],
    style: 'AI 도입 전후를 비교해서 충격 효과.',
  },
];

function pickPattern() {
  return PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
}
function pickOpening(pattern) {
  return pattern.openings[Math.floor(Math.random() * pattern.openings.length)];
}

const PERSONA_PROMPT = `당신은 AI파카(🦙)입니다. AI 도구/뉴스를 "진짜 써먹을 수 있는 꿀팁"으로 재해석해서 공유하는 계정.

## 핵심 철학
- 뉴스를 "전달"하지 마라. "이걸 내가 어떻게 써먹지?"로 바꿔라
- @itsshibaai, @choi.openai 스타일: 짧고, 신선하고, 리얼하고, 액션 가능한 글
- "이거 실제로 써봤는데 미쳤다" 느낌

## 본문 구조
첫 줄: 후킹 (호기심, 반전, 도발, 공감 중 하나 — 매번 다르게)
빈 줄
2~3줄: 실제 써먹을 수 있는 구체적인 정보/꿀팁 (순번 1. 2. 3. 필수)
빈 줄
마지막 줄: (그 다음 계속👇)

## 글 톤
- 반말, 친근하고 솔직한 느낌
- 독자가 "저장해야겠다"고 느끼게
- 🦙 필수, 이모지 1개 더까지 OK

## 카드 슬라이드 3장 (실제 서비스 캡처/꿀팁 느낌)
- 슬라이드1: 제목 + 한 줄 요약 (시선 끌기)
- 슬라이드2: 구체적인 사용법/비교/숫자 (실질적 정보)
- 슬라이드3: 액션 아이템 (당장 해볼 만한 것)

카드 제목은 "핵심 포인트", "인사이트" 같은 템플릿 절대 금지.
예: "왜 지금 fal이 대박인가", "3초면 끝나는 세팅", "이거 하나로 50만원 아낌"

## 댓글
- comment_1: 본문에 없는 추가 꿀팁/비교/개인적인 인사이트 (30자 이하, 반말, 이모지 1개)
- comment_2: "출처: URL" 형식

## 절대 금지
- 뉴스 요약체 ("XX가 YY를 발표했습니다")
- 전문 용어 남발
- 본문에 링크
- 존댓말
- "바이브코딩"
- 같은 오프닝 반복`;

const analyzeWithGLM = async (title, description, sourceName) => {
  const pattern = pickPattern();
  const opening = pickOpening(pattern);

  const userContent = `
다음 AI 뉴스를 AI파카(🦙) 스타일로 재해석해줘.

## 중요: 뉴스 요약 금지
이 글이 "뉴스 전달"이 아니라 "진짜 써먹을 수 있는 꿀팁"처럼 읽혀야 함.
읽는 사람이 "저장해야겠다" "이거 당장 해봐야지"라고 느끼게 써라.

## 원본
제목: ${title}
출처: ${sourceName}
내용: ${description || '없음'}

## 출력 형식 (JSON만, 다른 텍스트 절대 금지)
{
  "post": "본문 (후킹 오프닝 + 구체적 꿀팁 순번 + (그 다음 계속👇))",
  "comment_1": "본문에 없는 추가 꿀팁/인사이트 (반말 30자 이하, 이모지 1개)",
  "comment_2": "출처: URL",
  "source_url": "기사 원본 URL (이미지URL/css파일 제외, 웹페이지 URL만)",
  "slides": [
    {"title": "시선 끄는 제목 (템플릿 금지)", "body": "한 줄 요약"},
    {"title": "구체적 정보/비교/숫자", "body": "실제 도움 되는 내용"},
    {"title": "당장 해볼 만한 것", "body": "액션 아이템"}
  ]
}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000); // 90초 타임아웃
  let res;
  try {
    res = await fetch(ZAI_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ZAI_KEY}` },
      body: JSON.stringify({
        model: 'glm-5-turbo',
        messages: [
          { role: 'system', content: PERSONA_PROMPT },
          { role: 'user', content: userContent },
        ],
        max_tokens: 2048,
      temperature: 0.8,
      reasoning: { effort: 'none' },
      }),
    });
  } catch (e) {
    clearTimeout(timeout);
    console.log('  ⚠️ API 타임아웃');
    return null;
  }
  clearTimeout(timeout);
  const data = await res.json();
  let text = data.choices?.[0]?.message?.content?.trim() || '';
  if (!text) text = data.choices?.[0]?.message?.reasoning_content?.trim() || '';
  if (!text) return null;
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.substring(start, end + 1));
  } catch { return null; }
};

(async () => {
  const pool = new Pool({ connectionString: DB_URL });
  console.log('=== 분석 시작 ===');

  const { rows: posts } = await pool.query(`
    SELECT cp.* FROM collected_posts cp
    LEFT JOIN analysis_results ar ON cp.post_id = ar.post_id
    WHERE ar.post_id IS NULL
    ORDER BY cp.engagement_score DESC
    LIMIT 10
  `);
  console.log(`미분석 글: ${posts.length}개`);

  if (posts.length === 0) {
    console.log('분석할 글이 없습니다.');
    await pool.end();
    return;
  }

  let analyzed = 0;
  for (const post of posts) {
    try {
      const title = post.content.split('\n')[0] || post.content.substring(0, 100);
      const description = post.content.substring(title.length).trim();
      console.log(`\n분석 중: ${post.post_id} (${post.author})`);
      console.log(`  제목: ${title.substring(0, 60)}`);

      const result = await analyzeWithGLM(title, description, post.author || '');
      if (!result) {
        console.log('  ⚠️ 분석 실패');
        continue;
      }

      // "(그 다음 계속👇)" 하드코딩 보정
      let postText = result.post || '';
      if (!postText.includes('(그 다음 계속👇)') && !postText.includes('(그 다음 계속👆)')) {
        postText = postText.trimEnd() + '\n(그 다음 계속👇)';
      }
      // 오프닝 보정 — 패턴 오프닝으로 시작하는지
      const hasPatternOpening = PATTERNS.some(p => p.openings.some(o => postText.startsWith(o)));
      if (!hasPatternOpening) {
        const pattern = pickPattern();
        const opening = pickOpening(pattern);
        const lines = postText.split('\n');
        lines[0] = opening;
        postText = lines.join('\n');
      }
      // 순번 보정 — "1." 없으면 본문 줄을 순번으로 강제 변환
      if (!postText.match(/\d\.\s/)) {
        const lines = postText.split('\n').filter(l => l.trim() && !l.trim().startsWith('(그 다음'));
        if (lines.length >= 3) {
          const hook = lines[0];
          const bodyPoints = lines.slice(1).map(l => l.trim()).filter(l => l.length > 5);
          if (bodyPoints.length >= 2) {
            const numbered = bodyPoints.slice(0, 3).map((p, i) => `${i + 1}. ${p}`).join('\n');
            postText = hook + '\n\n' + numbered + '\n\n(그 다음 계속👇)';
            console.log('  🔧 순번 하드코딩 변환');
          }
        }
      }

      // analysis_results 저장
      const keywords = [post.author, 'AI'].filter(Boolean);
      await pool.query(
        `INSERT INTO analysis_results (post_id, content_type, hooking_pattern, counter_angle, suggested_prompt, trend_keywords)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING`,
        [post.post_id, 'news', result.post?.substring(0, 100) || '', '', result.post || '', keywords]
      );

      // publish_queue 등록
      if (postText) {
        const sourceUrl = result.source_url || post.source_url || '';
        const slides = result.slides?.length > 0 ? result.slides.slice(0, 3) : null;

        await pool.query(
          `INSERT INTO publish_queue (persona_id, content, status, account, comment_text, comment_2, card_slides, source_url)
           VALUES ($1, $2, 'pending', 'sub1', $3, $4, $5, $6)`,
          ['persona_b', postText, result.comment_1 || '', result.comment_2 || '', slides ? JSON.stringify(slides) : null, sourceUrl]
        );
        console.log(`  ✅ [${hasPatternOpening ? '패턴OK' : '오프닝수정'}] ${postText.substring(0, 60)}`);
        console.log(`  💬 댓글1: ${(result.comment_1 || '').substring(0, 50)}`);
        console.log(`  💬 댓글2: ${(result.comment_2 || '').substring(0, 50)}`);
        console.log(`  🖼 슬라이드: ${slides?.length || 0}장`);
        console.log(`  🔗 출처: ${sourceUrl || '없음'}`);
      }

      analyzed++;
      await new Promise(r => setTimeout(r, 2000));
    } catch (e) {
      console.log(`  ❌ ${e.message.substring(0, 80)}`);
    }
  }

  const stats = await pool.query(`
    SELECT 
      (SELECT count(*) FROM collected_posts) as collected,
      (SELECT count(*) FROM analysis_results) as analyzed,
      (SELECT count(*) FROM publish_queue WHERE status = 'pending') as pending
  `);
  const s = stats.rows[0];
  console.log(`\n=== 상태: 수집 ${s.collected} | 분석 ${s.analyzed} | 대기 ${s.pending} ===`);

  await pool.end();
})();
