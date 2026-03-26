'use client';
import GlassCard from '@/components/GlassCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const trending = [
  { keyword: 'AI 에이전트', growth: 340, tag: '선점', posts: 23 },
  { keyword: '바이브코딩', growth: 280, tag: '성숙', posts: 45 },
  { keyword: 'CRM 자동화', growth: 250, tag: '선점', posts: 12 },
  { keyword: '병원 홈페이지', growth: 210, tag: '포화', posts: 67 },
  { keyword: 'SaaS 런칭', growth: 190, tag: '성숙', posts: 34 },
];
const newKeywords = ['AI 영상 생성', '클로드 코딩', '노코드 CRM', '자동화 에이전트', 'AI 챗봇'];
const tagColors = { '선점': 'bg-primary/20 text-primary', '성숙': 'bg-warning/20 text-warning', '포화': 'bg-danger/20 text-danger' };
const weeklyData = [
  { day: '월', count: 12 }, { day: '화', count: 18 }, { day: '수', count: 15 },
  { day: '목', count: 22 }, { day: '금', count: 28 }, { day: '토', count: 19 }, { day: '일', count: 14 },
];

export default function Trends() {
  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">트렌드 캐치</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Trending */}
        <GlassCard>
          <h2 className="text-sm text-gray-400 mb-4">📈 급등 키워드</h2>
          <div className="space-y-3">
            {trending.map((t, i) => (
              <div key={t.keyword} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-600">#{i + 1}</span>
                  <div>
                    <div className="font-medium">{t.keyword}</div>
                    <div className="text-xs text-gray-500">관련글 {t.posts}개</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tagColors[t.tag]}`}>{t.tag}</span>
                  <span className="text-primary font-bold">+{t.growth}%</span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* New keywords */}
        <GlassCard>
          <h2 className="text-sm text-gray-400 mb-4">🆕 신규 출현 (48h)</h2>
          <div className="space-y-2">
            {newKeywords.map(k => (
              <div key={k} className="flex justify-between items-center bg-white/5 rounded-lg px-4 py-3">
                <span className="font-medium">{k}</span>
                <button className="text-xs px-3 py-1 bg-secondary/20 text-secondary rounded hover:bg-secondary/30">글감 생성</button>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* 7-day chart */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">📊 7일 트렌드 추이</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weeklyData}>
            <XAxis dataKey="day" tick={{ fill: '#666' }} />
            <YAxis tick={{ fill: '#666' }} />
            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
            <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}
