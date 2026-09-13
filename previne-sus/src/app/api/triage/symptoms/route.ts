import { NextRequest, NextResponse } from 'next/server';
import { callGeminiVision } from '@/lib/gemini';
import { SYMPTOM_TRIAGE_SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symptoms, notes, apiKey } = body;

    const promptDetails = `
Avaliação Sintomática Pré-UPA:
- Dias de febre: ${symptoms.feverDays || '0'} dias (temperatura máx relatada: ${symptoms.feverTemp || 'Não medida'})
- Dor atrás dos olhos / dor de cabeça: ${symptoms.retroOrbitalPain ? 'SIM' : 'NÃO'}
- Dores no corpo e articulações: ${symptoms.bodyAches ? 'SIM' : 'NÃO'}
- Manchas vermelhas na pele (petéquias): ${symptoms.redSpots ? 'SIM' : 'NÃO'}
- Dor abdominal contínua e forte: ${symptoms.severeAbdominalPain ? 'SIM - ALARME!' : 'NÃO'}
- Vômitos frequentes / incoercíveis: ${symptoms.persistentVomiting ? 'SIM - ALARME!' : 'NÃO'}
- Tontura ao ficar de pé / fraqueza extrema: ${symptoms.dizzinessPostural ? 'SIM - ALARME!' : 'NÃO'}
- Sangramento espontâneo (gengiva, nariz): ${symptoms.bleeding ? 'SIM - ALARME!' : 'NÃO'}
- Falta de ar / dificuldade de respirar: ${symptoms.dyspnea ? 'SIM - ALARME!' : 'NÃO'}
- Tosse persistente com secreção: ${symptoms.cough ? 'SIM' : 'NÃO'}
- Relato livre do paciente: "${notes || 'Nenhum'}"
`;

    const result = await callGeminiVision(
      SYMPTOM_TRIAGE_SYSTEM_PROMPT,
      promptDetails,
      [],
      apiKey
    );

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in symptoms route:', error);
    return NextResponse.json(
      { error: 'Falha ao processar o questionário de sintomas.' },
      { status: 500 }
    );
  }
}
