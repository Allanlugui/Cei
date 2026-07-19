import React, { useState, useEffect } from 'react';
import { Database } from '../utils/database';
import { Produto, Movimentacao } from '../types';
import { 
  BarChart, Bar, Cell, PieChart, Pie, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, ShieldAlert, Package, Landmark, 
  ArrowUpRight, ArrowDownLeft, AlertCircle, Play, Sparkles 
} from 'lucide-react';

export default function Dashboard({ 
  refreshTrigger, 
  onQuickRestockClick 
}: { 
  refreshTrigger: number;
  onQuickRestockClick: (prod: Produto) => void;
}) {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [movs, setMovs] = useState<Movimentacao[]>([]);

  useEffect(() => {
    setProdutos(Database.getProdutos());
    setMovs(Database.getMovimentacoes());
  }, [refreshTrigger]);

  // --- CALCULATE ANALYTICAL METRICS ---
  const totalSkus = produtos.length;
  const lowStockProducts = produtos.filter(p => p.estoque_atual <= p.estoque_minimo);
  const lowStockCount = lowStockProducts.length;
  
  const totalPhysicalStock = produtos.reduce((sum, p) => sum + p.estoque_atual, 0);
  
  const totalFinancialValuation = produtos.reduce(
    (sum, p) => sum + (p.estoque_atual * p.preco_custo), 0
  );

  // --- PREPARE CHART DATA: FINANCIAL VALUATION BY CATEGORY ---
  const categoryDataMap: Record<string, number> = {};
  produtos.forEach(p => {
    const val = p.estoque_atual * p.preco_custo;
    if (categoryDataMap[p.categoria]) {
      categoryDataMap[p.categoria] += val;
    } else {
      categoryDataMap[p.categoria] = val;
    }
  });

  const categoryChartData = Object.keys(categoryDataMap).map(cat => ({
    name: cat,
    value: parseFloat(categoryDataMap[cat].toFixed(2)),
  })).filter(item => item.value > 0);

  // --- PREPARE CHART DATA: RECENT TRANSACTION FLUX (LAST 5 DAYS) ---
  const fluxDataMap: Record<string, { Entrada: number; Saída: number }> = {};
  
  // Initialize last 5 days
  for (let i = 4; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    fluxDataMap[label] = { Entrada: 0, Saída: 0 };
  }

  // Populate days
  movs.forEach(m => {
    const dateLabel = new Date(m.data_movimentacao).toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit' 
    });
    if (fluxDataMap[dateLabel]) {
      if (m.tipo === 'Entrada') {
        fluxDataMap[dateLabel].Entrada += m.quantidade;
      } else if (m.tipo === 'Saída') {
        fluxDataMap[dateLabel].Saída += m.quantidade;
      }
    }
  });

  const fluxChartData = Object.keys(fluxDataMap).map(key => ({
    date: key,
    Entrada: fluxDataMap[key].Entrada,
    Saída: fluxDataMap[key].Saída,
  }));

  // Chart Colors
  const COLORS = ['#059669', '#0284c7', '#d97706', '#7c3aed', '#db2777', '#4b5563'];

  return (
    <div className="space-y-6">
      {/* 4 Core KPIs Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Catalog Items */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider block">SKUs Catalogados</span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">{totalSkus}</span>
            <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Produtos únicos ativos</span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <Package className="w-5 h-5" />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between transition ${
          lowStockCount > 0 
            ? 'bg-rose-50 border-rose-100' 
            : 'bg-white border-slate-100'
        }`}>
          <div>
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider block">Alertas de Reposição</span>
            <span className={`text-2xl font-bold mt-1 block ${lowStockCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {lowStockCount}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Estoque abaixo do mínimo</span>
          </div>
          <div className={`p-3 rounded-xl ${
            lowStockCount > 0 ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-600'
          }`}>
            <ShieldAlert className="w-5 h-5" />
          </div>
        </div>

        {/* Total Stock Volume */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider block">Volume de Estoque</span>
            <span className="text-2xl font-bold text-slate-800 mt-1 block">{totalPhysicalStock}</span>
            <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Unidades físicas totais</span>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Financial Valuation of stock */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-slate-400 font-semibold text-xs uppercase tracking-wider block">Patrimônio de Estoque</span>
            <span className="text-2xl font-bold text-emerald-600 mt-1 block">
              R$ {totalFinancialValuation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5 block font-medium">Soma de (Qtd. * Custo CMP)</span>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Landmark className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Primary Grid: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recharts Bar Chart - Entries & Exits */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[350px]">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Giro e Fluxos Recentes (Entradas vs Saídas)</h3>
            <p className="text-xs text-slate-400 mt-0.5">Histórico volumétrico dos últimos 5 dias</p>
          </div>
          <div className="flex-1 min-h-0 text-[11px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fluxChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} stroke="#94a3b8" />
                <YAxis tickLine={false} axisLine={false} stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Entrada" name="Entradas (+)" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Saída" name="Saídas (-)" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recharts Pie Chart - Valuation by Category */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[350px]">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800 text-sm">Divisão Patrimonial por Categoria</h3>
            <p className="text-xs text-slate-400 mt-0.5">Participação financeira das mercadorias</p>
          </div>
          <div className="flex-1 min-h-0 text-[11px] relative">
            {categoryChartData.length === 0 ? (
              <div className="text-center py-20 text-slate-400 text-xs">Aguardando dados...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChartData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {categoryChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => `R$ ${value.toLocaleString('pt-BR')}`}
                    contentStyle={{ background: '#0f172a', borderRadius: '12px', border: 'none', color: '#fff' }}
                  />
                  <Legend iconType="circle" layout="horizontal" align="center" wrapperStyle={{ fontSize: '9px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Grid: Action boards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Understocked Items Action Board */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-1.5">
                <AlertCircle className="w-4.5 h-4.5 text-rose-500" />
                <span>Painel de Reposição Crítica</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Estoque atual menor ou igual ao estoque mínimo de segurança</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-rose-50 text-rose-700 rounded-lg border border-rose-150 animate-pulse">
              {lowStockCount} alertas
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar-thin scrollbar-thumb-slate-100">
            {lowStockCount === 0 ? (
              <div className="text-center py-24 text-slate-400 text-xs">
                ✨ Todos os níveis de estoque estão dentro da margem de segurança!
              </div>
            ) : (
              lowStockProducts.map(p => (
                <div key={p.id} className="p-3 bg-slate-50 hover:bg-slate-100/60 rounded-xl border border-slate-100 flex items-center justify-between gap-3 transition">
                  <div className="min-w-0">
                    <span className="font-bold text-slate-800 text-xs block truncate">{p.nome}</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[9px] bg-white text-slate-500 border border-slate-200 px-1 py-0.2 rounded font-semibold">
                        SKU: {p.sku}
                      </span>
                      <span className="text-[9px] text-rose-600 font-semibold uppercase tracking-wider">
                        Déficit: {p.estoque_minimo - p.estoque_atual} un
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold text-rose-600 block">{p.estoque_atual} un</span>
                      <span className="text-[9px] text-slate-400 font-medium block">Mínimo: {p.estoque_minimo} un</span>
                    </div>
                    <button
                      onClick={() => onQuickRestockClick(p)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] rounded-lg transition shadow-xs flex items-center gap-1 cursor-pointer"
                      title="Abastecer estoque"
                    >
                      <span>Restock</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions Feed */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col h-[380px]">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Registro de Atividades Recentes</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Últimas 5 movimentações contabilizadas em banco</p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Lançamentos</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
            {movs.length === 0 ? (
              <div className="text-center py-24 text-slate-400 text-xs">Nenhuma movimentação realizada.</div>
            ) : (
              movs.slice(0, 5).map(m => {
                const isEntrada = m.tipo === 'Entrada';
                return (
                  <div key={m.id} className="p-3 bg-white hover:bg-slate-50/50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 transition">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`p-1.5 rounded-lg shrink-0 ${
                        isEntrada ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                        {isEntrada ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <span className="font-semibold text-slate-800 text-xs block truncate">{m.produto_nome}</span>
                        <div className="flex items-center gap-2 text-[9px] text-slate-400 mt-0.5">
                          <span>{m.motivo}</span>
                          <span>•</span>
                          <span>{new Date(m.data_movimentacao).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`font-mono text-xs font-bold shrink-0 ${
                      isEntrada ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {isEntrada ? '+' : '-'}{m.quantidade} un
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
