import React, { useState, useEffect } from 'react';
import { Database } from '../utils/database';
import { Produto, TipoMovimentacao } from '../types';
import { 
  Plus, Search, Edit2, Trash2, ArrowUpDown, HelpCircle, 
  AlertOctagon, BadgeAlert, Layers, MapPin, DollarSign, 
  ArrowUpRight, ArrowDownLeft, SlidersHorizontal, RefreshCcw, Camera
} from 'lucide-react';
import BarcodeScanner from './BarcodeScanner';

export default function Products({ refreshTrigger }: { refreshTrigger: number }) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  
  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  // Product Form state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sku, setSku] = useState('');
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState('');
  const [precoCusto, setPrecoCusto] = useState(0);
  const [precoVenda, setPrecoVenda] = useState(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState(0);
  const [estoqueInicial, setEstoqueInicial] = useState(0);
  const [localizacao, setLocalizacao] = useState('');
  
  // Movement Form state
  const [selectedProd, setSelectedProd] = useState<Produto | null>(null);
  const [mTipo, setMTipo] = useState<TipoMovimentacao>('Saída');
  const [mQuantidade, setMQuantidade] = useState(1);
  const [mMotivo, setMMotivo] = useState('Venda');
  const [mObservacao, setMObservacao] = useState('');
  
  // Database Error Display state
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
  }, [refreshTrigger]);

  const loadProducts = () => {
    setProdutos(Database.getProdutos());
  };

  const handleOpenProductModal = (prod?: Produto) => {
    setDbError(null);
    if (prod) {
      // EDIT MODE
      setEditingId(prod.id);
      setSku(prod.sku);
      setNome(prod.nome);
      setDescricao(prod.descricao);
      setCategoria(prod.categoria);
      setPrecoCusto(prod.preco_custo);
      setPrecoVenda(prod.preco_venda);
      setEstoqueMinimo(prod.estoque_minimo);
      setEstoqueInicial(prod.estoque_atual);
      setLocalizacao(prod.localizacao_estoque);
    } else {
      // ADD MODE
      setEditingId(null);
      setSku('');
      setNome('');
      setDescricao('');
      setCategoria('');
      setPrecoCusto(0);
      setPrecoVenda(0);
      setEstoqueMinimo(5);
      setEstoqueInicial(0);
      setLocalizacao('');
    }
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    setDbError(null);

    try {
      Database.saveProduto({
        id: editingId || undefined,
        sku,
        nome,
        descricao,
        categoria,
        preco_custo: Number(precoCusto),
        preco_venda: Number(precoVenda),
        estoque_minimo: Number(estoqueMinimo),
        estoque_atual: editingId ? undefined : Number(estoqueInicial), // initial only for new
        localizacao_estoque: localizacao,
      });

      loadProducts();
      setIsProductModalOpen(false);
    } catch (err: any) {
      setDbError(err.message || 'Erro ao salvar produto.');
    }
  };

  const handleDeleteProduct = (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja deletar o produto "${name}"? Todas as movimentações deste SKU também poderão ser alteradas.`)) {
      try {
        Database.deleteProduto(id);
        loadProducts();
      } catch (err: any) {
        alert(err.message || 'Erro ao deletar produto.');
      }
    }
  };

  const handleOpenMovementModal = (prod: Produto) => {
    setDbError(null);
    setSelectedProd(prod);
    setMTipo('Saída');
    setMQuantidade(1);
    setMMotivo('Venda');
    setMObservacao('');
    setIsMovementModalOpen(true);
  };

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd) return;
    setDbError(null);

    try {
      Database.addMovimentacao({
        produto_id: selectedProd.id,
        tipo: mTipo,
        quantidade: Number(mQuantidade),
        usuario_id: 'operador_central',
        motivo: mMotivo,
        observacao: mObservacao,
      });

      loadProducts();
      setIsMovementModalOpen(false);
    } catch (err: any) {
      // Capture PostgreSQL Non-Negative Check simulation!
      setDbError(err.message || 'Erro ao registrar movimentação.');
    }
  };

  // Filter logic
  const filteredProducts = produtos.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.localizacao_estoque.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory ? p.categoria === selectedCategory : true;
    const matchesLowStock = filterLowStock ? p.estoque_atual <= p.estoque_minimo : true;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const categories = Array.from(new Set(produtos.map(p => p.categoria)));

  return (
    <div className="space-y-6">
      {/* Filters and Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU, localização..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
          >
            <option value="">Todas Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Low Stock Toggle Button */}
          <button
            onClick={() => setFilterLowStock(!filterLowStock)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-xl border transition cursor-pointer ${
              filterLowStock 
                ? 'bg-rose-50 border-rose-200 text-rose-700 font-semibold' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BadgeAlert className={`w-4 h-4 ${filterLowStock ? 'text-rose-600' : 'text-slate-400'}`} />
            <span>Abaixo do Mínimo</span>
          </button>

          {/* Camera Scan Button */}
          <button
            onClick={() => setIsScannerOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-xl border border-slate-900 transition cursor-pointer"
            title="Habilitar câmera para leitura de código de barras"
          >
            <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span>Ler SKU (Câmera)</span>
          </button>
        </div>

        <button
          onClick={() => handleOpenProductModal()}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition duration-150 ease-in-out cursor-pointer self-stretch md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Produto</span>
        </button>
      </div>

      {/* Products Table/Grid Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-semibold text-slate-700">Nenhum produto encontrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Tente reajustar seus filtros de busca ou clique em Cadastrar Produto para abastecer seu inventário.
            </p>
          </div>
        ) : (
          <>
            {/* DESKTOP TABLE VIEW */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs uppercase tracking-wider bg-slate-50/20">
                    <th className="px-6 py-4">Detalhes do SKU</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4 text-center">Nível Estoque</th>
                    <th className="px-6 py-4 text-right">Preço Custo (CMP)</th>
                    <th className="px-6 py-4 text-right">Preço Venda</th>
                    <th className="px-6 py-4">Localização</th>
                    <th className="px-6 py-4 text-right">Ações Rápidas</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((p) => {
                    const isUnderStocked = p.estoque_atual <= p.estoque_minimo;

                    return (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50/40 transition">
                        {/* SKU / Name */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div>
                              <div className="font-semibold text-slate-800 text-sm">{p.nome}</div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                                  {p.sku}
                                </span>
                                {isUnderStocked && (
                                  <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 border border-rose-200 text-rose-600 px-2 py-0.5 rounded font-bold animate-pulse">
                                    <AlertOctagon className="w-3 h-3" />
                                    ALERTA CRÍTICO
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4">
                          <span className="text-xs bg-slate-50 text-slate-600 border border-slate-100 px-2.5 py-1 rounded-full font-medium">
                            {p.categoria}
                          </span>
                        </td>

                        {/* Stock levels */}
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center justify-center">
                            <span className={`text-base font-bold ${isUnderStocked ? 'text-rose-600' : 'text-slate-800'}`}>
                              {p.estoque_atual}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Mínimo: {p.estoque_minimo}
                            </span>
                          </div>
                        </td>

                        {/* CMP Cost Price */}
                        <td className="px-6 py-4 text-right">
                          <div className="text-slate-700 font-mono text-sm font-medium">
                            R$ {p.preco_custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block">
                            Custo Médio
                          </span>
                        </td>

                        {/* Sale price */}
                        <td className="px-6 py-4 text-right font-semibold text-slate-800 font-mono text-sm">
                          R$ {p.preco_venda.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Stock location */}
                        <td className="px-6 py-4 text-slate-500 text-xs">
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{p.localizacao_estoque || 'Sem localização'}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenMovementModal(p)}
                              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-lg text-emerald-700 text-xs font-semibold transition cursor-pointer"
                              title="Lançar entrada/saída manualmente"
                            >
                              <ArrowUpDown className="w-3.5 h-3.5" />
                              <span>Movimentar</span>
                            </button>
                            <button
                              onClick={() => handleOpenProductModal(p)}
                              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                              title="Editar produto"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(p.id, p.nome)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                              title="Deletar produto"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* MOBILE VERTICAL CARD STACK VIEW */}
            <div className="block md:hidden divide-y divide-slate-100 bg-white">
              {filteredProducts.map((p) => {
                const isUnderStocked = p.estoque_atual <= p.estoque_minimo;

                return (
                  <div key={p.id} className="p-5 space-y-4">
                    {/* Header: Name, SKU, Category */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-800 text-sm">{p.nome}</h4>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                            {p.sku}
                          </span>
                          <span className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-full">
                            {p.categoria}
                          </span>
                        </div>
                      </div>
                      
                      {/* Badge Alerts */}
                      {isUnderStocked && (
                        <span className="bg-rose-50 border border-rose-200 text-rose-600 text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 flex items-center gap-0.5 animate-pulse">
                          <AlertOctagon className="w-3 h-3" />
                          REPOSIÇÃO CRÍTICA
                        </span>
                      )}
                    </div>

                    {/* Stock level info cards */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className={`p-2 rounded-xl border ${isUnderStocked ? 'bg-rose-50/40 border-rose-100' : 'bg-slate-50/50 border-slate-100'}`}>
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Estoque</span>
                        <span className={`text-sm font-extrabold mt-0.5 block ${isUnderStocked ? 'text-rose-600' : 'text-slate-800'}`}>
                          {p.estoque_atual} un
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50/50 border border-slate-100 rounded-xl">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Mínimo</span>
                        <span className="text-sm font-semibold text-slate-700 mt-0.5 block">
                          {p.estoque_minimo} un
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50/50 border border-slate-100 rounded-xl">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Preço</span>
                        <span className="text-sm font-semibold text-emerald-600 mt-0.5 block font-mono">
                          R$ {p.preco_venda.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Financial details & Localization */}
                    <div className="text-xs space-y-1.5 text-slate-500 bg-slate-50/30 p-2.5 rounded-xl border border-slate-100">
                      <div className="flex justify-between">
                        <span>Custo Médio (CMP):</span>
                        <span className="font-mono text-slate-700 font-semibold">R$ {p.preco_custo.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Localização:</span>
                        <span className="font-semibold text-slate-700">{p.localizacao_estoque || 'Sem local'}</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 pt-2">
                      <button
                        onClick={() => handleOpenMovementModal(p)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        <ArrowUpDown className="w-3.5 h-3.5" />
                        <span>Lançar Movimento</span>
                      </button>
                      <button
                        onClick={() => handleOpenProductModal(p)}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p.id, p.nome)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition cursor-pointer"
                        title="Deletar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ==============================================
          MODAL: PRODUCT REGISTRATION / EDIT
          ============================================== */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-lg w-full overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-5/50">
              <h3 className="font-semibold text-slate-800 text-base">
                {editingId ? 'Editar Detalhes do Produto' : 'Cadastrar Novo SKU'}
              </h3>
              <button 
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              {dbError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-medium">
                  {dbError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">SKU (Código Único) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: TEC-MXK-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Categoria *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Periféricos"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nome do Produto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Teclado Mecânico Logitech"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Descrição Curta</label>
                <textarea
                  placeholder="Ex: Equipamento ergonômico retroiluminado"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Custo Unitário (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={precoCusto}
                    onChange={(e) => setPrecoCusto(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Preço Venda (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={precoVenda}
                    onChange={(e) => setPrecoVenda(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Estoque Mínimo *</label>
                  <input
                    type="number"
                    required
                    value={estoqueMinimo}
                    onChange={(e) => setEstoqueMinimo(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                    {editingId ? 'Estoque Atual' : 'Estoque Inicial'}
                  </label>
                  <input
                    type="number"
                    disabled={!!editingId}
                    value={estoqueInicial}
                    onChange={(e) => setEstoqueInicial(parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 text-sm border rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition ${
                      editingId ? 'bg-slate-100 border-slate-200 cursor-not-allowed' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Localização</label>
                  <input
                    type="text"
                    placeholder="Ex: Corredor A-1"
                    value={localizacao}
                    onChange={(e) => setLocalizacao(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition cursor-pointer"
                >
                  Confirmar Gravidade
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==============================================
          MODAL: LAUNCH MANUAL MOVEMENT
          ============================================== */}
      {isMovementModalOpen && selectedProd && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-5/50">
              <div>
                <h3 className="font-semibold text-slate-800 text-base">Registrar Movimentação</h3>
                <span className="text-[11px] text-slate-500 block">Produto: {selectedProd.nome} (SKU: {selectedProd.sku})</span>
              </div>
              <button 
                onClick={() => setIsMovementModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="p-6 space-y-4">
              {dbError && (
                <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-xl text-rose-800 text-xs font-mono whitespace-pre-wrap leading-relaxed animate-shake">
                  <div className="font-bold uppercase tracking-wider text-rose-900 mb-1 flex items-center gap-1">
                    <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>PostgreSQL Exception Raised</span>
                  </div>
                  {dbError}
                </div>
              )}

              {/* Current physical stock banner */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs text-slate-600">
                <span>Estoque Físico Atual:</span>
                <span className="font-bold text-slate-800 text-sm">{selectedProd.estoque_atual} unidades</span>
              </div>

              {/* Movement Type Toggle */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Tipo de Fluxo</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMTipo('Entrada');
                      setMMotivo('Compra NF');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      mTipo === 'Entrada'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    <span>Entrada (+)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMTipo('Saída');
                      setMMotivo('Venda');
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold rounded-xl border transition cursor-pointer ${
                      mTipo === 'Saída'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4 text-rose-600" />
                    <span>Saída (-)</span>
                  </button>
                </div>
              </div>

              {/* Quantity & Reason */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Quantidade</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={mQuantidade}
                    onChange={(e) => setMQuantidade(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Motivo</label>
                  <select
                    value={mMotivo}
                    onChange={(e) => setMMotivo(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-600 focus:outline-none focus:border-emerald-500 transition cursor-pointer"
                  >
                    {mTipo === 'Entrada' ? (
                      <>
                        <option value="Compra NF">Compra via NF-e</option>
                        <option value="Ajuste Manual">Ajuste Manual</option>
                        <option value="Balanço">Balanço Físico</option>
                      </>
                    ) : (
                      <>
                        <option value="Venda">Venda / Saída de Caixa</option>
                        <option value="Quebra">Quebra / Defeito</option>
                        <option value="Balanço">Balanço Físico</option>
                        <option value="Ajuste Manual">Ajuste Manual</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Observation description */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Anotações / Observação</label>
                <textarea
                  placeholder="Ex: Nota Fiscal #543 ou Pedido ID #8549"
                  value={mObservacao}
                  onChange={(e) => setMObservacao(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition resize-none"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition cursor-pointer"
                >
                  Lançar Movimentação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Scanner Overlay Modal */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(scannedSku) => {
          setSearchQuery(scannedSku);
          Database.addLog('SUCCESS', `Filtro de busca atualizado para SKU escaneado: ${scannedSku}`);
        }}
      />
    </div>
  );
}
