'use client';
import { useState, useEffect } from 'react';
import GlassCard from '@/components/GlassCard';
import { CheckCircle, XCircle, AlertTriangle, Play, Square, RefreshCw, Save } from 'lucide-react';

export default function Settings() {
  const [keywords, setKeywords] = useState([]);
  const [newKw, setNewKw] = useState('');
  const [telegramNotif, setTelegramNotif] = useState(true);
  const [collectInterval, setCollectInterval] = useState('2');
  const [analyzeInterval, setAnalyzeInterval] = useState('6');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 에이징 설정
  const [agingConfig, setAgingConfig] = useState(null);
  const [agingStatus, setAgingStatus] = useState('idle'); // idle, running, success, error
  const [agingLog, setAgingLog] = useState([]);
  const [newTarget, setNewTarget] = useState('');
  const [agingSaving, setAgingSaving] = useState(false);

  const loadAgingConfig = () => {
    fetch('/api/aging-config')
      .then(r => r.json())
      .then(data => setAgingConfig(data))
      .catch(() => {});
  };

  const saveAgingConfig = async () => {
    setAgingSaving(true);
    await fetch('/api/aging-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(agingConfig),
    });
    setAgingSaving(false);
  };

  const updateAgingField = (key, value) => {
    setAgingConfig(prev => ({ ...prev, [key]: value }));
  };

  const addTarget = () => {
    if (newTarget.trim() && !agingConfig.targets.includes(newTarget.trim())) {
      updateAgingField('targets', [...agingConfig.targets, newTarget.trim()]);
      setNewTarget('');
      saveAgingConfig();
    }
  };

  const removeTarget = (t) => {
    updateAgingField('targets', agingConfig.targets.filter(x => x !== t));
    setTimeout(saveAgingConfig, 100);
  };

  const loadAgingLog = async () => {
    try {
      const res = await fetch('/api/aging-log');
      const data = await res.json();
      setAgingLog(data.logs || []);
      if (data.running) setAgingStatus('running');
    } catch {}
  };

  useEffect(() => { load(); loadAgingConfig(); loadAgingLog(); }, []);

  const saveKeywords = async () => {
    setSaving(true);
    const body = keywords.map(k => ({ keyword: k, max_posts: 20, enabled: true }));
    await fetch('/api/collector', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setSaving(false);
  };

  const addKeyword = () => {
    if (newKw.trim() && !keywords.includes(newKw.trim())) {
      setKeywords([...keywords, newKw.trim()]);
      setNewKw('');
      saveKeywords();
    }
  };

  const removeKeyword = (k) => {
    setKeywords(keywords.filter(x => x !== k));
    setTimeout(saveKeywords, 100);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <h1 className="text-2xl font-bold">설정</h1>

      {/* Connection Status */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">연결 상태</h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3"><CheckCircle size={18} className="text-primary" /><span className="text-sm">OpenClaw — 연결됨</span></div>
          <div className="flex items-center gap-3"><CheckCircle size={18} className="text-primary" /><span className="text-sm">Neon DB — 연결됨</span></div>
          <div className="flex items-center gap-3"><CheckCircle size={18} className="text-primary" /><span className="text-sm">Playwright + Chromium — 설치됨</span></div>
          <div className="flex items-center gap-3"><CheckCircle size={18} className="text-primary" /><span className="text-sm">AI파카 (ai.pacaa) — VNC 로그인 완료</span></div>
          <div className="flex items-center gap-3"><AlertTriangle size={18} className="text-warning" /><span className="text-sm">본계 (빠코더) — 에이징 후 설정</span></div>
        </div>
      </GlassCard>

      {/* SNS Accounts */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">SNS 계정</h2>
        <div className="space-y-3">
          {[
            { name: '본계 (빠코더)', status: '에이징 대기', color: 'text-warning' },
            { name: '서브1 (AI파카)', status: '에이징 중', color: 'text-primary' },
            { name: '서브2 (업종특화)', status: '미설정', color: 'text-gray-500' },
          ].map(a => (
            <div key={a.name} className="flex items-center justify-between bg-white/5 rounded-lg px-4 py-3">
              <span className="text-sm">{a.name}</span>
              <span className={`text-xs ${a.color}`}>{a.status}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Keywords */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">수집 키워드 <span className="text-gray-600">({keywords.length}개)</span></h2>
        {loading ? (
          <div className="text-gray-500 text-sm">로딩 중...</div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 mb-3">
              {keywords.map(k => (
                <span key={k} className="flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-xs">
                  {k}
                  <button onClick={() => removeKeyword(k)} className="text-danger hover:text-white ml-1">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={newKw} onChange={e => setNewKw(e.target.value)} onKeyDown={e => e.key === 'Enter' && addKeyword()} placeholder="새 키워드 추가" />
              <button onClick={addKeyword} className="px-4 py-2 bg-primary/20 text-primary rounded text-sm" disabled={saving}>
                {saving ? '저장 중...' : '추가'}
              </button>
            </div>
          </>
        )}
      </GlassCard>

      {/* Schedules */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">자동화 주기</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="text-xs text-gray-400">수집 주기 (시간)</label><input type="number" min="1" max="24" className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={collectInterval} onChange={e => setCollectInterval(e.target.value)} /></div>
          <div><label className="text-xs text-gray-400">분석 주기 (시간)</label><input type="number" min="1" max="24" className="w-full mt-1 px-3 py-2 bg-white/5 border border-white/10 rounded text-sm" value={analyzeInterval} onChange={e => setAnalyzeInterval(e.target.value)} /></div>
        </div>
        <p className="text-xs text-gray-600 mt-2">* 주기 변경은 OpenClaw cron 등록으로 적용됩니다</p>
      </GlassCard>

      {/* Aging Config */}
      {agingConfig && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm text-gray-400">🦙 에이징 설정</h2>
            <div className="flex items-center gap-2">
              <span className={`text-xs px-2 py-0.5 rounded ${agingStatus === 'running' ? 'bg-primary/20 text-primary' : 'bg-gray-700 text-gray-400'}`}>
                {agingStatus === 'running' ? '● 실행 중' : '○ 대기'}
              </span>
              <button onClick={loadAgingLog} className="text-gray-400 hover:text-white"><RefreshCw size={14} /></button>
            </div>
          </div>

          {/* 일일 목표 */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
            {[
              { label: '좋아요', key: 'max_likes', emoji: '❤️' },
              { label: '팔로우', key: 'max_follows', emoji: '✅' },
              { label: '리포스트', key: 'max_reposts', emoji: '🔄' },
              { label: '댓글', key: 'max_comments', emoji: '💬' },
              { label: '최대시간(분)', key: 'max_duration', emoji: '⏰' },
            ].map(f => (
              <div key={f.key} className="bg-white/5 rounded-lg px-3 py-2">
                <label className="text-xs text-gray-500">{f.emoji} {f.label}</label>
                <input
                  type="number" min="0"
                  className="w-full mt-1 bg-transparent text-lg font-bold text-white outline-none"
                  value={agingConfig[f.key]}
                  onChange={e => { updateAgingField(f.key, parseInt(e.target.value) || 0); setTimeout(saveAgingConfig, 300); }}
                />
              </div>
            ))}
          </div>

          {/* 타겟 계정 */}
          <div className="mb-4">
            <h3 className="text-xs text-gray-500 mb-2">타겟 계정 ({agingConfig.targets.length}개)</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {agingConfig.targets.map(t => (
                <span key={t} className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-full text-xs">
                  {t}
                  <button onClick={() => removeTarget(t)} className="text-danger hover:text-white ml-1 text-[10px]">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs"
                value={newTarget} onChange={e => setNewTarget(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTarget()}
                placeholder="@계정명 추가"
              />
              <button onClick={addTarget} className="px-3 py-1.5 bg-white/10 rounded text-xs">추가</button>
            </div>
          </div>

          {/* 스케줄 */}
          <div className="mb-4">
            <h3 className="text-xs text-gray-500 mb-2">자동 실행 스케줄</h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => { updateAgingField('schedule_enabled', !agingConfig.schedule_enabled); setTimeout(saveAgingConfig, 100); }}
                className={`w-10 h-5 rounded-full transition ${agingConfig.schedule_enabled ? 'bg-primary' : 'bg-gray-600'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform ${agingConfig.schedule_enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
              <input
                className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs"
                value={agingConfig.schedule_hours}
                onChange={e => { updateAgingField('schedule_hours', e.target.value); setTimeout(saveAgingConfig, 300); }}
                placeholder="09,15,21 (시간, 쉼표 구분)"
                disabled={!agingConfig.schedule_enabled}
              />
            </div>
          </div>

          {/* 최근 로그 */}
          {agingLog.length > 0 && (
            <div className="mb-4">
              <h3 className="text-xs text-gray-500 mb-2">최근 결과</h3>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {agingLog.slice(0, 5).map((log, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-white/5 rounded px-3 py-1.5">
                    <span className="text-gray-400">{log.ts}</span>
                    <span className="flex gap-3">
                      <span>❤️{log.likes}</span>
                      <span>✅{log.follows}</span>
                      <span>🔄{log.reposts}</span>
                      <span>💬{log.comments}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 저장 상태 */}
          {agingSaving && <p className="text-xs text-gray-500">저장 중...</p>}
        </GlassCard>
      )}

      {/* Telegram */}
      <GlassCard>
        <h2 className="text-sm text-gray-400 mb-4">텔레그램 알림</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm">알림 활성화</span>
            <button onClick={() => setTelegramNotif(!telegramNotif)} className={`w-12 h-6 rounded-full transition ${telegramNotif ? 'bg-primary' : 'bg-gray-600'}`}>
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${telegramNotif ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>🌞 낮 리포트: 매일 12:00 KST</div>
            <div>🌙 밤 리포트: 매일 23:00 KST</div>
            <div>💓 서버 체크: 30분 간격 (08:00~23:30)</div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
