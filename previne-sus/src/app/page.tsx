'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Camera, 
  FileText, 
  Activity, 
  HeartPulse, 
  ShieldCheck, 
  ArrowRight, 
  Clock, 
  AlertTriangle, 
  TrendingUp,
  Pill,
  Sparkles,
  Info
} from 'lucide-react';
import { storage, TriageCase, StoredPrescription } from '@/lib/storage';
import ManchesterBadge from '@/components/ManchesterBadge';
import { MANDATORY_LEGAL_DISCLAIMER } from '@/lib/manchester';

export default function HomePage() {
  const [recentCases, setRecentCases] = useState<TriageCase[]>([]);
  const [recentPrescriptions, setRecentPrescriptions] = useState<StoredPrescription[]>([]);

  useEffect(() => {
    setRecentCases(storage.getCases().slice(0, 2));
    setRecentPrescriptions(storage.getPrescriptions().slice(0, 1));
  }, []);

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sus-blue via-sus-blue-dark to-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-sus-blue/15">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 max-w-xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-bold text-white mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-sus-yellow" />
            <span>Sistema Único de Saúde • Pré-Triagem Cidadã</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Cuidado rápido, preventivo e sem medo da fila.
          </h1>
          <p className="mt-2 text-sm text-white/80 leading-relaxed">
            Identifique sinais de gravidade, decifre receitas ilegíveis, monitore sua saúde e gere a ficha pronta para entregar ao médico do posto.
          </p>
        </div>
      </div>

      {/* Main 4 Action Pillars */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-extrabold text-neutral-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sus-blue" />
            Como podemos te ajudar agora?
          </h2>
          <span className="text-xs text-neutral-500">Escolha uma opção</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card 1: Analisar Foto */}
          <Link
            href="/triage/photo"
            className="group relative p-5 rounded-3xl bg-white border border-neutral-200 hover:border-sus-blue shadow-sm hover:shadow-md transition-all active:scale-[0.99] flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sus-blue-light text-sus-blue flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Camera className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-lg text-neutral-900 group-hover:text-sus-blue transition-colors">
                  Analisar Foto
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  Visão com IA
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                Tire foto de feridas, manchas na pele, dores de dente/inchaço ou olhos vermelhos. Analisa infecção e evolução diária.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-sus-blue group-hover:gap-2 transition-all">
              <span>Iniciar análise visual</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Card 2: Entender Receita / Exame */}
          <Link
            href="/triage/translator"
            className="group relative p-5 rounded-3xl bg-white border border-neutral-200 hover:border-sus-green shadow-sm hover:shadow-md transition-all active:scale-[0.99] flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-sus-green-light text-sus-green-dark flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-lg text-neutral-900 group-hover:text-sus-green transition-colors">
                  Tradutor de Receitas & Exames
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Sem Errar Dose
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                Decifre letras médicas difíceis, monte a tabela com horários de remédios e entenda laudos de sangue em palavras simples.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-sus-green group-hover:gap-2 transition-all">
              <span>Decifrar documento</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Card 3: Avaliar Sintomas (Pré-UPA) */}
          <Link
            href="/triage/symptoms"
            className="group relative p-5 rounded-3xl bg-white border border-neutral-200 hover:border-amber-500 shadow-sm hover:shadow-md transition-all active:scale-[0.99] flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-lg text-neutral-900 group-hover:text-amber-600 transition-colors">
                  Avaliar Sintomas (Pré-UPA)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  Dengue & Gripe
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                Febre, dores no corpo ou tosse? Saiba se é seguro cuidar em casa com hidratação ou se há sinal de perigo para ir à UPA.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-amber-600 group-hover:gap-2 transition-all">
              <span>Fazer questionário guiado</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>

          {/* Card 4: Monitor de Pressão e Diabetes */}
          <Link
            href="/triage/chronic"
            className="group relative p-5 rounded-3xl bg-white border border-neutral-200 hover:border-rose-500 shadow-sm hover:shadow-md transition-all active:scale-[0.99] flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-lg text-neutral-900 group-hover:text-rose-600 transition-colors">
                  Pressão & Glicemia
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                  Prevenção
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
                Fotografe o visor do aparelho de pressão ou glicosímetro. Acompanhe gráficos e receba alertas se a pressão passar do limite.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-bold text-rose-600 group-hover:gap-2 transition-all">
              <span>Registrar medição</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Active Cases & Evolution Section */}
      {recentCases.length > 0 && (
        <div className="p-5 rounded-3xl bg-white border border-neutral-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sus-blue" />
              Casos em Acompanhamento de Evolução
            </h3>
            <Link href="/history" className="text-xs font-bold text-sus-blue hover:underline">
              Ver todos
            </Link>
          </div>

          <div className="space-y-3">
            {recentCases.map((c) => (
              <div
                key={c.id}
                className="p-3.5 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  {c.photos?.[0]?.imageData && (
                    <img
                      src={c.photos[c.photos.length - 1].imageData}
                      alt={c.title}
                      className="w-12 h-12 rounded-xl object-cover border border-neutral-300 flex-shrink-0"
                    />
                  )}
                  <div>
                    <h4 className="font-bold text-xs text-neutral-900 line-clamp-1">{c.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-neutral-500 font-medium">
                        {c.photos?.length || 1} fotos gravadas
                      </span>
                      {c.photos?.[c.photos.length - 1]?.triageResult?.manchesterColor && (
                        <ManchesterBadge
                          color={c.photos[c.photos.length - 1].triageResult.manchesterColor}
                          size="sm"
                          showWaitTime={false}
                        />
                      )}
                    </div>
                  </div>
                </div>

                <Link
                  href="/history"
                  className="px-3 py-1.5 rounded-xl bg-white border border-neutral-200 text-xs font-bold text-neutral-700 hover:text-sus-blue hover:border-sus-blue transition-colors flex-shrink-0"
                >
                  Comparar
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mandatory SUS Legal Notice */}
      <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-neutral-600 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          <strong className="text-neutral-800">Aviso Legal Obrigatório:</strong> {MANDATORY_LEGAL_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
