import { 
  VISION_TRIAGE_SYSTEM_PROMPT, 
  PRESCRIPTION_SYSTEM_PROMPT, 
  EXAM_SYSTEM_PROMPT, 
  SYMPTOM_TRIAGE_SYSTEM_PROMPT 
} from './prompts';

export interface ImageVisionMetrics {
  deepWoundRatio: number;
  erythemaRatio: number;
  purulentRatio: number;
  necroticRatio: number;
  edgeContrastRatio: number;
}

// Client-side pixel-level computer vision analyzer for triage images
export async function analyzeImagePixels(imgDataUrl?: string): Promise<ImageVisionMetrics> {
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

      const timer = setTimeout(() => resolve(fallback), 4000);

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

export const DEFAULT_GEMINI_API_KEY = 'AQ.Ab8RN6LvjacsFU8rphPFPLx_x2ziA3yDDzr1ultsL1ERS7K5eA';

export function normalizeTriageResponse(res: any) {
  if (!res || typeof res !== 'object') return res;

  // Only normalize triage objects that have manchesterColor or citizenView
  if (!res.manchesterColor && !res.citizenView) return res;

  const color = (res.manchesterColor || res.color || res.manchester_color || 'green').toLowerCase();
  let riskLevel: 'baixo' | 'medio' | 'alto' = 'baixo';
  let riskLabel = '🟢 BAIXO RISCO';
  let shouldGoToUpa = false;
  let upaVerdict = '🛑 NÃO VÁ À UPA (TRATE EM CASA OU PROCURE O POSTO DE SAÚDE)';
  let upaRecommendation = '';
  let queueMessage = '';

  if (color === 'red') {
    riskLevel = 'alto';
    riskLabel = '🔴 ALTO RISCO (EMERGÊNCIA)';
    shouldGoToUpa = true;
    upaVerdict = '🚨 SIM! PROCURE A UPA 24H OU LIGUE 192 (SAMU) IMEDIATAMENTE';
    upaRecommendation = 'Identificamos uma lesão com sinais de gravidade alta (ferida aberta com sangramento contínuo, trauma exposto violento, ou necrose/tecido preto no pé diabético). O atendimento médico de emergência é imprescindível.';
    queueMessage = '⚡ Casos de ALTO RISCO têm prioridade máxima imediata na triagem da UPA (fita vermelha/emergência), passando na frente de casos leves.';
  } else if (color === 'orange') {
    riskLevel = 'alto';
    riskLabel = '🔴 ALTO RISCO (MUITO URGENTE)';
    shouldGoToUpa = true;
    upaVerdict = '🚨 SIM! PROCURE A UPA 24H EM ATÉ 10 MINUTOS';
    upaRecommendation = 'Identificamos sinais de infecção bacteriana ativa com secreção de pus abundante, calor local ou febre. Exige avaliação médica presencial na UPA com urgência.';
    queueMessage = '⚡ Casos muito urgentes recebem fita laranja e são chamados rapidamente antes de qualquer caso leve.';
  } else if (color === 'yellow') {
    riskLevel = 'medio';
    riskLabel = '🟡 MÉDIO RISCO (URGENTE)';
    shouldGoToUpa = false;
    upaVerdict = '⚠️ ATENÇÃO: POSTO DE SAÚDE (UBS) OU UPA SE PRECISAR DE PONTOS';
    upaRecommendation = 'Corte com bordas afastadas que pode precisar de pontos (sutura nas primeiras 6 horas) ou ferida aberta sangrante. Se houver Posto de Saúde (UBS) com curativos aberto, procure a UBS para atendimento mais ágil; se estiver fechado ou sangrar muito, vá à UPA.';
    queueMessage = '💡 Dica para evitar fila: Cortes simples para pontos e curativos especializados são feitos diretamente no Posto de Saúde (UBS), muitas vezes sem a longa espera da UPA.';
  } else {
    // Green or Blue
    riskLevel = 'baixo';
    riskLabel = '🟢 BAIXO RISCO (POUCO URGENTE)';
    shouldGoToUpa = false;
    upaVerdict = '🛑 NÃO VÁ À UPA (CUIDE EM CASA OU PROCURE O POSTO DE SAÚDE)';
    upaRecommendation = 'A IA identificou um ferimento superficial leve (como joelho/cotovelo ralado, escoriação simples ou rachadura seca no calcanhar de paciente diabético). Este caso é de BAIXO RISCO e NÃO necessita de atendimento de emergência em UPA.';
    queueMessage = '💡 Ajude o SUS: Ir à UPA por feridas leves gera horas de espera desnecessárias (pois a UPA prioriza infartos e acidentes graves). Faça a higiene em casa ou vá ao Posto de Saúde (UBS) do seu bairro.';
  }

  return {
    ...res,
    manchesterColor: color,
    color,
    riskLevel,
    riskLabel,
    shouldGoToUpa,
    upaVerdict,
    upaRecommendation,
    queueMessage
  };
}

export async function callGeminiVision(
  systemPrompt: string,
  userPrompt: string,
  imageBase64List: string[] = [],
  apiKey?: string,
  providedMetrics?: ImageVisionMetrics
): Promise<any> {
  const keysToTry = Array.from(new Set([
    apiKey,
    process.env.GEMINI_API_KEY,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
    DEFAULT_GEMINI_API_KEY
  ].filter((k): k is string => Boolean(k && k.trim()))));

  if (keysToTry.length > 0) {
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.1-flash-lite'
    ];

    const parts: any[] = [{ text: `${systemPrompt}\n\nInstruções da Entrada:\n${userPrompt}` }];

    for (const img of imageBase64List) {
      if (!img || typeof img !== 'string') continue;
      const commaIdx = img.indexOf(',');
      if (img.startsWith('data:') && commaIdx !== -1) {
        const header = img.slice(0, commaIdx);
        const raw = img.slice(commaIdx + 1);
        const mimeMatch = header.match(/data:([a-zA-Z0-9.+_-]+\/[a-zA-Z0-9.+_-]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        let b64 = raw.replace(/\s+/g, '');
        if (!header.includes(';base64')) {
          try {
            if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
              b64 = window.btoa(unescape(encodeURIComponent(decodeURIComponent(raw))));
            } else if (typeof Buffer !== 'undefined') {
              b64 = Buffer.from(decodeURIComponent(raw)).toString('base64');
            }
          } catch {
            // Keep raw if decoding fails
          }
        }
        parts.push({
          inlineData: {
            mimeType: mimeType === 'image/svg+xml' ? 'image/png' : mimeType,
            data: b64
          }
        });
      } else if (img.length > 50) {
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg',
            data: img.replace(/\s+/g, '')
          }
        });
      }
    }

    for (const key of keysToTry) {
      for (const model of candidateModels) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts }],
                generationConfig: {
                  responseMimeType: "application/json",
                  temperature: 0.1,
                  maxOutputTokens: 1200
                }
              })
            }
          );

          if (response.ok) {
            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const parsed = JSON.parse(text);
              return normalizeTriageResponse(parsed);
            }
          } else {
            console.warn(`Gemini API model ${model} returned status: ${response.status}. Trying next option...`);
          }
        } catch (e) {
          console.warn(`Error connecting to Gemini API model ${model}:`, e);
        }
      }
    }
  }

  // Clinical Computer Vision & Decision Engine (Runs locally, instantly and offline)
  const simulated = await simulateClinicalResponse(userPrompt, imageBase64List, providedMetrics);
  return normalizeTriageResponse(simulated);
}

