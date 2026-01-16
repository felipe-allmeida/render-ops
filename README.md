# RenderOps - Dynamic UI Generator

MVP para geração e renderização de interfaces CRUD dinâmicas a partir de schemas de banco de dados PostgreSQL.

## Stack

- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Backend**: Next.js Route Handlers (App Router)
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: Keycloak (OIDC Authorization Code + PKCE)
- **UI Engine**: @json-render/core + @json-render/react
- **Infra**: Docker Compose

## Funcionalidades

1. Login via Keycloak (OIDC + PKCE)
2. Gerenciamento de conexões PostgreSQL
3. Listagem e introspecção de tabelas
4. Geração automática de UI CRUD em JSON tree
5. Renderização dinâmica usando json-render
6. Actions seguras: db_list, db_get, db_insert, db_update, db_delete, http_request
7. Rate limiting e audit log

## Requisitos

- Docker e Docker Compose
- Node.js 18+ (para desenvolvimento local)
- npm ou pnpm

## Quick Start

### 1. Clone e configure

```bash
cd render-ops

# Copie o arquivo de exemplo de env
cp .env.local.example .env.local
```

### 2. Suba os containers

```bash
docker-compose up -d
```

Isso irá iniciar:
- **PostgreSQL** na porta 5432 (com seed de dados demo)
- **Keycloak** na porta 8080

Aguarde alguns segundos para o Keycloak inicializar completamente.

### 3. Instale as dependências e inicie a aplicação

```bash
npm install

# Gere o cliente Prisma
npm run db:generate

# Aplique as migrações
npm run db:push

# Inicie em modo de desenvolvimento
npm run dev
```

A aplicação estará disponível em: http://localhost:3000

### 4. Acesse o Keycloak (opcional)

- URL: http://localhost:8080
- Admin: `admin` / `admin`
- Realm: `render-ops`

### 5. Faça login na aplicação

1. Acesse http://localhost:3000
2. Clique em "Sign In"
3. Use as credenciais demo:
   - Username: `demo`
   - Password: `demo123`

### 6. Crie uma conexão e gere a UI

1. No dashboard, clique em "Add Connection"
2. Preencha os dados:
   - Name: `Client Demo`
   - Host: `localhost`
   - Port: `5432`
   - Database: `client_demo`
   - Username: `postgres`
   - Password: `postgres`

   Ou use a connection string diretamente:
   ```
   postgresql://postgres:postgres@localhost:5432/renderops
   postgresql://postgres:postgres@localhost:5432/client_demo
   ```
3. Selecione uma tabela (ex: `customers`)
4. A UI CRUD será gerada automaticamente!

## Tabelas de Demo (client_demo)

O banco `client_demo` inclui as seguintes tabelas:

- **customers**: Cadastro de clientes
- **products**: Produtos
- **categories**: Categorias de produtos
- **suppliers**: Fornecedores
- **orders**: Pedidos
- **order_items**: Itens de pedido

## Estrutura do Projeto

```
render-ops/
├── docker/
│   ├── postgres/
│   │   └── seed.sql          # Dados de demo
│   └── keycloak/
│       └── realm-export.json # Configuração do realm
├── prisma/
│   └── schema.prisma         # Schema do Prisma
├── src/
│   ├── app/
│   │   ├── api/              # API Routes
│   │   │   ├── auth/         # NextAuth endpoints
│   │   │   ├── connections/  # CRUD de conexões
│   │   │   ├── actions/      # Executor de actions
│   │   │   └── ui/           # Gerador de UI
│   │   ├── dashboard/        # Páginas do dashboard
│   │   └── auth/             # Páginas de autenticação
│   ├── components/
│   │   ├── providers/        # DataProvider, ActionProvider
│   │   └── renderer.tsx      # Renderer de UI
│   └── lib/
│       ├── auth.ts           # Configuração NextAuth
│       ├── catalog.ts        # Catálogo json-render
│       ├── registry.tsx      # Registry de componentes
│       ├── ui-generator.ts   # Gerador de UI
│       └── actions/          # Handlers de actions
├── docker-compose.yml
└── package.json
```

## API Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/me` | GET | Dados do usuário logado |
| `/api/connections` | GET, POST | Listar/criar conexões |
| `/api/connections/:id` | GET, DELETE | Detalhes/excluir conexão |
| `/api/connections/:id/tables` | GET | Listar tabelas |
| `/api/connections/:id/tables/:table/schema` | GET | Schema da tabela |
| `/api/ui/generate` | POST | Gerar UI JSON |
| `/api/actions/execute` | POST | Executar action |

## Catálogo de Componentes

### Layout
- `Page` - Página com título
- `Section` - Seção colapsável
- `Card` - Card com título
- `Row` - Layout flexbox

### Dados
- `Table` - Tabela de dados com ações

### Formulário
- `Form` - Container de formulário
- `TextField` - Campo de texto
- `NumberField` - Campo numérico
- `DateField` - Campo de data
- `SelectField` - Campo de seleção

### Ações
- `Button` - Botão com action

### Feedback
- `Alert` - Alerta/notificação
- `ModalConfirm` - Modal de confirmação

## Actions Disponíveis

| Action | Descrição |
|--------|-----------|
| `db_list` | Listar registros com paginação |
| `db_get` | Buscar registro por ID |
| `db_insert` | Inserir novo registro |
| `db_update` | Atualizar registro |
| `db_delete` | Excluir registro |
| `http_request` | Requisição HTTP (com allowlist) |

## Segurança

- **Autenticação**: OIDC com PKCE via Keycloak
- **Autorização**: Conexões isoladas por usuário
- **SQL Injection**: Queries parametrizadas
- **XSS**: Sanitização de strings
- **Rate Limiting**: 100 req/min por usuário
- **Webhook Allowlist**: Domínios permitidos via env

## Variáveis de Ambiente

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/renderops"

# Keycloak
KEYCLOAK_ID="render-ops-client"
KEYCLOAK_SECRET=""
KEYCLOAK_ISSUER="http://localhost:8080/realms/render-ops"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-here"

# Webhook allowlist
WEBHOOK_ALLOWLIST="example.com,api.myapp.com"

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

## Exemplos de JSON Tree Gerado

Veja os exemplos em `docs/examples/`.

## Desenvolvimento

```bash
# Desenvolvimento
npm run dev

# Build
npm run build

# Lint
npm run lint

# Docker
npm run docker:up
npm run docker:down
```

## Roadmap (Phase 2+)

- [ ] Streaming de UI com useUIStream
- [ ] Geração de UI via LLM
- [ ] Suporte a múltiplos schemas
- [ ] Validação avançada com Zod
- [ ] Temas customizáveis
- [ ] Export para PDF/CSV
