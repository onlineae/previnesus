import { NextRequest, NextResponse } from 'next/server';
import { callGeminiVision } from '@/lib/gemini';
import { PRESCRIPTION_SYSTEM_PROMPT } from '@/lib/prompts';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, userNotes, apiKey } = body;

    const promptDetails = `
Solicitação: Decifrar a receita médica anexada.
Anotação complementar do paciente: "${userNotes || ''}"
Lembre-se: NÃO alterar dosagens, NÃO prescrever medicamentos novos. Criar grade de horários prática e acessível.
`;

    const imagesToAnalyze = imageBase64 ? [imageBase64] : [];

    const result = await callGeminiVision(
      PRESCRIPTION_SYSTEM_PROMPT,
      promptDetails,
      imagesToAnalyze,
      apiKey
    );

    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error in prescription route:', error);
    return NextResponse.json(
      { error: 'Falha ao decifrar a receita. Tente novamente com outra foto mais nítida.' },
      { status: 500 }
    );
  }
}
