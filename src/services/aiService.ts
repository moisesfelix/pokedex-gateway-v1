
import { GoogleGenAI } from "@google/genai";
import { PokemonDetails } from "../types";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const getAI = () => new GoogleGenAI({ apiKey: GEMINI_API_KEY});
export const getProfessorInsight = async (pokemon: PokemonDetails): Promise<string> => {
  const ai = getAI();
  
  const statsString = pokemon.stats
    .map(s => `${s.stat.name}: ${s.base_stat}`)
    .join(', ');
  const typesString = pokemon.types.map(t => t.type.name).join(', ');
  const abilitiesString = pokemon.abilities.map(a => a.ability.name).join(', ');

  const prompt = `Você é o Professor Carvalho, o renomado pesquisador Pokémon. Forneça uma análise breve, profissional e estratégica para o Pokémon ${pokemon.name.toUpperCase()}.
    Tipos: ${typesString}
    Atributos: ${statsString}
    Habilidades: ${abilitiesString}
    
    A sua resposta deve ser OBRIGATORIAMENTE EM PORTUGUÊS.
    Inclua:
    1. Uma "Dica Estratégica de Batalha".
    2. Uma "Curiosidade de Pesquisa (Lore)".
    
    Mantenha um tom encorajador, sábio e acadêmico. Use markdown para formatação.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Sinto muito, minhas notas de pesquisa estão um pouco bagunçadas agora. Tente novamente mais tarde!";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "O Professor Carvalho está ocupado no laboratório agora. Por favor, volte mais tarde!";
  }
};

