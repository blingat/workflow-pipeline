'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, UserCircle, FileText, ListOrdered, TrendingUp, BarChart3, Settings, Radio, Menu, X, Activity, ScrollText } from 'lucide-react';
import { useState } from 'react';

const nav = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts', label: '계정 관리', icon: Users },
  { href: '/personas', label: '페르소나', icon: UserCircle },
  { href: '/collector', label: '수집 설정', icon: Radio },
  { href: '/content-pool', label: '콘텐츠 풀', icon: FileText },
  { href: '/queue', label: '발행 대기열', icon: ListOrdered },
  { href: '/trends', label: '트렌드 캐치', icon: TrendingUp },
  { href: '/analytics', label: '성과 분석', icon: BarChart3 },
  { href: '/aging-log', label: '에이징 로그', icon: Activity },
  { href: '/pipeline-log', label: '파이프라인 로그', icon: ScrollText },
  { href: '/settings', label: '설정', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* 모바일 햄버거 */}
      <button onClick={() => setOpen(true)} className="fixed top-4 left-4 z-[60] md:hidden p-2 bg-[rgba(255,255,255,0.08)] rounded-lg backdrop-blur-md border border-white/10">
        <Menu size={20} className="text-gray-300" />
      </button>

      {/* 오버레이 */}
      {open && <div className="fixed inset-0 bg-black/50 z-[55] md:hidden" onClick={() => setOpen(false)} />}

      {/* 사이드바 */}
      <aside className={`fixed left-0 top-0 h-screen w-60 bg-[rgba(15,15,30,0.95)] backdrop-blur-xl border-r border-[rgba(255,255,255,0.08)] flex flex-col py-6 px-3 z-[60] transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <div className="flex items-center justify-between px-3 mb-8">
          <div className="text-primary font-bold text-lg tracking-tight">Workflow Pipeline</div>
          <button onClick={() => setOpen(false)} className="md:hidden p-1 hover:bg-white/10 rounded"><X size={18} className="text-gray-400" /></button>
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link key={href} href={href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                  active ? 'bg-primary/10 text-primary' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}>
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="text-[10px] text-gray-600 px-3 mt-4">v1.0.0 · GLM-5 Powered</div>
      </aside>
    </>
  );
}
