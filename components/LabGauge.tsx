'use client';

import React from 'react';
import { AlertCircle, CheckCircle, AlertTriangle, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

export interface ExamItem {
  name: string;
  value: string;
  referenceRange: string;
  status: 'normal' | 'low' | 'high' | 'critical';
  laymanExplanation: string;
  needAttention: boolean;
}

interface Props {
  items: ExamItem[];
  urgencyToReturn: 'normal' | 'attention' | 'urgent';
  urgencyRecommendation: string;
  generalSummary: string;
}

export default function LabGauge({ items, urgencyToReturn, urgencyRecommendation, generalSummary }: Props) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-xs font-bold border border-red-300">
            <AlertCircle className="w-3 h-3 text-red-600" /> Crítico
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
            <ArrowUpRight className="w-3 h-3 text-amber-600" /> Elevado
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold border border-blue-300">
            <ArrowDownRight className="w-3 h-3 text-blue-600" /> Abaixo
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> Normal
          </span>
        );
    }
  };

  const getUrgencyBanner = () => {
    if (urgencyToReturn === 'urgent') {
      return (
        <div className="p-4 rounded-2xl bg-red-600 text-white shadow-md">
          <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wide">
            <AlertCircle className="w-4 h-4" /> Retorno com Urgência Indicado
          </div>
          <p className="mt-1 text-xs text-white/90 font-medium leading-relaxed">
            {urgencyRecommendation}
          </p>
        </div>
      );
    }
    if (urgencyToReturn === 'attention') {
      return (
        <div className="p-4 rounded-2xl bg-amber-500 text-white shadow-md">
          <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wide">
            <AlertTriangle className="w-4 h-4" /> Levar ao Posto de Saúde nos Próximos Dias
          </div>
          <p className="mt-1 text-xs text-white/90 font-medium leading-relaxed">
            {urgencyRecommendation}
          </p>
        </div>
      );
    }
    return (
      <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-md">
        <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wide">
          <CheckCircle className="w-4 h-4" /> Valores Dentro do Esperado / Retorno de Rotina
        </div>
        <p className="mt-1 text-xs text-white/90 font-medium leading-relaxed">
          {urgencyRecommendation}
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Return urgency banner */}
      {getUrgencyBanner()}

      {/* General Summary */}
      {generalSummary && (
        <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm text-xs text-neutral-700 leading-relaxed">
          <strong className="text-neutral-900 font-bold block mb-1">Resumo Clínico para o Paciente:</strong>
          {generalSummary}
        </div>
      )}

      {/* Lab Items list with visual gauges */}
      <div className="space-y-3">
        {items?.map((item, index) => (
          <div key={index} className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <h5 className="font-bold text-sm text-neutral-900">{item.name}</h5>
                <span className="text-xs text-neutral-500">
                  Referência do SUS: <strong>{item.referenceRange}</strong>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-base font-black text-neutral-900">{item.value}</span>
                {getStatusBadge(item.status)}
              </div>
            </div>

            {/* Gauge bar */}
            <div className="mt-3 w-full bg-neutral-100 rounded-full h-2 overflow-hidden flex">
              <div
                className={`h-full transition-all rounded-full ${
                  item.status === 'normal'
                    ? 'w-full bg-emerald-500'
                    : item.status === 'high'
                    ? 'w-4/5 bg-amber-500'
                    : item.status === 'critical'
                    ? 'w-full bg-red-600 animate-pulse'
                    : 'w-1/4 bg-blue-500'
                }`}
              />
            </div>

            {/* Layman translation */}
            <div className="mt-3 p-2.5 rounded-xl bg-neutral-50 text-[11px] text-neutral-600 font-medium leading-snug">
              <span className="font-bold text-neutral-800">Em palavras simples: </span>
              {item.laymanExplanation}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
