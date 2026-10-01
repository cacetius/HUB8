# HUB8 no Power Apps

## Arquitetura escolhida

- A interface será reconstruída como Canvas App.
- SQL Server, schema, dados e endpoints `/api/v1` permanecem no HUB.
- O app chama a API por um conector personalizado OAuth 2.0 com Microsoft Entra ID.
- O backend associa `preferred_username` (ou `upn`) a `USERS.USERNAME` e carrega roles e permissões atuais do banco. A conta precisa estar ativa e provisionada antes do primeiro acesso.
- O JWT próprio do HUB continua aceito durante a transição; o cliente web existente não é alterado.
- SharePoint/OneDrive corporativo foi escolhido como armazenamento central para os arquivos e backups; a biblioteca e o site ainda precisam ser provisionados pela TI.
- Apps HTML enviados serão abertos fora do Canvas, em uma origem HTTPS aprovada, porque o Canvas não executa HTML arbitrário e SharePoint não é um host confiável de execução para esses módulos.

O contrato inicial do conector está em [hub-api.swagger.yaml](./hub-api.swagger.yaml). Ele contém as operações de Apps, Operators, Operations, Shifts, Dashboard, Audit e Users. O login próprio (`POST /auth/login`) não faz parte do conector OAuth: a autenticação do Canvas App deve ocorrer pelo Microsoft Entra ID. As respostas mantêm o envelope `{ success, data, message }` e os erros existentes.

## Valores do aplicativo registrado no Entra

A equipe Microsoft 365/Entra da empresa deve criar:

1. Um registro de aplicativo para a API e expor o escopo delegado `user_impersonation` (ou aprovar outro nome antes da configuração).
2. Um registro de cliente para o conector Power Apps, com a URL de callback exibida pelo assistente de conector como URI de redirecionamento.
3. Consentimento administrativo para o escopo delegado e política de acesso condicional apropriada.
4. Incluir `preferred_username` (ou `upn`) como optional claim no access token da API e garantir que seja o UPN corporativo que consta em `USERS.USERNAME`.

Configurar no serviço Java:

- `ENTRA_ISSUER=https://login.microsoftonline.com/<TENANT_ID>/v2.0`
- `ENTRA_AUDIENCE=api://<API_CLIENT_ID>` (precisa corresponder exatamente ao claim `aud` emitido)
- `ALLOWED_APP_ORIGINS` e HTTPS conforme a hospedagem aprovada
- `SHAREPOINT_TENANT_ID`, `SHAREPOINT_CLIENT_ID`, `SHAREPOINT_CLIENT_SECRET` e
  `SHAREPOINT_DRIVE_ID` para habilitar armazenamento de arquivos pelo Microsoft Graph.
- Opcionalmente, `SHAREPOINT_HTML_FOLDER` e `SHAREPOINT_BACKUP_FOLDER` (padrões:
  `HUB8/html` e `HUB8/backups`). As duas pastas precisam existir no drive configurado.

No Swagger, substituir `api.example.com`, `{tenant-id}` e `{api-client-id}` pelos valores definidos no ambiente antes de importar. No assistente de autenticação do conector, informar client ID, segredo do cliente guardado no cofre corporativo e o mesmo scope/audience. Não salvar o segredo no repositório ou no Canvas App.

> O issuer/audience e a emissão do claim de UPN precisam ser testados com um access token real emitido para a API; um ID token do usuário não deve ser usado como bearer da API.

## Hospedagem e conectividade pendentes

A hospedagem da API e a origem HTTPS isolada para executar os módulos HTML ainda não foram escolhidas. A Power Platform não pode chamar `localhost` nem uma API privada sem conectividade aprovada:

