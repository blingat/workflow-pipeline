'use client';
import { useState, useEffect } from 'react';
import GlassCard from '@/components/GlassCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Trophy, Flame } from 'lucide-react';

export default function Analytics() {
  const [stats, setStats] = useState(null);
  const [queueHistory, setQueueHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // publish_queue 상태별 카운트 + engagement_after 데이터
    fetch('/api/queue').then(r => r.json()).then(data => {
      const items = Array.isArray(data) ? data : [];
      const published = items.filter(q => q.status === 'published');
      const viral = items.filter(q => q.status === 'viral');
      const failed = items.filter(q => q.status === 'failed');
      const pending = items.filter(q => q.status === 'pending');
      const approved = items.filter(q => q.status === 'approved');

      // 페르소나별 성과 집계
      const personaMap = {};
      for (const q of published) {
        const pid = q.persona_id || 'unknown';
        if (!personaMap[pid]) personaMap[pid] = { name: pid, posts: 0, totalViews: 0, totalLikes: 0 };
        personaMap[pid].posts++;
        const eng = q.engagement_after;
        if (eng && typeof eng === 'object') {
          personaMap[pid].totalViews += eng.views || 0;
          personaMap[pid].totalLikes += eng.likes || 0;
        }
      }
      const personaPerf = Object.values(personaMap).map(p => ({
        name: p.name,
        posts: p.posts,
        avgViews: p.posts ? Math.round(p.totalViews / p.posts) : 0,
        avgLikes: p.posts ? Math.round(p.totalLikes / p.posts) : 0,
      }));

      // 터진 글 (viral + engagement_after 기준 정렬)
      const viralPosts = [...viral, ...published]
        .map(q => {
          const eng = (q.engagement_after && typeof q.engagement_after === 'object') ? q.engagement_after : {};
          return {
            id: q.id,
            content: (q.content || '').substring(0, 60),
            views: eng.views || 0,
            likes: eng.likes || 0,
            account: q.account || '-',
            published_at: q.published_at,
          };
        })
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);

      // 일별 발행 (published_at 기준)
      const dayMap = {};
      for (const q of published) {
        if (q.published_at) {
          const day = new Date(q.published_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
          const acc = q.account || 'sub1';
          if (!dayMap[day]) dayMap[day] = { day, main: 0, sub1: 0, sub2: 0 };
          if (acc === 'main') dayMap[day].main++;
          else if (acc === 'sub2') dayMap[day].sub2++;
          else dayMap[day].sub1++;
        }
      }
      const dailyData = Object.values(dayMap).slice(-7);

      setStats({
        total: items.length,
        pending: pending.length,
        approved: approved.length,
        published: published.length,
        viral: viral.length,
        failed: failed.length,
      });
      setQueueHistory({ dailyData, viralPosts, personaPerf });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const { dailyData, viralPosts, personaPerf } = queueHistory || {};

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">성과 분석</h1>

      {loading ? (
        <GlassCard className="text-center text-gray-500 py-8">로딩 중...</GlassCard>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: '발행 완료', value: stats?.published || 0, color: 'text-primary' },
              { label: '터진 글', value: stats?.viral || 0, color: 'text-danger' },
              { label: '대기 중', value: stats?.pending || 0, color: 'text-warning' },
              { label: '실패', value: stats?.failed || 0, color: 'text-gray-500' },
            ].map(s => (
              <GlassCard key={s.label} className="text-center">
                <div className="text-xs text-gray-500">{s.label}</div>
                <div className={`text-3xl font-bold ${s.color} mt-1`}>{s.value}</div>
              </GlassCard>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            <GlassCard>
              <h2 className="text-sm text-gray-400 mb-4 flex items-center gap-2"><BarChart3 size={14} /> 계정별 일간 발행 수</h2>
              {dailyData && dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" tick={{ fill: '#666', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#666', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                    <Bar dataKey="main" fill="#00ff88" name="본계" stackId="a" />
                    <Bar dataKey="sub1" fill="#00d4ff" name="서브1" stackId="a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sub2" fill="#ffaa00" name="서브2" stackId="a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="text-center text-gray-500 py-8 text-sm">발행 데이터가 없습니다</div>}
            </GlassCard>

            <GlassCard>
              <h2 className="text-sm text-gray-400 mb-4 flex items-center gap-2"><Trophy size={14} /> 페르소나별 평균 성과</h2>
              {personaPerf && personaPerf.length > 0 ? (
                <div className="space-y-3">
                  {personaPerf.map(p => (
                    <div key={p.name} className="bg-white/5 rounded-lg px-4 py-3">
                      <div className="flex justify-between mb-1"><span className="font-medium text-sm">{p.name}</span><span className="text-xs text-gray-500">{p.posts}개 발행</span></div>
                      <div className="flex gap-4 text-xs text-gray-400"><span>조회 {p.avgViews.toLocaleString()}</span><span>좋아요 {p.avgLikes}</span></div>
                      <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${Math.min((p.avgViews / Math.max(1, personaPerf[0].avgViews)) * 100, 100)}%` }} /></div>
                    </div>
                  ))}
                </div>
              ) : <div className="text-center text-gray-500 py-8 text-sm">발행 데이터가 없습니다</div>}
            </GlassCard>
          </div>

          <GlassCard>
            <h2 className="text-sm text-gray-400 mb-4 flex items-center gap-2"><Flame size={14} /> 터진 글 TOP 10</h2>
            {viralPosts && viralPosts.length > 0 ? (
              <div className="space-y-2">
                {viralPosts.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-4 bg-white/5 rounded-lg px-4 py-3">
                    <span className="text-xl font-bold text-gray-600">#{i + 1}</span>
                    <div className="flex-1 min-w-0"><div className="text-sm truncate">{p.content}</div><div className="text-xs text-gray-500">{p.account}</div></div>
                    <div className="text-right shrink-0"><div className="text-primary font-bold">{p.views > 0 ? (p.views / 1000).toFixed(1) + 'K' : '-'}</div><div className="text-xs text-gray-500">❤️ {p.likes}</div></div>
                  </div>
                ))}
              </div>
            ) : <div className="text-center text-gray-500 py-8 text-sm">아직 터진 글이 없습니다. 발행 후 engagement_after를 기록하면 표시됩니다.</div>}
          </GlassCard>
        </>
      )}
    </div>
  );
}

function BarChart3(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>;
}
