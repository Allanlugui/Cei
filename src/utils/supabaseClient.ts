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
  },

  getPendingSyncCount(): number {
    const p = LocalDb.getProdutos().filter(x => !x.sincronizado).length;
    const f = LocalDb.getFornecedores().filter(x => !x.sincronizado).length;
    const m = LocalDb.getMovimentacoes().filter(x => !x.sincronizado).length;
    const n = LocalDb.getNotasFiscais().filter(x => !x.sincronizado).length;
    return p + f + m + n;
  },

  async performBidirectionalSync(): Promise<{
    success: boolean;
    uploadedCount: number;
    downloadedCount: number;
    error?: string;
  }> {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { success: false, uploadedCount: 0, downloadedCount: 0, error: 'Supabase não configurado' };
    }

    let uploadedCount = 0;
    let downloadedCount = 0;

    try {
      LocalDb.addLog('SUCCESS', 'Iniciando Sincronização Bidirecional (Local ↔ Supabase)...');

      // 1. FORNECEDORES
      const localFornecedores = LocalDb.getFornecedores();
      const { data: dbFornecedores, error: errF } = await supabase
        .from('fornecedores')
        .select('*');
      
      if (errF) throw new Error(`Erro ao baixar fornecedores: ${errF.message}`);

      const reconciledFornecedores: any[] = [...localFornecedores];
      const remoteFMap = new Map((dbFornecedores || []).map(f => [f.id, f]));

      for (const localF of localFornecedores) {
        const remoteF = remoteFMap.get(localF.id);
        const isUnsynced = !localF.sincronizado;
        const isNewer = remoteF && localF.updated_at && remoteF.updated_at && (new Date(localF.updated_at) > new Date(remoteF.updated_at));

        if (isUnsynced || !remoteF || isNewer) {
          const uploadObj = {
            id: localF.id,
            cnpj: localF.cnpj,
            nome_fantasia: localF.nome_fantasia,
            razao_social: localF.razao_social,
            email: localF.email,
            telefone: localF.telefone,
            created_at: localF.created_at || new Date().toISOString(),
            updated_at: localF.updated_at || new Date().toISOString()
          };

          const { error: upsertErr } = await supabase
            .from('fornecedores')
            .upsert(uploadObj);

          if (upsertErr) {
            console.error('Upsert Fornecedor Error:', upsertErr);
          } else {
            localF.sincronizado = true;
            uploadedCount++;
          }
        }
      }

      for (const remoteF of dbFornecedores || []) {
        const localIndex = reconciledFornecedores.findIndex(f => f.id === remoteF.id);
        if (localIndex === -1) {
          reconciledFornecedores.push({ ...remoteF, sincronizado: true });
          downloadedCount++;
        } else {
          const localF = reconciledFornecedores[localIndex];
          const isRemoteNewer = !localF.updated_at || !remoteF.updated_at || (new Date(remoteF.updated_at) > new Date(localF.updated_at));
          if (isRemoteNewer) {
            reconciledFornecedores[localIndex] = { ...remoteF, sincronizado: true };
            downloadedCount++;
          }
        }
      }
      LocalDb.setFornecedoresRaw(reconciledFornecedores);

      // 2. PRODUTOS
      const localProdutos = LocalDb.getProdutos();
      const { data: dbProdutos, error: errP } = await supabase
        .from('produtos')
        .select('*');

      if (errP) throw new Error(`Erro ao baixar produtos: ${errP.message}`);

      const reconciledProdutos: any[] = [...localProdutos];
      const remotePMap = new Map((dbProdutos || []).map(p => [p.id, p]));

      for (const localP of localProdutos) {
        const remoteP = remotePMap.get(localP.id);
        const isUnsynced = !localP.sincronizado;
        const isNewer = remoteP && localP.updated_at && remoteP.updated_at && (new Date(localP.updated_at) > new Date(remoteP.updated_at));

        if (isUnsynced || !remoteP || isNewer) {
          const uploadObj = {
            id: localP.id,
            sku: localP.sku,
            nome: localP.nome,
            descricao: localP.descricao,
            categoria: localP.categoria,
            preco_custo: localP.preco_custo,
            preco_venda: localP.preco_venda,
            estoque_minimo: localP.estoque_minimo,
            estoque_atual: localP.estoque_atual,
            localizacao_estoque: localP.localizacao_estoque,
            created_at: localP.created_at || new Date().toISOString(),
            updated_at: localP.updated_at || new Date().toISOString()
          };

          const { error: upsertErr } = await supabase
            .from('produtos')
            .upsert(uploadObj);

          if (upsertErr) {
            console.error('Upsert Produto Error:', upsertErr);
          } else {
            localP.sincronizado = true;
            uploadedCount++;
          }
        }
      }

      for (const remoteP of dbProdutos || []) {
        const localIndex = reconciledProdutos.findIndex(p => p.id === remoteP.id);
        if (localIndex === -1) {
          reconciledProdutos.push({ ...remoteP, sincronizado: true });
          downloadedCount++;
        } else {
          const localP = reconciledProdutos[localIndex];
          const isRemoteNewer = !localP.updated_at || !remoteP.updated_at || (new Date(remoteP.updated_at) > new Date(localP.updated_at));
          if (isRemoteNewer) {
            reconciledProdutos[localIndex] = { ...remoteP, sincronizado: true };
            downloadedCount++;
          }
        }
      }
      LocalDb.setProdutosRaw(reconciledProdutos);

      // 3. MOVIMENTACOES
      const localMovimentacoes = LocalDb.getMovimentacoes();
      const { data: dbMovimentacoes, error: errM } = await supabase
        .from('movimentacoes')
        .select('*');

      if (errM) throw new Error(`Erro ao baixar movimentações: ${errM.message}`);

      const reconciledMovs: any[] = [...localMovimentacoes];
      const remoteMMap = new Map((dbMovimentacoes || []).map(m => [m.id, m]));

      for (const localM of localMovimentacoes) {
        const remoteM = remoteMMap.get(localM.id);
        const isUnsynced = !localM.sincronizado;
        
        if (isUnsynced || !remoteM) {
          const { produto_nome, produto_sku, ...cleanM } = localM;
          const uploadObj = {
            id: cleanM.id,
            produto_id: cleanM.produto_id,
            tipo: cleanM.tipo,
            quantidade: cleanM.quantidade,
            data_movimentacao: cleanM.data_movimentacao,
            usuario_id: cleanM.usuario_id,
            motivo: cleanM.motivo,
            observacao: cleanM.observacao || '',
            created_at: cleanM.created_at || cleanM.data_movimentacao,
            updated_at: cleanM.updated_at || cleanM.data_movimentacao
          };

          const { error: upsertErr } = await supabase
            .from('movimentacoes')
            .upsert(uploadObj);

          if (upsertErr) {
            console.error('Upsert Movimentacao Error:', upsertErr);
          } else {
            localM.sincronizado = true;
            uploadedCount++;
          }
        }
      }

      for (const remoteM of dbMovimentacoes || []) {
        const localIndex = reconciledMovs.findIndex(m => m.id === remoteM.id);
        if (localIndex === -1) {
          reconciledMovs.push({ ...remoteM, sincronizado: true });
          downloadedCount++;
        }
      }
      reconciledMovs.sort((a, b) => new Date(b.data_movimentacao).getTime() - new Date(a.data_movimentacao).getTime());
      LocalDb.setMovimentacoesRaw(reconciledMovs);

      // 4. NOTAS FISCAIS
      const localNotas = LocalDb.getNotasFiscais();
      const { data: dbNotas, error: errN } = await supabase
        .from('notas_fiscais')
        .select('*');

      if (errN) {
        console.warn('Tabela de notas_fiscais não disponível:', errN);
      } else {
        const reconciledNotas: any[] = [...localNotas];
        const remoteNMap = new Map((dbNotas || []).map(n => [n.id, n]));

        for (const localN of localNotas) {
          const remoteN = remoteNMap.get(localN.id);
          const isUnsynced = !localN.sincronizado;

          if (isUnsynced || !remoteN) {
            const { fornecedor_nome, ...cleanN } = localN;
            const uploadObj = {
              id: cleanN.id,
              chave_nfe: cleanN.chave_nfe,
              numero_nf: cleanN.numero_nf,
              serie: cleanN.serie,
              data_emissao: cleanN.data_emissao,
              fornecedor_id: cleanN.fornecedor_id,
              valor_total: cleanN.valor_total,
              xml_armazenado: cleanN.xml_armazenado,
              created_at: cleanN.created_at || new Date().toISOString(),
              updated_at: cleanN.updated_at || new Date().toISOString()
            };

            const { error: upsertErr } = await supabase
              .from('notas_fiscais')
              .upsert(uploadObj);

            if (upsertErr) {
              console.error('Upsert Nota Fiscal Error:', upsertErr);
            } else {
              localN.sincronizado = true;
              uploadedCount++;
            }
          }
        }

        for (const remoteN of dbNotas || []) {
          const localIndex = reconciledNotas.findIndex(n => n.id === remoteN.id);
          if (localIndex === -1) {
            reconciledNotas.push({ ...remoteN, sincronizado: true });
            downloadedCount++;
          }
        }
        LocalDb.setNotasFiscaisRaw(reconciledNotas);
      }

      LocalDb.addLog('SUCCESS', `Sincronização concluída com sucesso! Enviados: ${uploadedCount} registros. Baixados: ${downloadedCount} registros.`);
      return { success: true, uploadedCount, downloadedCount };
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      LocalDb.addLog('ERROR', 'Falha na Sincronização Bidirecional', errMsg);
      return { success: false, uploadedCount, downloadedCount, error: errMsg };
    }
  }
};
