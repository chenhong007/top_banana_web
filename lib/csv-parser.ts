/**
 * CSV parser utility for importing data
 */

export interface CSVRow {
  [key: string]: string;
}

// Parse CSV text into array of objects
export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length === 0) {
    return [];
  }
  
  // Parse header row
  const headers = parseCSVLine(lines[0]);
  
  // Parse data rows
  const data: CSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length > 0) {
      const row: CSVRow = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      data.push(row);
    }
  }
  
  return data;
}

// Parse a single CSV line, handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add last field
  result.push(current.trim());
  
  return result;
}

// Transform CSV data to prompt items format
export function transformCSVToPrompts(csvData: CSVRow[]) {
  return csvData.map(row => {
    // Map CSV fields to our data model
    const effect = row['效果'] || row['effect'] || '';
    const description = row['描述'] || row['description'] || '';
    const prompt = row['提示词'] || row['prompt'] || '';
    const source = row['引用来源'] || row['来源'] || row['source'] || '';
    
    // Parse tags from multiple possible fields
    let tags: string[] = [];
    const tagFields = ['评测对象', 'tags', '标签'];
    for (const field of tagFields) {
      if (row[field]) {
        tags = row[field].split(/[,，、]/).map(t => t.trim()).filter(t => t);
        break;
      }
    }
    
    // Get image URL
    const imageUrl = row['参考图'] || row['imageUrl'] || row['图片'] || '';
    
    // Parse dates
    const updatedAt = row['最后更新时间'] || row['修改时间'] || row['updatedAt'] || row['日期'] || '';
    const createdAt = row['创建时间'] || row['createdAt'] || updatedAt || '';
    
    // Combine description with additional notes if available
    let fullDescription = description;
    if (row['说明'] && row['说明'] !== description) {
      fullDescription = description + (description ? '\n' : '') + row['说明'];
    }
    
    return {
      effect: effect.trim(),
      description: fullDescription.trim(),
      tags,
      prompt: prompt.trim(),
      source: source.trim(),
      imageUrl: imageUrl.trim(),
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString(),
    };
  }).filter(item => 
    // Filter out items missing required fields
    item.effect && item.description && item.prompt && item.source
  );
}

// Convert file to text
export async function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = (e) => reject(e);
    reader.readAsText(file, 'UTF-8');
  });
}

