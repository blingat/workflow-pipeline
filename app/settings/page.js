'use client';
import { useState } from 'react';
import GlassCard from '@/components/GlassCard';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function Settings() {
  const [keywords, setKeywords] = useState(['바이브코딩', 'AI', '자동화', '홈페이지', '외주', 'SaaS', '상세페이지', 'CRM']);
  const [newKw, setNewKw] = useState('');
  const [telegramNotif, setTelegramNotif] = useState(true);
  const [postizUrl, setPostizUrl] = useState('http://localhost:5000');
  const [postizKey, setPostizKey] = useState('');
  const [collectInterval, setCollectInterval] = useState('2');
  const [analyzeInterval, setAnalyzeInterval] = useState('6');

  const addKeyword = () => { if (newKw.trim()) { setKeywords([...keywords, newKw.trim()]); setNewKw(''); } };
  const removeKeyword = (k) => setKeywords(keywords.filter(x => x !== k));

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold">설정</h1>

      {/* Connection Status */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">연결 상태</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3"><CheckCircle size={18} className="text-primary" /><span className="text-sm">OpenClaw — 연결됨</span></div>
          <div className="flex items-center gap-3"><AlertTriangle size={18} className="text-warning" /><span className="text-sm">Neon DB — 미연결 (DATABASE_URL 미설정)</span></div>
          <div className="flex items-center gap-3"><XCircle size={18} className="text-danger" /><span className="text-sm">Postiz — 미연결</span></div>
        </div>
      </GlassCard>

      {/* Postiz */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">Postiz API</h2>
        <div className="space-y-3">
          <div><label className="text-xs text-gray-400">API URL</label><input className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={postizUrl} onChange={e => setPostizUrl(e.target.value)} /></div>
          <div><label className="text-xs text-gray-400">API Key</label><input type="password" className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={postizKey} onChange={e => setPostizKey(e.target.value)} placeholder="postiz_xxxx" /></div>
        </div>
      </GlassCard>

      {/* Keywords */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">수집 키워드</h2>
        <div className="flex flex-wrap gap-2 mb-3">
          {keywords.map(k => (
            <span key={k} className="flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-xs">
              {k}
              <button onClick={() => removeKeyword(k)} className="text-danger hover:text-white">✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={newKw} onChange={e => setNewKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKeyword()} placeholder="새 키워드" />
          <button onClick={addKeyword} className="px-4 py-2 bg-primary/20 text-primary rounded text-sm">추가</button>
        </div>
      </GlassCard>

      {/* Schedules */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">자동화 주기</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-gray-400">수집 주기 (시간)</label><input type="number" min="1" max="24" className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={collectInterval} onChange={e => setCollectInterval(e.target.value)} /></div>
          <div><label className="text-xs text-gray-400">분석 주기 (시간)</label><input type="number" min="1" max="24" className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={analyzeInterval} onChange={e => setAnalyzeInterval(e.target.value)} /></div>
        </div>
      </GlassCard>

      {/* Telegram */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">텔레그램 알림</h2>
        <div className="flex items-center justify-between">
          <span className="text-sm">알림 활성화</span>
          <button onClick={() => setTelegramNotif(!telegramNotif)} className={`w-12 h-6 rounded-full transition ${telegramNotif ? 'bg-primary' : 'bg-gray-600'}`}>
            <div className={`w-5 h-5 bg-white rounded-full transition-transform ${telegramNotif ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
