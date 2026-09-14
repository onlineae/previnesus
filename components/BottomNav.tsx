'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Camera, FileText, Activity, HeartPulse, History } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { label: 'Início', href: '/', icon: Home },
    { label: 'Foto', href: '/triage/photo', icon: Camera },
    { label: 'Receitas', href: '/triage/translator', icon: FileText },
    { label: 'Sintomas', href: '/triage/symptoms', icon: Activity },
    { label: 'Crônicos', href: '/triage/chronic', icon: HeartPulse },
    { label: 'Histórico', href: '/history', icon: History },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-neutral-200 py-1 px-2 shadow-lg safe-area-bottom">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
                isActive
                  ? 'text-sus-blue font-bold scale-105'
                  : 'text-neutral-500 hover:text-neutral-900 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg ${isActive ? 'bg-sus-blue-light text-sus-blue' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
