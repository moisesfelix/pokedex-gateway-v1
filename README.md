# 🎮 Pokémon Gateway API

Sistema de microserviços para consulta e análise de Pokémon utilizando IA (Google Gemini).

## 📋 Arquitetura
```
┌─────────────────┐
│   Gateway API   │ ← Porta 3000 (API Principal)
│  (Singleton)    │
└────────┬────────┘
         │
    ┌────┴─────┐
    │          │
┌───▼──┐   ┌──▼────┐
│Pokemon│   │  AI   │
│Service│   │Service│
└───────┘   └───────┘
 :3001       :3002
```

### Componentes:
- **Gateway** (porta 3000): API Gateway com cache, rate limiting e métricas
- **Pokemon Service** (porta 3001): Integração com PokeAPI
- **AI Service** (porta 3002): Análise com Google Gemini AI

---

## 🚀 Instalação

### Pré-requisitos
- Node.js 18+
- npm ou yarn
- Chave da API do Google Gemini ([Obter aqui](https://ai.google.dev))

### Passos

1. **Clone o repositório**
```bash
git clone <seu-repo>
cd pokemon-gateway
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env` e adicione sua chave do Gemini:
```env
GEMINI_API_KEY=sua_chave_aqui
```

4. **Execute o projeto**

**Desenvolvimento (todos os serviços):**
```bash
npm run dev
```

**Ou inicie serviços individualmente:**
```bash
npm run dev:gateway    # Gateway na porta 3000
npm run dev:pokemon    # Pokemon Service na porta 3001
npm run dev:ai         # AI Service na porta 3002
```

**Produção:**
```bash
npm run build
npm start
```

---

## 📡 Endpoints da API

### Gateway (http://localhost:3000)

#### Health Check
```http
GET /health
```
Retorna o status do serviço.

#### Métricas
```http
GET /metrics
```
Retorna métricas de uso (cache hits, requests, etc).

#### Listar Pokémons
```http
GET /pokemon?limit=151&offset=0
```

#### Detalhes do Pokémon
```http
GET /pokemon/:nameOrId/details
```
**Exemplo:** `/pokemon/pikachu/details` ou `/pokemon/25/details`

#### Análise com IA
```http
GET /pokemon/:nameOrId/insight?lang=pt
```
**Parâmetros:**
- `lang` (opcional): `pt`, `en`, `es` (padrão: `pt`)

**Exemplo de resposta:**
```json
{
  "pokemonName": "pikachu",
  "text": "### Análise do Professor Carvalho...",
  "source": "ai",
  "modelUsed": "gemini",
  "lang": "pt"
}
```

#### Busca em Lote
```http
POST /pokemon/batch
Content-Type: application/json

{
  "names": ["pikachu", "charizard", "mewtwo"]
}
```

---

## 🛠️ Tecnologias Utilizadas

- **Node.js** + **TypeScript**
- **Express.js** - Framework web
- **Google Gemini AI** - Análise com IA
- **PokeAPI** - Dados dos Pokémons
- **Node-cache** - Cache em memória
- **Express-rate-limit** - Proteção contra abuse
- **Axios** - Cliente HTTP

---

## 📂 Estrutura do Projeto
```
src/
├── gateway/
│   ├── app.ts              # Gateway principal (Singleton)
│   └── index.ts            # Entry point
├── microservices/
│   ├── pokemon.server.ts   # Serviço de Pokémon
│   └── ai.server.ts        # Serviço de IA
├── services/
│   ├── pokemonService.ts   # Lógica da PokeAPI
│   └── aiService.ts        # Lógica do Gemini
├── utils/
│   ├── errors.ts           # Tratamento de erros
│   ├── fallback.ts         # Análise fallback
│   └── metrics.ts          # Sistema de métricas
└── types.ts                # Definições TypeScript
```

---

## 🧪 Testando a API

### Com cURL:
```bash
# Health check
curl http://localhost:3000/health

# Buscar Pikachu
curl http://localhost:3000/pokemon/pikachu/details

# Análise com IA
curl http://localhost:3000/pokemon/pikachu/insight
```

### Com Postman/Insomnia:
Importe a collection disponível em `/docs/api-collection.json`

---

## 🔒 Segurança

- ✅ Rate limiting configurado (100 req/min)
- ✅ CORS configurável por ambiente
- ✅ Validação de entrada em todos os endpoints
- ✅ API Keys em variáveis de ambiente
- ✅ Tratamento de erros estruturado

---

## 📊 Sistema de Cache

- **TTL padrão:** 3600 segundos (1 hora)
- **Detalhes de Pokémon:** 7200 segundos (2 horas)
- **Análises de IA:** Cache por nome + idioma
- **Métricas disponíveis:** `/metrics`

---

## 🐛 Troubleshooting

### Erro: "GEMINI_API_KEY não configurada"
→ Verifique se o arquivo `.env` existe e contém a chave válida.

### Erro: "Cannot connect to Pokemon Service"
→ Certifique-se de que todos os 3 serviços estão rodando.

### Cache não funciona
→ Verifique as configurações de TTL no código.

---

## 🚧 Roadmap

- [ ] Testes unitários e integração
- [ ] Documentação Swagger/OpenAPI
- [ ] Docker Compose para deploy
- [ ] Sistema de logs estruturado (Winston)
- [ ] Suporte a mais idiomas na análise

---

## 👨‍💻 Autor

Desenvolvido como projeto de estudo de microserviços e integração com IA.

---

## 📄 Licença

MIT License - Veja [LICENSE](LICENSE) para detalhes.