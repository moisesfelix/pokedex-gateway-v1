import express, { Request, Response } from 'express';
import cors from 'cors';
import { getProfessorInsight, generatePokemonSpeech } from '../services/aiService';
import { PokemonDetails } from '../types';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3002;

app.post('/ai/insight', async (req: Request, res: Response) => {
  try {
    const reqData = req.body; // Espera { pokemon, lang, format, model }
    const pokemon: PokemonDetails = reqData.pokemon;
    const text = await getProfessorInsight(reqData);
    res.json({ insight: text.text, model: text.model });
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar insight" });
  }
});

app.post('/ai/speech', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    const audioBase64 = await generatePokemonSpeech(text);
    res.json({ audio: audioBase64 });
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar áudio" });
  }
});

app.listen(PORT, () => {
  console.log(`[AI Service] Rodando em http://localhost:${PORT}`);
});