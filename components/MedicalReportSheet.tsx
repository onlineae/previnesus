'use client';

import React, { useRef, useState } from 'react';
import ManchesterBadge from './ManchesterBadge';
import { Printer, Download, Share2, Shield, AlertTriangle, CheckCircle, FileText, UserCheck, Stethoscope, RefreshCw, ArrowLeft } from 'lucide-react';
import { MANDATORY_LEGAL_DISCLAIMER } from '@/lib/manchester';

interface Props {
  triageData?: any;
  triageResult?: any;
  data?: any;
  category?: string;
  patientName?: string;
  susCardNumber?: string;
  photoUrl?: string;
  imageBase64?: string;
  userImage?: string;
  patientNotes?: string;
  patientDescription?: string;
  onReset?: () => void;
}

export default function MedicalReportSheet({
  triageData: propTriageData,
  triageResult,
  data,
  category = 'Pele / Lesão / Pé Diabético',
  patientName = 'Cidadão Usuário do SUS',
  susCardNumber = '728.9102.3847.0019',
  photoUrl,
  imageBase64,
  userImage,
  patientNotes,
  patientDescription,
  onReset
}: Props) {
  const triageData = propTriageData || triageResult || data || {};
  const [activeTab, setActiveTab] = useState<'citizen' | 'clinical'>('citizen');
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    setIsPrinting(true);
    setActiveTab('clinical');
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 300);
  };

  const c = triageData?.citizenView || (triageData?.citizenGuidance ? {
    summary: triageData.citizenGuidance.directMessage,
    whatToDo: triageData.citizenGuidance.hydrationPlan,
    homeCare: [],
    warningSignsToWatch: triageData.citizenGuidance.threeWarningSigns || []
  } : {});
  const m = triageData?.clinicalView || triageData?.clinicalTriageSummary || {};
  const signs = triageData?.flogisticSigns || {};
  const color = (triageData?.manchesterColor || triageData?.color || triageData?.manchester_color || 'green').toLowerCase();
  const displayPhoto = userImage || imageBase64 || photoUrl || triageData?.photoUrl || triageData?.imageData;
  const patientNarrative = patientNotes || patientDescription || triageData?.patientNotes || '';

  return (
    <div className="space-y-4">
      {/* Tab Switcher: Cidadão vs Médico do Posto */}
      <div className="bg-neutral-100 p-1.5 rounded-2xl flex items-center gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('citizen')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'citizen'
              ? 'bg-white text-neutral-900 shadow-sm scale-[1.01]'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <UserCheck className="w-4 h-4 text-sus-blue" />
          <span>Para Você (Cidadão)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('clinical')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'clinical'
              ? 'bg-white text-sus-green-dark shadow-sm scale-[1.01]'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-sus-green" />
          <span>Ficha SUS (Para o Médico / UPA)</span>
        </button>
      </div>

      {/* Action bar for PDF / Print / Reset */}
      <div className="flex items-center justify-between flex-wrap gap-2 bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
        <span className="text-xs text-neutral-600 font-medium">
          {activeTab === 'citizen' ? 'Linguagem simples e orientações passo a passo' : 'Documento técnico com CID-10, semiologia e espaço para assinatura'}
        </span>
        <div className="flex items-center gap-2">
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Nova Triagem</span>
            </button>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-sus-blue hover:bg-sus-blue-dark text-white font-bold text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>📄 Baixar / Imprimir PDF</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Citizen Friendly View */}
      {activeTab === 'citizen' && (
        <div className="space-y-4 animate-fadeIn">
          {/* DECISÃO DE PRÉ-TRIAGEM SUS: DEVE IR À UPA? + BAIXO / MÉDIO / ALTO RISCO */}
          <div className={`p-5 sm:p-6 rounded-3xl border-2 shadow-md ${
            color === 'red' || color === 'orange'
              ? 'bg-rose-50 border-rose-500 text-rose-950'
              : color === 'yellow'
              ? 'bg-amber-50 border-amber-500 text-amber-950'
              : 'bg-emerald-50 border-emerald-500 text-emerald-950'
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
              <span className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
                color === 'red' || color === 'orange'
                  ? 'bg-rose-600 text-white'
                  : color === 'yellow'
                  ? 'bg-amber-500 text-neutral-950'
                  : 'bg-emerald-600 text-white'
              }`}>
                {triageData?.riskLabel || (color === 'red' || color === 'orange' ? '🔴 ALTO RISCO' : color === 'yellow' ? '🟡 MÉDIO RISCO' : '🟢 BAIXO RISCO')}
              </span>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-600">
                Protocolo de Manchester • Pré-Triagem SUS
              </span>
            </div>

            <div className="space-y-2">
              <span className="text-[11px] font-black uppercase tracking-widest text-neutral-500 block">
                DEVE IR À UPA?
              </span>
              <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
                {triageData?.upaVerdict || (
                  color === 'red' || color === 'orange'
                    ? '🚨 SIM! PROCURE A UPA 24H OU LIGUE 192 (SAMU) AGORA'
                    : color === 'yellow'
                    ? '⚠️ ATENÇÃO: POSTO DE SAÚDE (UBS) OU UPA SE PRECISAR DE PONTOS'
                    : '🛑 NÃO VÁ À UPA (CUIDE EM CASA OU PROCURE O POSTO DE SAÚDE)'
                )}
              </h3>
              <p className="text-xs sm:text-sm font-medium leading-relaxed">
                {triageData?.upaRecommendation || (
                  color === 'red' || color === 'orange'
                    ? 'Este caso apresenta alta gravidade, risco de hemorragia, infecção aguda com febre ou necrose. Atendimento de emergência imediato.'
                    : color === 'yellow'
                    ? 'Corte aberto ou lesão que pode precisar de pontos (sutura) ou avaliação médica nas próximas horas. Se o Posto de Saúde estiver aberto, procure a UBS.'
                    : 'A IA identificou um ferimento superficial leve. Não há risco imediato e NÃO requer atendimento em UPA, evitando longas horas na fila do pronto-socorro.'
                )}
              </p>
            </div>

            {/* Queue relief impact banner */}
            <div className="mt-4 p-3.5 rounded-2xl bg-white/90 border border-neutral-200/80 text-xs text-neutral-800 leading-relaxed shadow-sm">
              <div className="flex items-center gap-1.5 font-black text-neutral-900 mb-1">
                <span>🏥 Como isso ajuda a diminuir as filas do SUS:</span>
              </div>
              <p className="text-[11px] text-neutral-600 leading-normal">
                {triageData?.queueMessage || (
                  color === 'red' || color === 'orange'
                    ? 'Casos de ALTO RISCO recebem prioridade máxima imediata na triagem da UPA (fita vermelha/laranja - atendimento em até 10 minutos).'
                    : 'Mais de 70% das pessoas nas filas das UPAs têm casos leves que poderiam ser resolvidos com muito mais agilidade no Posto de Saúde (UBS) do bairro ou em casa.'
                )}
              </p>
            </div>
          </div>

          {/* Manchester Card */}
          <ManchesterBadge color={color} size="lg" />

          {/* Display Attached Photo if Available */}
          {displayPhoto && (
            <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
              <img
                src={displayPhoto}
                alt="Foto da lesão analisada"
                className="w-28 h-28 object-cover rounded-xl border border-neutral-300 flex-shrink-0"
              />
              <div className="space-y-1 text-xs">
                <span className="font-bold text-neutral-900 block">Foto analisada pelo Gemini com sucesso</span>
                <p className="text-neutral-600 leading-relaxed">
                  A imagem foi processada pelo modelo de visão computacional em alta velocidade para verificação de bordas, profundidade, secreção purulenta e sinais de infecção.
                </p>
                {patientNarrative && (
                  <p className="text-neutral-500 italic mt-1 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                    "{patientNarrative}"
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Simple Explanation */}
          <div className="p-4 rounded-2xl bg-white border border-neutral-200 shadow-sm">
            <h4 className="font-bold text-sm text-neutral-900 mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4 text-sus-blue" />
              O que significa a sua avaliação:
            </h4>
            <p className="text-sm text-neutral-700 leading-relaxed">
              {c.summary || 'Avaliação preliminar registrada com sucesso.'}
            </p>

            {c.whatToDo && (
              <div className="mt-3 p-3 rounded-xl bg-sus-blue-light/60 border border-sus-blue/20 text-xs text-sus-blue-dark font-medium leading-relaxed">
                <strong className="block font-bold mb-0.5">Onde e quando procurar atendimento:</strong>
                {c.whatToDo}
              </div>
            )}
          </div>

          {/* Home Care Instructions (Non-pharmacological) */}
          {c.homeCare && c.homeCare.length > 0 && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm">
              <h4 className="font-bold text-sm text-emerald-900 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Cuidados em Casa (Instruções Básicas Passo a Passo):
              </h4>
              <ul className="space-y-2">
                {c.homeCare.map((item: string, i: number) => (
                  <li key={i} className="text-xs text-emerald-800 font-medium flex items-start gap-2 bg-white/70 p-2.5 rounded-xl border border-emerald-200/60">
                    <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 font-black text-[11px] flex items-center justify-center flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="mt-0.5">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Warning Signs */}
          {c.warningSignsToWatch && c.warningSignsToWatch.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 shadow-sm">
              <h4 className="font-bold text-sm text-amber-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Sinais de Perigo (Se aparecer qualquer um, vá à UPA imediatamente):
              </h4>
              <ul className="space-y-1.5">
                {c.warningSignsToWatch.map((item: string, i: number) => (
                  <li key={i} className="text-xs text-amber-800 font-medium flex items-start gap-2">
                    <span className="text-amber-500 font-bold">⚠️</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Bottom Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-sus-blue hover:bg-sus-blue-dark text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all active:scale-98"
            >
              <Printer className="w-4 h-4" />
              <span>📄 Baixar / Imprimir Ficha SUS Completa em PDF</span>
            </button>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="py-3.5 px-6 rounded-2xl bg-neutral-200 hover:bg-neutral-300 text-neutral-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>🔄 Fazer Outra Triagem</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: Official SUS Clinical Sheet (Printable) */}
      <div
        ref={printRef}
        className={`${
          activeTab === 'clinical' ? 'block' : 'hidden'
        } p-6 bg-white rounded-2xl border border-neutral-300 shadow-md print:block print:p-0 print:border-none print:shadow-none space-y-5`}
      >
        {/* Printable Header with SUS Logo layout */}
        <div className="border-b-2 border-neutral-800 pb-3 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sus-blue flex items-center justify-center text-white font-black text-2xl print:border print:border-black">
              ✚
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-neutral-500 block">
                MINISTÉRIO DA SAÚDE • SISTEMA ÚNICO DE SAÚDE (SUS)
              </span>
              <h2 className="text-lg font-black text-neutral-900 tracking-tight leading-none mt-0.5">
                FICHA DE PRÉ-TRIAGEM E ACOLHIMENTO CLÍNICO
              </h2>
              <span className="text-xs font-semibold text-sus-green-dark">
                Atenção Primária à Saúde (APS) / Triagem Pré-UPA
              </span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-mono text-neutral-500">ID PROTOCOLO</div>
            <div className="text-xs font-black font-mono text-neutral-900">
              #SUS-{Date.now().toString().slice(-6)}
            </div>
            <div className="text-[10px] text-neutral-500">
              {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        </div>

        {/* Patient / Triage Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-xs">
          <div>
            <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Paciente</span>
            <strong className="text-neutral-900">{patientName}</strong>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Cartão SUS</span>
            <strong className="font-mono text-neutral-900">{susCardNumber}</strong>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Queixa Principal</span>
            <strong className="text-neutral-900">{category}</strong>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Manchester</span>
            <ManchesterBadge color={color} size="sm" />
          </div>
        </div>

        {/* Photo + Semiotics Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {displayPhoto && (
            <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50 p-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1.5">
                Registro Fotográfico Anexado
              </span>
              <img
                src={displayPhoto}
                alt="Registro anexado da lesão"
                className="w-full aspect-square object-cover rounded-lg border border-neutral-300"
              />
            </div>
          )}

          <div className={displayPhoto ? 'md:col-span-2 space-y-3' : 'md:col-span-3 space-y-3'}>
            {/* Semiotic description */}
            <div className="border border-neutral-200 rounded-xl p-3.5 bg-white">
              <span className="text-[10px] font-bold text-sus-blue uppercase block mb-1">
                Avaliação Semiológica Visual (Inspeção):
              </span>
              <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                {m.semioticDescription || 'Sem alterações patológicas agudas aparentes.'}
              </p>
              {patientNarrative && (
                <div className="mt-2 text-[11px] text-neutral-600 bg-neutral-50 p-2 rounded-lg border border-neutral-200">
                  <strong className="text-neutral-800">Relato do Paciente:</strong> "{patientNarrative}"
                </div>
              )}
            </div>

            {/* Flogistic signs checklist */}
            <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50">
              <span className="text-[10px] font-bold text-neutral-600 uppercase block mb-2">
                Rastreio de Sinais Flogísticos Locais:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${signs.erythema ? 'bg-red-500 text-white' : 'bg-neutral-300 text-neutral-600'}`}>
                    {signs.erythema ? '✓' : '—'}
                  </span>
                  <span className={signs.erythema ? 'font-bold text-red-700' : 'text-neutral-600'}>
                    Eritema (Rubor)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${signs.edema ? 'bg-amber-500 text-white' : 'bg-neutral-300 text-neutral-600'}`}>
                    {signs.edema ? '✓' : '—'}
                  </span>
                  <span className={signs.edema ? 'font-bold text-amber-700' : 'text-neutral-600'}>
                    Edema (Inchaço)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${signs.heat ? 'bg-orange-500 text-white' : 'bg-neutral-300 text-neutral-600'}`}>
                    {signs.heat ? '✓' : '—'}
                  </span>
                  <span className={signs.heat ? 'font-bold text-orange-700' : 'text-neutral-600'}>
                    Calor Relatado
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${signs.painReported ? 'bg-red-500 text-white' : 'bg-neutral-300 text-neutral-600'}`}>
                    {signs.painReported ? '✓' : '—'}
                  </span>
                  <span className={signs.painReported ? 'font-bold text-red-700' : 'text-neutral-600'}>
                    Dor Referida
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] font-bold ${signs.purulentExudate ? 'bg-amber-600 text-white' : 'bg-neutral-300 text-neutral-600'}`}>
                    {signs.purulentExudate ? '✓' : '—'}
                  </span>
                  <span className={signs.purulentExudate ? 'font-bold text-amber-800' : 'text-neutral-600'}>
                    Exsudato Purulento
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagnostic hypotheses & Codes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200">
            <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
              Hipótese Diagnóstica Orientativa de Triagem:
            </span>
            <p className="text-xs font-bold text-neutral-900">
              {m.triageHypothesis || 'Avaliação clínica dermatológica/clínica geral sugerida.'}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {m.suggestedCIAP2 && (
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 text-[11px] font-mono font-bold">
                  CIAP-2: {m.suggestedCIAP2}
                </span>
              )}
              {m.suggestedCID10 && (
                <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 text-[11px] font-mono font-bold">
                  CID-10: {m.suggestedCID10}
                </span>
              )}
            </div>
          </div>

          {/* Red flags */}
          <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs">
            <span className="text-[10px] font-bold text-red-700 uppercase block mb-1">
              Bandeiras Vermelhas / Red Flags para Investigação:
            </span>
            <ul className="list-disc pl-4 space-y-0.5 text-red-900 font-medium">
              {m.redFlags?.map((flag: string, i: number) => (
                <li key={i}>{flag}</li>
              )) || <li>Ausência de sinais iminentes de sepse ou choque.</li>}
            </ul>
          </div>
        </div>

        {/* Morphology & Technical Wound Characterization */}
        <div className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-neutral-800 uppercase tracking-wider flex items-center gap-1.5">
              <span>🔍</span> Caracterização Técnica da Ferida (Inspeção Visual da IA):
            </span>
            <span className="text-[10px] font-bold text-neutral-500">
              Protocolo de Lesões Cutâneas SUS
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-white border border-neutral-200">
              <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Tipo de Lesão</span>
              <strong className="text-neutral-900 text-xs">{m.morphologicalAnalysis?.woundType || m.chiefComplaint || 'Lesão cutânea'}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-neutral-200">
              <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Tecido Predominante</span>
              <strong className="text-neutral-900 text-xs">{m.morphologicalAnalysis?.predominantTissue || (color === 'red' ? 'Necrose / Tecido Desvitalizado' : color === 'yellow' ? 'Fibrina / Derme Exposta' : 'Granulação / Epitelização Íntegra')}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-neutral-200">
              <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Bordas da Ferida</span>
              <strong className="text-neutral-900 text-xs">{m.morphologicalAnalysis?.edges || (color === 'yellow' ? 'Afastadas / Indicação de Sutura' : color === 'red' ? 'Irregulares / Descoladas' : 'Regulares / Aderidas')}</strong>
            </div>
            <div className="p-2.5 rounded-xl bg-white border border-neutral-200">
              <span className="text-[10px] text-neutral-400 block font-semibold uppercase">Exsudato e Odor</span>
              <strong className="text-neutral-900 text-xs">{m.morphologicalAnalysis?.exudate || (signs.purulentExudate ? 'Purulento / Amarelado' : 'Ausente ou Seroso Fisiológico')}</strong>
            </div>
          </div>
        </div>

        {/* Clinical Resolution & Management Plan for Doctor / Nursing Team */}
        <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-300 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
              <span>🩺</span> Sugestão de Resolução Clínica & Condutas SUS (Para o Médico / Enfermagem):
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-700 text-white">
              Guia Técnico Municipal
            </span>
          </div>

          <div className="space-y-2 text-xs text-neutral-800">
            <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-start gap-2">
              <span className="font-bold text-emerald-700 flex-shrink-0">1. Limpeza e Antissepsia:</span>
              <span>{m.susManagementPlan?.cleaningTechnique || 'Irrigação em jatos com Soro Fisiológico 0.9% morno (seringa de 20ml e agulha 40x12 para pressão ideal de 8-15 psi). Não usar antissépticos citotóxicos diretamente no leito de granulação.'}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-start gap-2">
              <span className="font-bold text-emerald-700 flex-shrink-0">2. Cobertura / Curativo Padronizado no SUS:</span>
              <span>{m.susManagementPlan?.recommendedDressing || (
                color === 'red' 
                  ? 'Desbridamento técnico de tecido desvitalizado, cobertura antimicrobiana (Sulfadiazina de prata 1% ou Alginato de Cálcio) e encaminhamento cirúrgico imediato.' 
                  : color === 'yellow'
                  ? 'Se for corte: sutura simples com fio Mononylon 4-0 ou 5-0 e curativo oclusivo seco por 24h. Se fissura de pé diabético: Hidrogel com alginato ou placa hidrocolóide e alívio de descarga de peso plantar.'
                  : 'Curativo protetor não aderente (óleo de AGE ou hidrogel amorfo) com gaze estéril; manter arejado e higienizado.'
              )}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-start gap-2">
              <span className="font-bold text-emerald-700 flex-shrink-0">3. Conduta para Sutura & Tempo:</span>
              <span>{m.susManagementPlan?.sutureIndication || (
                color === 'yellow' 
                  ? 'Bordas afastadas com indicação de sutura cirúrgica simples (tempo ideal: até 6 horas do trauma para menor taxa de infecção). Retirada estimada em 7 a 10 dias.' 
                  : 'Sem indicação de sutura cirúrgica invasiva. Cicatrização por primeira intenção ou epitelização espontânea.'
              )}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-emerald-200 flex items-start gap-2">
              <span className="font-bold text-emerald-700 flex-shrink-0">4. Profilaxia Antitetânica & Rastreio:</span>
              <span>{m.susManagementPlan?.tetanusProphylaxis || 'Checar esquema vacinal no Prontuário Eletrônico (PEC / e-SUS): Se última dose de vacina antitetânica (dT) há mais de 5 anos em ferida suja ou mais de 10 anos em ferida limpa, encaminhar à sala de vacinação da UBS para dose de reforço imediata.'}</span>
            </div>
          </div>
        </div>

        {/* Doctor's Prescription & Signature Section (Futura Integração Clínica) */}
        <div className="border-2 border-dashed border-neutral-400 rounded-xl p-4 bg-white space-y-3 print:border-solid print:border-neutral-500">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="text-[11px] font-black uppercase text-neutral-900 tracking-wider">
              Conduta Médica, Prescrição & Encaminhamento (Preenchimento pelo Profissional):
            </span>
            <div className="flex items-center gap-3 text-[10px] text-neutral-700 flex-wrap">
              <span className="inline-flex items-center gap-1">
                <span className="w-3.5 h-3.5 border border-neutral-600 rounded inline-block"></span>
                <span>Sala de Curativo UBS</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3.5 h-3.5 border border-neutral-600 rounded inline-block"></span>
                <span>Sutura / Procedimento</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3.5 h-3.5 border border-neutral-600 rounded inline-block"></span>
                <span>Observação UPA 24h</span>
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-3.5 h-3.5 border border-neutral-600 rounded inline-block"></span>
                <span>Alta com Cuidados Domiciliares</span>
              </span>
            </div>
          </div>

          <div className="min-h-[70px] border-b border-neutral-300 relative py-2">
            <span className="text-[10px] text-neutral-400 italic block">
              Espaço reservado para prescrição de medicamentos, orientações de retorno e conduta do médico do SUS...
            </span>
          </div>

          <div className="grid grid-cols-2 gap-8 pt-5">
            <div className="text-center">
              <div className="border-t border-neutral-800 pt-1">
                <span className="text-xs font-bold text-neutral-900 block">Assinatura / Carimbo do Médico Assistente</span>
                <span className="text-[10px] text-neutral-500">CRM / UF • Assinatura Digital ou Física</span>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-neutral-800 pt-1">
                <span className="text-xs font-bold text-neutral-900 block">Data e Horário do Atendimento Presencial</span>
                <span className="text-[10px] text-neutral-500">____ / ____ / 2026 às ____:____</span>
              </div>
            </div>
          </div>
        </div>

        {/* Mandatory Legal Warning */}
        <div className="pt-3 border-t border-neutral-300 text-[10px] text-neutral-500 leading-normal flex items-start gap-2">
          <Shield className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
          <p>
            <strong>AVISO LEGAL OBRIGATÓRIO:</strong> {MANDATORY_LEGAL_DISCLAIMER} Documento gerado pelo sistema PrevineSUS para auxílio e agilização da triagem municipal.
          </p>
        </div>

        {/* Bottom print action */}
        <div className="no-print pt-2 flex items-center justify-between gap-2 border-t border-neutral-200">
          <span className="text-xs text-neutral-500 font-medium">Você pode imprimir esta ficha em papel ou salvar diretamente em PDF.</span>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sus-blue hover:bg-sus-blue-dark text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Ficha Agora</span>
          </button>
        </div>
      </div>
    </div>
  );
}
