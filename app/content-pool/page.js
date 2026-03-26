'use client';
import { useState } from 'react';
import GlassCard from '@/components/GlassCard';

const typeLabel = { traffic: '🚀 트래픽', insight: '💡 인사이트', counter: '🔄 역발상', trend: '📈 트렌드' };
const filters = ['all', 'traffic', 'insight', 'counter', 'trend'];

const mockPosts = [
  { id: 1, author: 'dev_kim', content: 'AI로 홈페이지 만들면 비용 90% 절감됩니다. 실제로 병원 홈페이지 3일만에 완성했어요.', likes: 342, reposts: 89, replies: 45, score: 4.2, type: 'insight', hook: '수치로 증명하는 첫 줄', counter: 'AI로 만들면 오히려 더 비싸다 - 품질 이야기' },
  { id: 2, author: 'startup_lee', content: '🔥 바이브코딩으로 SaaS 런칭까지 2주. 전 직장 월급보다 3배 벌고 있음.', likes: 1200, reposts: 340, replies: 180, score: 8.7, type: 'traffic', hook: '도발 + 수치 첫 줄', counter: '2주 만에 SaaS? 버그로 고객 다 떠남' },
  { id: 3, author: 'freelancer_park', content: '외주 단가 올리는 비법 3가지. 1. 포트폴리오 결과물 위주 2. 상세페이지 시안 3개 3. CRM 자동화 제안', likes: 567, reposts: 123, replies: 67, score: 5.1, type: 'counter', hook: '체크리스트형 후킹', counter: '단가 올리면 외주 다 떠남 - 실제 경험' },
  { id: 4, author: 'ai_trend', content: '2026년 자동화 트렌드: AI 에이전트가 모든 것을 대체합니다. 준비 안 하면 도태됩니다.', likes: 890, reposts: 210, replies: 95, score: 6.3, type: 'trend', hook: '공포 마케팅 + 연도', counter: '에이전트가 대체 못 하는 것: 고객 소통' },
  { id: 5, author: 'designer_choi', content: '쇼핑몰 상세페이지 AI로 만들면 이렇게 됩니다. CTR 3배 ↑', likes: 234, reposts: 56, replies: 23, score: 3.8, type: 'insight', hook: '결과물 + CTR 수치', counter: 'AI 상세페이지? 구매전환율 오히려 하락' },
];

export default function ContentPool() {
  const [filter, setFilter] = useState('all');
  const [adoptModal, setAdoptModal] = useState(null);

  const posts = filter === 'all' ? mockPosts : mockPosts.filter(p => p.type === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">콘텐츠 풀</h1>

      <div className="flex gap-2">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm ${filter === f ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
            {f === 'all' ? '전체' : typeLabel[f]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {posts.map(p => (
          <GlassCard key={p.id} className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-gray-500">@{p.author}</span>
                <span className="text-xs px-2 py-0.5 bg-white/10 rounded">{typeLabel[p.type]}</span>
                <span className="text-xs text-primary">⭐ {p.score}</span>
              </div>
              <p className="text-sm mb-2">{p.content}</p>
              <div className="flex gap-4 text-xs text-gray-500">
                <span>❤️ {p.likes}</span><span>🔄 {p.reposts}</span><span>💬 {p.replies}</span>
              </div>
              {p.hook && <div className="mt-2 text-xs bg-secondary/10 text-secondary rounded px-2 py-1">후킹: {p.hook}</div>}
              {p.counter && <div className="mt-1 text-xs bg-warning/10 text-warning rounded px-2 py-1">역발상: {p.counter}</div>}
            </div>
            <button onClick={() => setAdoptModal(p)} className="shrink-0 ml-4 px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30">글감 채택</button>
          </GlassCard>
        ))}
      </div>

      {adoptModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setAdoptModal(null)}>
          <div className="bg-[#12122a] border border-white/10 rounded-xl p-6 w-96 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold">글감 채택</h3>
            <div className="bg-white/5 rounded p-3 text-sm">{adoptModal.content}</div>
            <div><label className="text-xs text-gray-400">페르소나</label><select className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm"><option>빠코더 전문가</option><option>테크 꿀팁봇</option><option>자영업 도우미</option></select></div>
            <div><label className="text-xs text-gray-400">계정</label><select className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm"><option value="main">본계</option><option value="sub1">서브1</option><option value="sub2">서브2</option></select></div>
            <button className="w-full py-2 bg-primary/20 text-primary rounded text-sm">AI 콘텐츠 생성 & 대기열 추가</button>
            <button onClick={() => setAdoptModal(null)} className="w-full py-2 bg-white/10 rounded text-sm">취소</button>
          </div>
        </div>
      )}
    </div>
  );
}
