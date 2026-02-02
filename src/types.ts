// Interfaces de Dados da PokeAPI
export interface Stat {
  base_stat: number;
  effort: number;
  stat: { name: string; url: string };
}

export interface Ability {
  ability: { name: string; url: string };
  is_hidden: boolean;
  slot: number;
}

export interface Type {
  slot: number;
  type: { name: string; url: string };
}

export interface PokemonDetails {
  id: number;
  name: string;
  stats: Stat[];
  types: Type[];
  abilities: Ability[];
  height: number;
  weight: number;
  sprites: { front_default: string };
}

export interface PokemonBase {
  name: string;
  url: string;
}

// Interfaces do Sistema de Gateway
export type SupportedLanguage = 'pt' | 'en' | 'es';
export type SupportedFormat = 'markdown' | 'html' | 'text';
export type ModelType = 'flash' | 'pro';

export interface AnalysisRequest {
  pokemon: PokemonDetails;
  lang?: SupportedLanguage;
  format?: SupportedFormat;
  model?: ModelType;
}

export interface AnalysisResponse {
  pokemonName: string;
  text: string;
  audioBase64?: string;
  source: 'ai' | 'cache' | 'fallback';
  modelUsed: string;
  lang: SupportedLanguage;
}

export interface ServiceMetrics {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  aiErrors: number;
  fallbacksUsed: number;
}