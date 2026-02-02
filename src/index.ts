
    import express from 'express';
    import { fetchPokemonList, fetchPokemonDetails } from './services/poke-api';
    import { getProfessorInsight, generatePokemonSpeech } from './services/gemini';

    const app = express();
    const port = 3000;

    app.use(express.json());

    app.get('/pokemon', async (req, res) => {
      try {
        const pokemonList = await fetchPokemonList();
        res.json(pokemonList);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Pokémon list' });
      }
    });

    app.get('/pokemon/:name', async (req, res) => {
      try {
        const pokemonDetails = await fetchPokemonDetails(req.params.name);
        const professorInsight = await getProfessorInsight(pokemonDetails);
        res.json({ ...pokemonDetails, professorInsight });
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch Pokémon details' });
      }
    });

    app.post('/pokemon/speech', async (req, res) => {
      try {
        const { text } = req.body;
        const audioContent = await generatePokemonSpeech(text);
        res.json({ audioContent });
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate speech' });
      }
    });

    app.listen(port, () => {
      console.log(`Gateway is running on http://localhost:${port}`);
    });
    