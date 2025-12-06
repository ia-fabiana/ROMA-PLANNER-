
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

export type ContentType = 'social' | 'email' | 'headline' | 'stories' | 'roteiro' | 'hashtags' | 'feed' | 'legenda' | 'kit';

export interface CalendarContext {
  date: string;
  dayOfWeek: string;
  contentType: ContentType;
  focus: string;
  strategy: string;
  adjustments?: string;
}

export interface PlannedContent {
  id: string; // date-type
  date: string;
  type: 'stories' | 'post' | 'live';
  focus: string;
  selectedIngredients: string[]; // List of ingredient texts
  adjustments: string; // Custom user instructions
}

export interface ApprovedContent {
  id: string; // date-type
  date: string;
  type: ContentType;
  text: string;
  imageUrl?: string;
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
