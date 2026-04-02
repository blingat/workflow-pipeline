'use client';
import { useState, useEffect } from 'react';
import GlassCard from '@/components/GlassCard';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import {
  ArrowRight, Clock, Eye, Activity, Cpu, Timer,
  Bot, Pause, CheckCircle2, XCircle, Loader2, Radio, Server,
  Send, Flame, SquareStack
} from 'lucide-react';

const pipelineSteps = ['수집', '분석', '큐레이션', '승인', '발행'];
const stepColors = ['#00d4ff', '#00ff88', '#ffaa00', '#a78bfa', '#ff4444'];
const stepIcons = [Radio, Cpu, Activity, CheckCircle2, Send];

function FlowArrow({ color, active }) {
  return (
    <div className="w-8 h-9 flex items-center justify-center shrink-0 relative overflow-hidden">
      <div className="absolute inset-x-1 top-1/2 h-[1px] -translate-y-1/2" style={{ background: active ? color + '30' : 'rgba(255,255,255,0.04)' }} />
      {active && (
        <>
          <div className="absolute w-1.5 h-1.5 rounded-full animate-flow-dot-1" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
          <div className="absolute w-1 h-1 rounded-full animate-flow-dot-2" style={{ background: color, opacity: 0.6 }} />
          <div className="absolute w-1 h-1 rounded-full animate-flow-dot-3" style={{ background: color, opacity: 0.3 }} />
        </>
      )}
      {!active && <div className="w-0 h-0 border-t-[3px] border-b-[3px] border-l-[5px] border-transparent border-l-gray-800" />}
    </div>
  );
}

