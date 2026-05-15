# RAG Portal

Frontend do sistema RAG da coordenação de Ciência da Computação. Consome
a API do backend FastAPI.

Duas áreas:

- **`/registro`**: formulário público para o aluno se cadastrar (nome,
  matrícula, telefone). Dispara `POST /users/register` no backend, que
  envia a mensagem de boas-vindas via WhatsApp.
- **`/admin/*`**: área do coordenador, com gestão de documentos,
  atendimento de escalações (incluindo conversa ao vivo com o aluno),
  cadastro de alunos e painel de análises. Exige a `API_SECRET_KEY` do
  backend, digitada na primeira visita e guardada em `localStorage`.

## Stack

- React 19 + TypeScript + Vite
- [Mantine UI 9](https://mantine.dev) + `@mantine/form`,
  `@mantine/dropzone`, `@mantine/modals`, `@mantine/notifications`,
  `@mantine/charts`
- React Router 7
- Axios (interceptor injeta `X-API-Key` automaticamente)
- `recharts` + `d3-hierarchy` para o painel de análises

## Setup local

```bash
# instalar
npm install

# configurar a URL do backend
cp .env.example .env
# edite .env se o backend não estiver em http://localhost:8000

# rodar em modo dev
npm run dev
```

Por padrão o Vite serve em `http://localhost:5173`.

## Build de produção

O `.env.production` já aponta para `https://bot.vlopinhos.dev/api`
(host do piloto). Para builds em outros ambientes, edite esse arquivo
antes de rodar o build.

```bash
npm run build
```

Saída em `dist/`. Sirva com qualquer HTTP server estático (Caddy,
Nginx, etc.). O backend deve ficar acessível em `/api` no mesmo host
para evitar CORS, ou listado em `allow_origins` do FastAPI.

## Scripts

```bash
npm run dev       # dev server com HMR
npm run build     # build de produção
npm run preview   # preview do build local
npm run lint      # ESLint
```

## Fluxo do aluno

1. Aluno abre a URL pública (`/registro`).
2. Preenche nome completo, matrícula e telefone, com aviso sobre
   piloto e LGPD.
3. Frontend chama `POST /users/register` (endpoint sem auth).
4. Backend cria o registro e envia boas-vindas via Evolution API.
5. Tela mostra confirmação. O aluno já pode mandar perguntas pelo
   WhatsApp.

## Fluxo do coordenador

1. Coordenador acessa `/admin`.
2. Na primeira visita digita a API key (`API_SECRET_KEY` do backend).
   A key é validada em `GET /documents` antes de desbloquear o painel.
3. O painel permite:
   - **Documentos**: upload com auto-sugestão de categoria, listar,
     ver chunks gerados, remover.
   - **Escalações**: ver pendentes/respondidas, responder de uma vez ou
     abrir conversa ao vivo (chat aluno↔coordenador via WhatsApp).
   - **Alunos**: cadastrar e listar alunos manualmente.
   - **Análises**: KPIs gerais, eficácia das retentativas, cobertura
     de documentos, tópicos mais frequentes; export CSV de cada seção.

## Estrutura

```
src/
├── App.tsx                          # Router principal
├── main.tsx                         # Bootstrap React + Mantine
├── api/
│   ├── client.ts                    # axios + interceptor X-API-Key
│   ├── analytics.ts                 # KPIs e relatórios
│   ├── documents.ts                 # CRUD + chunks + suggest-category
│   ├── escalations.ts               # Detalhe + reply + live thread
│   ├── query.ts                     # /query direto (test bot)
│   └── students.ts                  # Cadastro
├── components/
│   ├── ApiKeyGate.tsx               # Pede X-API-Key na 1ª visita
│   ├── ChunkPreviewModal.tsx        # Inspeciona chunks de um doc
│   ├── DocumentList.tsx             # Tabela de documentos
│   ├── DocumentUpload.tsx           # Upload com auto-sugestão
│   ├── LiveThread.tsx               # Chat ao vivo com o aluno
│   ├── PackedBubbles.tsx            # Gráfico de tópicos
│   └── TestBotCard.tsx              # Card pra testar o bot direto
├── pages/
│   ├── Admin.tsx                    # Layout do admin
│   ├── AdminAnalytics.tsx           # Painel de análises
│   ├── AdminDashboard.tsx           # Visão geral
│   ├── AdminDocuments.tsx           # Gestão de documentos
│   ├── AdminEscalations.tsx         # Lista de escalações
│   ├── AdminEscalationDetail.tsx    # Detalhe + chat ao vivo
│   ├── AdminStudents.tsx            # Cadastro de alunos
│   └── StudentRegister.tsx          # Cadastro público
└── lib/
    ├── apiKey.ts                    # localStorage da API key
    └── masks.ts                     # Máscaras de input
```

## Licença

Projeto desenvolvido como Trabalho de Conclusão de Curso de Ciência da
Computação na PUC Minas.
