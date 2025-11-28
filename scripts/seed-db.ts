/**
 * Database Seed Script
 * Imports existing JSON data into the SQLite database
 * 
 * Usage: npx tsx scripts/seed-db.ts [--force]
 */

import fs from 'fs';
import path from 'path';

// Use dynamic import for ESM client
async function loadPrisma() {
  const { PrismaClient } = await import('../lib/generated/client/client.js');
  return new PrismaClient();
}

interface JsonPromptItem {
  id?: string;
  effect?: string;
  title?: string;
  description?: string;
  tags?: string[];
  category?: string;
  prompt?: string;
  content?: string;
  source?: string;
  link?: string;
  imageUrl?: string;
  preview?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

async function main() {
  console.log('Starting database seed...\n');
  
  const prisma = await loadPrisma();

  try {
    const dataPath = path.join(process.cwd(), 'data', 'prompts.json');
    
    if (!fs.existsSync(dataPath)) {
      console.log('No prompts.json found at:', dataPath);
      console.log('Skipping seed.');
      return;
    }

    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const prompts: JsonPromptItem[] = JSON.parse(rawData);

    console.log(`Found ${prompts.length} prompts to import.\n`);

    // Check existing data
    const existingCount = await prisma.prompt.count();
    if (existingCount > 0) {
      console.log(`Database already has ${existingCount} prompts.`);
      console.log('Do you want to clear and reimport? This will delete all existing data.');
      console.log('To proceed, run with --force flag.\n');
      
      if (!process.argv.includes('--force')) {
        console.log('Exiting without changes.');
        return;
      }
      
      console.log('Clearing existing data...');
      await prisma.prompt.deleteMany();
      await prisma.tag.deleteMany();
      console.log('Existing data cleared.\n');
    }

    let successCount = 0;
    let errorCount = 0;

    for (const item of prompts) {
      // Map fields with fallbacks
      const effect = item.effect || item.title || 'Untitled';
      const description = item.description || '';
      const content = item.prompt || item.content || '';
      const source = item.source || item.link || '';
      const imageUrl = item.imageUrl || item.preview || item.image || null;

      // Skip invalid entries - only effect and prompt are required
      if (!effect || !content) {
        console.log(`Skipping invalid entry: ${effect || 'Unknown'}`);
        errorCount++;
        continue;
      }
      
      // Use default source if empty
      const finalSource = source || 'unknown';

      // Handle tags
      let tags: string[] = [];
      if (Array.isArray(item.tags)) {
        tags = item.tags.filter(t => t && typeof t === 'string');
      } else if (typeof item.category === 'string') {
        tags = [item.category];
      }

      // Prepare tag connection
      const tagConnect = tags
        .filter(name => name.trim())
        .map(name => ({
          where: { name: name.trim() },
          create: { name: name.trim() },
        }));

      try {
        await prisma.prompt.create({
          data: {
            effect,
            description,
            prompt: content,
            source: finalSource,
            imageUrl,
            createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
            tags: {
              connectOrCreate: tagConnect,
            },
          },
        });
        successCount++;
        
        // Progress indicator
        if (successCount % 100 === 0) {
          console.log(`Imported ${successCount} prompts...`);
        }
      } catch (e) {
        console.error(`Failed to import prompt "${effect}":`, e);
        errorCount++;
      }
    }

    console.log('\n========================================');
    console.log('Seed completed!');
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log('========================================\n');

    // Show tag statistics
    const tagCount = await prisma.tag.count();
    console.log(`Total unique tags created: ${tagCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(async (e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
