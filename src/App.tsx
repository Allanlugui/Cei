import React, { useState, useEffect } from 'react';
import { Database } from './utils/database';
import { Produto } from './types';
import { isSupabaseConfigured } from './utils/supabaseClient';
import Dashboard from './components/Dashboard';
import Products from './components/Products';
import NfeParser from './components/NfeParser';
import Movements from './components/Movements';
import Suppliers from './components/Suppliers';
import SqlConfig from './components/SqlConfig';
import { 
  LayoutDashboard, Layers, FileCode2, History, 
  Building2, Database as DbIcon, Terminal, RefreshCcw,
  Menu, X, Keyboard, Activity
} from 'lucide-react';

type TabType = 'dashboard' | 'products' | 'nfe' | 'movements' | 'suppliers' | 'sql';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [restockProduct, setRestockProduct] = useState<Produto | null>(null);
  
  // Mobile responsive layout state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showShortcutTip, setShowShortcutTip] = useState(true);

  // Vercel Standby Mode states
  const [showVercelStandbyModal, setShowVercelStandbyModal] = useState(false);
  const [bypassVercelCheck, setBypassVercelCheck] = useState(false);

  // Helper to force data reload in all components
  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // 1. Subscribe to the Database pattern for Instant UI Reactivity
  useEffect(() => {
    const unsubscribe = Database.subscribe(() => {
      triggerRefresh();
    });
    return () => unsubscribe();
  }, []);

  // 1.1 Register Database Write Filter for Vercel Standby Mode
  useEffect(() => {
    Database.registerWriteFilter(() => {
      if (!isSupabaseConfigured() && !bypassVercelCheck) {
        setShowVercelStandbyModal(true);
        return false;
      }
      return true;
    });
    return () => {
      Database.registerWriteFilter(() => true);
    };
  }, [bypassVercelCheck]);

  // 2. Keyboard Shortcuts listener (Alt + key) for Power Operators
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'd') {
          e.preventDefault();
          setActiveTab('dashboard');
          setIsMobileMenuOpen(false);
          Database.addLog('SUCCESS', 'Atalho [Alt + D] acionado: Painel Geral carregado.');
        } else if (key === 'e' || key === 'p') {
          e.preventDefault();
          setActiveTab('products');
          setIsMobileMenuOpen(false);
          Database.addLog('SUCCESS', 'Atalho [Alt + P] acionado: Estoque & SKUs carregado.');
        } else if (key === 'n') {
          e.preventDefault();
          setActiveTab('nfe');
          setIsMobileMenuOpen(false);
          Database.addLog('SUCCESS', 'Atalho [Alt + N] acionado: Importador XML/NF-e carregado.');
        } else if (key === 'l' || key === 'm') {
          e.preventDefault();
          setActiveTab('movements');
          setIsMobileMenuOpen(false);
          Database.addLog('SUCCESS', 'Atalho [Alt + L] acionado: Livro de Registro carregado.');
        } else if (key === 's' || key === 'f') {
          e.preventDefault();
          setActiveTab('suppliers');
          setIsMobileMenuOpen(false);
          Database.addLog('SUCCESS', 'Atalho [Alt + S] acionado: Fornecedores carregado.');
        } else if (key === 't' || key === 'b') {
          e.preventDefault();
          setActiveTab('sql');
          setIsMobileMenuOpen(false);
          Database.addLog('SUCCESS', 'Atalho [Alt + T] acionado: Painel SQL & Auditoria carregado.');
        } else if (key === 'a') {
          e.preventDefault();
          const check = Database.runTriggerHealthCheck();
          Database.addLog('SUCCESS', `Atalho [Alt + A] acionado: Auditoria de Triggers concluída com Status: ${check.status}`);
          alert(`[AUDITORIA CEI] Status: ${check.status} (${check.latencyMs}ms)\n- Trava Não-Negativa: ${check.checks.nonNegativeTrigger.status}\n- CMP Automático: ${check.checks.autoStockUpdate.status}`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quick Restock handler from Dashboard to Products Tab
  const handleQuickRestock = (prod: Produto) => {
    setRestockProduct(prod);
    setActiveTab('products');
  };

  // Monitor if a restock was requested
  useEffect(() => {
    if (activeTab === 'products' && restockProduct) {
      // Find the element on screen or let the component open its modal
      const interval = setTimeout(() => {
        const btn = document.querySelector(`[title="Lançar entrada/saída manualmente"]`);
        if (btn) {
          // Trigger movement modal internally by passing it
        }
      }, 100);
      return () => clearTimeout(interval);
    }
  }, [activeTab, restockProduct]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-800 antialiased font-sans">
      {/* 1. SIDEBAR NAVIGATION */}
      <aside className={`w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 transition-all duration-300 ${
        isMobileMenuOpen ? 'flex' : 'hidden md:flex'
      }`}>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 font-black text-lg shadow-md shadow-emerald-500/20">
              C
            </div>
            <div>
              <h1 className="font-bold text-white text-sm leading-tight uppercase tracking-wider">CEI Estoque</h1>
              <span className="text-[10px] text-emerald-400 font-semibold font-mono uppercase tracking-widest block">Vibe Code ERP</span>
            </div>
          </div>

          {/* Close button inside drawer for mobile */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition md:hidden cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {/* Painel Geral */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-150 cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Painel Geral (KPIs)</span>
          </button>

          {/* Estoque e SKUs */}
          <button
            onClick={() => setActiveTab('products')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-150 cursor-pointer ${
              activeTab === 'products'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Estoque & SKUs</span>
          </button>

          {/* Importação NF-e */}
          <button
            onClick={() => setActiveTab('nfe')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-150 cursor-pointer ${
              activeTab === 'nfe'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <FileCode2 className="w-4 h-4" />
            <span>Lançamento NF-e (XML)</span>
          </button>

          {/* Livro de Movimentações */}
          <button
            onClick={() => setActiveTab('movements')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-150 cursor-pointer ${
              activeTab === 'movements'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Livro de Registro</span>
          </button>

          {/* Fornecedores */}
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-150 cursor-pointer ${
              activeTab === 'suppliers'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Fornecedores</span>
          </button>

          {/* Banco & SQL */}
          <button
            onClick={() => setActiveTab('sql')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition duration-150 cursor-pointer ${
              activeTab === 'sql'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/10'
                : 'hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <DbIcon className="w-4 h-4" />
            <span>Banco de Dados & SQL</span>
          </button>
        </nav>

        {/* Database Integrity Indicator Bottom Box */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40 text-xs">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-slate-400 font-mono text-[10px]">INTEGRIDADE ATIVA</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-normal mb-3">
            Garantia de Estoque Não-Negativo e Triggers Contábeis funcionando localmente via localStorage.
          </p>
          <button
            onClick={() => {
              Database.resetToDefault();
              triggerRefresh();
              alert('Banco de dados redefinido com sucesso!');
            }}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition text-[10px] font-semibold cursor-pointer"
          >
            <RefreshCcw className="w-3 h-3" />
            <span>Limpar Dados de Teste</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-100 px-6 py-4 shrink-0 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            {/* Mobile menu toggle button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-slate-50 text-slate-600 active:bg-slate-100 rounded-xl transition md:hidden cursor-pointer"
              title="Alternar menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Terminal className="w-4 h-4 text-emerald-600 hidden sm:block" />
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest">
              Controle de Estoque Interativo
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="text-right hidden sm:block">
              <span className="font-semibold text-slate-700 block">Operador Central</span>
              <span className="text-slate-400 text-[10px]">usr_estoquista_principal</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">
              EP
            </div>
          </div>
        </header>

        {/* Workspace Body */}
        <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-6">
          {/* Vercel Standby Mode Banner */}
          {!isSupabaseConfigured() && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-xl flex items-start gap-3 shadow-sm text-xs">
              <Activity className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <h3 className="font-bold text-amber-800 flex items-center gap-1.5">
                  Modo de Espera Seguro Vercel Ativo
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-850 font-bold text-[9px] rounded-full">SANDBOX LOCAL</span>
                </h3>
                <p className="text-amber-750 mt-1 leading-normal font-medium">
                  Para habilitar a sincronização PostgreSQL permanente em produção na Vercel, preencha as variáveis de ambiente globais <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-900">SUPABASE_URL</code> e <code className="bg-amber-100 px-1 py-0.5 rounded font-mono font-bold text-amber-900">SUPABASE_ANON_KEY</code> no seu painel.
                </p>
                {bypassVercelCheck ? (
                  <span className="inline-block mt-2 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100">
                    ✓ Desvio temporário ativo: Escrevendo no simulador local.
                  </span>
                ) : (
                  <span className="inline-block mt-2 font-bold text-amber-700 bg-amber-100/50 px-2.5 py-0.5 rounded-lg border border-amber-100">
                    ⚠️ Operações de escrita estão protegidas/bloqueadas por segurança.
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Keyboard Shortcuts Helper Bar */}
          {showShortcutTip && (
            <div className="hidden lg:flex items-center justify-between bg-emerald-950 text-emerald-250 px-4 py-3 rounded-2xl border border-emerald-900/60 shadow-sm animate-fade-in text-xs">
              <div className="flex items-center gap-2.5">
                <Keyboard className="w-4.5 h-4.5 text-emerald-400 animate-bounce" />
                <div>
                  <strong className="font-semibold text-white">Atalhos Rápidos de Operador Habilitados:</strong>{' '}
                  <span className="opacity-90">
                    Use <kbd className="bg-emerald-900 px-1.5 py-0.5 rounded font-mono text-white text-[10px] font-bold">Alt + D</kbd> (KPIs) •{' '}
                    <kbd className="bg-emerald-900 px-1.5 py-0.5 rounded font-mono text-white text-[10px] font-bold">Alt + P</kbd> (Estoque) •{' '}
                    <kbd className="bg-emerald-900 px-1.5 py-0.5 rounded font-mono text-white text-[10px] font-bold">Alt + N</kbd> (XML) •{' '}
                    <kbd className="bg-emerald-900 px-1.5 py-0.5 rounded font-mono text-white text-[10px] font-bold">Alt + L</kbd> (Histórico) •{' '}
                    <kbd className="bg-emerald-900 px-1.5 py-0.5 rounded font-mono text-white text-[10px] font-bold">Alt + T</kbd> (Config SQL) •{' '}
                    <kbd className="bg-emerald-900 px-1.5 py-0.5 rounded font-mono text-white text-[10px] font-bold">Alt + A</kbd> (Auditar Triggers)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowShortcutTip(false)}
                className="text-emerald-400 hover:text-white font-semibold transition px-2 py-1 bg-emerald-900/30 rounded-lg cursor-pointer"
              >
                Dispensar
              </button>
            </div>
          )}

          {/* Active View Container with slide effect */}
          <div className="animate-fade-in">
            {activeTab === 'dashboard' && (
              <Dashboard 
                refreshTrigger={refreshTrigger} 
                onQuickRestockClick={handleQuickRestock} 
              />
            )}
            
            {activeTab === 'products' && (
              <Products 
                refreshTrigger={refreshTrigger} 
              />
            )}
            
            {activeTab === 'nfe' && (
              <NfeParser 
                onImportSuccess={() => {
                  triggerRefresh();
                  setActiveTab('dashboard');
                }} 
              />
            )}
            
            {activeTab === 'movements' && (
              <Movements 
                refreshTrigger={refreshTrigger} 
              />
            )}
            
            {activeTab === 'suppliers' && (
              <Suppliers 
                refreshTrigger={refreshTrigger} 
              />
            )}
            
            {activeTab === 'sql' && (
              <SqlConfig />
            )}
          </div>
        </div>
      </main>

      {/* VERCEL SECURE STANDBY MODAL / SCREEN */}
      {showVercelStandbyModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl border border-slate-100 max-w-xl w-full p-8 shadow-2xl relative overflow-hidden">
            {/* Decorative colored top bar */}
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-amber-500 to-rose-500"></div>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-100 shrink-0">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] text-amber-600 font-bold tracking-wider block uppercase font-mono">Modo de Espera Seguro</span>
                <h2 className="text-xl font-black text-slate-800">Conexão Supabase Pendente</h2>
              </div>
            </div>

            <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
              <p>
                O Controle de Estoque Interativo (CEI) está configurado para ler obrigatoriamente as chaves de comunicação de produção a partir do painel de controle da <strong>Vercel</strong>.
              </p>
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100/80 font-medium text-slate-700 flex items-start gap-2.5">
                <span className="text-rose-500 font-bold shrink-0 mt-0.5">⚠️</span>
                <span>A operação que você tentou realizar exige um estado persistente ativo ou autorização de infraestrutura.</span>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
                <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Como resolver no Painel da Vercel:</h3>
                <ol className="list-decimal list-inside space-y-2 text-xs font-medium text-slate-600">
                  <li>Acesse o seu projeto no dashboard da <strong className="text-slate-800">Vercel</strong>.</li>
                  <li>Vá em <strong className="text-slate-800">Settings &gt; Environment Variables</strong>.</li>
                  <li>Adicione as seguintes variáveis de ambiente globais:
                    <div className="mt-2 space-y-1.5 font-mono text-[11px]">
                      <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-lg border">
                        <span className="text-slate-400">Var:</span>
                        <strong className="text-slate-800">SUPABASE_URL</strong>
                        <span className="ml-auto text-rose-500 font-bold">Ausente ❌</span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-100 px-2.5 py-1 rounded-lg border">
                        <span className="text-slate-400">Var:</span>
                        <strong className="text-slate-800">SUPABASE_ANON_KEY</strong>
                        <span className="ml-auto text-rose-500 font-bold">Ausente ❌</span>
                      </div>
                    </div>
                  </li>
                  <li>Salve as variáveis e execute um novo <strong className="text-slate-800">Redeploy</strong> na Vercel.</li>
                </ol>
              </div>
            </div>

            <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setBypassVercelCheck(true);
                  setShowVercelStandbyModal(false);
                  Database.addLog('SUCCESS', 'Operador ativou desvio temporário para Sandbox Local (localStorage).');
                }}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition cursor-pointer text-center"
              >
                Usar Sandbox Local
              </button>
              <button
                onClick={() => setShowVercelStandbyModal(false)}
                className="w-full sm:flex-1 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl text-xs transition cursor-pointer text-center"
              >
                Voltar para Consulta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
