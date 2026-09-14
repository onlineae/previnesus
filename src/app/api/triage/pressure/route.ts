import { NextRequest, NextResponse } from 'next/server';
import { callGeminiVision } from '@/lib/gemini';
import { BLOOD_PRESSURE_TRIAGE_SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      systolic, 
      diastolic, 
      pulse, 
      symptoms = {}, 
      notes, 
      apiKey 
    } = body;

    const sysNum = parseInt(systolic, 10) || 120;
    const diaNum = parseInt(diastolic, 10) || 80;
    const pulseNum = pulse ? parseInt(pulse, 10) : undefined;

    const promptDetails = `
AVALIAÇÃO DE PRESSÃO ARTERIAL (DIRETRIZES SBC / MINISTÉRIO DA SAÚDE / AHA):
- Pressão Sistólica (Máxima): ${sysNum} mmHg
- Pressão Diastólica (Mínima): ${diaNum} mmHg
- Frequência Cardíaca (Pulso): ${pulseNum ? `${pulseNum} bpm` : 'Não informado'}
- Sintomas de Alarme Declarados:
  * Dor ou aperto no peito: ${symptoms.hasChestPain ? 'SIM - ALERTA CRÍTICO' : 'NÃO'}
  * Falta de ar / dificuldade de respirar: ${symptoms.hasShortnessOfBreath ? 'SIM - ALERTA CRÍTICO' : 'NÃO'}
  * Dor de cabeça súbita de forte intensidade: ${symptoms.hasSevereHeadache ? 'SIM - ALERTA' : 'NÃO'}
  * Tontura forte, vista escura ou desmaio: ${symptoms.hasDizzinessOrFaint ? 'SIM - ALERTA' : 'NÃO'}
- Observações do Cidadão: "${notes || 'Nenhuma observação informada.'}"

Classifique rigorosamente com base nas Diretrizes Brasileiras de Hipertensão Arterial (SBC/MS) e AHA. Indique claramente se a pressão está baixa, ótima, normal, pré-hipertensa ou em crise/estágio 1, 2 ou 3, e forneça a conduta do SUS (UPA vs UBS vs Cuidados em Casa).
`;

    const result = await callGeminiVision(
      BLOOD_PRESSURE_TRIAGE_SYSTEM_PROMPT,
      promptDetails,
      [],
      apiKey
    );

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in pressure route:', error);
    return NextResponse.json(
      { error: 'Falha ao processar a análise de pressão arterial.' },
      { status: 500 }
    );
  }
}
