'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, CheckCircle2 } from 'lucide-react';

interface Props {
  onTranscription: (text: string) => void;
  placeholder?: string;
}

export default function AudioRecorder({ onTranscription, placeholder = "Fale seus sintomas com calma..." }: Props) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'pt-BR';

        recognition.onresult = (event: any) => {
          let current = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            current += event.results[i][0].transcript;
          }
          setTranscript(current);
          onTranscription(current);
        };

        recognition.onerror = (event: any) => {
          console.warn('Speech recognition error', event);
          setIsRecording(false);
        };

        recognition.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = recognition;
      } else {
        setSupported(false);
      }
    }
  }, [onTranscription]);

  const toggleRecording = () => {
    if (!supported) {
      alert('Seu navegador não suporta reconhecimento de voz direto. Você pode digitar normalmente.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setTranscript('');
      try {
        recognitionRef.current?.start();
        setIsRecording(true);
      } catch (e) {
        console.error(e);
      }
    }
  };

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-3 rounded-full flex items-center justify-center transition-all ${
              isRecording
                ? 'bg-red-600 text-white animate-pulse shadow-lg shadow-red-600/30 ring-4 ring-red-200'
                : 'bg-sus-blue text-white hover:bg-sus-blue-dark active:scale-95 shadow-md shadow-sus-blue/20'
            }`}
            title={isRecording ? 'Parar gravação' : 'Gravar por voz'}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <div>
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-sus-blue" />
              {isRecording ? 'Ouvindo seus sintomas...' : 'Ditar por Voz'}
            </span>
            <p className="text-[11px] text-neutral-500">
              {isRecording ? 'Fale perto do microfone' : 'Ideal para quem prefere falar em vez de digitar'}
            </p>
          </div>
        </div>

        {isRecording && (
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600"></span>
          </span>
        )}
      </div>

      {transcript && (
        <div className="mt-2.5 p-2 rounded-xl bg-white border border-neutral-200 text-xs text-neutral-700 font-medium">
          <div className="flex items-center gap-1 text-[10px] text-sus-green font-bold uppercase mb-1">
            <CheckCircle2 className="w-3 h-3" /> Transcrito da sua voz:
          </div>
          <p className="italic">"{transcript}"</p>
        </div>
      )}
    </div>
  );
}
