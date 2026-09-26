# BACKUP.md

## Modelo (`BACKUP_METADATA`)

Cada backup registrado possui `VERSION`, `SCHEMA_VERSION`, `APPLICATION_VERSION`, `CREATED_AT`,
`CREATED_BY`, `FILE_REF` (item 25 do escopo).

## Abordagem recomendada

Diferente do HUB 7 (que fazia backup do `localStorage`/IndexedDB para um arquivo local), o HUB 8
tem a fonte de verdade no banco — então "backup" passa a ser responsabilidade de banco de dados
propriamente dito:

- **DB2**: `db2 BACKUP DATABASE HUB8 TO /caminho/backups`
- **SQL Server**: `BACKUP DATABASE hub8 TO DISK = 'caminho\backups\hub8.bak'`

A tabela `BACKUP_METADATA` serve para a **API** registrar metadados de cada rodada de backup
(quem disparou, quando, versão do schema) — não para armazenar o backup em si, que deve ficar em
storage apropriado (não em tabela de aplicação).

## Endpoint sugerido (não implementado nesta fase)

`POST /api/v1/backup/trigger` (permissão `system.manage`) — dispara o backup nativo do banco via
um script/job do lado do servidor (não pela aplicação Node diretamente, que não deve ter
credenciais de nível DBA) e grava o registro em `BACKUP_METADATA`. Ficou fora desta entrega porque
depende de como sua infra de banco already faz backup (job agendado, Ola Hallengren scripts para
SQL Server, etc.) — não quis inventar um mecanismo sem saber o padrão da sua equipe de DBA.
