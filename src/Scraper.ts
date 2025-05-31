#!/usr/bin/env ts-node
import axios from 'axios';
import { Buffer } from 'buffer';
import { DOMParser } from '@xmldom/xmldom';

export interface TorrentResult {
  id: number | string;
  name: string;
  size: string;
  source: string;
  url: string;
  magnet?: string;
  torrent?: string;
  seeds?: number;
  peers?: number;
  uploadDate?: string;
}

abstract class BaseScraper {
  protected readonly baseUrl: string;
  protected readonly name: string;

  constructor(baseUrl: string, name: string) {
    this.baseUrl = baseUrl;
    this.name = name;
  }

  abstract search(query: string): Promise<TorrentResult[]>;

  protected async fetchHtml(url: string): Promise<string> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 10000,
      });
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      return '';
    }
  }

  getName(): string {
    return this.name;
  }
}

// YTS API scraper
class YtsScraper extends BaseScraper {
  constructor() {
    super('https://yts.mx', 'YTS');
  }

  async search(query: string): Promise<TorrentResult[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/v2/list_movies.json?query_term=${encodeURIComponent(query)}&limit=50`
      );
      
      if (!response.data?.data?.movies) return [];
      
      return response.data.data.movies.flatMap((movie: any) =>
        movie.torrents.map((torrent: any) => ({
          id: `${movie.id}-${torrent.hash}`,
          name: `${movie.title} [${torrent.quality}]`,
          size: torrent.size,
          source: this.name,
          url: torrent.url,
          seeds: torrent.seeds,
          peers: torrent.peers
        }))
      );
    } catch (error) {
      console.error('YTS Error:', error);
      return [];
    }
  }
}

// Pirate Bay API scraper
class PirateBayScraper extends BaseScraper {
  constructor() {
    super('https://apibay.org', 'The Pirate Bay');
  }

  async search(query: string): Promise<TorrentResult[]> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/q.php?q=${encodeURIComponent(query)}&cat=0`
      );
      
      if (!Array.isArray(response.data)) return [];
      
      return response.data.map((item: any) => {
        const sizeInMB = parseInt(item.size) / (1024 * 1024);
        const size = sizeInMB >= 1024 
          ? `${(sizeInMB / 1024).toFixed(2)} GB`
          : `${sizeInMB.toFixed(2)} MB`;
          
        return {
          id: item.id,
          name: item.name,
          size,
          source: this.name,
          url: `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(item.name)}`,
          seeds: parseInt(item.seeders),
          peers: parseInt(item.leechers)
        };
      });
    } catch (error) {
      console.error('PirateBay Error:', error);
      return [];
    }
  }
}

export class TorrentScraper {
  private scrapers: BaseScraper[] = [];

  constructor() {
    this.scrapers.push(new YtsScraper());
    this.scrapers.push(new PirateBayScraper());
  }

  async searchAll(query: string): Promise<TorrentResult[]> {
    const results: TorrentResult[] = [];
    
    await Promise.all(this.scrapers.map(async (scraper) => {
      try {
        const scraperResults = await scraper.search(query);
        results.push(...scraperResults);
      } catch (error) {
        console.error(`Error searching ${scraper.getName()}:`, error);
      }
    }));

    // Sort by seeds
    return results.sort((a, b) => (b.seeds || 0) - (a.seeds || 0));
  }

  getAvailableSources(): string[] {
    return this.scrapers.map(scraper => scraper.getName());
  }
}

export const torrentScraper = new TorrentScraper();