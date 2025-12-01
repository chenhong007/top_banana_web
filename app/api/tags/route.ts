import { NextRequest, NextResponse } from 'next/server';
import { getAllTags, createTag, updateTag, deleteTag } from '@/lib/storage';

// GET all tags
export async function GET() {
  try {
    const tags = await getAllTags();
    return NextResponse.json({
      success: true,
      data: tags,
    });
  } catch (error) {
    console.error('GET /api/tags error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch tags' },
      { status: 500 }
    );
  }
}

// POST create new tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Tag name is required' },
        { status: 400 }
      );
    }
    
    const trimmedName = body.name.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { success: false, error: 'Tag name cannot be empty' },
        { status: 400 }
      );
    }
    
    const tag = await createTag(trimmedName);
    
    if (!tag) {
      return NextResponse.json(
        { success: false, error: 'Failed to create tag (may already exist)' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: tag,
    });
  } catch (error) {
    console.error('POST /api/tags error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create tag' },
      { status: 500 }
    );
  }
}

// PUT update tag
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.oldName || !body.newName) {
      return NextResponse.json(
        { success: false, error: 'Both oldName and newName are required' },
        { status: 400 }
      );
    }
    
    const success = await updateTag(body.oldName.trim(), body.newName.trim());
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update tag' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('PUT /api/tags error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update tag' },
      { status: 500 }
    );
  }
}

// DELETE tag
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Tag name is required' },
        { status: 400 }
      );
    }
    
    const success = await deleteTag(name);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete tag' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('DELETE /api/tags error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete tag' },
      { status: 500 }
    );
  }
}

