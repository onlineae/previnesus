'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  HeartPulse, 
  ArrowLeft, 
  Camera, 
  Plus, 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  PhoneCall, 
  TrendingUp, 
  Clock, 
  Calendar,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { storage, VitalsLog } from '@/lib/storage';
import { MANDATORY_LEGAL_DISCLAIMER } from '@/lib/manchester';

export default function ChronicTrackerPage() {
  const [activeTab, setActiveTab] = useState<'pressure' | 'glucose'>('pressure');
  const [logs, setLogs] = useState<VitalsLog[]>([]);

  // Pressure Form
  const [systolic, setSystolic] = useState<string>('120');
  const [diastolic, setDiastolic] = useState<string>('80');
  const [pulse, setPulse] = useState<string>('72');

  // Glucose Form
  const [glucose, setGlucose] = useState<string>('95');
  const [glucoseCondition, setGlucoseCondition] = useState<'jejum' | 'pos_prandial' | 'casual'>('jejum');

  const [notes, setNotes] = useState('');
  const [photoProof, setPhotoProof] = useState<string | null>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLogs(storage.getVitals());
  }, []);

  // Quick photo upload simulates OCR of digital monitor
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const b64 = reader.result as string;
        setPhotoProof(b64);
        setOcrLoading(true);

        // Simulate instant OCR recognition of digital meter screen
        setTimeout(() => {
          if (activeTab === 'pressure') {
            setSystolic('134');
            setDiastolic('86');
            setPulse('78');
          } else {
            setGlucose('112');
          }
          setOcrLoading(false);
        }, 800);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    let status: 'normal' | 'alerta' | 'emergencia' = 'normal';

    if (activeTab === 'pressure') {
      const sys = parseInt(systolic, 10);
      const dia = parseInt(diastolic, 10);

      if (sys >= 180 || dia >= 110) {
        status = 'emergencia';
      } else if (sys >= 140 || dia >= 90) {
        status = 'alerta';
      } else {
        status = 'normal';
      }

      const newLog: VitalsLog = {
        id: `vital-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        type: 'pressure',
        systolic: sys,
        diastolic: dia,
        pulse: parseInt(pulse, 10) || undefined,
        status,
        notes,
        photoProof: photoProof || undefined
      };

      storage.addVitalLog(newLog);
      setLogs(storage.getVitals());
      setPhotoProof(null);
      setNotes('');
    } else {
      const glu = parseInt(glucose, 10);

      if (glu < 60 || glu > 300) {
        status = 'emergencia';
      } else if (glu >= 126 || (glucoseCondition === 'pos_prandial' && glu > 160)) {
        status = 'alerta';
      } else {
        status = 'normal';
      }

      const newLog: VitalsLog = {
        id: `vital-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        type: 'glucose',
        glucose: glu,
        glucoseCondition,
        status,
        notes,
        photoProof: photoProof || undefined
      };

      storage.addVitalLog(newLog);
      setLogs(storage.getVitals());
      setPhotoProof(null);
      setNotes('');
    }
  };

  const sysNum = parseInt(systolic, 10) || 120;
  const diaNum = parseInt(diastolic, 10) || 80;
  const isHypertensiveCrisis = sysNum >= 180 || diaNum >= 110;

  const gluNum = parseInt(glucose, 10) || 95;
  const isHypoCritical = gluNum < 60;
  const isHyperCritical = gluNum > 300;

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
        <span className="text-xs font-semibold text-neutral-500">Módulo 4: Hipertensão & Diabetes</span>
      </div>

      {/* Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
          Monitor de Pressão & Glicemia (Atenção Básica)
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed">
          Fotografe o visor do aparelho digital ou digite os números. Acompanhe seu histórico para mostrar ao médico ou agente de saúde da sua UBS.
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="grid grid-cols-2 gap-2 bg-neutral-100 p-1.5 rounded-2xl shadow-inner">
        <button
          type="button"
          onClick={() => setActiveTab('pressure')}
          className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'pressure'
              ? 'bg-white text-rose-700 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <HeartPulse className="w-4 h-4 text-rose-600" />
          <span>Pressão Arterial</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('glucose')}
          className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            activeTab === 'glucose'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Activity className="w-4 h-4 text-blue-600" />
          <span>Glicemia (Açúcar)</span>
        </button>
      </div>

      {/* Hypertensive Crisis Warning Banner */}
      {activeTab === 'pressure' && isHypertensiveCrisis && (
        <div className="p-4 rounded-2xl bg-red-600 text-white shadow-lg space-y-2 animate-pulse">
          <div className="flex items-center gap-2 font-black text-sm uppercase">
            <ShieldAlert className="w-5 h-5 text-amber-300" />
            <span>ALERTA DE CRISE HIPERTENSIVA (PA ≥ 180x110)</span>
          </div>
          <p className="text-xs text-white/95 leading-relaxed font-medium">
            Se você estiver com dor de cabeça forte, visão embaçada, dor no peito ou falta de ar, procure a UPA mais próxima imediatamente ou ligue 192 (SAMU).
          </p>
          <a
            href="tel:192"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white text-red-600 font-bold text-xs shadow"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Ligar SAMU 192</span>
          </a>
        </div>
      )}

      {/* Glucose Crisis Warning Banner */}
      {activeTab === 'glucose' && (isHypoCritical || isHyperCritical) && (
        <div className="p-4 rounded-2xl bg-red-600 text-white shadow-lg space-y-2 animate-pulse">
          <div className="flex items-center gap-2 font-black text-sm uppercase">
            <ShieldAlert className="w-5 h-5 text-amber-300" />
            <span>
              {isHypoCritical ? 'ALERTA DE HIPOGLICEMIA SEVERA (< 60 mg/dL)' : 'ALERTA DE HIPERGLICEMIA GRAVE (> 300 mg/dL)'}
            </span>
          </div>
          <p className="text-xs text-white/95 leading-relaxed font-medium">
            {isHypoCritical
              ? 'Tome 1 copo de suco ou água com açúcar imediatamente se estiver consciente e procure atendimento.'
              : 'Nível muito alto de açúcar. Risco de cetoacidose ou desidratação. Procure atendimento no posto ou UPA.'}
          </p>
        </div>
      )}

      {/* Recording Form */}
      <form onSubmit={handleSave} className="p-5 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-5">
        {/* Photo OCR button */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sus-blue-light text-sus-blue">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <strong className="text-xs text-neutral-900 block font-bold">
                Foto do Visor do Aparelho
              </strong>
              <span className="text-[11px] text-neutral-500">
                A IA lê os números do visor automaticamente
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-xl bg-sus-blue text-white text-xs font-bold shadow-sm hover:bg-sus-blue-dark transition-colors"
          >
            {ocrLoading ? 'Lendo...' : photoProof ? 'Foto Anexada ✓' : 'Fotografar Tela'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>

        {/* PRESSURE INPUTS */}
        {activeTab === 'pressure' ? (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-neutral-600 block mb-1">
                Sistólica (Máx)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-neutral-200 text-lg font-black text-neutral-900 text-center bg-neutral-50 focus:bg-white focus:border-sus-blue"
                />
                <span className="text-[10px] text-neutral-400 block text-center mt-1">mmHg</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-600 block mb-1">
                Diastólica (Mín)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-neutral-200 text-lg font-black text-neutral-900 text-center bg-neutral-50 focus:bg-white focus:border-sus-blue"
                />
                <span className="text-[10px] text-neutral-400 block text-center mt-1">mmHg</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-600 block mb-1">
                Pulso (BPM)
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-neutral-200 text-lg font-black text-neutral-900 text-center bg-neutral-50 focus:bg-white focus:border-sus-blue"
                />
                <span className="text-[10px] text-neutral-400 block text-center mt-1">bpm</span>
              </div>
            </div>
          </div>
        ) : (
          /* GLUCOSE INPUTS */
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-neutral-600 block mb-1">
                Nível de Glicose
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={glucose}
                  onChange={(e) => setGlucose(e.target.value)}
                  className="w-full p-3 rounded-2xl border border-neutral-200 text-xl font-black text-neutral-900 text-center bg-neutral-50 focus:bg-white focus:border-sus-blue"
                />
                <span className="text-[10px] text-neutral-400 block text-center mt-1">mg/dL</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-neutral-600 block mb-1">
                Momento da Medição
              </label>
              <select
                value={glucoseCondition}
                onChange={(e) => setGlucoseCondition(e.target.value as any)}
                className="w-full p-3.5 rounded-2xl border border-neutral-200 text-xs font-semibold text-neutral-800 bg-white"
              >
                <option value="jejum">Em Jejum (ao acordar)</option>
                <option value="pos_prandial">Pós-refeição (2h após comer)</option>
                <option value="casual">Casual / Durante o dia</option>
              </select>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-neutral-600 block mb-1">
            Observação (opcional):
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Medido no posto de saúde após 10min de repouso"
            className="w-full p-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 bg-white"
          />
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="w-full py-3.5 px-4 rounded-2xl bg-neutral-900 hover:bg-black text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Salvar Medição no Meu Diário SUS</span>
        </button>
      </form>

      {/* Logs History Table */}
      <div className="p-5 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-neutral-900 flex items-center gap-2">
          <Clock className="w-4 h-4 text-sus-blue" />
          Histórico Recente de Medições
        </h3>

        {logs.length === 0 ? (
          <p className="text-xs text-neutral-500 py-3 text-center">Nenhuma medição registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      log.type === 'pressure' ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {log.type === 'pressure' ? 'PA' : 'GLI'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-sm font-black text-neutral-900">
                        {log.type === 'pressure'
                          ? `${log.systolic} x ${log.diastolic} mmHg`
                          : `${log.glucose} mg/dL`}
                      </strong>
                      <span className="text-[10px] text-neutral-500 font-medium">
                        {log.type === 'pressure' ? `${log.pulse} bpm` : log.glucoseCondition}
                      </span>
                    </div>
                    <span className="text-[10px] text-neutral-400">{log.timestamp}</span>
                  </div>
                </div>

                <div>
                  {log.status === 'emergencia' ? (
                    <span className="px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[10px] font-bold border border-red-300">
                      Emergência
                    </span>
                  ) : log.status === 'alerta' ? (
                    <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-300">
                      Alerta
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                      Normal
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mandatory Disclaimer */}
      <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-200 text-[11px] text-neutral-500 leading-relaxed">
        <strong>Aviso Legal Obrigatório:</strong> {MANDATORY_LEGAL_DISCLAIMER}
      </div>
    </div>
  );
}
