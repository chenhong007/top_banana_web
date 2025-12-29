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

// 默认值常量
const DEFAULT_MODEL_TAG = 'Banana';
const DEFAULT_CATEGORY = '文生图';

// Transform CSV data to prompt items format
// 统一字段映射规则：
// - title/标题 → effect (标题) - 必填
// - description/描述 → description (描述) - 可选
// - prompt/提示词 → prompt (提示词) - 必填
// - source/来源 → source (来源) - 可选
// - tags/标签 → tags (标签数组) - 可选，支持多个标签
// - imageUrl/图片 → imageUrl (主图片) - 可选
// - imageUrls/图片列表 → imageUrls (图片数组) - 可选，支持多个图片
// - modelTags/模型标签 → modelTags (默认: ['Banana'])
// - category/生成类型 → category (默认: '文生图')
export function transformCSVToPrompts(csvData: CSVRow[]) {
  return csvData.map(row => {
    // 标题字段映射 (title/标题 → effect)
    const effect = row['title'] || row['标题'] || row['effect'] || row['效果'] || '';
    
    // 描述字段映射 (description/描述)
    const description = row['description'] || row['描述'] || row['desc'] || '';
    
    // 提示词字段映射 (prompt/提示词)
    const prompt = row['prompt'] || row['提示词'] || row['content'] || '';
    
    // 来源字段映射 (source/来源)
    const source = row['source'] || row['来源'] || row['引用来源'] || row['提示词来源'] || '';
    
    // 标签字段映射 (tags/标签)
    let tags: string[] = [];
    const tagFields = ['tags', '标签', '评测对象', '场景标签'];
    for (const field of tagFields) {
      if (row[field]) {
        tags = row[field].split(/[,，、]/).map(t => t.trim()).filter(t => t);
        break;
      }
    }
    
    // 模型标签字段映射 (modelTags/模型标签)
    let modelTags: string[] = [];
    const modelTagFields = ['modelTags', '模型标签', 'AI模型', '模型', 'model'];
    for (const field of modelTagFields) {
      if (row[field]) {
        modelTags = row[field].split(/[,，、]/).map(t => t.trim()).filter(t => t);
        break;
      }
    }
    // 默认设置为 ['Banana'] 如果为空
    if (modelTags.length === 0) {
      modelTags = [DEFAULT_MODEL_TAG];
    }
    
    // 生成类型字段映射 (category/生成类型)
    let category = row['category'] || row['生成类型'] || row['类别'] || row['分类'] || '';
    // 默认设置为 '文生图' 如果为空
    if (!category.trim()) {
      category = DEFAULT_CATEGORY;
    }
    
    // 图片字段映射 - 支持多个图片
    // imageUrl/图片 是主图片
    // imageUrls/图片列表 是图片数组（用逗号分隔）
    const imageUrl = row['imageUrl'] || row['图片'] || row['参考图'] || row['image'] || '';
    
    // 解析图片列表
    let imageUrls: string[] = [];
    const imageUrlsFields = ['imageUrls', '图片列表', 'images'];
    for (const field of imageUrlsFields) {
      if (row[field]) {
        imageUrls = row[field].split(/[,，]/).map(url => url.trim()).filter(url => url);
        break;
      }
    }
    
    // 如果有主图片但不在列表中，添加到开头
    if (imageUrl.trim() && !imageUrls.includes(imageUrl.trim())) {
      imageUrls.unshift(imageUrl.trim());
    }
    
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
      tags,                                          // 标签数组
      modelTags,                                     // 模型标签数组
      category: category.trim(),
      prompt: prompt.trim(),
      source: source.trim(),
      imageUrl: imageUrls[0] || imageUrl.trim(),     // 主图片
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,  // 图片数组
      createdAt: createdAt || new Date().toISOString(),
      updatedAt: updatedAt || new Date().toISOString(),
    };
  }).filter(item => 
    // Filter out items missing required fields (only effect and prompt are required)
    item.effect && item.prompt
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

