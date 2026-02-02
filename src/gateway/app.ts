import express, { Request, Response, Application } from 'express';
import axios from 'axios';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import NodeCache from 'node-cache';
import { getProfessorInsight, generatePokemonSpeech } from '../services/aiService';
import { getFallbackAnalysis } from '../utils/fallback';
import { metrics } from '../utils/metrics';
import { AnalysisRequest, AnalysisResponse, SupportedLanguage, SupportedFormat } from '../types';

// Configuração do Singleton
export class PokemonGateway {
  private static instance: PokemonGateway;
  private app: Application;
  private cache: NodeCache;
  private POKEMON_SERVICE_URL = process.env.POKEMON_SERVICE_URL || 'http://localhost:3001';
  private AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:3002';

  private constructor() {
    this.app = express();
    this.cache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
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

    // Rate Limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, 
      max: 100,
      message: "Muitas requisições deste IP, por favor tente novamente após 15 minutos."
    });
    this.app.use('/api/', limiter);
  }

  private setupRoutes() {
    this.app.get('/metrics', (req: Request, res: Response) => {
      res.json(metrics.getMetrics());
    });

    this.app.get('/api/pokemon/enriched/:nameOrId', async (req: Request, res: Response) => {
      metrics.increment('totalRequests');
      const { nameOrId } = req.params;
      const lang = (req.query.lang as SupportedLanguage) || 'pt';
      const format = (req.query.format as SupportedFormat) || 'markdown';
      const generateAudio = req.query.audio === 'true';

      // 1. Checar Cache
      const cacheKey = `${nameOrId}-${lang}-${format}`;
      const cachedData = this.cache.get<AnalysisResponse>(cacheKey);

      if (cachedData) {
        metrics.increment('cacheHits');
        return res.json(cachedData);
      }

      metrics.increment('cacheMisses');

      try {
        // 2. Buscar Dados Brutos
        const pokemonRes = await axios.get(`${this.POKEMON_SERVICE_URL}/pokemon/${nameOrId}`);
        const pokemonData = pokemonRes.data;

        // 3. Tentar Análise IA
        let analysisText: string;
        let source: AnalysisResponse['source'] = 'ai';
        let modelUsed = '';

        try {
          const aiResult = await getProfessorInsight({ pokemon: pokemonData, lang, format });
          analysisText = aiResult.text;
          modelUsed = aiResult.model;
        } catch (aiError) {
          console.error(`[Gateway] AI Failed for ${nameOrId}, using Fallback.`);
          metrics.increment('aiErrors');
          metrics.increment('fallbacksUsed');
          analysisText = getFallbackAnalysis(pokemonData, lang);
          source = 'fallback';
          modelUsed = 'fallback-template';
        }

        // 4. Gerar Áudio (opcional)
        let audioBase64: string | undefined;
        if (generateAudio) {
          try {
            audioBase64 = await generatePokemonSpeech(analysisText);
          } catch (e) {
            console.error("Audio gen failed, continuing without audio.");
          }
        }

        // 5. Montar Resposta
        const responsePayload: AnalysisResponse = {
          pokemonName: pokemonData.name,
          text: analysisText,
          audioBase64,
          source,
          modelUsed,
          lang
        };

        this.cache.set(cacheKey, responsePayload);
        
        // Resposta Envelopada
        res.json({
          raw: pokemonData,
          enriched: responsePayload
        });

      } catch (error: any) {
        console.error("Gateway Critical Error:", error);
        res.status(500).json({ error: "Falha interna no Gateway", details: error.message });
      }
    });
  }

  public start() {
    const PORT = process.env.PORT || 3000;
    this.app.listen(PORT, () => {
      console.log(`[Gateway Singleton] Rodando em http://localhost:${PORT}`);
    });
  }
}