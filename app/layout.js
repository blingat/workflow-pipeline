import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = { title: 'Workflow Pipeline', description: '워크플로우 자동화 시스템' };

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-[#0a0a1a]">
        <Sidebar />
        <main className="md:ml-60 min-h-screen pt-16 md:pt-6 px-4 md:px-8 pb-8">
          {children}
        </main>
      </body>
    </html>
  );
}
