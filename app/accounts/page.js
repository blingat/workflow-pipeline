'use client';
import { useState } from 'react';
import GlassCard from '@/components/GlassCard';
import {
  Bot, Cpu, Timer, CheckCircle2, Pause, XCircle, Loader2,
  Settings2, Play, ArrowUpRight, Users
} from 'lucide-react';

const mockAccounts = [
  {
    id: 'main', name: '빠코더', role: '본계', status: 'deploying',
    aiModel: 'GLM-5 Turbo', aiCredits: { used: 1240, total: 5000 },
    cycleHours: null, cooldownSec: 0, deployedAt: '16:30',
    published: 15, followers: 1240, persona: 'persona_a', paused: false,
  },
  {
    id: 'sub1', name: '자유', role: '난사계', status: 'cooldown',
    aiModel: 'GLM-5 Turbo', aiCredits: { used: 3800, total: 5000 },
    cycleHours: 2, cooldownSec: 4720, deployedAt: '14:00',
    published: 22, followers: 580, persona: 'persona_b', paused: false,
  },
  {
    id: 'sub2', name: '업종특화', role: '난사계', status: 'waiting',
    aiModel: 'GLM-5 Flash', aiCredits: { used: 600, total: 10000 },
    cycleHours: 3, cooldownSec: 0, deployedAt: null,
    published: 10, followers: 320, persona: 'persona_c', paused: false,
  },
];

function StatusBadge({ status }) {
  const map = {
    deploying: { label: '배포 중', color: 'text-primary bg-primary/15', Icon: Loader2 },
    cooldown: { label: '쿨타임', color: 'text-warning bg-warning/15', Icon: Timer },
    waiting: { label: '대기', color: 'text-gray-400 bg-white/10', Icon: Pause },
    active: { label: '활성', color: 'text-primary bg-primary/15', Icon: CheckCircle2 },
    error: { label: '오류', color: 'text-danger bg-danger/15', Icon: XCircle },
  };
  const { label, color, Icon } = map[status] || map.waiting;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${color}`}>
      <Icon size={12} className={status === 'deploying' ? 'animate-spin' : ''} />
      {label}
    </span>
  );
}

function formatCooldown(sec) {
  if (sec <= 0) return '-';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

export default function Accounts() {
  const [modal, setModal] = useState(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Accounts</h1>
        <p className="text-xs text-gray-500 mt-0.5">계정별 AI 엔진, 크레딧, 싸이클 상태</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {mockAccounts.map(a => {
          const creditPct = Math.round((a.aiCredits.used / a.aiCredits.total) * 100);
          return (
            <GlassCard key={a.id} className="relative overflow-hidden">
              {/* top status line */}
              <div className="absolute top-0 left-0 right-0 h-0.5" style={{
                background: a.status === 'deploying' ? '#00ff88' : a.status === 'cooldown' ? '#ffaa00' : a.status === 'error' ? '#ff4444' : 'rgba(255,255,255,0.1)',
              }} />

              <div className="flex justify-between items-start mb-5">
                <div>
                  <h3 className="font-bold text-lg">{a.name}</h3>
                  <span className="text-xs text-gray-500">{a.role}</span>
                </div>
                <StatusBadge status={a.status} />
              </div>

              {/* AI Engine */}
              <div className="flex items-center gap-2.5 mb-4 px-3 py-2.5 rounded-lg bg-white/[0.03]">
                <Cpu size={15} className="text-secondary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">AI Engine</div>
                  <div className="text-sm font-medium">{a.aiModel}</div>
                </div>
              </div>

              {/* Credits */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500">크레딧</span>
                  <span className={creditPct > 80 ? 'text-danger' : 'text-gray-400'}>
                    {a.aiCredits.used.toLocaleString()} / {a.aiCredits.total.toLocaleString()}
                    <span className="ml-1.5 text-gray-600">({creditPct}%)</span>
                  </span>
                </div>
                <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${creditPct > 80 ? 'bg-danger' : 'bg-secondary'}`} style={{ width: `${creditPct}%` }} />
                </div>
              </div>

              {/* Detail grid */}
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <div className="px-3 py-2.5 rounded-lg bg-white/[0.03]">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">싸이클</div>
                  <div className="font-medium">{a.cycleHours ? `매 ${a.cycleHours}시간` : '수동'}</div>
                </div>
                <div className="px-3 py-2.5 rounded-lg bg-white/[0.03]">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">쿨타임</div>
                  <div className={`font-medium ${a.cooldownSec > 0 ? 'text-warning' : 'text-gray-600'}`}>{formatCooldown(a.cooldownSec)}</div>
                </div>
                <div className="px-3 py-2.5 rounded-lg bg-white/[0.03]">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">발행 수</div>
                  <div className="font-medium">{a.published}</div>
                </div>
                <div className="px-3 py-2.5 rounded-lg bg-white/[0.03]">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">팔로워</div>
                  <div className="font-medium">{a.followers.toLocaleString()}</div>
                </div>
              </div>

              {/* Linked persona */}
              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] mb-4">
                <div className="flex items-center gap-2 text-xs">
                  <Bot size={13} className="text-gray-500" />
                  <span className="text-gray-500">페르소나</span>
                </div>
                <span className="text-xs font-medium text-secondary">{a.persona}</span>
              </div>

              <button onClick={() => setModal(a)} className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-gray-400 hover:text-white transition flex items-center justify-center gap-2">
                <Settings2 size={13} /> 설정
              </button>
            </GlassCard>
          );
        })}
      </div>

      {/* Settings Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-[#12122a] border border-[rgba(255,255,255,0.08)] rounded-xl p-6 w-[420px] space-y-5" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-lg">{modal.name} 설정</h3>
              <StatusBadge status={modal.status} />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">AI Engine</label>
                <select className="w-full mt-1.5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm" defaultValue={modal.aiModel}>
                  <option>GLM-5 Turbo</option>
                  <option>GLM-5 Flash</option>
                  <option>Claude Sonnet</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider">발행 싸이클</label>
                <select className="w-full mt-1.5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm" defaultValue={modal.cycleHours || 'manual'}>
                  <option value="manual">수동</option>
                  <option value="1">1시간</option>
                  <option value="2">2시간</option>
                  <option value="3">3시간</option>
                  <option value="4">4시간</option>
                  <option value="6">6시간</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">일일 발행 제한</label>
                  <input type="number" className="w-full mt-1.5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm" defaultValue={12} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider">연결 페르소나</label>
                  <select className="w-full mt-1.5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm" defaultValue={modal.persona}>
                    <option value="persona_a">빠코더 전문가</option>
                    <option value="persona_b">테크 꿀팁봇</option>
                    <option value="persona_c">자영업 도우미</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button className="flex-1 py-2.5 rounded-lg bg-warning/15 text-warning text-sm flex items-center justify-center gap-2 hover:bg-warning/25 transition">
                  <Pause size={14} /> 일시중지
                </button>
                <button className="flex-1 py-2.5 rounded-lg bg-primary/15 text-primary text-sm flex items-center justify-center gap-2 hover:bg-primary/25 transition">
                  <Play size={14} /> 재개
                </button>
                <button className="py-2.5 px-4 rounded-lg bg-danger/15 text-danger text-sm flex items-center justify-center gap-2 hover:bg-danger/25 transition">
                  <XCircle size={14} /> 중지
                </button>
              </div>
            </div>

            <button onClick={() => setModal(null)} className="w-full py-2.5 bg-white/5 rounded-lg text-sm text-gray-400 hover:text-white transition">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
