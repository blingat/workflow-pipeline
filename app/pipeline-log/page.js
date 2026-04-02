'use client';
import { useState, useEffect } from 'react';

export default function PipelineLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/pipeline-logs').then(r => r.json()).then(data => {
      setLogs(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-gray-400">불러오는 중...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-white">📊 파이프라인 결과 로그</h1>

      {logs.length === 0 ? (
        <div className="text-gray-400 text-center py-12">아직 실행 기록이 없습니다</div>
      ) : (
        <div className="space-y-4">
          {logs.map(log => (
            <div key={log.id} className="bg-[#111128] rounded-xl p-5 border border-gray-800">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                <div className="text-sm text-gray-400">
                  {new Date(log.started_at).toLocaleString('ko-KR')} · {log.duration_sec}초
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${log.status === 'completed' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                  {log.status}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="bg-[#0a0a1a] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-purple-400">📡 {log.collected}</div>
                  <div className="text-xs text-gray-400 mt-1">수집</div>
                </div>
                <div className="bg-[#0a0a1a] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">🪝 {log.hooked}</div>
                  <div className="text-xs text-gray-400 mt-1">후킹 성공</div>
                </div>
                <div className="bg-[#0a0a1a] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">✅ {log.evaluated}</div>
                  <div className="text-xs text-gray-400 mt-1">검증 통과</div>
                </div>
                <div className="bg-[#0a0a1a] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">❌ {log.failed}</div>
                  <div className="text-xs text-gray-400 mt-1">실패</div>
                </div>
                <div className="bg-[#0a0a1a] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">📦 {log.queued}</div>
                  <div className="text-xs text-gray-400 mt-1">큐 등록</div>
                </div>
              </div>
              {log.collected > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  성공률: {Math.round((log.queued / log.collected) * 100)}% ({log.queued}/{log.collected})
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
