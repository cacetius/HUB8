# ARCHITECTURE.md

## Camadas

```
Frontend (React, futuro) ─┐
Apps internos (HUB.js) ───┤
                           ▼
                     API REST /api/v1
                           │
                    ┌──────┴──────┐
                    │  Middleware  │  auth (JWT) → rbac (permissions) → validation (zod)
                    └──────┬──────┘
                           ▼
                      Controllers        (parse request, chama Service, formata resposta)
                           ▼
                       Services           (regra de negócio, orquestra repositories, grava audit log)
                           ▼
                     Repositories         (uma classe por entidade; SQL nunca aparece fora daqui)
                           ▼
                   DatabaseAdapter        (interface comum: query, execute, transaction)
                    ┌──────┴──────┐
                Db2Adapter    SqlServerAdapter
                    │                │
                  IBM DB2       SQL Server
```

Regra de ouro: **nenhuma camada acima de Repository conhece SQL**. Se um dia trocarmos DB2 por
outra coisa (não deveria acontecer, mas a regra existe para isso), só os Adapters mudam.

## Por que Adapter e não ORM genérico

DB2 e SQL Server divergem em paginação (`FETCH FIRST n ROWS ONLY` vs `OFFSET/FETCH`), tipos
(`DECFLOAT`/`GENERATED ALWAYS AS IDENTITY` vs `IDENTITY`/`UNIQUEIDENTIFIER`), e sintaxe de upsert
(`MERGE` em ambos, mas com nuances). Em vez de um ORM tentando esconder essas diferenças (e vazando
comportamento estranho quando falha), cada Adapter implementa a mesma interface `IDatabaseAdapter`
com SQL nativo e testado para o banco em questão. O `DATABASE_PROVIDER` no `.env` decide qual
Adapter é instanciado — o resto da aplicação nunca sabe qual banco está por trás.

## Comunicação HUB ↔ Apps internos

O HUB 7 abria os apps em `<iframe>` sem canal de mensagens real (0 usos de `postMessage`
encontrados na auditoria). O HUB 8 introduz `HUB.js`, injetado no app via `postMessage` com:

- validação de `event.origin` contra uma allowlist configurada no HUB;
- envelope de mensagem com `{ type, version, payload }` — mensagens sem esse formato são descartadas;
- API do lado do app: `HUB.getOperators()`, `HUB.getOperations()`, `HUB.getCurrentShift()`,
  `HUB.getCurrentUser()`, `HUB.getConfig()`, `HUB.notify()` — todas resolvem via `postMessage` +
  `Promise`, nunca acessam `localStorage` do HUB diretamente.

Ver `docs/APP_INTEGRATION.md` para o protocolo completo.

## Resposta padronizada da API

```json
// sucesso
{ "success": true, "data": { }, "message": null }

// erro
{ "success": false, "data": null, "message": "Mensagem segura", "code": "VALIDATION_ERROR" }
```

Erros de banco/driver nunca são repassados ao cliente — são logados no servidor e traduzidos para
um `code` genérico (ver `middleware/errorHandler.ts`).
