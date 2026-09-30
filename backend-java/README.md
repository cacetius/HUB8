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

As variáveis compartilhadas com o backend Node são lidas diretamente do ambiente:
`APP_ENV`, `PORT`, `DATABASE_PROVIDER`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD`, `JWT_SECRET`, `JWT_EXPIRES_IN` e `ALLOWED_APP_ORIGINS`.
Os padrões seguem `backend/src/config/env.js`. `DATABASE_PROVIDER` aceita `sqlserver` ou
`db2`. Para produção, origens CORS HTTPS, credenciais seguras e certificado de servidor são
obrigatórios (`SERVER_SSL_KEY_STORE`, `SERVER_SSL_KEY_STORE_PASSWORD`; opcionalmente
`SERVER_SSL_KEY_STORE_TYPE` e `SERVER_SSL_KEY_ALIAS`). O keystore deve ser provisionado
fora do repositório. O SQL Server usa TLS e só permite certificado autoassinado fora de
produção.

O JDBC SQL Server está incluído. DB2 usa o driver oficial IBM JCC, cuja licença/redistribuição
depende da IBM e do ambiente do operador; por isso **nenhum JAR DB2 é incluído**. Para ativar
DB2, obtenha e disponibilize `com.ibm.db2.jcc.DB2Driver` no classpath de execução. Sem ele,
a inicialização falha com uma mensagem explícita; não há fallback para SQL Server.

Para executar com o JCC licenciado sem adicioná-lo ao repositório:

```powershell
.\mvnw.cmd -DincludeScope=runtime dependency:copy-dependencies -DoutputDirectory=target\lib
$env:DB2_JCC_JAR = 'C:\caminho\fornecido-pela-IBM\db2jcc4.jar'
java -cp "target\classes;target\lib\*;$env:DB2_JCC_JAR" com.hub8.backend.HubApplication
```

Sem DB2, inicie pelo Maven com `.\mvnw.cmd spring-boot:run` ou use
`java -jar target/backend-java.jar`.

O bootstrap opcional do administrador usa `ADMIN_USERNAME`, `ADMIN_DISPLAY_NAME` e
`ADMIN_INITIAL_PASSWORD`, sem criar roles/seeds:

```powershell
java -jar target/backend-java.jar --spring.main.web-application-type=none --hub.bootstrap-admin=true
```

Com DB2, use o mesmo classpath explícito acima e acrescente
`--spring.main.web-application-type=none --hub.bootstrap-admin=true` ao comando Java. O
usuário/role `ADMIN` deve existir previamente. O bootstrap não executa migrations.

**Bloqueio de segurança conhecido:** a conexão JDBC DB2 ainda não exige TLS nem validação
de certificado. Não use o backend Java com DB2 em produção até configurar e validar TLS na
homologação da fábrica.

## Escopo implementado

Spring MVC + JDBC direto, SQL parametrizado e sintaxe de paginação/identidade específica
para DB2 e SQL Server; sem ORM ou geração de schema. Inclui `/health`, `/ready` e rotas
`/api/v1` de auth, apps, users, audit, operators, operations, shifts e dashboard. Mantém
envelopes, defaults, paginação de até 100, erros, soft delete, trilha de auditoria,
permissões dos endpoints, bcrypt custo 12 e JWT HS256 Bearer com resolução de usuário,
roles e permissões atuais no banco em cada requisição protegida. Logout registra auditoria,
sem revogação antecipada do token.

Foram incluídos testes MockMvc de contrato e testes unitários de JWT/configuração. O projeto
preserva as matrizes de autorização e não amplia acesso. Este código ainda requer comparação
de paridade contra o backend Node e validação operacional em banco real/homologação. Essas
etapas estão pendentes; readiness real, compatibilidade de SQL/dados, auditoria transacional,
Bootstrap DB2 e aceitação da fábrica **não são declarados como validados**.
