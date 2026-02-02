import axios from 'axios';
import { AnalysisRequest, SupportedLanguage } from "../types";

const getSystemPrompt = (lang: SupportedLanguage, format: string) => {
  const langMap = { pt: 'PORTUGUÊS', en: 'INGLÊS', es: 'ESPANHOL' };
  const formatInstructions = format === 'html' 
    ? 'Use tags HTML (<b>, <i>, <br>, <ul>, <li>) para formatação.' 
    : 'Use Markdown padrão.';
    
  return `Você é o Professor Carvalho. Responda OBRIGATORIAMENTE em ${langMap[lang] || 'PORTUGUÊS'}. ${formatInstructions}`;
};

export const getProfessorInsight = async (req: AnalysisRequest): Promise<{ text: string, model: string }> => {
  const { pokemon, lang = 'pt', format = 'markdown', model = 'flash' } = req;
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable not set");
  }

  // Modelos e URL a partir de variáveis de ambiente
  const proModel = process.env.GEMINI_PRO_MODEL || 'gemini-1.5-pro-latest';
  const flashModel = process.env.GEMINI_FLASH_MODEL || 'gemini-1.5-flash-latest';
  const modelName = model === 'pro' ? proModel : flashModel;
  const baseUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
  const url = `${baseUrl}/${modelName}:generateContent?key=${apiKey}`;

  const statsString = pokemon.stats.map(s => `${s.stat.name}: ${s.base_stat}`).join(', ');
  const typesString = pokemon.types.map(t => t.type.name).join(', ');
  const abilitiesString = pokemon.abilities.map(a => a.ability.name).join(', ');

  const systemPrompt = getSystemPrompt(lang, format);
  const userPrompt = `Analise o Pokémon ${pokemon.name.toUpperCase()}.\nTipos: ${typesString}\nAtributos: ${statsString}\nHabilidades: ${abilitiesString}\n\nInclua:\n1. Dica Estratégica.\n2. Curiosidade (Lore).`;

  const requestBody = {
    contents: [{
      parts: [{ text: userPrompt }]
    }],
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    }
  };

  try {
    const response = await axios.post(url, requestBody, { headers: { 'Content-Type': 'application/json' } });
    
    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const text = response.data.candidates[0].content.parts[0].text;
      return { text, model: modelName };
    } else {
      console.error("Unexpected AI response structure:", response.data);
      throw new Error("Unexpected AI response structure.");
    }

  } catch (error) {
    const axiosError = error as any;
    console.error("AI Service Error:", axiosError.response ? axiosError.response.data : axiosError.message);
    throw axiosError;
  }
};

export const generatePokemonSpeech = async (text: string): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set");
    }
    
    const ttsModel = process.env.GEMINI_TTS_MODEL || 'text-to-speech-2';
    const baseUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models';
    const url = `${baseUrl}/${ttsModel}:generateContent?key=${apiKey}`;

    const requestBody = {
        "contents": [{
            "parts": [{ "text": text }]
        }],
        "generationConfig": {
            "responseMimeType": "audio/mpeg"
        }
    };

    try {
        const response = await axios.post(url, requestBody, { headers: { 'Content-Type': 'application/json' } });

        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            return response.data.candidates[0].content.parts[0].inlineData.data;
        } else {
            console.error("Unexpected TTS response structure:", response.data);
            throw new Error("Unexpected TTS response structure.");
        }
    } catch (error) {
        const axiosError = error as any;
        console.error("TTS Service Error:", axiosError.response ? axiosError.response.data : axiosError.message);
        throw axiosError;
    }
};
