'use client';
import { useState, useEffect } from 'react';
import GlassCard from '@/components/GlassCard';
import { Radio, Cpu, Activity, CheckCircle2, Send, Plus, Trash2, GripVertical, Settings2, Save, RotateCcw } from 'lucide-react';

const pipelineSteps = ['수집', '분석', '큐레이션', '승인', '발행'];
const stepColors = ['#00d4ff', '#00ff88', '#ffaa00', '#a78bfa', '#ff4444'];
const stepIcons = [Radio, Cpu, Activity, CheckCircle2, Send];

const defaultConfig = {
  collectInterval: 2,
  analyzeInterval: 6,
  maxCollectPerRun: 100,
  scoreWeights: { likes: 1, reposts: 3, replies: 2 },
  aiModel: 'GLM-5 Turbo',
  excludeKeywords: [],
  enabled: true,
};

export default function CollectorSettings() {
  const [keywords, setKeywords] = useState([]);
  const [newKw, setNewKw] = useState('');
  const [config, setConfig] = useState(defaultConfig);
  const [excludeKw, setExcludeKw] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/collector').then(r => r.json()).then(data => {
      if (data.length) setKeywords(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const addKeyword = () => {
    if (!newKw.trim()) return;
    setKeywords([...keywords, { keyword: newKw.trim(), max_posts: 20, enabled: true }]);
    setNewKw('');
  };

  const removeKeyword = (i) => setKeywords(keywords.filter((_, idx) => idx !== i));

  const toggleKeyword = (i) => {
    const n = [...keywords];
    n[i].enabled = !n[i].enabled;
    setKeywords(n);
  };

  const updateMaxPosts = (i, val) => {
    const n = [...keywords];
    n[i].max_posts = parseInt(val) || 20;
    setKeywords(n);
  };

  const addExclude = () => {
    if (!excludeKw.trim() || config.excludeKeywords.includes(excludeKw.trim())) return;
    setConfig({ ...config, excludeKeywords: [...config.excludeKeywords, excludeKw.trim()] });
    setExcludeKw('');
  };

  const removeExclude = (k) => setConfig({ ...config, excludeKeywords: config.excludeKeywords.filter(x => x !== k) });

  const save = async () => {
    await fetch('/api/collector', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(keywords),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetDefaults = () => {
    setConfig(defaultConfig);
    setExcludeKw('');
  };

  if (loading) return <div className="text-gray-500 text-sm">로딩 중...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Collector Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">수집 로직, 키워드, 스케줄 구성</p>
      </div>

      {/* Pipeline overview */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-4">
          <Settings2 size={14} className="text-gray-500" />
          <h2 className="text-xs text-gray-400 uppercase tracking-wider">Pipeline Flow</h2>
        </div>
        <div className="flex items-center gap-1.5">
          {pipelineSteps.map((step, i) => {
            const StepIcon = stepIcons[i];
            return (
              <div key={step} className="flex items-center gap-1.5 flex-1">
                <div className="flex-1 h-10 rounded-lg flex items-center justify-center gap-2" style={{ background: stepColors[i] + '12', border: `1px solid ${stepColors[i]}25` }}>
                  <StepIcon size={14} style={{ color: stepColors[i] }} />
                  <span className="text-xs font-medium" style={{ color: stepColors[i] }}>{step}</span>
                </div>
                {i < pipelineSteps.length - 1 && <div className="w-6 flex items-center justify-center"><div className="w-4 h-[1px] bg-gray-700" /></div>}
              </div>
            );
          })}
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 gap-6">
        {/* Left: Keywords */}
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-300">수집 키워드</h2>
            <span className="text-xs text-gray-600">{keywords.filter(k => k.enabled).length} / {keywords.length} 활성</span>
          </div>

          <div className="space-y-1.5 mb-4">
            {keywords.map((k, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] group hover:bg-white/[0.05] transition">
                <GripVertical size={12} className="text-gray-700 cursor-grab" />
                <button onClick={() => toggleKeyword(i)} className={`w-4 h-4 rounded border transition flex items-center justify-center shrink-0 ${k.enabled ? 'bg-primary/20 border-primary/40' : 'border-gray-700'}`}>
                  {k.enabled && <div className="w-1.5 h-1.5 rounded-sm bg-primary" />}
                </button>
                <span className={`flex-1 text-sm ${k.enabled ? 'text-gray-200' : 'text-gray-600 line-through'}`}>{k.keyword}</span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-gray-600">상위</span>
                  <input type="number" min="5" max="50" value={k.max_posts} onChange={e => updateMaxPosts(i, e.target.value)}
                    className="w-12 px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-xs text-center text-gray-300 focus:outline-none focus:border-secondary/40" />
                  <span className="text-[10px] text-gray-600">개</span>
                </div>
                <button onClick={() => removeKeyword(i)} className="text-gray-700 hover:text-danger transition p-1">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-secondary/40" value={newKw} onChange={e => setNewKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKeyword()} placeholder="새 키워드" />
            <button onClick={addKeyword} className="px-3 py-2 bg-secondary/15 text-secondary rounded-lg hover:bg-secondary/25 transition">
              <Plus size={16} />
            </button>
          </div>
        </GlassCard>

        {/* Right: Config */}
        <div className="space-y-4">
          {/* Schedule */}
          <GlassCard>
            <h2 className="text-sm font-medium text-gray-300 mb-4">자동화 주기</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">수집 주기</label>
                <select className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none" value={config.collectInterval} onChange={e => setConfig({ ...config, collectInterval: e.target.value })}>
                  <option value="1">1시간</option>
                  <option value="2">2시간</option>
                  <option value="3">3시간</option>
                  <option value="4">4시간</option>
                  <option value="6">6시간</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider">분석 주기</label>
                <select className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none" value={config.analyzeInterval} onChange={e => setConfig({ ...config, analyzeInterval: e.target.value })}>
                  <option value="3">3시간</option>
                  <option value="6">6시간</option>
                  <option value="8">8시간</option>
                  <option value="12">12시간</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="text-[10px] text-gray-500 uppercase tracking-wider">1회 최대 수집 수</label>
              <input type="number" min="20" max="500" className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none" value={config.maxCollectPerRun} onChange={e => setConfig({ ...config, maxCollectPerRun: parseInt(e.target.value) || 100 })} />
            </div>
          </GlassCard>

          {/* Score weights */}
          <GlassCard>
            <h2 className="text-sm font-medium text-gray-300 mb-3">인기도 점수 가중치</h2>
            <p className="text-[10px] text-gray-600 mb-3">score = (likes × L + reposts × R + replies × C) / max(views, 1) × 1000</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: 'likes', label: 'Likes (L)', color: 'text-danger' },
                { key: 'reposts', label: 'Reposts (R)', color: 'text-secondary' },
                { key: 'replies', label: 'Replies (C)', color: 'text-primary' },
              ].map(w => (
                <div key={w.key}>
                  <label className={`text-[10px] uppercase tracking-wider ${w.color}`}>{w.label}</label>
                  <input type="number" min="0" max="10" step="0.5"
                    className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-center focus:outline-none"
                    value={config.scoreWeights[w.key]}
                    onChange={e => setConfig({ ...config, scoreWeights: { ...config.scoreWeights, [w.key]: parseFloat(e.target.value) || 0 } })} />
                </div>
              ))}
            </div>
          </GlassCard>

          {/* AI Model */}
          <GlassCard>
            <h2 className="text-sm font-medium text-gray-300 mb-3">AI 엔진</h2>
            <select className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none" value={config.aiModel} onChange={e => setConfig({ ...config, aiModel: e.target.value })}>
              <option>GLM-5 Turbo</option>
            </select>
            <p className="text-[10px] text-gray-600 mt-1.5">분석 단계에서 사용. 수집은 Playwright 스크래핑.</p>
          </GlassCard>

          {/* Exclude keywords */}
          <GlassCard>
            <h2 className="text-sm font-medium text-gray-300 mb-3">제외 키워드</h2>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {config.excludeKeywords.map(k => (
                <span key={k} className="flex items-center gap-1 px-2.5 py-1 bg-danger/10 text-danger rounded-full text-xs">
                  {k}
                  <button onClick={() => removeExclude(k)} className="hover:text-white"><Trash2 size={10} /></button>
                </span>
              ))}
              {config.excludeKeywords.length === 0 && <span className="text-xs text-gray-700">설정된 제외 키워드 없음</span>}
            </div>
            <div className="flex gap-2">
              <input className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-danger/40" value={excludeKw} onChange={e => setExcludeKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && addExclude()} placeholder="제외할 키워드" />
              <button onClick={addExclude} className="px-3 py-2 bg-danger/15 text-danger rounded-lg hover:bg-danger/25 transition"><Plus size={16} /></button>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <button onClick={resetDefaults} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg text-xs text-gray-400 hover:text-white transition">
          <RotateCcw size={13} /> 기본값 복원
        </button>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-primary">저장됨</span>}
          <button onClick={save} className="flex items-center gap-2 px-6 py-2.5 bg-primary/15 text-primary rounded-lg text-sm hover:bg-primary/25 transition">
            <Save size={14} /> 설정 저장
          </button>
        </div>
      </div>
    </div>
  );
}
