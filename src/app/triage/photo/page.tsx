'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowLeft, 
  RefreshCw, 
  Trash2,
  ShieldCheck,
  Key,
  Check,
  FolderOpen
} from 'lucide-react';
import Link from 'next/link';
import AudioRecorder from '@/components/AudioRecorder';
import MedicalReportSheet from '@/components/MedicalReportSheet';
import { storage, TriageCase } from '@/lib/storage';
import { callGeminiVision } from '@/lib/gemini';
import { VISION_TRIAGE_SYSTEM_PROMPT } from '@/lib/prompts';

const CATEGORIES = [
  { id: 'ferida', label: 'Ferida / Corte / Úlcera', icon: '🩹', desc: 'Arranhões, machucados, úlcera venosa ou pé diabético' },
  { id: 'pele', label: 'Pele / Mancha / Alergia', icon: '🔍', desc: 'Pintas novas, manchas avermelhadas, brotoejas ou coceiras' },
  { id: 'odonto', label: 'Odontologia / Dente / Boca', icon: '🦷', desc: 'Dor de dente, sangramento gengival, aftas ou inchaço no rosto' },
  { id: 'olhos', label: 'Olho Vermelho / Irritação', icon: '👁️', desc: 'Vermelhidão ocular, secreção, coceira ou ardor' }
];

