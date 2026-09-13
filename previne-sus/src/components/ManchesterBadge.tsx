import React from 'react';
import { MANCHESTER_LEVELS, ManchesterColor } from '@/lib/manchester';
import { AlertTriangle, Clock, ShieldAlert, CheckCircle2, Info } from 'lucide-react';

interface Props {
  color: ManchesterColor;
  size?: 'sm' | 'md' | 'lg';
  showWaitTime?: boolean;
}

const COLOR_STYLES: Record<ManchesterColor, { bg: string; border: string; text: string; hex: string }> = {
  red: { bg: 'bg-red-600', border: 'border-red-700', text: 'text-white', hex: '#DC2626' },
  orange: { bg: 'bg-amber-600', border: 'border-amber-700', text: 'text-white', hex: '#EA580C' },
  yellow: { bg: 'bg-yellow-400', border: 'border-yellow-500', text: 'text-neutral-950 font-black', hex: '#EAB308' },
  green: { bg: 'bg-emerald-600', border: 'border-emerald-700', text: 'text-white font-black', hex: '#16A34A' },
  blue: { bg: 'bg-blue-600', border: 'border-blue-700', text: 'text-white', hex: '#2563EB' },
};

export default function ManchesterBadge({ color, size = 'md', showWaitTime = true }: Props) {
  const safeColor = (color && COLOR_STYLES[color]) ? color : 'green';
  const level = MANCHESTER_LEVELS[safeColor] || MANCHESTER_LEVELS.green;
  const style = COLOR_STYLES[safeColor];

  const getIcon = () => {
    switch (safeColor) {
      case 'red':
        return <ShieldAlert className={size === 'lg' ? 'w-6 h-6 animate-pulse' : 'w-4 h-4'} />;
      case 'orange':
        return <AlertTriangle className={size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'} />;
      case 'yellow':
        return <AlertTriangle className={size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'} />;
      case 'green':
        return <CheckCircle2 className={size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'} />;
      case 'blue':
        return <Info className={size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'} />;
    }
  };

  if (size === 'lg') {
    const isYellow = safeColor === 'yellow';
    return (
      <div 
        className={`p-5 rounded-2xl border-2 ${style.border} ${style.bg} ${style.text} shadow-xl`}
        style={{ backgroundColor: style.hex, color: isYellow ? '#0a0a0a' : '#ffffff' }}
      >
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isYellow ? 'bg-black/15 text-neutral-950' : 'bg-white/20 text-white'} backdrop-blur-sm`}>
              {getIcon()}
            </div>
            <div>
              <span className={`text-[11px] font-extrabold tracking-wider uppercase block ${isYellow ? 'text-neutral-800' : 'text-white/90'}`}>
                Classificação Oficial de Manchester
              </span>
              <h3 className={`text-2xl font-black tracking-tight ${isYellow ? 'text-neutral-950' : 'text-white'}`}>
                {level.label}
              </h3>
            </div>
          </div>

          {showWaitTime && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black shadow-sm ${
              isYellow ? 'bg-neutral-900 text-yellow-300' : 'bg-black/30 text-white'
            }`}>
              <Clock className="w-4 h-4" />
              <span>{level.waitTime}</span>
            </div>
          )}
        </div>
        <p className={`text-sm leading-relaxed font-bold mt-2 pt-2 border-t ${
          isYellow ? 'border-neutral-900/20 text-neutral-900' : 'border-white/25 text-white'
        }`}>
          {level.sublabel}
        </p>
      </div>
    );
  }

  // Small / inline badge
  const isYellow = safeColor === 'yellow';
  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black shadow-sm ${style.bg} ${style.text}`}
      style={{ backgroundColor: style.hex, color: isYellow ? '#0a0a0a' : '#ffffff' }}
    >
      {getIcon()}
      <span>{level.label.split(' - ')[0]}</span>
      {showWaitTime && (
        <span className={`font-semibold opacity-90 ${isYellow ? 'text-neutral-900' : 'text-white'}`}>
          ({level.waitTime.split(' (')[1]?.replace(')', '') || level.waitTime})
        </span>
      )}
    </div>
  );
}
