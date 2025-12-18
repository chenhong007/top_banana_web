import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { DEFAULT_MODEL_TAGS } from '@/lib/constants';

/**
 * POST /api/init-model-tags
 * 初始化默认 AI 模型标签，部署后调用一次即可
 * 
 * 功能：
 * 1. 创建默认 AI 模型标签（Midjourney、DALL-E 3、Stable Diffusion 等）
 */
export async function POST() {
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
    console.error('Init model tags error:', error);
    return NextResponse.json(
      { success: false, error: '初始化 AI 模型标签失败' },
      { status: 500 }
    );
  }
}

// GET 方法用于检查当前 AI 模型标签状态
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
    console.error('Get model tags status error:', error);
    return NextResponse.json(
      { success: false, error: '获取 AI 模型标签状态失败' },
      { status: 500 }
    );
  }
}