// 6 Casos Clínicos Reais solicitados pelo usuário com imagens PNG reais para teste imediato da IA
const CLINICAL_EXAMPLES = [
  {
    id: 'rachadura_basica',
    title: '🟢 Pé Diabético: Rachadura Básica',
    badge: 'Baixo Risco (Cuidados em Casa)',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    category: 'ferida',
    notes: 'Sou diabético, tenho rachaduras secas e grossas no calcanhar há 2 semanas. Não tem sangramento, não dói, sem pus e sem febre.',
    hasPain: false,
    hasHeatOrFever: false,
    hasPurulent: false,
    duration: 'Mais de 1 semana',
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABaCAIAAAD8YgW4AAAA8UlEQVR4nO3YQQ0CQRBFwZWIDbzgBSV4QQI3DCzZGV5X8gT8VJ9mjvfrqQs6li8YEmjQrUCDbgUadCvQoFuBBt0KNOhWoEG3Ag26FWjQrUCDbgUadCvQoFvtC/24374tHwP6b9oUOqYMejZ0T7kGvfOFtoNOKoOeCn0GCzTozaBPSoEGDRo0aNCgQYMGPRK6bQ16JHT4FQ56KnTVekfo5K806NnQPWvQoEGDBg0a9PIFoEGDBr1cGTTo1Qt+LgV6rjLowdAnAz1aGTRo0DsHWqBBxwINuhVo0K1Ag24FGnQr0KBbgQbdCjToVqBBtwJ9UR8CQcqVkpz+aQAAAABJRU5ErkJggg=='
  },
  {
    id: 'rachadura_media',
    title: '🟡 Pé Diabético: Rachadura Média',
    badge: 'Médio Risco (Posto de Saúde UBS)',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    category: 'ferida',
    notes: 'Sou diabético, abriu uma fissura mais funda no calcanhar que dói ao pisar e saiu um pouco de sangue hoje. Sem febre e sem pus.',
    hasPain: true,
    hasHeatOrFever: false,
    hasPurulent: false,
    duration: '1 a 3 dias',
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABaCAIAAAD8YgW4AAABDUlEQVR4nO3aQRHCMBCG0SqpWERgAwc4QEQdIIE7F9LJNJv8vJlPQPYdN7u9Xw8NaCt/wZ8EGnRWoEFnBRp0VqBBZwUadFagQWcFGnRWM0If91t/5VOABg0aNGjQF0A/9/0r0JdAn7IunwI06AboduvyKUCDboNutC6fAjToZugW6/IpQIMGDRo0aNCgQYMGDRo06PWh7TpAB0HbR4MOgvZnOALauQHoIOhTyqBBz1S/MmjQM9WvDBr0TIEGDRo0aNCgQYMGDRr0KtB2HaDjoO2jQcdB+zMcB+3cAHQctEsl0HHQrklBx0G7+AcNurpVoX9WPgVo0KBBgwYt0KCTAw06K9CgswINOivQg/oA6ElaA81Buk8AAAAASUVORK5CYII='
  },
  {
    id: 'diabetico_grave',
    title: '🔴 Pé Diabético: Úlcera Grave c/ Pus',
    badge: 'Alto Risco (UPA 24h Imediata)',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    category: 'ferida',
    notes: 'Sou diabético, ferida profunda aberta na sola do pé com secreção amarelada de pus abundante, pé quente, inchado e febre de 38.5°C.',
    hasPain: true,
    hasHeatOrFever: true,
    hasPurulent: true,
    duration: 'Hoje',
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABaCAIAAAD8YgW4AAACD0lEQVR4nO3dsVEEMQyFYdq4coivThLaICYmJqEOKmDYtaX3nnb/GxVgfaPRzHlt+eXn450QxIt9BTeJXOjv53Mt7CsfAL2Mm4+eAl1OnMZthm71jRK3QYuJ7dwGaCOxkVsNbfd1Weug7axebhG0XdNurYC2OyZY90Lb+XK4G6HtalHWXdBVab89Hscj2boFWonbhD4A2k5cxX1N6HLife5o6DTiTe5Q6GRlu3UZdL6y19oDbSFe5g6CnqVssS6Anqist5ZC22V3rM3Qc8tZXNQ66GWLr8/XIxFe1FvQ3coHife5BdYKaA3xJvcdoTeV16xzoTuUS4iXuVutg6DLlc9aJ0JPUc6xBno+dIhyh/VIaIHyKesg6Nq+cZDp8fdPD71gbYbeVy63HgZdVc7/Ep/iNnYPJ3RJLZ+ta6B3lQuL+l7QC8pHrIEGGmiggQYaaKCBBhpooPeh+WfIXsc0aHbvCqDZj86C5gtLUPeoCmPfiIDmK7iue3CuA2g39CDrBOUsaE6TSq05H62D5sT/IjR3WLiVJVLmnuGce4bcnE2ETrOWlTPTDUTKzOsQKTOBZiD0CGuXMlPCRMrMvRMpB0E3ce8sJh2a2aQ6aKbt6qCZH62DnmjdR8GM/3ZiHXS+tUCAd1iu9Q5LJrcycd7Kui60nduSL+8Z3gNaI27PLgi6idueUSh0Cbp95cOgLxa//uAUWCQOcLEAAAAASUVORK5CYII='
  },
  {
    id: 'joelho_ralado',
    title: '🟢 Ferimento Leve: Joelho Ralado',
    badge: 'Baixo Risco (Cuidados em Casa)',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    category: 'ferida',
    notes: 'Caí na calçada e ralei o joelho esquerdo. Arranhão superficial na pele, arde ao tocar, mas sem sangramento ativo e sem pus.',
    hasPain: true,
    hasHeatOrFever: false,
    hasPurulent: false,
    duration: 'Hoje',
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABaCAIAAAD8YgW4AAABfUlEQVR4nO3csQ0CMRBEUTq9hiiCNqiEIkiIiegAjM/eGY+/9GNkP60uuLO5vB93KugiX8EmAQ10VkADnRXQQGcFNNBZAQ10VkADnRXQQGcFNNBZuUO/btf25KtdD/ov3yXE7aBPEttyG0EPJDbkdoGepOxjrYeeSuzDLYYuU5ZbK6GLlbXWMmiJstBaAy1UVlkLoDtcnsfxPX9ra+ifvmfEw6GnKjtbl0LPJu7g3hd6iHK7dSB0sbKbtRH0cOVG6yhoyThbDbUL9CRln6G2gJ6q3GIdAq0dZ5OhBnob6AJlh6cH0EADDTTQQAMNNNBAAw000ECroXnXAfRq0A5PD62yCzRfWOqg+WZYZx08zl7QnOtY1dpH2RGas3el1pwmdbf2VHaHbhfv+M18aO6w7GIt2S/3DDeA5uZsprV2m3roAm757oyg+b+Ohbnle7GGHsItX/8y0H3i8tUuDB0T0EBnBTTQWQENdFZAA50V0EBnBTTQWQENdFZAA53VBwQpRAfTo4HcAAAAAElFTkSuQmCC'
  },
  {
    id: 'queda_moto',
    title: '🔴 Ferimento Grave: Queda de Moto',
    badge: 'Alto Risco (UPA 24h Imediata)',
    badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
    category: 'ferida',
    notes: 'Acidente de moto há 30 minutos. Ferida muito profunda, aberta e completamente exposta no braço com sangramento contínuo e dor severa.',
    hasPain: true,
    hasHeatOrFever: false,
    hasPurulent: false,
    duration: 'Hoje',
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABaCAIAAAD8YgW4AAABuElEQVR4nO3cwXEDMQxDUXfgs3txiSnHleSSSnJPBxlZSwIQ/WdQwPINLrYo3X6/X0SQm/0LPiRAAz0rQAM9K0ADPStAAz0rQAM9K0ADPStAAz0ridA/z+f12KdIhC6RDXd3Qgt8c8QN0BZfu7gU2o5r5BZB20Ht3O3QdsQQ7kZoO1wUdwt0+fCvx+P/5HPXQwtYV5JmXQxt960VD4WO8q0Sz4IOJ07gLoA+hfgi93nQduU9azO0gPjrfl+JgNsG3ae8iFuCrrHeh25Svki8xy2wVkDriTe4Q6FrlZuI3+Vute6FDlEutxZBF9ZZprxo3VfqRug05VrrduiqOluUV6ybSt0FnVlnY6k90EblwlIDDTTQQAMNNNBAAw000COh+WVYBp1c6hLldujTS22pM/9Hi+rMCYuozpwZiurMKbhImb2Ot5UN0Gwq6aDZvdNBs02aC51gvfHNfmg2/nXQR3C7iOuhuZWlg+aeoQ6am7M66CZuTZo0eN2gnVgEfQS3QIAXaESz86bSXGivuGtY3r37JOgOd/sUB0CPDNBAzwrQQM8K0EDPCtBAzwrQQM8K0EDPCtBAz8ofyOD4qEQ3qJEAAAAASUVORK5CYII='
  },
  {
    id: 'manchas_pele',
    title: '🟡 Pele: Manchas Avermelhadas',
    badge: 'Médio Risco (Posto de Saúde UBS)',
    badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
    category: 'pele',
    notes: 'Apareceram manchas avermelhadas e ásperas nos braços e tronco há 3 dias com coceira. Sem febre, sem falta de ar e sem inchaço no rosto.',
    hasPain: false,
    hasHeatOrFever: false,
    hasPurulent: false,
    duration: '1 a 3 dias',
    image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAABaCAIAAAD8YgW4AAABYElEQVR4nO3ayw3CQBAEUUfnsImEs4PwiQgQkplPT09JFcDOM14Qu8f9flFBR/sKlgQ00F4BDbRXQAPtFdBAewU00F4BDbRXQAPt1Ubo6zy/BXSFcqr1IuifxKncQAPdp5xhvQL6gXK4dR1017fQIujezXELdPvmuAJaYUKRZSRCPx4vfEiFNWRB/6kcO2f7ArKgQ5QDRwUaaA3lXutYli3Q7T/ngQY6Z+Z64qXQPics+tAtAQ000OLQmk/OB1r8XTGB1t+Xxv/XUfnS7IUufm/koGs+aIHKBdZTT1jClbOtp54ZAh0g0qWcaj3vXkeqcp71vJtKQKs8MKBnKCdZAw000EADDTTQ7XZAKwY00EADDbR0E5WBBhpohcYpT4XmzBBoO2judUy1zl7qbOjtd+8GcZet0AR64/3o9qR8naE1Axpor4AG2iuggfYKaKC9Ahpor4AG2iuggfYKaKC9+gAA6Uu/qL+x6QAAAABJRU5ErkJggg=='
  }
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

  // Anti-cache & Privacy settings
  const [saveToHistory, setSaveToHistory] = useState(false);
  const [trashFeedback, setTrashFeedback] = useState<string | null>(null);

  // Case evolution linking
  const [existingCases, setExistingCases] = useState<TriageCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('new');
  const [newCaseTitle, setNewCaseTitle] = useState('');

  // Processing state
  const [loading, setLoading] = useState(false);
  const [triageResult, setTriageResult] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);

  // Active example tracking
  const [activeExampleId, setActiveExampleId] = useState<string | null>(null);

  // API Key drawer
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [customKey, setCustomKey] = useState('');
  const [savedKeySuccess, setSavedKeySuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const cases = storage.getCases();
    setExistingCases(cases);
    setCustomKey(storage.getApiKey());
  }, []);

  // Safe client-side image downscaler for large smartphone photos before sending to API
  const compressImage = async (dataUrl: string, maxDim = 1024, quality = 0.82): Promise<string> => {
    if (!dataUrl || typeof window === 'undefined') return dataUrl;
    if (dataUrl.length < 400 * 1024) return dataUrl;
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.onload = () => {
          try {
            let w = img.naturalWidth || img.width;
            let h = img.naturalHeight || img.height;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', quality));
              return;
            }
          } catch {
            // fallback
          }
          resolve(dataUrl);
        };
        img.onerror = () => resolve(dataUrl);
        img.src = dataUrl;
      } catch {
        resolve(dataUrl);
      }
    });
  };

  // Instant preview handler with native FileReader
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        if (typeof result === 'string') {
          setImageBase64(result);
          setActiveExampleId(null);
          setTrashFeedback(null);
          setErrorMessage(null);
        }
      };
      reader.onerror = () => {
        setErrorMessage('Erro ao ler a foto selecionada. Tente novamente.');
      };
      reader.readAsDataURL(file);
    }
    // Always clear target value so re-selecting the exact same image triggers onChange
    e.target.value = '';
  };

  // Clipboard Paste Support (Ctrl + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === 'string') {
                setImageBase64(reader.result);
                setActiveExampleId(null);
                setTrashFeedback(null);
                setErrorMessage(null);
              }
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageBase64(reader.result);
          setActiveExampleId(null);
          setTrashFeedback(null);
          setErrorMessage(null);
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleSelectClinicalExample = (ex: typeof CLINICAL_EXAMPLES[0]) => {
    setImageBase64(ex.image);
    setSelectedCategory(ex.category);
    setUserNotes(ex.notes);
    setHasPain(ex.hasPain);
    setHasHeatOrFever(ex.hasHeatOrFever);
    setHasPurulent(ex.hasPurulent);
    setDuration(ex.duration);
    setActiveExampleId(ex.id);
    setTrashFeedback(null);
    setErrorMessage(null);
  };

  const handleDiscardCurrentPhoto = () => {
    setImageBase64(null);
    setActiveExampleId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    setTrashFeedback('Foto removida.');
    setTimeout(() => setTrashFeedback(null), 2500);
  };

  const handleWipeAllHistory = () => {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm('Deseja realmente apagar todo o histórico de fotos e triagens salvas? Essa ação não pode ser desfeita.');
      if (confirmed) {
        storage.clearAll();
        setImageBase64(null);
        setUserNotes('');
        setExistingCases([]);
        setTriageResult(null);
        setActiveExampleId(null);
        setTrashFeedback('Todo o histórico local foi excluído com segurança.');
        setTimeout(() => setTrashFeedback(null), 3000);
      }
    }
  };

  const handleSaveApiKey = () => {
    storage.setApiKey(customKey.trim());
    setSavedKeySuccess(true);
    setTimeout(() => {
      setSavedKeySuccess(false);
      setShowKeyModal(false);
    }, 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageBase64 && !userNotes) {
      setErrorMessage('Por favor, tire/envie uma foto ou descreva o que está sentindo.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      // Compress large phone photo to ~120KB JPEG before sending so network upload is instant and never hits 413
      let processedImage = imageBase64;
      if (imageBase64) {
        processedImage = await compressImage(imageBase64, 1024, 0.82);
      }

      let previousImageBase64: string | undefined;
      let previousNotes: string | undefined;

      if (selectedCaseId !== 'new') {
        const foundCase = existingCases.find(c => c.id === selectedCaseId);
        if (foundCase && foundCase.photos.length > 0) {
          const lastPhoto = foundCase.photos[foundCase.photos.length - 1];
          previousImageBase64 = await compressImage(lastPhoto.imageData, 800, 0.75);
          previousNotes = `Registro anterior em ${lastPhoto.date} (${lastPhoto.dayLabel}): "${lastPhoto.notes}"`;
        }
      }

      let triageData: any = null;

      // 1. Try server API route (fast ~2-4s with gemini-3.5-flash-lite)
      try {
        const response = await fetch('/api/triage/analyze-vision', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: processedImage,
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
            apiKey: storage.getApiKey()
          })
        });

        if (response.ok) {
          const json = await response.json();
          if (json.success && json.data) {
            triageData = json.data;
          }
        }
      } catch (e) {
        console.warn('API endpoint not reachable, running client-side triage engine:', e);
      }

      // 2. Standalone Android APK fallback or if API failed
      if (!triageData) {
        const promptDetails = `
Categoria da Queixa: ${selectedCategory}
Descrição do Cidadão: "${userNotes || 'Nenhuma anotação adicional informada.'}"
Sintomas Declarados pelo Paciente:
- Sente dor no local: ${hasPain ? 'SIM' : 'NÃO'}
- Local quente ou febre: ${hasHeatOrFever ? 'SIM' : 'NÃO'}
- Presença de pus ou secreção: ${hasPurulent ? 'SIM' : 'NÃO'}
- Tempo aproximado de surgimento: ${duration}
${previousImageBase64 ? `NOTA: A segunda imagem anexada é do histórico anterior (${previousNotes || 'Dia anterior'}) para análise comparativa de evolução e cicatrização.` : ''}
        `;

        const imagesToAnalyze: string[] = [];
        if (processedImage) imagesToAnalyze.push(processedImage);
        if (previousImageBase64) imagesToAnalyze.push(previousImageBase64);

        triageData = await callGeminiVision(
          VISION_TRIAGE_SYSTEM_PROMPT,
          promptDetails,
          imagesToAnalyze,
          storage.getApiKey()
        );
      }

      if (triageData) {
        setTriageResult(triageData);
        if (saveToHistory) {
          saveToCaseStorage(triageData);
        }
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
        setExistingCases(storage.getCases());
        return;
      }
    }

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
    setExistingCases(storage.getCases());
  };

  return (
    <div className="space-y-6">
      {/* Hidden native inputs with specific IDs for native HTML label activation */}
      <input
        id="main-photo-picker"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="sr-only"
      />
      <input
        id="camera-photo-picker"
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageUpload}
        className="sr-only"
      />

      {/* Header Back Link & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-neutral-600 hover:text-sus-blue transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar ao Início</span>
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowKeyModal(!showKeyModal)}
            className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-bold border border-neutral-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Key className="w-3.5 h-3.5 text-sus-blue" />
            <span>Chave Gemini IA</span>
          </button>
          <button
            type="button"
            onClick={handleWipeAllHistory}
            className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
            title="Esvazia todo o cache e histórico salvo no aparelho"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Lixeira</span>
          </button>
        </div>
      </div>

      {/* Key Drawer / Modal */}
      {showKeyModal && (
        <div className="p-4 rounded-2xl bg-white border-2 border-sus-blue shadow-lg space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-neutral-900 uppercase flex items-center gap-1.5">
              <Key className="w-4 h-4 text-sus-blue" />
              Configuração da Chave da IA (Gemini API)
            </h3>
            <button
              type="button"
              onClick={() => setShowKeyModal(false)}
              className="text-xs font-bold text-neutral-400 hover:text-neutral-700 cursor-pointer"
            >
              Fechar ✕
            </button>
          </div>
          <p className="text-[11px] text-neutral-600 leading-relaxed">
            Sua chave oficial está configurada e ativa com gemini-3.5-flash-lite. Caso queira usar outra chave gratuita do Google AI Studio, insira abaixo:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={customKey}
              onChange={(e) => setCustomKey(e.target.value)}
              placeholder="Cole sua chave da API Gemini aqui..."
              className="flex-1 p-2 rounded-xl border border-neutral-300 text-xs font-mono"
            />
            <button
              type="button"
              onClick={handleSaveApiKey}
              className="px-4 py-2 rounded-xl bg-sus-blue hover:bg-sus-blue-dark text-white text-xs font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              {savedKeySuccess ? <Check className="w-3.5 h-3.5" /> : null}
              <span>{savedKeySuccess ? 'Salvo!' : 'Salvar'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Feedback Alert for Trash/Cleaning */}
      {trashFeedback && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{trashFeedback}</span>
        </div>
      )}

      {/* Screen Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
          Pré-Triagem com IA: Machucados, Pele & Pé Diabético
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed">
          Tire ou envie uma foto da região afetada. O motor de inteligência artificial analisa a gravidade, classifica nas cores do Protocolo de Manchester e indica o local correto (Casa, UBS ou UPA).
        </p>

        {/* Manchester & SUS Triage Quick Guide */}
        <div className="mt-3 p-3 rounded-2xl bg-neutral-50 border border-neutral-200 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-950 border border-emerald-300">
            <div className="flex items-center justify-between mb-1">
              <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[10px] uppercase">
                🟢 BAIXO RISCO
              </span>
              <span className="font-extrabold text-emerald-800 text-[10px]">🛑 NÃO VÁ À UPA</span>
            </div>
            <span className="font-bold block text-xs text-emerald-900 mt-1">Cuidados em Casa ou UBS</span>
            <span className="text-[10px] text-emerald-700 leading-tight block mt-0.5">
              Joelho ralado, escoriação superficial, rachadura seca no pé diabético. Evite esperar horas na fila da UPA!
            </span>
          </div>

          <div className="p-3 rounded-xl bg-amber-50 text-amber-950 border border-amber-300">
            <div className="flex items-center justify-between mb-1">
              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-neutral-950 font-black text-[10px] uppercase">
                🟡 MÉDIO RISCO
              </span>
              <span className="font-extrabold text-amber-800 text-[10px]">⚠️ POSTO OU SUTURA</span>
            </div>
            <span className="font-bold block text-xs text-amber-900 mt-1">Posto de Saúde (UBS) ou UPA até 60 min</span>
            <span className="text-[10px] text-amber-700 leading-tight block mt-0.5">
              Corte que precisa de pontos nas primeiras 6h ou fissura de pé diabético dolorosa ao pisar.
            </span>
          </div>

          <div className="p-3 rounded-xl bg-rose-50 text-rose-950 border border-rose-300">
            <div className="flex items-center justify-between mb-1">
              <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[10px] uppercase">
                🔴 ALTO RISCO
              </span>
              <span className="font-extrabold text-rose-800 text-[10px]">🚨 VÁ À UPA AGORA</span>
            </div>
            <span className="font-bold block text-xs text-rose-900 mt-1">UPA 24h ou SAMU 192 (Imediato)</span>
            <span className="text-[10px] text-rose-700 leading-tight block mt-0.5">
              Queda de moto com ferida exposta, hemorragia ativa, necrose preta no pé diabético ou pus com febre.
            </span>
          </div>
        </div>
      </div>

      {!triageResult ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Quick 1-Click Clinical Cases for Instant Testing */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-50/80 via-white to-indigo-50/80 border border-blue-200 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-sus-blue uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sus-blue" />
                Casos Clínicos para Teste Imediato da IA (1 Clique):
              </span>
              <span className="text-[10px] text-neutral-500 font-semibold">Clique para carregar e testar</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {CLINICAL_EXAMPLES.map((ex) => (
                <button
                  key={ex.id}
                  type="button"
                  onClick={() => handleSelectClinicalExample(ex)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                    activeExampleId === ex.id
                      ? 'bg-sus-blue text-white border-sus-blue shadow-md scale-[1.01]'
                      : 'bg-white hover:bg-neutral-50 border-neutral-200 hover:border-blue-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-neutral-100 border border-black/10">
                    <img src={ex.image} alt={ex.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className={`text-[11px] font-bold block truncate ${activeExampleId === ex.id ? 'text-white' : 'text-neutral-900'}`}>
                      {ex.title}
                    </span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded inline-block mt-0.5 ${
                      activeExampleId === ex.id ? 'bg-white/20 text-white' : ex.badgeColor
                    }`}>
                      {ex.badge}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

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
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer active:scale-98 ${
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

          {/* Photo Capture & Upload Area */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-700 uppercase tracking-wider">
                2. Foto da região afetada (Câmera ou Arquivo)
              </label>
              {imageBase64 && (
                <button
                  type="button"
                  onClick={handleDiscardCurrentPhoto}
                  className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Descartar Foto</span>
                </button>
              )}
            </div>

            {/* If Photo is Selected: Show Full Preview with Actions */}
            {imageBase64 ? (
              <div className="relative rounded-3xl overflow-hidden bg-neutral-900 border-2 border-sus-blue shadow-md aspect-video max-h-80 flex items-center justify-center">
                <img
                  src={imageBase64}
                  alt="Foto da lesão selecionada"
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-[11px] font-black uppercase shadow-md flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Foto Pronta para IA</span>
                  </span>
                </div>
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <label
                    htmlFor="camera-photo-picker"
                    className="px-3.5 py-2 rounded-full bg-sus-blue hover:bg-sus-blue-dark text-white text-xs font-bold shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Trocar Foto</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleDiscardCurrentPhoto}
                    className="px-3.5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Descartar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Native HTML Label Card - Tapping ANYWHERE triggers OS file picker natively */}
                <label
                  htmlFor="main-photo-picker"
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center flex flex-col items-center justify-center gap-3.5 cursor-pointer transition-all block select-none ${
                    isDragging
                      ? 'border-sus-blue bg-sus-blue-light/50 scale-[1.01]'
                      : 'border-neutral-300 hover:border-sus-blue bg-white hover:bg-neutral-50 shadow-sm'
                  }`}
                >
                  <div className="w-16 h-16 rounded-2xl bg-sus-blue-light text-sus-blue flex items-center justify-center shadow-inner mx-auto">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <span className="text-base sm:text-lg font-black text-neutral-900 block">
                      Tirar Foto com a Câmera ou Enviar da Galeria
                    </span>
                    <p className="text-xs text-neutral-500 mt-1">
                      Clique em qualquer lugar deste quadro para escolher uma foto no celular ou computador
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                    <span className="px-6 py-3 rounded-xl bg-sus-blue text-white text-xs font-bold shadow-md shadow-sus-blue/25 inline-flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      <span>Selecionar Foto da Lesão</span>
                    </span>
                  </div>
                </label>

                {/* Direct Action Labels for Mobile & Desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <label
                    htmlFor="camera-photo-picker"
                    className="p-3.5 rounded-2xl bg-white border border-neutral-300 hover:border-sus-blue text-neutral-800 font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:bg-neutral-50 active:scale-98 transition-all select-none text-center"
                  >
                    <Camera className="w-4 h-4 text-sus-blue" />
                    <span>📸 Tirar Foto com a Câmera</span>
                  </label>

                  <label
                    htmlFor="main-photo-picker"
                    className="p-3.5 rounded-2xl bg-white border border-neutral-300 hover:border-sus-blue text-neutral-800 font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer hover:bg-neutral-50 active:scale-98 transition-all select-none text-center"
                  >
                    <FolderOpen className="w-4 h-4 text-sus-blue" />
                    <span>📁 Escolher Arquivo da Galeria</span>
                  </label>
                </div>

                {/* Native Direct File Input Bar (100% Reliable Fallback for any browser) */}
                <div className="p-3 rounded-2xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-neutral-600">Ou use o botão padrão do sistema:</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="text-xs text-neutral-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-sus-blue file:text-white hover:file:bg-sus-blue-dark cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Privacy & Anti-Cache Controls */}
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-bold text-emerald-900 block">
                  {saveToHistory ? 'Histórico Ativado' : 'Privacidade & Sem Cache Ativo (Padrão)'}
                </span>
                <span className="text-[11px] text-emerald-700 leading-tight block">
                  {saveToHistory 
                    ? 'A foto e a triagem serão salvas localmente neste aparelho para comparar evolução.'
                    : 'A foto fica apenas na memória temporária e NÃO fica guardada no cache do navegador.'
                  }
                </span>
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer select-none bg-white px-3 py-1.5 rounded-xl border border-emerald-300 flex-shrink-0 shadow-sm">
              <input
                type="checkbox"
                checked={saveToHistory}
                onChange={(e) => setSaveToHistory(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-bold text-neutral-800 text-xs">Salvar no Histórico</span>
            </label>
          </div>

          {/* Audio Recorder & Text Narration */}
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              3. Descreva o que aconteceu ou o que você sente
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
              placeholder="Ex: Sou diabético, apareceu rachadura no calcanhar que dói ao pisar..."
              className="w-full p-3.5 rounded-2xl border border-neutral-200 focus:border-sus-blue focus:ring-2 focus:ring-sus-blue/20 text-xs sm:text-sm text-neutral-900 placeholder:text-neutral-400 bg-white"
            />
          </div>

          {/* Quick Symptoms Checklist */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-3">
            <span className="text-xs font-bold text-neutral-700 uppercase tracking-wider block">
              4. Perguntas Rápidas de Triagem
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-neutral-200 cursor-pointer hover:border-neutral-300 select-none">
                <input
                  type="checkbox"
                  checked={hasPain}
                  onChange={(e) => setHasPain(e.target.checked)}
                  className="rounded text-sus-blue focus:ring-sus-blue"
                />
                <span className="font-semibold text-neutral-800">Sente dor local?</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-neutral-200 cursor-pointer hover:border-neutral-300 select-none">
                <input
                  type="checkbox"
                  checked={hasHeatOrFever}
                  onChange={(e) => setHasHeatOrFever(e.target.checked)}
                  className="rounded text-sus-blue focus:ring-sus-blue"
                />
                <span className="font-semibold text-neutral-800">Local quente ou febre?</span>
              </label>

              <label className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-neutral-200 cursor-pointer hover:border-neutral-300 select-none">
                <input
                  type="checkbox"
                  checked={hasPurulent}
                  onChange={(e) => setHasPurulent(e.target.checked)}
                  className="rounded text-sus-blue focus:ring-sus-blue"
                />
                <span className="font-semibold text-neutral-800">Presença de pus/secreção?</span>
              </label>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs font-bold text-neutral-600">Tempo de surgimento:</span>
              <div className="flex flex-wrap gap-1.5">
                {['Menos de 24h', '1 a 3 dias', 'Mais de 1 semana', 'Crônico / Semanas'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuration(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      duration === d
                        ? 'bg-sus-blue text-white border-sus-blue'
                        : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-sus-blue hover:bg-sus-blue-dark text-white font-extrabold text-sm sm:text-base shadow-lg shadow-sus-blue/25 hover:shadow-xl hover:shadow-sus-blue/30 active:scale-98 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Analisando com Inteligência Artificial Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Analisar com Inteligência Artificial Gemini</span>
              </>
            )}
          </button>
        </form>
      ) : (
        <div className="space-y-6">
          <MedicalReportSheet
            triageResult={triageResult}
            patientDescription={userNotes}
            userImage={imageBase64 || undefined}
            onReset={() => {
              setTriageResult(null);
              setImageBase64(null);
              setUserNotes('');
              setActiveExampleId(null);
              setHasPain(false);
              setHasHeatOrFever(false);
              setHasPurulent(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
