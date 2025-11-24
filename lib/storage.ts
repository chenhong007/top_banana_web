import { PromptItem } from '@/types';
import fs from 'fs';
import path from 'path';
import { STORAGE } from './constants';

const DATA_DIR = path.join(process.cwd(), STORAGE.DATA_DIR);
const DATA_FILE = path.join(DATA_DIR, STORAGE.PROMPTS_FILE);

// Ensure data directory exists
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Read all prompts from storage
export function readPrompts(): PromptItem[] {
  ensureDataDir();
  
  if (!fs.existsSync(DATA_FILE)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    const rawData = JSON.parse(data);
    
    // Normalize field names for backward compatibility
    return rawData.map((item: any) => ({
      id: item.id,
      effect: item.effect || item.title || '',
      description: item.description || '',
      tags: Array.isArray(item.tags) 
        ? item.tags 
        : (typeof item.category === 'string' ? [item.category] : []),
      prompt: item.prompt || '',
      source: item.source || item.link || '',
      imageUrl: item.imageUrl || item.preview || item.image || '',
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error reading prompts:', error);
    return [];
  }
}

// Write prompts to storage
export function writePrompts(prompts: PromptItem[]): void {
  ensureDataDir();
  
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(prompts, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing prompts:', error);
    throw new Error('Failed to save prompts');
  }
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

