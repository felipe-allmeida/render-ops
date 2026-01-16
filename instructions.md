Você é um engenheiro full-stack sênior. Quero um MVP usando a biblioteca oficial da Vercel Labs:
- @json-render/core
- @json-render/react
Instalação conforme README: npm install @json-render/core @json-render/react :contentReference[oaicite:1]{index=1}
github: https://github.com/vercel-labs/json-render

Objetivo do MVP (Phase 1):
- Auth: Keycloak (OIDC Authorization Code + PKCE)
- Data: Postgres
- UI: Gerada e renderizada com json-render (catálogo + actions + data bindings)
- Segurança: UI só pode usar componentes do catálogo; actions só podem ser as actions registradas no catálogo :contentReference[oaicite:2]{index=2}
- Backend executa DB e ações (frontend nunca conecta direto no Postgres)

Stack (fixar esta escolha):
- Frontend: Next.js + React + TypeScript
- Backend: Next.js Route Handlers (/app/api/*) OU API separada Node (Fastify). Escolha 1 e siga.
- DB access: Prisma (recomendado) ou node-postgres. Escolha 1 e siga.
- Infra local: docker-compose com Postgres + Keycloak + app.

Requisitos funcionais:
1) Login via Keycloak.
2) “Connections”: cadastrar connection string do Postgres (armazenar com segurança no backend; no MVP pode ser in-memory ou sqlite local, mas isolar por usuário).
3) Listar tabelas (introspecção do schema).
4) Selecionar uma tabela e gerar automaticamente uma “CRUD UI” em JSON tree:
   - Listagem paginada + busca simples
   - Detalhe / Editar
   - Criar
   - Deletar com confirmação
5) Renderizar no frontend usando:
   - DataProvider para dados
   - ActionProvider para ações
   - Renderer para renderizar tree :contentReference[oaicite:3]{index=3}
6) Actions:
   - db_list (listagem)
   - db_get (por id)
   - db_insert
   - db_update
   - db_delete
   - http_request (webhook) com allowlist de domínios + métodos
   Cada action precisa:
   - validação dos params
   - logs (userId, actionName, timestamp, sucesso/erro)

Requisitos do json-render (obrigatório):
A) Definir um catalog via createCatalog com:
   - components: Table, Form, TextField, NumberField, DateField, SelectField, Button, Card, Section, Page, Alert/Toast, ModalConfirm
   - actions: db_list, db_get, db_insert, db_update, db_delete, http_request
   - props definidos com zod (z.object etc), como no README :contentReference[oaicite:4]{index=4}
B) Registrar registry React para cada componente (como renderiza).
C) Use bindings por “paths” (valuePath etc) para ler/escrever data no DataProvider (sem eval).
D) Use actions via Button.props.action (ActionSchema) e execute com onAction no ActionProvider :contentReference[oaicite:5]{index=5}
E) Suportar confirm dialog em actions (confirm.title/message/variant) e callbacks onSuccess/onError (ex: set paths) conforme exemplo de “Rich Actions” :contentReference[oaicite:6]{index=6}

Backend endpoints (mínimo):
- GET /api/me  -> dados do usuário logado
- POST /api/connections -> cria conexão Postgres (nome + connectionString)
- GET /api/connections/:id/tables -> lista tabelas
- GET /api/connections/:id/tables/:table/schema -> colunas e tipos
- POST /api/ui/generate -> retorna JSON tree para CRUD baseado na tabela
- POST /api/actions/execute -> executa action (db_* ou http_request)

Gerador de UI (MVP):
- NÃO precisa LLM real ainda.
- Faça generator determinístico:
  - Dado schema da tabela, gerar:
    - Page(title)
      - Section
        - Card("List")
          - Table (columns)
          - Row actions: Edit, Delete
          - Top actions: Create, Refresh, Webhook demo (opcional)
        - Modal/Form para Create/Edit com fields por coluna
- Converter tipos do Postgres -> campos:
  - text/varchar -> TextField
  - int/numeric -> NumberField
  - bool -> SelectField ou Toggle
  - date/timestamp -> DateField
- Heurística:
  - escolher coluna “id” (pk) e 1-2 colunas “display”
  - required vs nullable -> checks “required”
  - validação básica usando “checks” (required/email/etc) seguindo “Built-in Validation” :contentReference[oaicite:7]{index=7}

Segurança (MVP, mas sério):
- Sanitizar strings exibidas (evitar XSS)
- http_request: allowlist por env var (ex: WEBHOOK_ALLOWLIST=example.com,api.myapp.com)
- db_*: permitir apenas tabelas do schema selecionado e queries parametrizadas
- Rate limiting simples no /actions/execute
- Audit log em tabela audit_log no Postgres (ideal) ou arquivo local

Entregáveis:
1) Estrutura do projeto (pasta + arquivos principais)
2) docker-compose.yml com:
   - postgres (com seed customers/orders)
   - keycloak (realm + client + user demo via import)
   - app
3) Scripts:
   - seed.sql para tabelas demo
   - keycloak realm export json
4) README com passo-a-passo:
   - subir docker
   - acessar Keycloak
   - login na app
   - criar conexão
   - gerar “Customer Admin” e executar CRUD
5) Exemplos de JSON tree gerado (1-2 exemplos), mostrando:
   - Table
   - Form
   - Button com action + confirm + onSuccess/onError :contentReference[oaicite:8]{index=8}

Observação:
- A lib suporta streaming (useUIStream). Se der tempo, implementar /api/generate que “streama” a tree; se não, retornar JSON completo no MVP. :contentReference[oaicite:9]{index=9}
