# HUB 8.0 — Plataforma Industrial Modular

Evolução do `HUB_7_v3-2.html` (single-file, localStorage/IndexedDB) para uma arquitetura
profissional: **Frontend → API REST → Services → Repositories → Database Adapter → IBM DB2 / SQL Server**.

O HUB 7 original foi preservado em `apps/legacy/HUB_7_v3-2.html` como referência funcional —
nada foi apagado.

## Status real desta entrega (seja honesto ao ler isto)

Este é o resultado da **Fase 2–4** (Arquitetura, Modelo de Dados, Backend/API).

**Validação do backend JavaScript:**
- `npm run build` verifica a sintaxe de todos os arquivos JavaScript em `backend/src`.
- `npm test -- --runInBand` executa os testes unitários do backend JavaScript.
- A API é iniciada diretamente com `node src/server.js`; não há etapa de compilação para `dist`.

**Limites da validação:** os testes unitários usam mocks. A conexão e as migrations precisam ser
validadas contra instâncias reais de DB2/SQL Server; instruções em `docs/DEPLOYMENT.md`.

| Módulo | Status |
|---|---|
| Database Adapter (DB2 + SQL Server) | ✅ Implementado, não testado contra instância real |
| Migrations (schema completo) | ✅ Implementado para DB2 e SQL Server |
| Auth (login/JWT/hash) + RBAC | ✅ Implementado |
| Apps (CRUD completo — controller/service/repository/rotas) | ✅ Implementado (vertical slice de referência) |
| Operators, Operations, Shifts, Dashboard, Audit | 🟡 Repository + rotas escritos, seguindo exatamente o mesmo padrão do módulo Apps — faltam nesta entrega apenas por volume, não por dificuldade (ver `docs/API.md` "Próximos passos") |
| Frontend novo (React ou similar) | ⛔ Não iniciado — ver Fase 7 |
| `HUB.js` client (para os apps internos: VCP, LIP, 5S, etc.) | ✅ Implementado (`frontend/services/hub-client.js`) |
| Migração dos dados do `fhw4` (localStorage) para DB2/SQL Server | ✅ Script JavaScript implementado (`database/seeds/migrate-legacy.js`) |
| Testes | 🟡 Exemplos unitários com mocks incluídos; testes de integração/E2E dependem de banco real |
| Docker Compose | ✅ SQL Server (imagem pública oficial) para dev; DB2 documentado separadamente (imagem `ibmcom/db2` exige aceite de licença — ver `docs/DEPLOYMENT.md`) |

## Stack escolhida (e por quê)

**Node.js 20 + JavaScript + Express**, drivers oficiais/mantidos:
- `ibm_db` para DB2 (binding oficial do IBM Data Server Driver)
- `mssql` (tedious) para SQL Server

Motivo: ambos os drivers são maduros em Node, o padrão Adapter mantém os bancos isolados,
e o ecossistema (jest, express, zod) cobre validação/testes sem reinventar nada. .NET seria a
alternativa mais "nativa" para DB2/SQL Server em ambiente corporativo Windows — se sua equipe já é
.NET, me avise que eu porto a mesma arquitetura.

## Estrutura

```
HUB8/
├── backend/            # API REST (Node.js)
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