function AccountPipelineRow({ a }) {
  const cooldown = null; // DB에서 실시간 계산 필요 시 추가
  const statusMap = {
    deploying: { label: '배포 중', color: '#00ff88', Icon: Loader2 },
    cooldown: { label: '쿨타임', color: '#ffaa00', Icon: Timer },
    waiting: { label: '대기', color: '#555', Icon: Pause },
    analyzing: { label: '분석 중', color: '#00d4ff', Icon: Cpu },
    collecting: { label: '수집 중', color: '#00d4ff', Icon: Radio },
    active: { label: '활성', color: '#00ff88', Icon: CheckCircle2 },
    error: { label: '오류', color: '#ff4444', Icon: XCircle },
  };
  const st = statusMap[a.status] || statusMap.waiting;
  const creditPct = a.total_credits ? Math.round((a.used_credits / a.total_credits) * 100) : 0;

  return (
    <GlassCard className="!p-0 overflow-hidden">
      <div className="flex">
        <div className="w-56 shrink-0 p-5 border-r border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-base">{a.name}</h3>
              <span className="text-[10px] text-gray-600 px-1.5 py-0.5 bg-white/5 rounded">{a.role}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
              <Bot size={12} className="text-secondary" />
              <span>{a.ai_model || 'GLM-5 Turbo'}</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div>
              <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                <span>발행</span>
                <span>{a.published_count || 0}건</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <st.Icon size={13} style={{ color: st.color }} className={a.status === 'deploying' ? 'animate-spin' : ''} />
              <span className="text-xs font-medium" style={{ color: st.color }}>{st.label}</span>
            </div>
            <span className="text-[10px] text-gray-600">페르소나: {a.persona_id || '-'}</span>
          </div>
          <div className="flex items-center">
            {pipelineSteps.map((step, i) => {
              const StepIcon = stepIcons[i];
              const isCurrent = i === a.current_step;
              const isDone = i < a.current_step;
              return (
                <div key={step} className="flex items-center flex-1">
                  <div className="flex-1 relative">
                    <div className={`h-9 rounded-lg flex items-center justify-center gap-2 transition-all ${isCurrent ? 'ring-1' : ''}`} style={{
                      background: isDone ? stepColors[i] + '18' : isCurrent ? stepColors[i] + '15' : 'rgba(255,255,255,0.03)',
                      ringColor: isCurrent ? stepColors[i] + '60' : 'transparent',
                    }}>
                      {isCurrent && <div className="absolute inset-0 rounded-lg animate-pulse" style={{ background: stepColors[i] + '08' }} />}
                      <StepIcon size={14} style={{ color: isDone || isCurrent ? stepColors[i] : '#333' }} className="relative z-10 shrink-0" />
                      <span className="text-xs font-medium relative z-10" style={{ color: isDone || isCurrent ? stepColors[i] : '#333' }}>{step}</span>
                      {isDone && <CheckCircle2 size={12} className="absolute right-2 top-1/2 -translate-y-1/2 z-10" style={{ color: stepColors[i] }} />}
                    </div>
                  </div>
                  {i < pipelineSteps.length - 1 && <FlowArrow color={stepColors[i + 1]} active={isDone} />}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </GlassCard>
  );
}

export default function Dashboard() {
  const [now, setNow] = useState(new Date());
  const [stats, setStats] = useState({ collected: 0, analyzed: 0, curated: 0, approved: 0, published: 0, viral: 0, failed: 0, pending: 0 });
  const [queue, setQueue] = useState([]);
  const [accounts, setAccounts] = useState([]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    fetch('/api/stats').then(r => r.json()).then(setStats).catch(() => {});
    fetch('/api/queue?limit=5&status=pending').then(r => r.json()).then(d => setQueue(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/personas').then(r => r.json()).then(d => {
      // 페르소나를 계정으로 매핑
      const accMap = {
        persona_a: { id: 'main', name: '빠코더', role: '본계', ai_model: 'GLM-5 Turbo', status: 'waiting', current_step: 0 },
        persona_b: { id: 'sub1', name: 'AI파카', role: '난사계', ai_model: 'GLM-5 Turbo', status: 'active', current_step: 2 },
        persona_c: { id: 'sub2', name: '업종특화', role: '난사계', ai_model: 'GLM-5 Turbo', status: 'waiting', current_step: 0 },
      };
      setAccounts(Array.isArray(d) ? d.map(p => ({ ...accMap[p.id], ...p, name: p.name, persona_id: p.id })).filter(Boolean) : []);
    }).catch(() => {});
    return () => clearInterval(t);
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-xs text-gray-500 mt-0.5">Workflow Pipeline Monitor</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5"><Clock size={13} /> {now.toLocaleString('ko-KR')}</div>
          <div className="flex items-center gap-1.5"><Server size={13} className="text-primary" /> OpenClaw <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /></div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: '수집', value: stats.collected, color: 'text-secondary', Icon: Radio },
          { label: '분석', value: stats.analyzed, color: 'text-secondary', Icon: Cpu },
          { label: '큐레이션', value: stats.curated, color: 'text-warning', Icon: Activity },
          { label: '승인', value: stats.approved, color: 'text-[#a78bfa]', Icon: CheckCircle2 },
        ].map(s => (
          <GlassCard key={s.label} className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-white/5">
              <s.Icon size={18} className={s.color} />
            </div>
            <div>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '발행 완료', value: stats.published, color: 'text-primary', Icon: Send },
          { label: '터진 글', value: stats.viral, color: 'text-danger', Icon: Flame },
          { label: '실패', value: stats.failed, color: 'text-gray-500', Icon: XCircle },
        ].map(s => (
          <GlassCard key={s.label} className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color === 'text-primary' ? 'bg-primary/10' : s.color === 'text-danger' ? 'bg-danger/10' : 'bg-white/5'}`}>
              <s.Icon size={18} className={s.color} />
            </div>
            <div>
              <div className="text-xs text-gray-500">{s.label}</div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Bot size={14} className="text-gray-500" />
          <h2 className="text-xs text-gray-400 uppercase tracking-wider">Accounts</h2>
        </div>
        <div className="space-y-3">
          {accounts.length > 0 ? accounts.map(a => <AccountPipelineRow key={a.id} a={a} />) : (
            <GlassCard className="text-center text-gray-500 text-sm py-8">페르소나 데이터를 불러오는 중...</GlassCard>
          )}
        </div>
      </div>

      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Flame size={14} className="text-gray-500" />
          <h2 className="text-xs text-gray-400 uppercase tracking-wider">Next in Queue</h2>
        </div>
        <div className="space-y-2">
          {queue.length > 0 ? queue.map((q, i) => (
            <div key={q.id} className="flex justify-between items-center bg-white/[0.03] rounded-lg px-4 py-3 hover:bg-white/[0.05] transition">
              <div>
                <div className="text-xs text-gray-500">{q.account || 'AI파카'} · {q.persona_id || '테크 꿀팁봇'}</div>
                <div className="text-sm mt-0.5">{(q.content || '').substring(0, 80)}...</div>
              </div>
              <div className="text-xs text-gray-500 shrink-0 ml-4">{q.scheduled_at ? new Date(q.scheduled_at).toLocaleString('ko-KR') : '-'}</div>
            </div>
          )) : (
            <div className="text-center text-gray-500 text-sm py-6">대기 중인 글이 없습니다</div>
          )}
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Activity size={14} className="text-gray-500" />
          <h2 className="text-xs text-gray-400 uppercase tracking-wider">Pipeline Status</h2>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="bg-white/[0.03] rounded-lg p-4">
            <div className="text-2xl font-bold text-secondary">{stats.collected}</div>
            <div className="text-xs text-gray-500 mt-1">수집된 글</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-4">
            <div className="text-2xl font-bold text-warning">{stats.pending}</div>
            <div className="text-xs text-gray-500 mt-1">발행 대기</div>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-4">
            <div className="text-2xl font-bold text-primary">{stats.published}</div>
            <div className="text-xs text-gray-500 mt-1">발행 완료</div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
