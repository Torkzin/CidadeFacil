# CidadeFácil

O sistema também oferece dois aplicativos instaláveis pelo navegador: **CidadeFácil Cidadão** e **CidadeFácil Gestão**. Consulte [PWA.md](./PWA.md) para instalação, atualização, ícones e requisitos de publicação.

Sistema institucional de gestão municipal construído com Next.js 16, React 19, TypeScript, PostgreSQL e Drizzle ORM. O banco é isolado por município por meio de `municipalities` e `municipality_id`, deixando a base preparada para múltiplas prefeituras sem transformar o produto obrigatoriamente em SaaS.

O ambiente de desenvolvimento está configurado para o Município de Seropédica/RJ, com bairros postais, faixa de CEP `23890-001` a `23899-899`, mapa centralizado no município e secretarias importadas do organograma municipal.

## Requisitos

- Node.js 20 ou superior
- npm
- Docker Desktop (opcional; o projeto também inclui PostgreSQL local embarcado para desenvolvimento)

## Instalação

```bash
npm install
```

Copie `.env.example` para `.env.local`. Os valores padrão já correspondem aos comandos locais deste projeto.

## Banco de dados

Opção 1 — PostgreSQL local incluído no projeto:

```bash
npm run db:local
```

Mantenha esse terminal aberto. Em outro terminal, execute:

```bash
npm run db:migrate
npm run db:seed
```

Opção 2 — Docker Compose:

```bash
docker compose up -d
npm run db:migrate
npm run db:seed
```

Para gerar uma nova migration após alterar `db/schema.ts`:

```bash
npm run db:generate
```

## Executar o sistema

```bash
npm run dev
```

Para executar imediatamente uma varredura dos alertas de SLA no ambiente local:

```bash
npm run worker:sla:once
```

Em produção, o serviço `sla-worker` executa essa varredura continuamente, sem depender de alguém abrir o sistema no navegador.

Acesse [http://localhost:3000/login](http://localhost:3000/login).

Credenciais de desenvolvimento:

- E-mail: `admin@cidadefacil.local`
- Senha: `CidadeFacil@2026`

## Produção em VPS

O repositório inclui uma implantação Docker para VPS Linux com Next.js em modo standalone, PostgreSQL privado, Caddy com HTTPS automático, volumes persistentes e health checks. O seed de produção cria a estrutura institucional e o primeiro administrador sem inserir solicitações de demonstração.

Consulte [DEPLOYMENT.md](./DEPLOYMENT.md) para o procedimento completo de DNS, variáveis, primeira instalação, atualização e backup.

## Validação

```bash
npm test
npm run lint
npm run build
npm run test:smoke
```

O smoke test pressupõe o PostgreSQL e o servidor Next.js ativos. Ele valida login, criação, geração de protocolo, encaminhamento, atribuição de equipe, mudança de status, timeline, conclusão, anexos, busca global, relatórios CSV, notificações e configurações persistidas.

## Arquitetura

- `app/`: páginas e Route Handlers do Next.js App Router.
- `components/`: frontend institucional preservado e conectado às APIs.
- `db/schema.ts`: modelo relacional PostgreSQL com isolamento por município.
- `db/seed.ts`: dados iniciais e usuário administrativo.
- `lib/auth/`: hash de senha e sessões persistidas no banco.
- `lib/db/`: conexão PostgreSQL/Drizzle.
- `drizzle/`: migrations SQL versionadas.
- `scripts/smoke-test.mjs`: teste ponta a ponta da API.
- `storage/uploads/`: arquivos enviados no ambiente local (ignorado pelo Git).
- `Dockerfile` e `docker-compose.production.yml`: imagem e serviços para produção em VPS, incluindo o worker de alertas de SLA.
- `Caddyfile`: proxy reverso e emissão automática de certificados HTTPS.
- `db/seed-production.ts`: inicialização segura de uma base de produção vazia.
- `/sistema`: diagnóstico operacional restrito a administradores, incluindo a última execução do worker de SLA.
- `/pendencias`: fila operacional com solicitações críticas, sem atribuição, próximas do SLA, paradas ou aguardando.
- `/regras-encaminhamento`: administração de regras automáticas por categoria e bairro, com destino, equipe e prioridade opcionais.

## Estado funcional

Já usam dados reais: autenticação e sessão, dashboard e gráficos, solicitações, protocolos, listagem, detalhes, CRUD de secretarias, equipes, usuários e categorias, encaminhamento, status, prioridade, comentários, timeline, conclusão, fotos protegidas, mapa com coordenadas via OpenStreetMap, relatórios com filtros e exportação CSV, notificações por usuário, busca global, dados institucionais, preferências de alerta, prazos por prioridade, cálculo de SLA, fila de pendências, escalonamento de solicitações sem responsável e regras automáticas de encaminhamento por categoria e bairro.

Ainda não utilizam serviços externos: envio de e-mails/SMS, resumo diário automatizado e armazenamento de objetos. Em desenvolvimento, as fotos ficam no disco local; produção deve usar armazenamento compatível com S3/R2.

## Portal e gestão avançada

- Portal do Cidadão: `/cidadao`
- Nova solicitação pública: `/cidadao/nova-solicitacao`
- Consulta segura: `/cidadao/consultar`
- Painel Executivo: `/executivo`
- Auditoria administrativa: `/auditoria`
- Política pública: `/privacidade`

Documentação adicional: [segurança](./SECURITY.md), [ambientes](./ENVIRONMENTS.md), [backup e restore](./BACKUP.md), [demonstração](./DEMO.md) e [canais externos](./CHANNELS.md).
