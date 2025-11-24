import json
import sys

def extract_batch(start, count):
    try:
        with open('data/prompts.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        batch = data[start:start+count]
        
        # Output specifically for the LLM to read
        print(json.dumps(batch, indent=2, ensure_ascii=False))
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # specific indices for this turn
    extract_batch(30, 50) 

