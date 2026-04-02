'use client';
import { useState, useEffect } from 'react';
import GlassCard from '@/components/GlassCard';
import { Timer, CheckCircle2, Send, Flame, XCircle, Eye, X, Heart, MessageCircle, Repeat2, Share, Verified } from 'lucide-react';

const statusConfig = {
  pending: { label: '대기', color: 'bg-warning/20 text-warning', Icon: Timer },
  approved: { label: '승인됨', color: 'bg-secondary/20 text-secondary', Icon: CheckCircle2 },
  published: { label: '발행됨', color: 'bg-primary/20 text-primary', Icon: Send },
  viral: { label: '터짐', color: 'bg-danger/20 text-danger', Icon: Flame },
  failed: { label: '실패', color: 'bg-gray-500/20 text-gray-500', Icon: XCircle },
};
const accountLabel = { main: '본계', sub1: 'AI파카', sub2: '업종특화' };

function ThreadsPreview({ item, onClose }) {
  const [cardUrl, setCardUrl] = useState(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const timeAgo = item.published_at ? formatTimeAgo(new Date(item.published_at)) : '방금';
  const content = item.content || '';

  const generateCard = async () => {
    setLoadingCard(true);
    try {
      // media_url 파싱 — JSON 배열 또는 쉼표 구분 URL
      let mediaUrls = [];
      if (item.media_url) {
        try {
          const parsed = JSON.parse(item.media_url);
          if (Array.isArray(parsed)) mediaUrls = parsed.filter(u => u && u.startsWith('http'));
        } catch {
          mediaUrls = item.media_url.split(',').map(f => f.trim()).filter(u => u && u.startsWith('http'));
        }
      }

      if (mediaUrls.length > 0) {
        setCardUrl(mediaUrls);
        setLoadingCard(false);
        return;
      }

      // video_url 체크
      if (item.video_url) {
        setCardUrl([item.video_url]);
        setLoadingCard(false);
        return;
      }

      // fallback: 동적 카드 생성
      const title = content.split('\n')[0] || 'AI 뉴스';
      const body = content.split('\n').slice(1).join(' ').replace(/출처:.*/, '').trim().substring(0, 90);
      const source = (content.match(/출처:\s*(.+)/) || [])[1] || '';
      const res = await fetch(`/api/card?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&source=${encodeURIComponent(source)}&type=news`);
      if (res.ok) { const blob = await res.blob(); setCardUrl(URL.createObjectURL(blob)); }
    } catch {}
    setLoadingCard(false);
  };

  useEffect(() => { generateCard(); }, []);

  const likes = Math.floor(Math.random() * 50) + 5;
  const replies = Math.floor(Math.random() * 10);
  const reposts = Math.floor(Math.random() * 8);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#000] rounded-xl w-full max-w-[420px] max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="sticky top-0 bg-[#000]/95 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <img src="/avatar_aipaca.jpg" alt="" className="w-8 h-8 rounded-full object-cover bg-gray-700" onError={e => { e.target.style.display = 'none'; }} />
            <div>
              <div className="flex items-center gap-1"><span className="text-[15px] font-semibold text-white">ai.pacaa</span><Verified size={14} className="text-blue-400 fill-blue-400" /></div>
              <div className="text-[11px] text-gray-500">{timeAgo} · Threads</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full"><X size={20} className="text-gray-400" /></button>
        </div>
        {/* 프로필 + 본문 */}
        <div className="px-4 pt-3 pb-4">
          <div className="flex items-center gap-3 mb-3">
            <img src="/avatar_aipaca.jpg" alt="" className="w-9 h-9 rounded-full object-cover bg-gray-700" onError={e => { e.target.style.display = 'none'; }} />
            <div className="flex items-center gap-1.5"><span className="text-[15px] font-bold text-white">ai.pacaa</span><Verified size={13} className="text-blue-400 fill-blue-400" /></div>
          </div>
          <div className="text-[15px] text-white leading-[1.625] whitespace-pre-wrap break-words mb-3">{content}</div>
          {loadingCard && <div className="w-full aspect-square bg-white/5 rounded-xl flex items-center justify-center mb-3"><div className="text-gray-500 text-sm animate-pulse">미디어 로딩 중...</div></div>}
          {cardUrl && !loadingCard && (
            <div className="mb-3 rounded-xl overflow-hidden border border-white/10">
              {Array.isArray(cardUrl) ? (
                cardUrl.length === 1 ? (
                  /\.(mp4|webm|mov)/i.test(cardUrl[0]) ? (
                    <video src={cardUrl[0]} controls className="w-full aspect-video object-cover" />
                  ) : (
                    <img src={cardUrl[0]} alt="미디어" className="w-full aspect-square object-cover" />
                  )
                ) : (
                  <div className="grid grid-cols-2 gap-0.5">
                    {cardUrl.slice(0, 4).map((url, i) => (
                      /\.(mp4|webm|mov)/i.test(url) ? (
                        <video key={i} src={url} controls className="w-full aspect-square object-cover" />
                      ) : (
                        <img key={i} src={url} alt={`미디어 ${i+1}`} className="w-full aspect-square object-cover" onError={e => e.target.style.display='none'} />
                      )
                    ))}
                  </div>
                )
              ) : (
                <img src={cardUrl} alt="카드" className="w-full aspect-square object-cover" />
              )}
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5 -mx-1">
            <button className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/5 rounded-full"><Heart size={18} className="text-gray-400" /><span className="text-[13px] text-gray-400">{likes}</span></button>
            <button className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/5 rounded-full"><MessageCircle size={18} className="text-gray-400" /><span className="text-[13px] text-gray-400">{replies}</span></button>
            <button className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/5 rounded-full"><Repeat2 size={18} className="text-gray-400" /><span className="text-[13px] text-gray-400">{reposts}</span></button>
            <button className="flex items-center gap-1.5 px-3 py-2 hover:bg-white/5 rounded-full"><Share size={18} className="text-gray-400" /></button>
          </div>
        </div>
        <div className="h-1 bg-white/5" />
        {/* 댓글 */}
        {(item.comment_text || item.comment_2) && (
          <div className="px-4 py-3 border-t border-white/5 space-y-3">
            {item.comment_text && (
              <div className="flex items-start gap-3">
                <img src="/avatar_aipaca.jpg" alt="" className="w-7 h-7 rounded-full object-cover bg-gray-700 mt-0.5 shrink-0" onError={e => { e.target.style.display = 'none'; }} />
                <div><span className="text-[13px] font-semibold text-white mr-2">ai.pacaa</span><span className="text-[13px] text-gray-300">{item.comment_text}</span></div>
              </div>
            )}
            {item.comment_2 && (
              <div className="flex items-start gap-3">
                <img src="/avatar_aipaca.jpg" alt="" className="w-7 h-7 rounded-full object-cover bg-gray-700 mt-0.5 shrink-0" onError={e => { e.target.style.display = 'none'; }} />
                <div><span className="text-[13px] font-semibold text-white mr-2">ai.pacaa</span><span className="text-[13px] text-gray-300">{item.comment_2}</span></div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTimeAgo(date) {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return '방금'; if (diff < 3600) return `${Math.floor(diff / 60)}분`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간`; return `${Math.floor(diff / 86400)}일`;
}

export default function Queue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewItem, setPreviewItem] = useState(null);

  const load = () => {
    fetch('/api/queue').then(r => r.json()).then(d => { setItems(Array.isArray(d) ? d : []); setLoading(false); }).catch(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleStatus = async (id, status) => {
    await fetch('/api/queue', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status, published_at: status === 'published' ? new Date().toISOString() : null }) });
    load();
  };
  const handleDelete = async (id) => { await fetch(`/api/queue?id=${id}`, { method: 'DELETE' }); load(); };

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-xl md:text-2xl font-bold">발행 대기열</h1>

      {loading ? (
        <div className="text-center text-gray-500 py-12">로딩 중...</div>
      ) : items.length === 0 ? (
        <div className="text-center text-gray-500 py-12">대기열이 비어있습니다</div>
      ) : (
        <>
          {/* 모바일 카드 뷰 */}
          <div className="md:hidden space-y-3">
            {items.map(q => {
              const sc = statusConfig[q.status] || statusConfig.pending;
              return (
                <GlassCard key={q.id} className="!p-4 space-y-3" onClick={() => setPreviewItem(q)}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">#{q.id}</span>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${sc.color}`}><sc.Icon size={10} />{sc.label}</span>
                  </div>
                  <p className="text-sm leading-relaxed">{q.content}</p>
                  {q.comment_text && <div className="text-xs text-gray-400 bg-white/5 rounded-lg p-2.5"><span className="text-gray-500">💬 댓글1:</span> {q.comment_text}</div>}
                  {q.comment_2 && <div className="text-xs text-gray-400 bg-white/5 rounded-lg p-2.5"><span className="text-gray-500">💬 댓글2:</span> {q.comment_2}</div>}
                  <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                    <button onClick={() => setPreviewItem(q)} className="flex-1 py-2 bg-white/10 rounded-lg text-xs hover:bg-white/20">👁 프리뷰</button>
                    {q.status === 'pending' && <button onClick={() => handleStatus(q.id, 'approved')} className="flex-1 py-2 bg-secondary/20 text-secondary rounded-lg text-xs">승인</button>}
                    {q.status === 'approved' && <button onClick={() => handleStatus(q.id, 'published')} className="flex-1 py-2 bg-primary/20 text-primary rounded-lg text-xs">발행</button>}
                    <button onClick={() => handleDelete(q.id)} className="py-2 px-3 bg-danger/20 text-danger rounded-lg text-xs">✕</button>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          {/* 데스크톱 테이블 */}
          <GlassCard className="!p-0 overflow-hidden hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10 text-gray-500 text-xs">
                  <th className="text-left p-4">#</th><th className="text-left p-4">계정</th><th className="text-left p-4">미리보기</th><th className="text-left p-4">댓글1</th><th className="text-left p-4">댓글2</th><th className="text-left p-4">상태</th><th className="text-left p-4">시각</th><th className="text-left p-4">액션</th>
                </tr></thead>
                <tbody>
                  {items.map(q => {
                    const sc = statusConfig[q.status] || statusConfig.pending;
                    return (
                      <tr key={q.id} className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer" onClick={() => setPreviewItem(q)}>
                        <td className="p-4 text-gray-500">{q.id}</td>
                        <td className="p-4">{accountLabel[q.account] || q.account || '-'}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            {q.media_url ? (() => {
                              try {
                                const urls = JSON.parse(q.media_url);
                                return Array.isArray(urls) && urls[0] ? <img src={urls[0]} alt="" className="w-10 h-10 rounded object-cover shrink-0" onError={e => e.target.style.display='none'} /> : null;
                              } catch { return null; }
                            })() : null}
                            <span className="max-w-[200px] truncate">{(q.content || '').substring(0, 60)}</span>
                          </div>
                        </td>
                        <td className="p-4 max-w-[150px] truncate text-xs text-gray-400">{(q.comment_text || '').substring(0, 40)}</td>
                        <td className="p-4 max-w-[150px] truncate text-xs text-gray-400">{(q.comment_2 || '').substring(0, 40)}</td>
                        <td className="p-4"><span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${sc.color}`}><sc.Icon size={10} />{sc.label}</span></td>
                        <td className="p-4 text-gray-400 text-xs">{q.published_at ? new Date(q.published_at).toLocaleString('ko-KR') : q.scheduled_at ? new Date(q.scheduled_at).toLocaleString('ko-KR') : '-'}</td>
                        <td className="p-4">
                          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                            <button onClick={() => setPreviewItem(q)} className="px-2 py-1 bg-white/5 rounded text-xs hover:bg-white/10 text-gray-300" title="프리뷰"><Eye size={14} /></button>
                            {q.status === 'pending' && <button onClick={() => handleStatus(q.id, 'approved')} className="px-2 py-1 bg-secondary/20 text-secondary rounded text-xs hover:bg-secondary/30">승인</button>}
                            {q.status === 'approved' && <button onClick={() => handleStatus(q.id, 'published')} className="px-2 py-1 bg-primary/20 text-primary rounded text-xs hover:bg-primary/30">발행</button>}
                            <button onClick={() => handleDelete(q.id)} className="px-2 py-1 bg-white/5 rounded text-xs hover:bg-white/10 text-danger">✕</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}

      {previewItem && <ThreadsPreview item={previewItem} onClose={() => setPreviewItem(null)} />}
    </div>
  );
}
