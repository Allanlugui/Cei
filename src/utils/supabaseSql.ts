export const SUPABASE_SQL_SCRIPT = `-- =====================================================================
-- CONTROLE DE ESTOQUE INTERATIVO (CEI) - SCHEMA DE BANCO DE DADOS
-- Cole este script no SQL Editor do seu projeto Supabase para configurar
-- todas as tabelas, triggers de segurança, travas de estoque e alertas.
-- =====================================================================

-- 1. EXTENSÕES ÚTEIS (UUID)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE FORNECEDORES
CREATE TABLE IF NOT EXISTS fornecedores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    nome_fantasia VARCHAR(255) NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    telefone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexar o CNPJ para buscas ultra rápidas (muito comum em NF-e parsers)
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON fornecedores(cnpj);

-- 3. TABELA DE PRODUTOS
CREATE TABLE IF NOT EXISTS produtos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    categoria VARCHAR(100) NOT NULL,
    preco_custo NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- CMP (Custo Médio Ponderado)
    preco_venda NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    estoque_minimo INTEGER NOT NULL DEFAULT 0,
    estoque_atual INTEGER NOT NULL DEFAULT 0,
    localizacao_estoque VARCHAR(150), -- Ex: Corredor B, Prateleira 4
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_produtos_sku ON produtos(sku);

-- 4. TABELA DE NOTAS FISCAIS (NF-e)
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chave_nfe VARCHAR(44) UNIQUE NOT NULL,
    numero_nf VARCHAR(20) NOT NULL,
    serie VARCHAR(10) NOT NULL,
    data_emissao TIMESTAMP WITH TIME ZONE NOT NULL,
    fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE RESTRICT,
    valor_total NUMERIC(12, 2) NOT NULL,
    xml_armazenado TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nfe_chave ON notas_fiscais(chave_nfe);

-- 5. TABELA DE MOVIMENTAÇÕES DE ESTOQUE
CREATE TABLE IF NOT EXISTS movimentacoes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produto_id UUID REFERENCES produtos(id) ON DELETE CASCADE NOT NULL,
    tipo VARCHAR(30) NOT NULL, -- 'Entrada', 'Saída', 'Ajuste de Inventário'
    quantidade INTEGER NOT NULL,
    data_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    usuario_id VARCHAR(100), -- Identificação do operador
    motivo VARCHAR(100) NOT NULL, -- 'Venda', 'Quebra', 'Compra NF', 'Balanço', 'Ajuste Manual'
    observacao TEXT
);

CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto ON movimentacoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes(data_movimentacao);


-- =====================================================================
-- TRIGGERS E CONTROLES DE FLUXO (ESTOQUE NÃO-NEGATIVO & ATUALIZAÇÕES)
-- =====================================================================

-- TRIGGER A: Garantir que o estoque_atual na tabela de produtos nunca seja negativo
CREATE OR REPLACE FUNCTION fn_garantir_estoque_nao_negativo()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.estoque_atual < 0 THEN
        RAISE EXCEPTION 'OPERAÇÃO BLOQUEADA: Saldo de estoque insuficiente para o produto "%" (SKU: %). Estoque atual: %, Saída desejada deixaria saldo em %.', 
            NEW.nome, NEW.sku, OLD.estoque_atual, NEW.estoque_atual;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_garantir_estoque_nao_negativo
BEFORE UPDATE OF estoque_atual ON produtos
FOR EACH ROW
EXECUTE FUNCTION fn_garantir_estoque_nao_negativo();


-- TRIGGER B: Atualizar automaticamente o estoque do produto ao inserir uma movimentação
CREATE OR REPLACE FUNCTION fn_atualizar_saldo_por_movimentacao()
RETURNS TRIGGER AS $$
DECLARE
    v_fator INT;
BEGIN
    IF NEW.tipo = 'Entrada' THEN
        v_fator := 1;
    ELSIF NEW.tipo = 'Saída' THEN
        v_fator := -1;
    ELSIF NEW.tipo = 'Ajuste de Inventário' THEN
        v_fator := 1; -- Admite quantidade negativa ou positiva para o ajuste
    ELSE
        RAISE EXCEPTION 'Tipo de movimentação inválido: %. Escolha Entrada, Saída ou Ajuste de Inventário.', NEW.tipo;
    END IF;

    UPDATE produtos
    SET estoque_atual = estoque_atual + (NEW.quantidade * v_fator)
    WHERE id = NEW.produto_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_atualizar_saldo_por_movimentacao
AFTER INSERT ON movimentacoes
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_saldo_por_movimentacao();


-- =====================================================================
-- SEGURANÇA E POLÍTICAS RLS (Row Level Security) - SUPABASE
-- =====================================================================

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_fiscais ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público para testes fáceis (recomenda-se refinar em produção)
CREATE POLICY "Permitir leitura para todos" ON produtos FOR SELECT USING (true);
CREATE POLICY "Permitir inserção livre" ON produtos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização livre" ON produtos FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão livre" ON produtos FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de fornecedores" ON fornecedores FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de fornecedores" ON fornecedores FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir atualização de fornecedores" ON fornecedores FOR UPDATE USING (true);
CREATE POLICY "Permitir exclusão de fornecedores" ON fornecedores FOR DELETE USING (true);

CREATE POLICY "Permitir leitura de notas" ON notas_fiscais FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de notas" ON notas_fiscais FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir leitura de movimentacoes" ON movimentacoes FOR SELECT USING (true);
CREATE POLICY "Permitir inserção de movimentacoes" ON movimentacoes FOR INSERT WITH CHECK (true);

-- =====================================================================
-- FEED DE ALERTAS DE ESTOQUE MÍNIMO (EXEMPLO DE VIEW PARA REALTIME)
-- =====================================================================
CREATE OR REPLACE VIEW view_alertas_estoque AS
SELECT 
    id AS produto_id,
    sku,
    nome,
    categoria,
    estoque_minimo,
    estoque_atual,
    localizacao_estoque,
    (estoque_minimo - estoque_atual) AS deficit
FROM produtos
WHERE estoque_atual <= estoque_minimo;
`;
