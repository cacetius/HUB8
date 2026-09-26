# DATABASE.md

## Tabelas incluídas nesta fase

USERS, ROLES, PERMISSIONS, USER_ROLES, ROLE_PERMISSIONS, OPERATORS, OPERATIONS, APPS,
APP_OPERATORS, APP_OPERATIONS, SHIFTS, AUDIT_LOG, SYSTEM_SETTINGS, BACKUP_METADATA.

Scripts: `database/migrations/db2/001_initial_schema.sql` e `database/migrations/sqlserver/001_initial_schema.sql`
— funcionalmente equivalentes, cada um com a sintaxe nativa do seu banco.

## Tabelas NÃO incluídas nesta fase (e por quê)

O escopo original menciona `PRODUCTION, LOSSES, OCCURRENCES, MAINTENANCE, DOWNTIME`. A auditoria
do HUB 7 (`AUDIT.md`, seção A) não encontrou nenhuma funcionalidade correspondente no código atual
— são conceitos dos apps satélite (Monitor KPI, VCP, etc.), não do HUB em si. Modelá-las sem saber
o formato real desses apps seria inventar estrutura, o que o item 40 do escopo proíbe
explicitamente ("não invente integração"). Quando você tiver acesso ao código-fonte de um desses
apps, eu modelo a tabela real em vez de supor.

## Diferenças DB2 ↔ SQL Server nesta versão

| Conceito | DB2 | SQL Server |
|---|---|---|
| Auto incremento | `GENERATED ALWAYS AS IDENTITY` | `IDENTITY(1,1)` |
| Booleano | `SMALLINT` + `CHECK IN (0,1)` (DB2 não tem BOOLEAN nativo em todas as versões) | `BIT` |
| Texto | `VARCHAR` | `NVARCHAR` (suporte a Unicode) |
| Timestamp | `TIMESTAMP` / `CURRENT TIMESTAMP` | `DATETIME2` / `SYSUTCDATETIME()` |
| Texto longo | `CLOB` | `NVARCHAR(MAX)` |
| Paginação | `OFFSET n ROWS FETCH FIRST m ROWS ONLY` | `OFFSET n ROWS FETCH NEXT m ROWS ONLY` |

Todas essas diferenças ficam isoladas nos Adapters (`backend/src/adapters/db2` e
`.../sqlserver`) e nas migrations — nenhuma outra camada do sistema precisa saber disso.

## Convenções

- Toda tabela de entidade de negócio tem `ACTIVE` (soft delete) e, quando aplicável,
  `CREATED_AT/UPDATED_AT/CREATED_BY/UPDATED_BY`.
- Nenhuma tabela usa `DELETE FROM` para remover registro de negócio — sempre `UPDATE ... SET ACTIVE = 0`.
- Todo texto vindo do usuário é gravado via parâmetro (`?`), nunca concatenado — proteção contra SQL Injection.
