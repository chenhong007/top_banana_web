import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

// GET all model tags
export async function GET() {
  try {
    const modelTags = await prisma.modelTag.findMany({
      include: {
        _count: {
          select: { prompts: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: modelTags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        icon: tag.icon,
        color: tag.color,
        type: tag.type,
        promptCount: tag._count.prompts,
      })),
    });
  } catch (error) {
    console.error('GET /api/model-tags error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch model tags' },
      { status: 500 }
    );
  }
}

// POST create new model tag
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || typeof body.name !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Model tag name is required' },
        { status: 400 }
      );
    }

    const trimmedName = body.name.trim();
    if (!trimmedName) {
      return NextResponse.json(
        { success: false, error: 'Model tag name cannot be empty' },
        { status: 400 }
      );
    }

    const modelTag = await prisma.modelTag.create({
      data: {
        name: trimmedName,
        icon: body.icon?.trim() || null,
        color: body.color?.trim() || null,
        type: body.type?.trim() || null,
      },
    });

    return NextResponse.json({
      success: true,
      data: modelTag,
    });
  } catch (error: any) {
    console.error('POST /api/model-tags error:', error);
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Model tag already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to create model tag' },
      { status: 500 }
    );
  }
}

// DELETE model tag
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Model tag name is required' },
        { status: 400 }
      );
    }

    await prisma.modelTag.delete({
      where: { name },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('DELETE /api/model-tags error:', error);
    if (error.code === 'P2025') {
      return NextResponse.json(
        { success: false, error: 'Model tag not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to delete model tag' },
      { status: 500 }
    );
  }
}

