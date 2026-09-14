'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PhoneCall, ShieldCheck, Sun, Moon, Info } from 'lucide-react';

export default function Header() {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add('contrast-125');
    } else {
      document.documentElement.classList.remove('contrast-125');
    }
  }, [highContrast]);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-neutral-200 shadow-sm transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sus-blue to-sus-blue-dark flex items-center justify-center text-white font-black shadow-md shadow-sus-blue/20 group-hover:scale-105 transition-transform">
            <span className="text-xl leading-none">✚</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-black tracking-tight text-neutral-900 group-hover:text-sus-blue transition-colors">
                Previne<span className="text-sus-green">SUS</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-sus-green-light text-sus-green-dark border border-sus-green/30">
                Cidadão
              </span>
            </div>
            <p className="text-[11px] text-neutral-500 font-medium">Triagem Inteligente & Apoio à UBS</p>
          </div>
        </Link>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {/* Contrast Mode */}
          <button
            onClick={() => setHighContrast(!highContrast)}
            aria-label="Alternar alto contraste"
            title="Modo alto contraste"
            className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 transition-colors"
          >
            {highContrast ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Emergency SAMU 192 button */}
          <a
            href="tel:192"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-600/20 active:scale-95 transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5 animate-bounce" />
            <span>SAMU 192</span>
          </a>
        </div>
      </div>
    </header>
  );
}
