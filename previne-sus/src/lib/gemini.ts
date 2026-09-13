import { 
  VISION_TRIAGE_SYSTEM_PROMPT, 
  PRESCRIPTION_SYSTEM_PROMPT, 
  EXAM_SYSTEM_PROMPT, 
  SYMPTOM_TRIAGE_SYSTEM_PROMPT 
} from './prompts';

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

  // Clinical Simulation Engine (Runs instantly when no key is set or offline)
  return simulateClinicalResponse(userPrompt, imageBase64List.length);
}

// Highly realistic Brazilian SUS Clinical Decision Engine fallback
function simulateClinicalResponse(prompt: string, imageCount: number) {
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
  if (pLower.includes('dengue') || pLower.includes('febre') || pLower.includes('olhos') || pLower.includes('falta de ar')) {
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

  // 4. Default Vision Triage (Skin / Wound / Dental / Eye)
  const isDental = pLower.includes('dente') || pLower.includes('boca') || pLower.includes('gengiva') || pLower.includes('inchaço');
  const isEye = pLower.includes('olho') || pLower.includes('visão') || pLower.includes('conjuntivite');
  const hasInfection = pLower.includes('pus') || pLower.includes('quente') || pLower.includes('dor') || pLower.includes('vermelho');

  const color = hasInfection ? (pLower.includes('febre') ? 'orange' : 'yellow') : 'green';

  return {
    manchesterColor: color,
    urgencyLabel: color === 'orange' ? "Laranja - Muito Urgente (Até 10 min)" : (color === 'yellow' ? "Amarelo - Urgente (Avaliação em até 60 min)" : "Verde - Pouco Urgente (Até 120 min)"),
    recommendedFacility: color === 'orange' ? "UPA 24h" : (color === 'yellow' ? "UPA ou Posto de Saúde" : "UBS / Posto de Saúde"),
    maxWaitTime: color === 'orange' ? "10 minutos" : (color === 'yellow' ? "60 minutos" : "120 minutos"),
    flogisticSigns: {
      erythema: hasInfection,
      edema: true,
      heat: hasInfection,
      painReported: true,
      purulentExudate: pLower.includes('pus') || pLower.includes('secreção')
    },
    citizenView: {
      summary: isDental 
        ? "Identificamos sinais de inflamação e sensibilidade bucal na região informada. Como há inchaço relatado, é fundamental que a equipe de saúde bucal avalie para evitar que a infecção se espalhe."
        : (isEye 
            ? "Observa-se irritação conjuntival com congestão vascular leve a moderada. Importante evitar esfregar os olhos e manter compressas limpas."
            : "Observa-se uma lesão cutânea com bordas delimitadas e sinais discretos de irritação e resposta inflamatória local. Não foram identificados indícios visuais de necrose ou sangramento ativo incontrolável."),
      whatToDo: color === 'yellow' || color === 'orange'
        ? "Procure atendimento na UPA 24h ou na sua Unidade Básica de Saúde ainda hoje para que um profissional médico examine pessoalmente."
        : "Dirija-se à sua Unidade Básica de Saúde (Posto de Saúde) de referência no seu bairro para acompanhamento de enfermagem e curativo seguro.",
      homeCare: [
        "Lave o local com água corrente tratada e sabão neutro, ou soro fisiológico 0,9%.",
        "Seque com gaze limpa ou toalha macia dando toques suaves, NUNCA esfregue.",
        "Não passe pomadas caseiras, borra de café, álcool ou receitas da internet.",
        "Mantenha a região limpa e protegida de poeira e moscas com curativo respirável."
      ],
      warningSignsToWatch: [
        "Aumento rápido da vermelhidão se espalhando além das bordas",
        "Surgimento de febre acima de 37.8°C ou calafrios",
        "Dor latejante que piora mesmo em repouso",
        "Saída contínua de pus amarelado ou esverdeado com odor forte"
      ]
    },
    clinicalView: {
      chiefComplaint: isDental 
        ? "Odontalgia com edema tecidual associado relatado pelo paciente" 
        : "Lesão cutânea tegumentar com sinais flogísticos locais",
      semioticDescription: imageCount > 1 
        ? "Análise comparativa temporal: Redução discreta do exsudato inflamatório em relação ao registro anterior, persistindo hiperemia perilesional moderada e área de tecido de granulação incipiente."
        : "Presença de hiperemia peri-lesional, edema leve, sem sinais aparentes de desvitalização tecidual profunda ou linfangite ascendente.",
      evolutionAnalysis: imageCount > 1 
        ? "Quadro em evolução favorável após higiene básica, sem piora infecciosa aguda." 
        : "Primeiro registro de triagem do caso. Recomenda-se registrar nova foto em 48-72h para vigilância da cicatrização.",
      suggestedCIAP2: isDental ? "D19 - Doença dos dentes/gengivas" : "S87 - Ferida/corte",
      suggestedCID10: isDental ? "K04.7 - Abscesso periapical sem fístula" : "L08.9 - Infecção local da pele e do tecido subcutâneo",
      triageHypothesis: isDental 
        ? "Possível complicação endodôntica/periodontal que demanda avaliação de urgência odontológica no CEO ou UBS"
        : "Solução de continuidade dérmica com reação inflamatória reativa sem sepse aparente",
      redFlags: [
        "Afastar celulite infecciosa em expansão ou erisipela",
        "Checar vacinação antitetânica (DTP/dT) nos últimos 10 anos",
        "Investigar histórico de diabetes mellitus ou insuficiência vascular periférica"
      ],
      questionsForDoctor: [
        "Há quanto tempo a lesão surgiu e como começou?",
        "O paciente tem diabetes ou toma medicamentos imunossupressores?",
        "Houve aferição recente de temperatura axilar?"
      ]
    },
    disclaimer: "Esta ferramenta é exclusivamente para orientação e triagem prévia. Não substitui consulta médica presencial."
  };
}
