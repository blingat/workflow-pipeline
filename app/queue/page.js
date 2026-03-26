'use client';
import { useState } from 'react';
import GlassCard from '@/components/GlassCard';
import { Timer, CheckCircle2, Send, Flame, XCircle, ArrowRight } from 'lucide-react';

const statusConfig = {
  pending: { label: '대기', color: 'bg-warning/20 text-warning', Icon: Timer },
  approved: { label: '승인됨', color: 'bg-secondary/20 text-secondary', Icon: CheckCircle2 },
  published: { label: '발행됨', color: 'bg-primary/20 text-primary', Icon: Send },
  viral: { label: '터짐', color: 'bg-danger/20 text-danger', Icon: Flame },
  failed: { label: '실패', color: 'bg-gray-500/20 text-gray-500', Icon: XCircle },
};
const accountLabel = { main: '본계', sub1: '서브1', sub2: '서브2' };

const mockQueue = [
  { id: 1, account: 'sub1', preview: 'ChatGPT 쓰면 안 되는 3가지... 🔥 프롬프트 엔지니어링보다 중요한 건...', status: 'pending', time: '15:30' },
  { id: 2, account: 'sub2', preview: '식당 홈페이지 이것만 하면 손님 2배 됩니다. 1. 예약 시스템 2. 구글 맵 리뷰...', status: 'pending', time: '16:00' },
  { id: 3, account: 'sub1', preview: 'AI로 상세페이지 만드는 법. CTR 3배 ↑ 실제로 확인해봤습니다.', status: 'published', time: '13:00' },
  { id: 4, account: 'main', preview: '병원 홈페이지 제작 3일 완성. 환자 문의 40% 증가 결과입니다.', status: 'viral', time: '10:00' },
  { id: 5, account: 'sub1', preview: '외주 단가 올리는 꿀팁. CRM 자동화 제안부터 시작하세요.', status: 'failed', time: '09:00' },
];

export default function Queue() {
  const [items] = useState(mockQueue);
  const [addModal, setAddModal] = useState(false);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">발행 대기열</h1>
        <button onClick={() => setAddModal(true)} className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30">+ 수동 추가</button>
      </div>

      <GlassCard className="!p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-white/10 text-gray-500 text-xs">
            <th className="text-left p-4">#</th><th className="text-left p-4">계정</th><th className="text-left p-4">미리보기</th><th className="text-left p-4">상태</th><th className="text-left p-4">시각</th><th className="text-left p-4">액션</th>
          </tr></thead>
          <tbody>
            {items.map(q => (
              <tr key={q.id} className="border-b border-white/5 hover:bg-white/5 transition">
                <td className="p-4 text-gray-500">{q.id}</td>
                <td className="p-4">{accountLabel[q.account]}</td>
                <td className="p-4 max-w-xs truncate">{q.preview}</td>
                <td className="p-4"><span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${statusConfig[q.status].color} ${q.status === 'viral' ? 'viral-glow' : ''}`}>{statusConfig[q.status].label}</span></td>
                <td className="p-4 text-gray-400">{q.time}</td>
                <td className="p-4">
                  <div className="flex gap-1">
                    <button className="px-2 py-1 bg-white/5 rounded text-xs hover:bg-white/10">수정</button>
                    {q.status === 'viral' && <button className="px-2 py-1 bg-danger/20 text-danger rounded text-xs hover:bg-danger/30">→ 본계</button>}
                    <button className="px-2 py-1 bg-white/5 rounded text-xs hover:bg-white/10 text-danger">✕</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>

      {addModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setAddModal(false)}>
          <div className="bg-[#12122a] border border-white/10 rounded-xl p-6 w-96 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold">수동 추가</h3>
            <div><label className="text-xs text-gray-400">계정</label><select className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm"><option value="main">본계</option><option value="sub1">서브1</option><option value="sub2">서브2</option></select></div>
            <div><label className="text-xs text-gray-400">내용</label><textarea className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm h-24 resize-y" placeholder="발행할 내용을 입력하세요" /></div>
            <div><label className="text-xs text-gray-400">예약 시각</label><input type="datetime-local" className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" /></div>
            <button className="w-full py-2 bg-primary/20 text-primary rounded text-sm">추가</button>
            <button onClick={() => setAddModal(false)} className="w-full py-2 bg-white/10 rounded text-sm">취소</button>
          </div>
        </div>
      )}
    </div>
  );
}
