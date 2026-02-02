import { PokemonDetails, SupportedLanguage } from '../types';

const getTemplate = (lang: SupportedLanguage, name: string, type: string) => {
  const templates = {
    pt: `### Análise de Emergência: ${name}\n\nOs sistemas do Professor estão instáveis. Dados básicos:\n- **Tipo:** ${type}\n- **Estratégia:** Monitore os atributos básicos.\n- **Lore:** Sem dados de lore disponíveis no momento offline.`,
    en: `### Emergency Analysis: ${name}\n\nProfessor's systems unstable. Basic data:\n- **Type:** ${type}\n- **Strategy:** Watch base stats closely.\n- **Lore:** No lore data available offline.`,
    es: `### Análisis de Emergência: ${name}\n\nSistemas del Profesor inestables. Datos básicos:\n- **Tipo:** ${type}\n- **Estrategia:** Monitorea los atributos básicos.\n- **Lore:** Sin datos de historia disponibles offline.`
  };
  return templates[lang];
};

export const getFallbackAnalysis = (pokemon: PokemonDetails, lang: SupportedLanguage = 'pt'): string => {
  const type = pokemon.types[0]?.type.name || 'unknown';
  return getTemplate(lang, pokemon.name, type);
};