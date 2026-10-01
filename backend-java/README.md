# HUB8 Java backend — migração em paralelo

Este diretório é uma implementação paralela Spring Boot 3 / Java 17. O backend Express
permanece intacto e é a referência de comportamento; esta API **não foi aprovada como
substituta**. Nenhum script SQL, migration ou seed é executado pelo aplicativo.

## Construir e testar

Na pasta `backend-java`:

```powershell
.\mvnw.cmd test
.\mvnw.cmd package
```

O Maven Wrapper 3.3.2 e o Maven 3.9.9 são obtidos dos repositórios oficiais Apache/Maven
Central. Não é necessário instalar Maven separadamente.

## Configuração

O backend Java usa SQL Server. Configure no ambiente:
`APP_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRES_IN` e `ALLOWED_APP_ORIGINS`.
Para habilitar tokens delegados Microsoft Entra ID, configure também `ENTRA_ISSUER`
(`https://login.microsoftonline.com/<TENANT_ID>/v2.0`) e `ENTRA_AUDIENCE`
(`api://<API_CLIENT_ID>`). Os valores são opcionais em desenvolvimento e precisam ser
configurados juntos. O backend valida assinatura, issuer e audience do token e associa
`preferred_username`/`upn` a uma conta ativa previamente cadastrada em `USERS.USERNAME`;
as roles e permissões continuam sendo carregadas do banco. Nenhuma tabela de identidade
é criada, e o JWT atual do HUB continua aceito durante a transição.
O armazenamento opcional de arquivos requer `SHAREPOINT_TENANT_ID`,
`SHAREPOINT_CLIENT_ID`, `SHAREPOINT_CLIENT_SECRET` e `SHAREPOINT_DRIVE_ID`.
`SHAREPOINT_HTML_FOLDER` e `SHAREPOINT_BACKUP_FOLDER` definem caminhos relativos no drive
(padrões `HUB8/html` e `HUB8/backups`); a TI deve criar as pastas e conceder à aplicação
Graph acesso explícito mínimo ao site. Sem configuração, as rotas retornam
`503 STORAGE_NOT_CONFIGURED`. As credenciais não são persistidas no banco.
`DATABASE_PROVIDER` deve ser `sqlserver`; o backend Java não oferece suporte DB2.
O backend Node antigo ainda contém o adapter DB2 enquanto serve de referência, mas não faz
parte do alvo Power Apps. O driver JDBC SQL Server está incluído. Em produção, origens CORS
HTTPS, credenciais seguras e certificado de servidor são obrigatórios
(`SERVER_SSL_KEY_STORE`, `SERVER_SSL_KEY_STORE_PASSWORD`; opcionalmente
`SERVER_SSL_KEY_STORE_TYPE` e `SERVER_SSL_KEY_ALIAS`). O keystore deve ser provisionado
fora do repositório. SQL Server usa TLS e só permite certificado autoassinado fora de
produção.

Inicie pelo Maven com `.\mvnw.cmd spring-boot:run` ou use
`java -jar target/backend-java.jar`.

O bootstrap opcional do administrador usa `ADMIN_USERNAME`, `ADMIN_DISPLAY_NAME` e
`ADMIN_INITIAL_PASSWORD`, sem criar roles/seeds:

```powershell
java -jar target/backend-java.jar --spring.main.web-application-type=none --hub.bootstrap-admin=true
```

usuário/role `ADMIN` deve existir previamente. O bootstrap não executa migrations.

## Escopo implementado

Spring MVC + JDBC direto, SQL parametrizado e sintaxe de paginação/identidade para SQL Server;
sem ORM ou geração de schema. Inclui `/health`, `/ready` e rotas
`/api/v1` de auth, apps, users, audit, operators, operations, shifts e dashboard. Mantém
envelopes, defaults, paginação de até 100, erros, soft delete, trilha de auditoria,
permissões dos endpoints, bcrypt custo 12 e JWT HS256 Bearer com resolução de usuário,
roles e permissões atuais no banco em cada requisição protegida. Logout registra auditoria,
sem revogação antecipada do token.

Rotas aditivas `/api/v1/files/html` e `/api/v1/files/legacy-backups` fazem upload/listagem
no SharePoint; as rotas com `{id}` fazem download e validação do backup, respectivamente.
O limite é 3 MiB para HTML, 8 MiB para backup e 10 MiB para o corpo de arquivos.
Downloads são limitados a 10 MiB e o link temporário precisa apontar para um host SharePoint
HTTPS aprovado. A API não executa nem serve HTML na origem autenticada. A lista do Graph
retorna até 100 itens por pasta. O backup recuperado é devolvido ao cliente para validação
e aplicação; não é aplicado automaticamente ao sistema.

Foram incluídos testes MockMvc de contrato e testes unitários de JWT/configuração. O projeto
preserva as matrizes de autorização e não amplia acesso. Este código ainda requer comparação
de paridade contra o backend Node e validação operacional em SQL Server real/homologação.
Essas etapas estão pendentes; readiness real, compatibilidade de SQL/dados, auditoria
transacional e aceitação da fábrica **não são declarados como validados**.
