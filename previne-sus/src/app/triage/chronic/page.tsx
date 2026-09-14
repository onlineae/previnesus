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
  TrendingUp, 
  Clock, 
  Sparkles, 
  AlertTriangle, 
  Info,
  RefreshCw,
  FileText,
  Stethoscope,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { storage, VitalsLog } from '@/lib/storage';
import { MANDATORY_LEGAL_DISCLAIMER } from '@/lib/manchester';
import ManchesterBadge from '@/components/ManchesterBadge';
import { callGeminiVision } from '@/lib/gemini';
import { BLOOD_PRESSURE_TRIAGE_SYSTEM_PROMPT } from '@/lib/prompts';

export default function ChronicTrackerPage() {
  const [activeTab, setActiveTab] = useState<'pressure' | 'glucose'>('pressure');
  const [logs, setLogs] = useState<VitalsLog[]>([]);

  // Pressure Form
  const [systolic, setSystolic] = useState<string>('120');
  const [diastolic, setDiastolic] = useState<string>('80');
  const [pulse, setPulse] = useState<string>('72');

  // Alarm symptoms for Blood Pressure
  const [hasChestPain, setHasChestPain] = useState(false);
  const [hasShortnessOfBreath, setHasShortnessOfBreath] = useState(false);
  const [hasSevereHeadache, setHasSevereHeadache] = useState(false);
  const [hasDizzinessOrFaint, setHasDizzinessOrFaint] = useState(false);

  // Glucose Form
  const [glucose, setGlucose] = useState<string>('95');
  const [glucoseCondition, setGlucoseCondition] = useState<'jejum' | 'pos_prandial' | 'casual'>('jejum');
  const [hasConfusionOrExtremeThirst, setHasConfusionOrExtremeThirst] = useState(false);

  // AI Consultation States
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);

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

        setTimeout(() => {
          if (activeTab === 'pressure') {
            setSystolic('134');
            setDiastolic('86');
            setPulse('78');
          } else {
            setGlucose('112');
          }
          setOcrLoading(false);
        }, 600);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Real-time Pressure Assessment baseado nas Diretrizes Brasileiras de Hipertensão Arterial (SBC/MS) e AHA
  const getPressureAssessment = () => {
    const sys = parseInt(systolic, 10) || 120;
    const dia = parseInt(diastolic, 10) || 80;
    const hasAlarmSymptoms = hasChestPain || hasShortnessOfBreath || hasSevereHeadache || hasDizzinessOrFaint;

    // 1. Hipotensão (< 90 ou < 60 mmHg)
    if (sys < 90 || dia < 60) {
      if (hasDizzinessOrFaint || hasAlarmSymptoms) {
        return {
          tier: 'hipotensao',
          tierName: 'Hipotensão Sintomática',
          isLow: true,
          isElevated: false,
          isNormal: false,
          riskLevel: 'alto',
          riskLabel: '🔴 ALTO RISCO (HIPOTENSÃO SINTOMÁTICA)',
          color: 'red' as const,
          upaVerdict: '🚨 SIM! PROCURE A UPA 24H OU CHAME O SAMU 192 AGORA',
          explanation: `Pressão arterial muito baixa (${sys}x${dia} mmHg) acompanhada de sintomas de alarme (tontura, escurecimento visual ou desmaio). Risco iminente de choque circulatório, desidratação severa ou síncope com queda.`,
          facility: 'UPA 24 Horas ou SAMU 192',
          homeCare: 'Deite a pessoa imediatamente com as pernas elevadas acima do nível do coração para facilitar a circulação cerebral. Ofereça água em pequenos goles se ela estiver bem consciente.',
          queueMessage: '⚡ Casos de pressão muito baixa com tontura têm prioridade alta na triagem da UPA para soro na veia e estabilização rápida.'
        };
      } else {
        return {
          tier: 'hipotensao',
          tierName: 'Hipotensão Leve (Constitucional)',
          isLow: true,
          isElevated: false,
          isNormal: false,
          riskLevel: 'baixo',
          riskLabel: '🟢 BAIXO RISCO (HIPOTENSÃO SEM SINTOMAS)',
          color: 'green' as const,
          upaVerdict: '🛑 NÃO VÁ À UPA (CUIDE EM CASA OU PROCURE O POSTO DE SAÚDE)',
          explanation: `Pressão arterial baixa (${sys}x${dia} mmHg), mas sem nenhum sintoma de alarme. Muitas pessoas jovens, magras ou praticantes de exercícios têm essa faixa de forma natural e saudável.`,
          facility: 'Cuidados em Casa ou Posto de Saúde (UBS)',
          homeCare: 'Beba bastante água (2 a 3 litros ao dia), hidrate-se com água de coco, evite banhos excessivamente quentes e evite levantar da cama ou cadeira de forma brusca.',
          queueMessage: '💡 Dica SUS: Pressão baixa sem sintomas não é emergência. Ficar em pé na fila da UPA pode até piorar o cansaço. O repouso e hidratação em casa resolvem a maioria dos casos.'
        };
      }
    }

    // 2. Hipertensão Estágio 3 / Crise Hipertensiva (≥ 180 ou ≥ 110 mmHg)
    if (sys >= 180 || dia >= 110) {
      if (hasAlarmSymptoms) {
        return {
          tier: 'crise',
          tierName: 'Hipertensão Estágio 3 / Crise',
          isLow: false,
          isElevated: true,
          isNormal: false,
          riskLevel: 'alto',
          riskLabel: '🔴 ALTO RISCO (EMERGÊNCIA HIPERTENSIVA)',
          color: 'red' as const,
          upaVerdict: '🚨 SIM! PROCURE A UPA 24H OU CHAME O SAMU 192 IMEDIATAMENTE',
          explanation: `CRISE HIPERTENSIVA CRÍTICA (${sys}x${dia} mmHg) associada a sintomas agudos no coração ou na cabeça. Segundo a SBC e o Ministério da Saúde, há risco agudo de infarto, AVC (derrame) ou edema pulmonar.`,
          facility: 'UPA 24 Horas ou SAMU 192',
          homeCare: 'Mantenha repouso absoluto sentado ou semi-sentado. Não tome remédios extras por conta própria sem orientação médica e dirija-se imediatamente à emergência.',
          queueMessage: '⚡ Casos de emergência hipertensiva com dor no peito ou sintomas neurológicos têm atendimento prioritário imediato na sala vermelha da UPA.'
        };
      } else {
        return {
          tier: 'crise',
          tierName: 'Hipertensão Estágio 3 (Urgência)',
          isLow: false,
          isElevated: true,
          isNormal: false,
          riskLevel: 'medio',
          riskLabel: '🟡 MÉDIO RISCO (URGÊNCIA HIPERTENSIVA)',
          color: 'yellow' as const,
          upaVerdict: '⚠️ ATENÇÃO: POSTO DE SAÚDE (UBS) OU UPA HOJE',
          explanation: `Pressão muito elevada (${sys}x${dia} mmHg), mas sem dor no peito ou falta de ar. Configura urgência hipertensiva ou pseudocrise por ansiedade/dor física, necessitando de controle gradual no mesmo dia.`,
          facility: 'Posto de Saúde (UBS) ou UPA 24h',
          homeCare: 'Repouse em local silencioso e ventilado por 20 minutos e meça novamente. Verifique se esqueceu de tomar seus remédios diários de pressão. Não se automedique.',
          queueMessage: '💡 Dica SUS: Se o Posto de Saúde do seu bairro estiver aberto, o acolhimento para medicação oral e observação é muito mais rápido do que na fila da UPA.'
        };
      }
    }

    // 3. Hipertensão Estágio 2 (160-179 ou 100-109 mmHg)
    if (sys >= 160 || dia >= 100) {
      return {
        tier: 'estagio2',
        tierName: 'Hipertensão Estágio 2',
        isLow: false,
        isElevated: true,
        isNormal: false,
        riskLevel: 'baixo',
        riskLabel: '🟢 BAIXO RISCO / ATENÇÃO (HIPERTENSÃO ESTÁGIO 2)',
        color: 'green' as const,
        upaVerdict: '🛑 NÃO VÁ À UPA! PROCURE O POSTO DE SAÚDE (UBS)',
        explanation: `Sua pressão está elevada em Estágio 2 (${sys}x${dia} mmHg) segundo as diretrizes da Sociedade Brasileira de Cardiologia (SBC). Sem sintomas agudos, não se trata de emergência imediata da UPA, mas exige consulta no posto para ajuste dos medicamentos.`,
        facility: 'Posto de Saúde (UBS) - Consulta com Clínico / Médico de Família',
        homeCare: 'Tome seus medicamentos prescritos nos horários certos. Reduza drasticamente o sal, alimentos embutidos e ultraprocessados. Evite estresse e tome bastante água.',
        queueMessage: '💡 Importante: Ir à UPA por pressão alta crônica sem sintomas faz você esperar horas, pois a UPA prioriza infartos e acidentados. O acompanhamento contínuo no Posto de Saúde é o caminho correto.'
      };
    }

    // 4. Hipertensão Estágio 1 (140-159 ou 90-99 mmHg)
    if (sys >= 140 || dia >= 90) {
      return {
        tier: 'estagio1',
        tierName: 'Hipertensão Estágio 1',
        isLow: false,
        isElevated: true,
        isNormal: false,
        riskLevel: 'baixo',
        riskLabel: '🟢 BAIXO RISCO / ATENÇÃO (HIPERTENSÃO ESTÁGIO 1)',
        color: 'green' as const,
        upaVerdict: '🛑 NÃO VÁ À UPA! AGENDE NO POSTO DE SAÚDE (UBS)',
        explanation: `Sua pressão está elevada em Estágio 1 (${sys}x${dia} mmHg). De acordo com as Diretrizes Brasileiras de Hipertensão Arterial, este valor requer acompanhamento preventivo regular na Unidade Básica de Saúde.`,
        facility: 'Posto de Saúde (UBS) - Acompanhamento Hiperdia',
        homeCare: 'Mantenha o uso diário dos remédios receitados pelo médico da UBS. Pratique caminhadas diárias de 30 minutos, corte o saleiro da mesa e durma pelo menos 7 horas por noite.',
        queueMessage: '💡 Dica SUS: O programa Hiperdia da sua UBS fornece acompanhamento mensal, aferição e remédios gratuitos sem precisar enfrentar a fila da UPA.'
      };
    }

    // 5. Pré-Hipertensão / Limítrofe (130-139 ou 85-89 mmHg)
    if (sys >= 130 || dia >= 85) {
      return {
        tier: 'pre',
        tierName: 'Pré-Hipertensão (Limítrofe)',
        isLow: false,
        isElevated: true,
        isNormal: false,
        riskLevel: 'baixo',
        riskLabel: '🟢 BAIXO RISCO (PRÉ-HIPERTENSÃO / LIMÍTROFE)',
        color: 'green' as const,
        upaVerdict: '🛑 NÃO VÁ À UPA (CUIDE EM CASA / MUDANÇA DE HÁBITOS)',
        explanation: `Pressão limítrofe (${sys}x${dia} mmHg). Ainda não é hipertensão estabelecida, mas indica que as artérias estão sob leve sobrecarga. Momento ideal para agir e evitar virar hipertenso.`,
        facility: 'Acompanhamento Preventivo na UBS',
        homeCare: 'Adote a dieta cardioprotetora (frutas, verduras, legumes, azeite e grãos integrais), diminua bebidas alcoólicas e faça exercícios físicos regulares.',
        queueMessage: 'Sem indicação de UPA. Acompanhamento anual de rotina na UBS.'
      };
    }

    // 6. Pressão Normal (120-129 ou 80-84 mmHg)
    if (sys >= 120 || dia >= 80) {
      return {
        tier: 'normal',
        tierName: 'Pressão Normal',
        isLow: false,
        isElevated: false,
        isNormal: true,
        riskLevel: 'baixo',
        riskLabel: '🟢 BAIXO RISCO (PRESSÃO NORMAL)',
        color: 'green' as const,
        upaVerdict: '🛑 NÃO VÁ À UPA (PRESSÃO TOTALMENTE NORMAL)',
        explanation: `Sua pressão está normal (${sys}x${dia} mmHg). Não há qualquer alteração ou risco identificado no momento segundo os padrões da SBC e da OMS.`,
        facility: 'Rotina Preventiva na UBS',
        homeCare: 'Continue mantendo hábitos saudáveis de vida, hidratação adequada e atividade física regular.',
        queueMessage: 'Pressão normal e segura. Nenhuma necessidade de atendimento médico.'
      };
    }

    // 7. Pressão Ótima (< 120 e < 80 mmHg)
    return {
      tier: 'otima',
      tierName: 'Pressão Ótima (< 12x8)',
      isLow: false,
      isElevated: false,
      isNormal: true,
      riskLevel: 'baixo',
      riskLabel: '🟢 BAIXO RISCO (PRESSÃO ÓTIMA)',
      color: 'green' as const,
      upaVerdict: '🛑 NÃO VÁ À UPA (PRESSÃO EXCELENTE)',
      explanation: `Sua pressão está excelente (${sys}x${dia} mmHg). Está dentro da faixa de padrão ouro para a saúde do coração e dos rins.`,
      facility: 'Rotina Preventiva na UBS',
      homeCare: 'Parabéns! Mantenha a alimentação equilibrada e a prática regular de esportes ou caminhadas.',
      queueMessage: 'Pressão ótima, sem necessidade de cuidados de emergência.'
    };
  };

  // Real-time Glucose Assessment
  const getGlucoseAssessment = () => {
    const glu = parseInt(glucose, 10) || 95;

    if (glu < 60) {
      return {
        riskLevel: 'alto',
        riskLabel: '🔴 ALTO RISCO (HIPOGLICEMIA SEVERA)',
        color: 'red' as const,
        upaVerdict: '🚨 SIM! PROCURE A UPA 24H SE NÃO MELHORAR',
        explanation: `Nível de glicose muito baixo (${glu} mg/dL). Risco de desmaio, convulsão ou perda de consciência.`,
        facility: 'UPA 24 Horas ou SAMU 192',
        homeCare: 'Tome imediatamente 1 copo de água com 1 colher de sopa de açúcar ou meio copo de suco de fruta adoçado. Aguarde 15 minutos e meça novamente.',
        queueMessage: 'Hipoglicemia com confusão mental é tratada como prioridade máxima na UPA.'
      };
    }

    if (glu > 300 || (glu > 250 && hasConfusionOrExtremeThirst)) {
      return {
        riskLevel: 'alto',
        riskLabel: '🔴 ALTO RISCO (CETOACIDOSE / HIPERGLICEMIA CRÍTICA)',
        color: 'red' as const,
        upaVerdict: '🚨 SIM! PROCURE A UPA 24H IMEDIATAMENTE',
        explanation: `Glicose criticamente elevada (${glu} mg/dL). Risco de cetoacidose diabética ou desidratação osmótica severa.`,
        facility: 'UPA 24 Horas',
        homeCare: 'Beba água pura em abundância, não coma carboidratos e dirija-se à UPA 24h para controle com insulina e soro.',
        queueMessage: 'Hiperglicemias extremas recebem prioridade alta na UPA.'
      };
    }

    if (glu >= 126 && glucoseCondition === 'jejum') {
      return {
        riskLevel: 'baixo',
        riskLabel: '🟢 BAIXO RISCO / ATENÇÃO (GLICEMIA ELEVADA)',
        color: 'green' as const,
        upaVerdict: '🛑 NÃO VÁ À UPA! AGENDE NO POSTO DE SAÚDE (UBS)',
        explanation: `Glicemia de jejum alterada (${glu} mg/dL). Requer ajuste na alimentação e consulta ambulatorial com o médico da UBS.`,
        facility: 'Posto de Saúde (UBS)',
        homeCare: 'Reduza doces, massas e açúcares. Pratique caminhadas diárias e agende exames de sangue (Hemoglobina Glicada) no posto.',
        queueMessage: 'Glicemia alterada crônica sem sintomas de crise deve ser tratada no Posto de Saúde, evitando filas de UPA.'
      };
    }

    return {
      riskLevel: 'baixo',
      riskLabel: '🟢 BAIXO RISCO (GLICOSE NORMAL)',
      color: 'green' as const,
      upaVerdict: '🛑 NÃO VÁ À UPA (GLICOSE DENTRO DA META)',
      explanation: `Glicose dentro da faixa esperada (${glu} mg/dL). Continue mantendo o controle diário.`,
      facility: 'Acompanhamento na UBS',
      homeCare: 'Mantenha seus horários regulares de alimentação e atividade física.',
      queueMessage: 'Nível normal, sem necessidade de atendimento de emergência.'
    };
  };

  // Real-time Gemini AI consultation
  const handleConsultAi = async () => {
    setAiLoading(true);
    setAiError(null);

    try {
      let data: any = null;

      try {
        const res = await fetch('/api/triage/pressure', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systolic,
            diastolic,
            pulse,
            symptoms: {
              hasChestPain,
              hasShortnessOfBreath,
              hasSevereHeadache,
              hasDizzinessOrFaint
            },
            notes,
            apiKey: storage.getApiKey()
          })
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            data = json.data;
          }
        }
      } catch (e) {
        console.warn('API endpoint unreachable, calling client-side engine:', e);
      }

      if (!data) {
        const promptDetails = `
AVALIAÇÃO DE PRESSÃO ARTERIAL (DIRETRIZES SBC / MINISTÉRIO DA SAÚDE / AHA):
- Pressão Sistólica (Máxima): ${systolic} mmHg
- Pressão Diastólica (Mínima): ${diastolic} mmHg
- Frequência Cardíaca (Pulso): ${pulse || '72'} bpm
- Sintomas de Alarme Declarados:
  * Dor ou aperto no peito: ${hasChestPain ? 'SIM - ALERTA CRÍTICO' : 'NÃO'}
  * Falta de ar / dificuldade de respirar: ${hasShortnessOfBreath ? 'SIM - ALERTA CRÍTICO' : 'NÃO'}
  * Dor de cabeça súbita de forte intensidade: ${hasSevereHeadache ? 'SIM - ALERTA' : 'NÃO'}
  * Tontura forte, vista escura ou desmaio: ${hasDizzinessOrFaint ? 'SIM - ALERTA' : 'NÃO'}
- Observações do Cidadão: "${notes || 'Nenhuma observação informada.'}"
        `;

        data = await callGeminiVision(
          BLOOD_PRESSURE_TRIAGE_SYSTEM_PROMPT,
          promptDetails,
          [],
          storage.getApiKey()
        );
      }

      if (data) {
        setAiReport(data);
      } else {
        setAiError('Não foi possível obter parecer da IA no momento. Tente novamente.');
      }
    } catch (err: any) {
      console.error('Error consulting AI for pressure:', err);
      setAiError('Falha de conexão com a IA. Tente novamente.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'pressure') {
      const assessment = getPressureAssessment();
      const sys = parseInt(systolic, 10) || 120;
      const dia = parseInt(diastolic, 10) || 80;

      const newLog: VitalsLog = {
        id: `vital-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        type: 'pressure',
        systolic: sys,
        diastolic: dia,
        pulse: parseInt(pulse, 10) || undefined,
        status: assessment.color === 'red' ? 'emergencia' : assessment.color === 'yellow' ? 'alerta' : 'normal',
        notes: `${notes ? notes + ' | ' : ''}${assessment.tierName} (${assessment.riskLabel})`,
        photoProof: photoProof || undefined
      };

      storage.addVitalLog(newLog);
      setLogs(storage.getVitals());
      setPhotoProof(null);
      setNotes('');
    } else {
      const assessment = getGlucoseAssessment();
      const glu = parseInt(glucose, 10) || 95;

      const newLog: VitalsLog = {
        id: `vital-${Date.now()}`,
        timestamp: new Date().toLocaleString('pt-BR'),
        type: 'glucose',
        glucose: glu,
        glucoseCondition,
        status: assessment.color === 'red' ? 'emergencia' : assessment.color === 'yellow' ? 'alerta' : 'normal',
        notes: `${notes ? notes + ' | ' : ''}${assessment.riskLabel}`,
        photoProof: photoProof || undefined
      };

      storage.addVitalLog(newLog);
      setLogs(storage.getVitals());
      setPhotoProof(null);
      setNotes('');
    }
  };

  const pressureAssessment = getPressureAssessment();
  const glucoseAssessment = getGlucoseAssessment();
  const currentAssessment = activeTab === 'pressure' ? pressureAssessment : glucoseAssessment;

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
        <span className="text-xs font-semibold text-neutral-500">Módulo 2: Pressão & Glicemia</span>
      </div>

      {/* Screen Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-neutral-900 tracking-tight">
          Pré-Triagem de Pressão Arterial & Glicemia
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-neutral-600 leading-relaxed">
          Classificação clínica baseada nas <strong>Diretrizes Brasileiras de Hipertensão Arterial (SBC/MS)</strong> e na inteligência artificial do Google Gemini para orientar se você deve ir à UPA ou cuidar no Posto de Saúde / em casa.
        </p>
      </div>

      {/* Tab Switcher: Pressão vs Glicemia */}
      <div className="bg-neutral-100 p-1.5 rounded-2xl flex items-center gap-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => { setActiveTab('pressure'); setAiReport(null); }}
          className={`flex-1 py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'pressure'
              ? 'bg-white text-rose-700 shadow-sm scale-[1.01]'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <HeartPulse className="w-4 h-4 text-rose-600" />
          <span>Pressão Arterial (SBC / MS)</span>
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('glucose'); setAiReport(null); }}
          className={`flex-1 py-3 px-3 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'glucose'
              ? 'bg-white text-sus-blue shadow-sm scale-[1.01]'
              : 'text-neutral-500 hover:text-neutral-900'
          }`}
        >
          <Activity className="w-4 h-4 text-sus-blue" />
          <span>Glicose / Açúcar no Sangue</span>
        </button>
      </div>

      {/* INTERACTIVE SBC CLASSIFICATION GAUGE (Only in Pressure Tab) */}
      {activeTab === 'pressure' && (
        <div className="p-4 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-1">
            <span className="text-xs font-black uppercase text-neutral-800 tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-sus-blue" />
              Diretriz Brasileira de Hipertensão (SBC / MS / AHA):
            </span>
            <span className="text-[11px] font-bold text-neutral-500">
              Faixa Atual: <strong className="text-neutral-900 uppercase">{pressureAssessment.tierName}</strong>
            </span>
          </div>

          {/* Visual Step Scale */}
          <div className="grid grid-cols-6 gap-1 text-center text-[10px] font-black">
            <div className={`p-1.5 rounded-lg border transition-all ${
              pressureAssessment.tier === 'hipotensao'
                ? 'bg-sky-500 text-white shadow-md ring-2 ring-sky-300 scale-105'
                : 'bg-sky-50 text-sky-800 border-sky-200 opacity-60'
            }`}>
              <span>Hipotensão</span>
              <span className="block text-[9px] font-normal">&lt;90x60</span>
            </div>

            <div className={`p-1.5 rounded-lg border transition-all ${
              pressureAssessment.tier === 'otima'
                ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-300 scale-105'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 opacity-60'
            }`}>
              <span>Ótima</span>
              <span className="block text-[9px] font-normal">&lt;120x80</span>
            </div>

            <div className={`p-1.5 rounded-lg border transition-all ${
              pressureAssessment.tier === 'normal'
                ? 'bg-emerald-500 text-white shadow-md ring-2 ring-emerald-300 scale-105'
                : 'bg-emerald-50/70 text-emerald-800 border-emerald-200 opacity-60'
            }`}>
              <span>Normal</span>
              <span className="block text-[9px] font-normal">120-129</span>
            </div>

            <div className={`p-1.5 rounded-lg border transition-all ${
              pressureAssessment.tier === 'pre'
                ? 'bg-amber-500 text-neutral-950 shadow-md ring-2 ring-amber-300 scale-105'
                : 'bg-amber-50 text-amber-900 border-amber-200 opacity-60'
            }`}>
              <span>Pré-Hipertensa</span>
              <span className="block text-[9px] font-normal">130-139</span>
            </div>

            <div className={`p-1.5 rounded-lg border transition-all ${
              pressureAssessment.tier === 'estagio1' || pressureAssessment.tier === 'estagio2'
                ? 'bg-orange-500 text-white shadow-md ring-2 ring-orange-300 scale-105'
                : 'bg-orange-50 text-orange-900 border-orange-200 opacity-60'
            }`}>
              <span>Estágio 1/2</span>
              <span className="block text-[9px] font-normal">140-179</span>
            </div>

            <div className={`p-1.5 rounded-lg border transition-all ${
              pressureAssessment.tier === 'crise'
                ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-300 scale-105'
                : 'bg-rose-50 text-rose-900 border-rose-200 opacity-60'
            }`}>
              <span>Crise / Est. 3</span>
              <span className="block text-[9px] font-normal">≥180x110</span>
            </div>
          </div>
        </div>
      )}

      {/* REAL-TIME SUS UPA DECISION CARD */}
      <div className={`p-5 sm:p-6 rounded-3xl border-2 shadow-md transition-all ${
        currentAssessment.color === 'red'
          ? 'bg-rose-50 border-rose-500 text-rose-950'
          : currentAssessment.color === 'yellow'
          ? 'bg-amber-50 border-amber-500 text-amber-950'
          : 'bg-emerald-50 border-emerald-500 text-emerald-950'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <span className={`px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider shadow-sm ${
            currentAssessment.color === 'red'
              ? 'bg-rose-600 text-white'
              : currentAssessment.color === 'yellow'
              ? 'bg-amber-500 text-neutral-950'
              : 'bg-emerald-600 text-white'
          }`}>
            {currentAssessment.riskLabel}
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-600">
            Pré-Triagem de Risco SUS
          </span>
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-neutral-500 block">
            DEVE IR À UPA?
          </span>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight leading-tight">
            {currentAssessment.upaVerdict}
          </h3>
          <p className="text-xs sm:text-sm font-medium leading-relaxed">
            {currentAssessment.explanation}
          </p>
        </div>

        <div className="mt-4 p-3.5 rounded-2xl bg-white/90 border border-neutral-200/80 text-xs text-neutral-800 leading-relaxed shadow-sm space-y-2">
          <div className="flex items-start gap-1.5">
            <span className="font-bold text-neutral-900 flex-shrink-0">🏥 Onde Procurar:</span>
            <span>{currentAssessment.facility}</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="font-bold text-neutral-900 flex-shrink-0">💡 Conduta Recomendada:</span>
            <span>{currentAssessment.homeCare}</span>
          </div>
          <p className="text-[11px] text-neutral-500 pt-1 border-t border-neutral-200">
            {currentAssessment.queueMessage}
          </p>
        </div>
      </div>

      {/* Main Measurement Form */}
      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-white border border-neutral-200 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-sus-blue" />
            <div>
              <strong className="text-xs text-neutral-900 block font-bold">
                Leitura do Visor do Aparelho
              </strong>
              <span className="text-[11px] text-neutral-500">
                Você pode tirar uma foto do visor digital ou digitar os números abaixo
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-sus-blue text-white text-xs font-bold shadow-sm hover:bg-sus-blue-dark transition-colors cursor-pointer"
          >
            {ocrLoading ? 'Lendo...' : photoProof ? 'Foto Anexada ✓' : 'Fotografar Tela'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>


        {/* QUICK CLINICAL PRESETS FOR PRESSURE */}
        {activeTab === 'pressure' && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-50/70 via-white to-rose-50/70 border border-neutral-200 space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-neutral-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sus-blue" />
              Casos Clínicos para Teste da Pressão (1 Clique):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setSystolic('118');
                  setDiastolic('78');
                  setPulse('72');
                  setHasChestPain(false);
                  setHasShortnessOfBreath(false);
                  setHasSevereHeadache(false);
                  setHasDizzinessOrFaint(false);
                  setAiReport(null);
                }}
                className="p-2 rounded-xl bg-white hover:bg-emerald-50 border border-neutral-200 hover:border-emerald-300 text-left transition-all cursor-pointer shadow-sm"
              >
                <span className="text-[10px] font-black text-emerald-800 block">🟢 118 x 78</span>
                <span className="text-[9px] text-neutral-500 font-semibold">Ótima (Casa)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSystolic('135');
                  setDiastolic('85');
                  setPulse('75');
                  setHasChestPain(false);
                  setHasShortnessOfBreath(false);
                  setHasSevereHeadache(false);
                  setHasDizzinessOrFaint(false);
                  setAiReport(null);
                }}
                className="p-2 rounded-xl bg-white hover:bg-amber-50 border border-neutral-200 hover:border-amber-300 text-left transition-all cursor-pointer shadow-sm"
              >
                <span className="text-[10px] font-black text-amber-800 block">🟡 135 x 85</span>
                <span className="text-[9px] text-neutral-500 font-semibold">Pré-Hipertensa</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSystolic('150');
                  setDiastolic('95');
                  setPulse('80');
                  setHasChestPain(false);
                  setHasShortnessOfBreath(false);
                  setHasSevereHeadache(false);
                  setHasDizzinessOrFaint(false);
                  setAiReport(null);
                }}
                className="p-2 rounded-xl bg-white hover:bg-orange-50 border border-neutral-200 hover:border-orange-300 text-left transition-all cursor-pointer shadow-sm"
              >
                <span className="text-[10px] font-black text-orange-800 block">🟠 150 x 95</span>
                <span className="text-[9px] text-neutral-500 font-semibold">Estágio 1 (UBS)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSystolic('195');
                  setDiastolic('120');
                  setPulse('108');
                  setHasChestPain(true);
                  setHasShortnessOfBreath(true);
                  setHasSevereHeadache(true);
                  setHasDizzinessOrFaint(false);
                  setAiReport(null);
                }}
                className="p-2 rounded-xl bg-white hover:bg-rose-50 border border-neutral-200 hover:border-rose-300 text-left transition-all cursor-pointer shadow-sm"
              >
                <span className="text-[10px] font-black text-rose-800 block">🔴 195 x 120</span>
                <span className="text-[9px] text-neutral-500 font-semibold">Crise + Dor Peito</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSystolic('82');
                  setDiastolic('52');
                  setPulse('60');
                  setHasChestPain(false);
                  setHasShortnessOfBreath(false);
                  setHasSevereHeadache(false);
                  setHasDizzinessOrFaint(true);
                  setAiReport(null);
                }}
                className="p-2 rounded-xl bg-white hover:bg-sky-50 border border-neutral-200 hover:border-sky-300 text-left transition-all cursor-pointer shadow-sm"
              >
                <span className="text-[10px] font-black text-sky-800 block">🔵 82 x 52</span>
                <span className="text-[9px] text-neutral-500 font-semibold">Hipotensão c/ Tontura</span>
              </button>
            </div>
          </div>
        )}

        {/* PRESSURE INPUTS */}
        {activeTab === 'pressure' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-bold text-neutral-600 block mb-1">
                  Sistólica (Máx)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => { setSystolic(e.target.value); setAiReport(null); }}
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
                    onChange={(e) => { setDiastolic(e.target.value); setAiReport(null); }}
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
                    onChange={(e) => { setPulse(e.target.value); setAiReport(null); }}
                    className="w-full p-3 rounded-2xl border border-neutral-200 text-lg font-black text-neutral-900 text-center bg-neutral-50 focus:bg-white focus:border-sus-blue"
                  />
                  <span className="text-[10px] text-neutral-400 block text-center mt-1">bpm</span>
                </div>
              </div>
            </div>

            {/* Checkbox de Sintomas de Alarme para Pressão Alta ou Baixa */}
            <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-2">
              <span className="text-xs font-bold text-neutral-700 block">
                Você está sentindo algum desses sintomas de alarme agora?
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-neutral-200 cursor-pointer hover:border-neutral-300">
                  <input
                    type="checkbox"
                    checked={hasChestPain}
                    onChange={(e) => { setHasChestPain(e.target.checked); setAiReport(null); }}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-neutral-800">Dor forte ou aperto no peito</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-neutral-200 cursor-pointer hover:border-neutral-300">
                  <input
                    type="checkbox"
                    checked={hasShortnessOfBreath}
                    onChange={(e) => { setHasShortnessOfBreath(e.target.checked); setAiReport(null); }}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-neutral-800">Falta de ar / dificuldade de respirar</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-neutral-200 cursor-pointer hover:border-neutral-300">
                  <input
                    type="checkbox"
                    checked={hasSevereHeadache}
                    onChange={(e) => { setHasSevereHeadache(e.target.checked); setAiReport(null); }}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-neutral-800">Dor de cabeça súbita muito forte</span>
                </label>

                <label className="flex items-center gap-2 p-2 rounded-xl bg-white border border-neutral-200 cursor-pointer hover:border-neutral-300">
                  <input
                    type="checkbox"
                    checked={hasDizzinessOrFaint}
                    onChange={(e) => { setHasDizzinessOrFaint(e.target.checked); setAiReport(null); }}
                    className="rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span className="font-semibold text-neutral-800">Tontura forte, vista escura ou desmaio</span>
                </label>
              </div>
            </div>

            {/* BUTTON TO CONSULT GEMINI AI WITH WEB / SBC MEDICAL DATA */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleConsultAi}
                disabled={aiLoading}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-sus-blue to-sus-blue-dark hover:brightness-110 active:scale-98 text-white font-black text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Consultando IA Gemini com Diretrizes SBC/OMS...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-sus-yellow" />
                    <span>Pedir Parecer Clínico da IA Gemini (Diretrizes SBC/OMS)</span>
                  </>
                )}
              </button>

              {aiError && (
                <div className="mt-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* GLUCOSE INPUTS */
          <div className="space-y-4">
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

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-neutral-50 border border-neutral-200 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={hasConfusionOrExtremeThirst}
                onChange={(e) => setHasConfusionOrExtremeThirst(e.target.checked)}
                className="rounded text-sus-blue focus:ring-sus-blue"
              />
              <span className="font-semibold text-neutral-800">Sente sede incontrolável, boca muito seca ou confusão mental?</span>
            </label>
          </div>
        )}

        {/* Notes */}
        <div>
          <label className="text-xs font-bold text-neutral-600 block mb-1">
            Observação pessoal (opcional):
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Medição após 15min de repouso sentado, tomei o remédio da manhã"
            className="w-full p-3 rounded-xl border border-neutral-200 text-xs text-neutral-900 bg-white"
          />
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="w-full py-4 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-900 text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Salvar Medição no Meu Diário SUS</span>
        </button>
      </form>

      {/* AI CLINICAL REPORT CARD (When generated) */}
      {aiReport && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white border-2 border-sus-blue shadow-lg space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-sus-blue text-white flex items-center justify-center shadow-sm">
                <Sparkles className="w-5 h-5 text-sus-yellow" />
              </div>
              <div>
                <h3 className="font-black text-sm text-neutral-900">
                  Parecer Clínico da IA Gemini (Cardiologia & Triagem)
                </h3>
                <span className="text-[10px] text-neutral-500 font-semibold">
                  Fonte: {aiReport.guidelineSource || 'Diretrizes Brasileiras de Hipertensão Arterial (SBC/MS)'}
                </span>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
              aiReport.manchesterColor === 'red'
                ? 'bg-rose-600 text-white'
                : aiReport.manchesterColor === 'yellow'
                ? 'bg-amber-500 text-neutral-950'
                : 'bg-emerald-600 text-white'
            }`}>
              {aiReport.categoryLabel || 'Classificação Concluída'}
            </span>
          </div>

          {/* Veredito UPA */}
          <div className="p-4 rounded-2xl bg-neutral-50 border border-neutral-200 space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-500 block">
              VEREDITO DE ATENDIMENTO SUS:
            </span>
            <h4 className="text-base sm:text-lg font-black text-neutral-900 leading-snug">
              {aiReport.upaVerdict}
            </h4>
            <p className="text-xs text-neutral-700 leading-relaxed font-medium">
              {aiReport.explanation}
            </p>
          </div>

          {/* Heart Rate / Pulse Analysis */}
          {aiReport.heartRateAnalysis && (
            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex items-start gap-2.5 text-xs text-sky-950">
              <HeartPulse className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-black text-sky-900">Análise da Frequência Cardíaca (Pulso):</strong>
                <span>{aiReport.heartRateAnalysis}</span>
              </div>
            </div>
          )}

          {/* Home care & warning signs */}
          {aiReport.homeCare && aiReport.homeCare.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-black text-emerald-900">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Cuidados Imediatos em Casa (Sem Medicamentos Não Prescritos):</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-800">
                {aiReport.homeCare.map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Technical Note for Doctors */}
          {aiReport.technicalNote && (
            <div className="p-3 rounded-2xl bg-neutral-100 border border-neutral-200 text-[11px] text-neutral-700 flex items-start gap-2">
              <Stethoscope className="w-4 h-4 text-neutral-500 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold text-neutral-900">Ficha Técnica para a Equipe de Saúde da Família (UBS / UPA):</strong>
                <span>{aiReport.technicalNote}</span>
              </div>
            </div>
          )}
        </div>
      )}

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
                className="p-3.5 rounded-2xl border border-neutral-100 bg-neutral-50 flex items-center justify-between text-xs hover:border-neutral-200 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900">
                      {log.type === 'pressure'
                        ? `${log.systolic}x${log.diastolic} mmHg`
                        : `${log.glucose} mg/dL (${log.glucoseCondition || 'jejum'})`}
                    </span>
                    {log.pulse && (
                      <span className="text-[10px] text-neutral-500">
                        {log.pulse} bpm
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                        log.status === 'emergencia'
                          ? 'bg-rose-100 text-rose-700'
                          : log.status === 'alerta'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  {log.notes && (
                    <p className="text-[10px] text-neutral-500 mt-0.5 line-clamp-1">{log.notes}</p>
                  )}
                </div>

                <div className="text-right text-[10px] text-neutral-400">
                  <span>{log.timestamp}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mandatory Legal Notice */}
      <div className="p-3 rounded-2xl bg-neutral-100 text-[10px] text-neutral-500 leading-relaxed text-center">
        {MANDATORY_LEGAL_DISCLAIMER}
      </div>
    </div>
  );
}
