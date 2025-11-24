import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'data', 'prompts.json');

function extractBatch(start: number, count: number) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            return;
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);
        const batch = data.slice(start, start + count);
        console.log(JSON.stringify(batch, null, 2));
    } catch (error) {
        console.error("Error extracting batch:", error);
    }
}

// Extract items 30 to 80 (50 items)
extractBatch(30, 50);

