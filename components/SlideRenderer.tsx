import React from 'react';
import { GeneratedSlide, BrandIdentity } from '../types';
import { SparklesIcon } from './Icons';

interface SlideRendererProps {
  slide: GeneratedSlide;
  index: number;
  total: number;
  brand?: BrandIdentity;
}

export const SlideRenderer: React.FC<SlideRendererProps> = ({ slide, index, total, brand }) => {
  
  // Default values if brand is not yet available (e.g. preview)
  const primaryColor = brand?.primaryColor || '#0ea5e9'; // sky-500
  const secondaryColor = brand?.secondaryColor || '#0f172a'; // slate-900
  const isSerif = brand?.font === 'serif';

  return (
    <div className={`relative w-full aspect-video bg-white overflow-hidden shadow-2xl rounded-xl print:shadow-none print:rounded-none page-break ${isSerif ? 'font-serif' : 'font-sans'}`}>
      
      {/* Brand Logo Watermark (if present) */}
      {brand?.logoUrl && (
        <div className="absolute top-6 right-6 z-30">
          <img src={brand.logoUrl} alt="Company Logo" className="h-8 md:h-12 object-contain drop-shadow-lg" />
        </div>
      )}

      {/* Background Image Layer */}
      <div className="absolute inset-0 z-0 bg-slate-900">
        {slide.imageUrl ? (
          <img 
            src={slide.imageUrl} 
            alt={slide.imagePrompt} 
            className="w-full h-full object-cover opacity-30 mix-blend-overlay"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${secondaryColor}, #000000)` }}>
            {slide.isImageLoading && (
              <div className="flex flex-col items-center gap-2">
                <SparklesIcon className="w-8 h-8 animate-spin-slow" style={{ color: primaryColor }} />
                <span className="text-xs uppercase tracking-widest" style={{ color: primaryColor }}>Designing...</span>
              </div>
            )}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/90 to-transparent" />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 h-full flex flex-col p-12 justify-between">
        {/* Header */}
        <div className="pl-6 border-l-4" style={{ borderColor: primaryColor }}>
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight leading-tight">
            {slide.title}
          </h2>
          <div className="w-24 h-1 mt-4 rounded-full" style={{ background: `linear-gradient(to right, ${primaryColor}, transparent)` }} />
        </div>

        {/* Body */}
        <div className="flex-1 flex items-center mt-8">
            <ul className="space-y-6 max-w-2xl">
              {slide.bulletPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-4 text-slate-200 text-xl md:text-2xl leading-relaxed font-light">
                  <span 
                    className="mt-2.5 w-2 h-2 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: primaryColor, boxShadow: `0 0 10px ${primaryColor}80` }}
                  />
                  {point}
                </li>
              ))}
            </ul>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end border-t border-white/10 pt-6">
          <span className="text-slate-500 text-sm font-medium tracking-widest uppercase">Confidential</span>
          <div className="flex items-center gap-2 text-slate-400">
             <span className="text-5xl font-bold opacity-50">{index + 1}</span>
             <span className="text-lg opacity-70">/ {total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};