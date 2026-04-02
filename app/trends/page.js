'use client';
import { useState, useEffect } from 'react';
import GlassCard from '@/components/GlassCard';
import { TrendingUp, Sparkles, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const tagColors = { '선점': 'bg-primary/20 text-primary', '성숙': 'bg-warning/20 text-warning', '포화': 'bg-danger/20 text-danger' };

export default function Trends() {
  const [trends, setTrends] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/trends').then(r => r.json()),
    ]).then(([t]) => {
      const items = Array.isArray(t) ? t : [];
      setTrends(items);

      // 7일 추이 (날짜별 mention_count 합산)
      const dayMap = {};
      const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
      for (const item of items) {
        if (item.date) {
          const d = new Date(item.date);
          const dayStr = dayNames[d.getDay()];
          if (!dayMap[dayStr]) dayMap[dayStr] = { day: dayStr, count: 0 };
          dayMap[dayStr].count += (item.mention_count || 0);
        }
      }
      const weekOrder = ['월', '화', '수', '목', '금', '토', '일'];
      setWeekly(weekOrder.map(d => dayMap[d] || { day: d, count: 0 }));

      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const newKeywords = trends.filter(t => t.is_new);
  const topTrends = trends.sort((a, b) => (b.growth_rate || 0) - (a.growth_rate || 0)).slice(0, 10);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">트렌드 캐치</h1>

      {loading ? (
        <GlassCard className="text-center text-gray-500 py-8">로딩 중...</GlassCard>
      ) : trends.length === 0 ? (
        <GlassCard className="text-center text-gray-500 py-8">
          <p>트렌드 데이터가 없습니다</p>
          <p className="text-xs mt-2">collector.js 실행 시 keyword_trends 테이블에 데이터가 쌓입니다</p>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-6">
            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={14} className="text-gray-500" />
                <h2 className="text-xs text-gray-400 uppercase tracking-wider">급등 키워드</h2>
              </div>
              <div className="space-y-3">
                {topTrends.map((t, i) => {
                  const growth = Math.round((t.growth_rate || 0) * 100);
                  const tag = growth > 50 ? '선점' : growth > 20 ? '성숙' : '포화';
                  return (
                    <div key={t.id} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-600">#{i + 1}</span>
                        <div>
                          <div className="font-medium">{t.keyword}</div>
                          <div className="text-xs text-gray-500">언급 {t.mention_count || 0}회 | {t.category || '-'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${tagColors[tag]}`}>{tag}</span>
                        <span className="text-primary font-bold">+{growth}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={14} className="text-gray-500" />
                <h2 className="text-xs text-gray-400 uppercase tracking-wider">신규 출현 키워드</h2>
              </div>
              {newKeywords.length > 0 ? (
                <div className="space-y-2">
                  {newKeywords.map(k => (
                    <div key={k.id} className="flex justify-between items-center bg-white/5 rounded-lg px-4 py-3">
                      <div>
                        <span className="font-medium">{k.keyword}</span>
                        <span className="text-xs text-gray-500 ml-2">{k.category || ''}</span>
                      </div>
                      <span className="text-xs text-gray-500">{k.date}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8 text-sm">신규 키워드가 없습니다</div>
              )}
            </GlassCard>
          </div>

          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={14} className="text-gray-500" />
              <h2 className="text-xs text-gray-400 uppercase tracking-wider">7일 트렌드 추이</h2>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weekly}>
                <XAxis dataKey="day" tick={{ fill: '#666' }} />
                <YAxis tick={{ fill: '#666' }} />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                <Bar dataKey="count" fill="#00d4ff" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </>
      )}
    </div>
  );
}
