import express, { Request, Response } from 'express';
import cors from 'cors';
import { getProfessorInsight } from '../services/aiService';
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
    res.json({ insight: text });
  } catch (error) {
    res.status(500).json({ error: "Erro ao gerar insight" });
  }
});


app.listen(PORT, () => {
  console.log(`[AI Service] Rodando em http://localhost:${PORT}`);
});