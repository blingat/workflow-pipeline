'use client';
import GlassCard from '@/components/GlassCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const dailyData = [
  { day: '3/20', main: 2, sub1: 4, sub2: 3 },
  { day: '3/21', main: 3, sub1: 5, sub2: 2 },
  { day: '3/22', main: 1, sub1: 6, sub2: 4 },
  { day: '3/23', main: 2, sub1: 4, sub2: 3 },
  { day: '3/24', main: 3, sub1: 5, sub2: 2 },
  { day: '3/25', main: 2, sub1: 6, sub2: 3 },
  { day: '3/26', main: 1, sub1: 3, sub2: 2 },
];
const viralPosts = [
  { rank: 1, content: '병원 홈페이지 제작 3일 완성. 환자 문의 40% 증가', views: 12500, likes: 890, account: '본계' },
  { rank: 2, content: 'AI로 외주 단가 2배 올린 방법. CRM 자동화가 핵심', views: 8700, likes: 560, account: '서브1' },
  { rank: 3, content: '쇼핑몰 상세페이지 CTR 3배 ↑ AI 디자인 비교', views: 6300, likes: 420, account: '서브1' },
  { rank: 4, content: '식당 예약 시스템 무료로 만드는 법. 노코딩', views: 5100, likes: 340, account: '서브2' },
  { rank: 5, content: '자영업자 필수 앱 5개. 이거만 쓰세요', views: 4800, likes: 310, account: '서브2' },
];
const personaPerf = [
  { name: '빠코더 전문가', avgViews: 8200, avgLikes: 540, posts: 15 },
  { name: '테크 꿀팁봇', avgViews: 5400, avgLikes: 380, posts: 22 },
  { name: '자영업 도우미', avgViews: 3200, avgLikes: 210, posts: 10 },
];

export default function Analytics() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">성과 분석</h1>

      <div className="grid grid-cols-2 gap-6">
        <GlassCard>
          <h2 className="text-sm text-gray-400 mb-4">📊 계정별 일간 발행 수</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={dailyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: '#666', fontSize: 11 }} />
              <YAxis tick={{ fill: '#666', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
              <Bar dataKey="main" fill="#00ff88" name="본계" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="sub1" fill="#00d4ff" name="서브1" stackId="a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="sub2" fill="#ffaa00" name="서브2" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        <GlassCard>
          <h2 className="text-sm text-gray-400 mb-4">🏆 페르소나별 평균 성과</h2>
          <div className="space-y-3">
            {personaPerf.map(p => (
              <div key={p.name} className="bg-white/5 rounded-lg px-4 py-3">
                <div className="flex justify-between mb-1"><span className="font-medium text-sm">{p.name}</span><span className="text-xs text-gray-500">{p.posts}개 발행</span></div>
                <div className="flex gap-4 text-xs text-gray-400"><span>조회 {p.avgViews.toLocaleString()}</span><span>좋아요 {p.avgLikes}</span></div>
                <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${(p.avgViews / 10000) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">🔥 터진 글 TOP 10</h2>
        <div className="space-y-2">
          {viralPosts.map(p => (
            <div key={p.rank} className="flex items-center gap-4 bg-white/5 rounded-lg px-4 py-3">
              <span className="text-xl font-bold text-gray-600">#{p.rank}</span>
              <div className="flex-1 min-w-0"><div className="text-sm truncate">{p.content}</div><div className="text-xs text-gray-500">{p.account}</div></div>
              <div className="text-right shrink-0"><div className="text-primary font-bold">{(p.views / 1000).toFixed(1)}K</div><div className="text-xs text-gray-500">❤️ {p.likes}</div></div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
