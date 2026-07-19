import React, { useState, useRef } from 'react';
import { parseNfeXml, generateSampleNfeXml, ParsedNfe } from '../utils/xmlParser';
import { Database } from '../utils/database';
import { FileUp, Info, FileCode, CheckCircle, AlertTriangle, Play, Sparkles, Building2, Package, ArrowRight, DollarSign } from 'lucide-react';

export default function NfeParser({ onImportSuccess }: { onImportSuccess: () => void }) {
  const [xmlText, setXmlText] = useState('');
  const [parsedData, setParsedData] = useState<ParsedNfe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    notaNo: string;
    itensCount: number;
    novosCount: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load a mock XML string for fast testing
  const handleLoadSample = (index: number) => {
    try {
      const xml = generateSampleNfeXml(index);
      setXmlText(xml);
      const parsed = parseNfeXml(xml);
      setParsedData(parsed);
      setError(null);
      setSuccessResult(null);
      Database.addLog('SUCCESS', `XML de teste #${index + 1} gerado e parseado com sucesso.`);
    } catch (err: any) {
      setError(err.message || 'Erro ao parsear XML de exemplo.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setXmlText(text);
        const parsed = parseNfeXml(text);
        setParsedData(parsed);
        setError(null);
        setSuccessResult(null);
        Database.addLog('SUCCESS', `XML enviado pelo usuário lido com sucesso: "${file.name}"`);
      } catch (err: any) {
        setError(err.message || 'O arquivo enviado não é um XML válido ou está fora do padrão de NF-e.');
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setXmlText(text);
        const parsed = parseNfeXml(text);
        setParsedData(parsed);
        setError(null);
        setSuccessResult(null);
      } catch (err: any) {
        setError(err.message || 'O arquivo arrastado não é um XML válido.');
        setParsedData(null);
      }
    };
    reader.readAsText(file);
  };

  // Perform transaction import
  const handleCommitImport = () => {
    if (!parsedData) return;

    try {
      const result = Database.importNfe({
        ...parsedData,
        xmlString: xmlText,
      });

      setSuccessResult({
        notaNo: parsedData.numeroNf,
        itensCount: result.totalItensProcessados,
        novosCount: result.totalNovosProdutos,
      });

      setParsedData(null);
      setXmlText('');
      setError(null);
      
      // Trigger callback to refresh products lists in sibling components
      onImportSuccess();
    } catch (err: any) {
      setError(err.message || 'Erro de transação ao tentar gravar lançamentos.');
    }
  };

  // Check current stock metrics of products to show CMP simulation comparison
  const getProductCmpSimulation = (itemSku: string, purchasePrice: number) => {
    const dbProdutos = Database.getProdutos();
    const existing = dbProdutos.find(p => p.sku.toLowerCase() === itemSku.toLowerCase());

    if (!existing) {
      return {
        isNew: true,
        currentStock: 0,
        currentCost: 0,
        newCost: purchasePrice,
        diffPct: 0,
      };
    }

    const qAtual = existing.estoque_atual;
    const cAtual = existing.preco_custo;
    
    // Simulate CMP
    let simulatedCmp = purchasePrice;
    if (qAtual > 0) {
      simulatedCmp = parseFloat(
        (((qAtual * cAtual) + (1 * purchasePrice)) / (qAtual + 1)).toFixed(2)
      );
    }

    const diff = simulatedCmp - cAtual;
    const diffPct = cAtual > 0 ? (diff / cAtual) * 100 : 0;

    return {
      isNew: false,
      currentStock: qAtual,
      currentCost: cAtual,
      newCost: simulatedCmp,
      diffPct,
    };
  };

  return (
    <div id="nfe-parser-view" className="space-y-6">
      {/* Intro */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Importação de NF-e e Entrada em Lote</h1>
          <p className="text-slate-500 text-sm mt-1">
            Receba suas mercadorias instantaneamente! Arraste o arquivo XML da Nota Fiscal Eletrônica. O sistema automatiza o cadastro de fornecedores, insere novos produtos e recalcula o custo médio ponderado.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleLoadSample(0)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 rounded-xl transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nota Logitech (Demo)</span>
          </button>
          <button
            onClick={() => handleLoadSample(1)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-xl transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nota TecnoMax (Demo)</span>
          </button>
          <button
            onClick={() => handleLoadSample(2)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-100 rounded-xl transition cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Nota Office (Demo)</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-sm">Falha no Processamento</span>
            <span className="text-xs">{error}</span>
          </div>
        </div>
      )}

      {successResult && (
        <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 flex items-start gap-4 shadow-sm animate-fade-in">
          <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-base text-emerald-950">Lançamento em Lote Concluído!</h3>
            <p className="text-sm mt-1 text-emerald-800">
              A Nota Fiscal Eletrônica <strong className="font-semibold">#{successResult.notaNo}</strong> foi importada com absoluto rigor contábil.
            </p>
            <div className="flex gap-4 mt-3 text-xs">
              <span className="px-3 py-1 bg-emerald-100 border border-emerald-200 rounded-full font-medium text-emerald-800">
                ⚡ {successResult.itensCount} movimentações de entrada inseridas
              </span>
              {successResult.novosCount > 0 && (
                <span className="px-3 py-1 bg-sky-100 border border-sky-200 rounded-full font-medium text-sky-800">
                  🆕 {successResult.novosCount} novos produtos catalogados
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setSuccessResult(null)}
            className="text-xs text-emerald-600 hover:text-emerald-900 underline font-medium cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {!parsedData ? (
        /* File Upload Dropzone */
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="bg-white border-2 border-dashed border-slate-200 hover:border-emerald-500 hover:bg-slate-50/50 p-12 rounded-2xl flex flex-col items-center text-center cursor-pointer transition duration-200"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".xml"
            className="hidden"
          />
          <div className="p-4 bg-emerald-50 text-emerald-600 rounded-full mb-4">
            <FileUp className="w-8 h-8" />
          </div>
          <h3 className="text-slate-800 font-semibold text-base">Arraste seu arquivo XML aqui</h3>
          <p className="text-slate-400 text-xs max-w-sm mt-1">
            Suporta qualquer arquivo padrão de NF-e (.xml). Ou clique para selecionar do seu computador.
          </p>
          <span className="mt-4 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs rounded-lg border border-slate-200 transition">
            Escolher Arquivo XML
          </span>
        </div>
      ) : (
        /* Parsed Nfe Preview and Confirmation Panel */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Metadata of NFe & Supplier */}
          <div className="lg:col-span-4 space-y-6">
            {/* General Info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-medium text-slate-800 border-b border-slate-100 pb-3">
                <FileCode className="w-5 h-5 text-emerald-500" />
                <span>Dados da Nota Fiscal</span>
              </div>
              
              <div className="space-y-3.5 text-xs">
                <div>
                  <span className="block text-slate-400 font-medium mb-0.5">CHAVE DE ACESSO (44 DÍGITOS)</span>
                  <span className="font-mono text-slate-700 bg-slate-50 p-1.5 rounded border border-slate-100 block break-all leading-tight">
                    {parsedData.chaveNfe}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-slate-400 font-medium mb-0.5">NÚMERO DA NF-e</span>
                    <span className="font-semibold text-slate-800 text-sm">#{parsedData.numeroNf}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium mb-0.5">SÉRIE</span>
                    <span className="font-semibold text-slate-800 text-sm">{parsedData.serie}</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-slate-400 font-medium mb-0.5">DATA EMISSÃO</span>
                    <span className="font-semibold text-slate-800 text-sm">
                      {new Date(parsedData.dataEmissao).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium mb-0.5">VALOR TOTAL NF-e</span>
                    <span className="font-semibold text-emerald-600 text-sm">
                      R$ {parsedData.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Supplier Info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2 font-medium text-slate-800 border-b border-slate-100 pb-3">
                <Building2 className="w-5 h-5 text-emerald-500" />
                <span>Fornecedor (Emitente)</span>
              </div>
              
              <div className="space-y-3 text-xs text-slate-600">
                <div>
                  <span className="block text-slate-400 font-medium mb-0.5">NOME FANTASIA</span>
                  <span className="font-semibold text-slate-800 text-sm">{parsedData.fornecedor.nome_fantasia}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium mb-0.5">RAZÃO SOCIAL</span>
                  <span className="font-medium">{parsedData.fornecedor.razao_social}</span>
                </div>
                <div>
                  <span className="block text-slate-400 font-medium mb-0.5">CNPJ</span>
                  <span className="font-mono bg-slate-50 p-1 rounded border border-slate-100 font-semibold text-slate-700">
                    {parsedData.fornecedor.cnpj}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 mt-2">
                  <div>
                    <span className="block text-slate-400 font-medium mb-0.5">E-MAIL</span>
                    <span className="block overflow-hidden text-ellipsis whitespace-nowrap">{parsedData.fornecedor.email}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-medium mb-0.5">TELEFONE</span>
                    <span>{parsedData.fornecedor.telefone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Box */}
            <div className="bg-emerald-950 p-5 rounded-2xl border border-emerald-900 shadow-sm space-y-3 text-white">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="font-semibold text-sm">Pronto para Ingestão</span>
              </div>
              <p className="text-[11px] text-emerald-300 leading-normal">
                Ao clicar em confirmar, os dados do fornecedor serão registrados, e todos os produtos mapeados abaixo receberão estoque de entrada imediato. O Custo Médio será calculado na transação.
              </p>
              <div className="pt-2 flex gap-2">
                <button
                  onClick={() => setParsedData(null)}
                  className="flex-1 py-2 text-xs font-semibold text-emerald-200 hover:text-white bg-emerald-900/40 hover:bg-emerald-900/80 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCommitImport}
                  className="flex-1 py-2 text-xs font-semibold text-emerald-950 bg-emerald-400 hover:bg-emerald-300 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <span>Lançar no Estoque</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Items Mapping and Pre-Import Simulation */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-emerald-600" />
                  <div>
                    <span className="font-semibold text-slate-800 text-sm">Itens e Simulação Contábil (CMP)</span>
                    <span className="text-xs text-slate-500 block">Comparação com o inventário real antes da importação</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-lg border border-emerald-200">
                  {parsedData.itens.length} Itens Mapeados
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[10px] uppercase tracking-wider bg-slate-50/20">
                      <th className="px-5 py-3">Produto / SKU</th>
                      <th className="px-4 py-3 text-right">Qtd. Nota</th>
                      <th className="px-4 py-3 text-right">Preço Compra</th>
                      <th className="px-4 py-3">Simulação CMP (Custo Médio)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.itens.map((item, index) => {
                      const sim = getProductCmpSimulation(item.sku, item.precoCusto);

                      return (
                        <tr key={index} className="border-b border-slate-100 hover:bg-slate-50/30 text-xs transition">
                          {/* Product */}
                          <td className="px-5 py-3.5">
                            <div className="font-semibold text-slate-800">{item.nome}</div>
                            <div className="font-mono text-[10px] text-slate-400 mt-0.5">
                              SKU: {item.sku} • {item.unidade}
                            </div>
                          </td>
                          {/* Quantity */}
                          <td className="px-4 py-3.5 text-right font-semibold text-slate-700">
                            +{item.quantidade}
                          </td>
                          {/* Cost */}
                          <td className="px-4 py-3.5 text-right text-slate-600 font-medium">
                            R$ {item.precoCusto.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </td>
                          {/* Simulated CMP */}
                          <td className="px-4 py-3.5">
                            {sim.isNew ? (
                              <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-[10px] font-bold">
                                🆕 NOVO PRODUTO
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 line-through">
                                  R$ {sim.currentCost.toFixed(2)}
                                </span>
                                <ArrowRight className="w-3 h-3 text-slate-400" />
                                <span className="font-bold text-slate-800">
                                  R$ {sim.newCost.toFixed(2)}
                                </span>
                                {sim.diffPct !== 0 && (
                                  <span className={`text-[9px] px-1 py-0.5 rounded font-semibold ${
                                    sim.diffPct > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                                  }`}>
                                    {sim.diffPct > 0 ? '+' : ''}{sim.diffPct.toFixed(1)}%
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