- Para API em rede privada, avaliar On-premises Data Gateway em máquina/cluster sempre ativo, conta de serviço, regras de firewall, alta disponibilidade e licenciamento Power Apps/Power Automate para custom connectors e gateway.
- Para API publicada em Azure ou outro host acessível, exigir HTTPS, certificados confiáveis, allowlist de rede e controles de entrada; não expor SQL Server diretamente à internet.
- A API continua conectando ao SQL Server em rede interna. O conector nunca recebe credenciais do banco.
- Provisionar uma biblioteca SharePoint restrita à aplicação e escolher como a API obtém autorização Graph com privilégio mínimo (`Sites.Selected` quando aprovado). Segredos/certificados devem vir de cofre corporativo; nenhum segredo fica no app.
- A biblioteca guarda os originais e os backups; os arquivos HTML só são servidos/executados por um host HTTPS separado, isolado da origem da API, com política CSP restritiva. Não publique HTML enviado por usuário diretamente na origem autenticada do HUB.

Licenças, gateway, tenant, região do ambiente, domínio HTTPS e políticas DLP devem ser confirmados pelo administrador Power Platform da empresa antes da publicação. Nenhuma conexão real, conector importado ou `.msapp` foi criado neste repositório. O Swagger inclui as operações existentes e os endpoints aditivos de arquivos/backup; nenhum endpoint existente foi substituído.

## Preservação de aparência e comportamento

O cliente web existente permanece intacto. Para a migração do Canvas App, primeiro inventariar e reproduzir telas, controles, cores, fontes, espaçamentos, ícones, menus, breakpoints e interações; em seguida comparar lado a lado e executar testes de aceitação com usuários da fábrica. Power Apps tem limitações próprias de layout e navegador, então equivalência visual/funcional ainda precisa ser demonstrada no tenant da empresa.

O backup legado representa o estado local (`fhw4`), incluindo configurações, apps e outros dados presentes no objeto exportado. Os endpoints aditivos `POST/GET /api/v1/files/legacy-backups` e `GET /api/v1/files/legacy-backups/{id}` guardam e recuperam o JSON no SharePoint; a restauração devolve os dados ao Canvas e não os aplica automaticamente. A API valida o formato básico e registra as ações na auditoria. Os endpoints `POST/GET /api/v1/files/html` e `GET /api/v1/files/html/{id}` armazenam e recuperam módulos HTML; o limite é 3 MiB para HTML, 8 MiB para backup e 10 MiB para respostas baixadas. A lista do Graph solicita até 100 itens por pasta. Arquivos HTML continuam externos ao Canvas e sua abertura não pode ocorrer dentro do mesmo modal/iframe do HUB legado.

Para conceder acesso ao Microsoft Graph, a TI deve registrar um aplicativo com permissão de aplicação de privilégio mínimo (preferencialmente `Sites.Selected`), conceder consentimento administrativo e atribuir explicitamente acesso ao site/biblioteca necessários. Configure as variáveis no serviço via cofre de segredos; não grave o segredo do cliente em arquivos versionados. Sem as quatro variáveis obrigatórias, os endpoints de arquivos respondem `503 STORAGE_NOT_CONFIGURED`.

Não apontar o Canvas App para produção até completar:

1. Registro/configuração do Entra ID e associação de UPN com usuários previamente cadastrados.
2. Escolha da hospedagem HTTPS da API e do host isolado para execução dos apps HTML; configuração do gateway se a API for privada.
3. Provisionamento do site, drive e pastas SharePoint; consentimento/permissão Graph e teste de upload/download usando conta de aplicação.
4. Importação e teste dos endpoints aditivos de arquivos e backup, mantendo as operações atuais compatíveis.
5. Testes de contrato HTTP, RBAC e cenários por função contra a versão Java.
6. Homologação em SQL Server real, incluindo falhas, transações, backup e restore.
7. Construção do Canvas App no tenant, comparação visual e aprovação funcional da fábrica.

O caminho Power Apps usa SQL Server; o suporte DB2 existente no backend Node antigo fica fora da migração e só deve ser removido após o serviço anterior ser aposentado.
