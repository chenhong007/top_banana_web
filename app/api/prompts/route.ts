import { NextRequest, NextResponse } from 'next/server';
import { readPrompts, createPrompt } from '@/lib/storage';
import { CreatePromptRequest } from '@/types';

// GET all prompts
export async function GET() {
  try {
    const prompts = await readPrompts();
    return NextResponse.json({
      success: true,
      data: prompts,
    });
  } catch (error) {
    console.error('GET /api/prompts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prompts' },
      { status: 500 }
    );
  }
}

// POST create new prompt
export async function POST(request: NextRequest) {
  try {
    const body: CreatePromptRequest = await request.json();
    
    // Validation - only effect and prompt are required
    if (!body.effect || !body.prompt) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields (effect, prompt)' },
        { status: 400 }
      );
    }
    
    const newPrompt = await createPrompt({
      effect: body.effect,
      description: body.description || '',
      tags: body.tags || [],
      prompt: body.prompt,
      source: body.source || 'unknown',
      imageUrl: body.imageUrl,
      category: body.category, // Will default to '文生图' in storage layer
    });
    
    return NextResponse.json({
      success: true,
      data: newPrompt,
    });
  } catch (error) {
    console.error('POST /api/prompts error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}
