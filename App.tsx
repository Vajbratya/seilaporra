import React, { useState, useEffect, useRef } from 'react';
import { RocketIcon, SparklesIcon, DownloadIcon, ChevronRightIcon, ChevronLeftIcon, RefreshCwIcon } from './components/Icons';
import { GenerationStep, PitchDeck, GeneratedSlide, PitchTemplateId, VisualStyleId, Language, LANGUAGES, BrandIdentity } from './types';
import { generateDeckStructure, reviewPitchDeck, refinePitchDeck, generateSlideImage, promptApiKeySelection, checkApiKey, PITCH_TEMPLATES, VISUAL_STYLES } from './services/geminiService';
import { SlideRenderer } from './components/SlideRenderer';

const App = () => {
  const [step, setStep] = useState<GenerationStep>(GenerationStep.IDLE);
  const [idea, setIdea] = useState('');
  
  // Settings
  const [selectedTemplate, setSelectedTemplate] = useState<PitchTemplateId>('sequoia');
  const [selectedStyle, setSelectedStyle] = useState<VisualStyleId>('corporate'); // Default to corporate
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('en');
  const [customStylePrompt, setCustomStylePrompt] = useState('');
  
  // Brand Identity State
  const [primaryColor, setPrimaryColor] = useState('#0ea5e9'); // Default sky-500
  const [secondaryColor, setSecondaryColor] = useState('#0f172a'); // Default slate-900
  const [fontPreference, setFontPreference] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const [deck, setDeck] = useState<PitchDeck | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [critiqueSummary, setCritiqueSummary] = useState<string>("");
  
  const imageGenStartedRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoUrl(url);
    }
  };

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idea.trim()) return;
    
    setStep(GenerationStep.CHECKING_KEY);
    try {
      const hasKey = await checkApiKey();
      if (!hasKey) {
        await promptApiKeySelection();
      }
      
      // Construct Brand Identity Object
      const brand: BrandIdentity = {
        primaryColor,
        secondaryColor,
        font: fontPreference,
        logoUrl
      };

      // 1. Initial Draft
      setStep(GenerationStep.GENERATING_TEXT);
      setError(null);
      setCritiqueSummary("");
      
      const draftDeck = await generateDeckStructure(
        idea, 
        selectedTemplate, 
        selectedStyle, 
        selectedLanguage, 
        brand, 
        customStylePrompt
      );
      
      // 2. Evil VC Review
      setStep(GenerationStep.REVIEWING);
      const critique = await reviewPitchDeck(draftDeck, selectedLanguage);
      setCritiqueSummary(critique.slice(0, 150) + "..."); 
      
      // 3. Refinement
      setStep(GenerationStep.REFINING);
      const refinedDeck = await refinePitchDeck(draftDeck, critique, selectedStyle, selectedLanguage, customStylePrompt);
      
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
              const imageUrl = await generateSlideImage(slide.imagePrompt, selectedStyle, customStylePrompt);
              
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
  }, [step, deck, selectedStyle, customStylePrompt]);

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
    <div className="min-h-screen bg-slate-950 text-slate-50 selection:bg-sky-500/30 relative overflow-hidden font-sans">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-sky-900/10 via-slate-900/50 to-slate-950 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute top-20 -left-20 w-72 h-72 bg-sky-600/10 rounded-full blur-[128px] pointer-events-none" />

      <nav className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/10 no-print">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={handleReset}>
            <div className="relative">
              <div className="absolute inset-0 bg-sky-500 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
              <RocketIcon className="w-6 h-6 text-sky-500 relative z-10" />
            </div>
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

      <main className="pt-24 pb-20 px-6 max-w-7xl mx-auto min-h-screen flex flex-col relative z-10">
        
        {step === GenerationStep.IDLE && (
          <div className="flex-1 flex flex-col justify-center items-center text-center max-w-4xl mx-auto animate-[fadeIn_0.5s_ease-out]">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-sm font-medium mb-8">
              <SparklesIcon className="w-4 h-4" />
              <span>Powered by Gemini 3 Pro</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-br from-white via-slate-200 to-slate-500 bg-clip-text text-transparent drop-shadow-lg">
              Universal Best Ever <br/> Pitch Deck Generator
            </h1>
            
            <p className="text-lg text-slate-400 mb-12 max-w-xl leading-relaxed">
              Create professional, on-brand investor presentations in seconds. <br/>
              <span className="text-sky-400 font-medium">BOOOOM.</span> Done.
            </p>

            <form onSubmit={handleStart} className="w-full relative flex flex-col gap-6">
              
              <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl space-y-6">
                
                {/* 1. Brand Identity Section */}
                <div>
                   <h3 className="text-left text-sm font-bold text-sky-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">1. Brand Identity</h3>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                      <div className="text-left">
                        <label className="text-xs font-semibold text-slate-500 block mb-2">Logo Upload</label>
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="h-10 w-full bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg flex items-center justify-center cursor-pointer transition-colors overflow-hidden relative group"
                        >
                           {logoUrl ? (
                             <img src={logoUrl} alt="Logo" className="h-full w-full object-contain p-1" />
                           ) : (
                             <span className="text-xs text-slate-400">Click to Upload</span>
                           )}
                           <input 
                             type="file" 
                             ref={fileInputRef} 
                             onChange={handleLogoUpload} 
                             className="hidden" 
                             accept="image/png, image/jpeg, image/svg+xml"
                           />
                        </div>
                      </div>

                      <div className="text-left">
                        <label className="text-xs font-semibold text-slate-500 block mb-2">Primary Color</label>
                        <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1 border border-white/10">
                          <input 
                            type="color" 
                            value={primaryColor}
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                          />
                          <input 
                            type="text" 
                            value={primaryColor} 
                            onChange={(e) => setPrimaryColor(e.target.value)}
                            className="bg-transparent border-none text-xs text-white w-16 focus:ring-0" 
                          />
                        </div>
                      </div>

                      <div className="text-left">
                         <label className="text-xs font-semibold text-slate-500 block mb-2">Secondary Color</label>
                         <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1 border border-white/10">
                          <input 
                            type="color" 
                            value={secondaryColor}
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                          />
                          <input 
                            type="text" 
                            value={secondaryColor} 
                            onChange={(e) => setSecondaryColor(e.target.value)}
                            className="bg-transparent border-none text-xs text-white w-16 focus:ring-0" 
                          />
                        </div>
                      </div>

                      <div className="text-left">
                        <label className="text-xs font-semibold text-slate-500 block mb-2">Typography</label>
                        <div className="flex bg-slate-800 rounded-lg p-1 border border-white/10">
                           <button type="button" onClick={() => setFontPreference('sans')} className={`flex-1 py-1 text-xs rounded ${fontPreference === 'sans' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>Sans</button>
                           <button type="button" onClick={() => setFontPreference('serif')} className={`flex-1 py-1 text-xs rounded font-serif ${fontPreference === 'serif' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}>Serif</button>
                        </div>
                      </div>
                   </div>
                </div>

                {/* 2. Style & Framework Section */}
                <div>
                  <h3 className="text-left text-sm font-bold text-sky-400 uppercase tracking-widest mb-4 border-b border-white/5 pb-2">2. Style & Framework</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                    {/* Template Selector */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Framework</label>
                      <select 
                        value={selectedTemplate}
                        onChange={(e) => setSelectedTemplate(e.target.value as PitchTemplateId)}
                        className="bg-slate-800 border border-white/5 text-white text-sm rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5 outline-none hover:bg-slate-700/80 transition-all cursor-pointer"
                      >
                        {Object.entries(PITCH_TEMPLATES).map(([id, t]) => (
                          <option key={id} value={id}>{t.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Visual Style Selector */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Visual Style</label>
                      <select 
                        value={selectedStyle}
                        onChange={(e) => setSelectedStyle(e.target.value as VisualStyleId)}
                        className="bg-slate-800 border border-white/5 text-white text-sm rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5 outline-none hover:bg-slate-700/80 transition-all cursor-pointer"
                      >
                        {Object.entries(VISUAL_STYLES).map(([id, s]) => (
                          <option key={id} value={id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Language Selector */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Language</label>
                      <select 
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value as Language)}
                        className="bg-slate-800 border border-white/5 text-white text-sm rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5 outline-none hover:bg-slate-700/80 transition-all cursor-pointer"
                      >
                        {Object.entries(LANGUAGES).map(([id, name]) => (
                          <option key={id} value={id}>{name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Custom Style Input (Conditional) */}
                  {selectedStyle === 'custom' && (
                    <div className="mt-4 flex flex-col gap-2 animate-[fadeIn_0.3s_ease-out] text-left">
                      <label className="text-xs font-bold text-sky-400 uppercase tracking-wider">Describe Custom Style</label>
                      <input 
                        type="text"
                        value={customStylePrompt}
                        onChange={(e) => setCustomStylePrompt(e.target.value)}
                        placeholder="e.g. Hand-drawn sketches on graph paper, blueprint style..."
                        className="bg-slate-800 border border-sky-500/30 text-white text-sm rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 block w-full p-2.5 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Main Idea Input */}
              <div className="relative group/input">
                <div className="absolute -inset-1 bg-gradient-to-r from-sky-600 to-indigo-600 rounded-2xl blur opacity-25 group-hover/input:opacity-60 transition duration-1000 group-hover/input:duration-200"></div>
                <div className="relative flex bg-slate-900 rounded-xl p-2 border border-white/10 shadow-2xl">
                  <input
                    type="text"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder="Describe your startup idea..."
                    className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-500 px-4 py-3 text-lg"
                    autoFocus
                  />
                  <button 
                    type="submit"
                    disabled={!idea.trim() || (selectedStyle === 'custom' && !customStylePrompt.trim())}
                    className="bg-sky-500 hover:bg-sky-400 text-white px-8 py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-sky-500/20"
                  >
                    Generate <RocketIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </form>

            {error && (
              <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm max-w-xl animate-[shake_0.5s_ease-in-out]">
                {error}
              </div>
            )}
          </div>
        )}

        {(step === GenerationStep.GENERATING_IMAGES || step === GenerationStep.COMPLETE) && deck && (
          <div className="animate-[fadeIn_1s_ease-out] w-full max-w-6xl mx-auto">
            
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 no-print">
              <div>
                <h2 className="text-4xl font-extrabold text-white mb-2 tracking-tight" style={{ fontFamily: deck.brand.font === 'serif' ? 'serif' : 'inherit' }}>{deck.companyName}</h2>
                <p className="text-xl font-medium" style={{ color: deck.brand.primaryColor }}>{deck.tagline}</p>
              </div>
              
              <div className="flex items-center gap-6">
                {step === GenerationStep.GENERATING_IMAGES && (
                   <div className="flex flex-col items-end gap-2">
                     <div className="text-sm text-slate-400 font-mono flex items-center gap-2">
                        <SparklesIcon className="w-4 h-4" style={{ color: deck.brand.primaryColor }} />
                        Rendering Slides ({Math.round(progress)}%)
                     </div>
                     <div className="w-48 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                       <div className="h-full transition-all duration-300 shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ width: `${progress}%`, backgroundColor: deck.brand.primaryColor }}></div>
                     </div>
                   </div>
                )}
                {step === GenerationStep.COMPLETE && (
                  <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                  >
                    <DownloadIcon className="w-5 h-5" /> Export PDF
                  </button>
                )}
              </div>
            </div>

            <div className="mb-12 hidden md:block print:hidden shadow-2xl shadow-black/50 rounded-2xl">
              <div className="bg-slate-900/50 p-6 rounded-2xl border border-white/5 backdrop-blur-sm">
                <SlideRenderer 
                  slide={deck.slides[currentSlideIndex]} 
                  index={currentSlideIndex} 
                  total={deck.slides.length}
                  brand={deck.brand} 
                />
                
                <div className="flex items-center justify-between mt-8 px-4">
                  <button 
                    onClick={() => setCurrentSlideIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentSlideIndex === 0}
                    className="p-4 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
                  >
                    <ChevronLeftIcon className="w-6 h-6" />
                  </button>
                  
                  <div className="flex gap-3 overflow-x-auto max-w-[60%] no-scrollbar px-4 py-2">
                    {deck.slides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`transition-all duration-300 rounded-full ${idx === currentSlideIndex ? 'w-8 h-2' : 'w-2 h-2 hover:bg-slate-600'}`}
                        style={{ backgroundColor: idx === currentSlideIndex ? deck.brand.primaryColor : '#334155' }}
                      />
                    ))}
                  </div>

                  <button 
                    onClick={() => setCurrentSlideIndex(prev => Math.min(deck.slides.length - 1, prev + 1))}
                    disabled={currentSlideIndex === deck.slides.length - 1}
                    className="p-4 rounded-full hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white"
                  >
                    <ChevronRightIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>

            <div className="md:hidden print:block print:w-full space-y-8">
               {deck.slides.map((slide, idx) => (
                 <div key={slide.id} className="break-inside-avoid">
                   <SlideRenderer slide={slide} index={idx} total={deck.slides.length} brand={deck.brand} />
                 </div>
               ))}
            </div>
            
            <div className="hidden md:grid print:hidden grid-cols-4 lg:grid-cols-5 gap-6">
               {deck.slides.map((slide, idx) => (
                 <div 
                   key={slide.id} 
                   onClick={() => setCurrentSlideIndex(idx)}
                   className={`cursor-pointer group rounded-xl overflow-hidden border-2 transition-all duration-300 transform hover:-translate-y-1 ${idx === currentSlideIndex ? 'ring-4 shadow-xl' : 'border-transparent hover:border-slate-700 opacity-60 hover:opacity-100'}`}
                   style={{ borderColor: idx === currentSlideIndex ? deck.brand.primaryColor : 'transparent', boxShadow: idx === currentSlideIndex ? `0 0 20px ${deck.brand.primaryColor}30` : 'none' }}
                 >
                    <div className="aspect-video bg-slate-800 relative">
                       {slide.imageUrl ? (
                         <img src={slide.imageUrl} className="w-full h-full object-cover" alt="" />
                       ) : (
                         <div className="w-full h-full flex flex-col items-center justify-center text-xs text-slate-600 gap-2">
                            <SparklesIcon className="w-4 h-4 animate-spin-slow opacity-50" style={{ color: deck.brand.primaryColor }} />
                         </div>
                       )}
                       <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                         <span className="text-[10px] font-bold text-white truncate w-full">{slide.title}</span>
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