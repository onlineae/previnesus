'use client';

import React, { useState } from 'react';
import { EvolutionPhoto } from '@/lib/storage';
import { ArrowRight, Calendar, AlertCircle, TrendingUp, CheckCircle, ZoomIn } from 'lucide-react';
import ManchesterBadge from './ManchesterBadge';

interface Props {
  photos: EvolutionPhoto[];
  caseTitle: string;
}

export default function TimelineComparison({ photos, caseTitle }: Props) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(Math.max(0, photos.length - 1));
  const [comparisonMode, setComparisonMode] = useState<'sideBySide' | 'single'>('sideBySide');

  if (!photos || photos.length === 0) {
    return (
      <div className="p-6 text-center text-neutral-500 bg-neutral-50 rounded-2xl border border-neutral-200">
        Nenhum registro fotográfico salvo neste caso ainda.
      </div>
    );
  }

  const firstPhoto = photos[0];
  const currentPhoto = photos[selectedPhotoIndex];

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h4 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-sus-blue" />
            Evolução e Cicatrização no Tempo
          </h4>
          <p className="text-xs text-neutral-500">
            {photos.length} registro(s) arquivado(s) para este caso
          </p>
        </div>

        {photos.length > 1 && (
          <div className="flex items-center gap-1 bg-neutral-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setComparisonMode('sideBySide')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                comparisonMode === 'sideBySide' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              }`}
            >
              Comparar (Antes / Agora)
            </button>
            <button
              type="button"
              onClick={() => setComparisonMode('single')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                comparisonMode === 'single' ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500'
              }`}
            >
              Ver Detalhes
            </button>
          </div>
        )}
      </div>

      {/* Side by Side Mode (First vs Latest) */}
      {comparisonMode === 'sideBySide' && photos.length > 1 ? (
        <div className="grid grid-cols-2 gap-3">
          {/* First Photo */}
          <div className="bg-neutral-50 rounded-2xl p-3 border border-neutral-200 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-neutral-700 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-neutral-400" />
                {firstPhoto.dayLabel || 'Início'}
              </span>
              <span className="text-[10px] text-neutral-500">{firstPhoto.date}</span>
            </div>
            <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-200 border border-neutral-300">
              <img
                src={firstPhoto.imageData}
                alt="Registro inicial"
                className="w-full h-full object-cover"
              />
            </div>
            {firstPhoto.triageResult?.manchesterColor && (
              <div className="mt-2">
                <ManchesterBadge color={firstPhoto.triageResult.manchesterColor} size="sm" showWaitTime={false} />
              </div>
            )}
            <p className="mt-2 text-[11px] text-neutral-600 line-clamp-3 leading-snug">
              {firstPhoto.notes || 'Sem anotações no primeiro registro.'}
            </p>
          </div>

          {/* Current / Latest Photo */}
          <div className="bg-sus-green-light/40 rounded-2xl p-3 border border-sus-green/30 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sus-green-dark flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-sus-green" />
                {currentPhoto.dayLabel || 'Mais Recente'}
              </span>
              <span className="text-[10px] text-neutral-500">{currentPhoto.date}</span>
            </div>
            <div className="relative aspect-square rounded-xl overflow-hidden bg-neutral-200 border border-sus-green/40">
              <img
                src={currentPhoto.imageData}
                alt="Registro mais recente"
                className="w-full h-full object-cover"
              />
            </div>
            {currentPhoto.triageResult?.manchesterColor && (
              <div className="mt-2">
                <ManchesterBadge color={currentPhoto.triageResult.manchesterColor} size="sm" showWaitTime={false} />
              </div>
            )}
            <p className="mt-2 text-[11px] text-neutral-700 font-medium line-clamp-3 leading-snug">
              {currentPhoto.notes || 'Registro mais recente.'}
            </p>
          </div>
        </div>
      ) : (
        /* Single View with timeline selector */
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-200 aspect-video max-h-64 flex items-center justify-center">
            <img
              src={currentPhoto.imageData}
              alt="Foto selecionada"
              className="w-full h-full object-contain"
            />
            <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5">
              <Calendar className="w-3 h-3" />
              {currentPhoto.dayLabel} • {currentPhoto.date}
            </div>
          </div>

          {currentPhoto.triageResult?.manchesterColor && (
            <div className="flex items-center justify-between bg-neutral-50 p-2.5 rounded-xl border border-neutral-200">
              <span className="text-xs text-neutral-600 font-medium">Classificação na data:</span>
              <ManchesterBadge color={currentPhoto.triageResult.manchesterColor} size="sm" />
            </div>
          )}

          {currentPhoto.notes && (
            <p className="text-xs text-neutral-700 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
              <strong className="text-neutral-900 font-semibold block mb-0.5">Anotações do paciente:</strong>
              {currentPhoto.notes}
            </p>
          )}

          {/* Timeline Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {photos.map((p, idx) => (
              <button
                key={p.id || idx}
                onClick={() => setSelectedPhotoIndex(idx)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedPhotoIndex === idx
                    ? 'bg-sus-blue text-white shadow-sm'
                    : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700'
                }`}
              >
                {p.dayLabel || `Foto ${idx + 1}`} ({p.date})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
