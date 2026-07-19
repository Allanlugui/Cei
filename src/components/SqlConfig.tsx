import React, { useState, useEffect } from 'react';
import { Database, DbLog } from '../utils/database';
import { SUPABASE_SQL_SCRIPT } from '../utils/supabaseSql';
import { 
  Database as DbIcon, ShieldCheck, Copy, Check, Terminal, 
  RefreshCw, Trash2, Globe, ShieldAlert, Activity, CheckCircle2, ServerCrash 
} from 'lucide-react';

export default function SqlConfig() {
  const [copied, setCopied] = useState(false);
  const [logs, setLogs] = useState<DbLog[]>([]);
  const [supabaseUrl, setSupabaseUrl] = useState(() => localStorage.getItem('supa_url') || '');
  const [supabaseKey, setSupabaseKey] = useState(() => localStorage.getItem('supa_key') || '');
  const [isSaved, setIsSaved] = useState(false);

  // Trigger health check state
  const [auditResult, setAuditResult] = useState(() => ({
    status: 'HEALTHY',
    latencyMs: 0,
    checks: {
      nonNegativeTrigger: { status: 'PASS', message: 'Inicializando...' },
      autoStockUpdate: { status: 'PASS', message: 'Inicializando...' }
    }
  }));
  const [auditing, setAuditing] = useState(false);

  const handleRunAudit = () => {
    setAuditing(true);
    setTimeout(() => {
      const res = Database.runTriggerHealthCheck();
      setAuditResult(res);
      setAuditing(false);
      Database.addLog('SUCCESS', 'Auditoria manual de integridade de triggers executada com sucesso.');
    }, 600);
  };

  useEffect(() => {
    // Run initial trigger integrity audit on mount after rendering completes
    const res = Database.runTriggerHealthCheck();
    setAuditResult(res);
  }, []);

  useEffect(() => {
    // Poll logs every 2 seconds or update on state change
    const updateLogs = () => {
      setLogs(Database.getLogs());
    };
    updateLogs();
    const interval = setInterval(updateLogs, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SUPABASE_SQL_SCRIPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Falha ao copiar:', err);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('supa_url', supabaseUrl);
    localStorage.setItem('supa_key', supabaseKey);
    setIsSaved(true);
    Database.addLog('SUCCESS', 'Credenciais do Supabase salvas localmente.', `URL: ${supabaseUrl || 'Nenhum'}`);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleClearLogs = () => {
    Database.clearLogs();
    setLogs([]);
  };

  const handleResetDb = () => {
    if (window.confirm('Tem certeza que deseja redefinir o banco de dados para os valores padrão de fábrica? Isso removerá as notas fiscais importadas e movimentações customizadas.')) {
      Database.resetToDefault();
      setLogs(Database.getLogs());
      alert('Banco de dados redefinido com sucesso!');
    }
  };

  return (
    <div id="sql-config-view" className="space-y-6">
      {/* Intro Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <DbIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Arquitetura de Banco de Dados & Supabase</h1>
            <p className="text-slate-500 text-sm mt-1">
              O CEI funciona de forma offline-first por padrão, simulando com precisão de transações triggers SQL de integridade. Configure sua chave Supabase ou copie o script SQL pronto para produção abaixo.
            </p>
          </div>
        </div>
        <button
          onClick={handleResetDb}
          className="px-4 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 border border-rose-100 rounded-xl transition duration-150 ease-in-out cursor-pointer"
        >
          Redefinir Banco de Dados
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Supabase Connection Settings & Terminal Logs */}
        <div className="lg:col-span-5 space-y-6">
          {/* Health Check Box */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 font-medium text-slate-800">
                <Activity className="w-5 h-5 text-emerald-500" />
                <span>Auditor de Triggers Ativos</span>
              </div>
              <button
                onClick={handleRunAudit}
                disabled={auditing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-50 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${auditing ? 'animate-spin' : ''}`} />
                <span>{auditing ? 'Auditando...' : 'Testar Agora'}</span>
              </button>
            </div>

            {/* Status overview */}
            <div className="flex items-center gap-3 p-3.5 rounded-xl border bg-slate-50/50">
              {auditResult.status !== 'FAILED' ? (
                <>
                  <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">Status de Integridade</span>
                    <span className="text-sm font-bold text-slate-800">SISTEMA APTO (100% PASS)</span>
                    <span className="text-[10px] text-slate-400 block font-mono">Latência de simulação: {auditResult.latencyMs}ms</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-10 h-10 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 border border-rose-100 shrink-0">
                    <ServerCrash className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold block uppercase tracking-wider">Status de Integridade</span>
                    <span className="text-sm font-bold text-rose-600">FALHA DETECTADA</span>
                    <span className="text-[10px] text-slate-400 block font-mono">Latência de simulação: {auditResult.latencyMs}ms</span>
                  </div>
                </>
              )}
            </div>

            {/* Sub-checks lists */}
            <div className="space-y-2.5 text-xs">
              {/* Check 1: Non-negative stock */}
              <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-slate-700 block">Trigger: Impedir Estoque Negativo</span>
                  <span className="text-[10px] text-slate-400 block leading-normal">Impede saídas manuais ou via XML além do saldo físico</span>
                </div>
                <span className={`px-2 py-0.5 font-bold text-[10px] rounded-lg border shrink-0 ${
                  auditResult.checks.nonNegativeTrigger.status === 'PASS'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-rose-50 border-rose-100 text-rose-700'
                }`}>
                  {auditResult.checks.nonNegativeTrigger.status}
                </span>
              </div>

              {/* Check 2: Auto stock calculation */}
              <div className="p-3 bg-white border border-slate-100 rounded-xl flex items-center justify-between">
                <div className="min-w-0 pr-2">
                  <span className="font-semibold text-slate-700 block">Trigger: Recalcular CMP de Lançamento</span>
                  <span className="text-[10px] text-slate-400 block leading-normal">Atualiza o Custo Médio e volume do SKU em transações</span>
                </div>
                <span className={`px-2 py-0.5 font-bold text-[10px] rounded-lg border shrink-0 ${
                  auditResult.checks.autoStockUpdate.status === 'PASS'
                    ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                    : 'bg-rose-50 border-rose-100 text-rose-700'
                }`}>
                  {auditResult.checks.autoStockUpdate.status}
                </span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 mb-4 text-slate-800 font-medium border-b border-slate-100 pb-3">
              <Globe className="w-5 h-5 text-emerald-500" />
              <span>Conexão Supabase Real (Opcional)</span>
            </div>
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">SUPABASE_URL</label>
                <input
                  type="text"
                  placeholder="https://suaproj.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">SUPABASE_ANON_KEY</label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400">
                  {supabaseUrl && supabaseKey ? '🟢 Chaves salvas' : '⚪ Usando Banco Local Simulado'}
                </span>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition duration-150 ease-in-out cursor-pointer"
                >
                  {isSaved ? 'Salvo!' : 'Salvar Chaves'}
                </button>
              </div>
            </form>
          </div>

          {/* Interactive Logs Terminal */}
          <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-lg overflow-hidden flex flex-col h-[400px]">
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-mono font-medium text-slate-300">Auditoria do Banco de Dados</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleClearLogs}
                  className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="Limpar logs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs font-mono text-emerald-500 font-semibold uppercase animate-pulse">● LIVE</span>
              </div>
            </div>
            
            <div className="p-4 font-mono text-[11px] leading-relaxed overflow-y-auto flex-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-800">
              {logs.length === 0 ? (
                <div className="text-slate-500 text-center py-12">Nenhum evento registrado.</div>
              ) : (
                logs.map((log) => {
                  let colorClass = 'text-emerald-400';
                  let bgClass = 'bg-emerald-950/40 border-emerald-900/50';
                  
                  if (log.tipo === 'ERROR') {
                    colorClass = 'text-rose-400 font-bold';
                    bgClass = 'bg-rose-950/40 border-rose-900/50';
                  } else if (log.tipo === 'TRIGGER') {
                    colorClass = 'text-amber-400';
                    bgClass = 'bg-amber-950/40 border-amber-900/50';
                  } else if (log.tipo === 'SQL') {
                    colorClass = 'text-sky-400';
                    bgClass = 'bg-sky-950/40 border-sky-900/50';
                  }

                  return (
                    <div key={log.id} className={`p-2.5 rounded-lg border ${bgClass}`}>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span>[{log.tipo}]</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div className={colorClass}>{log.mensagem}</div>
                      {log.detalhes && (
                        <div className="text-[10px] text-slate-400 mt-1 border-t border-slate-800 pt-1">
                          {log.detalhes}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* SQL Script Viewer */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[585px]">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <span className="font-semibold text-slate-800 block text-sm">Scripts SQL para o Supabase</span>
                <span className="text-xs text-slate-500">Esquema, triggers de estoque seguro e CMP automático</span>
              </div>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-medium transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copiar SQL</span>
                </>
              )}
            </button>
          </div>
          
          <div className="flex-1 overflow-auto bg-slate-950 p-4 font-mono text-[11px] text-slate-300 leading-relaxed">
            <pre className="whitespace-pre">{SUPABASE_SQL_SCRIPT}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
