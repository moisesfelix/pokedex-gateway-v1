import express, { Request, Response, Application } from 'express';
import axios from 'axios';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import { getProfessorInsight } from '../services/aiService'; // ← Removido generatePokemonSpeech
import { getFallbackAnalysis } from '../utils/fallback';
import { metrics } from '../utils/metrics';
import { AnalysisResponse, SupportedLanguage, SupportedFormat, PokemonDetails } from '../types';

// Configuração do Singleton
export class PokemonGateway {
  private static instance: PokemonGateway;
  private app: Application;
  private cache: NodeCache;
  private POKEMON_SERVICE_URL = process.env.POKEMON_SERVICE_URL || 'http://localhost:3001';
  private AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3002';

  private constructor() {
    this.app = express();
    this.app.set('trust proxy', 1);

    this.cache = new NodeCache({ stdTTL: 3600, checkperiod: 300 });
    this.setupMiddleware();
    this.setupRoutes();
  }

  public static getInstance(): PokemonGateway {
    if (!PokemonGateway.instance) {
      PokemonGateway.instance = new PokemonGateway();
    }
    return PokemonGateway.instance;
  }

  private setupMiddleware() {
    this.app.use(cors());
    this.app.use(express.json());

    const limiter = rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 200,
      standardHeaders: true,
      legacyHeaders: false,
      message: "Muitas requisições. Aguarde um momento.",
      skip: (req) => {
        return req.path.includes('/details') ||
          req.path === '/pokemon' ||
          req.path === '/health';
      }
    });

    this.app.use(limiter);
  }

  private setupRoutes() {
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    this.app.get('/metrics', (req: Request, res: Response) => {
      res.json(metrics.getMetrics());
    });

    // Batch de detalhes
    this.app.post('/pokemon/batch', async (req: Request, res: Response) => {
      try {
        const { names } = req.body;

        if (!Array.isArray(names) || names.length === 0) {
          return res.status(400).json({ error: "Campo 'names' deve ser um array não vazio" });
        }

        if (names.length > 50) {
          return res.status(400).json({ error: "Máximo de 50 pokémon por batch" });
        }

        const results = await Promise.allSettled(
          names.map(async (name: string) => {
            const normalized = name.toLowerCase();
            const cacheKey = `details-${normalized}`;
            const cached = this.cache.get(cacheKey);

            if (cached) {
              return { name, data: cached, source: 'cache' };
            }

            const response = await axios.get(`${this.POKEMON_SERVICE_URL}/pokemon/${normalized}`);
            this.cache.set(cacheKey, response.data);
            return { name, data: response.data, source: 'api' };
          })
        );

        const successful = results
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .map(r => r.value);

        const failed = results
          .map((r, i) => r.status === 'rejected' ? names[i] : null)
          .filter(Boolean);

        res.json({
          success: successful,
          failed,
          total: names.length,
          successCount: successful.length
        });

      } catch (error: any) {
        console.error("Batch error:", error.message);
        res.status(500).json({ error: "Erro no carregamento em lote" });
      }
    });

    // Lista de Pokémon
    this.app.get('/pokemon', async (req: Request, res: Response) => {
      try {
        const { limit = 151, offset = 0 } = req.query;

        const cacheKey = `list-${limit}-${offset}`;
        const cachedList = this.cache.get(cacheKey);

        if (cachedList) {
          return res.json(cachedList);
        }

        const pokemonRes = await axios.get(
          `${this.POKEMON_SERVICE_URL}/pokemon?limit=${limit}&offset=${offset}`
        );

        this.cache.set(cacheKey, pokemonRes.data, 7200);
        res.json(pokemonRes.data);
      } catch (error: any) {
        console.error("Error fetching pokemon list:", error.message);
        res.status(500).json({ error: "Erro ao buscar lista de Pokémon" });
      }
    });

    // Detalhes básicos do Pokémon
    this.app.get('/pokemon/:nameOrId/details', async (req: Request, res: Response) => {
      metrics.increment('totalRequests');

      try {
        const { nameOrId } = req.params;
        const normalizedName = nameOrId.toLowerCase();
        const cacheKey = `details-${normalizedName}`;

        const cachedDetails = this.cache.get<PokemonDetails>(cacheKey);

        if (cachedDetails) {
          metrics.increment('cacheHits');
          return res.json(cachedDetails);
        }

        metrics.increment('cacheMisses');

        const pokemonRes = await axios.get(`${this.POKEMON_SERVICE_URL}/pokemon/${normalizedName}`);
        const pokemonData = pokemonRes.data as PokemonDetails;

        this.cache.set(cacheKey, pokemonData, 7200);

        res.json(pokemonData);
      } catch (err: any) {
        if (err.response?.status === 404) {
          return res.status(404).json({ error: "Pokémon não encontrado na PokeAPI" });
        }

        console.error("Error fetching pokemon details:", err.message);
        res.status(500).json({ error: "Erro ao buscar detalhes do Pokémon" });
      }
    });

    // Análise do Professor
    this.app.get('/pokemon/:nameOrId/insight', async (req: Request, res: Response) => {
      metrics.increment('totalRequests');
      const { nameOrId } = req.params;
      const lang = (req.query.lang as SupportedLanguage) || 'pt';
      // format e model não são usados no momento (compatibilidade com assinatura antiga da AI)
      // const format = (req.query.format as SupportedFormat) || 'markdown';
      // const model = (req.query.model as 'flash' | 'pro') || 'flash';

      const cacheKey = `insight-${nameOrId.toLowerCase()}-${lang}`;
      const cachedInsight = this.cache.get<AnalysisResponse>(cacheKey);

      if (cachedInsight) {
        metrics.increment('cacheHits');
        return res.json(cachedInsight);
      }

      metrics.increment('cacheMisses');

      try {
        let pokemonData: PokemonDetails;
        try {
          const pokemonRes = await axios.get(`${this.POKEMON_SERVICE_URL}/pokemon/${nameOrId}`);
          pokemonData = pokemonRes.data;
        } catch (err) {
          return res.status(404).json({ error: "Pokémon não encontrado na PokeAPI" });
        }

        let analysisText: string;
        let source: 'ai' | 'fallback' = 'ai';
        let modelUsed = 'gemini'; // valor fixo enquanto usamos assinatura antiga

        try {
          // Chamada compatível com assinatura antiga: getProfessorInsight(pokemon: PokemonDetails): Promise<string>
          analysisText = await getProfessorInsight(pokemonData);
        } catch (aiError) {
          console.error(`[Gateway] AI Failed for ${nameOrId}, using Fallback.`);
          metrics.increment('aiErrors');
          metrics.increment('fallbacksUsed');
          analysisText = getFallbackAnalysis(pokemonData, lang);
          source = 'fallback';
          modelUsed = 'fallback-template';
        }

        const response: AnalysisResponse = {
          pokemonName: pokemonData.name,
          text: analysisText,
          source,
          modelUsed,
          lang
        };

        this.cache.set(cacheKey, response);
        res.json(response);

      } catch (error: any) {
        console.error("Gateway Error:", error);
        res.status(500).json({ error: "Falha ao gerar análise", details: error.message });
      }
    });

    // Rota /ai/speech removida (não será mais usada)
    // Rota combinada (legado) removida
  }

  public start() {
    const PORT = process.env.PORT || 3000;
    this.app.listen(PORT, () => {
      console.log(`[Gateway Singleton] Rodando em http://localhost:${PORT}`);
    });
  }
}