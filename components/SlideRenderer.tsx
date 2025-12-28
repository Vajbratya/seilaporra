import React from 'react';
import { GeneratedSlide } from '../types';
import { SparklesIcon } from './Icons';

interface SlideRendererProps {
  slide: GeneratedSlide;
  index: number;
  total: number;
}

export const SlideRenderer: React.FC<SlideRendererProps> = ({ slide, index, total }) => {
  return (
    <div className="relative w-full aspect-video bg-white overflow-hidden shadow-2xl rounded-xl print:shadow-none print:rounded-none page-break">
      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0 bg-slate-900">
        {slide.imageUrl ? (
          <img 
            src={slide.imageUrl} 
            alt={slide.imagePrompt} 
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
            {slide.isImageLoading && (
              <div className="flex flex-col items-center gap-2">
                <SparklesIcon className="w-8 h-8 text-sky-400 animate-spin-slow" />
                <span className="text-xs text-sky-400 uppercase tracking-widest">Designing...</span>
              </div>
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 h-full flex flex-col p-12 justify-between">
        {/* Header */}
        <div className="border-l-4 border-sky-500 pl-6">
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            {slide.title}
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-sky-500 to-transparent mt-4 rounded-full" />
        </div>

        {/* Body */}
        <div className="flex-1 flex items-center mt-8">
            <ul className="space-y-6 max-w-2xl">
              {slide.bulletPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-4 text-slate-200 text-xl md:text-2xl leading-relaxed font-light">
                  <span className="mt-2.5 w-2 h-2 rounded-full bg-sky-400 flex-shrink-0 shadow-[0_0_10px_rgba(56,189,248,0.8)]" />
                  {point}
                </li>
              ))}
            </ul>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end border-t border-slate-700/50 pt-6">
          <span className="text-slate-500 text-sm font-medium tracking-widest uppercase">Confidential</span>
          <div className="flex items-center gap-2 text-slate-400">
             <span className="text-5xl font-bold text-slate-600/50">{index + 1}</span>
             <span className="text-lg text-slate-700">/ {total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};