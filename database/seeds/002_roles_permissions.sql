-- Compatível com DB2 e SQL Server (SQL padrão ANSI)
INSERT INTO ROLES (CODE, NAME) VALUES
 ('ADMIN','Administrador'),
 ('SUPERVISOR','Supervisor'),
 ('LIDER','Líder'),
 ('OPERADOR','Operador'),
 ('MONITOR','Monitor'),
 ('VISUALIZADOR','Visualizador');

INSERT INTO PERMISSIONS (CODE, DESCRIPTION) VALUES
 ('apps.view','Visualizar aplicativos'),
 ('apps.create','Criar aplicativos'),
 ('apps.edit','Editar aplicativos'),
 ('apps.delete','Excluir aplicativos'),
 ('operators.view','Visualizar operadores'),
 ('operators.create','Criar operadores'),
 ('operators.edit','Editar operadores'),
 ('operations.view','Visualizar operações'),
 ('operations.create','Criar operações'),
 ('reports.view','Visualizar relatórios'),
 ('reports.export','Exportar relatórios'),
 ('users.manage','Gerenciar usuários'),
 ('system.manage','Gerenciar configurações do sistema'),
 ('audit.view','Visualizar auditoria');

-- ADMIN recebe todas as permissões
INSERT INTO ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID)
SELECT R.ID, P.ID FROM ROLES R, PERMISSIONS P WHERE R.CODE = 'ADMIN';

-- OPERADOR: só visualização básica
INSERT INTO ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID)
SELECT R.ID, P.ID FROM ROLES R, PERMISSIONS P
WHERE R.CODE = 'OPERADOR' AND P.CODE IN ('apps.view','operators.view','operations.view');
