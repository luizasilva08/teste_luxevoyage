-- Adiciona a avaliação que o CLIENTE deixa sobre a própria viagem
-- (nota de 1 a 5 + comentário), usada na área "Minha conta" do site.
--
-- Não confundir com Avaliacoes_Parceiros (BLOCO 2): aquela é a equipe
-- interna avaliando um fornecedor/parceiro; esta é o cliente avaliando a
-- experiência da viagem dele.
--
-- Um cliente só avalia UMA vez cada viagem (UNIQUE), mas pode editar
-- (id_avaliacao muda? não — a rota da API faz um "criar OU atualizar" em
-- cima dessa mesma linha, olhando o UNIQUE (id_viagem, id_cliente)).

CREATE TABLE Avaliacao_Viagem (
    id_avaliacao_viagem INT AUTO_INCREMENT PRIMARY KEY,
    id_viagem INT NOT NULL,
    id_cliente INT NOT NULL,
    nota INT NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario TEXT,
    data_avaliacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (id_viagem, id_cliente),
    FOREIGN KEY (id_viagem) REFERENCES Viagem(id_viagem),
    FOREIGN KEY (id_cliente) REFERENCES Cliente(id_cliente)
);

-- Como rodar:
--   Mesmo processo do 01_alter_usuario_interno.sql — abra no cliente
--   MySQL que você já usa pro Aiven e execute uma única vez.
