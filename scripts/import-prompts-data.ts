/**
 * Import prompts_data.json to remote backend
 * 
 * Usage:
 *   npx tsx scripts/import-prompts-data.ts
 * 
 * Environment variables (or modify constants below):
 *   IMPORT_SECRET - API authentication secret
 *   API_BASE_URL - Remote backend URL (default: https://topai.ink)
 */

import fs from 'fs';
import path from 'path';

// Configuration
const API_BASE_URL = process.env.API_BASE_URL || 'https://topai.ink';
const IMPORT_SECRET = process.env.IMPORT_SECRET || 'my-super-secret-key-2024';
const BATCH_SIZE = 50; // Items per batch
const DEFAULT_CATEGORY = '文生图';
const DEFAULT_MODEL_TAGS = ['banana'];

interface PromptsDataItem {
  title: string;
  prompt: string;
  description?: string;
  source?: string;
  tags?: string[];
  imageUrl?: string;
  imageUrls?: string[];
  updateDate?: string;
}

interface PromptsDataFile {
  prompts: PromptsDataItem[];
}

interface ImportItem {
  title: string;
  prompt: string;
  description: string;
  source: string;
  tags: string[];
  modelTags: string[];
  category: string;
  imageUrl?: string;
  imageUrls?: string[];
  createdAt?: string;
}

/**
 * Load prompts_data.json
 */
function loadPromptsData(): PromptsDataFile {
  const jsonPath = path.join(process.cwd(), 'data', 'prompts_data.json');
  console.log(`Loading data from: ${jsonPath}`);
  const rawData = fs.readFileSync(jsonPath, 'utf-8');
  return JSON.parse(rawData);
}

/**
 * Transform prompts_data.json format to import API format
 */
function transformItem(item: PromptsDataItem): ImportItem {
  // Collect all image URLs
  const imageUrls: string[] = [];
  if (item.imageUrls && Array.isArray(item.imageUrls)) {
    imageUrls.push(...item.imageUrls.filter(u => u && typeof u === 'string'));
  } else if (item.imageUrl) {
    imageUrls.push(item.imageUrl);
  }

  return {
    title: item.title,
    prompt: item.prompt,
    description: item.description || '',
    source: item.source || 'unknown',
    tags: item.tags || [],
    modelTags: DEFAULT_MODEL_TAGS,
    category: DEFAULT_CATEGORY,
    imageUrl: imageUrls[0],
    imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    createdAt: item.updateDate, // Use updateDate as createdAt
  };
}

/**
 * Import a batch of items via API
 */
async function importBatch(
  items: ImportItem[],
  batchIndex: number,
  totalBatches: number
): Promise<{ success: number; failed: number; skipped: number }> {
  const url = `${API_BASE_URL}/api/import`;
  
  console.log(`\n[Batch ${batchIndex + 1}/${totalBatches}] Importing ${items.length} items...`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${IMPORT_SECRET}`,
      },
      body: JSON.stringify({
        items,
        secret: IMPORT_SECRET, // Also pass in body for compatibility
        mode: 'merge',
        fastMode: true, // Skip similarity check for speed
        skipR2: false, // Upload images to R2
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`  Error: ${result.error || response.statusText}`);
      return { success: 0, failed: items.length, skipped: 0 };
    }

    if (result.success) {
      const data = result.data;
      console.log(`  Success: ${data.imported} imported, ${data.skipped} skipped, ${data.failed || 0} failed`);
      if (data.imageUpload) {
        console.log(`  Images: ${data.imageUpload.uploaded} uploaded to R2, ${data.imageUpload.failed} failed`);
      }
      return {
        success: data.imported || 0,
        failed: data.failed || 0,
        skipped: data.skipped || 0,
      };
    } else {
      console.error(`  API error: ${result.error}`);
      return { success: 0, failed: items.length, skipped: 0 };
    }
  } catch (error) {
    console.error(`  Network error:`, error);
    return { success: 0, failed: items.length, skipped: 0 };
  }
}

/**
 * Main import function
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Prompts Data Import Tool');
  console.log('='.repeat(60));
  console.log(`API URL: ${API_BASE_URL}`);
  console.log(`Default Category: ${DEFAULT_CATEGORY}`);
  console.log(`Default Model Tags: ${DEFAULT_MODEL_TAGS.join(', ')}`);
  console.log('='.repeat(60));

  // Load data
  const data = loadPromptsData();
  const items = data.prompts;
  console.log(`\nLoaded ${items.length} items from prompts_data.json`);

  // Transform all items
  const transformedItems = items.map(transformItem);
  console.log(`Transformed ${transformedItems.length} items`);

  // Filter valid items (must have title and prompt)
  const validItems = transformedItems.filter(item => item.title && item.prompt);
  console.log(`Valid items: ${validItems.length} (filtered ${transformedItems.length - validItems.length} invalid)`);

  if (validItems.length === 0) {
    console.error('No valid items to import!');
    process.exit(1);
  }

  // Create batches
  const batches: ImportItem[][] = [];
  for (let i = 0; i < validItems.length; i += BATCH_SIZE) {
    batches.push(validItems.slice(i, i + BATCH_SIZE));
  }
  console.log(`\nCreated ${batches.length} batches (${BATCH_SIZE} items per batch)`);

  // Import batches
  let totalSuccess = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  const startTime = Date.now();

  for (let i = 0; i < batches.length; i++) {
    const result = await importBatch(batches[i], i, batches.length);
    totalSuccess += result.success;
    totalFailed += result.failed;
    totalSkipped += result.skipped;

    // Add delay between batches to avoid rate limiting
    if (i < batches.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('Import Complete!');
  console.log('='.repeat(60));
  console.log(`Total items: ${validItems.length}`);
  console.log(`Successfully imported: ${totalSuccess}`);
  console.log(`Skipped (duplicates): ${totalSkipped}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Duration: ${duration}s`);
  console.log('='.repeat(60));
}

main().catch(console.error);

