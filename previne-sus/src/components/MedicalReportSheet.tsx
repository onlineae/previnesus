'use client';

import React, { useRef, useState } from 'react';
import ManchesterBadge from './ManchesterBadge';
import { Printer, Download, Share2, Shield, AlertTriangle, CheckCircle, FileText, UserCheck, Stethoscope } from 'lucide-react';
import { MANDATORY_LEGAL_DISCLAIMER } from '@/lib/manchester';

interface Props {
  triageData: any;
  category?: string;
  patientName?: string;
  susCardNumber?: string;
  photoUrl?: string;
}

export default function MedicalReportSheet({
  triageData,
  category = 'Pele / Lesão',
  patientName = 'Cidadão Usuário do SUS',
  susCardNumber = '728.9102.3847.0019',
  photoUrl
}: Props) {
  const [activeTab, setActiveTab] = useState<'citizen' | 'clinical'>('citizen');
  const [isPrinting, setIsPrinting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    setIsPrinting(true);
    // Switch to clinical view before print
    setActiveTab('clinical');
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 250);
  };

  const c = triageData?.citizenView || (triageData?.citizenGuidance ? {
    summary: triageData.citizenGuidance.directMessage,
    whatToDo: triageData.citizenGuidance.hydrationPlan,
    homeCare: [],
    warningSignsToWatch: triageData.citizenGuidance.threeWarningSigns || []
  } : {});
  const m = triageData?.clinicalView || triageData?.clinicalTriageSummary || {};
  const signs = triageData?.flogisticSigns || {};
  const color = triageData?.manchesterColor || 'green';

  return (
    <div className="space-y-4">
      {/* Tab Switcher: Cidadão vs Médico do Posto */}
      <div className="bg-neutral-100 p-1.5 rounded-2xl flex items-center gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('citizen')}
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
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
          className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'clinical'
              ? 'bg-white text-sus-green-dark shadow-sm scale-[1.01]'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Stethoscope className="w-4 h-4 text-sus-green" />
          <span>Ficha SUS (Para o Médico)</span>
        </button>
      </div>

      {/* Action bar for PDF / Print */}
      <div className="flex items-center justify-between gap-2 bg-neutral-50 p-3 rounded-2xl border border-neutral-200">
        <span className="text-xs text-neutral-600 font-medium">
          {activeTab === 'citizen' ? 'Linguagem simples para o seu dia a dia' : 'Formato padrão para entregar na triagem'}
        </span>
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sus-blue hover:bg-sus-blue-dark text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Imprimir / Gerar PDF</span>
        </button>
      </div>

      {/* VIEW 1: Citizen Friendly View */}
      {activeTab === 'citizen' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Manchester Card */}
          <ManchesterBadge color={color} size="lg" />

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
                Cuidados em Casa (Sem Remédios):
              </h4>
              <ul className="space-y-1.5">
                {c.homeCare.map((item: string, i: number) => (
                  <li key={i} className="text-xs text-emerald-800 font-medium flex items-start gap-2">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{item}</span>
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
                Sinais de Perigo (Se aparecerem, vá à UPA imediatamente):
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
          {photoUrl && (
            <div className="border border-neutral-200 rounded-xl overflow-hidden bg-neutral-50 p-2">
              <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1.5">
                Registro Fotográfico Anexado
              </span>
              <img
                src={photoUrl}
                alt="Registro anexado da lesão"
                className="w-full aspect-square object-cover rounded-lg border border-neutral-300"
              />
            </div>
          )}

          <div className={photoUrl ? 'md:col-span-2 space-y-3' : 'md:col-span-3 space-y-3'}>
            {/* Semiotic description */}
            <div className="border border-neutral-200 rounded-xl p-3.5 bg-white">
              <span className="text-[10px] font-bold text-sus-blue uppercase block mb-1">
                Avaliação Semiológica Visual (Inspeção):
              </span>
              <p className="text-xs text-neutral-800 leading-relaxed font-medium">
                {m.semioticDescription || 'Sem alterações patológicas agudas aparentes.'}
              </p>
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

        {/* Suggested questions for doctor/nurse */}
        {m.questionsForDoctor && m.questionsForDoctor.length > 0 && (
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-200 text-xs">
            <span className="text-[10px] font-bold text-sus-blue-dark uppercase block mb-1">
              Perguntas-Chave Sugeridas para a Consulta Presencial:
            </span>
            <ul className="space-y-1 text-neutral-800 font-medium">
              {m.questionsForDoctor.map((q: string, i: number) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-sus-blue font-bold">?</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mandatory Legal Warning */}
        <div className="pt-3 border-t border-neutral-300 text-[10px] text-neutral-500 leading-normal flex items-start gap-2">
          <Shield className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-0.5" />
          <p>
            <strong>AVISO LEGAL OBRIGATÓRIO:</strong> {MANDATORY_LEGAL_DISCLAIMER} Documento gerado pelo sistema PrevineSUS para auxílio e agilização da triagem municipal.
          </p>
        </div>
      </div>
    </div>
  );
}
