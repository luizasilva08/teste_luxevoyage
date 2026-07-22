-- Adiciona autenticação real ao sistema (login do front-end).
--
-- A tabela Usuario_Interno (equipe interna que usa o sistema) não tinha
-- nenhum campo de senha até aqui — o login era só uma tela sem lógica.
--
-- Guardamos o HASH da senha (bcrypt), nunca a senha em texto puro.
-- A coluna é NULL por padrão: usuários existentes continuam existindo,
-- mas precisam de uma senha definida (veja SRC/criar_senha_usuario.py)
-- antes de conseguirem fazer login.

ALTER TABLE Usuario_Interno
    ADD COLUMN senha_hash VARCHAR(255) NULL AFTER email_corporativo;

-- Como rodar:
--   Abra essa conexão no mesmo cliente MySQL que você já usa pro Aiven
--   (Workbench, DBeaver, ou até um script Python com database.py) e
--   execute esse ALTER TABLE uma única vez.
