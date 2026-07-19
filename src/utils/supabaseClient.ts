import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database as LocalDb } from './database';

let supabaseInstance: SupabaseClient | null = null;

export function getSupabaseKeys() {
  const processEnvUrl = (typeof process !== 'undefined' ? process.env?.SUPABASE_URL : '') || '';
  const processEnvKey = (typeof process !== 'undefined' ? process.env?.SUPABASE_ANON_KEY : '') || '';

  const url = processEnvUrl || (import.meta as any).env?.VITE_SUPABASE_URL || '';
  const key = processEnvKey || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';

  return { url: url.trim(), key: key.trim() };
}

export function isSupabaseConfigured(): boolean {
  const { url, key } = getSupabaseKeys();
  return url.length > 0 && key.length > 0;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    supabaseInstance = null;
    return null;
  }

  if (supabaseInstance) {
    return supabaseInstance;
  }

  const { url, key } = getSupabaseKeys();
  try {
    supabaseInstance = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      }
    });
    LocalDb.addLog('SUCCESS', 'Cliente Supabase inicializado com sucesso!', `Conectado a ${url}`);
    return supabaseInstance;
  } catch (err: any) {
    LocalDb.addLog('ERROR', 'Erro ao inicializar o cliente Supabase', err?.message || String(err));
    supabaseInstance = null;
    return null;
  }
}

/**
 * Helper to sync local changes to Supabase if configured, 
 * or listen to real-time table changes.
 */
export const SupabaseSync = {
  async syncProduto(produto: any) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('produtos')
        .upsert({
          id: produto.id.startsWith('p_') ? undefined : produto.id, // let Supabase generate UUID or match
          sku: produto.sku,
          nome: produto.nome,
          descricao: produto.descricao,
          categoria: produto.categoria,
          preco_custo: produto.preco_custo,
          preco_venda: produto.preco_venda,
          estoque_minimo: produto.estoque_minimo,
          estoque_atual: produto.estoque_atual,
          localizacao_estoque: produto.localizacao_estoque
        })
        .select()
        .single();

      if (error) throw error;
      LocalDb.addLog('SUCCESS', `Sincronizado produto "${produto.nome}" com o Supabase.`);
      return data;
    } catch (err: any) {
      LocalDb.addLog('ERROR', 'Erro ao sincronizar produto com Supabase', err?.message || String(err));
      return null;
    }
  },

  async syncMovimentacao(mov: any) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('movimentacoes')
        .insert({
          produto_id: mov.produto_id,
          tipo: mov.tipo,
          quantidade: mov.quantidade,
          usuario_id: mov.usuario_id,
          motivo: mov.motivo,
          observacao: mov.observacao
        })
        .select()
        .single();

      if (error) throw error;
      LocalDb.addLog('SUCCESS', `Sincronizada movimentação com o Supabase.`);
      return data;
    } catch (err: any) {
      LocalDb.addLog('ERROR', 'Erro ao sincronizar movimentação com Supabase', err?.message || String(err));
      return null;
    }
  },

  subscribeToChanges(table: string, callback: (payload: any) => void) {
    const supabase = getSupabaseClient();
    if (!supabase) return null;

    const channel = supabase
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        (payload) => {
          LocalDb.addLog('SUCCESS', `Notificação Supabase Realtime recebida na tabela "${table}"!`, JSON.stringify(payload.new));
          callback(payload);
        }
      )
      .subscribe((status) => {
        LocalDb.addLog('SUCCESS', `Inscrito no canal Realtime Supabase para "${table}". Status: ${status}`);
      });

    return channel;
  }
};
