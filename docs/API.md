# API.md

Base: `/api/v1`. Todas as respostas seguem o envelope padrão (ver `ARCHITECTURE.md`).
Todas as rotas exceto `/auth/login` exigem `Authorization: Bearer <token>`.

## Auth
| Método | Rota | Permissão | Descrição |
|---|---|---|---|
| POST | `/auth/login` | — | `{ username, password }` → `{ token, user }` |
| POST | `/auth/logout` | autenticado | Registra auditoria de logout |
| GET  | `/auth/me` | autenticado | Retorna usuário/roles/permissões do token |

## Apps (CRUD completo — referência de padrão)
| Método | Rota | Permissão |
|---|---|---|
| GET | `/apps?page=&pageSize=&search=` | `apps.view` |
| GET | `/apps/:id` | `apps.view` |
| POST | `/apps` | `apps.create` |
| PUT | `/apps/:id` | `apps.edit` |
| DELETE | `/apps/:id` (soft delete) | `apps.delete` |
| POST | `/apps/:id/restore` | `apps.delete` |

## Operators / Operations
| Método | Rota | Permissão |
|---|---|---|
| GET | `/operators?page=&pageSize=` | `operators.view` |
| GET | `/operators/:id` | `operators.view` |
| POST | `/operators` | `operators.create` |
| PUT | `/operators/:id` | `operators.edit` |
| DELETE | `/operators/:id` (soft delete) | `operators.delete` |
| POST | `/operators/:id/restore` | `operators.delete` |
| GET | `/operations?page=&pageSize=` | `operations.view` |
| GET | `/operations/:id` | `operations.view` |
| POST | `/operations` | `operations.create` |
| PUT | `/operations/:id` | `operations.edit` |
| DELETE | `/operations/:id` (soft delete) | `operations.delete` |
| POST | `/operations/:id/restore` | `operations.delete` |

Campos de Operators: `name` (obrigatório), `registration`, `roleLabel`, `operationId` e `status`.
Campos de Operations: `name` (obrigatório) e `description`. `DELETE` desativa sem apagar o registro.

## Shifts
| Método | Rota | Permissão |
|---|---|---|
| GET | `/shifts` | autenticado |
| GET | `/shifts/:id` | autenticado |
| GET | `/shifts/current` | autenticado; calculado pela hora do servidor vs START_TIME/END_TIME |
| POST | `/shifts` | `shifts.manage` |
| PUT | `/shifts/:id` | `shifts.manage` |
| DELETE | `/shifts/:id` (soft delete) | `shifts.manage` |
| POST | `/shifts/:id/restore` | `shifts.manage` |

Campos de Shifts: `name`, `startTime` e `endTime` (obrigatórios; formato `HH:mm` ou `HH:mm:ss`).

## Users (administração)
Todas as rotas exigem `users.manage`. O campo `password` é aceito somente em POST/PUT e nunca é
retornado nem registrado na auditoria; o banco guarda somente o hash bcrypt.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/users?page=&pageSize=&search=` | Lista contas e funções atribuídas |
| GET | `/users/roles` | Lista funções ativas disponíveis |
| GET | `/users/:id` | Consulta uma conta |
| POST | `/users` | Cria conta e associa funções |
| PUT | `/users/:id` | Atualiza perfil, senha, funções ou estado |
| DELETE | `/users/:id` (soft delete) | Desativa conta |
| POST | `/users/:id/restore` | Reativa conta |

Contas desativadas e alterações de função deixam de autorizar imediatamente: cada requisição
protegida consulta o estado e as permissões atuais no banco. O último administrador ativo não pode
ser desativado ou perder a função ADMIN.

## Permissões iniciais
O seed atribui todas as permissões a ADMIN, leitura básica a OPERADOR e CRUD operacional (Apps,
Operators, Operations e Shifts) a SUPERVISOR, LIDER e MONITOR. Essas três funções não recebem
`users.manage`, `system.manage` nem exportação de relatórios. VISUALIZADOR ainda não recebe
permissões. Em bancos existentes, aplique a atualização descrita em `docs/DEPLOYMENT.md`.

## Dashboard
| Método | Rota | Descrição |
|---|---|---|
| GET | `/dashboard/summary` | Totais de apps/operadores/operações/turnos |

## Audit (somente leitura)
Todas as rotas exigem `audit.view`. Os registros são imutáveis pela API.

| Método | Rota | Descrição |
|---|---|---|
| GET | `/audit?page=&pageSize=&userId=&action=&entity=&entityId=&from=&to=` | Lista filtrada por usuário, ação, entidade e intervalo ISO |
| GET | `/audit/entity/:entity/:entityId?page=&pageSize=` | Histórico de uma entidade |
| GET | `/audit/:id` | Consulta um registro |

## Paginação
Todo endpoint paginado aceita `page` (padrão 1) e `pageSize` (padrão 20, **máximo 100** — trava
propositalmente para nunca carregar milhares de registros de uma vez, item 28 do escopo).

## Códigos de erro (`code`)
`UNAUTHENTICATED` (401), `FORBIDDEN` (403), `VALIDATION_ERROR` (422), `SESSION_EXPIRED` (401),
`INTERNAL_ERROR` (500).
