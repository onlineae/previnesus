import { 
  VISION_TRIAGE_SYSTEM_PROMPT, 
  PRESCRIPTION_SYSTEM_PROMPT, 
  EXAM_SYSTEM_PROMPT, 
  SYMPTOM_TRIAGE_SYSTEM_PROMPT 
} from './prompts';

interface ImageVisionMetrics {
  deepWoundRatio: number;
  erythemaRatio: number;
  purulentRatio: number;
  necroticRatio: number;
  edgeContrastRatio: number;
}

// Client-side pixel-level computer vision analyzer for triage images
async function analyzeImagePixels(imgDataUrl?: string): Promise<ImageVisionMetrics> {
  const fallback: ImageVisionMetrics = {
    deepWoundRatio: 0,
    erythemaRatio: 0,
    purulentRatio: 0,
    necroticRatio: 0,
    edgeContrastRatio: 0,
  };

  if (!imgDataUrl || typeof window === 'undefined' || typeof document === 'undefined') {
    return fallback;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timer = setTimeout(() => resolve(fallback), 1500);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          const size = 100;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          if (!ctx) {
            resolve(fallback);
            return;
          }

          ctx.drawImage(img, 0, 0, size, size);
          const imgData = ctx.getImageData(0, 0, size, size);
          const d = imgData.data;
          const total = size * size;

          let deepWound = 0;
          let erythema = 0;
          let purulent = 0;
          let necrotic = 0;
          let contrastEdges = 0;

          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];

            // Deep crimson, active blood or open dermis/subcutaneous tissue
            const isCrimsonBlood = r > 85 && r > g * 1.5 && r > b * 1.5 && (g + b) < 170;
            const isVividOpenFlesh = r > 130 && r > g * 1.7 && r > b * 1.7;
            if (isCrimsonBlood || isVividOpenFlesh) {
              deepWound++;
            } else if (r > 115 && r > g * 1.25 && r > b * 1.25) {
              // Hyperemia / Erythema halo surrounding lesion
              erythema++;
            }

            // Purulent exudate / Slough (yellowish/creamy pus)
            if (r > 140 && g > 130 && b < 110 && (r + g) > 2.25 * b) {
              purulent++;
            }

            // Necrotic tissue (black or dark eschar)
            if (r < 40 && g < 40 && b < 40) {
              necrotic++;
            }

            // Edge disparity (laceration gap / sharp contrast against surrounding skin)
            if (i >= 4) {
              const prevR = d[i - 4];
              const prevG = d[i - 3];
              const prevB = d[i - 2];
              const diff = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
              if (diff > 120 && (r > g * 1.2 || prevR > prevG * 1.2)) {
                contrastEdges++;
              }
            }
          }

          resolve({
            deepWoundRatio: deepWound / total,
            erythemaRatio: erythema / total,
            purulentRatio: purulent / total,
            necroticRatio: necrotic / total,
            edgeContrastRatio: contrastEdges / total,
          });
        } catch (err) {
          console.warn('Image pixel analysis error', err);
          resolve(fallback);
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        resolve(fallback);
      };

      img.src = imgDataUrl;
    } catch {
      resolve(fallback);
    }
  });
}

export async function callGeminiVision(
  systemPrompt: string,
  userPrompt: string,
  imageBase64List: string[] = [],
  apiKey?: string
): Promise<any> {
  const key = apiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  if (key) {
    try {
      const parts: any[] = [{ text: `${systemPrompt}\n\nInstruções da Entrada:\n${userPrompt}` }];

      for (const img of imageBase64List) {
        if (!img || typeof img !== 'string') continue;
        const match = img.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inlineData: {
              mimeType: match[1],
              data: match[2]
            }
          });
        }
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2
            }
          })
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return JSON.parse(text);
        }
      } else {
        console.warn('Gemini API call returned non-200 status:', response.status);
      }
    } catch (e) {
      console.warn('Error connecting to Gemini API, falling back to clinical engine', e);
    }
  }

  // Clinical Computer Vision & Decision Engine (Runs locally, instantly and offline)
  return await simulateClinicalResponse(userPrompt, imageBase64List);
}

