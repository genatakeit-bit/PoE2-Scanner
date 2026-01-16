
const PROXY_URL = "https://corsproxy.io/?";
const STATS_URL = "https://www.pathofexile.com/api/trade2/data/stats";
const LEAGUES_URL = "https://www.pathofexile.com/api/trade2/data/leagues";

export interface PoeStat {
  id: string;
  text: string;
  type: string;
}

class PoeStatsService {
  private stats: PoeStat[] = [];
  private isLoaded = false;

  async loadStats() {
    if (this.isLoaded) return;
    try {
      const response = await fetch(`${PROXY_URL}${encodeURIComponent(STATS_URL)}`);
      if (!response.ok) throw new Error("Failed to load stats metadata");
      const data = await response.json();
      
      const results: PoeStat[] = [];
      data.result.forEach((group: any) => {
        group.entries.forEach((entry: any) => {
          results.push({
            id: entry.id,
            text: entry.text,
            type: group.label
          });
        });
      });
      this.stats = results;
      this.isLoaded = true;
    } catch (err) {
      console.error("Error loading PoE stats:", err);
    }
  }

  async getLeagues(): Promise<string[]> {
    try {
      const response = await fetch(`${PROXY_URL}${encodeURIComponent(LEAGUES_URL)}`);
      if (!response.ok) return ["Standard", "Early Access"];
      const data = await response.json();
      return data.result.map((l: any) => l.id);
    } catch (e) {
      return ["Standard", "Early Access"];
    }
  }

  private normalize(text: string): string {
    return text
      .toLowerCase()
      .replace(/[+-]?\d+(\.\d+)?/g, '#')
      .replace(/[^a-z0-9#\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  findStatId(modText: string): string | null {
    if (!this.isLoaded) return null;
    const cleanSearch = this.normalize(modText);
    const found = this.stats.find(s => this.normalize(s.text) === cleanSearch);
    if (found) return found.id;
    return this.stats.find(s => {
      const cleanStatText = this.normalize(s.text);
      return cleanStatText.includes(cleanSearch) || cleanSearch.includes(cleanStatText);
    })?.id || null;
  }

  refineQuery(query: any): any {
    if (!query) return query;
    const refined = JSON.parse(JSON.stringify(query));
    const statsGroups = refined.query?.stats || [];
    
    statsGroups.forEach((group: any) => {
      if (Array.isArray(group.filters)) {
        group.filters = group.filters.map((filter: any) => {
          if (filter.id && !filter.id.includes('.')) {
            const realId = this.findStatId(filter.id);
            if (realId) return { ...filter, id: realId };
            return null;
          }
          return filter;
        }).filter((f: any) => f !== null && f.id);
      }
    });
    return refined;
  }
}

export const poeStats = new PoeStatsService();
