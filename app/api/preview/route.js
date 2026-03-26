import { NextResponse } from 'next/server';

// Mock preview - returns sample content based on persona style
const previews = {
  persona_a: [
    '병원 홈페이지 제작 3일 완성. 환자 문의 40% 증가, 실제 결과입니다.',
    '쇼핑몰 상세페이지 CTR 3배 ↑ AI 디자인 vs 수작업 비교 결과.',
    'CRM 자동화 도입으로 외주 단가 2배. 수주율 85% 달성.',
  ],
  persona_b: [
    '🔥 ChatGPT 쓰면 안 되는 3가지 → 이거 몰라서 손해 보고 있음\n1. 의료 분석\n2. 법률 자문\n3. 세무 신고',
    '💡 이거 모르면 AI 시대 도태됨\n→ 매일 10분 투자하면 되는 거',
    '🚨 2026년에 안 배우면 손해\n→ 에이전트 자동화 3줄 요약',
  ],
  persona_c: [
    '자영업자 필수 체크리스트 ✅\n1. 구글 비즈니스 프로필 등록\n2. 네이버 예약 연동\n3. 리뷰 자동 수집\n이것만 하면 손님 2배 → 무료 진단 신청하세요',
    '식당 홈페이지 만들 때 주의할 3가지\n1. 메뉴판은 반드시 사진\n2. 예약 버튼 크게\n3. 로딩 3초 이내\n무료 체크리스트 받아가세요 👇',
    '카페 매출 올리는 디지털 전환\n1. 인스타그램 예약 스티커\n2. 단골 앱 도입\n3. 포인트 시스템\n체크리스트 무료 👉 링크',
  ],
};

export async function POST(req) {
  try {
    const { persona_id, topic } = await req.json();
    const samples = previews[persona_id] || [
      `"${topic}" 관련 글 1 — AI가 생성한 샘플입니다.`,
      `"${topic}" 관련 글 2 — AI가 생성한 샘플입니다.`,
      `"${topic}" 관련 글 3 — AI가 생성한 샘플입니다.`,
    ];
    return NextResponse.json({ samples });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
