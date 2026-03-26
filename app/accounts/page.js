'use client';
import { useState } from 'react';
import GlassCard from '@/components/GlassCard';

const accounts = [
  { id: 'main', name: '빠코더', role: '본계', emoji: '👨‍💻', status: 'Active', cycle: '수동 2~3/일', published: 15, followers: 1240, persona: 'persona_a' },
  { id: 'sub1', name: '자유', role: '서브1', emoji: '🔥', status: 'Active', cycle: '자동 2H 12/일', published: 22, followers: 580, persona: 'persona_b' },
  { id: 'sub2', name: '업종특화', role: '서브2', emoji: '📋', status: 'Warmup', cycle: '반자동 3H 8/일', published: 10, followers: 320, persona: 'persona_c' },
];

export default function Accounts() {
  const [modal, setModal] = useState(null);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">계정 관리</h1>
      <div className="grid grid-cols-3 gap-6">
        {accounts.map(a => (
          <GlassCard key={a.id} className={a.status === 'Warmup' ? 'border-warning/30' : ''}>
            <div className="flex justify-between items-start mb-4">
              <div className="text-2xl mb-2">{a.emoji}</div>
              <span className={`text-xs px-2 py-1 rounded-full ${a.status === 'Active' ? 'bg-primary/20 text-primary' : 'bg-warning/20 text-warning'}`}>{a.status}</span>
            </div>
            <h3 className="text-lg font-bold">{a.name} <span className="text-sm text-gray-500 font-normal">({a.role})</span></h3>
            <div className="mt-4 space-y-2 text-sm text-gray-400">
              <div className="flex justify-between"><span>발행 주기</span><span className="text-white">{a.cycle}</span></div>
              <div className="flex justify-between"><span>발행 수</span><span className="text-white">{a.published}</span></div>
              <div className="flex justify-between"><span>팔로워</span><span className="text-white">{a.followers.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>페르소나</span><span className="text-secondary">{a.persona}</span></div>
            </div>
            <button onClick={() => setModal(a)} className="mt-4 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition">⚙️ 설정</button>
          </GlassCard>
        ))}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setModal(null)}>
          <div className="bg-[#12122a] border border-[rgba(255,255,255,0.1)] rounded-xl p-6 w-96 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">{modal.emoji} {modal.name} 설정</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">발행 주기</label>
                <input className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" defaultValue={modal.cycle} />
              </div>
              <div className="flex gap-2">
                <button className="flex-1 py-2 rounded-lg bg-warning/20 text-warning text-sm">일시중지</button>
                <button className="flex-1 py-2 rounded-lg bg-primary/20 text-primary text-sm">재개</button>
              </div>
            </div>
            <button onClick={() => setModal(null)} className="w-full py-2 bg-white/10 rounded-lg text-sm">닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}
