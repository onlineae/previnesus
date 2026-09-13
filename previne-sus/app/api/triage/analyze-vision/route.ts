import { NextRequest, NextResponse } from 'next/server';
import { callGeminiVision } from '@/lib/gemini';
import { VISION_TRIAGE_SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      imageBase64, 
      userNotes, 
      category = 'pele', 
      symptoms = {}, 
      previousImageBase64,
      previousNotes,
      apiKey 
    } = body;

    if (!imageBase64 && !userNotes) {
      return NextResponse.json(
        { error: 'Envie ao menos uma imagem ou descrição detalhada dos sintomas.' },
        { status: 400 }
      );
    }

    const imagesToAnalyze: string[] = [];
    if (imageBase64) imagesToAnalyze.push(imageBase64);
    if (previousImageBase64) imagesToAnalyze.push(previousImageBase64);

    const promptDetails = `
Categoria da Queixa: ${category}
Descrição do Cidadão: "${userNotes || 'Nenhuma anotação adicional informada.'}"
Sintomas Declarados:
- Dor local relatada: ${symptoms.hasPain ? 'SIM' : 'NÃO'}
- Sensação de calor/febre: ${symptoms.hasHeatOrFever ? 'SIM' : 'NÃO'}
- Presença de pus ou secreção: ${symptoms.hasPurulent ? 'SIM' : 'NÃO'}
- Tempo aproximado de surgimento: ${symptoms.duration || 'Não especificado'}
${previousImageBase64 ? `NOTA: A segunda imagem anexada é do histórico anterior (${previousNotes || 'Dia anterior'}) para análise comparativa de evolução e cicatrização.` : ''}
`;

    const triageResult = await callGeminiVision(
      VISION_TRIAGE_SYSTEM_PROMPT,
      promptDetails,
      imagesToAnalyze,
      apiKey
    );

    return NextResponse.json({
      success: true,
      data: triageResult
    });
  } catch (error: any) {
    console.error('Error in analyze-vision route:', error);
    return NextResponse.json(
      { error: 'Falha ao processar a triagem visual. Tente novamente.' },
      { status: 500 }
    );
  }
}
