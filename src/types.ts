export interface Produto {
  id: string;
  sku: string;
  nome: string;
  descricao: string;
  categoria: string;
  preco_custo: number; // CMP (Custo Médio Ponderado)
  preco_venda: number;
  estoque_minimo: number;
  estoque_atual: number;
  localizacao_estoque: string; // Ex: Prateleira A-4, Corredor 2
  created_at?: string;
}

export type TipoMovimentacao = 'Entrada' | 'Saída' | 'Ajuste de Inventário';

export interface Movimentacao {
  id: string;
  produto_id: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  data_movimentacao: string;
  usuario_id: string;
  motivo: 'Venda' | 'Quebra' | 'Compra NF' | 'Balanço' | 'Ajuste Manual' | string;
  observacao?: string;
  // Join fields for visual purposes
  produto_nome?: string;
  produto_sku?: string;
}

export interface Fornecedor {
  id: string;
  cnpj: string;
  nome_fantasia: string;
  razao_social: string;
  email: string;
  telefone: string;
  created_at?: string;
}

export interface NotaFiscal {
  id: string;
  chave_nfe: string;
  numero_nf: string;
  serie: string;
  data_emissao: string;
  fornecedor_id: string;
  valor_total: number;
  xml_armazenado: string;
  created_at?: string;
  // Join fields
  fornecedor_nome?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConfigured: boolean;
}
