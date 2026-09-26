# DEPLOYMENT.md

## Desenvolvimento local (SQL Server via Docker)

```bash
cp .env.example .env
docker compose up -d sqlserver
cd backend && npm install
# rodar as migrations (001_initial_schema.sql + seeds) contra o container,
# manualmente via sqlcmd/Azure Data Studio ou via um runner de migrations de sua escolha
npm run dev
```

## Desenvolvimento local (DB2)

DB2 não está no `docker-compose.yml` de propósito: a imagem oficial (`icr.io/db2_community/db2`)
exige aceite explícito da licença IBM e roda melhor em containers privilegiados/Linux nativo —
adicionar sem esse consentimento seria fazer suposição por você. Passos:

```bash
docker pull icr.io/db2_community/db2:11.5.9.0
docker run -itd --name hub8-db2 --privileged=true \
  -p 50000:50000 -e LICENSE=accept -e DB2INST1_PASSWORD=changeme -e DBNAME=HUB8 \
  icr.io/db2_community/db2:11.5.9.0
```

Depois, `DATABASE_PROVIDER=db2` no `.env` e ajustar `DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD`.
O driver `ibm_db` precisa das bibliotecas cliente do DB2 — em muitos ambientes ele baixa/compila
sozinho no `npm install`; se falhar, ver a documentação do pacote `ibm_db` para o cliente
`clidriver` da sua plataforma.

## Produção

Não incluído nesta fase (orquestração real — Kubernetes/IIS/systemd, TLS, secrets manager,
backups automatizados de banco) porque depende do seu ambiente corporativo real. Posso detalhar
isso quando você definir onde o HUB 8 vai rodar (nuvem própria, on-premise, etc.).

## Rodando migrations

Os arquivos em `database/migrations/db2/*.sql` e `database/migrations/sqlserver/*.sql` são SQL
puro, numerados e idempotentes por construção do schema (CREATE TABLE simples — para reexecução seria
necessário adicionar `IF NOT EXISTS`/checagem de catálogo, hoje pensados para rodar uma vez em
banco vazio). Rode com o cliente do seu banco (`db2 -tf arquivo.sql` / `sqlcmd -i arquivo.sql`) ou
integre a um runner de migrations (ex.: `node-db-migrate`, `Flyway`) na Fase 6 seguinte.
