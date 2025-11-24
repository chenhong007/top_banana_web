/**
 * Import Service
 * Handles data import operations
 */

import { ApiResponse, DataImportMode, ImportResult } from '@/types';
import { API_ENDPOINTS } from '@/lib/constants';

interface ImportOptions {
  items: any[];
  mode: DataImportMode;
}

interface ParseCSVResult {
  items: any[];
  count: number;
  total: number;
}

interface ScrapeFeishuResult {
  items: any[];
  count: number;
}

class ImportService {
  private importUrl = API_ENDPOINTS.IMPORT;
  private csvUrl = API_ENDPOINTS.IMPORT_CSV;
  private feishuUrl = API_ENDPOINTS.IMPORT_FEISHU;

  /**
   * Import data (generic)
   */
  async importData(options: ImportOptions): Promise<ImportResult> {
    const response = await fetch(this.importUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    
    const result: ApiResponse<ImportResult> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to import data');
    }
    
    if (!result.data) {
      throw new Error('No data returned');
    }
    
    return result.data;
  }

  /**
   * Parse CSV text
   */
  async parseCSV(csvText: string): Promise<ParseCSVResult> {
    const response = await fetch(this.csvUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csvText }),
    });
    
    const result: ApiResponse<ParseCSVResult> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to parse CSV');
    }
    
    if (!result.data) {
      throw new Error('No data returned');
    }
    
    return result.data;
  }

  /**
   * Scrape Feishu document
   */
  async scrapeFeishu(url: string, cookie?: string): Promise<ScrapeFeishuResult> {
    const response = await fetch(this.feishuUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, cookie }),
    });
    
    const result: ApiResponse<ScrapeFeishuResult> = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to scrape Feishu document');
    }
    
    if (!result.data) {
      throw new Error('No data returned');
    }
    
    return result.data;
  }

  /**
   * Import from CSV text
   */
  async importFromCSV(csvText: string, mode: DataImportMode = 'merge'): Promise<ImportResult> {
    // Step 1: Parse CSV
    const parseResult = await this.parseCSV(csvText);
    
    // Step 2: Import data
    const importResult = await this.importData({
      items: parseResult.items,
      mode,
    });
    
    return importResult;
  }

  /**
   * Import from Feishu document
   */
  async importFromFeishu(
    url: string,
    mode: DataImportMode = 'merge',
    cookie?: string
  ): Promise<ImportResult> {
    // Step 1: Scrape Feishu
    const scrapeResult = await this.scrapeFeishu(url, cookie);
    
    // Step 2: Import data
    const importResult = await this.importData({
      items: scrapeResult.items,
      mode,
    });
    
    return importResult;
  }

  /**
   * Import from JSON data
   */
  async importFromJSON(items: any[], mode: DataImportMode = 'merge'): Promise<ImportResult> {
    return await this.importData({ items, mode });
  }
}

// Export singleton instance
export const importService = new ImportService();

