import { NextRequest, NextResponse } from 'next/server';
import { getAllCategories, createCategory, updateCategory, deleteCategory } from '@/lib/storage';

// GET all categories
export async function GET() {
  try {
    const categories = await getAllCategories();
    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }
    
    const trimmedName = body.name.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { success: false, error: 'Category name cannot be empty' },
        { status: 400 }
      );
    }
    
    const category = await createCategory(trimmedName);
    
    if (!category) {
      return NextResponse.json(
        { success: false, error: 'Failed to create category (may already exist)' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: category,
    });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

// PUT update category
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.oldName || !body.newName) {
      return NextResponse.json(
        { success: false, error: 'Both oldName and newName are required' },
        { status: 400 }
      );
    }
    
    const success = await updateCategory(body.oldName.trim(), body.newName.trim());
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to update category' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('PUT /api/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update category' },
      { status: 500 }
    );
  }
}

// DELETE category
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }
    
    const success = await deleteCategory(name);
    
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Failed to delete category' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error('DELETE /api/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete category' },
      { status: 500 }
    );
  }
}

