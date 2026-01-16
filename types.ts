
export enum ItemRarity {
  NORMAL = 'Normal',
  MAGIC = 'Magic',
  RARE = 'Rare',
  UNIQUE = 'Unique',
  CURRENCY = 'Currency'
}

export interface MarketListing {
  price: string;
  url: string;
  description: string;
}

export interface ItemStats {
  name: string;
  rarity: ItemRarity;
  baseType: string;
  league: string;
  explicitMods: string[];
  implicitMods?: string[];
  requirements?: string;
  itemLevel?: number;
  valueEstimate?: string;
  stableSearchQuery?: string;
  listings: MarketListing[];
  tradeQuery?: any; // Объект для POST запроса к API
}

export interface ScanHistoryItem {
  id: string;
  timestamp: number;
  image: string;
  data: ItemStats;
}
