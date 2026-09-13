'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { 
  FileText, 
  Camera, 
  Upload, 
  ArrowLeft, 
  Sparkles, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Pill, 
  Clock, 
  HelpCircle,
  FlaskConical,
  BookOpen
} from 'lucide-react';
import MedicationGrid from '@/components/MedicationGrid';
import LabGauge from '@/components/LabGauge';
import { storage } from '@/lib/storage';
import { MANDATORY_LEGAL_DISCLAIMER } from '@/lib/manchester';
import { callGeminiVision } from '@/lib/gemini';
import { PRESCRIPTION_SYSTEM_PROMPT, EXAM_SYSTEM_PROMPT } from '@/lib/prompts';

export default function TranslatorPage() {
  const [mode, setMode] = useState<'prescription' | 'exam'>('prescription');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState('');
  const [examText, setExamText] = useState('');

  const [loading, setLoading] = useState(false);
  const [prescriptionResult, setPrescriptionResult] = useState<any>(null);
  const [examResult, setExamResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const loadSample = (type: 'receita' | 'exame') => {
    if (type === 'receita') {
      setMode('prescription');
      setImageBase64('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80');
      setUserNotes('Receita do posto de saúde que o médico passou para a infecção da minha perna.');
    } else {
      setMode('exam');
      setImageBase64('https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&auto=format&fit=crop&q=80');
      setExamText('Leucócitos: 12.800 /mm³ (Ref: 4.000 a 11.000)\nGlicemia de Jejum: 108 mg/dL (Ref: 70 a 99)\nPlaquetas: 220.000 /mm³ (Ref: 150.000 a 450.000)');
      setUserNotes('Exame de sangue de rotina que peguei hoje no posto.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageBase64 && !examText && !userNotes) {
      setErrorMessage('Por favor, tire uma foto da receita ou digite os valores do exame.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      if (mode === 'prescription') {
        let result: any = null;
        try {
          const res = await fetch('/api/translate/prescription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64,
              userNotes,
              apiKey: storage.getApiKey()
            })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
              result = json.data;
            }
          }
        } catch (e) {
          console.warn('API route not reachable, running client-side prescription reader:', e);
        }

        // Standalone APK fallback
        if (!result) {
          const promptDetails = `
Solicitação: Decifrar a receita médica anexada.
Anotação complementar do paciente: "${userNotes || ''}"
Lembre-se: NÃO alterar dosagens, NÃO prescrever medicamentos novos. Criar grade de horários prática e acessível.
`;
          const imagesToAnalyze = imageBase64 ? [imageBase64] : [];
          result = await callGeminiVision(
            PRESCRIPTION_SYSTEM_PROMPT,
            promptDetails,
            imagesToAnalyze,
            storage.getApiKey()
          );
        }

        if (result) {
          setPrescriptionResult(result);
          // Save to stored prescriptions
          storage.savePrescription({
            id: `rx-${Date.now()}`,
            date: new Date().toLocaleDateString('pt-BR'),
            doctorNotesDeciphered: result.doctorNotesDeciphered,
            medications: result.medications,
            dailySchedule: result.dailySchedule,
            importantAlerts: result.importantAlerts
          });
        } else {
          setErrorMessage('Não foi possível ler a receita. Tente com outra foto mais nítida.');
        }
      } else {
        // Exam translation
        let result: any = null;
        try {
          const res = await fetch('/api/translate/exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              imageBase64,
              userNotes,
              examText,
              apiKey: storage.getApiKey()
            })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
              result = json.data;
            }
          }
        } catch (e) {
          console.warn('API route not reachable, running client-side exam translator:', e);
        }

        // Standalone APK fallback
        if (!result) {
          const promptDetails = `
Solicitação: Traduzir exame laboratorial do SUS (Hemograma, Bioquímica, Glicemia, Urina, etc.).
Texto digitado pelo paciente: "${examText || ''}"
Anotações adicionais: "${userNotes || ''}"
Lembre-se: Explicar os parâmetros em português simples, apontar status (normal/alterado/crítico) e orientar o momento adequado de retorno ao médico do posto.
`;
          const imagesToAnalyze = imageBase64 ? [imageBase64] : [];
          result = await callGeminiVision(
            EXAM_SYSTEM_PROMPT,
            promptDetails,
            imagesToAnalyze,
            storage.getApiKey()
          );
        }

        if (result) {
          setExamResult(result);
        } else {
          setErrorMessage('Não foi possível traduzir os exames.');
        }
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Erro ao processar documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
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
        <span className="text-xs font-semibold text-neutral-500">Módulo 2: Receitas & Exames</span>
      </div>

      {/* Screen Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
          Tradutor de Receitas, Exames e Laudos
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed">
          Decifre letras médicas ilegíveis, monte sua grade com os horários certos de cada remédio e entenda termos de exames de sangue sem pânico.
        </p>
      </div>

      {/* Mode Switcher */}
      <div className="grid grid-cols-2 gap-2 bg-neutral-100 p-1.5 rounded-2xl shadow-inner">
        <button
          type="button"
          onClick={() => {
            setMode('prescription');
            setPrescriptionResult(null);
            setExamResult(null);
          }}
          className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            mode === 'prescription'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Pill className="w-4 h-4 text-sus-green" />
          <span>Decifrar Receita Médica</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setMode('exam');
            setPrescriptionResult(null);
            setExamResult(null);
          }}
          className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
            mode === 'exam'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <FlaskConical className="w-4 h-4 text-sus-blue" />
          <span>Traduzir Exame de Sangue</span>
        </button>
      </div>

      {/* Main Form (when not showing result) */}
      {!prescriptionResult && !examResult ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick sample buttons */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-sus-green-light/40 border border-sus-green/30 text-xs">
            <span className="font-semibold text-sus-green-dark">Quer testar rapidamente?</span>
            <button
              type="button"
              onClick={() => loadSample(mode === 'prescription' ? 'receita' : 'exame')}
              className="px-3 py-1 rounded-xl bg-sus-green text-white font-bold text-xs shadow-sm hover:bg-sus-green-dark transition-colors"
            >
              Carregar Exemplo de {mode === 'prescription' ? 'Receita' : 'Exame'}
            </button>
          </div>

          {/* Photo Capture & Upload Box */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Fotografe o papel {mode === 'prescription' ? 'da receita' : 'do exame ou laudo'}
            </label>

            <div className="relative">
              {imageBase64 ? (
                <div className="relative rounded-3xl overflow-hidden bg-neutral-900 border-2 border-sus-green shadow-md aspect-video max-h-72 flex items-center justify-center">
                  <img
                    src={imageBase64}
                    alt="Documento médico"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setImageBase64(null)}
                    className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/70 hover:bg-black text-white text-xs font-bold backdrop-blur-md transition-colors"
                  >
                    Trocar Foto
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="cursor-pointer border-2 border-dashed border-neutral-300 hover:border-sus-green rounded-3xl p-6 sm:p-8 bg-white hover:bg-neutral-50 transition-all text-center flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-sus-green-light text-sus-green flex items-center justify-center shadow-inner">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 block">
                      Tirar foto da receita ou do laudo impresso
                    </span>
                    <p className="text-xs text-neutral-500 mt-1">
                      Mantenha o papel plano e com boa iluminação
                    </p>
                  </div>
                  <span className="px-4 py-2 rounded-xl bg-sus-green text-white text-xs font-bold shadow-sm shadow-sus-green/20">
                    Abrir Câmera / Galeria
                  </span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          </div>

          {/* If Exam Mode: Text input option */}
          {mode === 'exam' && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Ou digite os parâmetros do exame (opcional):
              </label>
              <textarea
                rows={3}
                value={examText}
                onChange={(e) => setExamText(e.target.value)}
                placeholder="Ex: Leucócitos 12.500, Glicemia 110, Plaquetas 200.000..."
                className="w-full p-3.5 rounded-2xl border border-neutral-200 focus:border-sus-blue focus:ring-2 focus:ring-sus-blue/20 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 bg-white"
              />
            </div>
          )}

          {/* Notes input */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Observações ou dúvidas específicas:
            </label>
            <input
              type="text"
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Ex: Médico mandou tomar em jejum mas esqueci a dosagem..."
              className="w-full p-3.5 rounded-2xl border border-neutral-200 focus:border-sus-blue focus:ring-2 focus:ring-sus-blue/20 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 bg-white"
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
            className="w-full py-4 px-6 rounded-2xl bg-sus-green hover:bg-sus-green-dark active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-sus-green/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Decifrando caligrafia e organizando horários...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-sus-yellow" />
                <span>
                  {mode === 'prescription' ? 'Decifrar Receita e Gerar Horários' : 'Traduzir Laudo de Exames'}
                </span>
              </>
            )}
          </button>
        </form>
      ) : (
        /* Results View */
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setPrescriptionResult(null);
                setExamResult(null);
                setImageBase64(null);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sus-green hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Decifrar Outro Documento</span>
            </button>
            <span className="text-xs text-neutral-500 font-medium">Processado com sucesso</span>
          </div>

          {/* PRESCRIPTION RESULT */}
          {prescriptionResult && (
            <div className="space-y-6">
              {/* Deciphered Raw Note Card */}
              {prescriptionResult.doctorNotesDeciphered && (
                <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 text-xs">
                  <span className="text-[10px] font-bold text-neutral-500 uppercase block mb-1">
                    Transcrição Fiel da Letra do Médico:
                  </span>
                  <pre className="font-mono text-neutral-800 whitespace-pre-wrap leading-relaxed">
                    {prescriptionResult.doctorNotesDeciphered}
                  </pre>
                </div>
              )}

              {/* Medication Interactive Grid */}
              <MedicationGrid
                medications={prescriptionResult.medications}
                dailySchedule={prescriptionResult.dailySchedule}
                importantAlerts={prescriptionResult.importantAlerts}
              />
            </div>
          )}

          {/* EXAM RESULT */}
          {examResult && (
            <div className="space-y-6">
              <LabGauge
                items={examResult.items}
                urgencyToReturn={examResult.urgencyToReturn}
                urgencyRecommendation={examResult.urgencyRecommendation}
                generalSummary={examResult.generalSummary}
              />
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
