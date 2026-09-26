# SECURITY.md

## Autenticação
- Login por usuário/senha; senha com hash `bcrypt` (12 rounds), nunca texto puro (`backend/src/utils/password.js`).
- Sessão via JWT assinado (`JWT_SECRET`), expiração configurável (`JWT_EXPIRES_IN`, padrão 8h).
- JWT é stateless: logout registra auditoria mas não revoga o token em si. Para revogação real
  (ex.: usuário demitido no meio do turno), é necessário um blacklist com TTL (Redis é a opção
  natural) — não incluído nesta fase por não haver Redis no escopo original; avise se quiser que eu adicione.

## Autorização
- RBAC: `middleware/rbac.js` (`requirePermission`) checa permissão **sempre no backend**, nunca
  confia em nada vindo do frontend (item 13 do escopo).
- Perfis e permissões seed em `database/seeds/002_roles_permissions.sql`.

## Proteção de dados
- 100% das queries usam parâmetros (`?` → bind), nunca concatenação de string — proteção contra SQL Injection.
- `helmet` ativo (headers de segurança HTTP).
- `express-rate-limit`: 300 req/min por IP em toda a API (`/api`) — ajustar por endpoint sensível
  (ex.: `/auth/login`) se necessário.
- Respostas de erro nunca expõem stack trace, nome de tabela/coluna ou mensagem de driver — ver `errorHandler.js`.
- `.env` nunca commitado (adicionar ao `.gitignore`); apenas `.env.example` vai para o Git.

## Comunicação HUB ↔ Apps
- `postMessage` validado por: origem (`allowedOrigins`), formato do envelope (`source`, `type`,
  `requestId`), e handler explícito por `type` — mensagens fora desse formato são descartadas
  silenciosamente (ver `docs/APP_INTEGRATION.md`).

## Pendências para produção (não resolvidas nesta fase, documentadas para não fingir que estão prontas)
- Rotação de `JWT_SECRET` e gestão de segredos (Vault/KMS) em vez de `.env` puro.
- 2FA para perfis ADMIN/SUPERVISOR.
- Revogação ativa de sessão (blacklist).
- Testes de penetração / SAST antes de ir para produção.
