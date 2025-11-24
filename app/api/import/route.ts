import { NextRequest, NextResponse } from 'next/server';
import { readPrompts, writePrompts, generateId } from '@/lib/storage';
import { PromptItem } from '@/types';

// POST import prompts from external data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items, mode = 'merge' } = body; // mode: 'merge' or 'replace'
    
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid data format' },
        { status: 400 }
      );
    }
    
    const existingPrompts = readPrompts();
    const now = new Date().toISOString();
    
    // Transform and validate imported items
    const newPrompts: PromptItem[] = items.map((item: any) => {
      // Flexible field mapping
      const effect = item.effect || item.效果 || item.title || '';
      const description = item.description || item.描述 || item.desc || item.title || '';
      const prompt = item.prompt || item.提示词 || item.content || '';
      const source = item.source || item.来源 || item.提示词来源 || item.link || '';
      const tags = item.tags || item.标签 || item.评测对象 || item.category || [];
      const imageUrl = item.imageUrl || item.图片 || item.image || item.preview || '';
      
      // Parse tags if it's a string
      let parsedTags = tags;
      if (typeof tags === 'string') {
        parsedTags = tags.split(/[,，、]/).map((t: string) => t.trim()).filter((t: string) => t);
      }
      
      return {
        id: item.id || generateId(),
        effect,
        description,
        tags: Array.isArray(parsedTags) ? parsedTags : [],
        prompt,
        source,
        imageUrl,
        createdAt: item.createdAt || item.创建时间 || item.更新时间 || now,
        updatedAt: now,
      };
    });
    
    // Validate required fields
    const invalidItems = newPrompts.filter(
      item => !item.effect || !item.description || !item.prompt || !item.source
    );
    
    if (invalidItems.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `${invalidItems.length} items missing required fields`,
          invalidItems: invalidItems.map(item => item.effect || 'Unknown')
        },
        { status: 400 }
      );
    }
    
    let finalPrompts: PromptItem[];
    
    if (mode === 'replace') {
      // Replace all existing data
      finalPrompts = newPrompts;
    } else {
      // Merge with existing data (avoid duplicates by checking effect)
      const existingEffects = new Set(existingPrompts.map(p => p.effect));
      const uniqueNewPrompts = newPrompts.filter(p => !existingEffects.has(p.effect));
      finalPrompts = [...uniqueNewPrompts, ...existingPrompts];
    }
    
    writePrompts(finalPrompts);
    
    return NextResponse.json({
      success: true,
      data: {
        imported: mode === 'replace' ? newPrompts.length : finalPrompts.length - existingPrompts.length,
        total: finalPrompts.length,
        mode,
      },
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to import data' },
      { status: 500 }
    );
  }
}

