import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, Check, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';
import { Database } from '../utils/database';
import { Produto } from '../types';

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (sku: string) => void;
}

export default function BarcodeScanner({ isOpen, onClose, onScanSuccess }: BarcodeScannerProps) {
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scannedSku, setScannedSku] = useState<string>('');
  const [foundProduct, setFoundProduct] = useState<Produto | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Available SKUs for easy simulation buttons
  const availableProducts = Database.getProdutos();

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      setHasCameraPermission(null);
      // Ask for actual camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setHasCameraPermission(true);
      setCameraActive(true);
      Database.addLog('SUCCESS', 'Permissão de câmera concedida para leitura de código de barras.');
    } catch (err: any) {
      console.error('Sem acesso à câmera:', err);
      setHasCameraPermission(false);
      setCameraActive(false);
      Database.addLog('TRIGGER', 'Câmera física indisponível ou permissão negada. Ativando simulador de leitor inteligente de código de barras.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleSimulatedScan = (sku: string) => {
    setScannedSku(sku);
    const prod = availableProducts.find(p => p.sku.toLowerCase() === sku.toLowerCase());
    setFoundProduct(prod || null);
    
    // Play beep sound concept using standard audio synthesis (ultra professional!)
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000Hz beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      oscillator.start();
      setTimeout(() => oscillator.stop(), 150);
    } catch (e) {
      console.log('Audio Context block:', e);
    }
  };

  const handleConfirmScan = () => {
    if (scannedSku) {
      onScanSuccess(scannedSku);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-55">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-md w-full overflow-hidden text-slate-100 animate-scale-up">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span className="font-bold text-sm tracking-wide text-white uppercase">Leitor de Barras CEI</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scanner Body */}
        <div className="p-6 space-y-6">
          {/* Laser viewfinder viewport */}
          <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-800 flex flex-col items-center justify-center shadow-inner">
            {cameraActive && hasCameraPermission ? (
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center p-4">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto mb-2 animate-bounce" />
                <span className="text-xs text-slate-400 block font-medium">
                  {hasCameraPermission === false 
                    ? 'Permissão de Câmera Negada/Indisponível' 
                    : 'Acessando Câmera...'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Ativando simulador de scanner de alta performance abaixo.
                </span>
              </div>
            )}

            {/* Glowing Laser line */}
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-rose-500 shadow-lg shadow-rose-500/60 animate-[pulse_1s_infinite]"></div>
            <div className="absolute top-4 right-4 bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">
              Auto_focus: on
            </div>

            {/* Scanning Target Corners */}
            <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
            <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
            <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
            <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
          </div>

          {/* Quick-test simulator SKUs */}
          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Simulador de Código de Barras (Selecione um SKU para simular varredura):
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-[110px] overflow-y-auto p-1.5 bg-slate-950/60 rounded-xl border border-slate-800 scrollbar-thin">
              {availableProducts.map(p => (
                <button
                  key={p.sku}
                  onClick={() => handleSimulatedScan(p.sku)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg transition border cursor-pointer ${
                    scannedSku === p.sku 
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' 
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                  }`}
                >
                  {p.sku}
                </button>
              ))}
            </div>
          </div>

          {/* Scanned result card */}
          {scannedSku ? (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-start gap-3.5 animate-fade-in">
              <div className="p-2 bg-emerald-500/20 rounded-xl text-emerald-400">
                <Check className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[9px] font-mono text-emerald-400 font-bold uppercase tracking-widest">
                  Código Identificado com Sucesso
                </div>
                <div className="text-sm font-bold text-white mt-0.5 truncate">
                  {foundProduct ? foundProduct.nome : 'Produto Desconhecido'}
                </div>
                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  SKU: {scannedSku}
                </div>
                {foundProduct && (
                  <div className="text-[10px] text-slate-500 mt-1">
                    Estoque atual: <strong className="text-white">{foundProduct.estoque_atual} un</strong> • Local: {foundProduct.localizacao_estoque}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-6 text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
              Aponte o leitor para o código de barras ou use as tags acima para simular.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={startCamera}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reiniciar Câmera</span>
          </button>

          <button
            onClick={handleConfirmScan}
            disabled={!scannedSku}
            className="px-5 py-2 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 disabled:hover:bg-emerald-400 rounded-xl transition cursor-pointer"
          >
            Confirmar e Filtrar
          </button>
        </div>
      </div>
    </div>
  );
}
