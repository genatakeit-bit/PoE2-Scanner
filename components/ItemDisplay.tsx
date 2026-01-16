import React, { useState, useEffect } from 'react';
import { ItemStats, ItemRarity } from '../types';
import { poeStats } from '../services/poeStatsService';
import { 
  AlertCircle, Globe, Search, Loader2, Image as ImageIcon, ChevronDown
} from 'lucide-react';

interface ItemDisplayProps {
  item: ItemStats;
  image?: string;
}

interface TradeResult {
  id: string;
  listing: {
    price?: {
      amount: number;
      currency: string;
    };
    account: {
      name: string;
    };
  };
  item: {
    name?: string;
    typeLine: string;
  };
}

const ItemDisplay: React.FC<ItemDisplayProps> = ({ item: initialItem, image }) => {
  const [item, setItem] = useState<ItemStats>(initialItem);
  const [leagues, setLeagues] = useState<string[]>([]);
  const [selectedLeague, setSelectedLeague] = useState('');
  const [isFetchingId, setIsFetchingId] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [tradeResults, setTradeResults] = useState<TradeResult[]>([]);

  useEffect(() => {
    const fetchLeagues = async () => {
      const list = await poeStats.getLeagues();
      setLeagues(list);
      if (list.length > 0) {
        const primaryLeague = list[0];
        setSelectedLeague(primaryLeague);
        setItem(prev => ({ ...prev, league: primaryLeague }));
      }
    };
    fetchLeagues();
  }, [initialItem]);

  const updateFilterValue = (filterIndex: number, newValue: string) => {
    const newItem = JSON.parse(JSON.stringify(item));
    const val = parseFloat(newValue);
    if (newItem.tradeQuery?.query?.stats?.[0]?.filters?.[filterIndex]) {
      newItem.tradeQuery.query.stats[0].filters[filterIndex].value.min = isNaN(val) ? undefined : val;
      setItem(newItem);
    }
  };

  const handleLeagueChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLeague = e.target.value;
    setSelectedLeague(newLeague);
    setItem(prev => ({ ...prev, league: newLeague }));
  };

  const performRealSearch = async () => {
    if (!item.tradeQuery) {
      setApiError("Ошибка данных.");
      return;
    }

    setIsFetchingId(true);
    setApiError(null);
    setTradeResults([]);

    try {
      await poeStats.loadStats();
      const refinedTradeQuery = poeStats.refineQuery(item.tradeQuery);
      
      // Убираем поиск по типу предмета - только по фильтрам
      if (refinedTradeQuery.query.type) {
        delete refinedTradeQuery.query.type;
      }
      if (refinedTradeQuery.query.name) {
        delete refinedTradeQuery.query.name;
      }
      
      // ИСПРАВЛЕНО: Используем status: "available" как на сайте
      refinedTradeQuery.query.status = { option: "available" };
      
      // Устанавливаем правильный формат для Instant Buyout and In Person
      if (!refinedTradeQuery.query.filters) {
        refinedTradeQuery.query.filters = {};
      }
      refinedTradeQuery.query.filters.trade_filters = {
        filters: {
          sale_type: { option: "priced" }
        },
        disabled: false
      };
      
      const league = selectedLeague || 'Standard';
      const apiUrl = `https://www.pathofexile.com/api/trade2/search/poe2/${encodeURIComponent(league)}`;
      const proxiedUrl = `https://corsproxy.io/?${encodeURIComponent(apiUrl)}`;

      console.log('Sending query:', JSON.stringify(refinedTradeQuery, null, 2));

      const response = await fetch(proxiedUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(refinedTradeQuery)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || "Ошибка API");
      }

      const data = await response.json();
      if (data.id) {
        const tradeUrl = `https://www.pathofexile.com/trade2/search/poe2/${encodeURIComponent(league)}/${data.id}`;
        
        // Получаем детали первых 5 предметов
        if (data.result && data.result.length > 0) {
          const itemIds = data.result.slice(0, 5).join(',');
          const fetchUrl = `https://www.pathofexile.com/api/trade2/fetch/${itemIds}?query=${data.id}`;
          const proxiedFetchUrl = `https://corsproxy.io/?${encodeURIComponent(fetchUrl)}`;
          
          try {
            const fetchResponse = await fetch(proxiedFetchUrl);
            if (fetchResponse.ok) {
              const fetchData = await fetchResponse.json();
              setTradeResults(fetchData.result || []);
            }
          } catch (err) {
            console.error('Failed to fetch item details:', err);
          }
        }
        
        window.open(tradeUrl, '_blank');
      }
    } catch (err: any) {
      setApiError(err.message);
    } finally {
      setIsFetchingId(false);
    }
  };

  const tradeFilters = item.tradeQuery?.query?.stats?.[0]?.filters || [];

  return (
    <div className="mt-6 w-full max-w-lg mx-auto bg-zinc-900 border-t-2 rounded-xl overflow-hidden shadow-2xl border-zinc-700">
      {image && (
        <div className="relative w-full h-32 bg-black overflow-hidden cursor-pointer" onClick={() => setShowOriginal(!showOriginal)}>
          <img 
            src={`data:image/jpeg;base64,${image}`} 
            className={`w-full h-full object-cover transition-all duration-700 ${showOriginal ? 'scale-105' : 'opacity-20 blur-[3px]'}`}
            alt="Original" 
          />
          {!showOriginal && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] text-zinc-600 font-bold uppercase tracking-[0.2em] bg-black/40 px-3 py-1 rounded-full border border-white/5">Оригинал</span>
            </div>
          )}
        </div>
      )}

      <div className="p-6">
        <div className="mb-8">
          <h2 className="poe-font text-2xl font-bold leading-tight uppercase text-zinc-100 tracking-tight">
            {item.name || item.baseType}
          </h2>
          
          <div className="flex items-center gap-4 mt-4">
             <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{item.rarity}</span>
             <div className="relative flex items-center">
                <Globe size={10} className="absolute left-2 text-amber-500/70" />
                <select 
                  value={selectedLeague}
                  onChange={handleLeagueChange}
                  className="pl-6 pr-8 py-1.5 bg-zinc-800/50 border border-zinc-700 rounded text-[10px] font-bold text-amber-500 appearance-none focus:outline-none focus:border-amber-500/50 transition-colors"
                >
                  {leagues.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <ChevronDown size={10} className="absolute right-2 text-zinc-500 pointer-events-none" />
             </div>
          </div>
        </div>

        <div className="space-y-2.5 mb-8">
          {tradeFilters.map((filter: any, idx: number) => (
            <div key={idx} className="flex items-center gap-4 bg-zinc-950/30 p-3 rounded-lg border border-zinc-800/40">
              <div className="flex-1 text-[11px] text-zinc-400 font-medium leading-tight">
                {filter.id.includes('.') ? filter.id.split('.')[1].replace(/_/g, ' ') : filter.id}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] text-zinc-600 font-black tracking-tighter">MIN</span>
                <input 
                  type="number"
                  value={filter.value?.min ?? ''}
                  onChange={(e) => updateFilterValue(idx, e.target.value)}
                  className="w-14 bg-zinc-900 border border-zinc-700 text-amber-500 text-xs font-bold py-1 px-2 rounded focus:outline-none focus:border-amber-500/40 text-right transition-colors"
                />
              </div>
            </div>
          ))}
          {tradeFilters.length === 0 && (
             <div className="py-8 text-center border border-dashed border-zinc-800 rounded-lg">
               <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Базовый предмет</p>
             </div>
          )}
        </div>

        <button 
          onClick={performRealSearch}
          disabled={isFetchingId}
          className="w-full bg-amber-600 hover:bg-amber-500 text-white text-[11px] tracking-[0.2em] font-black py-5 rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl active:scale-[0.97] disabled:opacity-50"
        >
          {isFetchingId ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
          {isFetchingId ? 'ЗАГРУЗКА...' : 'ПОИСК НА ТРЕЙДЕ'}
        </button>

        {apiError && (
          <div className="mt-4 p-3 bg-red-950/10 border border-red-500/10 rounded-lg text-center">
            <p className="text-[10px] text-red-400/80 font-medium">{apiError}</p>
          </div>
        )}

        {tradeResults.length > 0 && (
          <div className="mt-6 space-y-2">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">Первые 5 результатов:</h3>
            {tradeResults.map((result, idx) => (
              <a
                key={result.id}
                href={`https://www.pathofexile.com/trade2/search/poe2/${encodeURIComponent(selectedLeague || 'Standard')}/${result.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-zinc-950/50 border border-zinc-800 rounded-lg p-3 hover:border-amber-600/30 transition-all group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-300 font-medium truncate group-hover:text-amber-400 transition">
                      {result.item.name || result.item.typeLine}
                    </p>
                    <p className="text-[9px] text-zinc-600 mt-0.5">
                      {result.listing.account.name}
                    </p>
                  </div>
                  {result.listing.price && (
                    <div className="flex items-center gap-1.5 bg-amber-600/10 px-2.5 py-1.5 rounded border border-amber-600/20 shrink-0">
                      <span className="text-xs font-bold text-amber-500">
                        {result.listing.price.amount}
                      </span>
                      <span className="text-[8px] text-amber-500/70 uppercase">
                        {result.listing.price.currency}
                      </span>
                    </div>
                  )}
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDisplay;