'use client';
import { useState } from 'react';
import GlassCard from '@/components/GlassCard';

const defaultPersonas = [
  {
    id: 'persona_a', name: '빠코더 전문가', version: '2.0.0',
    tone: '결과물로 증명하는 간결한 전문가',
    emoji_usage: 'minimal', content_length: '3~5줄',
    target_audience: '자영업자, 스타트업, 외주 의뢰인',
    linked_account: 'main',
    base_prompt: `당신은 AI를 활용해 실제 결과물을 내는 전문 개발자입니다.

## 규칙
- 결과물과 수치로만 증명합니다
- "바이브코딩"이라는 단어를 절대 사용하지 않습니다
- 고객 타겟 키워드를 사용합니다: "병원 홈페이지", "쇼핑몰 상세페이지", "CRM 자동화"
- 간결하고 자신감 있게, 3~5줄 이내

## 금지
- 이모지 남발, 개발 용어 남발, 허세`,
  },
  {
    id: 'persona_b', name: 'AI파카 🦙', version: '2.0.0',
    tone: '가볍고 자극적, 반말',
    emoji_usage: 'normal', content_length: '2~4줄',
    target_audience: 'IT 관심 일반인, 개발 입문자, 부업 관심자',
    linked_account: 'sub1',
    base_prompt: `당신은 AI파카(🦙)입니다. AI 꿀팁을 매일 투하하는 알파카 캐릭터.

## 규칙
- 반말, 가볍고 자극적
- 2~4줄 이내
- 첫 줄에서 시선을 끌어야 함 (질문, 도발, 수치)
- 이모지 normal (🦙 필수)
- 리포스트/저장 욕구 자극
- 순번이나 글머리 기호 사용 금지 → 자연스러운 문장 흐름
- 마지막 줄은 항상 "(그 다음 계속👇)"

## 콘텐츠 5대 패턴 (돌려가면서)
1. 무료 대안: 그거 돈 주고 씀? 무료임
2. 체크리스트: AI로 돈 버는 법 N가지
3. 숫자 인증: 작업시간 X% 줄었음
4. 역발상 도발: ~한다고 ~아님
5. Before/After: AI 쓰기 전 vs 후

## 금지
- 길게 쓰기, 전문 용어 남발, 글 본문에 링크
- 존댓말(~해요, ~입니다, ~하세요)
- "바이브코딩" 사용
- 같은 오프닝 2번 이상`,
  },
  {
    id: 'persona_c', name: '자영업 도우미', version: '1.0.0',
    tone: '친근하고 체크리스트형',
    emoji_usage: 'moderate', content_length: '5~10줄',
    target_audience: '자영업자, 소상공인',
    linked_account: 'sub2',
    base_prompt: '당신은 자영업자의 디지털전환을 돕는 전문가입니다. 체크리스트/나열형으로 작성.',
  },
];

const accountLabel = { main: '본계 (빠코더)', sub1: '서브1 (AI파카)', sub2: '서브2' };
const emojiLabel = { minimal: '🚫 최소', moderate: '😊 보통', normal: '🦙 기본', heavy: '🎉 많이' };

export default function Personas() {
  const [personas, setPersonas] = useState(defaultPersonas);
  const [editModal, setEditModal] = useState(null);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-bold">페르소나 & 프롬프트 관리</h1>
        <button onClick={openNew} className="px-4 py-2 bg-primary/20 text-primary rounded-lg text-sm hover:bg-primary/30">+ 새 페르소나</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {personas.map(p => (
          <GlassCard key={p.id} className="!p-5">
            <div className="flex justify-between items-start mb-3">
              <h3 className="font-bold text-base">{p.name}</h3>
              <span className="text-xs text-gray-500">v{p.version}</span>
            </div>
            <p className="text-sm text-gray-400 mb-3">{p.tone}</p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs px-2 py-1 bg-white/10 rounded-lg">{emojiLabel[p.emoji_usage] || p.emoji_usage}</span>
              <span className="text-xs px-2 py-1 bg-white/10 rounded-lg">{p.content_length}</span>
              <span className="text-xs px-2 py-1 bg-secondary/20 text-secondary rounded-lg">{accountLabel[p.linked_account] || p.linked_account}</span>
            </div>
            <div className="text-xs text-gray-500 bg-white/5 rounded-lg p-3 mb-4 line-clamp-4 whitespace-pre-wrap">{p.base_prompt}</div>
            <div className="text-xs text-gray-500 mb-4">
              <span className="text-gray-400">타겟:</span> {p.target_audience}
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(p)} className="flex-1 py-2 bg-white/10 rounded-lg text-xs hover:bg-white/20 transition">수정</button>
              <button onClick={() => remove(p.id)} className="py-2 px-3 bg-danger/20 text-danger rounded-lg text-xs hover:bg-danger/30 transition">✕</button>
            </div>
          </GlassCard>
        ))}
      </div>

      {editModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditModal(null)}>
          <div className="bg-[#12122a] border border-white/10 rounded-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-lg">페르소나 편집</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-xs text-gray-400">ID</label><input className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" value={editModal.id} onChange={e => setEditModal({...editModal, id: e.target.value})} disabled={!!defaultPersonas.find(p=>p.id===editModal.id)} /></div>
              <div><label className="text-xs text-gray-400">이름</label><input className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" value={editModal.name} onChange={e => setEditModal({...editModal, name: e.target.value})} /></div>
              <div><label className="text-xs text-gray-400">톤</label><input className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" value={editModal.tone} onChange={e => setEditModal({...editModal, tone: e.target.value})} /></div>
              <div><label className="text-xs text-gray-400">이모지</label><select className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" value={editModal.emoji_usage} onChange={e => setEditModal({...editModal, emoji_usage: e.target.value})}><option value="minimal">minimal</option><option value="normal">normal</option><option value="moderate">moderate</option><option value="heavy">heavy</option></select></div>
              <div><label className="text-xs text-gray-400">글 길이</label><input className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" value={editModal.content_length} onChange={e => setEditModal({...editModal, content_length: e.target.value})} /></div>
              <div><label className="text-xs text-gray-400">연결 계정</label><select className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" value={editModal.linked_account} onChange={e => setEditModal({...editModal, linked_account: e.target.value})}><option value="main">본계 (빠코더)</option><option value="sub1">서브1 (AI파카)</option><option value="sub2">서브2</option></select></div>
            </div>
            <div><label className="text-xs text-gray-400">타겟 오디언스</label><input className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm" value={editModal.target_audience} onChange={e => setEditModal({...editModal, target_audience: e.target.value})} /></div>
            <div><label className="text-xs text-gray-400">BASE PROMPT</label><textarea className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm h-40 resize-y" value={editModal.base_prompt} onChange={e => setEditModal({...editModal, base_prompt: e.target.value})} /></div>
            <div className="flex gap-2"><button onClick={save} className="flex-1 py-2.5 bg-primary/20 text-primary rounded-lg text-sm">저장</button><button onClick={() => setEditModal(null)} className="flex-1 py-2.5 bg-white/10 rounded-lg text-sm">취소</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function bumpVersion(v) { const p = v.split('.'); return `${p[0]}.${parseInt(p[1]||0)+1}.0`; }
