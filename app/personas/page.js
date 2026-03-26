'use client';
import { useState } from 'react';
import GlassCard from '@/components/GlassCard';

const defaultPersonas = [
  { id: 'persona_a', name: '빠코더 전문가', version: '1.0.0', tone: '결과물로 증명하는 간결한 전문가', emoji_usage: 'minimal', content_length: '3~5줄', target_audience: '자영업자, 스타트업', linked_account: 'main', base_prompt: '당신은 AI를 활용해 실제 결과물을 내는 전문 개발자입니다. 결과물과 수치로만 증명합니다. "바이브코딩" 금지.' },
  { id: 'persona_b', name: '테크 꿀팁봇', version: '1.0.0', tone: '가볍고 자극적, 어그로', emoji_usage: 'heavy', content_length: '2~4줄', target_audience: 'IT 관심 일반인', linked_account: 'sub1', base_prompt: '당신은 IT/AI 꿀팁을 공유하는 익명 계정입니다. 짧고 강렬하게, 이모지 적극 사용.' },
  { id: 'persona_c', name: '자영업 도우미', version: '1.0.0', tone: '친근하고 체크리스트형', emoji_usage: 'moderate', content_length: '5~10줄', target_audience: '자영업자, 소상공인', linked_account: 'sub2', base_prompt: '당신은 자영업자의 디지털전환을 돕는 전문가입니다. 체크리스트/나열형으로 작성.' },
];

const accountLabel = { main: '본계', sub1: '서브1', sub2: '서브2' };
const emojiLabel = { minimal: '🚫 최소', moderate: '😊 보통', heavy: '🎉 많이' };

export default function Personas() {
  const [personas, setPersonas] = useState(defaultPersonas);
  const [editModal, setEditModal] = useState(null);
  const [previewData, setPreviewData] = useState(null);

  const openEdit = (p) => setEditModal({ ...p });
  const openNew = () => setEditModal({ id: '', name: '', version: '1.0.0', tone: '', emoji_usage: 'moderate', content_length: '3~5줄', target_audience: '', linked_account: 'main', base_prompt: '' });

  const save = () => {
    if (!editModal) return;
    const existing = personas.findIndex(p => p.id === editModal.id);
    const updated = { ...editModal, version: existing >= 0 ? bumpVersion(personas[existing].version) : '1.0.0' };
    if (existing >= 0) { const n = [...personas]; n[existing] = updated; setPersonas(n); }
    else { updated.id = editModal.id || `persona_${Date.now()}`; setPersonas([...personas, updated]); }
    setEditModal(null);
  };

  const remove = (id) => setPersonas(personas.filter(p => p.id !== id));

  const generatePreview = async (p) => {
    try {
      const res = await fetch('/api/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ persona_id: p.id, topic: 'AI 자동화' }) });
      const data = await res.json();
      setPreviewData({ name: p.name, samples: data.samples || ['(프리뷰 생성 실패 - DB 미연결)'] });
    } catch { setPreviewData({ name: p.name, samples: ['DB 미연결 상태 - 프리뷰 사용 불가'] }); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">페르소나 & 프롬프트 관리</h1>
        <button onClick={openNew} className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30">+ 새 페르소나</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {personas.map(p => (
          <GlassCard key={p.id}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-bold">{p.name}</h3>
              <span className="text-xs text-gray-500">v{p.version}</span>
            </div>
            <div className="text-xs text-gray-400 mb-1">{p.tone}</div>
            <div className="flex gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 bg-white/10 rounded">{emojiLabel[p.emoji_usage]}</span>
              <span className="text-xs px-2 py-0.5 bg-white/10 rounded">{p.content_length}</span>
              <span className="text-xs px-2 py-0.5 bg-secondary/20 text-secondary rounded">{accountLabel[p.linked_account]}</span>
            </div>
            <div className="text-xs text-gray-500 bg-white/5 rounded p-2 mb-3 line-clamp-2">{p.base_prompt}</div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(p)} className="flex-1 py-1.5 bg-white/10 rounded text-xs hover:bg-white/20">수정</button>
              <button onClick={() => generatePreview(p)} className="flex-1 py-1.5 bg-secondary/20 text-secondary rounded text-xs hover:bg-secondary/30">미리보기</button>
              <button onClick={() => remove(p.id)} className="py-1.5 px-2 bg-danger/20 text-danger rounded text-xs hover:bg-danger/30">✕</button>
            </div>
          </GlassCard>
        ))}
      </div>

      {previewData && (
        <GlassCard>
          <h3 className="font-bold mb-3">✨ {previewData.name} 미리보기</h3>
          <div className="space-y-2">
            {previewData.samples.map((s, i) => <div key={i} className="bg-white/5 rounded-lg p-3 text-sm">{s}</div>)}
          </div>
          <button onClick={() => setPreviewData(null)} className="mt-3 text-xs text-gray-500">닫기</button>
        </GlassCard>
      )}

      {editModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setEditModal(null)}>
          <div className="bg-[#12122a] border border-white/10 rounded-xl p-6 w-[500px] max-h-[80vh] overflow-y-auto space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg">페르소나 편집</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-400">ID</label><input className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={editModal.id} onChange={e => setEditModal({...editModal, id: e.target.value})} disabled={!!defaultPersonas.find(p=>p.id===editModal.id)} /></div>
              <div><label className="text-xs text-gray-400">이름</label><input className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={editModal.name} onChange={e => setEditModal({...editModal, name: e.target.value})} /></div>
              <div><label className="text-xs text-gray-400">톤</label><input className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={editModal.tone} onChange={e => setEditModal({...editModal, tone: e.target.value})} /></div>
              <div><label className="text-xs text-gray-400">이모지</label><select className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={editModal.emoji_usage} onChange={e => setEditModal({...editModal, emoji_usage: e.target.value})}><option value="minimal">minimal</option><option value="moderate">moderate</option><option value="heavy">heavy</option></select></div>
              <div><label className="text-xs text-gray-400">글 길이</label><input className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={editModal.content_length} onChange={e => setEditModal({...editModal, content_length: e.target.value})} /></div>
              <div><label className="text-xs text-gray-400">연결 계정</label><select className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={editModal.linked_account} onChange={e => setEditModal({...editModal, linked_account: e.target.value})}><option value="main">본계</option><option value="sub1">서브1</option><option value="sub2">서브2</option></select></div>
            </div>
            <div><label className="text-xs text-gray-400">타겟</label><input className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={editModal.target_audience} onChange={e => setEditModal({...editModal, target_audience: e.target.value})} /></div>
            <div><label className="text-xs text-gray-400">BASE PROMPT</label><textarea className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm h-32 resize-y" value={editModal.base_prompt} onChange={e => setEditModal({...editModal, base_prompt: e.target.value})} /></div>
            <div className="flex gap-2"><button onClick={save} className="flex-1 py-2 bg-primary/20 text-primary rounded text-sm">저장</button><button onClick={() => setEditModal(null)} className="flex-1 py-2 bg-white/10 rounded text-sm">취소</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function bumpVersion(v) { const p = v.split('.'); return `${p[0]}.${parseInt(p[1]||0)+1}.0`; }
