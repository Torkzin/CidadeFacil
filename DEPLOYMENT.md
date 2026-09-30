# Implantação do CidadeFácil em VPS

Esta configuração executa uma única instância institucional do CidadeFácil. O PostgreSQL não publica porta na internet; apenas Caddy recebe tráfego nas portas 80 e 443. O HTTPS é emitido e renovado automaticamente depois que o domínio aponta para a VPS.

## 1. Preparar a VPS e o DNS

Use uma VPS Linux com, no mínimo, 2 vCPU, 4 GB de RAM e 40 GB de SSD. Instale Docker Engine com o plugin Docker Compose.

No provedor do domínio, crie um registro `A` apontando o subdomínio escolhido para o IPv4 público da VPS. Se usar IPv6, crie também o registro `AAAA`. Libere no firewall somente:

- `22/tcp` para SSH, preferencialmente limitado aos IPs administrativos;
- `80/tcp` para emissão e redirecionamento HTTP;
- `443/tcp` e `443/udp` para HTTPS.

Não exponha a porta `5432`.

## 2. Configurar as variáveis

Na raiz do projeto na VPS:

```bash
cp .env.production.example .env.production
chmod 600 .env.production
openssl rand -hex 32
openssl rand -hex 32
```

Edite `.env.production`. Use o primeiro valor aleatório como `POSTGRES_PASSWORD` e também dentro de `DATABASE_URL`. Como o formato hexadecimal não contém caracteres reservados de URL, ele pode ser copiado diretamente. Use o segundo valor como `ADMIN_PASSWORD`.

Substitua também `APP_DOMAIN`, `ACME_EMAIL`, `ADMIN_NAME` e `ADMIN_EMAIL`. O arquivo `.env.production` contém segredos e não deve ser versionado.

## 3. Primeira instalação

Construa as imagens, aplique as migrations e inicialize os dados institucionais:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml run --rm migrate
docker compose --env-file .env.production -f docker-compose.production.yml run --rm migrate npm run db:seed:production
docker compose --env-file .env.production -f docker-compose.production.yml up -d
```

O seed de produção é idempotente, mas atualiza a senha do administrador sempre que for executado. Ele não cria solicitações fictícias. Acesse `https://DOMINIO/login` com `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

Confira o estado dos serviços:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml ps
docker compose --env-file .env.production -f docker-compose.production.yml logs --tail=100 app sla-worker caddy
```

O endpoint `/api/health` retorna `200` somente quando a aplicação consegue consultar o PostgreSQL.

Administradores também podem abrir `/sistema` para consultar o estado da aplicação, a latência do banco, a última migration, o volume de anexos, a última execução dos alertas automáticos de SLA e o último par completo de backup detectado.

O serviço `sla-worker` cria alertas internos de prazo em segundo plano. O intervalo padrão é de 60 segundos e pode ser ajustado com `SLA_WORKER_INTERVAL_MS` (mínimo de 30 segundos). As preferências de notificação de cada usuário são respeitadas e a deduplicação impede a repetição do mesmo alerta.

## 4. Atualizações

Depois de atualizar os arquivos do projeto:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml build
docker compose --env-file .env.production -f docker-compose.production.yml run --rm migrate
docker compose --env-file .env.production -f docker-compose.production.yml up -d --remove-orphans
```

Não execute o seed de produção durante atualizações comuns, pois ele redefine a senha do administrador para o valor atual de `ADMIN_PASSWORD`.

## 5. Backup

O script abaixo salva um dump consistente do PostgreSQL e um arquivo compactado dos uploads em `backups/`:

```bash
chmod +x scripts/backup-production.sh
./scripts/backup-production.sh
```

Copie os arquivos resultantes para outro servidor ou armazenamento de objetos. Um backup mantido apenas na mesma VPS não protege contra perda do disco. Teste periodicamente a restauração em um ambiente separado.

Para automatizar, configure o cron da VPS, por exemplo às 02:30, e adicione uma rotina de envio dos arquivos para armazenamento externo:

```cron
30 2 * * * /caminho/cidadefacil/scripts/backup-production.sh >> /var/log/cidadefacil-backup.log 2>&1
```

## 6. Persistência e operação

Os dados sobrevivem à recriação dos contêineres nos volumes nomeados:

- `cidadefacil_postgres_data`: banco PostgreSQL;
- `cidadefacil_uploads`: anexos das solicitações;
- `cidadefacil_caddy_data`: certificados TLS;
- `cidadefacil_caddy_config`: estado do Caddy.

Não use `docker compose down -v` em produção: a opção `-v` remove os volumes persistentes.

Nesta arquitetura, anexos ainda ficam no disco da VPS. Antes de operar com múltiplas instâncias ou exigir alta disponibilidade, migre os anexos para armazenamento compatível com S3 e utilize PostgreSQL gerenciado ou replicado.
