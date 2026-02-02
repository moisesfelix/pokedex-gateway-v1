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
    // FIX DO RENDER: Necessário para o rate-limit funcionar atrás do proxy do Render
    this.app.set('trust proxy', 1);
    
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

    // Rate Limiting Global
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, 
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
      message: "Muitas requisições deste IP, por favor tente novamente após 15 minutos."
    });
    
    this.app.use(limiter);
  }

  private setupRoutes() {
    // ==================== ROTAS DE SISTEMA ====================
    
    this.app.get('/health', (req: Request, res: Response) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    this.app.get('/metrics', (req: Request, res: Response) => {
      res.json(metrics.getMetrics());
    });

    // ==================== ROTAS DE POKÉMON ====================
    
    // Lista de Pokémon (sem análise IA)
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
        
        this.cache.set(cacheKey, pokemonRes.data);
        res.json(pokemonRes.data);
      } catch (error: any) {
        console.error("Error fetching pokemon list:", error.message);
        res.status(500).json({ error: "Erro ao buscar lista de Pokémon" });
      }
    });

    // Detalhes básicos do Pokémon (sem análise IA)
    this.app.get('/pokemon/:nameOrId/details', async (req: Request, res: Response) => {
      try {
        const { nameOrId } = req.params;
        
        const cacheKey = `details-${nameOrId}`;
        const cachedDetails = this.cache.get(cacheKey);
        
        if (cachedDetails) {
          return res.json(cachedDetails);
        }

        const pokemonRes = await axios.get(`${this.POKEMON_SERVICE_URL}/pokemon/${nameOrId}`);
        
        this.cache.set(cacheKey, pokemonRes.data);
        res.json(pokemonRes.data);
      } catch (err) {
        return res.status(404).json({ error: "Pokémon não encontrado na PokeAPI" });
      }
    });

    // ==================== ROTAS DE IA ====================
    
    // Análise do Professor (APENAS TEXTO)
    this.app.get('/pokemon/:nameOrId/insight', async (req: Request, res: Response) => {
      metrics.increment('totalRequests');
      const { nameOrId } = req.params;
      const lang = (req.query.lang as SupportedLanguage) || 'pt';
      const format = (req.query.format as SupportedFormat) || 'markdown';
      const model = (req.query.model as 'flash' | 'pro') || 'flash';

      // 1. Checar Cache
      const cacheKey = `insight-${nameOrId}-${lang}-${format}-${model}`;
      const cachedInsight = this.cache.get<{ text: string; modelUsed: string; source: string }>(cacheKey);

      if (cachedInsight) {
        metrics.increment('cacheHits');
        return res.json(cachedInsight);
      }

      metrics.increment('cacheMisses');

      try {
        // 2. Buscar dados do Pokémon
        let pokemonData;
        try {
          const pokemonRes = await axios.get(`${this.POKEMON_SERVICE_URL}/pokemon/${nameOrId}`);
          pokemonData = pokemonRes.data;
        } catch (err) {
          return res.status(404).json({ error: "Pokémon não encontrado na PokeAPI" });
        }

        // 3. Gerar análise
        let analysisText: string;
        let source: 'ai' | 'fallback' = 'ai';
        let modelUsed = '';

        try {
          const aiResult = await getProfessorInsight({ pokemon: pokemonData, lang, format, model });
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

        const response = {
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

    // Gerar Áudio (APENAS ÁUDIO)
    this.app.post('/ai/speech', async (req: Request, res: Response) => {
      try {
        const { text } = req.body;
        
        if (!text || typeof text !== 'string') {
          return res.status(400).json({ error: "Campo 'text' é obrigatório e deve ser uma string" });
        }

        // Cache baseado no hash do texto (opcional, áudio pode ser pesado)
        const textHash = Buffer.from(text).toString('base64').substring(0, 32);
        const cacheKey = `audio-${textHash}`;
        const cachedAudio = this.cache.get<string>(cacheKey);

        if (cachedAudio) {
          return res.json({ audio: cachedAudio, source: 'cache' });
        }

        const audioBase64 = await generatePokemonSpeech(text);
        
        // Cache por 10 minutos
        this.cache.set(cacheKey, audioBase64, 600);
        
        res.json({ audio: audioBase64, source: 'generated' });
      } catch (error: any) {
        console.error("Speech generation error:", error.message);
        res.status(500).json({ error: "Erro ao gerar áudio", details: error.message });
      }
    });

    // ==================== ROTA COMBINADA (OPCIONAL/LEGADO) ====================
    
    // Detalhes + Análise + Áudio (tudo de uma vez, para compatibilidade)
    this.app.get('/pokemon/:nameOrId', async (req: Request, res: Response) => {
      metrics.increment('totalRequests');
      const { nameOrId } = req.params;
      const lang = (req.query.lang as SupportedLanguage) || 'pt';
      const format = (req.query.format as SupportedFormat) || 'markdown';
      const generateAudio = req.query.audio === 'true';
      const model = (req.query.model as 'flash' | 'pro') || 'flash';

      const cacheKey = `full-${nameOrId}-${lang}-${format}-${generateAudio}-${model}`;
      const cachedData = this.cache.get<AnalysisResponse>(cacheKey);

      if (cachedData) {
        metrics.increment('cacheHits');
        return res.json({
          raw: { name: nameOrId, source: 'cache_placeholder' },
          enriched: cachedData 
        });
      }

      metrics.increment('cacheMisses');

      try {
        // 1. Buscar dados
        let pokemonData;
        try {
          const pokemonRes = await axios.get(`${this.POKEMON_SERVICE_URL}/pokemon/${nameOrId}`);
          pokemonData = pokemonRes.data;
        } catch (err) {
          return res.status(404).json({ error: "Pokémon não encontrado na PokeAPI" });
        }

        // 2. Gerar análise
        let analysisText: string;
        let source: AnalysisResponse['source'] = 'ai';
        let modelUsed = '';

        try {
          const aiResult = await getProfessorInsight({ pokemon: pokemonData, lang, format, model });
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

        // 3. Gerar áudio (opcional)
        let audioBase64: string | undefined;
        if (generateAudio) {
          try {
            audioBase64 = await generatePokemonSpeech(analysisText);
          } catch (e) {
            console.error("Audio gen failed, continuing without audio.");
          }
        }

        const responsePayload: AnalysisResponse = {
          pokemonName: pokemonData.name,
          text: analysisText,
          audioBase64,
          source,
          modelUsed,
          lang
        };

        this.cache.set(cacheKey, responsePayload);
        
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