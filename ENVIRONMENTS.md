# Ambientes

## Desenvolvimento

Usa `.env.local`, PostgreSQL embarcado ou o `docker-compose.yml` local e o comando `npm run dev`. Pode receber o seed de demonstração.

## Homologação

Use uma instância e banco exclusivos. Copie `.env.staging.example` para `.env.staging`, substitua todos os segredos e utilize um domínio como `cidadefacil-homologacao.exemplo.gov.br`.

```bash
docker compose --env-file .env.staging -f docker-compose.production.yml build
docker compose --env-file .env.staging -f docker-compose.production.yml run --rm migrate
docker compose --env-file .env.staging -f docker-compose.production.yml run --rm migrate npm run db:seed:production
docker compose --env-file .env.staging -f docker-compose.production.yml up -d
```

O `COMPOSE_PROJECT_NAME=cidadefacil-staging` mantém volumes separados. Recomenda-se uma VPS separada para homologação; se compartilhar host, será necessário um proxy central e um override de portas.

## Produção

Use `.env.production`, domínio oficial, senhas diferentes de homologação, backup externo e `SESSION_COOKIE_SECURE=true` fornecido pelo Compose. Nunca copie banco, anexos ou credenciais de produção para homologação.

