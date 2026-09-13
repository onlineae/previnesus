'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  History, 
  ArrowLeft, 
  TrendingUp, 
  Pill, 
  HeartPulse, 
  Settings, 
  Key, 
  Save, 
  Trash2, 
  FolderCheck,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { storage, TriageCase, StoredPrescription, VitalsLog } from '@/lib/storage';
import TimelineComparison from '@/components/TimelineComparison';
import MedicationGrid from '@/components/MedicationGrid';
import ManchesterBadge from '@/components/ManchesterBadge';
import { MANDATORY_LEGAL_DISCLAIMER } from '@/lib/manchester';

export default function HistoryPage() {
  const [activeTab, setActiveTab] = useState<'evolution' | 'prescriptions' | 'settings'>('evolution');
  const [cases, setCases] = useState<TriageCase[]>([]);
  const [prescriptions, setPrescriptions] = useState<StoredPrescription[]>([]);
  const [selectedCase, setSelectedCase] = useState<TriageCase | null>(null);

  // Settings: API Key
  const [apiKey, setApiKey] = useState('');
  const [keySaved, setKeySaved] = useState(false);

  useEffect(() => {
    const loadedCases = storage.getCases();
    setCases(loadedCases);
    if (loadedCases.length > 0) {
      setSelectedCase(loadedCases[0]);
    }
    setPrescriptions(storage.getPrescriptions());
    setApiKey(storage.getApiKey());
  }, []);

  const handleSaveKey = (e: React.FormEvent) => {
    e.preventDefault();
    storage.setApiKey(apiKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2000);
  };

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
        <span className="text-xs font-semibold text-neutral-500">Meu Histórico SUS</span>
      </div>

      {/* Screen Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
          Histórico, Evolução de Lesões & Receitas
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed">
          Acompanhe se feridas ou manchas estão cicatrizando ao longo dos dias e consulte suas receitas ativas salvas.
        </p>
      </div>

      {/* Navigation tabs */}
      <div className="grid grid-cols-3 gap-2 bg-neutral-100 p-1.5 rounded-2xl shadow-inner text-xs sm:text-sm font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('evolution')}
          className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'evolution' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-sus-blue" />
          <span>Evolução</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('prescriptions')}
          className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'prescriptions' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
          }`}
        >
          <Pill className="w-4 h-4 text-sus-green" />
          <span>Receitas</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'settings' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
          }`}
        >
          <Settings className="w-4 h-4 text-neutral-600" />
          <span>Configuração</span>
        </button>
      </div>

      {/* TAB 1: EVOLUTION CASES */}
      {activeTab === 'evolution' && (
        <div className="space-y-6">
          {cases.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-neutral-200 shadow-sm">
              <FolderCheck className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-neutral-800">Nenhum caso em acompanhamento</h3>
              <p className="text-xs text-neutral-500 mt-1 mb-4">
                Ao tirar uma foto na triagem, você pode salvar o caso para acompanhar fotos de Dia 1, Dia 3 e Dia 7.
              </p>
              <Link
                href="/triage/photo"
                className="px-4 py-2 rounded-xl bg-sus-blue text-white font-bold text-xs shadow"
              >
                Criar Primeiro Caso
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Case selector pill buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {cases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className={`px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                      selectedCase?.id === c.id
                        ? 'bg-sus-blue text-white shadow-md shadow-sus-blue/20'
                        : 'bg-white border border-neutral-200 text-neutral-700 hover:border-sus-blue'
                    }`}
                  >
                    <span>{c.title}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-black/20 text-[10px]">
                      {c.photos.length} fotos
                    </span>
                  </button>
                ))}
              </div>

              {selectedCase && (
                <div className="p-5 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <div>
                      <h3 className="font-black text-base text-neutral-900">{selectedCase.title}</h3>
                      <span className="text-xs text-neutral-500 flex items-center gap-1.5 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Iniciado em {new Date(selectedCase.createdAt).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <Link
                      href="/triage/photo"
                      className="px-3 py-1.5 rounded-xl bg-sus-blue text-white text-xs font-bold shadow-sm hover:bg-sus-blue-dark"
                    >
                      + Nova Foto para Este Caso
                    </Link>
                  </div>

                  {/* Visual Timeline comparison */}
                  <TimelineComparison
                    photos={selectedCase.photos}
                    caseTitle={selectedCase.title}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRESCRIPTIONS */}
      {activeTab === 'prescriptions' && (
        <div className="space-y-4">
          {prescriptions.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-3xl border border-neutral-200 shadow-sm">
              <Pill className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
              <h3 className="font-bold text-sm text-neutral-800">Nenhuma receita salva</h3>
              <p className="text-xs text-neutral-500 mt-1 mb-4">
                Use o Tradutor de Receitas para decifrar a caligrafia médica e salvar sua tabela de remédios aqui.
              </p>
              <Link
                href="/triage/translator"
                className="px-4 py-2 rounded-xl bg-sus-green text-white font-bold text-xs shadow"
              >
                Decifrar Receita
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {prescriptions.map((rx) => (
                <div key={rx.id} className="p-5 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                    <span className="text-xs font-bold text-sus-green-dark">
                      Receita Médica Arquivada em {rx.date}
                    </span>
                  </div>

                  <MedicationGrid
                    medications={rx.medications}
                    dailySchedule={rx.dailySchedule}
                    importantAlerts={rx.importantAlerts}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SETTINGS / API KEY */}
      {activeTab === 'settings' && (
        <div className="p-5 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-neutral-900">Chave da API Gemini (Opcional)</h3>
              <p className="text-xs text-neutral-500">
                O app já possui um motor clínico de simulação de alta precisão do SUS. Se desejar usar sua própria chave da Gemini API para visão em tempo real, insira-a abaixo:
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveKey} className="space-y-3 pt-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Cole sua chave AIzaSy... aqui"
              className="w-full p-3 rounded-2xl border border-neutral-200 text-xs font-mono text-neutral-900 bg-neutral-50 focus:bg-white focus:border-sus-blue"
            />

            <div className="flex items-center justify-between">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-sus-blue hover:bg-sus-blue-dark text-white font-bold text-xs flex items-center gap-1.5 shadow"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Chave</span>
              </button>

              {keySaved && (
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> Chave salva com sucesso!
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-200 text-[11px] text-neutral-500 leading-relaxed">
        <strong>Aviso Legal Obrigatório:</strong> {MANDATORY_LEGAL_DISCLAIMER}
      </div>
    </div>
  );
}
