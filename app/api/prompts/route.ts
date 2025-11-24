import { NextRequest, NextResponse } from 'next/server';
import { readPrompts, writePrompts, generateId } from '@/lib/storage';
import { PromptItem, CreatePromptRequest } from '@/types';

// GET all prompts
export async function GET() {
  try {
    const prompts = readPrompts();
    return NextResponse.json({
      success: true,
      data: prompts,
    });
  } catch (error) {
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
    
    // Validation
    if (!body.effect || !body.description || !body.prompt || !body.source) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const prompts = readPrompts();
    const now = new Date().toISOString();
    
    const newPrompt: PromptItem = {
      id: generateId(),
      effect: body.effect,
      description: body.description,
      tags: body.tags || [],
      prompt: body.prompt,
      source: body.source,
      imageUrl: body.imageUrl,
      createdAt: now,
      updatedAt: now,
    };
    
    prompts.unshift(newPrompt); // Add to beginning
    writePrompts(prompts);
    
    return NextResponse.json({
      success: true,
      data: newPrompt,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to create prompt' },
      { status: 500 }
    );
  }
}

