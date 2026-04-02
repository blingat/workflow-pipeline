'use client';
import { useState, useEffect } from 'react';
import GlassCard from '@/components/GlassCard';
import { Heart, Repeat2, MessageCircle, Star, Zap, Lightbulb, ArrowLeftRight, TrendingUp } from 'lucide-react';

const typeLabel = { traffic: '트래픽', insight: '인사이트', counter: '역발상', trend: '트렌드' };
const typeIcon = { traffic: Zap, insight: Lightbulb, counter: ArrowLeftRight, trend: TrendingUp };
const filters = ['all', 'traffic', 'insight', 'counter', 'trend'];

export default function ContentPool() {
  const [posts, setPosts] = useState([]);
  const [analyses, setAnalyses] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/posts').then(r => r.json()),
      fetch('/api/analysis').then(r => r.json()),
    ]).then(([p, a]) => {
      setPosts(Array.isArray(p) ? p : []);
      setAnalyses(Array.isArray(a) ? a : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const merged = posts.map(p => {
    const analysis = analyses.find(a => a.post_id === p.post_id);
    return {
      ...p,
      type: analysis?.content_type || 'traffic',
      hook: analysis?.hooking_pattern || '',
      counter: analysis?.counter_angle || '',
      score: (p.engagement_score || 0).toFixed(1),
    };
  });

  const filtered = filter === 'all' ? merged : merged.filter(p => p.type === filter);

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">콘텐츠 풀</h1>

      <div className="flex gap-2">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-lg text-sm ${filter === f ? 'bg-primary/20 text-primary' : 'bg-white/5 text-gray-400 hover:text-white'}`}>
            {f === 'all' ? '전체' : typeLabel[f]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? (
          <GlassCard className="text-center text-gray-500 py-8">로딩 중...</GlassCard>
        ) : filtered.length === 0 ? (
          <GlassCard className="text-center text-gray-500 py-8">
            <p>수집된 글이 없습니다</p>
            <p className="text-xs mt-2">collector.js를 실행하여 글을 수집하세요</p>
          </GlassCard>
        ) : filtered.map(p => {
          const TypeIcon = typeIcon[p.type] || Zap;
          return (
            <GlassCard key={p.post_id} className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-gray-500">@{p.author}</span>
                  <span className="text-xs px-2 py-0.5 bg-white/10 rounded flex items-center gap-1"><TypeIcon size={10} /> {typeLabel[p.type]}</span>
                  <span className="text-xs text-primary flex items-center gap-1"><Star size={10} /> {p.score}</span>
                </div>
                <p className="text-sm mb-2">{(p.content || '').substring(0, 300)}</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><Heart size={12} /> {p.likes || 0}</span>
                  <span className="flex items-center gap-1"><Repeat2 size={12} /> {p.reposts || 0}</span>
                  <span className="flex items-center gap-1"><MessageCircle size={12} /> {p.replies || 0}</span>
                </div>
                {p.hook && <div className="mt-2 text-xs bg-secondary/10 text-secondary rounded px-2 py-1">후킹: {p.hook}</div>}
                {p.counter && <div className="mt-1 text-xs bg-warning/10 text-warning rounded px-2 py-1">역발상: {p.counter}</div>}
              </div>
              <div className="shrink-0 ml-4 text-right">
                <div className="text-[10px] text-gray-600">{p.collected_at ? new Date(p.collected_at).toLocaleString('ko-KR') : '-'}</div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
