import { GoogleGenAI } from "@google/genai";
import { PokemonDetails } from "../types";
import { logError } from '../utils/errors';

// ✅ Validação da API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY não configurada no arquivo .env');
}

// ✅ Inicialização do cliente Gemini
const getAI = () => new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * Gera uma análise do Professor Carvalho para um Pokémon
 * @param pokemon - Detalhes do Pokémon da PokeAPI
 * @returns Texto da análise em markdown
 */
export const getProfessorInsight = async (pokemon: PokemonDetails): Promise<string> => {
  const ai = getAI();

  // ✅ Preparação dos dados do Pokémon
  const statsString = pokemon.stats
    .map(s => `${s.stat.name}: ${s.base_stat}`)
    .join(', ');

  const typesString = pokemon.types
    .map(t => t.type.name)
    .join(', ');

  const abilitiesString = pokemon.abilities
    .map(a => a.ability.name)
    .join(', ');

  // ✅ Prompt otimizado para o Professor Carvalho
  const prompt = `Você é o Professor Carvalho, o renomado pesquisador Pokémon. Forneça uma análise breve, profissional e estratégica para o Pokémon ${pokemon.name.toUpperCase()}.

Informações do Pokémon:
- Tipos: ${typesString}
- Atributos: ${statsString}
- Habilidades: ${abilitiesString}

A sua resposta deve ser OBRIGATORIAMENTE EM PORTUGUÊS.

Estrutura da análise:
1. **Dica Estratégica de Batalha** - Sugestão tática para usar este Pokémon em combate
2. **Curiosidade de Pesquisa (Lore)** - Um fato interessante sobre a espécie

Mantenha um tom encorajador, sábio e acadêmico. Use markdown para formatação.`;

  try {
    // ✅ Chamada para a API do Gemini com modelo correto
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    // ✅ Retorna o texto ou mensagem padrão
    const analysisText = response.text;

    if (!analysisText || analysisText.trim().length === 0) {
      console.warn(`[AI Service] Resposta vazia para ${pokemon.name}`);
      return "Sinto muito, minhas notas de pesquisa estão um pouco bagunçadas agora. Tente novamente mais tarde!";
    }

    return analysisText;

  } catch (error) {
    // ✅ Log estruturado de erro
    logError('AI Service - Gemini API', error, {
      pokemon: pokemon.name,
      pokemonId: pokemon.id
    });

    // ✅ Mensagem amigável para o usuário
    return "O Professor Carvalho está ocupado no laboratório agora. Por favor, volte mais tarde!";
  }
};
