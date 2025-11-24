
import json
import os

# Read the original file
with open('data/prompts.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total items: {len(data)}")

# Split into chunks of 50 to be safe with context window
chunk_size = 50
chunks = [data[i:i + chunk_size] for i in range(0, len(data), chunk_size)]

for i, chunk in enumerate(chunks):
    filename = f'data/temp_chunk_{i}.json'
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(chunk, f, ensure_ascii=False, indent=2)
    print(f"Created {filename} with {len(chunk)} items")

