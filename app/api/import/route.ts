import { NextRequest, NextResponse } from 'next/server';
import { readPrompts, bulkCreatePrompts, generateId } from '@/lib/storage';
import prisma from '@/lib/db';

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
    
    const now = new Date().toISOString();
    
    // Transform and validate imported items
    const newPrompts = items.map((item: any) => {
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
        effect,
        description,
        tags: Array.isArray(parsedTags) ? parsedTags : [],
        prompt,
        source,
        imageUrl,
      };
    });
    
    // Validate required fields - only effect and prompt are required
    const invalidItems = newPrompts.filter(
      item => !item.effect || !item.prompt
    );
    
    if (invalidItems.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: `${invalidItems.length} items missing required fields (effect, prompt)`,
          invalidItems: invalidItems.map(item => item.effect || 'Unknown')
        },
        { status: 400 }
      );
    }
    
    // Set default values for optional fields
    newPrompts.forEach(item => {
      item.description = item.description || '';
      item.source = item.source || 'unknown';
    });
    
    let importedCount = 0;
    
    if (mode === 'replace') {
      // Delete all existing data first
      await prisma.prompt.deleteMany();
      // Also clean up orphaned tags
      await prisma.tag.deleteMany({ where: { prompts: { none: {} } } });
      // Import new data
      importedCount = await bulkCreatePrompts(newPrompts);
    } else {
      // Merge with existing data (avoid duplicates by checking effect)
      const existingPrompts = await readPrompts();
      const existingEffects = new Set(existingPrompts.map(p => p.effect));
      const uniqueNewPrompts = newPrompts.filter(p => !existingEffects.has(p.effect));
      importedCount = await bulkCreatePrompts(uniqueNewPrompts);
    }
    
    const totalCount = (await readPrompts()).length;
    
    return NextResponse.json({
      success: true,
      data: {
        imported: importedCount,
        total: totalCount,
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
