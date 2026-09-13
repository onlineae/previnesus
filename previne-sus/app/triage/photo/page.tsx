'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  RefreshCw, 
  PlusCircle, 
  FileText,
  Clock,
  HelpCircle,
  FolderPlus
} from 'lucide-react';
import Link from 'next/link';
import AudioRecorder from '@/components/AudioRecorder';
import MedicalReportSheet from '@/components/MedicalReportSheet';
import { storage, TriageCase } from '@/lib/storage';
import { MANDATORY_LEGAL_DISCLAIMER } from '@/lib/manchester';
import { callGeminiVision, analyzeImagePixels } from '@/lib/gemini';
import { VISION_TRIAGE_SYSTEM_PROMPT } from '@/lib/prompts';

const CATEGORIES = [
  { id: 'ferida', label: 'Ferida / Corte / Úlcera', icon: '🩹', desc: 'Arranhões, machucados, úlcera venosa ou pé diabético' },
  { id: 'pele', label: 'Pele / Mancha / Alergia', icon: '🔍', desc: 'Pintas novas, manchas avermelhadas, brotoejas ou coceiras' },
  { id: 'odonto', label: 'Odontologia / Dente / Boca', icon: '🦷', desc: 'Dor de dente, sangramento gengival, aftas ou inchaço no rosto' },
  { id: 'olhos', label: 'Olho Vermelho / Irritação', icon: '👁️', desc: 'Vermelhidão ocular, secreção, coceira ou ardor' }
];

