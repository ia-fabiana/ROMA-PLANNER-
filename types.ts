
export interface StrategyItem {
  id: string;
  category: string; // New field: e.g., 'Atração de Clientes' or 'Melhorar Divulgação'
  desire: string; // Atração: Desejo
  opportunity: string; // Atração: Oportunidade
  engagement: string; // Engajamento (Situação atual/Sintoma)
  objection: string; // Objeção
  pain: string; // Dor
}

export enum AppMode {
  ORGANIZATION = 'ORGANIZATION',
  AI_INSIGHTS = 'AI_INSIGHTS',
  CALENDAR = 'CALENDAR'
}

export type ContentType = 'social' | 'email' | 'headline' | 'stories' | 'roteiro' | 'hashtags' | 'feed' | 'legenda' | 'kit' | 'carousel' | 'viral' | 'live' | 'post';

export interface CalendarContext {
  date: string;
  dayOfWeek: string;
  contentType: ContentType;
  focus: string;
  strategy: string;
  adjustments?: string;
  manualContent?: string; // Restored: User drafted content
  selectedFormats?: string[]; // New: User selected specific formats
}

export interface PlannedContent {
  id: string; // date-type
  date: string;
  type: ContentType;
  focus: string;
  selectedIngredients: string[]; // List of ingredient texts
  adjustments: string; // Custom user instructions for AI
  manualContent?: string; // Restored: User drafted content
  carouselImages?: string[]; // Stores generated carousel slides (visuals)
  selectedFormats?: string[]; // New: Saved format selections
}

export interface ApprovedContent {
  id: string; // date-type
  date: string;
  type: ContentType;
  text: string;
  imageUrl?: string; // Main single image
  carouselImages?: string[]; // Array of base64 images for carousel or collection of all images
  strategy: string;
  timestamp: number;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  type: ContentType;
  content: string;
  ingredientsSummary: string[];
  imageUrl?: string;
}
