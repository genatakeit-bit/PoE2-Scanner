import React, { useState, useEffect } from 'react';
import CameraScanner from './components/CameraScanner';
import ItemDisplay from './components/ItemDisplay';
import { analyzeItemWithSearch } from './services/geminiService';
import { poeStats } from './services/poeStatsService';
import { ItemStats, ScanHistoryItem } from './types';
import { History, Swords, Info, Ghost, Coins, Zap, ShoppingBag, Loader2, Sparkles } from 'lucide-react';
import { initTelegram, showTelegramAlert, hapticFeedback } from './services/telegramIntegration';

const App: React.FC = () => {
  const [currentScan, setCurrentScan] = useState<{data: ItemStats, image: string} | null>(null);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingImage, setProcessingImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'scan' | 'history' | 'shop' | 'about'>('scan');
  const [scansRemaining, setScansRemaining] = useState<number>(() => {
    const saved = localStorage.getItem('poe2_scans_remaining');
    return saved !== null ? parseInt(saved) : 10;
  });

  useEffect(() => {
    // Инициализация Telegram Mini App
    const tg = initTelegram();
    console.log('Telegram WebApp initialized:', tg ? 'Yes' : 'No');
    
    poeStats.loadStats();
  }, []);

  useEffect(() => {
    localStorage.setItem('poe2_scans_remaining', scansRemaining.toString());
  }, [scansRemaining]);

  const handleCapture = async (base64: string) => {
    if (scansRemaining <= 0) {
      setActiveTab('shop');
      showTelegramAlert("Недостаточно сканирований.");
      return;
    }
    
    hapticFeedback('light');
    setProcessingImage(base64);
    setIsProcessing(true);
    setCurrentScan(null);

    try {
      const { data } = await analyzeItemWithSearch(base64);
      hapticFeedback('heavy');
      setCurrentScan({ data, image: base64 });
      
      const newHistoryItem: ScanHistoryItem = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        image: base64,
        data: data
      };
      setHistory(prev => [newHistoryItem, ...prev].slice(0, 10));
      setScansRemaining(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error("Analysis failed:", error);
      hapticFeedback('heavy');
      showTelegramAlert("Не удалось распознать предмет. Попробуйте сделать фото четче.");
    } finally {
      setIsProcessing(false);
      setProcessingImage(null);
    }
  };

  const handleTabChange = (tab: 'scan' | 'history' | 'shop' | 'about') => {
    hapticFeedback('light');
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] flex flex-col pb-24">
      <header className="p-4 border-b border-zinc-800 bg-[#0c0c0c]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="text-amber-600" size={20} />
            <h1 className="poe-font text-lg font-bold text-zinc-100 tracking-wider">ExileEye</h1>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-600/10 px-3 py-1 rounded-full border border-amber-600/30">
            <Coins size={12} className="text-amber-500" />
            <span className="text-xs font-bold text-amber-500">{scansRemaining}</span>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-lg mx-auto w-full overflow-y-auto">
        {activeTab === 'scan' && (
          <div className="animate-in fade-in duration-500">
            <div className="mb-6 text-center">
              <p className="text-zinc-500 text-[10px] uppercase tracking-[0.3em] font-bold">League Visual Recognition</p>
            </div>
            
            {!isProcessing && <CameraScanner onCapture={handleCapture} isProcessing={isProcessing} />}
            
            {isProcessing && processingImage && (
              <div className="mt-6 w-full max-w-lg mx-auto overflow-hidden rounded-2xl border border-amber-600/30 bg-zinc-900 shadow-2xl relative">
                <div className="relative aspect-[4/3] w-full">
                  <img src={`data:image/jpeg;base64,${processingImage}`} className="w-full h-full object-cover opacity-50 blur-[1px]" alt="Processing" />
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/10 to-transparent animate-scan" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="bg-black/60 p-4 rounded-full backdrop-blur-md border border-amber-500/50">
                      <Loader2 className="animate-spin text-amber-500" size={32} />
                    </div>
                    <div className="flex flex-col items-center">
                      <p className="text-amber-500 font-bold poe-font text-lg tracking-widest animate-pulse">РАСПОЗНАВАНИЕ...</p>
                      <p className="text-zinc-400 text-[10px] uppercase tracking-widest mt-1 flex items-center gap-2">
                        <Sparkles size={10} /> Используем Gemini Vision
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentScan && <ItemDisplay item={currentScan.data} image={currentScan.image} />}
            
            {!currentScan && !isProcessing && (
              <div className="mt-12 text-center p-8 rounded-2xl border-2 border-dashed border-zinc-800 bg-zinc-900/30">
                <Ghost className="mx-auto text-zinc-800 mb-4" size={48} />
                <p className="text-zinc-500 text-sm">Готов к работе</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4 animate-in slide-in-from-left duration-300">
            <h2 className="poe-font text-xl mb-4 text-zinc-200">История</h2>
            {history.length === 0 ? (
              <div className="text-center py-20 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
                <Ghost className="mx-auto text-zinc-800 mb-2" size={32} />
                <p className="text-zinc-500 text-sm italic">История пуста.</p>
              </div>
            ) : (
              history.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 flex gap-4 hover:border-amber-600/30 transition cursor-pointer group active:scale-95"
                  onClick={() => {
                    hapticFeedback('light');
                    setCurrentScan({ data: item.data, image: item.image });
                    setActiveTab('scan');
                  }}
                >
                  <div className="w-16 h-16 rounded-lg overflow-hidden border border-zinc-700 shrink-0">
                    <img src={`data:image/jpeg;base64,${item.image}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="Item" />
                  </div>
                  <div className="flex-1 py-1">
                    <p className="font-bold text-zinc-200 text-sm poe-font leading-tight">{item.data.name || item.data.baseType}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-[9px] text-zinc-500 uppercase tracking-widest">{item.data.rarity}</span>
                      <span className="text-[9px] text-amber-500 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{item.data.league}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'shop' && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
            <h2 className="poe-font text-xl text-amber-500">Пополнение</h2>
            <div className="grid gap-3">
               <button 
                 onClick={() => {
                   hapticFeedback('medium');
                   setScansRemaining(prev => prev + 10);
                 }} 
                 className="w-full bg-zinc-900 p-5 border border-zinc-800 rounded-2xl text-zinc-100 flex justify-between items-center hover:bg-zinc-800 transition shadow-lg active:scale-95"
               >
                  <div className="flex items-center gap-3">
                    <Zap size={18} className="text-amber-500" />
                    <span className="font-bold">10 Сканирований</span>
                  </div>
                  <span className="text-amber-500 poe-font">$2.99</span>
               </button>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="text-zinc-400 text-sm space-y-4 animate-in fade-in duration-300">
            <h2 className="poe-font text-xl text-amber-600">О приложении</h2>
            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 leading-relaxed space-y-3">
              <p>Версия 6.5 ориентирована на максимально быстрый и точный поиск предметов в актуальной лиге Path of Exile 2.</p>
              <p>Мы используем модель <strong>Gemini 3 Pro</strong> для распознавания текста и <strong>CORS Proxy</strong> для доступа к официальному API торговли.</p>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0c0c0c]/95 backdrop-blur-xl border-t border-zinc-800 p-4 pb-8 z-50">
        <div className="max-w-lg mx-auto flex justify-between items-center px-4">
          <button onClick={() => handleTabChange('history')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'history' ? 'text-amber-500' : 'text-zinc-600'}`}>
            <History size={20} /><span className="text-[9px] font-bold uppercase tracking-widest">Vault</span>
          </button>
          <button onClick={() => handleTabChange('scan')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'scan' ? 'text-amber-500' : 'text-zinc-600'}`}>
            <div className={`p-3 rounded-full -mt-10 transition-all shadow-2xl ${activeTab === 'scan' ? 'bg-amber-600 text-white scale-110 shadow-amber-600/20' : 'bg-zinc-800 text-zinc-500'}`}><Swords size={24} /></div>
            <span className="text-[9px] font-bold uppercase tracking-widest mt-1">Scan</span>
          </button>
          <button onClick={() => handleTabChange('shop')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'shop' ? 'text-amber-500' : 'text-zinc-600'}`}>
            <ShoppingBag size={20} /><span className="text-[9px] font-bold uppercase tracking-widest">Shop</span>
          </button>
          <button onClick={() => handleTabChange('about')} className={`flex flex-col items-center gap-1.5 transition-all ${activeTab === 'about' ? 'text-amber-500' : 'text-zinc-600'}`}>
            <Info size={20} /><span className="text-[9px] font-bold uppercase tracking-widest">Info</span>
          </button>
        </div>
      </nav>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { transform: translateY(-100%); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(300%); opacity: 0; }
        }
        .animate-scan {
          height: 100px;
          animation: scan 2s linear infinite;
          background: linear-gradient(to bottom, transparent, rgba(245, 158, 11, 0.5), transparent);
          border-bottom: 2px solid rgba(245, 158, 11, 0.8);
        }
      `}} />
    </div>
  );
};

export default App;
