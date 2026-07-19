import React, { useState, useEffect } from 'react';
import { Database } from '../utils/database';
import { Fornecedor } from '../types';
import { Building2, Search, Plus, Mail, Phone, Hash, Globe, FileSpreadsheet } from 'lucide-react';

export default function Suppliers({ refreshTrigger }: { refreshTrigger: number }) {
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [cnpj, setCnpj] = useState('');
  const [nomeFantasia, setNomeFantasia] = useState('');
  const [razaoSocial, setRazaoSocial] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, [refreshTrigger]);

  const loadSuppliers = () => {
    setFornecedores(Database.getFornecedores());
  };

  const handleOpenModal = (forn?: Fornecedor) => {
    setDbError(null);
    if (forn) {
      setEditingId(forn.id);
      setCnpj(forn.cnpj);
      setNomeFantasia(forn.nome_fantasia);
      setRazaoSocial(forn.razao_social);
      setEmail(forn.email);
      setTelefone(forn.telefone);
    } else {
      setEditingId(null);
      setCnpj('');
      setNomeFantasia('');
      setRazaoSocial('');
      setEmail('');
      setTelefone('');
    }
    setIsModalOpen(true);
  };

  const handleSaveFornecedor = (e: React.FormEvent) => {
    e.preventDefault();
    setDbError(null);

    // Basic Brazilian CNPJ formatting validation
    const cleanCnpj = cnpj.replace(/[^0-9]/g, '');
    if (cleanCnpj.length !== 14) {
      setDbError('O CNPJ deve conter exatamente 14 algarismos.');
      return;
    }

    try {
      Database.saveFornecedor({
        id: editingId || undefined,
        cnpj: formatCnpj(cnpj),
        nome_fantasia: nomeFantasia,
        razao_social: razaoSocial,
        email,
        telefone,
      });

      loadSuppliers();
      setIsModalOpen(false);
    } catch (err: any) {
      setDbError(err.message || 'Erro ao salvar fornecedor.');
    }
  };

  const formatCnpj = (raw: string): string => {
    const nums = raw.replace(/[^0-9]/g, '');
    if (nums.length === 14) {
      return `${nums.slice(0, 2)}.${nums.slice(2, 5)}.${nums.slice(5, 8)}/${nums.slice(8, 12)}-${nums.slice(12, 14)}`;
    }
    return raw;
  };

  const handleCnpjChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCnpj(val);
  };

  const filtered = fornecedores.filter(f => {
    return f.nome_fantasia.toLowerCase().includes(searchQuery.toLowerCase()) ||
           f.razao_social.toLowerCase().includes(searchQuery.toLowerCase()) ||
           f.cnpj.includes(searchQuery) ||
           f.email.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* Filters and Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar fornecedores por CNPJ, nome, e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <button
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition duration-150 ease-in-out cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Fornecedor</span>
        </button>
      </div>

      {/* Grid of Suppliers Cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center text-slate-500">
          <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700">Nenhum fornecedor localizado</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
            Cadastre novos fornecedores de mercadorias ou efetue importação de NF-e para registrá-los automaticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hover:shadow-md hover:border-slate-200/80 transition flex flex-col justify-between group">
              <div>
                <div className="flex items-start justify-between gap-4 border-b border-slate-50 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2.5 bg-slate-50 text-slate-600 rounded-xl group-hover:bg-emerald-50 group-hover:text-emerald-600 transition">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition">
                        {f.nome_fantasia}
                      </h3>
                      <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                        CNPJ: {f.cnpj}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleOpenModal(f)}
                    className="text-xs font-semibold text-slate-400 hover:text-slate-700 hover:bg-slate-50 px-2 py-1 rounded border border-transparent hover:border-slate-100 transition cursor-pointer"
                  >
                    Editar
                  </button>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate" title={f.razao_social}>
                      <strong>Razão Social:</strong> {f.razao_social}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">
                      <strong>E-mail:</strong> {f.email || 'Não informado'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      <strong>Contato:</strong> {f.telefone || 'Não informado'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3.5 border-t border-slate-50 flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <span>ERP CEI VENDOR</span>
                <span className="text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded font-mono">
                  ATIVO
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==============================================
          MODAL: FORNECEDOR FORM
          ============================================== */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-5/50">
              <h3 className="font-semibold text-slate-800 text-base">
                {editingId ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveFornecedor} className="p-6 space-y-4">
              {dbError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-medium">
                  {dbError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">CNPJ (14 dígitos) *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: 11222333000144"
                  maxLength={18}
                  value={cnpj}
                  onChange={handleCnpjChange}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Nome Fantasia *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Logitech Brasil"
                  value={nomeFantasia}
                  onChange={(e) => setNomeFantasia(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Razão Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Logitech Equipamentos do Brasil Ltda"
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">E-mail</label>
                  <input
                    type="email"
                    placeholder="contato@fornecedor.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Telefone Comercial</label>
                  <input
                    type="text"
                    placeholder="Ex: (11) 3003-1122"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition cursor-pointer"
                >
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
