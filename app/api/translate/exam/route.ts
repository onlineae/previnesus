import { NextRequest, NextResponse } from 'next/server';
import { callGeminiVision } from '@/lib/gemini';
import { EXAM_SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, userNotes, examText, apiKey } = body;

    const promptDetails = `
Solicitação: Traduzir exame laboratorial do SUS (Hemograma, Bioquímica, Glicemia, Urina, etc.).
Texto digitado pelo paciente: "${examText || ''}"
Anotações adicionais: "${userNotes || ''}"
Lembre-se: Explicar os parâmetros em português simples, apontar status (normal/alterado/crítico) e orientar o momento adequado de retorno ao médico do posto.
`;

    const imagesToAnalyze = imageBase64 ? [imageBase64] : [];

    const result = await callGeminiVision(
      EXAM_SYSTEM_PROMPT,
      promptDetails,
      imagesToAnalyze,
      apiKey
    );

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in exam route:', error);
    return NextResponse.json(
      { error: 'Falha ao traduzir o laudo de exames.' },
      { status: 500 }
    );
  }
}
