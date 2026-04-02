'use client';
import { useState, useEffect } from 'react';
import GlassCard from '@/components/GlassCard';
import {
  Bot, Cpu, Timer, CheckCircle2, Pause, XCircle, Loader2,
  Settings2, Play, Users
} from 'lucide-react';

function StatusBadge({ status }) {
  const map = {
    active: { label: '활성', color: 'text-primary bg-primary/15', Icon: CheckCircle2 },
    aging: { label: '에이징 중', color: 'text-warning bg-warning/15', Icon: Loader2 },
    paused: { label: '일시중지', color: 'text-gray-400 bg-white/10', Icon: Pause },
    error: { label: '오류', color: 'text-danger bg-danger/15', Icon: XCircle },
  };
  const { label, color, Icon } = map[status] || map.paused;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${color}`}>
      <Icon size={12} className={status === 'aging' ? 'animate-spin' : ''} />
      {label}
    </span>
  );
}

export default function Accounts() {
  const [personas, setPersonas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    fetch('/api/personas')
      .then(r => r.json())
      .then(d => { setPersonas(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const accountMap = {
    persona_a: { id: 'main', name: '빠코더', role: '본계', status: 'paused' },
    persona_b: { id: 'sub1', name: 'AI파카', role: '난사계', status: 'aging' },
    persona_c: { id: 'sub2', name: '업종특화', role: '난사계', status: 'paused' },
  };

  const accounts = personas.map(p => ({
    ...accountMap[p.id],
    ...p,
    name: p.name,
    persona_id: p.id,
    ai_model: 'GLM-5 Turbo',
    linked_account: p.linked_account,
  })).filter(Boolean);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
        <p className="text-xs text-gray-500 mt-0.5">계정별 페르소나 & 상태</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {loading ? (
          <GlassCard className="col-span-3 text-center text-gray-500 py-8">로딩 중...</GlassCard>
        ) : accounts.length === 0 ? (
          <GlassCard className="col-span-3 text-center text-gray-500 py-8">페르소나가 없습니다</GlassCard>
        ) : accounts.map(a => (
          <GlassCard key={a.id} className="relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{
              background: a.status === 'aging' ? '#ffaa00' : a.status === 'active' ? '#00ff88' : a.status === 'error' ? '#ff4444' : 'rgba(255,255,255,0.1)',
            }} />

            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="font-bold text-lg">{a.name}</h3>
                <span className="text-xs text-gray-500">{a.role}</span>
              </div>
              <StatusBadge status={a.status} />
            </div>

            <div className="flex items-center gap-2.5 mb-4 px-3 py-2.5 rounded-lg bg-white/[0.03]">
              <Cpu size={15} className="text-secondary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">AI Engine</div>
                <div className="text-sm font-medium">{a.ai_model}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
              <div className="px-3 py-2.5 rounded-lg bg-white/[0.03]">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">계정</div>
                <div className="font-medium">{accountLabel[a.linked_account] || a.linked_account || '-'}</div>
              </div>
              <div className="px-3 py-2.5 rounded-lg bg-white/[0.03]">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">톤</div>
                <div className="font-medium text-gray-300">{(a.tone || '').substring(0, 20)}</div>
              </div>
              <div className="px-3 py-2.5 rounded-lg bg-white/[0.03]">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">이모지</div>
                <div className="font-medium">{a.emoji_usage || '-'}</div>
              </div>
              <div className="px-3 py-2.5 rounded-lg bg-white/[0.03]">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">길이</div>
                <div className="font-medium">{a.content_length || '-'}</div>
              </div>
            </div>

            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] mb-4">
              <div className="flex items-center gap-2 text-xs">
                <Bot size={13} className="text-gray-500" />
                <span className="text-gray-500">타겟</span>
              </div>
              <span className="text-xs font-medium text-secondary text-right max-w-[180px] truncate">{a.target_audience || '-'}</span>
            </div>

            <button onClick={() => setModal(a)} className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition flex items-center justify-center gap-2">
              <Settings2 size={13} /> 상세
            </button>
          </GlassCard>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-[#12122a] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 w-[420px] space-y-5 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">{modal.name}</h3>
              <StatusBadge status={modal.status} />
            </div>
            <div className="space-y-3 text-sm">
              <div><span className="text-xs text-gray-500">페르소나 ID:</span> <span className="ml-2">{modal.persona_id}</span></div>
              <div><span className="text-xs text-gray-500">톤:</span> <span className="ml-2">{modal.tone}</span></div>
              <div><span className="text-xs text-gray-500">기본 프롬프트:</span>
                <pre className="mt-1 p-3 bg-white/5 rounded text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">{modal.base_prompt}</pre>
              </div>
              <div><span className="text-xs text-gray-500">타겟:</span> <span className="ml-2">{modal.target_audience}</span></div>
              <div><span className="text-xs text-gray-500">업데이트:</span> <span className="ml-2">{modal.updated_at ? new Date(modal.updated_at).toLocaleString('ko-KR') : '-'}</span></div>
            </div>
            <button onClick={() => setModal(null)} className="w-full py-2.5 bg-white/5 rounded-lg text-sm text-gray-400 hover:text-white transition">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

const accountLabel = { main: '본계', sub1: 'AI파카', sub2: '업종특화' };
