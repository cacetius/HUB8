# MIGRATION.md — Plano de migração dos dados do HUB 7

## Fluxo

```
localStorage["fhw4"] (HUB 7)
    ↓ exportar (console do navegador: copy(localStorage.getItem('fhw4')))
legacy-export.json
    ↓ Leitura        (database/seeds/migrate-legacy.js)
    ↓ Validação       (campos obrigatórios: name/nome, filename)
    ↓ Conversão       (para o formato das tabelas APPS/OPERATORS/OPERATIONS)
    ↓ Gravação        (via IDatabaseAdapter — mesmo caminho que a API usa)
    ↓ Validação final (contagem de registros migrados vs ignorados)
DB2 ou SQL Server
```

## Riscos identificados

1. **IDs não são preserváveis diretamente**: o HUB 7 usa IDs gerados no cliente (`uid()`, string
   aleatória); o HUB 8 usa `IDENTITY`/autoincremento numérico no banco. O script migra por `NAME`
   (idempotente, evita duplicar), não por ID — se dois apps tiverem o mesmo nome no legado, o
   segundo será ignorado como "duplicado" e precisa de correção manual antes de migrar.
2. **Ícones/blobs no IndexedDB**: o script atual migra apenas o que está no JSON principal
   (`fhw4`). Blobs grandes no IndexedDB (uploads de ícone customizado) exigem um passo adicional
   de exportação separado — não incluído nesta fase por não termos acesso ao dump real do IndexedDB.
3. **Sem rollback automático de migração**: se a migração falhar no meio, os registros já
   inseridos permanecem (idempotência por NAME evita duplicar numa reexecução, mas não desfaz
   automaticamente). Recomendação: migrar em ambiente de teste primeiro, validar contagens, só
   depois rodar em produção.
4. **Config do setor** (`nome do setor, turno padrão, monitor, líder`) hoje não tem uma tabela
   dedicada além de `SYSTEM_SETTINGS` (chave/valor genérico) — suficiente para o que existe hoje,
   mas se crescer merece uma tabela própria.

## Checklist antes de migrar em produção

- [ ] Rodar migrations de schema (`001_initial_schema.sql`) em ambiente de teste
- [ ] Rodar seed de roles/permissions
- [ ] Criar usuário ADMIN inicial (hash de senha via `hashPassword`, nunca inserir hash manual)
- [ ] Exportar `fhw4` de cada dispositivo/instância do HUB 7 em uso
- [ ] Rodar `migrate-legacy.js` para cada export, revisando o relatório de "ignorados"
- [ ] Validar contagens finais contra o que existia no HUB 7
- [ ] Só então apontar os dispositivos para o HUB 8
