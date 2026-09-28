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
 ('operators.delete','Desativar operadores'),
 ('operations.view','Visualizar operações'),
 ('operations.create','Criar operações'),
 ('operations.edit','Editar operações'),
 ('operations.delete','Desativar operações'),
 ('reports.view','Visualizar relatórios'),
 ('reports.export','Exportar relatórios'),
 ('shifts.manage','Gerenciar turnos'),
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

-- Supervisão administra cadastros de produção, sem gerir usuários ou o sistema.
INSERT INTO ROLE_PERMISSIONS (ROLE_ID, PERMISSION_ID)
SELECT R.ID, P.ID FROM ROLES R, PERMISSIONS P
WHERE R.CODE IN ('SUPERVISOR','LIDER','MONITOR')
  AND P.CODE IN (
    'apps.view','apps.create','apps.edit','apps.delete',
    'operators.view','operators.create','operators.edit','operators.delete',
    'operations.view','operations.create','operations.edit','operations.delete',
    'reports.view','shifts.manage'
  );
