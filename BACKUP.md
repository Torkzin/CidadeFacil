# Backup e restauração

O backup do CidadeFácil possui duas partes inseparáveis: o dump do PostgreSQL e o arquivo dos anexos. Mantenha cópias criptografadas fora da VPS e aplique a política de retenção definida pela prefeitura.

## Criar backup

Na raiz do projeto em produção:

```bash
chmod +x scripts/backup-production.sh
./scripts/backup-production.sh
```

O script cria em `backups/`:

- `database-<data>.dump`: dump PostgreSQL em formato custom;
- `uploads-<data>.tar.gz`: arquivos anexados às solicitações.

Verifique se ambos existem e possuem tamanho maior que zero. Copie-os para um destino externo à VPS.

## Testar o restore sem afetar produção

O teste cria um banco temporário, restaura o dump, consulta tabelas essenciais e remove o banco automaticamente:

```bash
chmod +x scripts/test-restore.sh
./scripts/test-restore.sh backups/database-AAAAMMDDTHHMMSSZ.dump
tar -tzf backups/uploads-AAAAMMDDTHHMMSSZ.tar.gz >/dev/null
```

O script nunca restaura sobre o banco configurado em `POSTGRES_DB`.

## Restauração real do banco

Faça uma nova cópia de segurança antes de qualquer restauração. Coloque o sistema em manutenção e confirme cuidadosamente o nome do banco. A restauração real substitui dados e deve ser executada somente por um administrador da infraestrutura.

Exemplo para um banco novo e vazio:

```bash
docker compose --env-file .env.production -f docker-compose.production.yml stop app
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres createdb -U cidadefacil cidadefacil_restored
docker compose --env-file .env.production -f docker-compose.production.yml exec -T postgres pg_restore --exit-on-error --no-owner --no-privileges -U cidadefacil -d cidadefacil_restored < backups/database-AAAAMMDDTHHMMSSZ.dump
```

Valide o banco restaurado antes de alterar `DATABASE_URL`. Não apague o banco anterior até o aceite funcional.

## Restauração dos anexos

Extraia primeiro em um diretório temporário e inspecione o conteúdo. Depois, com a aplicação parada, copie para o volume de uploads correspondente ao projeto Compose:

```bash
mkdir -p /tmp/cidadefacil-uploads-restore
tar -xzf backups/uploads-AAAAMMDDTHHMMSSZ.tar.gz -C /tmp/cidadefacil-uploads-restore
docker compose --env-file .env.production -f docker-compose.production.yml --profile tools run --rm -v /tmp/cidadefacil-uploads-restore:/restore:ro restore-helper sh -c 'cp -a /restore/. /data/'
```

Confira anexos de protocolos conhecidos antes de reabrir o acesso.
