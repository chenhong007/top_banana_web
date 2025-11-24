
const fs = require('fs');
const path = require('path');

try {
  const data = JSON.parse(fs.readFileSync('data/prompts.json', 'utf8'));
  console.log(`Total items: ${data.length}`);

  const chunkSize = 50;
  let chunkIndex = 0;
  
  for (let i = 0; i < data.length; i += chunkSize) {
    const chunk = data.slice(i, i + chunkSize);
    const filename = `data/temp_chunk_${chunkIndex}.json`;
    fs.writeFileSync(filename, JSON.stringify(chunk, null, 2), 'utf8');
    console.log(`Created ${filename} with ${chunk.length} items`);
    chunkIndex++;
  }
} catch (error) {
  console.error('Error:', error);
}

