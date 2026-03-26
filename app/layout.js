import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = { title: 'Workflow Pipeline', description: '워크플로우 자동화 시스템' };

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <Sidebar />
        <main className="ml-60 min-h-screen p-8">{children}</main>
      </body>
    </html>
  );
}
