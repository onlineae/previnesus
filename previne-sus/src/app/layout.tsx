import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'PrevineSUS - Triagem Médica e Saúde Cidadã',
  description: 'Plataforma de pré-triagem guiada por visão computacional, tradutor de receitas e acompanhamento de saúde do SUS.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PrevineSUS',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#005DAA',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col antialiased bg-slate-50 text-neutral-900 pb-20">
        <Header />
        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
          {children}
        </main>
        <BottomNav />
      </body>
    </html>
  );
}
