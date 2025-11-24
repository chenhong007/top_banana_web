import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'prompts.json');

try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // We processed 0-29 (30 items) previously.
    // Let's grab 30-79 (50 items).
    const batch = data.slice(30, 80).map((item: any) => ({
        id: item.id,
        effect: item.effect,
        description: item.description,
        prompt: item.prompt
    }));
    
    console.log(JSON.stringify(batch, null, 2));
} catch (error) {
    console.error("Error reading file:", error);
}