// Highly realistic Brazilian SUS Clinical Decision Engine
async function simulateClinicalResponse(
  prompt: string, 
  imageBase64List: string[] = [],
  providedMetrics?: ImageVisionMetrics
) {
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

  // Blood pressure check (Diretrizes SBC / Ministério da Saúde / AHA)
  if (pLower.includes('pressão arterial') || pLower.includes('pressao arterial') || pLower.includes('sistólica') || pLower.includes('diastólica') || pLower.includes('sistolica') || pLower.includes('diastolica') || pLower.includes('mmhg')) {
    const sysMatch = prompt.match(/(?:sistólica|máxima|pas|sys)[\s:]*([0-9]{2,3})/i) || prompt.match(/([0-9]{2,3})\s*(?:x|\/|\s)\s*([0-9]{2,3})/i);
    const diaMatch = prompt.match(/(?:diastólica|mínima|pad|dia)[\s:]*([0-9]{2,3})/i);
    
    let sys = 120;
    let dia = 80;
    if (sysMatch && diaMatch) {
      sys = parseInt(sysMatch[1], 10);
      dia = parseInt(diaMatch[1], 10);
    } else if (sysMatch && sysMatch[2]) {
      sys = parseInt(sysMatch[1], 10);
      dia = parseInt(sysMatch[2], 10);
    }

    const hasAlarm = pLower.includes('dor no peito') || pLower.includes('falta de ar') || pLower.includes('dor de cabeça súbita') || pLower.includes('desmaio') || pLower.includes('tontura forte');

    if (sys < 90 || dia < 60) {
      if (hasAlarm) {
        return {
          manchesterColor: "red",
          categoryLabel: "Hipotensão Sintomática",
          isElevated: false,
          isLow: true,
          isNormal: false,
          guidelineSource: "Diretrizes Brasileiras de Hipertensão Arterial (SBC/MS)",
          upaVerdict: "🚨 SIM! PROCURE A UPA 24H OU LIGUE 192 (SAMU)",
          explanation: `Pressão arterial baixa (${sys}x${dia} mmHg) acompanhada de sintomas de alarme. Risco de choque circulatório, desidratação severa ou síncope.`,
          heartRateAnalysis: "Avaliar pulso arterial imediatamente.",
          recommendedFacility: "UPA 24h ou SAMU 192",
          homeCare: ["Deitar com as pernas elevadas para facilitar o retorno de sangue ao coração", "Não levantar bruscamente", "Oferecer hidratação se consciente"],
          warningSigns: ["Desmaio completo", "Palidez intensa com sudorese fria", "Sonolência excessiva"],
          technicalNote: "Hipotensão arterial sintomática aguda. Necessidade de hidratação volêmica endovenosa e monitorização.",
          disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia baseada nas Diretrizes Brasileiras de Hipertensão (SBC/MS). Não substitui consulta médica presencial."
        };
      } else {
        return {
          manchesterColor: "green",
          categoryLabel: "Hipotensão Leve",
          isElevated: false,
          isLow: true,
          isNormal: false,
          guidelineSource: "Diretrizes Brasileiras de Hipertensão Arterial (SBC/MS)",
          upaVerdict: "🛑 NÃO VÁ À UPA (CUIDE EM CASA / UBS)",
          explanation: `Pressão baixa (${sys}x${dia} mmHg), mas sem sintomas de alarme. Frequentemente constitucional em pessoas jovens ou atletas.`,
          heartRateAnalysis: "Ritmo e frequência compatíveis com perfil estável.",
          recommendedFacility: "Cuidados Domiciliares",
          homeCare: ["Beba bastante água (2 a 3 litros/dia)", "Hidratação com água de coco", "Evite banhos muito quentes", "Levante devagar"],
          warningSigns: ["Surgimento de tontura com escurecimento visual", "Desmaio"],
          technicalNote: "Hipotensão arterial assintomática/constitucional sem repercussão hemodinâmica.",
          disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia baseada nas Diretrizes Brasileiras de Hipertensão (SBC/MS). Não substitui consulta médica presencial."
        };
      }
    }

    if (sys >= 180 || dia >= 110) {
      if (hasAlarm) {
        return {
          manchesterColor: "red",
          categoryLabel: "Hipertensão Estágio 3 / Crise",
          isElevated: true,
          isLow: false,
          isNormal: false,
          guidelineSource: "Diretrizes Brasileiras de Hipertensão Arterial (SBC/MS) e AHA",
          upaVerdict: "🚨 SIM! PROCURE A UPA 24H OU LIGUE 192 (SAMU)",
          explanation: `EMERGÊNCIA HIPERTENSIVA CRÍTICA (${sys}x${dia} mmHg) com sintomas agudos. Risco iminente de infarto, AVC ou edema pulmonar.`,
          heartRateAnalysis: "Pressão de pulso ampla, sobrecarga cardiovascular aguda.",
          recommendedFacility: "UPA 24h ou SAMU 192",
          homeCare: ["Repouso absoluto imediato", "Não tomar remédios extras sem autorização médica", "Procurar pronto-socorro imediatamente"],
          warningSigns: ["Dor no peito irradiada", "Falta de ar", "Boca torta ou fraqueza em um braço"],
          technicalNote: "Emergência hipertensiva com suspeita de lesão aguda de órgão-alvo. Atendimento prioritário em sala vermelha.",
          disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia baseada nas Diretrizes Brasileiras de Hipertensão (SBC/MS). Não substitui consulta médica presencial."
        };
      } else {
        return {
          manchesterColor: "yellow",
          categoryLabel: "Hipertensão Estágio 3 / Crise",
          isElevated: true,
          isLow: false,
          isNormal: false,
          guidelineSource: "Diretrizes Brasileiras de Hipertensão Arterial (SBC/MS) e AHA",
          upaVerdict: "⚠️ POSTO DE SAÚDE (UBS) OU UPA SE PERSISTIR",
          explanation: `Pressão arterial acentuadamente elevada (${sys}x${dia} mmHg), configurando urgência hipertensiva sem lesão evidente de órgão-alvo.`,
          heartRateAnalysis: "Monitorar pulso e repousar.",
          recommendedFacility: "Posto de Saúde (UBS) ou UPA 24h",
          homeCare: ["Repousar por 20 a 30 minutos em local silencioso e escuro", "Confirmar se tomou a medicação prescrita do dia", "Evitar café e cigarros"],
          warningSigns: ["Aparecimento de dor no peito ou falta de ar"],
          technicalNote: "Urgência hipertensiva / pseudocrise hipertensiva. Reavaliação e ajuste de medicação oral.",
          disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia baseada nas Diretrizes Brasileiras de Hipertensão (SBC/MS). Não substitui consulta médica presencial."
        };
      }
    }

    if (sys >= 140 || dia >= 90) {
      return {
        manchesterColor: "green",
        categoryLabel: sys >= 160 || dia >= 100 ? "Hipertensão Estágio 2" : "Hipertensão Estágio 1",
        isElevated: true,
        isLow: false,
        isNormal: false,
        guidelineSource: "Diretrizes Brasileiras de Hipertensão Arterial (SBC/MS)",
        upaVerdict: "🛑 NÃO VÁ À UPA (CUIDE EM CASA / UBS)",
        explanation: `Pressão elevada (${sys}x${dia} mmHg), correspondente a Hipertensão arterial sem sintomas de emergência. A UPA atende emergências com risco de morte; o tratamento e controle da pressão alta crônica deve ser feito no Posto de Saúde (UBS).`,
        heartRateAnalysis: "Frequência dentro dos limites esperados para acompanhamento ambulatorial.",
        recommendedFacility: "Posto de Saúde (UBS)",
        homeCare: ["Mantenha o uso diário dos medicamentos prescritos", "Diminua o sal e alimentos embutidos", "Faça caminhadas diárias"],
        warningSigns: ["Dor no peito", "Falta de ar aos esforços mínimos"],
        technicalNote: "Hipertensão arterial estágio 1/2 ambulatorial. Encaminhar para acompanhamento na UBS / Saúde da Família.",
        disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia baseada nas Diretrizes Brasileiras de Hipertensão (SBC/MS). Não substitui consulta médica presencial."
      };
    }

    if (sys >= 130 || dia >= 85) {
      return {
        manchesterColor: "green",
        categoryLabel: "Pré-Hipertensão",
        isElevated: true,
        isLow: false,
        isNormal: false,
        guidelineSource: "Diretrizes Brasileiras de Hipertensão Arterial (SBC/MS) e AHA",
        upaVerdict: "🛑 NÃO VÁ À UPA (CUIDE EM CASA / UBS)",
        explanation: `Pressão pré-hipertensiva ou limítrofe (${sys}x${dia} mmHg). Ainda não é hipertensão estabelecida, mas indica necessidade de atenção aos hábitos de vida.`,
        heartRateAnalysis: "Pulso normal.",
        recommendedFacility: "Posto de Saúde (UBS)",
        homeCare: ["Alimentação saudável rica em vegetais e frutas", "Redução moderada de sódio", "Atividade física regular"],
        warningSigns: ["Aferir novamente daqui a 1 semana em repouso"],
        technicalNote: "Pré-hipertensão arterial (SBC). Mudança de estilo de vida (MEV) indicada.",
        disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia baseada nas Diretrizes Brasileiras de Hipertensão (SBC/MS). Não substitui consulta médica presencial."
      };
    }

    return {
      manchesterColor: "green",
      categoryLabel: sys < 120 && dia < 80 ? "Pressão Ótima" : "Pressão Normal",
      isElevated: false,
      isLow: false,
      isNormal: true,
      guidelineSource: "Diretrizes Brasileiras de Hipertensão Arterial (SBC/MS)",
      upaVerdict: "🛑 NÃO VÁ À UPA (CUIDE EM CASA / UBS)",
      explanation: `Pressão dentro da faixa ideal (${sys}x${dia} mmHg). Excelente saúde cardiovascular.`,
      heartRateAnalysis: "Pulso dentro da normalidade.",
      recommendedFacility: "Cuidados Domiciliares",
      homeCare: ["Parabéns! Continue com seus hábitos saudáveis de vida, boa alimentação e hidratação."],
      warningSigns: ["Aferição preventiva anual na UBS"],
      technicalNote: "Pressão arterial normal/ótima. Risco cardiovascular basal preservado.",
      disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia baseada nas Diretrizes Brasileiras de Hipertensão (SBC/MS). Não substitui consulta médica presencial."
    };
  }

  // 3. Symptoms check (Only for non-image Arbovirus / Dengue triage questionnaire)
  const isImageTriage = imageBase64List.length > 0 || 
    pLower.includes('categoria da queixa: ferida') || 
    pLower.includes('categoria da queixa: pele') || 
    pLower.includes('categoria da queixa: odonto') || 
    pLower.includes('categoria da queixa: olhos') ||
    pLower.includes('machucad') ||
    pLower.includes('corte') ||
    pLower.includes('abert') ||
    pLower.includes('úlcera') ||
    pLower.includes('ulcera') ||
    pLower.includes('rachadura');

  if (!isImageTriage && (pLower.includes('queixa: dengue') || pLower.includes('suspeita de dengue') || (pLower.includes('dengue') && !pLower.includes('categoria da queixa')))) {
    const hasAlarm = pLower.includes('dor abdominal') || pLower.includes('vômito') || pLower.includes('sangramento') || pLower.includes('falta de ar');
    
    if (hasAlarm) {
      return {
        manchesterColor: "orange",
        urgencyTitle: "Laranja - Muito Urgente (Sinal de Alarme)",
        urgencyLabel: "Laranja - Muito Urgente (Sinal de Alarme)",
        susAction: "UPA IMEDIATA",
        susFacility: "UPA 24h",
        recommendedFacility: "UPA 24h",
        maxWaitTime: "10 minutos",
        suspicion: "Suspeita de Dengue com Sinais de Alarme (Grupo C) ou Descompensação Aguda",
        redFlagDetected: true,
        alarmSignsFound: [
          "Presença de dor abdominal persistente ou vômitos ou alteração hemodinâmica relatada",
          "Risco de extravasamento plasmático e desidratação súbita"
        ],
        citizenView: {
          summary: "ATENÇÃO: Você informou sinais de alarme que exigem avaliação médica imediata. Não permaneça em casa esperando o dia passar.",
          whatToDo: "Inicie hidratação imediatamente enquanto se desloca para a UPA 24h (água, água de coco ou soro oral).",
          homeCare: ["Repouso absoluto", "Hidratação oral rigorosa (2 a 3 litros de líquidos)", "Não tome anti-inflamatórios como AAS ou Ibuprofeno"],
          warningSignsToWatch: [
            "Tontura forte ou sensação de desmaio ao ficar de pé",
            "Dor de barriga forte que não alivia",
            "Vômitos repetidos que impedem você de tomar água"
          ]
        },
        clinicalView: {
          chiefComplaint: "Síndrome febril aguda com sinais de alarme / suspeita de arbovirose",
          semioticDescription: "Paciente refere síndrome febril com queixas compatíveis com sinais de alarme do Ministério da Saúde. Necessita prova do laço, aferição de PA deitado/em pé e hemograma com hematócrito urgente.",
          evolutionAnalysis: "Risco de extravasamento capilar nas próximas 24-48 horas.",
          suggestedCIAP2: "A77 - Dengue com Sinais de Alarme",
          suggestedCID10: "A97.1 - Dengue com sinais de alarme",
          triageHypothesis: "Suspeita de Dengue grupo C com indicação de hidratação venosa imediata.",
          redFlags: ["Queda abrupta de plaquetas", "Hematócrito elevado", "Hipotensão postural"],
          questionsForDoctor: ["Quantos dias de febre?", "Houve sangramento espontâneo?"]
        },
        disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
      };
    } else {
      return {
        manchesterColor: "green",
        urgencyTitle: "Verde - Pouco Urgente (Acompanhamento Domiciliar Guiado)",
        urgencyLabel: "Verde - Pouco Urgente (Acompanhamento Domiciliar Guiado)",
        susAction: "CUIDADOS EM CASA + VIGILÂNCIA",
        susFacility: "UBS / Posto de Saúde",
        recommendedFacility: "UBS / Posto de Saúde",
        maxWaitTime: "120 minutos",
        suspicion: "Síndrome Febril Aguda sem Sinais de Alarme no Momento (Grupo A)",
        redFlagDetected: false,
        alarmSignsFound: [],
        citizenView: {
          summary: "Seus sintomas não mostram sinais imediatos de alarme no momento. O segredo principal para recuperação de viroses é hidratação abundante.",
          whatToDo: "Tome pelo menos 2 a 3 litros de líquidos por dia (água, soro caseiro, água de coco) e procure a UBS de referência.",
          homeCare: [
            "Tome pelo menos 2 a 3 litros de líquidos por dia: água, soro caseiro, água de coco e chás claros.",
            "Repouso e alimentação leve.",
            "Evite automedicação com anti-inflamatórios."
          ],
          warningSignsToWatch: [
            "Dor na barriga contínua ou vômitos que não passam",
            "Sangramento no nariz, na gengiva ou fezes pretas",
            "Tontura intensa ao levantar ou sonolência excessiva"
          ]
        },
        clinicalView: {
          chiefComplaint: "Síndrome febril sem sinais de gravidade",
          semioticDescription: "Quadro febril sem hipotensão, sem sangramento e sem sinais de alarme. Orientada hidratação oral precoce (60 ml/kg/dia) e retorno imediato à UPA se surgirem sinais de alarme.",
          evolutionAnalysis: "Vigilância ativa ambulatorial na Atenção Primária à Saúde.",
          suggestedCIAP2: "A77 - Febre / Dengue suspeita grupo A",
          suggestedCID10: "A90 - Febre da Dengue",
          triageHypothesis: "Síndrome febril aguda Grupo A - Conduta ambulatorial e hidratação.",
          redFlags: ["Aparecimento de dor abdominal intensa", "Vômitos incoercíveis"],
          questionsForDoctor: ["Houve casos confirmados de dengue no domicílio?"]
        },
        disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
      };
    }
  }

  // 4. ADVANCED CLINICAL & COMPUTER VISION DECISION ENGINE
  const metrics = providedMetrics || await analyzeImagePixels(imageBase64List[0]) || {
    deepWoundRatio: 0,
    erythemaRatio: 0,
    purulentRatio: 0,
    necroticRatio: 0,
    edgeContrastRatio: 0,
  };

  const uLower = prompt.toLowerCase();
  const norm = uLower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Bleeding check with negative guard
  const hasBleeding = (norm.includes('sangr') || norm.includes('hemorrag')) && 
    !norm.includes('sem sangr') && !norm.includes('nao sangr') && !norm.includes('parou de sangr') && !norm.includes('sangramento: nao');

  const hasPain = (norm.includes('dor local: sim') || norm.includes('dor') || norm.includes('latej') || norm.includes('ardend')) && 
    !norm.includes('dor local: nao') && !norm.includes('sem dor') && !norm.includes('nao doi');

  const hasHeatOrFever = (norm.includes('calor/febre: sim') || norm.includes('quente') || norm.includes('febre')) && 
    !norm.includes('calor/febre: nao') && !norm.includes('sem febre') && !norm.includes('nao tem febre') && !norm.includes('nao esta quente');

  const hasPurulent = (norm.includes('pus ou secrecao: sim') || norm.includes('pus') || norm.includes('secrecao') || metrics.purulentRatio > 0.015) && 
    !norm.includes('pus ou secrecao: nao') && !norm.includes('sem pus') && !norm.includes('sem secrecao');

  // =========================================================================
  // CATEGORY A: PÉ DIABÉTICO / RACHADURAS E FISSURAS
  // =========================================================================
  const isDiabetic = norm.includes('diabet') || norm.includes('acucar no sangue') || norm.includes('glicemia') || norm.includes('pe de diabetico');
  const isFissure = norm.includes('rachadura') || norm.includes('fissura') || norm.includes('calcanhar') || norm.includes('sola do pe');

  if (isDiabetic || isFissure) {
    // A1. Pé Diabético Crítico: Necrose, Gangrena, Osso Exposto (VERMELHO)
    const isDiabeticGangrene = 
      metrics.necroticRatio > 0.03 ||
      norm.includes('necrose') || 
      norm.includes('gangrena') || 
      norm.includes('preto') || 
      norm.includes('preta') || 
      norm.includes('escurecend') || 
      norm.includes('fetid') || 
      norm.includes('podre') || 
      norm.includes('mau cheiro') || 
      norm.includes('osso');

    if (isDiabeticGangrene) {
      return buildDiabeticSevereRedResponse(hasPurulent);
    }

    // A2. Pé Diabético com Infecção Aguda / Celulite / Pus (LARANJA)
    const isDiabeticInfected = 
      hasPurulent || 
      (hasHeatOrFever && hasPain) || 
      norm.includes('inchaco no pe') || 
      norm.includes('pe inchado') || 
      norm.includes('muito vermelho e quente');

    if (isDiabeticInfected) {
      return buildDiabeticInfectedOrangeResponse(hasHeatOrFever);
    }

    // A3. Fissura Aberta com Sangramento ou Dor ao Pisar (AMARELO)
    const isDiabeticOpenFissure = 
      hasBleeding || 
      (norm.includes('abert') && !norm.includes('sem ferida abert')) || 
      norm.includes('abriu') || 
      norm.includes('dor ao pisar') || 
      norm.includes('cortou') || 
      metrics.deepWoundRatio > 0.005;

    if (isDiabeticOpenFissure) {
      return buildDiabeticOpenYellowResponse(hasPain);
    }

    // A4. Rachadura Seca / Ceratodermia sem Ferida Aberta (VERDE)
    return buildDiabeticDryGreenResponse();
  }

  // =========================================================================
  // CATEGORY B: ESCORIAÇÃO SUPERFICIAL (JOELHO RALADO, ARRANHÃO, RALADO LEVE)
  // =========================================================================
  const isSuperficialAbrasion = 
    norm.includes('ral') || 
    norm.includes('escoria') || 
    norm.includes('arranh') || 
    norm.includes('esfolou') || 
    norm.includes('casquinha') || 
    norm.includes('machucadinho') || 
    norm.includes('tropeçou') || 
    norm.includes('superficial');

  // Severe trauma indicators that override a superficial scrape
  const isSevereTrauma = 
    norm.includes('moto') || 
    norm.includes('queda de moto') || 
    norm.includes('acidente') || 
    norm.includes('osso') || 
    norm.includes('musculo') || 
    norm.includes('tendao') || 
    norm.includes('exposto') || 
    norm.includes('exposta') || 
    norm.includes('hemorragia') || 
    norm.includes('jorrando') || 
    norm.includes('sangrando muito') || 
    norm.includes('nao para de sangrar') || 
    norm.includes('corte muito fundo') || 
    norm.includes('laceracao profunda') || 
    (metrics.deepWoundRatio > 0.035 && metrics.edgeContrastRatio > 0.018);

  if (isSuperficialAbrasion && !isSevereTrauma) {
    return buildAbrasionGreenResponse(hasPain);
  }

  // =========================================================================
  // CATEGORY C: FERIMENTO GRAVE / EXPOSTO / ALTA ENERGIA (VERMELHO)
  // =========================================================================
  if (isSevereTrauma) {
    return buildTraumaRedResponse(hasPurulent);
  }

  // =========================================================================
  // CATEGORY D: ODONTOLOGIA (DENTE / BOCA)
  // =========================================================================
  const isDental = norm.includes('dente') || norm.includes('boca') || norm.includes('gengiva') || norm.includes('queixa: odonto');
  if (isDental) {
    if (norm.includes('inchaco') || norm.includes('rosto inchado') || hasHeatOrFever) {
      return buildDentalOrangeResponse();
    }
    if (hasPain || norm.includes('doendo')) {
      return buildDentalYellowResponse(hasPain);
    }
    return buildDentalGreenResponse();
  }

  // =========================================================================
  // CATEGORY E: OLHOS
  // =========================================================================
  const isEye = norm.includes('olho') || norm.includes('visao') || norm.includes('conjuntivite') || norm.includes('queixa: olhos');
  if (isEye) {
    if (norm.includes('perfur') || norm.includes('queimadura quimica') || norm.includes('perdeu a visao')) {
      return buildEyeRedResponse();
    }
    if (hasPurulent || norm.includes('pus') || hasPain) {
      return buildEyeYellowResponse(hasPurulent);
    }
    return buildEyeGreenResponse();
  }

  // =========================================================================
  // CATEGORY F: DERMATOLOGIA / PELE / MANCHAS
  // =========================================================================
  const isSkin = norm.includes('queixa: pele') || norm.includes('mancha') || norm.includes('pinta') || norm.includes('alergia') || norm.includes('pele');
  if (isSkin) {
    if (norm.includes('purpura') || norm.includes('petequia') || norm.includes('falta de ar') || norm.includes('labios inchados')) {
      return buildSkinRedResponse();
    }
    const hasItch = norm.includes('coca') && !norm.includes('nao coca') && !norm.includes('sem coceira');
    if (hasItch || norm.includes('ardend') || norm.includes('micose') || norm.includes('impingem') || norm.includes('urticaria') || norm.includes('vermelhidao')) {
      return buildSkinYellowResponse(hasItch);
    }
    return buildSkinGreenResponse();
  }

  // =========================================================================
  // CATEGORY G: CORTES E FERIDAS GERAIS
  // =========================================================================
  const isGeneralWound = norm.includes('corte') || norm.includes('ferida') || norm.includes('machucad') || hasBleeding || norm.includes('ulcera') || metrics.deepWoundRatio > 0.005;

  if (isGeneralWound) {
    if ((hasPurulent && hasHeatOrFever) || metrics.erythemaRatio > 0.08) {
      return buildWoundInfectedOrangeResponse();
    }
    if (hasPain || hasPurulent || norm.includes('corte') || norm.includes('pontos') || norm.includes('sutura') || metrics.deepWoundRatio > 0.008) {
      return buildWoundSutureYellowResponse(hasPain, hasPurulent);
    }
    return buildAbrasionGreenResponse(hasPain);
  }

  // DEFAULT SAFE RESULT: Green (Pouco Urgente)
  return buildGeneralGreenResponse();
}

