/**
 * Import-related type definitions
 */

// Import data mode: merge with existing data or replace all
export type DataImportMode = 'merge' | 'replace';

// Import source type: CSV, Feishu, or JSON
export type ImportSourceType = 'csv' | 'feishu' | 'json';

export interface ImportResult {
  imported: number;
  total: number;
  skipped?: number;
  failed?: number;
  mode?: string;
}