export default function PhotoTriagePage() {
  const [selectedCategory, setSelectedCategory] = useState('ferida');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [userNotes, setUserNotes] = useState('');
  
  // Symptoms toggles
  const [hasPain, setHasPain] = useState(false);
  const [hasHeatOrFever, setHasHeatOrFever] = useState(false);
  const [hasPurulent, setHasPurulent] = useState(false);
  const [duration, setDuration] = useState('Menos de 3 dias');

  // Case evolution linking
  const [existingCases, setExistingCases] = useState<TriageCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('new');
  const [newCaseTitle, setNewCaseTitle] = useState('');

  // Processing state
  const [loading, setLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cases = storage.getCases();
    setExistingCases(cases);
  }, []);

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

  // Quick sample images for quick testing
  const loadSampleImage = (type: 'ferida' | 'mancha' | 'odonto') => {
    if (type === 'ferida') {
      setImageBase64('https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=600&auto=format&fit=crop&q=80');
      setSelectedCategory('ferida');
      setUserNotes('Corte superficial na perna direita há 4 dias. Borda está um pouco avermelhada e quente.');
      setHasPain(true);
      setHasHeatOrFever(true);
    } else if (type === 'odonto') {
      setImageBase64('https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=600&auto=format&fit=crop&q=80');
      setSelectedCategory('odonto');
      setUserNotes('Dente do fundo doendo muito e bochecha começou a inchar.');
      setHasPain(true);
      setHasHeatOrFever(true);
    } else {
      setImageBase64('https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=80');
      setSelectedCategory('pele');
      setUserNotes('Mancha avermelhada no braço que surgiu do nada e coça um pouco.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageBase64 && !userNotes) {
      setErrorMessage('Por favor, tire uma foto ou descreva os sintomas para que a triagem possa ser feita.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Check if attaching to previous photo for evolution
      let previousImageBase64: string | undefined;
      let previousNotes: string | undefined;

      if (selectedCaseId !== 'new') {
        const foundCase = existingCases.find(c => c.id === selectedCaseId);
        if (foundCase && foundCase.photos.length > 0) {
          const lastPhoto = foundCase.photos[foundCase.photos.length - 1];
          previousImageBase64 = lastPhoto.imageData;
          previousNotes = `${lastPhoto.dayLabel}: ${lastPhoto.notes}`;
        }
      }

      // Pre-analyze image pixels with client-side canvas before network request
      const visionMetrics = imageBase64 ? await analyzeImagePixels(imageBase64) : undefined;

      let triageData: any = null;

      try {
        const res = await fetch('/api/triage/analyze-vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64,
            userNotes,
            category: selectedCategory,
            symptoms: {
              hasPain,
              hasHeatOrFever,
              hasPurulent,
              duration
            },
            previousImageBase64,
            previousNotes,
            visionMetrics,
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
        console.warn('API endpoint not reachable, running client-side triage engine:', e);
      }

      // Standalone Android APK fallback (when static export has no Node server)
      if (!triageData) {
        const promptDetails = `
Categoria da Queixa: ${selectedCategory}
Descrição do Cidadão: "${userNotes || 'Nenhuma anotação adicional informada.'}"
Sintomas Declarados:
- Dor local relatada: ${hasPain ? 'SIM' : 'NÃO'}
- Sensação de calor/febre: ${hasHeatOrFever ? 'SIM' : 'NÃO'}
- Presença de pus ou secreção: ${hasPurulent ? 'SIM' : 'NÃO'}
- Tempo aproximado de surgimento: ${duration}
${previousImageBase64 ? `NOTA: A segunda imagem anexada é do histórico anterior (${previousNotes || 'Dia anterior'}) para análise comparativa de evolução e cicatrização.` : ''}
        `;

        const imagesToAnalyze: string[] = [];
        if (imageBase64) imagesToAnalyze.push(imageBase64);
        if (previousImageBase64) imagesToAnalyze.push(previousImageBase64);

        triageData = await callGeminiVision(
          VISION_TRIAGE_SYSTEM_PROMPT,
          promptDetails,
          imagesToAnalyze,
          storage.getApiKey(),
          visionMetrics
        );
      }

      if (triageData) {
        setTriageResult(triageData);
        saveToCaseStorage(triageData);
      } else {
        setErrorMessage('Não foi possível completar a análise. Tente novamente.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Erro ao realizar triagem. Verifique a foto e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const saveToCaseStorage = (result: any) => {
    if (!imageBase64) return;

    if (selectedCaseId !== 'new') {
      const foundCase = existingCases.find(c => c.id === selectedCaseId);
      if (foundCase) {
        const dayCount = foundCase.photos.length + 1;
        foundCase.photos.push({
          id: `p-${Date.now()}`,
          date: new Date().toLocaleDateString('pt-BR'),
          dayLabel: `Dia ${dayCount * 2 - 1}`,
          imageData: imageBase64,
          notes: userNotes,
          triageResult: result
        });
        storage.addOrUpdateCase(foundCase);
        return;
      }
    }

    // New case
    const newCase: TriageCase = {
      id: `case-${Date.now()}`,
      title: newCaseTitle || `${CATEGORIES.find(c => c.id === selectedCategory)?.label || 'Lesão'} - ${new Date().toLocaleDateString('pt-BR')}`,
      category: selectedCategory as any,
      createdAt: new Date().toISOString(),
      status: 'em_acompanhamento',
      photos: [
        {
          id: `p-${Date.now()}`,
          date: new Date().toLocaleDateString('pt-BR'),
          dayLabel: 'Dia 1 (Registro Inicial)',
          imageData: imageBase64,
          notes: userNotes,
          triageResult: result
        }
      ]
    };
    storage.addOrUpdateCase(newCase);
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
        <span className="text-xs font-semibold text-neutral-500">Módulo 1: Visão & Evolução</span>
      </div>

      {/* Screen Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
          Analisar Foto de Lesão, Pele ou Odonto
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed">
          Tire uma foto clara da região afetada. O sistema analisa sinais inflamatórios, classifica no Protocolo de Manchester e orienta se você deve ir à UPA ou ao Posto de Saúde.
        </p>
      </div>

      {!triageResult ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selector */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              1. Qual é o tipo da condição?
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-sus-blue-light/60 border-sus-blue shadow-sm ring-2 ring-sus-blue/20'
                      : 'bg-white border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="text-xl mb-1">{cat.icon}</div>
                  <h4 className="font-bold text-xs text-neutral-900">{cat.label}</h4>
                  <p className="text-[10px] text-neutral-500 line-clamp-1 mt-0.5">{cat.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Capture & Upload Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                2. Foto da região afetada
              </label>
              {/* Sample loader */}
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                <span>Testar com:</span>
                <button
                  type="button"
                  onClick={() => loadSampleImage('ferida')}
                  className="font-bold text-sus-blue hover:underline"
                >
                  Ferida
                </button>
                •
                <button
                  type="button"
                  onClick={() => loadSampleImage('odonto')}
                  className="font-bold text-sus-blue hover:underline"
                >
                  Odonto
                </button>
              </div>
            </div>

            <div className="relative">
              {imageBase64 ? (
                <div className="relative rounded-3xl overflow-hidden bg-neutral-900 border-2 border-sus-blue shadow-md aspect-video max-h-72 flex items-center justify-center">
                  <img
                    src={imageBase64}
                    alt="Foto capturada"
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
                  className="cursor-pointer border-2 border-dashed border-neutral-300 hover:border-sus-blue rounded-3xl p-6 sm:p-8 bg-white hover:bg-neutral-50 transition-all text-center flex flex-col items-center justify-center gap-3"
                >
                  <div className="w-14 h-14 rounded-2xl bg-sus-blue-light text-sus-blue flex items-center justify-center shadow-inner">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-neutral-900 block">
                      Tirar foto com o celular ou enviar imagem
                    </span>
                    <p className="text-xs text-neutral-500 mt-1">
                      Foque bem a câmera em ambiente iluminado para uma boa análise
                    </p>
                  </div>
                  <span className="px-4 py-2 rounded-xl bg-sus-blue text-white text-xs font-bold shadow-sm shadow-sus-blue/20">
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

          {/* Audio Recorder & Text Narration */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              3. Descreva o que você está sentindo
            </label>

            {/* Audio Voice Input */}
            <div className="mb-3">
              <AudioRecorder
                onTranscription={(text) => {
                  setUserNotes((prev) => (prev ? `${prev} ${text}` : text));
                }}
              />
            </div>

            {/* Textarea */}
            <textarea
              rows={3}
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Ex: Começou anteontem, sinto latejar quando ando, não tomei nada ainda..."
              className="w-full p-3.5 rounded-2xl border border-neutral-200 focus:border-sus-blue focus:ring-2 focus:ring-sus-blue/20 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 bg-white"
            />
          </div>

          {/* Quick Symptoms Checklist */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              4. Perguntas Rápidas de Triagem
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPain}
                  onChange={(e) => setHasPain(e.target.checked)}
                  className="rounded text-sus-blue focus:ring-sus-blue"
                />
                <span className="font-semibold text-neutral-800">Sente dor local?</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasHeatOrFever}
                  onChange={(e) => setHasHeatOrFever(e.target.checked)}
                  className="rounded text-sus-blue focus:ring-sus-blue"
                />
                <span className="font-semibold text-neutral-800">Local quente ou febre?</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-neutral-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPurulent}
                  onChange={(e) => setHasPurulent(e.target.checked)}
                  className="rounded text-sus-blue focus:ring-sus-blue"
                />
                <span className="font-semibold text-neutral-800">Tem pus ou secreção?</span>
              </label>
            </div>
          </div>

          {/* Evolution Case Option */}
          {existingCases.length > 0 && (
            <div className="p-4 rounded-2xl bg-sus-blue-light/40 border border-sus-blue/30 space-y-2">
              <label className="text-xs font-bold text-sus-blue-dark flex items-center gap-1.5">
                <FolderPlus className="w-4 h-4 text-sus-blue" />
                Vincular a um caso em acompanhamento? (Evolução Temporal)
              </label>
              <select
                value={selectedCaseId}
                onChange={(e) => setSelectedCaseId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-neutral-300 text-xs font-medium bg-white text-neutral-800"
              >
                <option value="new">Criar um novo caso</option>
                {existingCases.map((c) => (
                  <option key={c.id} value={c.id}>
                    Continuar: {c.title} ({c.photos.length} fotos salvas)
                  </option>
                ))}
              </select>
            </div>
          )}

          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 px-6 rounded-2xl bg-sus-blue hover:bg-sus-blue-dark active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-sus-blue/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Processando Triagem Clínica e IA...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-sus-yellow" />
                <span>Realizar Pré-Triagem com Visão Computacional</span>
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
                setTriageResult(null);
                setImageBase64(null);
                setUserNotes('');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-sus-blue hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Fazer Nova Avaliação</span>
            </button>
            <span className="text-xs text-neutral-500 font-medium">Protocolo gerado com sucesso</span>
          </div>

          {/* Dual View Report Sheet */}
          <MedicalReportSheet
            triageData={triageResult}
            category={CATEGORIES.find(c => c.id === selectedCategory)?.label || 'Lesão Cutânea'}
            photoUrl={imageBase64 || undefined}
          />
        </div>
      )}

      {/* Mandatory Disclaimer */}
      <div className="p-4 rounded-2xl bg-neutral-100 border border-neutral-200 text-[11px] text-neutral-500 leading-relaxed">
        <strong>Aviso Legal Obrigatório:</strong> {MANDATORY_LEGAL_DISCLAIMER}
      </div>
    </div>
  );
}
