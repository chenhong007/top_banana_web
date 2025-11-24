import fs from 'fs';
import path from 'path';
// import { PrismaClient } from '../lib/generated/client';

// const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding ...');
  console.log('Seeding skipped: Using JSON storage instead of Database.');
  
  /*
  const dataPath = path.join(process.cwd(), 'data', 'prompts.json');
  if (!fs.existsSync(dataPath)) {
    console.log('No prompts.json found, skipping seed.');
    return;
  }

  const rawData = fs.readFileSync(dataPath, 'utf-8');
  const prompts = JSON.parse(rawData);

  console.log(`Found ${prompts.length} prompts to import.`);

  for (const item of prompts) {
    // Map fields
    const title = item.effect || item.title || 'Untitled';
    const description = item.description || '';
    const content = item.prompt || '';
    const source = item.source || item.link || item.author || '';
    const imageUrl = item.imageUrl || item.preview || item.image || null;
    
    // Handle Tags
    let tags: string[] = [];
    if (Array.isArray(item.tags)) {
      tags = item.tags;
    } else if (typeof item.category === 'string') {
      tags = [item.category];
    }

    // Create tags if they don't exist and connect
    const tagConnect = [];
    for (const tagName of tags) {
        if (!tagName) continue;
        // Find or create tag
        // Since we can't easily do connectOrCreate with non-unique where clause in one go for lists in some versions,
        // but here name is unique.
        // However, doing it inside the create query is cleaner.
        tagConnect.push({
            where: { name: tagName },
            create: { name: tagName }
        });
    }

    try {
        await prisma.prompt.create({
            data: {
                title,
                description,
                content,
                source,
                imageUrl,
                // If we want to preserve original dates if they exist, otherwise default
                // createdAt: item.createdAt ? new Date(item.createdAt) : undefined,
                tags: {
                    connectOrCreate: tagConnect
                }
            }
        });
    } catch (e) {
        console.error(`Failed to import prompt "${title}": ${e}`);
    }
  }

  console.log('Seeding finished.');
  */
}

main()
  .then(async () => {
    // await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    // await prisma.$disconnect();
    process.exit(1);
  });

