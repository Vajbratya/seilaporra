export interface SlideContent {
  title: string;
  bulletPoints: string[];
  imagePrompt: string;
  speakerNotes: string;
}

export interface GeneratedSlide extends SlideContent {
  id: string;
  imageUrl?: string;
  isImageLoading?: boolean;
}

export interface BrandIdentity {
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  font: 'sans' | 'serif' | 'mono';
}

export interface PitchDeck {
  title: string;
  companyName: string;
  tagline: string;
  slides: GeneratedSlide[];
  brand: BrandIdentity;
}

export enum GenerationStep {
  IDLE = 'IDLE',
  CHECKING_KEY = 'CHECKING_KEY',
  GENERATING_TEXT = 'GENERATING_TEXT',
  REVIEWING = 'REVIEWING',
  REFINING = 'REFINING',
  GENERATING_IMAGES = 'GENERATING_IMAGES',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export type PitchTemplateId = 'sequoia' | 'yc' | 'kawasaki' | '500startups' | 'unusual' | 'soma' | 'intercom' | 'khosla' | 'canonical';
export type VisualStyleId = 'corporate' | 'tech_minimal' | 'swiss' | 'editorial' | 'custom';

export interface PitchTemplate {
  id: PitchTemplateId;
  name: string;
  description: string;
}

export interface VisualStyle {
  id: VisualStyleId;
  name: string;
  description: string;
}

export type Language = 'en' | 'es' | 'pt' | 'fr' | 'de' | 'zh' | 'ja';

export const LANGUAGES: Record<Language, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  fr: 'Français',
  de: 'Deutsch',
  zh: '中文',
  ja: '日本語'
};