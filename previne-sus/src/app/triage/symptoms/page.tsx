'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Activity, 
  ArrowLeft, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Droplets, 
  PhoneCall, 
  Printer, 
  RefreshCw,
  Sparkles,
  Thermometer,
  HeartCrack,
  HelpCircle
} from 'lucide-react';
import AudioRecorder from '@/components/AudioRecorder';
import ManchesterBadge from '@/components/ManchesterBadge';
import { storage } from '@/lib/storage';
import { MANDATORY_LEGAL_DISCLAIMER } from '@/lib/manchester';
import { callGeminiVision } from '@/lib/gemini';
import { SYMPTOM_TRIAGE_SYSTEM_PROMPT } from '@/lib/prompts';

export default function SymptomsTriagePage() {
  // Symptom state
  const [feverDays, setFeverDays] = useState('0');
  const [feverTemp, setFeverTemp] = useState('');
  
  // Dengue & General symptoms
  const [retroOrbitalPain, setRetroOrbitalPain] = useState(false);
  const [bodyAches, setBodyAches] = useState(false);
  const [redSpots, setRedSpots] = useState(false);

  // RED FLAGS (Sinais de Alarme Dengue & Respiratório)
  const [severeAbdominalPain, setSevereAbdominalPain] = useState(false);
  const [persistentVomiting, setPersistentVomiting] = useState(false);
  const [dizzinessPostural, setDizzinessPostural] = useState(false);
  const [bleeding, setBleeding] = useState(false);
  const [dyspnea, setDyspnea] = useState(false);
  const [cough, setCough] = useState(false);

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      let triageData: any = null;
      try {
        const res = await fetch('/api/triage/symptoms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symptoms: {
              feverDays,
              feverTemp,
              retroOrbitalPain,
              bodyAches,
              redSpots,
              severeAbdominalPain,
              persistentVomiting,
              dizzinessPostural,
              bleeding,
              dyspnea,
              cough
            },
            notes,
            apiKey: storage.getApiKey()
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            triageData = json.data;
          }
        }
      } catch (e) {
        console.warn('API route not reachable, running client-side symptoms engine:', e);
      }

      // Standalone APK fallback
      if (!triageData) {
        const promptDetails = `
Avaliação Sintomática Pré-UPA:
- Dias de febre: ${feverDays || '0'} dias (temperatura máx relatada: ${feverTemp || 'Não medida'})
- Dor atrás dos olhos / dor de cabeça: ${retroOrbitalPain ? 'SIM' : 'NÃO'}
- Dores no corpo e articulações: ${bodyAches ? 'SIM' : 'NÃO'}
- Manchas vermelhas na pele (petéquias): ${redSpots ? 'SIM' : 'NÃO'}
- Dor abdominal contínua e forte: ${severeAbdominalPain ? 'SIM - ALARME!' : 'NÃO'}
- Vômitos frequentes / incoercíveis: ${persistentVomiting ? 'SIM - ALARME!' : 'NÃO'}
- Tontura ao ficar de pé / fraqueza extrema: ${dizzinessPostural ? 'SIM - ALARME!' : 'NÃO'}
- Sangramento espontâneo (gengiva, nariz): ${bleeding ? 'SIM - ALARME!' : 'NÃO'}
- Falta de ar / dificuldade de respirar: ${dyspnea ? 'SIM - ALARME!' : 'NÃO'}
- Tosse persistente com secreção: ${cough ? 'SIM' : 'NÃO'}
- Relato livre do paciente: "${notes || 'Nenhum'}"
`;

        triageData = await callGeminiVision(
          SYMPTOM_TRIAGE_SYSTEM_PROMPT,
          promptDetails,
          [],
          storage.getApiKey()
        );
      }

      if (triageData) {
        setResult(triageData);
      } else {
        setErrorMessage('Não foi possível avaliar os sintomas. Tente novamente.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Erro ao avaliar sintomas.');
    } finally {
      setLoading(false);
    }
  };

  const hasAnyAlarm = severeAbdominalPain || persistentVomiting || dizzinessPostural || bleeding || dyspnea;

  return (
    <div className="space-y-6">
      {/* Header Back Link */}
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-sus-blue transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Início</span>
        </Link>
        <span className="text-xs font-semibold text-neutral-500">Módulo 3: Triagem Sintomática</span>
      </div>

      {/* Screen Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
          Triagem Pré-UPA: Dengue, Arboviroses & Sintomas
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed">
          Responda com calma ao questionário do Ministério da Saúde. O sistema avalia se o caso é de repouso e hidratação em casa ou se exige ida imediata à UPA 24h.
        </p>
      </div>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Quick 1-Click Clinical Presets */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-white to-amber-50/70 border border-neutral-200 space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sus-blue" />
              Casos Clínicos para Teste de Sintomas (1 Clique):
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setFeverDays('1');
                  setFeverTemp('37.8');
                  setRetroOrbitalPain(false);
                  setBodyAches(true);
                  setRedSpots(false);
                  setSevereAbdominalPain(false);
                  setPersistentVomiting(false);
                  setDizzinessPostural(false);
                  setBleeding(false);
                  setDyspnea(false);
                  setCough(false);
                  setNotes('Começou hoje com dor leve no corpo e febre baixa de 37.8°C. Estou comendo e bebendo água normalmente.');
                }}
                className="p-3 rounded-xl bg-white hover:bg-emerald-50 border border-neutral-200 hover:border-emerald-300 text-left transition-all cursor-pointer shadow-sm"
              >
                <span className="text-xs font-bold text-emerald-800 block">🟢 Caso Leve: Febre Baixa Inicial</span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Sem sinais de alarme. Cuidados em casa e hidratação.</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFeverDays('4');
                  setFeverTemp('39.2');
                  setRetroOrbitalPain(true);
                  setBodyAches(true);
                  setRedSpots(true);
                  setSevereAbdominalPain(true);
                  setPersistentVomiting(true);
                  setDizzinessPostural(true);
                  setBleeding(true);
                  setDyspnea(false);
                  setCough(false);
                  setNotes('Suspeita de Dengue há 4 dias. Hoje comecei com dor forte na barriga, sangramento na gengiva ao escovar e vômitos repetidos.');
                }}
                className="p-3 rounded-xl bg-white hover:bg-rose-50 border border-neutral-200 hover:border-rose-300 text-left transition-all cursor-pointer shadow-sm"
              >
                <span className="text-xs font-bold text-rose-800 block">🔴 Caso Grave: Dengue com Sinais de Alarme</span>
                <span className="text-[10px] text-neutral-500 block mt-0.5">Dor abdominal intensa e sangramento. Exige UPA 24h imediata!</span>
              </button>
            </div>
          </div>

          {/* Section 1: Febre */}
          <div className="p-4 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-1.5">
              <Thermometer className="w-4 h-4 text-amber-500" />
              1. Febre e Temperatura
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-neutral-600 block mb-1">
                  Está com febre há quantos dias?
                </label>
                <select
                  value={feverDays}
                  onChange={(e) => setFeverDays(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-800 bg-white"
                >
                  <option value="0">Sem febre</option>
                  <option value="1">1 dia (começou hoje)</option>
                  <option value="2">2 dias</option>
                  <option value="3">3 a 4 dias</option>
                  <option value="5">5 dias ou mais</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-600 block mb-1">
                  Temperatura máxima medida (°C):
                </label>
                <input
                  type="text"
                  value={feverTemp}
                  onChange={(e) => setFeverTemp(e.target.value)}
                  placeholder="Ex: 38.5 ou 'Não medi com termômetro'"
                  className="w-full p-2.5 rounded-xl border border-neutral-200 text-xs font-semibold text-neutral-800 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: RED FLAGS / SINAIS DE ALARME (Destaque Visual) */}
          <div className="p-5 rounded-3xl bg-red-50/70 border-2 border-red-300 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                2. Sinais de Alarme e Perigo (Muito Importante!)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-600 text-white">
                Critérios UPA
              </span>
            </div>
            <p className="text-xs text-red-900/80 leading-relaxed font-medium">
              Marque se você estiver sentindo QUALQUER UM destes sintomas nas últimas 24 horas:
            </p>

            <div className="space-y-2">
              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-red-200 cursor-pointer hover:bg-red-50/40 transition-colors">
                <input
                  type="checkbox"
                  checked={severeAbdominalPain}
                  onChange={(e) => setSevereAbdominalPain(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-600"
                />
                <div>
                  <strong className="text-xs text-red-900 block">Dor na barriga forte e contínua</strong>
                  <span className="text-[11px] text-neutral-600">Sensação de estômago ou abdômen muito dolorido que não passa.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-red-200 cursor-pointer hover:bg-red-50/40 transition-colors">
                <input
                  type="checkbox"
                  checked={persistentVomiting}
                  onChange={(e) => setPersistentVomiting(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-600"
                />
                <div>
                  <strong className="text-xs text-red-900 block">Vômitos frequentes / Não segura água</strong>
                  <span className="text-[11px] text-neutral-600">Tenta beber líquidos e vomita repetidamente.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-red-200 cursor-pointer hover:bg-red-50/40 transition-colors">
                <input
                  type="checkbox"
                  checked={dizzinessPostural}
                  onChange={(e) => setDizzinessPostural(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-600"
                />
                <div>
                  <strong className="text-xs text-red-900 block">Tontura forte ao ficar de pé / Desmaio</strong>
                  <span className="text-[11px] text-neutral-600">Pressão caindo ao levantar da cama ou sofá, vista escurecendo.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-red-200 cursor-pointer hover:bg-red-50/40 transition-colors">
                <input
                  type="checkbox"
                  checked={bleeding}
                  onChange={(e) => setBleeding(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-600"
                />
                <div>
                  <strong className="text-xs text-red-900 block">Sangramento espontâneo</strong>
                  <span className="text-[11px] text-neutral-600">Sangue no nariz, gengiva sangrando ao escovar, vômito com sangue ou fezes escuras.</span>
                </div>
              </label>

              <label className="flex items-start gap-2.5 p-2.5 rounded-xl bg-white border border-red-200 cursor-pointer hover:bg-red-50/40 transition-colors">
                <input
                  type="checkbox"
                  checked={dyspnea}
                  onChange={(e) => setDyspnea(e.target.checked)}
                  className="mt-0.5 rounded text-red-600 focus:ring-red-600"
                />
                <div>
                  <strong className="text-xs text-red-900 block">Falta de ar / Cansaço para respirar</strong>
                  <span className="text-[11px] text-neutral-600">Sensação de sufoco ou respiração muito rápida mesmo parado.</span>
                </div>
              </label>
            </div>
          </div>

          {/* Section 3: Sintomas Gerais */}
          <div className="p-4 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
              3. Outros Sintomas Sentidos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={retroOrbitalPain}
                  onChange={(e) => setRetroOrbitalPain(e.target.checked)}
                  className="rounded text-sus-blue focus:ring-sus-blue"
                />
                <span className="font-semibold text-neutral-800">Dor atrás dos olhos</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bodyAches}
                  onChange={(e) => setBodyAches(e.target.checked)}
                  className="rounded text-sus-blue focus:ring-sus-blue"
                />
                <span className="font-semibold text-neutral-800">Dor forte nos ossos / juntas</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={redSpots}
                  onChange={(e) => setRedSpots(e.target.checked)}
                  className="rounded text-sus-blue focus:ring-sus-blue"
                />
                <span className="font-semibold text-neutral-800">Manchinhas vermelhas na pele</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={cough}
                  onChange={(e) => setCough(e.target.checked)}
                  className="rounded text-sus-blue focus:ring-sus-blue"
                />
                <span className="font-semibold text-neutral-800">Tosse frequente ou coriza</span>
              </label>
            </div>
          </div>

          {/* Audio narration */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              4. Relato adicional (por voz ou texto):
            </label>
            <div className="mb-2">
              <AudioRecorder
                onTranscription={(t) => setNotes((prev) => (prev ? `${prev} ${t}` : t))}
              />
            </div>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Mais alguma queixa relevante?"
              className="w-full p-3 rounded-2xl border border-neutral-200 text-xs text-neutral-900 bg-white"
            />
          </div>

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-4 px-6 rounded-2xl text-white font-extrabold text-sm shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 ${
              hasAnyAlarm
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/30'
                : 'bg-sus-blue hover:bg-sus-blue-dark shadow-sus-blue/25'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Cruzando com Protocolos Epidemiológicos...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-sus-yellow" />
                <span>Avaliar Risco de Gravidade e Obter Conduta</span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* Result Screen */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setResult(null)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sus-blue hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Refazer Questionário</span>
            </button>
            <span className="text-xs text-neutral-500 font-medium">Classificação Concluída</span>
          </div>

          {/* Card de Decisão SUS: DEVE IR À UPA? */}
          <div className={`p-5 sm:p-6 rounded-3xl border-2 shadow-md ${
            result.manchesterColor === 'red' || result.manchesterColor === 'orange' || result.redFlagDetected
              ? 'bg-rose-50 border-rose-500 text-rose-950'
              : result.manchesterColor === 'yellow'
              ? 'bg-amber-50 border-amber-500 text-amber-950'
              : 'bg-emerald-50 border-emerald-500 text-emerald-950'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
                result.manchesterColor === 'red' || result.manchesterColor === 'orange' || result.redFlagDetected
                  ? 'bg-rose-600 text-white'
                  : result.manchesterColor === 'yellow'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'bg-emerald-600 text-white'
              }`}>
                {result.riskLabel || (result.manchesterColor === 'red' || result.manchesterColor === 'orange' || result.redFlagDetected ? '🔴 ALTO RISCO' : result.manchesterColor === 'yellow' ? '🟡 MÉDIO RISCO' : '🟢 BAIXO RISCO')}
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-600">
                Pré-Triagem para Redução de Filas no SUS
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-neutral-500 block">
                DEVE IR À UPA?
              </span>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                {result.upaVerdict || (
                  result.redFlagDetected || result.manchesterColor === 'red' || result.manchesterColor === 'orange'
                    ? '🚨 SIM! PROCURE A UPA 24H OU LIGUE 192 (SAMU) AGORA'
                    : '🛑 NÃO VÁ À UPA (CUIDE EM CASA COM HIDRATAÇÃO RIGOROSA)'
                )}
              </h3>
              <p className="text-xs sm:text-sm font-medium leading-relaxed">
                {result.upaRecommendation || (
                  result.redFlagDetected
                    ? 'Foram identificados sinais de alarme clínicos (como dor abdominal intensa, vômitos persistentes ou sangramento) que exigem avaliação médica imediata na UPA.'
                    : 'Seus sintomas apontam para um quadro viral comum sem sinais de alarme no momento. Ficar em casa em repouso e com hidratação abundante evita que você enfrente horas de fila na UPA e se exponha a outras doenças no pronto-socorro.'
                )}
              </p>
            </div>
          </div>

          {/* Result Card with Manchester color */}
          <ManchesterBadge color={result.manchesterColor || (result.redFlagDetected ? 'orange' : 'green')} size="lg" />

          {/* Direct Urgent Action Banner if Red Flag */}
          {result.redFlagDetected ? (
            <div className="p-5 rounded-3xl bg-red-600 text-white shadow-xl space-y-3">
              <div className="flex items-center gap-2 font-black text-base uppercase tracking-wide">
                <ShieldAlert className="w-6 h-6 animate-pulse text-amber-300" />
                <span>ATENÇÃO: Vá Imediatamente a uma UPA 24h</span>
              </div>
              <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-medium">
                {result.citizenGuidance?.directMessage}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <a
                  href="tel:192"
                  className="flex-1 py-3 px-4 rounded-xl bg-white text-red-600 font-black text-xs flex items-center justify-center gap-2 shadow-md hover:bg-neutral-100 transition-colors"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Ligar SAMU 192</span>
                </a>
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-800 text-white font-black text-xs flex items-center justify-center gap-2 hover:bg-red-900 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Ficha</span>
                </button>
              </div>
            </div>
          ) : (
            /* Mild Home Care Banner */
            <div className="p-5 rounded-3xl bg-emerald-600 text-white shadow-md space-y-3">
              <div className="flex items-center gap-2 font-black text-base uppercase tracking-wide">
                <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                <span>Cuidados e Hidratação em Casa (Sem Sinais de Alarme)</span>
              </div>
              <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-medium">
                {result.citizenGuidance?.directMessage}
              </p>
            </div>
          )}

          {/* Hydration Guidance Box */}
          {result.citizenGuidance?.hydrationPlan && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 shadow-sm space-y-2">
              <h4 className="font-bold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-sus-blue" />
                Plano de Hidratação Guiado:
              </h4>
              <p className="text-xs text-blue-800 leading-relaxed font-medium">
                {result.citizenGuidance.hydrationPlan}
              </p>
            </div>
          )}

          {/* 3 Warning Signs to Watch */}
          {result.citizenGuidance?.threeWarningSigns && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm space-y-2">
              <h4 className="font-bold text-xs text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                3 Sinais de Perigo para Vigiar em Casa:
              </h4>
              <ul className="space-y-1.5 text-xs text-amber-800 font-medium">
                {result.citizenGuidance.threeWarningSigns.map((s: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="font-bold text-amber-600">{idx + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Technical SUS Summary Card */}
          {result.clinicalTriageSummary && (
            <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm text-xs space-y-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase block">
                Ficha Técnica para a Triagem do Posto / UPA:
              </span>
              <div className="flex items-center gap-2">
                {result.clinicalTriageSummary.ciap2 && (
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-mono font-bold">
                    CIAP-2: {result.clinicalTriageSummary.ciap2}
                  </span>
                )}
                {result.clinicalTriageSummary.cid10 && (
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 font-mono font-bold">
                    CID-10: {result.clinicalTriageSummary.cid10}
                  </span>
                )}
              </div>
              <p className="text-neutral-700 font-medium leading-relaxed pt-1">
                {result.clinicalTriageSummary.clinicalObservation}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-200 text-[11px] text-neutral-500 leading-relaxed">
        <strong>Aviso Legal Obrigatório:</strong> {MANDATORY_LEGAL_DISCLAIMER}
      </div>
    </div>
  );
}
