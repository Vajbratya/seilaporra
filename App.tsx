import React, { useState, useEffect, useRef } from 'react';
import { RocketIcon, SparklesIcon, DownloadIcon, ChevronRightIcon, ChevronLeftIcon, RefreshCwIcon } from './components/Icons';
import { GenerationStep, PitchDeck, GeneratedSlide, PitchTemplateId, VisualStyleId, Language, LANGUAGES } from './types';
import { generateDeckStructure, reviewPitchDeck, refinePitchDeck, generateSlideImage, promptApiKeySelection, checkApiKey, PITCH_TEMPLATES, VISUAL_STYLES } from './services/geminiService';
import { SlideRenderer } from './components/SlideRenderer';

const App = () => {
  const [step, setStep] = useState<GenerationStep>(GenerationStep.IDLE);
  const [idea, setIdea] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PitchTemplateId>('sequoia');
  const [selectedStyle, setSelectedStyle] = useState<VisualStyleId>('photorealistic');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  
  const [deck, setDeck] = useState<PitchDeck | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [critiqueSummary, setCritiqueSummary] = useState<string>("");
  
  const imageGenStartedRef = useRef(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    
    setStep(GenerationStep.CHECKING_KEY);
    try {
      const hasKey = await checkApiKey();
      if (!hasKey) {
        await promptApiKeySelection();
      }
      
      // 1. Initial Draft
      setStep(GenerationStep.GENERATING_TEXT);
      setError(null);
      setCritiqueSummary("");
      
      const draftDeck = await generateDeckStructure(idea, selectedTemplate, selectedStyle, selectedLanguage);
      
      // 2. Evil VC Review
      setStep(GenerationStep.REVIEWING);
      const critique = await reviewPitchDeck(draftDeck, selectedLanguage);
      setCritiqueSummary(critique.slice(0, 150) + "..."); 
      
      // 3. Refinement
      setStep(GenerationStep.REFINING);
      const refinedDeck = await refinePitchDeck(draftDeck, critique, selectedStyle, selectedLanguage);
      
      setDeck(refinedDeck);
      
      // 4. Image Gen
      setStep(GenerationStep.GENERATING_IMAGES);
      
    } catch (err: any) {
      console.error(err);
      if (err.message && err.message.includes("Requested entity was not found")) {
         setError("API Key session expired or invalid. Please try again to re-select key.");
         await promptApiKeySelection();
      } else {
         setError(err.message || "Something went wrong generating the deck.");
      }
      setStep(GenerationStep.IDLE);
    }
  };

  useEffect(() => {
    if (step === GenerationStep.GENERATING_IMAGES && deck && !imageGenStartedRef.current) {
      imageGenStartedRef.current = true;
      
      const generateImages = async () => {
        const slides = [...deck.slides];
        let completed = 0;

        setDeck(prev => prev ? ({
          ...prev,
          slides: prev.slides.map(s => ({ ...s, isImageLoading: true }))
        }) : null);

        const BATCH_SIZE = 2;
        for (let i = 0; i < slides.length; i += BATCH_SIZE) {
          const batch = slides.slice(i, i + BATCH_SIZE);
          await Promise.all(batch.map(async (slide) => {
            try {
              const imageUrl = await generateSlideImage(slide.imagePrompt, selectedStyle);
              
              setDeck(prev => {
                if (!prev) return null;
                return {
                  ...prev,
                  slides: prev.slides.map(s => 
                    s.id === slide.id ? { ...s, imageUrl, isImageLoading: false } : s
                  )
                };
              });
            } catch (err) {
              console.error(`Failed to gen image for slide ${slide.id}`, err);
              setDeck(prev => prev ? ({
                 ...prev,
                 slides: prev.slides.map(s => s.id === slide.id ? { ...s, isImageLoading: false } : s)
              }) : null);
            } finally {
              completed++;
              setProgress((completed / slides.length) * 100);
            }
          }));
        }
        
        setStep(GenerationStep.COMPLETE);
        imageGenStartedRef.current = false;
      };

      generateImages();
    }
  }, [step, deck, selectedStyle]);

  const handlePrint = () => {
    window.print();
  };

  const handleReset = () => {
    setDeck(null);
    setIdea('');
    setStep(GenerationStep.IDLE);
    setCurrentSlideIndex(0);
    setProgress(0);
    setError(null);
    setCritiqueSummary("");
    imageGenStartedRef.current = false;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-sky-500/30">
      
      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10 no-print">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleReset}>
            <RocketIcon className="w-6 h-6 text-sky-500" />
            <span className="font-bold text-xl tracking-tight">PitchDeck<span className="text-sky-500">.AI</span></span>
          </div>
          <div className="flex items-center gap-4">
             {step === GenerationStep.COMPLETE && (
               <button onClick={handleReset} className="text-sm font-medium text-slate-400 hover:text-white transition-colors flex items-center gap-2">
                 <RefreshCwIcon className="w-4 h-4" /> New Deck
               </button>
             )}
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto min-h-screen flex flex-col">
        
        {step === GenerationStep.IDLE && (
          <div className="flex-1 flex flex-col justify-center items-center text-center max-w-3xl mx-auto animate-[fadeIn_0.5s_ease-out]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-medium mb-8">
              <SparklesIcon className="w-4 h-4" />
              <span>Powered by Gemini 3 Pro</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent">
              Universal Best Ever <br/> Pitch Deck Generator
            </h1>
            
            <p className="text-lg text-slate-400 mb-12 max-w-xl leading-relaxed">
              Transform your raw startup idea into a visually stunning, investor-ready presentation in seconds. BOOOOM.
            </p>

            <form onSubmit={handleStart} className="w-full max-w-xl relative group flex flex-col gap-4">
              
              {/* Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Framework</label>
                  <select 
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value as PitchTemplateId)}
                    className="bg-slate-900 border border-white/10 text-white text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5 appearance-none hover:bg-slate-800 transition-colors"
                  >
                    {Object.entries(PITCH_TEMPLATES).map(([id, t]) => (
                      <option key={id} value={id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Visual Style</label>
                  <select 
                    value={selectedStyle}
                    onChange={(e) => setSelectedStyle(e.target.value as VisualStyleId)}
                    className="bg-slate-900 border border-white/10 text-white text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5 appearance-none hover:bg-slate-800 transition-colors"
                  >
                    {Object.entries(VISUAL_STYLES).map(([id, s]) => (
                      <option key={id} value={id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">Language</label>
                  <select 
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value as Language)}
                    className="bg-slate-900 border border-white/10 text-white text-sm rounded-lg focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5 appearance-none hover:bg-slate-800 transition-colors"
                  >
                    {Object.entries(LANGUAGES).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Input */}
              <div className="relative group/input mt-2">
                <div className="absolute -inset-1 bg-gradient-to-r from-sky-600 to-blue-600 rounded-2xl blur opacity-25 group-hover/input:opacity-75 transition duration-1000 group-hover/input:duration-200"></div>
                <div className="relative flex bg-slate-900 rounded-xl p-2 border border-white/10 shadow-2xl">
                  <input
                    type="text"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="e.g. A marketplace for renting high-end cameras..."
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-500 px-4 py-3 text-lg"
                    autoFocus
                  />
                  <button 
                    type="submit"
                    disabled={!idea.trim()}
                    className="bg-sky-500 hover:bg-sky-400 text-white px-6 py-3 rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Generate <RocketIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-8 flex flex-col gap-2 text-xs text-slate-500">
               <span className="font-semibold text-sky-500/80">{PITCH_TEMPLATES[selectedTemplate].description}</span>
            </div>

            {error && (
              <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm max-w-xl">
                {error}
              </div>
            )}
          </div>
        )}

        {/* LOADING STATES */}
        {(step === GenerationStep.CHECKING_KEY || 
          step === GenerationStep.GENERATING_TEXT ||
          step === GenerationStep.REVIEWING || 
          step === GenerationStep.REFINING
        ) && (
          <div className="flex-1 flex flex-col justify-center items-center text-center animate-[fadeIn_0.5s_ease-out]">
            <div className="relative w-24 h-24 mb-8">
              <div className={`absolute inset-0 border-4 rounded-full ${step === GenerationStep.REVIEWING ? 'border-red-900' : 'border-slate-800'}`}></div>
              <div className={`absolute inset-0 border-4 rounded-full border-t-transparent animate-spin ${step === GenerationStep.REVIEWING ? 'border-red-500' : 'border-sky-500'}`}></div>
              <RocketIcon className={`absolute inset-0 m-auto w-8 h-8 animate-pulse ${step === GenerationStep.REVIEWING ? 'text-red-500' : 'text-sky-500'}`} />
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-4">
              {step === GenerationStep.CHECKING_KEY && "Connecting to HQ..."}
              {step === GenerationStep.GENERATING_TEXT && "Drafting Initial Pitch..."}
              {step === GenerationStep.REVIEWING && <span className="text-red-500">Evil VC is tearing it apart...</span>}
              {step === GenerationStep.REFINING && <span className="text-sky-400">Rebuilding Stronger...</span>}
            </h2>
            
            <p className="text-slate-400 max-w-md mx-auto">
              {step === GenerationStep.CHECKING_KEY && "Secure handshake in progress."}
              {step === GenerationStep.GENERATING_TEXT && `Applying the ${PITCH_TEMPLATES[selectedTemplate].name} framework.`}
              {step === GenerationStep.REVIEWING && "Identifying weaknesses, fluff, and logic gaps. Prepare to be judged."}
              {step === GenerationStep.REFINING && "Integrating feedback to create the best version possible."}
            </p>
          </div>
        )}

        {(step === GenerationStep.GENERATING_IMAGES || step === GenerationStep.COMPLETE) && deck && (
          <div className="animate-[fadeIn_1s_ease-out] w-full max-w-6xl mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 no-print">
              <div>
                <h2 className="text-3xl font-bold text-white mb-2">{deck.companyName}</h2>
                <p className="text-sky-400 font-medium">{deck.tagline}</p>
              </div>
              
              <div className="flex items-center gap-4">
                {step === GenerationStep.GENERATING_IMAGES && (
                   <div className="flex flex-col items-end gap-2">
                     <div className="text-sm text-slate-400 font-mono">Generating Slides ({VISUAL_STYLES[selectedStyle].name}): {Math.round(progress)}%</div>
                     <div className="w-48 h-2 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                     </div>
                   </div>
                )}
                {step === GenerationStep.COMPLETE && (
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-white text-slate-900 px-5 py-2.5 rounded-lg font-bold hover:bg-slate-200 transition-colors shadow-lg shadow-white/5"
                  >
                    <DownloadIcon className="w-4 h-4" /> Export PDF
                  </button>
                )}
              </div>
            </div>

            <div className="mb-12 hidden md:block print:hidden">
              <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                <SlideRenderer 
                  slide={deck.slides[currentSlideIndex]} 
                  index={currentSlideIndex} 
                  total={deck.slides.length} 
                />
                
                <div className="flex items-center justify-between mt-6 px-4">
                  <button 
                    onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentSlideIndex === 0}
                    className="p-3 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
                  >
                    <ChevronLeftIcon className="w-6 h-6" />
                  </button>
                  
                  <div className="flex gap-2 overflow-x-auto max-w-[60%] no-scrollbar px-2">
                    {deck.slides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentSlideIndex ? 'bg-sky-500 w-8' : 'bg-slate-700 hover:bg-slate-600'}`}
                      />
                    ))}
                  </div>

                  <button 
                    onClick={() => setCurrentSlideIndex(prev => Math.min(deck.slides.length - 1, prev + 1))}
                    disabled={currentSlideIndex === deck.slides.length - 1}
                    className="p-3 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
                  >
                    <ChevronRightIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            <div className="md:hidden print:block print:w-full space-y-8">
               {deck.slides.map((slide, idx) => (
                 <div key={slide.id} className="break-inside-avoid">
                   <SlideRenderer slide={slide} index={idx} total={deck.slides.length} />
                 </div>
               ))}
            </div>
            
            <div className="hidden md:grid print:hidden grid-cols-4 gap-4 opacity-50 hover:opacity-100 transition-opacity duration-300">
               {deck.slides.map((slide, idx) => (
                 <div 
                   key={slide.id} 
                   onClick={() => setCurrentSlideIndex(idx)}
                   className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${idx === currentSlideIndex ? 'border-sky-500 ring-2 ring-sky-500/20' : 'border-transparent hover:border-slate-700'}`}
                 >
                    <div className="aspect-video bg-slate-800 relative">
                       {slide.imageUrl ? (
                         <img src={slide.imageUrl} className="w-full h-full object-cover" alt="" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-xs text-slate-600">Generating...</div>
                       )}
                       <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-[10px] text-white truncate">
                         {slide.title}
                       </div>
                    </div>
                 </div>
               ))}
            </div>

          </div>
        )}
      </main>
    </div>
  );
};

export default App;