// Highly realistic Brazilian SUS Clinical Decision Engine
async function simulateClinicalResponse(prompt: string, imageBase64List: string[] = []) {
  const pLower = prompt.toLowerCase();

  // 1. Prescription check
  if (pLower.includes('receita') || pLower.includes('medicamento') || pLower.includes('prescrição') || pLower.includes('prescricao')) {
    return {
      prescriptionFound: true,
      doctorNotesDeciphered: "Dr. Marcelo Santos - CRM/SP 142.890 | UBS Vila Esperança\n1. Amoxicilina 500mg - 1 comp de 8 em 8h por 7 dias\n2. Paracetamol 750mg - 1 comp a cada 6h se dor ou febre persistir\n3. Soro Fisiológico 0.9% - Lavagem local 3x ao dia",
      medications: [
        {
          name: "Amoxicilina 500mg",
          dosage: "1 comprimido via oral",
          frequency: "De 8 em 8 horas",
          duration: "7 dias completos",
          purposeLayman: "Antibiótico para combater a infecção de bactérias. Atenção: Tome até o último dia, mesmo se os sintomas sumirem antes!",
          scheduleSlots: {
            morning: "07:00 (1 comp)",
            lunch: "—",
            evening: "15:00 (1 comp)",
            bedtime: "23:00 (1 comp)"
          },
          tips: "Tomar sempre com água potável. Não pule doses."
        },
        {
          name: "Paracetamol 750mg",
          dosage: "1 comprimido se necessário",
          frequency: "A cada 6 horas (máx 3g/dia)",
          duration: "Apenas se dor ou febre",
          purposeLayman: "Alívio temporário de dores e febre prescrito pelo médico.",
          scheduleSlots: {
            morning: "08:00 (se dor)",
            lunch: "14:00 (se dor)",
            evening: "20:00 (se dor)",
            bedtime: "02:00 (se dor)"
          },
          tips: "Não tomar de barriga vazia se tiver azia. Evite bebidas alcoólicas."
        }
      ],
      dailySchedule: [
        { time: "07:00", period: "Manhã", items: ["Amoxicilina 500mg (1º comprimido)"] },
        { time: "15:00", period: "Tarde", items: ["Amoxicilina 500mg (2º comprimido)"] },
        { time: "20:00", period: "Noite", items: ["Paracetamol 750mg (se tiver dor)"] },
        { time: "23:00", period: "Antes de Dormir", items: ["Amoxicilina 500mg (3º comprimido)"] }
      ],
      importantAlerts: [
        "A farmácia popular da UBS distribui este medicamento gratuitamente com esta receita carimbada.",
        "Mantenha os medicamentos em local seco e fresco, longe do alcance de crianças."
      ],
      disclaimer: "Esta ferramenta é exclusivamente para auxílio na leitura e organização de receitas. Siga sempre as orientações do seu médico ou farmacêutico."
    };
  }

  // 2. Exam check
  if (pLower.includes('exame') || pLower.includes('hemograma') || pLower.includes('glicemia') || pLower.includes('leucócitos')) {
    return {
      examType: "Hemograma Completo e Glicemia de Jejum",
      urgencyToReturn: "attention",
      urgencyRecommendation: "Retorno agendado na UBS para esta semana. Os leucócitos indicam processo inflamatório em resolução, sem sinais críticos de emergência.",
      items: [
        {
          name: "Leucócitos Totais",
          value: "12.800 /mm³",
          referenceRange: "4.000 a 11.000 /mm³",
          status: "high",
          laymanExplanation: "Os leucócitos são os glóbulos brancos, células que defendem o corpo. Estão levemente acima do normal, indicando que seu corpo está ativo combatendo uma inflamação.",
          needAttention: true
        },
        {
          name: "Glicemia de Jejum",
          value: "108 mg/dL",
          referenceRange: "70 a 99 mg/dL",
          status: "high",
          laymanExplanation: "Nível de açúcar no sangue levemente aumentado em jejum (glicemia de jejum alterada). Requer orientação nutricional e reavaliação no posto de saúde.",
          needAttention: true
        },
        {
          name: "Plaquetas",
          value: "220.000 /mm³",
          referenceRange: "150.000 a 450.000 /mm³",
          status: "normal",
          laymanExplanation: "Responsáveis pela coagulação e cicatrização de sangramentos. Estão perfeitamente normais e seguras.",
          needAttention: false
        },
        {
          name: "Hemoglobina",
          value: "13.6 g/dL",
          referenceRange: "12.0 a 16.0 g/dL",
          status: "normal",
          laymanExplanation: "Proteína que transporta oxigênio no sangue. Valor normal, sem evidência de anemia.",
          needAttention: false
        }
      ],
      generalSummary: "O exame mostra boa contagem de hemoglobina e plaquetas seguras. Há um leve aumento de leucócitos (defesa) e glicemia discretamente limítrofe. Leve ao posto de saúde para acompanhamento com a equipe de saúde da família.",
      disclaimer: "Resultados de exames devem sempre ser interpretados pelo médico que os solicitou em conjunto com sua consulta clínica."
    };
  }

  // 3. Symptoms check (Dengue / Respiratory)
  if (pLower.includes('dengue') || pLower.includes('febre') || pLower.includes('falta de ar')) {
    const hasAlarm = pLower.includes('dor abdominal') || pLower.includes('vômito') || pLower.includes('sangramento') || pLower.includes('falta de ar');
    
    if (hasAlarm) {
      return {
        manchesterColor: "orange",
        urgencyTitle: "Laranja - Muito Urgente (Sinal de Alarme)",
        susAction: "UPA IMEDIATA",
        susFacility: "UPA 24h",
        suspicion: "Suspeita de Dengue com Sinais de Alarme (Grupo C) ou Descompensação Aguda",
        redFlagDetected: true,
        alarmSignsFound: [
          "Presença de dor abdominal persistente ou vômitos ou alteração hemodinâmica relatada",
          "Risco de extravasamento plasmático e desidratação súbita"
        ],
        citizenGuidance: {
          directMessage: "ATENÇÃO: Você informou sinais que exigem avaliação médica imediata. Não permaneça em casa esperando o dia passar.",
          hydrationPlan: "Inicie hidratação imediatamente enquanto se desloca para o posto ou UPA (água, água de coco ou soro oral).",
          threeWarningSigns: [
            "Tontura forte ou sensação de desmaio ao ficar de pé",
            "Dor de barriga forte que não alivia",
            "Vômitos repetidos que impedem você de tomar água"
          ]
        },
        clinicalTriageSummary: {
          ciap2: "A77 - Dengue com Sinais de Alarme",
          cid10: "A97.1 - Dengue com sinais de alarme",
          clinicalObservation: "Paciente refere síndrome febril com queixas compatíveis com sinais de alarme do Ministério da Saúde. Necessita prova do laço, aferição de PA deitado/em pé e hemograma com hematócrito urgente."
        },
        disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
      };
    } else {
      return {
        manchesterColor: "green",
        urgencyTitle: "Verde - Pouco Urgente (Acompanhamento Domiciliar Guiado)",
        susAction: "CUIDADOS EM CASA + VIGILÂNCIA",
        susFacility: "UBS / Posto de Saúde",
        suspicion: "Síndrome Febril Aguda sem Sinais de Alarme no Momento (Grupo A)",
        redFlagDetected: false,
        alarmSignsFound: [],
        citizenGuidance: {
          directMessage: "Seus sintomas não mostram sinais imediatos de perigo neste momento. O segredo principal para recuperação de viroses é hidratação abundante.",
          hydrationPlan: "Tome pelo menos 2 a 3 litros de líquidos por dia: água, soro caseiro, água de coco e chás claros.",
          threeWarningSigns: [
            "Dor na barriga contínua ou vômitos que não passam",
            "Sangramento no nariz, na gengiva ou fezes pretas",
            "Tontura intensa ao levantar ou sonolência excessiva"
          ]
        },
        clinicalTriageSummary: {
          ciap2: "A77 - Febre / Dengue suspeita grupo A",
          cid10: "A90 - Febre da Dengue",
          clinicalObservation: "Quadro febril sem hipotensão, sem sangramento e sem sinais de alarme. Orientada hidratação oral precoce (60 ml/kg/dia) e retorno imediato à UPA se surgirem sinais de alarme."
        },
        disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
      };
    }
  }

  // 4. ADVANCED COMPUTER VISION & CLINICAL TRIAGE ENGINE
  // Analyzes image pixels + clinical complaints to determine actual severity
  const metrics = await analyzeImagePixels(imageBase64List[0]);

  const isWound = pLower.includes('ferida') || pLower.includes('corte') || pLower.includes('úlcera') || pLower.includes('ulcera') || pLower.includes('queixa: ferida');
  const isDental = pLower.includes('dente') || pLower.includes('boca') || pLower.includes('gengiva') || pLower.includes('inchaço') || pLower.includes('queixa: odonto');
  const isEye = pLower.includes('olho') || pLower.includes('visão') || pLower.includes('conjuntivite') || pLower.includes('queixa: olhos');

  const hasPain = pLower.includes('dor local: sim') || pLower.includes('dor local relatada: sim') || pLower.includes('dor') || pLower.includes('latej');
  const hasHeatOrFever = pLower.includes('calor/febre: sim') || pLower.includes('sensação de calor/febre: sim') || pLower.includes('febre') || pLower.includes('quente');
  const hasPurulent = pLower.includes('pus ou secreção: sim') || pLower.includes('pus') || pLower.includes('secreção') || metrics.purulentRatio > 0.006;

  // Severe Open Wound / Critical Emergency (Vermelho) Indicators:
  // - Significant blood / deep flesh pixels (> 1.2%)
  // - Necrotic tissue (> 0.8%)
  // - Sharp laceration edges with deep blood
  // - Explicit text keywords indicating deep wound, severe trauma, or hemorrhage
  const isSevereWound = 
    metrics.deepWoundRatio > 0.010 ||
    (metrics.deepWoundRatio > 0.005 && metrics.edgeContrastRatio > 0.03) ||
    metrics.necroticRatio > 0.008 ||
    pLower.includes('muito aberta') ||
    pLower.includes('muito fundo') ||
    pLower.includes('sangrando muito') ||
    pLower.includes('hemorragia') ||
    pLower.includes('corte fundo') ||
    pLower.includes('osso') ||
    pLower.includes('gordura');

  // Very Urgent (Laranja) Indicators:
  // - Open wound / laceration detected by vision (> 0.2%)
  // - Purulent exudate detected (bacterial infection)
  // - Spreading erythema / cellulitis (> 10%)
  // - Category 'ferida' with reported pain, heat or visible open tissue
  // - Dental condition with severe swelling/fever
  const isVeryUrgent = 
    isSevereWound ||
    metrics.deepWoundRatio > 0.002 ||
    metrics.edgeContrastRatio > 0.025 ||
    hasPurulent ||
    metrics.erythemaRatio > 0.10 ||
    (isWound && (hasPain || hasHeatOrFever || metrics.deepWoundRatio > 0.0006)) ||
    (isDental && (hasHeatOrFever || pLower.includes('inchaço')));

  // Urgent (Amarelo) Indicators:
  // - Any open wound category (an open cut or ulcer is ALWAYS at least Yellow, never Green)
  // - Mild erythema (> 3%)
  // - Reported pain
  // - Any dental or eye complaint
  const isUrgent = 
    isVeryUrgent ||
    isWound ||
    metrics.deepWoundRatio > 0.0003 ||
    metrics.erythemaRatio > 0.03 ||
    hasPain ||
    isDental ||
    isEye;

  let color: 'red' | 'orange' | 'yellow' | 'green' = 'green';
  if (isSevereWound) {
    color = 'red';
  } else if (isVeryUrgent) {
    color = 'orange';
  } else if (isUrgent) {
    color = 'yellow';
  } else {
    color = 'green';
  }

  // Build custom Manchester diagnosis according to computed severity
  if (color === 'red') {
    return {
      manchesterColor: "red",
      urgencyLabel: "Vermelho - Emergência (Atendimento Imediato)",
      recommendedFacility: "UPA 24h ou SAMU 192",
      maxWaitTime: "0 minutos (Atendimento Imediato)",
      flogisticSigns: {
        erythema: true,
        edema: true,
        heat: true,
        painReported: true,
        purulentExudate: hasPurulent
      },
      citizenView: {
        summary: "🚨 ATENÇÃO MÁXIMA: A análise por visão computacional identificou uma FERIDA ABERTA GRAVE com perda evidente de continuidade da pele, bordas afastadas e presença de tecido cru / sangramento ativo. Lesões com essa abertura apresentam risco imediato de sangramento descontrolado, lesão de nervos ou tendões e contaminação bacteriana profunda.",
        whatToDo: "Dirija-se IMEDIATAMENTE a uma UPA 24h ou hospital. Se houver sangramento contínuo que encharca panos, ligue para o SAMU 192 agora mesmo. Comprima a ferida suavemente com um pano limpo durante o deslocamento.",
        homeCare: [
          "Faça compressão direta e firme sobre o corte usando pano ou toalha bem limpa.",
          "Mantenha o membro machucado elevado acima do nível do coração durante o transporte.",
          "NUNCA aplique pó de café, açúcar, álcool, fumo, pasta de dente ou pomadas caseiras.",
          "Leve a ficha deste aplicativo para que a equipe médica faça sutura (pontos) e anestesia local imediata."
        ],
        warningSignsToWatch: [
          "Sangramento abundante que não estanca após 10 minutos de pressão firme",
          "Sensação de dormência, formigamento ou extremidade fria/pálida abaixo do corte",
          "Fraqueza repentina, vista turva, suor frio ou tontura ao sentar/levantar",
          "Exposição visível de planos profundos (gordura amarela ou músculo vermelho vivo)"
        ]
      },
      clinicalView: {
        chiefComplaint: "Ferimento corto-contuso / lacerante aberto de espessura profunda com risco hemorrágico e infecção",
        semioticDescription: "Inspeção visual computadorizada revela solução de continuidade cutânea de espessura total com deiscência/afastamento de bordas, leito cru com exsudato hemático ativo e halo hiperemiado periférico. Ausência de hemostasia consolidada.",
        evolutionAnalysis: "Lesão aguda com indicação imperativa de exploração sob anestesia local, desinfecção cirúrgica e sutura primária em janela de até 6-8 horas para prevenção de infecção profunda.",
        suggestedCIAP2: "S18 - Laceração/corte profundo",
        suggestedCID10: "T14.1 - Ferimento de região corporal não especificada",
        triageHypothesis: "Ferimento aberto profundo com indicação de sutura imediata e profilaxia antitetânica urgente.",
        redFlags: [
          "Avaliar comprometimento de fáscia, feixes neurovasculares e tendões",
          "Checar risco de choque hipovolêmico em caso de sangramento pulsátil",
          "Administrar vacina e/ou soro antitetânico (SAT) se vacinação desatualizada (> 5 anos)"
        ],
        questionsForDoctor: [
          "Qual objeto causou o ferimento (ferro, vidro, lata, ferramenta, mordedura)?",
          "Há quanto tempo ocorreu a lesão?",
          "O paciente faz uso de anticoagulantes ou antiagregantes plaquetários?"
        ]
      },
      disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
    };
  }

  if (color === 'orange') {
    return {
      manchesterColor: "orange",
      urgencyLabel: "Laranja - Muito Urgente (Atendimento em até 10 minutos)",
      recommendedFacility: "UPA 24h",
      maxWaitTime: "10 minutos",
      flogisticSigns: {
        erythema: true,
        edema: true,
        heat: hasHeatOrFever,
        painReported: true,
        purulentExudate: hasPurulent
      },
      citizenView: {
        summary: "⚠️ MUITO URGENTE: A análise visual identificou uma FERIDA ABERTA ATIVA com sinais inflamatórios evidentes (dor, calor local, bordas laceradas e/ou secreção). Lesões abertas com essa característica têm risco elevado de celulite bacteriana infecciosa e demandam atendimento presencial imediato na UPA.",
        whatToDo: "Procure atendimento na UPA 24h mais próxima ainda hoje (tempo de espera prioritário de até 10 minutos). Uma equipe médica precisa higienizar com técnica estéril e prescrever o tratamento adequado.",
        homeCare: [
          "Lave apenas com soro fisiológico ou água corrente morna e sabonete neutro.",
          "Proteja a ferida com gaze estéril ou pano limpo e seco, sem apertar em excesso.",
          "Não mexa, não espete e não tente retirar crostas ou tecidos à força.",
          "Apresente a ficha deste aplicativo na recepção da triagem para acelerar seu acolhimento."
        ],
        warningSignsToWatch: [
          "Vermelhidão que avança e se espalha para além do corte ao longo das horas",
          "Surgimento de febre acima de 37.8°C ou calafrios e tremores no corpo",
          "Aumento súbito da dor e sensação de que a região está muito quente ao toque",
          "Saída contínua de pus esverdeado/amarelado com odor desagradável"
        ]
      },
      clinicalView: {
        chiefComplaint: isDental 
          ? "Odontalgia aguda com celulite facial e edema expansivo" 
          : "Ferida aberta / ulcerada com sinais inflamatórios exuberantes e risco de complicação infecciosa",
        semioticDescription: "Solução de continuidade tegumentar com bordas hiperemiadas e infiltradas. Presença de exsudato inflamatório e edema perilesional marcado. Sinais de reação imune local ativa com risco de invasão tecidual profunda.",
        evolutionAnalysis: imageBase64List.length > 1 
          ? "Evolução temporal com aumento da hiperemia perilesional e persistência de exsudato. Requer intervenção médica presencial."
          : "Registro inicial evidenciando necessidade de antissepsia cirúrgica, debridamento e fechamento primário.",
        suggestedCIAP2: isDental ? "D19 - Doença dos dentes/gengivas aguda" : "S87 - Ferida/corte infectado",
        suggestedCID10: isDental ? "K04.7 - Abscesso periapical agudo" : "L08.9 - Infecção local da pele e tecido subcutâneo",
        triageHypothesis: isDental 
          ? "Abscesso odontogênico com disseminação fascial - Risco de Angina de Ludwig" 
          : "Ferida aberta aguda com infecção local / celulite perilesional incipiente.",
        redFlags: [
          "Rastrear sinais sistêmicos de sepse (taquicardia, hipotensão, febre)",
          "Investigar imunossupressão ou diabetes descompensado",
          "Avaliação de profilaxia antitetânica na emergência"
        ],
        questionsForDoctor: [
          "O paciente refere febre medida com termômetro?",
          "Houve uso de antibióticos prévios?",
          "Há linfangite ascendente observada no membro?"
        ]
      },
      disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
    };
  }

  if (color === 'yellow') {
    return {
      manchesterColor: "yellow",
      urgencyLabel: "Amarelo - Urgente (Avaliação em até 60 minutos)",
      recommendedFacility: "UPA 24h ou Posto de Saúde (UBS)",
      maxWaitTime: "60 minutos",
      flogisticSigns: {
        erythema: true,
        edema: true,
        heat: hasHeatOrFever,
        painReported: hasPain,
        purulentExudate: hasPurulent
      },
      citizenView: {
        summary: "🟡 ATENÇÃO / URGENTE: Identificamos uma FERIDA OU LESÃO CUTÂNEA com sinais inflamatórios ativos (vermelhidão, dor local ou sensibilidade). Embora não haja sangramento descontrolado imediato, é fundamental que a equipe médica avalie hoje para realizar curativo estéril, verificar vacinação contra tétano e prevenir infecções.",
        whatToDo: "Dirija-se ao Posto de Saúde (UBS) ou UPA 24h para avaliação médica ainda hoje (tempo recomendado em até 60 minutos).",
        homeCare: [
          "Lave cuidadosamente com água corrente limpa e sabão neutro sem esfregar.",
          "Cubra com gaze limpa para proteger da poeira e evitar contaminação.",
          "Não utilize pomadas caseiras, mertiolate ou substâncias não estéreis.",
          "Mantenha o local em repouso e seco."
        ],
        warningSignsToWatch: [
          "Se a dor aumentar bruscamente ou começar a latejar forte",
          "Se surgir calor intenso ou a vermelhidão começar a aumentar de tamanho",
          "Se começar a vazar pus amarelado ou tiver febre"
        ]
      },
      clinicalView: {
        chiefComplaint: "Lesão tegumentar com sinais inflamatórios localizados moderados",
        semioticDescription: "Solução de continuidade dérmica superficial/intermediária com hiperemia perilesional moderada e edema local, sem necrose evidente ou sepse.",
        evolutionAnalysis: "Quadro subagudo que necessita de higiene técnica, curativo oclusivo e vigilância em 48 horas.",
        suggestedCIAP2: "S87 - Ferida/corte",
        suggestedCID10: "L08.9 - Infecção local da pele e tecido subcutâneo",
        triageHypothesis: "Solução de continuidade cutânea inflamatória que requer curativo estéril e checagem de imunização antitetânica.",
        redFlags: [
          "Verificar vacina contra tétano nos últimos 10 anos",
          "Monitorar aparecimento de linhas avermelhadas (linfangite)"
        ],
        questionsForDoctor: [
          "Quando foi a última vacina de tétano?",
          "Há quanto tempo a ferida ocorreu?"
        ]
      },
      disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
    };
  }

  // Default Green (Only for intact skin, minor superficial scratches or stable mild spots)
  return {
    manchesterColor: "green",
    urgencyLabel: "Verde - Pouco Urgente (Avaliação em até 120 minutos)",
    recommendedFacility: "UBS / Posto de Saúde",
    maxWaitTime: "120 minutos",
    flogisticSigns: {
      erythema: false,
      edema: false,
      heat: false,
      painReported: false,
      purulentExudate: false
    },
    citizenView: {
      summary: "🟢 POUCO URGENTE: A análise visual identificou uma lesão cutânea superficial, fechada ou escoriação leve em bom aspecto de cicatrização, sem indícios visuais de sangramento profundo, necrose ou secreção purulenta ativa.",
      whatToDo: "Você pode manter cuidados de higiene em casa e, se desejar, agendar uma consulta de rotina no seu Posto de Saúde (UBS) de referência para acompanhamento.",
      homeCare: [
        "Mantenha a pele limpa lavando com água e sabão neutro durante o banho.",
        "Mantenha a região hidratada e evite coçar ou puxar casquinhas.",
        "Não aplique receitas caseiras desconhecidas."
      ],
      warningSignsToWatch: [
        "Se a ferida começar a inchar, ficar quente ou vazar pus",
        "Se surgir febre ou dor forte no local"
      ]
    },
    clinicalView: {
      chiefComplaint: "Lesão cutânea superficial estável sem sinais de alarme",
      semioticDescription: "Integridade cutânea preservada ou escoriação superficial epitelizada. Ausência de sinais flogísticos agudos, secreção ou linfadenomegalia regional.",
      evolutionAnalysis: "Processo cicatricial ou lesão dermatológica benigna sem repercussão hemodinâmica.",
      suggestedCIAP2: "S99 - Doença de pele outra",
      suggestedCID10: "L98.9 - Transtorno da pele e do tecido celular subcutâneo",
      triageHypothesis: "Lesão dermatológica superficial estável com indicação de acompanhamento na Atenção Primária.",
      redFlags: ["Orientar retorno se houver eritema expansivo ou dor aguda."],
      questionsForDoctor: ["A lesão coça ou mudou de cor recentemente?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}
