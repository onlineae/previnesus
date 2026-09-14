'use client';

import React, { useState } from 'react';
import { Pill, Clock, CheckCircle, AlertTriangle, HelpCircle, Sun, Moon, Sunset, Coffee } from 'lucide-react';

interface Props {
  medications: any[];
  dailySchedule: any[];
  importantAlerts?: string[];
}

export default function MedicationGrid({ medications, dailySchedule, importantAlerts = [] }: Props) {
  const [checkedSlots, setCheckedSlots] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string) => {
    setCheckedSlots(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getPeriodIcon = (period: string) => {
    const p = period.toLowerCase();
    if (p.includes('manhã') || p.includes('manha')) return <Coffee className="w-4 h-4 text-amber-500" />;
    if (p.includes('tarde') || p.includes('almoço') || p.includes('almoco')) return <Sun className="w-4 h-4 text-orange-500" />;
    if (p.includes('noite')) return <Sunset className="w-4 h-4 text-indigo-500" />;
    return <Moon className="w-4 h-4 text-blue-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Daily Schedule Slots */}
      <div>
        <h4 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sus-blue" />
          Quadro Diário de Horários (Tome no Horário Certo)
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {dailySchedule?.map((slot, index) => {
            const slotId = `${slot.time}-${index}`;
            const isChecked = checkedSlots[slotId];

            return (
              <div
                key={slotId}
                onClick={() => toggleCheck(slotId)}
                className={`cursor-pointer p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                  isChecked
                    ? 'bg-sus-green-light border-sus-green/40 opacity-75'
                    : 'bg-white border-neutral-200 hover:border-sus-blue/40 shadow-sm'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-neutral-100 flex items-center justify-center">
                    {getPeriodIcon(slot.period)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-neutral-900">{slot.time}</span>
                      <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                        {slot.period}
                      </span>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {slot.items?.map((item: string, i: number) => (
                        <li
                          key={i}
                          className={`text-xs font-medium ${
                            isChecked ? 'line-through text-neutral-500' : 'text-neutral-800'
                          }`}
                        >
                          • {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    isChecked
                      ? 'bg-sus-green border-sus-green text-white'
                      : 'border-neutral-300 text-transparent'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 fill-current" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detailed Medicine Cards */}
      <div>
        <h4 className="text-sm font-bold text-neutral-900 mb-3 flex items-center gap-2">
          <Pill className="w-4 h-4 text-sus-green" />
          Para Que Serve Cada Remédio Prescrito
        </h4>

        <div className="space-y-3">
          {medications?.map((med, index) => (
            <div key={index} className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h5 className="font-bold text-base text-neutral-900 flex items-center gap-2">
                    {med.name}
                  </h5>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-sus-blue-light text-sus-blue font-bold">
                      {med.dosage}
                    </span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700 font-semibold">
                      {med.frequency}
                    </span>
                    {med.duration && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                        {med.duration}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Layman Explanation */}
              <div className="mt-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100 text-xs text-neutral-700 leading-relaxed">
                <div className="flex items-center gap-1.5 font-bold text-sus-green-dark mb-1">
                  <HelpCircle className="w-3.5 h-3.5 text-sus-green" />
                  O que ele faz no seu organismo:
                </div>
                <p>{med.purposeLayman}</p>
              </div>

              {/* Usage tips */}
              {med.tips && (
                <div className="mt-2 text-[11px] text-neutral-500 font-medium flex items-center gap-1.5">
                  <AlertTriangle className="w-3 h-3 text-amber-500 flex-shrink-0" />
                  <span>{med.tips}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Important Alerts */}
      {importantAlerts && importantAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1.5">
          <div className="font-bold flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Orientações Importantes da Farmácia do SUS:
          </div>
          <ul className="list-disc pl-5 space-y-1 text-amber-800 font-medium">
            {importantAlerts.map((alert, i) => (
              <li key={i}>{alert}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
