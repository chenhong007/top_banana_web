import { NextRequest, NextResponse } from 'next/server';
import { readPrompts, writePrompts } from '@/lib/storage';
import { UpdatePromptRequest } from '@/types';

// GET single prompt
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prompts = readPrompts();
    const prompt = prompts.find(p => p.id === params.id);
    
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: prompt,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prompt' },
      { status: 500 }
    );
  }
}

// PUT update prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: UpdatePromptRequest = await request.json();
    const prompts = readPrompts();
    const index = prompts.findIndex(p => p.id === params.id);
    
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    // Update prompt
    prompts[index] = {
      ...prompts[index],
      ...body,
      id: params.id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    };
    
    writePrompts(prompts);
    
    return NextResponse.json({
      success: true,
      data: prompts[index],
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to update prompt' },
      { status: 500 }
    );
  }
}

// DELETE prompt
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prompts = readPrompts();
    const index = prompts.findIndex(p => p.id === params.id);
    
    if (index === -1) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    prompts.splice(index, 1);
    writePrompts(prompts);
    
    return NextResponse.json({
      success: true,
      data: { id: params.id },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}

