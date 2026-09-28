# Implantação

## Limites conhecidos

O backend inclui CRUD de Apps, Operators, Operations, Shifts e administração de usuários, além de
consulta para Dashboard. Ainda não pode ser declarado pronto para a fábrica: os fluxos precisam ser
integrados à interface atual e homologados na instância DB2 escolhida. Nenhum comando abaixo foi
executado contra um banco real durante esta revisão.

## Preparação do ambiente

Use Node.js 20 e instale as dependências dentro de `backend`. Configure variáveis em um gerenciador
de segredos da infraestrutura; não publique `.env`, senhas ou tokens no repositório.

Em produção, configure:

- `APP_ENV=production`
- `DATABASE_PROVIDER=db2` ou `sqlserver`
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` com uma conta de serviço de privilégio mínimo
- `JWT_SECRET` aleatório, exclusivo e com pelo menos 32 caracteres
- `ALLOWED_APP_ORIGINS` com as origens HTTPS exatas dos clientes autorizados, separadas por vírgula
- `PORT`, se a porta padrão 3000 não for usada

A API recusa subir em produção sem os valores obrigatórios, segredo forte e allowlist HTTPS. A
conexão do SQL Server exige criptografia e não confia em certificado autoassinado em produção.
Configure certificado TLS válido e terminação HTTPS no proxy corporativo. Para DB2, confirme com
infraestrutura como TLS será terminado e restrinja a porta do banco à rede da aplicação.

O seed libera todas as permissões para ADMIN, leitura básica para OPERADOR e CRUD operacional de
Apps, Operators, Operations e Shifts para SUPERVISOR, LIDER e MONITOR. Essas três funções não
recebem `users.manage`, `system.manage` nem exportação de relatórios. VISUALIZADOR ainda não recebe
permissões. Confirme essa matriz com a fábrica antes de ativar as contas.

## Banco novo e usuário inicial

Os comandos de migração abaixo aplicam o schema inicial e os seeds. Eles se destinam somente a um
banco vazio, não fazem upgrade de schema existente e recusam executar se já encontrarem a tabela
`USERS`. Faça snapshot/backup antes de qualquer implantação e valide os scripts primeiro em
homologação:

```powershell
Set-Location backend
npm ci
$env:DATABASE_PROVIDER = "db2"
npm run migrate:db2
```

Para uma instalação SQL Server, use `DATABASE_PROVIDER=sqlserver` e `npm run migrate:sqlserver`.

O comando aplica `001_initial_schema.sql` e `002_roles_permissions.sql`, sem criar tabelas de
controle de migration nem alterar schemas além dos scripts existentes. Em caso de falha parcial,
pare e peça ao DBA para inspecionar o banco; não repita o comando sobre um schema parcial.

Em uma instalação existente, ou para reaplicar a matriz após atualizar o código, execute
`npm run seed:factory-permissions` com a mesma configuração DB2. Esse passo idempotente só insere
códigos de permissão ausentes e associa as permissões autorizadas a ADMIN/SUPERVISOR/LIDER/MONITOR;
não cria nem altera tabelas. Faça backup e revise as permissões da empresa antes de executá-lo.

Após aplicar schema e seeds, provisione a primeira conta ADMIN usando valores injetados pelo
gerenciador de segredos (não os escreva no histórico do terminal):

```powershell
$env:ADMIN_USERNAME = "<nome>"
$env:ADMIN_DISPLAY_NAME = "<nome para exibição>"
$env:ADMIN_INITIAL_PASSWORD = "<segredo de uso único, 14 a 72 bytes>"
npm run bootstrap:admin
Remove-Item Env:ADMIN_USERNAME, Env:ADMIN_DISPLAY_NAME, Env:ADMIN_INITIAL_PASSWORD
```

O script grava apenas o hash bcrypt, associa a conta ao papel ADMIN e executa as inserções em
transação. Não o execute novamente para uma conta existente. Guarde as credenciais iniciais no
cofre da empresa e faça a entrega por canal seguro; altere a senha conforme a política local.

## Inicialização e verificações

```powershell
npm start
```

- `GET /health` verifica se o processo HTTP está respondendo.
- `GET /ready` verifica também a conexão com o banco; balanceadores devem usar esta rota.
- `SIGINT` e `SIGTERM` param o servidor e fecham o pool do banco de forma graciosa.

Mantenha a API atrás de um proxy/firewall corporativo, exponha apenas HTTPS ao cliente e permita
conexões ao banco somente a partir dos hosts da aplicação. Configure monitoramento para respostas
não-200 em `/ready`, logs de processo e espaço/saúde do banco. Não exponha detalhes de conexão ou
credenciais em logs.

## Desenvolvimento local

O Compose SQL Server é somente para desenvolvimento. Copie `.env.example` para `.env` apenas em
máquina local e nunca reutilize as senhas de exemplo na fábrica. O DB2 requer licença/imagem e
cliente IBM configurados pela equipe responsável; consulte a documentação oficial do `ibm_db`.

## Backup e recuperação

Defina com o DBA a frequência, retenção, criptografia, cópia externa e teste periódico de restore
antes da entrada em produção. Consulte [BACKUP.md](./BACKUP.md). Não considere um backup válido
até que uma restauração em ambiente isolado tenha sido testada.
