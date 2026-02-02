import express, { Request, Response } from 'express';
import cors from 'cors';
import { fetchPokemonList, fetchPokemonDetails } from '../services/pokemonService';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

app.get('/pokemon', async (req: Request, res: Response) => {
  try {
    const { limit, offset } = req.query;
    const list = await fetchPokemonList(Number(limit), Number(offset));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: "Erro ao buscar lista de Pokémon" });
  }
});

app.get('/pokemon/:nameOrId', async (req: Request, res: Response) => {
  try {
    const { nameOrId } = req.params;
    const details = await fetchPokemonDetails(nameOrId);
    res.json(details);
  } catch (error) {
    res.status(404).json({ error: "Pokémon não encontrado" });
  }
});

app.listen(PORT, () => {
  console.log(`[Pokemon Service] Rodando em http://localhost:${PORT}`);
});