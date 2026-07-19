import React, { useState, useEffect } from 'react';
import { Database } from '../utils/database';
import { Movimentacao, NotaFiscal } from '../types';
import { History, FileText, ArrowUpRight, ArrowDownLeft, ShieldAlert, Calendar, User, Search, Eye, FileCode } from 'lucide-react';

export default function Movements({ refreshTrigger }: { refreshTrigger: number }) {
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscal[]>([]);
  const [activeTab, setActiveTab] = useState<'movs' | 'nfs'>('movs');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selected NF-e for XML view modal
  const [selectedNf, setSelectedNf] = useState<NotaFiscal | null>(null);

  useEffect(() => {
    setMovimentacoes(Database.getMovimentacoes());
    setNotasFiscais(Database.getNotasFiscais());
  }, [refreshTrigger]);

  const filteredMovs = movimentacoes.filter(m => {
    return (m.produto_nome || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
           (m.produto_sku || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
           m.motivo.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (m.observacao || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredNfs = notasFiscais.filter(n => {
    return n.numero_nf.includes(searchQuery) ||
           n.chave_nfe.includes(searchQuery) ||
           (n.fornecedor_nome || '').toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Tab Switcher & Search Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl self-start">
          <button
            onClick={() => { setActiveTab('movs'); setSearchQuery(''); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'movs'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Livro de Registro (Movimentações)</span>
          </button>
          <button
            onClick={() => { setActiveTab('nfs'); setSearchQuery(''); }}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === 'nfs'
                ? 'bg-white text-slate-800 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notas Fiscais Importadas (NF-e)</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'movs' ? "Filtrar por SKU, produto, motivo..." : "Filtrar por número da nota, fornecedor..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Content Panels */}
      {activeTab === 'movs' ? (
        /* TAB: MOVEMENTS LIST */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          {filteredMovs.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <History className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700">Nenhuma movimentação lançada</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Efetue saídas manuais ou importe notas fiscais para registrar as movimentações físicas de estoque.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs uppercase tracking-wider bg-slate-50/20">
                    <th className="px-6 py-4">Data / Hora</th>
                    <th className="px-6 py-4">Produto SKU</th>
                    <th className="px-6 py-4">Fluxo</th>
                    <th className="px-6 py-4 text-center">Quantidade</th>
                    <th className="px-6 py-4">Motivo / Operação</th>
                    <th className="px-6 py-4">Anotações / Descrição</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMovs.map((m) => {
                    const isEntrada = m.tipo === 'Entrada';
                    const isSaida = m.tipo === 'Saída';

                    return (
                      <tr key={m.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition text-xs">
                        {/* Date */}
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(m.data_movimentacao).toLocaleString()}</span>
                          </div>
                        </td>

                        {/* Product SKU */}
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-800">{m.produto_nome}</div>
                          <span className="font-mono text-[10px] text-slate-400 mt-0.5 block">
                            SKU: {m.produto_sku}
                          </span>
                        </td>

                        {/* Flow Badge */}
                        <td className="px-6 py-4">
                          {isEntrada ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-150 rounded-full font-bold text-[10px]">
                              <ArrowUpRight className="w-3 h-3" />
                              ENTRADA
                            </span>
                          ) : isSaida ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-150 rounded-full font-bold text-[10px]">
                              <ArrowDownLeft className="w-3 h-3" />
                              SAÍDA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-150 rounded-full font-bold text-[10px]">
                              AJUSTE
                            </span>
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="px-6 py-4 text-center font-bold text-sm text-slate-800">
                          {isEntrada ? '+' : isSaida ? '-' : ''}{m.quantidade}
                        </td>

                        {/* Reason */}
                        <td className="px-6 py-4 font-semibold text-slate-700">
                          {m.motivo}
                        </td>

                        {/* Observation & User */}
                        <td className="px-6 py-4 text-slate-500 max-w-xs truncate" title={m.observacao}>
                          <div>{m.observacao || 'Nenhuma anotação'}</div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1">
                            <User className="w-3 h-3 shrink-0" />
                            <span>Operador: {m.usuario_id}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* TAB: NOTAS FISCAIS LIST */
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
          {filteredNfs.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-semibold text-slate-700">Nenhuma Nota Fiscal catalogada</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Carregue arquivos XML NF-e no painel de Lançamento em Lote para visualizar as notas arquivadas aqui.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs uppercase tracking-wider bg-slate-50/20">
                    <th className="px-6 py-4">Data Registro</th>
                    <th className="px-6 py-4">Chave de Acesso</th>
                    <th className="px-6 py-4">Nº Nota / Série</th>
                    <th className="px-6 py-4">Fornecedor</th>
                    <th className="px-6 py-4 text-right">Valor Total</th>
                    <th className="px-6 py-4 text-center">Código XML</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNfs.map((n) => (
                    <tr key={n.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition text-xs">
                      {/* Date */}
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {n.created_at ? new Date(n.created_at).toLocaleDateString() : 'Desconhecida'}
                      </td>

                      {/* Access Key */}
                      <td className="px-6 py-4">
                        <span className="font-mono text-[10px] bg-slate-50 p-1 rounded border border-slate-100 break-all select-all block max-w-xs">
                          {n.chave_nfe}
                        </span>
                      </td>

                      {/* Number / Series */}
                      <td className="px-6 py-4 font-semibold text-slate-800">
                        Nº {n.numero_nf} • Série {n.serie}
                      </td>

                      {/* Supplier */}
                      <td className="px-6 py-4 font-medium text-slate-700">
                        {n.fornecedor_nome}
                      </td>

                      {/* Total Value */}
                      <td className="px-6 py-4 text-right font-bold text-emerald-600 font-mono">
                        R$ {n.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      {/* XML Code preview icon */}
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => setSelectedNf(n)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-[11px] transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspecionar XML</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* XML Code Viewer Modal */}
      {selectedNf && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-3xl w-full overflow-hidden animate-scale-up flex flex-col h-[550px]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-5/50 shrink-0">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="font-semibold text-slate-800 text-sm">Visualizador de Código XML NF-e</h3>
                  <span className="text-[11px] text-slate-500 block">Chave: {selectedNf.chave_nfe}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedNf(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-950 p-4 font-mono text-[11px] text-slate-300 leading-relaxed scrollbar-thin">
              <pre className="whitespace-pre">{selectedNf.xml_armazenado}</pre>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-between items-center text-xs">
              <span className="text-slate-500">Valor Total Registrado: <strong className="text-emerald-700">R$ {selectedNf.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
              <button
                onClick={() => setSelectedNf(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition cursor-pointer"
              >
                Fechar Visualizador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