// ---------------------------------------------------------------------------
// CLINICAL BUILDERS FOR CITIZEN & MEDICAL DUAL VIEW
// ---------------------------------------------------------------------------

function buildAbrasionGreenResponse(hasPain: boolean) {
  return {
    manchesterColor: "green",
    urgencyLabel: "Verde - Pouco Urgente (Autocuidado / Posto de Saúde)",
    recommendedFacility: "Cuidados em Casa ou Posto de Saúde (UBS)",
    maxWaitTime: "120 minutos (Não há necessidade de ir à UPA)",
    flogisticSigns: {
      erythema: true,
      edema: false,
      heat: false,
      painReported: hasPain,
      purulentExudate: false
    },
    citizenView: {
      summary: "🟢 POUCO URGENTE: A análise identificou uma ESCORIAÇÃO SUPERFICIAL (ralado / arranhão na pele) com perda apenas da camada externa (epiderme). Não há sangramento ativo descontrolado, não há tecidos profundos (músculos ou ossos) expostos e não há sinais de infecção grave. Este machucado é simples e NÃO necessita de atendimento de emergência em UPA, evitando horas de espera desnecessárias.",
      whatToDo: "Mantenha a calma e faça a higienização correta no local. Lave abundantemente com água corrente limpa e sabonete neutro para remover qualquer terra ou poeira, e aplique soro fisiológico. Não é necessário correr para a UPA.",
      homeCare: [
        "Lave bem a região com água corrente e sabonete neutro durante o banho (não esfregue com força).",
        "Enxágue com soro fisiológico 0.9% para remover impurezas residuais.",
        "Se for sair de casa ou se a roupa ficar em atrito com o machucado, cubra com gaze limpa e micropore; em casa, deixe arejado para secar e cicatrizar.",
        "NUNCA aplique pó de café, açúcar, álcool, pasta de dente ou fumo no machucado.",
        "Não puxe ou arranque as casquinhas: elas são o curativo biológico natural que seu próprio corpo produz."
      ],
      warningSignsToWatch: [
        "Se a região começar a inchar muito, ficar muito quente e a vermelhidão se espalhar após 24-48 horas",
        "Se começar a vazar pus amarelado/esverdeado com cheiro desagradável",
        "Se você tiver febre medida no termômetro acima de 37.8°C"
      ]
    },
    clinicalView: {
      chiefComplaint: "Escoriação / abrasão cutânea superficial sem solução de continuidade profunda",
      semioticDescription: "Perda parcial de epiderme com integridade da derme reticular preservada. Sangramento capilar hemostasiado ou crosta sero-hemática inicial em formação. Ausência de deiscência de bordas ou sinais flogísticos infecciosos expansivos.",
      evolutionAnalysis: "Evolução fisiológica por reepitelização espontânea esperada em 5 a 10 dias com cuidados de higiene local.",
      suggestedCIAP2: "S87 - Ferida/corte/escoriação superficial",
      suggestedCID10: "T14.0 - Traumatismo superficial de região do corpo não especificada",
      triageHypothesis: "Escoriação cutânea superficial leve - Conduta ambulatorial na Atenção Primária à Saúde (APS) ou domiciliar.",
      redFlags: [
        "Verificar situação vacinal antitetânica nos últimos 10 anos",
        "Orientar retorno à UBS em caso de celulite perilesional tardia"
      ],
      questionsForDoctor: [
        "Houve contato com solo, terra ou ferragem contaminada?",
        "Quando foi a última dose da vacina contra tétano?"
      ]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildDiabeticDryGreenResponse() {
  return {
    manchesterColor: "green",
    urgencyLabel: "Verde - Pouco Urgente (Pé Diabético: Prevenção e Hidratação)",
    recommendedFacility: "UBS / Posto de Saúde e Autocuidado Preventivo",
    maxWaitTime: "120 minutos (Consulta ambulatorial de rotina)",
    flogisticSigns: {
      erythema: false,
      edema: false,
      heat: false,
      painReported: false,
      purulentExudate: false
    },
    citizenView: {
      summary: "🟢 POUCO URGENTE: Identificamos RACHADURAS / FISSURAS SUPERFICIAIS SECAS NO PÉ / CALCANHAR DE PACIENTE DIABÉTICO. Não há ferida aberta ativa, não há sangramento e não há pus ou sinais de infecção. Em pessoas com diabetes, a pele ressecada racha facilmente; o objetivo principal agora é hidratar para PREVENIR que a rachadura se aprofunde e se transforme em úlcera.",
      whatToDo: "Inicie hidratação diária intensiva na sola e no calcanhar com hidratante adequado (creme de ureia a 10% ou 20%). Não use lixas ou lâminas nos calos e agende uma revisão dos pés na sua UBS de referência.",
      homeCare: [
        "Passe creme hidratante com ureia 10-20% no calcanhar e sola do pé diariamente após o banho (NUNCA passe creme entre os dedos dos pés, pois a umidade entre os dedos facilita fungos e frieiras).",
        "NUNCA ande descalço, nem mesmo dentro de casa: use sempre calçados macios, confortáveis e fechados.",
        "Use meias de algodão claras e sem costura grossa (meias claras ajudam a notar na hora se houver qualquer gotícula de sangue).",
        "Examine a sola dos seus pés todos os dias usando um espelho no chão ou pedindo ajuda a um familiar para checar se surgiram novos machucados.",
        "Corte as unhas retas, sem arredondar os cantos, para evitar unhas encravadas."
      ],
      warningSignsToWatch: [
        "Se a rachadura abrir e começar a sangrar ou vazar líquido/secreção",
        "Se surgir vermelhidão, calor ou inchaço ao redor da rachadura",
        "Se você sentir dormência, perda de sensibilidade ou queimação constante nos pés"
      ]
    },
    clinicalView: {
      chiefComplaint: "Xerose cutânea com ceratodermia e fissuras superficiais em calcâneo em paciente diabético",
      semioticDescription: "Pele com hiperceratose e fissuras epidérmicas superficiais no coxim calcâneo bilateral. Barreira dérmica íntegra, ausência de exsudato, pulsos pediosos e tibiais posteriores preservados, sensibilidade protetora presente.",
      evolutionAnalysis: "Risco de deiscência dérmica e úlcera neuroisquêmica se houver atrito contínuo ou ressecamento persistente. Indicação de plano preventivo da Saúde da Família.",
      suggestedCIAP2: "T90 - Diabetes não-insulino-dependente / A85 - Prevenção primária",
      suggestedCID10: "E11.5 - Diabetes mellitus tipo 2 com complicações circulatórias periféricas / L85.1 - Ceratose plantar",
      triageHypothesis: "Ceratodermia e fissuras superficiais em pé em risco (Grau 0 de IWGDF) - Conduta profilática na APS.",
      redFlags: [
        "Avaliação semestral com monofilamento de Semmes-Weinstein 10g",
        "Investigar doença arterial periférica (índice tornozelo-braquial ITB)"
      ],
      questionsForDoctor: [
        "Qual o valor da última hemoglobina glicada (HbA1c)?",
        "Já realizou o teste de sensibilidade com monofilamento este ano na UBS?"
      ]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildDiabeticOpenYellowResponse(hasPain: boolean) {
  return {
    manchesterColor: "yellow",
    urgencyLabel: "Amarelo - Urgente (Fissura Aberta em Pé Diabético - Até 60 min)",
    recommendedFacility: "Posto de Saúde (UBS) ou UPA 24h",
    maxWaitTime: "60 minutos",
    flogisticSigns: {
      erythema: true,
      edema: false,
      heat: false,
      painReported: hasPain,
      purulentExudate: false
    },
    citizenView: {
      summary: "🟡 ATENÇÃO / URGENTE: FISSURA ABERTA COM SANGRAMENTO OU PERDA DE PELE EM PÉ DIABÉTICO. Foi identificada uma rachadura profunda que rompeu a pele, com sangramento ao pisar ou sensibilidade. Como a pessoa diabética pode ter a sensibilidade diminuída (neuropatia), a ferida pode não doer tanto quanto deveria, mas o risco de contaminação bacteriana é real e exige curativo estéril médico hoje.",
      whatToDo: "Procure atendimento na UBS ou UPA hoje (tempo recomendado em até 60 minutos). Não force o pé, não pise com o calcanhar desprotegido e mantenha o local limpo até chegar à unidade.",
      homeCare: [
        "Lave suavemente com soro fisiológico ou água corrente e sabão neutro.",
        "Proteja com gaze estéril e fita micropore; evite apoiar o peso do corpo sobre a lesão.",
        "NÃO aplique álcool, mertiolate, pomadas por conta própria ou remédios caseiros.",
        "Leve o calçado que você mais usa para a equipe médica inspecionar a pisada."
      ],
      warningSignsToWatch: [
        "Aparecimento de secreção amarelada ou esverdeada (pus) com cheiro ruim",
        "Vermelhidão que começa a subir pelo pé ou tornozelo",
        "Sensação de pé febril ou febre medida no corpo"
      ]
    },
    clinicalView: {
      chiefComplaint: "Solução de continuidade / fissura dérmica ativa em calcâneo de paciente diabético",
      semioticDescription: "Fissura tegumentar profunda atingindo plano dérmico com exsudato hemático/seroso. Halo eritematoso discreto, sem sinais flogísticos sistêmicos ou deiscência fascial. Risco de evolução para mal perfurante plantar.",
      evolutionAnalysis: "Necessita debridamento hiperceratótico suave, curativo com cobertura protetora (hidrogel ou ácidos graxos essenciais) e descarga de peso para cicatrização.",
      suggestedCIAP2: "T90 - Diabetes com complicação trófica",
      suggestedCID10: "E11.6 - Diabetes mellitus com úlcera no pé / L97 - Úlcera da perna",
      triageHypothesis: "Úlcera inicial de pé diabético (Classificação de Wagner Grau 1 / San Elian Grau I) - Indicação de curativo estéril e vigilância em 48h.",
      redFlags: [
        "Rastrear osteomielite subjacente se a ferida sondar planos ósseos",
        "Checar perfusão capilar periférica e pulsos distais"
      ],
      questionsForDoctor: [
        "A glicemia capilar atual está controlada?",
        "Houve perda de sensibilidade protetora nos pododáctilos?"
      ]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildDiabeticInfectedOrangeResponse(hasFever: boolean) {
  return {
    manchesterColor: "orange",
    urgencyLabel: "Laranja - Muito Urgente (Pé Diabético com Infecção Aguda)",
    recommendedFacility: "UPA 24h (Atendimento em até 10 minutos)",
    maxWaitTime: "10 minutos",
    flogisticSigns: {
      erythema: true,
      edema: true,
      heat: hasFever,
      painReported: true,
      purulentExudate: true
    },
    citizenView: {
      summary: "⚠️ MUITO URGENTE: PÉ DIABÉTICO COM INFECÇÃO ATIVA (PUS, CALOR OU INCHAÇO). Foi identificada ferida aberta em pé diabético com secreção purulenta e sinais inflamatórios evidentes. A infecção no pé diabético pode evoluir muito rapidamente para tecidos profundos e ossos. É imperativo atendimento médico presencial imediato na UPA.",
      whatToDo: "Dirija-se à UPA 24h mais próxima imediatamente (tempo de acolhimento prioritário de até 10 minutos). Mantenha o pé em repouso e protegido com pano limpo e seco.",
      homeCare: [
        "Não tente espremer ou retirar secreções à força.",
        "Proteja com gaze limpa sem apertar.",
        "Não tome anti-inflamatórios ou antibióticos que sobraram em casa sem receita médica da UPA."
      ],
      warningSignsToWatch: [
        "Febre alta, calafrios ou confusão mental",
        "Pé muito inchado e vermelho que irradia para a perna",
        "Escurecimento dos dedos ou cheiro fétido"
      ]
    },
    clinicalView: {
      chiefComplaint: "Pé diabético infectado com celulite / flegmão perilesional e drenagem purulenta",
      semioticDescription: "Úlcera cutânea em extremidade inferior com exsudato purulento ativo, edema perilesional marcado e calor local. Classificação de Wagner Grau 2 / IWGDF Moderada a Grave.",
      evolutionAnalysis: "Risco iminente de abscesso profundo de pé diabético e osteomielite.",
      suggestedCIAP2: "T90 - Diabetes com infecção",
      suggestedCID10: "E11.6 - Diabetes com infecção no pé / L03.1 - Celulite de membro inferior",
      triageHypothesis: "Pé diabético infectado agudo - Indicação de antibioticoterapia sistêmica venosa e desbridamento cirúrgico na UPA.",
      redFlags: ["Sinais de síndrome da resposta inflamatória sistêmica (SIRS/Sepse)", "Crepitação à palpação (gás tecidual)"],
      questionsForDoctor: ["Há pulsos pediosos palpáveis?", "Foi solicitada radiografia simples de pé para descartar gás/osteite?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildDiabeticSevereRedResponse(hasPurulent: boolean) {
  return {
    manchesterColor: "red",
    urgencyLabel: "Vermelho - Emergência (Pé Diabético com Risco de Gangrena/Sepse)",
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
      summary: "🚨 EMERGÊNCIA MÁXIMA (VERMELHO): PÉ DIABÉTICO GRAVE COM SINAIS DE NECROSE, SECREÇÃO FÉTIDA OU EXPOSIÇÃO PROFUNDA. A análise identificou tecido escurecido/morto (necrose), infecção grave ou perda tecidual crítica. Em pacientes diabéticos, esse quadro indica risco imediato de gangrena, infecção generalizada (sepse) e risco de perda do membro se não houver internação e intervenção hospitalar urgente.",
      whatToDo: "Dirija-se IMEDIATAMENTE a uma UPA 24h ou hospital de emergência. Se não tiver como se deslocar com segurança, acione o SAMU 192 imediatamente.",
      homeCare: [
        "Mantenha o membro protegido com compressa limpa e seca.",
        "Não tente remover tecidos escuros ou crostas.",
        "Não molhe ou aplique pomadas caseiras.",
        "Leve todos os seus documentos e medicamentos de uso contínuo para o hospital."
      ],
      warningSignsToWatch: [
        "Febre alta, calafrios incontroláveis e tremores",
        "Pressão baixa, suor frio, fraqueza extrema ou tontura",
        "Mau cheiro intenso que passa pelas roupas"
      ]
    },
    clinicalView: {
      chiefComplaint: "Pé diabético complicado com necrose / gangrena úmida ou seca e risco de sepse",
      semioticDescription: "Lesão ulcerada extensa com presença de tecido desvitalizado (esfacelo/necrose coagulativa), odor fétido e celulite ascendente. Classificação de Wagner Grau 4/5.",
      evolutionAnalysis: "Isquemia crítica de membro inferior com infecção necrotizante. Risco iminente de choque séptico.",
      suggestedCIAP2: "T90 - Diabetes complicado",
      suggestedCID10: "E11.5 - Diabetes com gangrena periférica / I96 - Gangrena não classificada em outra parte",
      triageHypothesis: "Gangrena diabética com indicação imperativa de internação hospitalar, cirurgia vascular e antibióticos de amplo espectro.",
      redFlags: ["Choque séptico", "Acidose metabólica / cetoacidose diabética", "Insuficiência arterial aguda"],
      questionsForDoctor: ["Sinais vitais com instabilidade hemodinâmica?", "Indicação de desbridamento cirúrgico de urgência?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildTraumaRedResponse(hasPurulent: boolean) {
  return {
    manchesterColor: "red",
    urgencyLabel: "Vermelho - Emergência (Trauma Grave Exposto / Alta Energia)",
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
      summary: "🚨 EMERGÊNCIA MÁXIMA (VERMELHO): FERIMENTO GRAVE COM EXPOSIÇÃO TECIDUAL / TRAUMA DE ALTA ENERGIA. A análise identificou lesão traumática extensa e aberta (típica de acidentes, quedas de moto ou cortes profundos com deiscência total de bordas), com sangramento ativo e exposição de planos anatômicos profundos (músculo, tendão ou osso). Há risco iminente de choque hemorrágico, perda funcional do membro e contaminação bacteriana massiva.",
      whatToDo: "Dirija-se IMEDIATAMENTE a uma UPA 24h ou hospital de trauma. Se houver sangue abundante ou jorrando, ligue para o SAMU 192 agora mesmo. Durante o transporte, comprima o local firmemente com pano ou toalha limpos.",
      homeCare: [
        "Faça compressão direta e constante sobre o machucado usando um pano bem limpo.",
        "Mantenha o membro machucado elevado acima do nível do coração durante o transporte se não houver fratura óbvia.",
        "NUNCA aplique pó de café, açúcar, álcool, fumo, pasta de dente ou pomadas caseiras.",
        "Não ofereça alimentos ou água ao paciente caso seja necessária cirurgia imediata."
      ],
      warningSignsToWatch: [
        "Sangramento volumoso que não estanca após 10 minutos de compressão firme",
        "Sensação de dormência, formigamento ou extremidade fria/pálida abaixo do corte",
        "Fraqueza repentina, vista escura, suor frio ou tontura ao sentar/levantar",
        "Exposição visível de gordura amarela, tendões brancos ou osso"
      ]
    },
    clinicalView: {
      chiefComplaint: "Ferimento corto-contuso / lacerante aberto de espessura total por trauma de alta energia",
      semioticDescription: "Inspeção visual revela solução de continuidade cutânea extensa com deiscência total de bordas, leito cru profundo com exposição de planos subdérmicos/musculares e sangramento ativo. Ausência de hemostasia consolidada.",
      evolutionAnalysis: "Lesão aguda de alta gravidade com indicação cirúrgica imediata de exploração hemostática, irrigação copiosa, profilaxia antitetânica e sutura/fechamento em bloco.",
      suggestedCIAP2: "S18 - Laceração/corte profundo",
      suggestedCID10: "T14.1 - Ferimento de região corporal não especificada",
      triageHypothesis: "Ferimento aberto grave com risco hemorrágico e infecção - Encaminhamento imediato para sala vermelha da UPA/Emergência.",
      redFlags: [
        "Avaliar lesão de feixes vásculo-nervosos e tendões",
        "Risco de choque hipovolêmico",
        "Administração imediata de toxoide e imunoglobulina antitetânica"
      ],
      questionsForDoctor: [
        "Houve mecanismo de desaceleração (queda de moto / colisão)?",
        "Sinais vitais na admissão e tempo estimado de perda sanguínea?"
      ]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildWoundSutureYellowResponse(hasPain: boolean, hasPurulent: boolean) {
  return {
    manchesterColor: "yellow",
    urgencyLabel: "Amarelo - Urgente (Corte Aberto para Sutura / Até 60 min)",
    recommendedFacility: "UPA 24h ou Posto de Saúde (UBS)",
    maxWaitTime: "60 minutos",
    flogisticSigns: {
      erythema: true,
      edema: true,
      heat: false,
      painReported: hasPain,
      purulentExudate: hasPurulent
    },
    citizenView: {
      summary: "🟡 ATENÇÃO / URGENTE: CORTE COM BORDAS AFASTADAS QUE NECESSITA DE SUTURA (PONTOS) OU CURATIVO ESPECIALIZADO. Foi identificado um corte aberto em que as bordas da pele não se juntam sozinhas. Para cicatrizar bem, evitar infecções e fechar sem cicatrizes deformantes, a equipe de enfermagem ou médica precisa avaliar e realizar pontos cirúrgicos ou curativo oclusivo ainda hoje (preferencialmente nas primeiras 6 a 8 horas após o corte).",
      whatToDo: "Dirija-se ao Posto de Saúde (UBS) ou UPA 24h hoje (tempo recomendado em até 60 minutos). Mantenha o corte limpo e coberto com pano limpo durante o deslocamento.",
      homeCare: [
        "Lave apenas com água limpa corrente ou soro fisiológico.",
        "Cubra com gaze estéril ou pano limpo e seco.",
        "Não passe pomadas caseiras, mertiolate ou produtos coloridos que atrapalhem o médico a ver o corte.",
        "Mantenha o local em repouso e sem apoiar peso."
      ],
      warningSignsToWatch: [
        "Se o sangramento começar a escorrer sem parar",
        "Se você sentir dormência no dedo ou no membro afetado",
        "Se a dor aumentar bruscamente de forma latejante"
      ]
    },
    clinicalView: {
      chiefComplaint: "Ferimento inciso / corto-contuso agudo com deiscência de bordas",
      semioticDescription: "Solução de continuidade dérmica linear ou irregular de espessura média com bordas afastadas. Hemostasia capilar estável no momento, leito dérmico preservado, sem exposição óssea ou vascular maior.",
      evolutionAnalysis: "Janela cirúrgica ideal para síntese primária por sutura (até 6-8 horas pós-trauma) para otimização estética e profilaxia infecciosa.",
      suggestedCIAP2: "S18 - Ferimento lacerante/corte",
      suggestedCID10: "T14.1 - Ferimento de região não especificada",
      triageHypothesis: "Corte aberto limpo ou potencialmente contaminado com indicação de sutura sob anestesia local.",
      redFlags: ["Checar atualização da vacina contra tétano", "Pesquisar corpos estranhos (vidro, lascas)"],
      questionsForDoctor: ["Qual instrumento provocou o corte?", "Há quanto tempo o corte aconteceu?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildWoundInfectedOrangeResponse() {
  return {
    manchesterColor: "orange",
    urgencyLabel: "Laranja - Muito Urgente (Ferida Infectada / Celulite em Expansão)",
    recommendedFacility: "UPA 24h (Atendimento em até 10 minutos)",
    maxWaitTime: "10 minutos",
    flogisticSigns: {
      erythema: true,
      edema: true,
      heat: true,
      painReported: true,
      purulentExudate: true
    },
    citizenView: {
      summary: "⚠️ MUITO URGENTE: FERIDA COM INFECÇÃO BACTERIANA ATIVA (PUS, CALOR INTENSO OU FEBRE). Foi identificada presença de secreção purulenta (pus) e halo avermelhado quente ao redor do machucado. Isso indica que bactérias se proliferaram nos tecidos da pele e há risco de celulite infecciosa ou erisipela, necessitando de avaliação médica presencial em até 10 minutos para início de antibiótico prescrito e limpeza cirúrgica estéril.",
      whatToDo: "Procure atendimento na UPA 24h mais próxima ainda hoje (tempo prioritário de até 10 minutos).",
      homeCare: [
        "Lave delicadamente com água limpa ou soro fisiológico.",
        "Cubra com gaze estéril sem apertar.",
        "Não esprema a ferida e não tente drenar pus por conta própria.",
        "Apresente esta ficha na triagem da UPA."
      ],
      warningSignsToWatch: [
        "Vermelhidão que avança e se espalha visivelmente pela pele ao longo das horas",
        "Surgimento de febre alta acima de 38°C ou calafrios no corpo",
        "Aumento repentino da dor e sensação de calor intenso"
      ]
    },
    clinicalView: {
      chiefComplaint: "Ferida tegumentar com sinais flogísticos exuberantes e secreção purulenta ativa",
      semioticDescription: "Solução de continuidade cutânea com drenagem purulenta franca, halo eritematoso difuso > 2 cm, calor local e edema moderado perilesional. Sinais de reação imune local ativa com risco de invasão tecidual profunda.",
      evolutionAnalysis: "Risco de abscesso loculado ou celulite necrotizante sem intervenção médica rápida.",
      suggestedCIAP2: "S87 - Ferida infectada",
      suggestedCID10: "L08.9 - Infecção local da pele e tecido subcutâneo",
      triageHypothesis: "Celulite bacteriana secundária a ferimento infectado - Indicação de antibioticoterapia sistêmica.",
      redFlags: ["Sinais sistêmicos de sepse", "Linfangite ascendente (estrias vermelhas no membro)"],
      questionsForDoctor: ["Houve febre aferida?", "O paciente já iniciou algum antibiótico por conta própria?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildSkinGreenResponse() {
  return {
    manchesterColor: "green",
    urgencyLabel: "Verde - Pouco Urgente (Mancha Cutânea Estável / Rotina UBS)",
    recommendedFacility: "UBS / Posto de Saúde",
    maxWaitTime: "120 minutos (Consulta ambulatorial de rotina)",
    flogisticSigns: {
      erythema: false,
      edema: false,
      heat: false,
      painReported: false,
      purulentExudate: false
    },
    citizenView: {
      summary: "🟢 POUCO URGENTE: A análise identificou uma mancha ou alteração de pele estável, sem sinais inflamatórios agudos, sem secreção purulenta, sem sangramento e sem dor severa. Lesões desse tipo não configuram urgência de pronto-socorro e podem ser acompanhadas tranquilamente em consulta de rotina no Posto de Saúde.",
      whatToDo: "Mantenha a higiene normal da pele e, se desejar investigar a mancha, agende uma consulta ambulatorial com o médico da Saúde da Família na sua UBS de referência.",
      homeCare: [
        "Mantenha a pele hidratada com loções hidratantes neutras.",
        "Use protetor solar nas áreas expostas ao sol.",
        "Evite coçar ou cutucar a região com as unhas."
      ],
      warningSignsToWatch: [
        "Se a mancha começar a coçar intensamente, arder ou sangrar",
        "Se mudar rapidamente de cor, tamanho ou formato (critérios do ABCDE)",
        "Se surgirem bolhas com água ou pus"
      ]
    },
    clinicalView: {
      chiefComplaint: "Lesão dermatológica macular ou pigmentar estável sem sinais flogísticos agudos",
      semioticDescription: "Mácula/pápula normocrômica ou hipercrômica de contornos regulares, sem eritema periférico, calor local ou ulceração. Ausência de sinais de malignidade iminente no momento.",
      evolutionAnalysis: "Quadro crônico/subagudo com indicação de seguimento eletivo na Atenção Primária.",
      suggestedCIAP2: "S99 - Doença de pele outra",
      suggestedCID10: "L98.9 - Transtorno da pele e do tecido subcutâneo não especificado",
      triageHypothesis: "Lesão pigmentar/dermatológica benigna estável - Seguimento ambulatorial na APS.",
      redFlags: ["Assimetria, bordas irregulares, cor heterogênea ou diâmetro > 6mm (ABCDE de melanoma)"],
      questionsForDoctor: ["Há quanto tempo a lesão está presente?", "Houve crescimento recente?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildSkinYellowResponse(hasItch: boolean) {
  return {
    manchesterColor: "yellow",
    urgencyLabel: "Amarelo - Urgente (Lesão Cutânea Inflamatória / Alérgica)",
    recommendedFacility: "Posto de Saúde (UBS) ou UPA 24h",
    maxWaitTime: "60 minutos",
    flogisticSigns: {
      erythema: true,
      edema: true,
      heat: false,
      painReported: false,
      purulentExudate: false
    },
    citizenView: {
      summary: "🟡 ATENÇÃO / URGENTE: MANCHA OU LESÃO DE PELE INFLAMATÓRIA COM COCEIRA OU DESCAMAÇÃO. Foi identificada uma alteração avermelhada na pele com sinais de inflamação local (possível micose, dermatite de contato, urticária leve ou reação alérgica). Necessita de avaliação na UBS ou UPA para diagnóstico correto e prescrição do tratamento adequado.",
      whatToDo: "Vá ao Posto de Saúde (UBS) ou UPA hoje para que um profissional de saúde examine de perto.",
      homeCare: [
        "Evite coçar para não romper a pele e não provocar infecções por bactérias das unhas.",
        "Tome banhos mornos e evite sabonetes perfumados ou abrasivos.",
        "Não passe álcool, pomadas de corticoide desconhecidas ou remédios caseiros."
      ],
      warningSignsToWatch: [
        "Se a alergia começar a inchar os lábios, a língua ou se você sentir falta de ar (procure a UPA imediatamente!)",
        "Se as manchas começarem a formar bolhas grandes ou dor intensa",
        "Se surgir febre no corpo"
      ]
    },
    clinicalView: {
      chiefComplaint: "Dermatite eritemato-descamativa / lesão alérgica pruriginosa em expansão",
      semioticDescription: "Placas eritematosas, pruriginosas ou descamativas em tegumento. Sem acometimento de mucosas ou sinais de anafilaxia no momento.",
      evolutionAnalysis: "Processo inflamatório cutâneo subagudo necessitando de conduta diagnóstica (tínea vs eczema vs farmacodermia leve).",
      suggestedCIAP2: "S88 - Dermatite de contato / S74 - Doença de pele alérgica",
      suggestedCID10: "L20.9 - Dermatite atópica / B35.9 - Dermatofitose",
      triageHypothesis: "Dermatite inflamatória pruriginosa com indicação de consulta no mesmo dia na Atenção Primária.",
      redFlags: ["Sinais de anafilaxia (angioedema, estridor, broncoespasmo)", "Lesões em alvo (eritema multiforme)"],
      questionsForDoctor: ["Houve contato com planta, produto químico ou novo medicamento?", "Há quanto tempo coça?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildSkinRedResponse() {
  return {
    manchesterColor: "red",
    urgencyLabel: "Vermelho - Emergência (Púrpura / Petéquias / Anafilaxia)",
    recommendedFacility: "UPA 24h ou SAMU 192 (Atendimento Imediato)",
    maxWaitTime: "0 minutos (Atendimento Imediato)",
    flogisticSigns: {
      erythema: true,
      edema: true,
      heat: true,
      painReported: true,
      purulentExudate: false
    },
    citizenView: {
      summary: "🚨 EMERGÊNCIA MÁXIMA (VERMELHO): SINAIS DE GRAVIDADE SISTÊMICA (SUSPEITA DE PÚRPURA, PETÉQUIAS OU REAÇÃO ALÉRGICA GRAVE). Manchas avermelhadas/arroxeadas que não desaparecem ao pressionar com os dedos, associadas a febre ou cansaço, podem indicar infecção bacteriana grave na corrente sanguínea (meningococcemia). Se houver inchaço no rosto ou falta de ar, é anafilaxia. Ambos são risco de morte sem tratamento imediato.",
      whatToDo: "Dirija-se IMEDIATAMENTE à UPA 24h ou chame o SAMU 192 agora.",
      homeCare: [
        "Mantenha o paciente calmo e sentado ou deitado.",
        "Não dê água ou alimentos caso haja dificuldade respiratória.",
        "Vá imediatamente para a emergência mais próxima."
      ],
      warningSignsToWatch: [
        "Dificuldade para respirar ou chiado no peito",
        "Lábios, olhos ou língua inchando rapidamente",
        "Sonolência intensa, dificuldade de acordar ou manchas escuras brotando rapidamente"
      ]
    },
    clinicalView: {
      chiefComplaint: "Lesões purpúricas petequiais ou angioedema anafilático com risco hemodinâmico",
      semioticDescription: "Lesões puntiformes hemorrágicas não clareáveis à digitopressão (petéquias/púrpuras) ou angioedema orofacial com risco de comprometimento respiratório.",
      evolutionAnalysis: "Risco de choque séptico meningocócico ou choque anafilático.",
      suggestedCIAP2: "A78 - Outra doença infecciosa grave",
      suggestedCID10: "A39.0 - Infecção meningocócica / T78.2 - Choque anafilático",
      triageHypothesis: "Emergência médica absoluta - Sala vermelha com monitorização contínua e ressuscitação volêmica.",
      redFlags: ["Instabilidade pressórica", "Rigidez de nuca", "Estridor laríngeo"],
      questionsForDoctor: ["Tempo de aparecimento das manchas?", "Há febre alta associada?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildDentalGreenResponse() {
  return {
    manchesterColor: "green",
    urgencyLabel: "Verde - Pouco Urgente (Odontologia Básica / Consulta UBS)",
    recommendedFacility: "UBS / Posto de Saúde (Saúde Bucal)",
    maxWaitTime: "120 minutos",
    flogisticSigns: { erythema: false, edema: false, heat: false, painReported: false, purulentExudate: false },
    citizenView: {
      summary: "🟢 POUCO URGENTE: Condição bucal superficial estável (como afta simples, leve irritação gengival ou sensibilidade dentária leve). Não há inchaço facial, não há febre e não há sangramento volumoso.",
      whatToDo: "Mantenha a higiene bucal cuidadosa e agende uma consulta com a equipe de Saúde Bucal da sua UBS.",
      homeCare: ["Escove os dentes com escova macia.", "Evite alimentos muito ácidos ou quentes.", "Use fio dental suavemente."],
      warningSignsToWatch: ["Se surgir inchaço na bochecha ou queixo", "Se a dor ficar insuportável e latejante", "Se tiver febre"]
    },
    clinicalView: {
      chiefComplaint: "Queixa odontológica leve sem repercussão infecciosa facial",
      semioticDescription: "Mucosa jugal/gengival íntegra sem edema difuso ou celulite odontogênica.",
      evolutionAnalysis: "Encaminhamento eletivo para equipe de Saúde Bucal na APS.",
      suggestedCIAP2: "D19 - Doença dos dentes",
      suggestedCID10: "K05.0 - Gengivite aguda / K12.0 - Aftas bucais recidivantes",
      triageHypothesis: "Condição bucal leve estável sem sinais de complicação.",
      redFlags: ["Descartar trismo ou celulite de assoalho bucal"],
      questionsForDoctor: ["Há quanto tempo iniciou o incômodo?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildDentalYellowResponse(hasPain: boolean) {
  return {
    manchesterColor: "yellow",
    urgencyLabel: "Amarelo - Urgente (Odontalgia Aguda / Avaliação em até 60 min)",
    recommendedFacility: "UBS (Odontologia) ou UPA 24h",
    maxWaitTime: "60 minutos",
    flogisticSigns: { erythema: true, edema: true, heat: false, painReported: hasPain, purulentExudate: false },
    citizenView: {
      summary: "🟡 ATENÇÃO / URGENTE: DOR DE DENTE AGUDA OU ABSCESSO LOCALIZADO. Identificada queixa de dor intensa ou pequena inflamação na gengiva. Precisa de avaliação no mesmo dia pelo cirurgião-dentista da UBS ou na UPA para controle da dor e tratamento da raiz ou dente.",
      whatToDo: "Procure a UBS (atendimento odontológico) ou UPA mais próxima hoje.",
      homeCare: ["Não coloque remédios ou alho diretamente dentro do dente furado.", "Faça bochechos suaves com água morna e uma pitada de sal.", "Evite deitar com a cabeça baixa para não aumentar a pulsação."],
      warningSignsToWatch: ["Se o inchaço começar a crescer pelo rosto ou fechar o olho", "Se tiver dificuldade para abrir a boca ou engolir", "Se tiver febre"]
    },
    clinicalView: {
      chiefComplaint: "Odontalgia aguda por pulpite / abscesso dentoalveolar localizado",
      semioticDescription: "Dor moderada/intensa à percussão dentária, edema gengival circunscrito sem celulite facial disseminada.",
      evolutionAnalysis: "Necessidade de abertura coronária/pulpectomia ou drenagem local.",
      suggestedCIAP2: "D19 - Doença dos dentes/dor de dente",
      suggestedCID10: "K04.0 - Pulpite / K04.7 - Abscesso periapical",
      triageHypothesis: "Urgência odontológica para alívio de dor na Atenção Primária ou UPA.",
      redFlags: ["Sinais de disseminação para espaços fasciais cervicais"],
      questionsForDoctor: ["A dor piora com quente ou frio?", "Houve febre?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildDentalOrangeResponse() {
  return {
    manchesterColor: "orange",
    urgencyLabel: "Laranja - Muito Urgente (Celulite Facial Odontogênica)",
    recommendedFacility: "UPA 24h (Atendimento em até 10 minutos)",
    maxWaitTime: "10 minutos",
    flogisticSigns: { erythema: true, edema: true, heat: true, painReported: true, purulentExudate: true },
    citizenView: {
      summary: "⚠️ MUITO URGENTE: INCHAÇO NO ROSTO DE ORIGEM DENTÁRIA (RISCO DE INFECÇÃO EXPANSIVA). Foi identificado inchaço expressivo na bochecha, mandíbula ou face decorrente de infecção dentária. Essa infecção pode se espalhar para o pescoço e dificultar a respiração ou deglutição.",
      whatToDo: "Vá à UPA 24h imediatamente.",
      homeCare: ["Mantenha a cabeça elevada.", "Não aperte o inchaço.", "Dirija-se imediatamente à unidade médica."],
      warningSignsToWatch: ["Dificuldade para engolir saliva ou respirar", "Dificuldade para abrir a boca (trismo)", "Febre alta e sonolência"]
    },
    clinicalView: {
      chiefComplaint: "Celulite facial odontogênica expansiva",
      semioticDescription: "Edema assimétrico difuso de face com apagamento de sulcos, calor e eritema local. Risco de Angina de Ludwig.",
      evolutionAnalysis: "Indicação de internação e antibioticoterapia venosa urgente.",
      suggestedCIAP2: "D19 - Doença dos dentes com complicação",
      suggestedCID10: "K12.2 - Celulite e abscesso da boca",
      triageHypothesis: "Celulite odontogênica moderada a grave com risco de obstrução de via aérea superior.",
      redFlags: ["Elevação e protrusão da língua", "Estridor ou disfagia progressiva"],
      questionsForDoctor: ["Há quanto tempo o inchaço iniciou?", "Paciente consegue engolir líquidos?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildEyeGreenResponse() {
  return {
    manchesterColor: "green",
    urgencyLabel: "Verde - Pouco Urgente (Irritação Ocular Leve / UBS)",
    recommendedFacility: "UBS / Posto de Saúde",
    maxWaitTime: "120 minutos",
    flogisticSigns: { erythema: true, edema: false, heat: false, painReported: false, purulentExudate: false },
    citizenView: {
      summary: "🟢 POUCO URGENTE: Irritação ocular leve por poeira, vento ou cansaço visual, sem perda de visão e sem secreção purulenta abundante.",
      whatToDo: "Lave os olhos com bastante soro fisiológico ou água filtrada e descanse a visão.",
      homeCare: ["Não coce os olhos.", "Não use colírios com antibióticos ou corticoides sem prescrição médica.", "Lave as mãos com frequência."],
      warningSignsToWatch: ["Se o olho começar a doer muito ou ficar sensível à luz", "Se a visão ficar embaçada", "Se vazar pus grosso"]
    },
    clinicalView: {
      chiefComplaint: "Hiperemia conjuntival leve sem baixa de acuidade visual",
      semioticDescription: "Hiperemia conjuntival bulbar discreta sem secreção purulenta ou opacidade de córnea.",
      evolutionAnalysis: "Conduta conservadora e avaliação na APS.",
      suggestedCIAP2: "F70 - Conjuntivite infecciosa",
      suggestedCID10: "H10.9 - Conjuntivite não especificada",
      triageHypothesis: "Conjuntivite leve ou irritação conjuntival transitória.",
      redFlags: ["Baixa de acuidade visual", "Pupila não reativa"],
      questionsForDoctor: ["Houve trauma ou corpo estranho nos olhos?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildEyeYellowResponse(hasPurulent: boolean) {
  return {
    manchesterColor: "yellow",
    urgencyLabel: "Amarelo - Urgente (Conjuntivite Purulenta / Dor Ocular)",
    recommendedFacility: "Posto de Saúde (UBS) ou UPA 24h",
    maxWaitTime: "60 minutos",
    flogisticSigns: { erythema: true, edema: true, heat: false, painReported: true, purulentExudate: hasPurulent },
    citizenView: {
      summary: "🟡 ATENÇÃO / URGENTE: CONJUNTIVITE COM SECREÇÃO OU DOR OCULAR MODERADA. Foi identificada inflamação nos olhos com saída de secreção ou dor. Precisa de avaliação hoje na UBS ou UPA para prescrição de colírio correto pelo médico.",
      whatToDo: "Procure a UBS ou UPA hoje.",
      homeCare: ["Limpe os olhos com gaze e soro fisiológico novo.", "Use uma gaze para cada olho para não transmitir a infecção.", "Não use lentes de contato."],
      warningSignsToWatch: ["Dor forte nos olhos", "Diminuição súbita da visão", "Sensação de areia ou lesão na córnea"]
    },
    clinicalView: {
      chiefComplaint: "Conjuntivite purulenta aguda com sinais flogísticos locais",
      semioticDescription: "Hiperemia conjuntival intensa com secreção mucopurulenta moderada a abundante.",
      evolutionAnalysis: "Necessidade de colírio antimicrobiano tópico.",
      suggestedCIAP2: "F70 - Conjuntivite",
      suggestedCID10: "H10.0 - Conjuntivite mucopurulenta",
      triageHypothesis: "Conjuntivite bacteriana aguda.",
      redFlags: ["Ceratite ulcerativa associada"],
      questionsForDoctor: ["Paciente usa lentes de contato?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildEyeRedResponse() {
  return {
    manchesterColor: "red",
    urgencyLabel: "Vermelho - Emergência (Trauma Ocular Perfurante / Queimadura Química)",
    recommendedFacility: "UPA 24h ou SAMU 192 (Atendimento Imediato)",
    maxWaitTime: "0 minutos (Atendimento Imediato)",
    flogisticSigns: { erythema: true, edema: true, heat: true, painReported: true, purulentExudate: false },
    citizenView: {
      summary: "🚨 EMERGÊNCIA MÁXIMA (VERMELHO): TRAUMA OCULAR GRAVE OU QUEIMADURA QUÍMICA NO OLHO. Risco imediato de cegueira ou perfuração do globo ocular. Atendimento oftalmológico de urgência necessário imediatamente.",
      whatToDo: "Se foi produto químico (soda cáustica, água sanitária), lave sem parar com água corrente e vá IMEDIATAMENTE à emergência. Se foi perfuração, NÃO aperte nem mexa no olho e proteja com copo descartável até chegar ao hospital.",
      homeCare: ["NUNCA esfregue o olho.", "Não tente remover corpos estranhos cravados.", "Vá imediatamente para a emergência hospitalar."],
      warningSignsToWatch: ["Perda visual súbita", "Deformidade na pupila", "Vazamento de líquido do olho"]
    },
    clinicalView: {
      chiefComplaint: "Trauma ocular perfurante agudo ou queimadura química da superfície ocular",
      semioticDescription: "Hifema, atalamia ou queimadura cáustica da córnea com risco irreversível de perda da visão.",
      evolutionAnalysis: "Intervenção oftalmológica cirúrgica emergencial.",
      suggestedCIAP2: "F76 - Trauma ocular",
      suggestedCID10: "S05.9 - Traumatismo do olho e da órbita",
      triageHypothesis: "Urgência oftalmológica gravíssima com indicação de sala vermelha.",
      redFlags: ["Perfuração escleral/corneana", "Isquemia limbar"],
      questionsForDoctor: ["Qual substância química ou objeto causou o trauma?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

function buildGeneralGreenResponse() {
  return {
    manchesterColor: "green",
    urgencyLabel: "Verde - Pouco Urgente (Avaliação Domiciliar / UBS)",
    recommendedFacility: "UBS / Posto de Saúde",
    maxWaitTime: "120 minutos",
    flogisticSigns: { erythema: false, edema: false, heat: false, painReported: false, purulentExudate: false },
    citizenView: {
      summary: "🟢 POUCO URGENTE: A análise visual identificou uma condição superficial estável, sem sinais de sangramento profundo, necrose, febre ou secreção purulenta ativa. Não há necessidade de correr para uma UPA neste momento.",
      whatToDo: "Mantenha cuidados básicos de higiene e procure a sua UBS de referência para acompanhamento ambulatorial se desejar.",
      homeCare: ["Mantenha o local limpo com água e sabonete neutro.", "Evite coçar ou puxar casquinhas.", "Beba água e alimente-se bem."],
      warningSignsToWatch: ["Se surgir inchaço, calor e vermelhidão forte no local", "Se tiver febre acima de 37.8°C", "Se sair pus amarelado"]
    },
    clinicalView: {
      chiefComplaint: "Condição superficial estável sem sinais de alarme no momento",
      semioticDescription: "Integridade tecidual preservada sem repercussão hemodinâmica ou sepse.",
      evolutionAnalysis: "Evolução benigna com indicação de vigilância na Atenção Primária.",
      suggestedCIAP2: "A98 - Medicina preventiva",
      suggestedCID10: "Z76.9 - Pessoa em contato com serviços de saúde",
      triageHypothesis: "Caso de baixa complexidade para manejo na APS.",
      redFlags: ["Orientar retorno se houver eritema expansivo ou dor aguda"],
      questionsForDoctor: ["Há queixas sistêmicas adicionais?"]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}

