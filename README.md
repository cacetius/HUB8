# HUB 8.0 — Plataforma Industrial Modular

Evolução do `HUB_7_v3-2.html` (single-file, localStorage/IndexedDB) para uma arquitetura
profissional: **Frontend → API REST → Services → Repositories → Database Adapter → IBM DB2 / SQL Server**.

O HUB 7 original foi preservado em `apps/legacy/HUB_7_v3-2.html` como referência funcional —
nada foi apagado.

## Status real desta entrega (seja honesto ao ler isto)

Este é o resultado da **Fase 2–4** (Arquitetura, Modelo de Dados, Backend/API).

**O que foi de fato executado e validado nesta entrega** (não apenas escrito):
- `npm install` real das dependências (exceto `ibm_db`, ver abaixo) — ✅ instalou sem erro
- `npx tsc --noEmit` (typecheck) — ✅ encontrou e eu corrigi 1 erro real de tipos em `AuthService.ts` (assinatura do `jwt.sign`)
- `npm run build` — ✅ compilou sem erros
- `npx jest` — ✅ os 3 testes unitários de `AppService` passam
- Boot do servidor (`node dist/server.js`) contra um host de banco inexistente — ✅ falhou
  corretamente como projetado (erro de conexão real do driver `mssql`, não um erro de código),
  confirmando que o `SqlServerAdapter` tenta uma conexão de verdade e o `server.ts` trata a falha
  sem subir a API com banco quebrado.

**O que NÃO foi validado** (sendo direto sobre os limites deste ambiente):
- `ibm_db` não instala aqui: o build nativo dele baixa headers de `nodejs.org`, domínio fora da
  rede permitida neste sandbox. O código do `Db2Adapter` foi escrito e typechecka corretamente,
  mas só será testável de fato num ambiente com acesso a esse domínio (qualquer máquina normal).
- Não há Docker neste sandbox, então não consegui subir o `docker-compose.yml` (SQL Server) nem
  rodar as migrations ou uma chamada de API real ponta a ponta contra um banco vivo. Isso precisa
  ser feito no seu ambiente — passo a passo em `docs/DEPLOYMENT.md`.

| Módulo | Status |
|---|---|
| Database Adapter (DB2 + SQL Server) | ✅ Implementado, não testado contra instância real |
| Migrations (schema completo) | ✅ Implementado para DB2 e SQL Server |
| Auth (login/JWT/hash) + RBAC | ✅ Implementado |
| Apps (CRUD completo — controller/service/repository/rotas) | ✅ Implementado (vertical slice de referência) |
| Operators, Operations, Shifts, Dashboard, Audit | 🟡 Repository + rotas escritos, seguindo exatamente o mesmo padrão do módulo Apps — faltam nesta entrega apenas por volume, não por dificuldade (ver `docs/API.md` "Próximos passos") |
| Frontend novo (React ou similar) | ⛔ Não iniciado — ver Fase 7 |
| `HUB.js` client (para os apps internos: VCP, LIP, 5S, etc.) | ✅ Implementado (`frontend/services/hub-client.js`) |
| Migração dos dados do `fhw4` (localStorage) para DB2/SQL Server | ✅ Script de migração implementado (`database/seeds/migrate-legacy.ts`) |
| Testes | 🟡 Exemplos unitários com mocks incluídos; testes de integração/E2E dependem de banco real |
| Docker Compose | ✅ SQL Server (imagem pública oficial) para dev; DB2 documentado separadamente (imagem `ibmcom/db2` exige aceite de licença — ver `docs/DEPLOYMENT.md`) |

## Stack escolhida (e por quê)

**Node.js 20 + TypeScript + Express**, drivers oficiais/mantidos:
- `ibm_db` para DB2 (binding oficial do IBM Data Server Driver)
- `mssql` (tedious) para SQL Server

Motivo: ambos os drivers são maduros em Node, o padrão Adapter fica limpo em TS com interfaces,
e o ecossistema (jest, express, zod) cobre validação/testes sem reinventar nada. .NET seria a
alternativa mais "nativa" para DB2/SQL Server em ambiente corporativo Windows — se sua equipe já é
.NET, me avise que eu porto a mesma arquitetura.

## Estrutura

```
HUB8/
├── backend/            # API REST (Node/TS)
├── database/
│   ├── migrations/db2/
│   └── migrations/sqlserver/
├── frontend/services/  # hub-client.js — API que os apps internos consomem
├── apps/legacy/         # HUB_7_v3-2.html original, preservado
├── tests/unit/
├── docs/                 # ARCHITECTURE, DATABASE, API, SECURITY, MIGRATION, APP_INTEGRATION, DEPLOYMENT, BACKUP
├── docker-compose.yml
└── .env.example
```

## Próximas fases (na ordem do plano original)

6. Completar repositórios de Operators/Operations/Shifts/Audit no mesmo padrão de Apps.
7. Reescrever o frontend do HUB (React recomendado) consumindo a API — o visual atual deve ser preservado.
8. Adaptar os 8 apps internos para usar `HUB.js` em vez de acessar `localStorage` diretamente.
9. Rodar migrations reais contra DB2 e SQL Server de teste, validar, então liberar produção.
10. Testes de integração/E2E contra banco real.
