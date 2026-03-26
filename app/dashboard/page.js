'use client';
import { useState, useEffect } from 'react';
import GlassCard from '@/components/GlassCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowRight, Clock, Zap, Eye } from 'lucide-react';

const pipelineSteps = ['수집', '분석', '큐레이션', '승인', '발행'];
const stepColors = ['#00d4ff', '#00ff88', '#ffaa00', '#a78bfa', '#ff4444'];

const mockStats = { published: 47, total: 156, pool: 89, pending: 12 };
const mockAccounts = [
  { name: '빠코더', role: '본계', status: 'Active', published: 15, emoji: '👨‍💻' },
  { name: '자유', role: '서브1', status: 'Active', published: 22, emoji: '🔥' },
  { name: '업종특화', role: '서브2', status: 'Warmup', published: 10, emoji: '📋' },
];
const mockNextQueue = [
  { account: '자유', persona: '테크 꿀팁봇', preview: 'ChatGPT 쓰면 안 되는 3가지... 🔥', time: '15:30' },
  { account: '업종특화', persona: '자영업 도우미', preview: '식당 홈페이지 이것만 하면 손님 2배...', time: '16:00' },
];
const hourlyData = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}시`, count: Math.floor(Math.random() * 5),
}));

export default function Dashboard() {
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <Clock size={14} /> {now.toLocaleString('ko-KR')}
          <span className="flex items-center gap-1"><Zap size={14} className="text-primary" /> 시스템 정상</span>
        </div>
      </div>

      {/* Pipeline Flow */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">파이프라인</h2>
        <div className="flex items-center justify-between gap-2">
          {pipelineSteps.map((step, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className="flex-1 text-center">
                <div className="w-full py-3 rounded-lg text-sm font-medium" style={{ background: stepColors[i] + '20', color: stepColors[i], border: `1px solid ${stepColors[i]}40` }}>
                  {step}
                </div>
              </div>
              {i < pipelineSteps.length - 1 && <ArrowRight size={16} className="text-gray-600 shrink-0" />}
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '발행 성공', value: mockStats.published, color: 'text-primary' },
          { label: '전체 발행', value: mockStats.total, color: 'text-secondary' },
          { label: '콘텐츠 풀', value: mockStats.pool, color: 'text-warning' },
          { label: '대기 중', value: mockStats.pending, color: 'text-gray-400' },
        ].map(s => (
          <GlassCard key={s.label}>
            <div className="text-xs text-gray-500 mb-1">{s.label}</div>
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
          </GlassCard>
        ))}
      </div>

      {/* Accounts + Next Queue */}
      <div className="grid grid-cols-3 gap-4">
        {mockAccounts.map(a => (
          <GlassCard key={a.name}>
            <div className="flex justify-between items-start mb-3">
              <div className="text-lg font-semibold">{a.emoji} {a.name} <span className="text-xs text-gray-500">({a.role})</span></div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === 'Active' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'}`}>{a.status}</span>
            </div>
            <div className="text-2xl font-bold">{a.published}<span className="text-sm text-gray-500 ml-1">발행</span></div>
          </GlassCard>
        ))}
      </div>

      {/* Next in Queue */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-3">📋 NEXT IN QUEUE</h2>
        <div className="space-y-2">
          {mockNextQueue.map((q, i) => (
            <div key={i} className="flex justify-between items-center bg-white/5 rounded-lg px-4 py-3">
              <div>
                <div className="text-xs text-gray-500">{q.account} · {q.persona}</div>
                <div className="text-sm">{q.preview}</div>
              </div>
              <div className="text-xs text-gray-500">{q.time}</div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* 24h Chart */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">📊 24시간 발행 타임라인</h2>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={hourlyData}>
            <XAxis dataKey="hour" tick={{ fill: '#666', fontSize: 10 }} />
            <YAxis tick={{ fill: '#666', fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
            <Bar dataKey="count" fill="#00ff88" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>
    </div>
  );
}
