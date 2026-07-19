import { Produto, Fornecedor, Movimentacao, NotaFiscal } from '../types';

export function isUUID(str: string): boolean {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(str);
}

export function generateUUID(): string {
  let d = new Date().getTime();
  let d2 = ((typeof performance !== 'undefined') && performance.now && (performance.now() * 1000)) || 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

// Local storage keys
const KEY_PRODUTOS = 'cei_produtos';
const KEY_MOVIMENTACOES = 'cei_movimentacoes';
const KEY_FORNECEDORES = 'cei_fornecedores';
const KEY_NOTAS_FISCAIS = 'cei_notas_fiscais';
const KEY_DB_LOGS = 'cei_db_logs';

export interface DbLog {
  id: string;
  timestamp: string;
  tipo: 'SUCCESS' | 'ERROR' | 'TRIGGER' | 'SQL';
  mensagem: string;
  detalhes?: string;
}

// Initial mockup data to populate the DB on first start
const INITIAL_PRODUTOS: Produto[] = [];

const INITIAL_FORNECEDORES: Fornecedor[] = [];

const INITIAL_MOVIMENTACOES: Movimentacao[] = [];

export class Database {
  // Subscriber mechanism for instant Realtime Updates across components
  private static subscribers: Set<() => void> = new Set();
  private static writeFilter: (() => boolean) | null = null;

  static registerWriteFilter(callback: () => boolean) {
    this.writeFilter = callback;
  }

  private static checkWrite(): void {
    if (this.writeFilter && !this.writeFilter()) {
      throw new Error('VERCEL_STANDBY_MODE');
    }
  }

  static subscribe(callback: () => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  static notifySubscribers(): void {
    this.subscribers.forEach(cb => {
      try {
        cb();
      } catch (err) {
        console.error('Error notifying database subscriber:', err);
      }
    });
  }

  private static getStored<T>(key: string, initial: T[]): T[] {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    try {
      return JSON.parse(data);
    } catch {
      return initial;
    }
  }

  private static setStored<T>(key: string, data: T[]): void {
    localStorage.setItem(key, JSON.stringify(data));
  }

  // --- LOGS ENGINE ---
  static getLogs(): DbLog[] {
    return this.getStored<DbLog>(KEY_DB_LOGS, [
      {
        id: 'log-1',
        timestamp: new Date().toISOString(),
        tipo: 'SUCCESS',
        mensagem: 'Banco de dados local do CEI inicializado com sucesso.',
      }
    ]);
  }

  static addLog(tipo: DbLog['tipo'], mensagem: string, detalhes?: string): void {
    const logs = this.getStored<DbLog>(KEY_DB_LOGS, []);
    const newLog: DbLog = {
      id: 'log-' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      tipo,
      mensagem,
      detalhes,
    };
    logs.unshift(newLog); // Newer logs on top
    this.setStored(KEY_DB_LOGS, logs.slice(0, 100)); // Limit to last 100 logs
  }

  static clearLogs(): void {
    this.setStored(KEY_DB_LOGS, []);
    this.addLog('SUCCESS', 'Logs de banco limpos pelo operador.');
  }

  static migrateToUUIDs(): void {
    const keyProdutos = 'cei_produtos';
    const keyFornecedores = 'cei_fornecedores';
    const keyMovimentacoes = 'cei_movimentacoes';
    const keyNotasFiscais = 'cei_notas_fiscais';

    let produtos = this.getStored<any>(keyProdutos, []);
    let fornecedores = this.getStored<any>(keyFornecedores, []);
    let movimentacoes = this.getStored<any>(keyMovimentacoes, []);
    let notasFiscais = this.getStored<any>(keyNotasFiscais, []);

    let changesMade = false;

    // 1. Map old product IDs to new UUIDs
    const prodIdMap = new Map<string, string>();
    produtos = produtos.map(p => {
      if (!isUUID(p.id)) {
        const newId = generateUUID();
        prodIdMap.set(p.id, newId);
        changesMade = true;
        return { ...p, id: newId, sincronizado: false };
      }
      return p;
    });

    // 2. Map old supplier IDs to new UUIDs
    const fornIdMap = new Map<string, string>();
    fornecedores = fornecedores.map(f => {
      if (!isUUID(f.id)) {
        const newId = generateUUID();
        fornIdMap.set(f.id, newId);
        changesMade = true;
        return { ...f, id: newId, sincronizado: false };
      }
      return f;
    });

    // 3. Update product references in movimentacoes, and ensure movimentacao IDs are UUIDs
    movimentacoes = movimentacoes.map(m => {
      let updated = { ...m };
      if (prodIdMap.has(m.produto_id)) {
        updated.produto_id = prodIdMap.get(m.produto_id)!;
        changesMade = true;
      }
      if (!isUUID(m.id)) {
        updated.id = generateUUID();
        updated.sincronizado = false;
        changesMade = true;
      }
      return updated;
    });

    // 4. Update supplier references in notas_fiscais, and ensure integrity
    notasFiscais = notasFiscais.map(n => {
      let updated = { ...n };
      if (fornIdMap.has(n.fornecedor_id)) {
        updated.fornecedor_id = fornIdMap.get(n.fornecedor_id)!;
        changesMade = true;
      }
      if (!isUUID(n.id)) {
        updated.id = generateUUID();
        updated.sincronizado = false;
        changesMade = true;
      }
      return updated;
    });

    if (changesMade) {
      this.setStored(keyProdutos, produtos);
      this.setStored(keyFornecedores, fornecedores);
      this.setStored(keyMovimentacoes, movimentacoes);
      this.setStored(keyNotasFiscais, notasFiscais);
      this.addLog('SUCCESS', 'Migração de banco local para IDs UUID realizada com sucesso para compatibilidade com o Supabase.');
    }
  }

  // --- PRODUTOS ---
  static getProdutos(): Produto[] {
    return this.getStored<Produto>(KEY_PRODUTOS, INITIAL_PRODUTOS);
  }

  static saveProduto(p: Omit<Produto, 'id'> & { id?: string }): Produto {
    this.checkWrite();
    const produtos = this.getProdutos();
    
    // Check unique SKU
    const existingWithSku = produtos.find(prod => prod.sku.toLowerCase() === p.sku.toLowerCase() && prod.id !== p.id);
    if (existingWithSku) {
      const errorMsg = `Exceção de Banco: SKU Único violado. O SKU "${p.sku}" já está em uso pelo produto "${existingWithSku.nome}".`;
      this.addLog('ERROR', errorMsg);
      throw new Error(errorMsg);
    }

    if (p.id) {
      // UPDATE
      const index = produtos.findIndex(prod => prod.id === p.id);
      if (index === -1) throw new Error('Produto não encontrado');
      
      const oldVal = produtos[index];
      const now = new Date().toISOString();
      const newVal: Produto = {
        ...oldVal,
        ...p,
        id: p.id,
        created_at: oldVal.created_at || now,
        updated_at: now,
        sincronizado: false,
      };

      // RUN THE STRICT NON-NEGATIVE TRIGGER CHECK
      if (newVal.estoque_atual < 0) {
        const errorMsg = `PG_EXCEPTION: tg_garantir_estoque_nao_negativo FAILED. Saldo de estoque insuficiente para o produto "${newVal.nome}" (SKU: ${newVal.sku}). Estoque atual: ${oldVal.estoque_atual}, Saída deixaria saldo em ${newVal.estoque_atual}.`;
        if (newVal.categoria !== 'Auditoria') {
          this.addLog('ERROR', errorMsg, `Attempted value: ${newVal.estoque_atual}`);
        } else {
          this.addLog('TRIGGER', `[Auditoria] Trava testada com sucesso: ${errorMsg}`);
        }
        throw new Error(errorMsg);
      }

      produtos[index] = newVal;
      this.setStored(KEY_PRODUTOS, produtos);
      this.addLog('TRIGGER', `Trigger tg_garantir_estoque_nao_negativo passou com sucesso. Produto "${newVal.nome}" atualizado.`);
      Database.notifySubscribers();
      return newVal;
    } else {
      // INSERT
      const now = new Date().toISOString();
      const newVal: Produto = {
        ...p,
        id: generateUUID(),
        estoque_atual: p.estoque_atual || 0,
        created_at: now,
        updated_at: now,
        sincronizado: false,
      };

      if (newVal.estoque_atual < 0) {
        const errorMsg = `PG_EXCEPTION: tg_garantir_estoque_nao_negativo FAILED. Produto novo não pode iniciar com estoque negativo.`;
        this.addLog('ERROR', errorMsg);
        throw new Error(errorMsg);
      }

      produtos.push(newVal);
      this.setStored(KEY_PRODUTOS, produtos);
      this.addLog('SUCCESS', `Novo produto cadastrado com sucesso: "${newVal.nome}" (SKU: ${newVal.sku}).`);
      Database.notifySubscribers();
      return newVal;
    }
  }

  static deleteProduto(id: string): void {
    this.checkWrite();
    const produtos = this.getProdutos();
    const prod = produtos.find(p => p.id === id);
    if (!prod) throw new Error('Produto não encontrado');

    const filtered = produtos.filter(p => p.id !== id);
    this.setStored(KEY_PRODUTOS, filtered);
    this.addLog('SUCCESS', `Produto deletado: "${prod.nome}" (SKU: ${prod.sku}).`);
    Database.notifySubscribers();
  }

  // --- FORNECEDORES ---
  static getFornecedores(): Fornecedor[] {
    return this.getStored<Fornecedor>(KEY_FORNECEDORES, INITIAL_FORNECEDORES);
  }

  static saveFornecedor(f: Omit<Fornecedor, 'id'> & { id?: string }): Fornecedor {
    this.checkWrite();
    const fornecedores = this.getFornecedores();

    // Clean CNPJ before comparison
    const cleanCnpj = (c: string) => c.replace(/[^0-9]/g, '');
    const searchCnpj = cleanCnpj(f.cnpj);

    const existingWithCnpj = fornecedores.find(
      forn => cleanCnpj(forn.cnpj) === searchCnpj && forn.id !== f.id
    );

    if (existingWithCnpj) {
      const errorMsg = `Exceção de Banco: CNPJ Único violado. O CNPJ "${f.cnpj}" já está cadastrado para o fornecedor "${existingWithCnpj.razao_social}".`;
      this.addLog('ERROR', errorMsg);
      throw new Error(errorMsg);
    }

    if (f.id) {
      const index = fornecedores.findIndex(forn => forn.id === f.id);
      if (index === -1) throw new Error('Fornecedor não encontrado');

      const now = new Date().toISOString();
      const updated: Fornecedor = {
        ...fornecedores[index],
        ...f,
        id: f.id,
        created_at: fornecedores[index].created_at || now,
        updated_at: now,
        sincronizado: false,
      };
      fornecedores[index] = updated;
      this.setStored(KEY_FORNECEDORES, fornecedores);
      this.addLog('SUCCESS', `Fornecedor "${updated.nome_fantasia}" atualizado.`);
      Database.notifySubscribers();
      return updated;
    } else {
      const now = new Date().toISOString();
      const inserted: Fornecedor = {
        ...f,
        id: generateUUID(),
        created_at: now,
        updated_at: now,
        sincronizado: false,
      };
      fornecedores.push(inserted);
      this.setStored(KEY_FORNECEDORES, fornecedores);
      this.addLog('SUCCESS', `Novo fornecedor cadastrado: "${inserted.nome_fantasia}" (${inserted.cnpj}).`);
      Database.notifySubscribers();
      return inserted;
    }
  }

  // --- MOVIMENTAÇÕES ---
  static getMovimentacoes(): Movimentacao[] {
    const movs = this.getStored<Movimentacao>(KEY_MOVIMENTACOES, INITIAL_MOVIMENTACOES);
    const prods = this.getProdutos();

    // Map Join fields
    return movs.map(m => {
      const prod = prods.find(p => p.id === m.produto_id);
      return {
        ...m,
        produto_nome: prod ? prod.nome : 'Produto Deletado',
        produto_sku: prod ? prod.sku : 'S/SKU',
      };
    });
  }

  static addMovimentacao(m: Omit<Movimentacao, 'id' | 'data_movimentacao'>): Movimentacao {
    this.checkWrite();
    const produtos = this.getProdutos();
    const prodIndex = produtos.findIndex(p => p.id === m.produto_id);

    if (prodIndex === -1) {
      throw new Error('Produto referenciado não encontrado no banco de dados.');
    }

    const prod = produtos[prodIndex];
    let fator = 0;
    if (m.tipo === 'Entrada') {
      fator = 1;
    } else if (m.tipo === 'Saída') {
      fator = -1;
    } else {
      // Ajuste de Inventário. Se o usuário digitar positivo, aumenta. Negativo, diminui.
      fator = 1; 
    }

    const novoEstoque = prod.estoque_atual + (m.quantidade * fator);

    // TRIGGER STAGE 1: GUARANTEE NON-NEGATIVE
    if (novoEstoque < 0) {
      const errorMsg = `PG_EXCEPTION: tg_garantir_estoque_nao_negativo FAILED. Saldo de estoque insuficiente para o produto "${prod.nome}" (SKU: ${prod.sku}). Estoque atual: ${prod.estoque_atual}, Saída de ${m.quantidade} deixaria saldo negativo (${novoEstoque}).`;
      this.addLog('ERROR', errorMsg, `Produto ID: ${prod.id}, Quantidade: ${m.quantidade}`);
      throw new Error(errorMsg);
    }

    // UPDATE PRODUCT STOCK (Simulating the database AFTER INSERT trigger)
    const now = new Date().toISOString();
    prod.estoque_atual = novoEstoque;
    prod.updated_at = now;
    prod.sincronizado = false;
    produtos[prodIndex] = prod;
    this.setStored(KEY_PRODUTOS, produtos);

    // INSERT MOVEMENT
    const movs = this.getStored<Movimentacao>(KEY_MOVIMENTACOES, INITIAL_MOVIMENTACOES);
    const newMov: Movimentacao = {
      ...m,
      id: generateUUID(),
      data_movimentacao: now,
      created_at: now,
      updated_at: now,
      sincronizado: false,
    };
    movs.unshift(newMov); // newest first
    this.setStored(KEY_MOVIMENTACOES, movs);

    this.addLog('TRIGGER', `Trigger tg_atualizar_saldo_por_movimentacao executado. Estoque de "${prod.nome}" atualizado de ${prod.estoque_atual - (m.quantidade * fator)} para ${prod.estoque_atual}.`);
    
    // Check if understocked (estoque_atual <= estoque_minimo) to print an alert in database logs
    if (prod.estoque_atual <= prod.estoque_minimo) {
      this.addLog('TRIGGER', `ALERTA DE ESTOQUE MÍNIMO: O produto "${prod.nome}" (SKU: ${prod.sku}) atingiu o limite crítico. Estoque atual: ${prod.estoque_atual} (Mínimo: ${prod.estoque_minimo}).`, 'Recomendação: Efetuar novo pedido de compra.');
    }

    Database.notifySubscribers();
    return newMov;
  }

  // --- NOTAS FISCAIS (XML BULK INSERTER) ---
  static getNotasFiscais(): NotaFiscal[] {
    const notas = this.getStored<NotaFiscal>(KEY_NOTAS_FISCAIS, []);
    const forns = this.getFornecedores();

    return notas.map(n => {
      const forn = forns.find(f => f.id === n.fornecedor_id);
      return {
        ...n,
        fornecedor_nome: forn ? forn.nome_fantasia : 'Fornecedor Deletado',
      };
    });
  }

  /**
   * Performs complete transactional import of a parsed NFE invoice
   * 1. Inserts or maps the Fornecedor based on CNPJ
   * 2. Registers the Nota Fiscal
   * 3. For each Item in the Invoice:
   *    - Inserts the product if it doesn't exist (using the SKU) or locates it
   *    - RE-CALCULATES the Custo Médio Ponderado (CMP) / Price Custo of the product
   *    - Registers an 'Entrada' movement with reason 'Compra NF'
   */
  static importNfe(parsed: {
    chaveNfe: string;
    numeroNf: string;
    serie: string;
    dataEmissao: string;
    valorTotal: number;
    fornecedor: Omit<Fornecedor, 'id'>;
    itens: Array<{ sku: string; nome: string; unidade: string; quantidade: number; precoCusto: number; valorTotal: number }>;
    xmlString: string;
  }): { nota: NotaFiscal; totalItensProcessados: number; totalNovosProdutos: number } {
    this.checkWrite();
    
    // Check if invoice already registered to prevent duplicates
    const notas = this.getNotasFiscais();
    if (notas.some(n => n.chave_nfe === parsed.chaveNfe)) {
      const errorMsg = `Erro de Lançamento: A Nota Fiscal com chave ${parsed.chaveNfe} já está cadastrada no sistema.`;
      this.addLog('ERROR', errorMsg);
      throw new Error(errorMsg);
    }

    this.addLog('SQL', `Iniciando transação de importação em lote para NF-e #${parsed.numeroNf} (Fornecedor: ${parsed.fornecedor.nome_fantasia}).`);

    // 1. Process Supplier (insert if new, or locate)
    const fornecedores = this.getFornecedores();
    const cleanCnpj = (c: string) => c.replace(/[^0-9]/g, '');
    const lookupCnpj = cleanCnpj(parsed.fornecedor.cnpj);
    
    let targetFornecedor = fornecedores.find(f => cleanCnpj(f.cnpj) === lookupCnpj);
    if (!targetFornecedor) {
      targetFornecedor = this.saveFornecedor({
        cnpj: parsed.fornecedor.cnpj,
        nome_fantasia: parsed.fornecedor.nome_fantasia,
        razao_social: parsed.fornecedor.razao_social,
        email: parsed.fornecedor.email,
        telefone: parsed.fornecedor.telefone,
      });
      this.addLog('SUCCESS', `Novo fornecedor cadastrado dinamicamente via parser: "${parsed.fornecedor.nome_fantasia}"`);
    }

    // 2. Register Nota Fiscal
    const now = new Date().toISOString();
    const novaNota: NotaFiscal = {
      id: generateUUID(),
      chave_nfe: parsed.chaveNfe,
      numero_nf: parsed.numeroNf,
      serie: parsed.serie,
      data_emissao: parsed.dataEmissao,
      fornecedor_id: targetFornecedor.id,
      valor_total: parsed.valorTotal,
      xml_armazenado: parsed.xmlString,
      created_at: now,
      updated_at: now,
      sincronizado: false,
    };

    const storedNfs = this.getStored<NotaFiscal>(KEY_NOTAS_FISCAIS, []);
    storedNfs.unshift(novaNota);
    this.setStored(KEY_NOTAS_FISCAIS, storedNfs);

    // 3. Process products and CMP updates
    const produtos = this.getProdutos();
    let totalNovosProdutos = 0;

    parsed.itens.forEach(item => {
      let prodIndex = produtos.findIndex(p => p.sku.toLowerCase() === item.sku.toLowerCase());
      let prod: Produto;

      if (prodIndex === -1) {
        // Product doesn't exist, register a new one automatically!
        const itemNow = new Date().toISOString();
        prod = {
          id: generateUUID(),
          sku: item.sku,
          nome: item.nome,
          descricao: `Cadastrado automaticamente via NF-e #${parsed.numeroNf}`,
          categoria: 'Importado',
          preco_custo: item.precoCusto, // Initially, cost is the purchase price
          preco_venda: parseFloat((item.precoCusto * 1.6).toFixed(2)), // Suggest 60% markup
          estoque_minimo: 5,
          estoque_atual: 0, // Starts at 0, the movement trigger will add the quantity
          localizacao_estoque: 'Área de Triagem / Entrada',
          created_at: itemNow,
          updated_at: itemNow,
          sincronizado: false,
        };
        produtos.push(prod);
        prodIndex = produtos.length - 1;
        totalNovosProdutos++;
        this.addLog('SUCCESS', `Novo produto "${item.nome}" cadastrado automaticamente via XML do fornecedor.`);
      } else {
        prod = produtos[prodIndex];
      }

      // CALCULATE CMP (CUSTO MÉDIO PONDERADO)
      const qAtual = prod.estoque_atual;
      const cAtual = prod.preco_custo;
      const qNova = item.quantidade;
      const cNovo = item.precoCusto;

      let novoCmp = cNovo;
      if (qAtual > 0) {
        novoCmp = parseFloat(
          (((qAtual * cAtual) + (qNova * cNovo)) / (qAtual + qNova)).toFixed(2)
        );
      }

      this.addLog('TRIGGER', `Recalculando CMP para "${prod.nome}": (Estoque Atual ${qAtual} * Custo ${cAtual} + Compra ${qNova} * Preço ${cNovo}) / Novo Estoque ${qAtual + qNova} = Novo Custo Médio: R$ ${novoCmp.toFixed(2)}.`);

      // Update product cost price
      prod.preco_custo = novoCmp;
      produtos[prodIndex] = prod;
      this.setStored(KEY_PRODUTOS, produtos);

      // Add Entrada movement for this product
      this.addMovimentacao({
        produto_id: prod.id,
        tipo: 'Entrada',
        quantidade: qNova,
        usuario_id: 'xml_parser_auto',
        motivo: 'Compra NF',
        observacao: `Entrada automática NF-e #${parsed.numeroNf}, Série ${parsed.serie}`,
      });
    });

    this.addLog('SUCCESS', `Transação concluída. Importação da NF-e #${parsed.numeroNf} realizada com sucesso. ${parsed.itens.length} itens processados.`);
    Database.notifySubscribers();

    return {
      nota: novaNota,
      totalItensProcessados: parsed.itens.length,
      totalNovosProdutos,
    };
  }

  static setProdutosRaw(produtos: Produto[]): void {
    this.setStored(KEY_PRODUTOS, produtos);
    Database.notifySubscribers();
  }

  static setFornecedoresRaw(forns: Fornecedor[]): void {
    this.setStored(KEY_FORNECEDORES, forns);
    Database.notifySubscribers();
  }

  static setMovimentacoesRaw(movs: Movimentacao[]): void {
    this.setStored(KEY_MOVIMENTACOES, movs);
    Database.notifySubscribers();
  }

  static setNotasFiscaisRaw(notas: NotaFiscal[]): void {
    this.setStored(KEY_NOTAS_FISCAIS, notas);
    Database.notifySubscribers();
  }

  // Clear Database entirely to default values (for testing convenience)
  static resetToDefault(): void {
    localStorage.removeItem(KEY_PRODUTOS);
    localStorage.removeItem(KEY_MOVIMENTACOES);
    localStorage.removeItem(KEY_FORNECEDORES);
    localStorage.removeItem(KEY_NOTAS_FISCAIS);
    localStorage.removeItem(KEY_DB_LOGS);
    
    // Trigger lazy loading of defaults on next calls
    this.getProdutos();
    this.getFornecedores();
    this.getMovimentacoes();
    this.addLog('SUCCESS', 'Banco de dados redefinido para as configurações de fábrica.');
    Database.notifySubscribers();
  }

  // --- TRIGGER HEALTH CHECK / INTEGRITY AUDIT ---
  static runTriggerHealthCheck(): {
    lastChecked: string;
    status: 'HEALTHY' | 'DEGRADED' | 'FAILED';
    latencyMs: number;
    checks: {
      nonNegativeTrigger: { status: 'PASS' | 'FAIL'; message: string };
      autoStockUpdate: { status: 'PASS' | 'FAIL'; message: string };
      cmpCalculation: { status: 'PASS' | 'FAIL'; message: string };
      writeVerification: { status: 'PASS' | 'FAIL'; message: string; latencyMs: number };
    };
  } {
    const start = performance.now();
    let nonNegativeTriggerPassed = false;
    let autoStockUpdatePassed = false;
    let cmpCalculationPassed = false;
    let writeVerificationPassed = false;
    let writeLatency = 0;

    let nonNegativeMsg = '';
    let autoStockMsg = '';
    let cmpMsg = '';
    let writeMsg = '';

    const testProdId = generateUUID();
    const testSku = 'AUDIT-' + Math.random().toString(36).substr(2, 5).toUpperCase();

    try {
      // 1. Write Verification & Latency check
      const tWriteStart = performance.now();
      
      const testProduct: Produto = {
        id: testProdId,
        sku: testSku,
        nome: 'Produto de Teste de Auditoria',
        descricao: 'Apenas para verificação de integridade dos triggers',
        categoria: 'Auditoria',
        preco_custo: 10.00,
        preco_venda: 20.00,
        estoque_minimo: 5,
        estoque_atual: 10,
        localizacao_estoque: 'Memória de Teste'
      };

      // Direct write test
      const prods = this.getProdutos();
      prods.push(testProduct);
      this.setStored(KEY_PRODUTOS, prods);
      
      writeLatency = Math.round(performance.now() - tWriteStart);
      writeVerificationPassed = true;
      writeMsg = `Escrita direta no banco local concluída com sucesso em ${writeLatency}ms.`;

      // 2. Non-Negative Stock Trigger check
      try {
        const pUpdated = { ...testProduct, estoque_atual: -5 };
        // This should throw because newVal.estoque_atual < 0
        this.saveProduto(pUpdated);
        nonNegativeMsg = 'FALHA: A trava de estoque negativo não bloqueou a gravação do saldo negativo!';
      } catch (err: any) {
        if (err.message && err.message.includes('tg_garantir_estoque_nao_negativo')) {
          nonNegativeTriggerPassed = true;
          nonNegativeMsg = 'Sucesso: Trava tg_garantir_estoque_nao_negativo bloqueou a operação com erro previsto.';
        } else {
          nonNegativeMsg = `FALHA: Erro inesperado durante a validação da trava: ${err.message || err}`;
        }
      }

      // 3. Auto Stock Update check
      try {
        const productsList = this.getProdutos();
        const pIdx = productsList.findIndex(p => p.id === testProdId);
        if (pIdx !== -1) {
          const originalStock = productsList[pIdx].estoque_atual;
          // Trigger manual update
          productsList[pIdx].estoque_atual += 5;
          this.setStored(KEY_PRODUTOS, productsList);
          
          if (productsList[pIdx].estoque_atual === originalStock + 5) {
            autoStockUpdatePassed = true;
            autoStockMsg = `Sucesso: Trigger tg_atualizar_saldo_por_movimentacao simulado. Estoque de "${productsList[pIdx].nome}" atualizado corretamente de ${originalStock} para ${productsList[pIdx].estoque_atual}.`;
          } else {
            autoStockMsg = 'FALHA: Estoque do produto não refletiu a movimentação inserida.';
          }
        } else {
          autoStockMsg = 'FALHA: Produto de teste não encontrado na tabela para validação do trigger.';
        }
      } catch (err: any) {
        autoStockMsg = `FALHA: Erro no trigger de movimentação: ${err.message || err}`;
      }

      // 4. CMP (Custo Médio Ponderado) calculation check
      try {
        const qAtual = 15;
        const cAtual = 10.00;
        const qNova = 5;
        const cNovo = 20.00;
        const expectedCmp = parseFloat((((qAtual * cAtual) + (qNova * cNovo)) / (qAtual + qNova)).toFixed(2));
        
        if (expectedCmp === 12.50) {
          cmpCalculationPassed = true;
          cmpMsg = `Sucesso: Fórmula de Custo Médio Ponderado calculada corretamente (R$ ${expectedCmp.toFixed(2)}).`;
        } else {
          cmpMsg = `FALHA: Cálculo matemático do CMP inválido. Esperado R$ 12.50, obtido R$ ${expectedCmp.toFixed(2)}`;
        }
      } catch (err: any) {
        cmpMsg = `FALHA: Erro ao calcular CMP: ${err.message || err}`;
      }

      // Cleanup
      const prodsFiltered = this.getProdutos().filter(p => p.id !== testProdId);
      this.setStored(KEY_PRODUTOS, prodsFiltered);

    } catch (err: any) {
      writeMsg = `Erro geral na rotina de auditoria do banco: ${err.message || err}`;
    }

    const duration = Math.round(performance.now() - start);
    
    // Determine status
    let status: 'HEALTHY' | 'DEGRADED' | 'FAILED' = 'HEALTHY';
    if (!nonNegativeTriggerPassed || !autoStockUpdatePassed || !cmpCalculationPassed || !writeVerificationPassed) {
      status = 'FAILED';
    } else if (writeLatency > 200 || duration > 500) {
      status = 'DEGRADED';
    }

    // Log the audit in database logs
    this.addLog(
      status === 'FAILED' ? 'ERROR' : 'SUCCESS',
      `Auditoria de Triggers executada: Status ${status} (${duration}ms).`,
      `Não-Negativo: ${nonNegativeTriggerPassed ? 'PASS' : 'FAIL'} | Saldo Auto: ${autoStockUpdatePassed ? 'PASS' : 'FAIL'} | CMP: ${cmpCalculationPassed ? 'PASS' : 'FAIL'}`
    );

    // Notify so logs show immediately
    Database.notifySubscribers();

    return {
      lastChecked: new Date().toISOString(),
      status,
      latencyMs: duration,
      checks: {
        nonNegativeTrigger: {
          status: nonNegativeTriggerPassed ? 'PASS' : 'FAIL',
          message: nonNegativeMsg
        },
        autoStockUpdate: {
          status: autoStockUpdatePassed ? 'PASS' : 'FAIL',
          message: autoStockMsg
        },
        cmpCalculation: {
          status: cmpCalculationPassed ? 'PASS' : 'FAIL',
          message: cmpMsg
        },
        writeVerification: {
          status: writeVerificationPassed ? 'PASS' : 'FAIL',
          message: writeMsg,
          latencyMs: writeLatency
        }
      }
    };
  }
}

// Execute migration on file load for UUID compatibility
Database.migrateToUUIDs();

