import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { DEFAULT_MODEL_TAGS } from '@/lib/constants';
import { requireAuth } from '@/lib/security';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

/**
 * POST /api/init-model-tags (requires authentication)
 * 初始化默认 AI 模型标签，部署后调用一次即可
 * 
 * 功能：
 * 1. 创建默认 AI 模型标签（Midjourney、DALL-E 3、Stable Diffusion 等）
 */
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const results = {
      modelTagsCreated: [] as string[],
      modelTagsExisted: [] as string[],
    };

    // 创建默认 AI 模型标签
    for (const tag of DEFAULT_MODEL_TAGS) {
      try {
        await prisma.modelTag.create({
          data: {
            name: tag.name,
            type: tag.type,
            color: tag.color,
          },
        });
        results.modelTagsCreated.push(tag.name);
      } catch (error: any) {
        // P2002 是 Prisma 的唯一约束冲突错误码
        if (error.code === 'P2002') {
          results.modelTagsExisted.push(tag.name);
        } else {
          throw error;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'AI 模型标签初始化完成',
      data: results,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to initialize model tags' },
      { status: 500 }
    );
  }
}

// GET 方法用于检查当前 AI 模型标签状态
export async function GET(request: NextRequest) {
  // Check authentication (admin-only)
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    const modelTags = await prisma.modelTag.findMany({
      include: {
        _count: {
          select: { prompts: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const promptsWithoutModelTag = await prisma.prompt.count({
      where: {
        modelTags: {
          none: {},
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        modelTags: modelTags.map((tag) => ({
          name: tag.name,
          type: tag.type,
          color: tag.color,
          promptCount: tag._count.prompts,
        })),
        promptsWithoutModelTag,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to get model tags status' },
      { status: 500 }
    );
  }
}

