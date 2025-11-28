import { NextRequest, NextResponse } from 'next/server';
import { getPromptById, updatePrompt, deletePrompt } from '@/lib/storage';
import { UpdatePromptRequest } from '@/types';

// GET single prompt
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const prompt = await getPromptById(params.id);
    
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
    console.error(`GET /api/prompts/${params.id} error:`, error);
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
    
    const updatedPrompt = await updatePrompt(params.id, body);
    
    if (!updatedPrompt) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: updatedPrompt,
    });
  } catch (error) {
    console.error(`PUT /api/prompts/${params.id} error:`, error);
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
    const success = await deletePrompt(params.id);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Prompt not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: { id: params.id },
    });
  } catch (error) {
    console.error(`DELETE /api/prompts/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete prompt' },
      { status: 500 }
    );
  }
}
