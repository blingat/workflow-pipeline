'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, UserCircle, FileText, ListOrdered, TrendingUp, BarChart3, Settings } from 'lucide-react';

const nav = [
  { href: '/dashboard', label: '대시보드', icon: LayoutDashboard },
  { href: '/accounts', label: '계정 관리', icon: Users },
  { href: '/personas', label: '페르소나', icon: UserCircle },
  { href: '/content-pool', label: '콘텐츠 풀', icon: FileText },
  { href: '/queue', label: '발행 대기열', icon: ListOrdered },
  { href: '/trends', label: '트렌드 캐치', icon: TrendingUp },
  { href: '/analytics', label: '성과 분석', icon: BarChart3 },
  { href: '/settings', label: '설정', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-[rgba(255,255,255,0.03)] border-r border-[rgba(255,255,255,0.08)] flex flex-col py-6 px-3 z-50">
      <div className="text-primary font-bold text-lg mb-8 px-3">🧵 Threads Pipeline</div>
      <nav className="flex-1 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href}
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
  );
}
