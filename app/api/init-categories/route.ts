import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { DEFAULT_CATEGORIES, DEFAULT_CATEGORY } from '@/lib/constants';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

/**
 * POST /api/init-categories
 * 初始化默认类别数据，部署后调用一次即可
 * 
 * 功能：
 * 1. 创建默认类别（文生图、文生视频、文生音频、其他）
 * 2. 将所有现有的 prompt 关联到"文生图"类别
 */
export async function POST() {
  try {
    const results = {
      categoriesCreated: [] as string[],
      categoriesExisted: [] as string[],
      promptsUpdated: 0,
    };

    // 1. 创建默认类别
    for (const name of DEFAULT_CATEGORIES) {
      try {
        await prisma.category.create({
          data: { name },
        });
        results.categoriesCreated.push(name);
      } catch (error: any) {
        // P2002 是 Prisma 的唯一约束冲突错误码
        if (error.code === 'P2002') {
          results.categoriesExisted.push(name);
        } else {
          throw error;
        }
      }
    }

    // 2. 获取默认类别（文生图）的 ID
    const defaultCategory = await prisma.category.findUnique({
      where: { name: DEFAULT_CATEGORY },
    });

    // 3. 将所有无类别的 prompt 关联到默认类别
    if (defaultCategory) {
      const updateResult = await prisma.prompt.updateMany({
        where: { categoryId: null },
        data: { categoryId: defaultCategory.id },
      });
      results.promptsUpdated = updateResult.count;
    }

    return NextResponse.json({
      success: true,
      message: '类别初始化完成',
      data: results,
    });
  } catch (error) {
    console.error('Init categories error:', error);
    return NextResponse.json(
      { success: false, error: '初始化类别失败' },
      { status: 500 }
    );
  }
}

// GET 方法用于检查当前类别状态
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: { prompts: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const promptsWithoutCategory = await prisma.prompt.count({
      where: { categoryId: null },
    });

    return NextResponse.json({
      success: true,
      data: {
        categories: categories.map((c) => ({
          name: c.name,
          promptCount: c._count.prompts,
        })),
        promptsWithoutCategory,
      },
    });
  } catch (error) {
    console.error('Get categories status error:', error);
    return NextResponse.json(
      { success: false, error: '获取类别状态失败' },
      { status: 500 }
    );
  }
}

