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

## Operators / Operations (leitura nesta fase — ver README "Próximas fases")
| Método | Rota | Permissão |
|---|---|---|
| GET | `/operators?page=&pageSize=` | `operators.view` |
| GET | `/operations?page=&pageSize=` | `operations.view` |

## Shifts
| Método | Rota | Descrição |
|---|---|---|
| GET | `/shifts` | Lista turnos ativos |
| GET | `/shifts/current` | Turno atual, calculado por hora do servidor vs START_TIME/END_TIME |

## Dashboard
| Método | Rota | Descrição |
|---|---|---|
| GET | `/dashboard/summary` | Totais de apps/operadores/operações |

## Paginação
Todo endpoint de lista aceita `page` (padrão 1) e `pageSize` (padrão 20, **máximo 100** — trava
propositalmente para nunca carregar milhares de registros de uma vez, item 28 do escopo).

## Códigos de erro (`code`)
`UNAUTHENTICATED` (401), `FORBIDDEN` (403), `VALIDATION_ERROR` (422), `SESSION_EXPIRED` (401),
`INTERNAL_ERROR` (500).
