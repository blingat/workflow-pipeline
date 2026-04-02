'use client';
import { useState, useEffect } from 'react';

export default function AgingLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/aging-logs').then(r => r.json()).then(data => {
      setLogs(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-gray-400">불러오는 중...</div>;

  const gqlRate = (detail) => {
    if (!Array.isArray(detail) || detail.length === 0) return '—';
    const ok = detail.filter(d => d.graphql === '200').length;
    return `${ok}/${detail.length}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-white">🔄 에이징 결과 로그</h1>

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
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[#0a0a1a] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-red-400">❤️ {log.likes_count}</div>
                  <div className="text-xs text-gray-400 mt-1">좋아요 (GQL {gqlRate(log.likes_detail)})</div>
                </div>
                <div className="bg-[#0a0a1a] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-400">✅ {log.follows_count}</div>
                  <div className="text-xs text-gray-400 mt-1">팔로우</div>
                </div>
                <div className="bg-[#0a0a1a] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-400">🔄 {log.reposts_count}</div>
                  <div className="text-xs text-gray-400 mt-1">리포스트 (GQL {gqlRate(log.reposts_detail)})</div>
                </div>
                <div className="bg-[#0a0a1a] rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-yellow-400">💬 {log.comments_count}</div>
                  <div className="text-xs text-gray-400 mt-1">댓글 (GQL {gqlRate(log.comments_detail)})</div>
                </div>
              </div>
              {Array.isArray(log.comments_detail) && log.comments_detail.length > 0 && (
                <div className="mt-3 text-xs text-gray-500">
                  💬 {log.comments_detail.map(c => `@${c.author}: "${c.text}"`).join(' · ')}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
