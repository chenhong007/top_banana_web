/**
 * Tag Migration API Route
 * POST /api/migrate-tags - 将现有标签翻译成中文并合并近义词
 * 
 * 使用方式:
 * curl -X POST https://your-domain.com/api/migrate-tags \
 *   -H "Content-Type: application/json" \
 *   -d '{"secret": "YOUR_SECRET", "dryRun": true}'
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

/**
 * 标签映射表：将英文标签翻译并合并近义词到20个核心标签
 * 基于提供的截图，合并相关标签
 */
const TAG_MAPPING: Record<string, string> = {
  // 设计类 -> 设计
  '3D设计': '设计',
  '3d': '设计',
  'Logo设计': '设计',
  'UI设计': '设计',
  'branding': '设计',
  'architecture': '设计',
  'interior': '设计',
  'infographic': '设计',
  'poster': '设计',
  'product': '设计',
  'typography': '设计',
  'ui': '设计',
  '图标设计': '设计',
  '建筑设计': '设计',
  '海报设计': '设计',
  '手绘风格': '设计',
  
  // 艺术类 -> 艺术
  'illustration': '艺术',
  'photography': '艺术',
  'sculpture': '艺术',
  'paper-craft': '艺术',
  'clay': '艺术',
  '摄影艺术': '艺术',
  '插画绘制': '艺术',
  
  // 风格类
  'cartoon': '卡通',
  'character': '角色',
  'pixel': '像素',
  'retro': '复古',
  'futuristic': '未来',
  'sci-fi': '科幻',
  'minimalist': '极简',
  'neon': '霓虹',
  'fantasy': '奇幻',
  
  // 主题类
  'animal': '动物',
  'nature': '自然',
  'landscape': '风景',
  'portrait': '人物',
  'food': '美食',
  'vehicle': '交通',
  'gaming': '游戏',
  'fashion': '时尚',
  'toy': '玩具',
  
  // 应用类
  'PPT设计': '商业',
  'logo': '商业',
  '公众号': '商业',
  '商业办公': '商业',
  '市场营销': '商业',
  '包装': '商业',
  '贺卡': '商业',
  
  // 技术类
  'data-viz': '数据',
  '数据可视化': '数据',
  '编程开发': '代码',
  '代码': '代码',
  
  // 内容类
  '信息图': '信息',
  '文案写作': '文案',
  '创意脑洞': '创意',
  'creative': '创意',
  'emoji': '表情',
  
  // 其他
  '节日': '节日',
  '英语': '语言',
  '语言翻译': '语言',
  '学习': '教育',
  '教育科普': '教育',
  '烟花': '特效',
  '壁纸背景': '背景',
  '小清新': '清新',
  '封面': '封面',
  '商品': '商品',
  '卡片': '卡片',
  '手账': '手账',
  '旅游': '旅游',
  '时尚设计': '时尚',
  '杂志': '杂志',
  '动漫风格': '动漫',
  'felt': '毛毡',
};

/**
 * 20个核心标签（中文）
 */
const CORE_TAGS = [
  '设计',
  '艺术', 
  '卡通',
  '角色',
  '风景',
  '人物',
  '动物',
  '自然',
  '美食',
  '商业',
  '创意',
  '科幻',
  '奇幻',
  '游戏',
  '时尚',
  '极简',
  '复古',
  '未来',
  '数据',
  '代码',
];

/**
 * 验证授权
 */
function verifyAuth(request: NextRequest, body?: any): { success: boolean; error?: string } {
  const importSecret = process.env.IMPORT_SECRET;
  
  if (!importSecret) {
    return { success: false, error: '服务端未配置 IMPORT_SECRET' };
  }
  
  // 从 Header 或 Body 获取 token
  let token = request.headers.get('Authorization')?.replace('Bearer ', '') || 
              request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token && body?.secret) {
    token = body.secret;
  }

  if (!token) {
    return { success: false, error: '缺少 Authorization 头或 secret 参数' };
  }
  
  if (token !== importSecret) {
    return { success: false, error: 'Token 不匹配' };
  }

  return { success: true };
}

/**
 * 获取或创建目标标签
 */
async function getOrCreateTag(tagName: string): Promise<string> {
  const tag = await prisma.tag.findUnique({
    where: { name: tagName },
  });

  if (tag) {
    return tag.id;
  }

  const newTag = await prisma.tag.create({
    data: { name: tagName },
  });

  return newTag.id;
}

export async function POST(request: NextRequest) {
  console.log('[MigrateTags] ===== 开始标签迁移 =====');
  
  try {
    // 解析 body
    const body = await request.json().catch(() => ({}));
    const dryRun = body.dryRun === true;
    
    // 验证授权
    const auth = verifyAuth(request, body);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: `认证失败: ${auth.error}` },
        { status: 401 }
      );
    }

    console.log('[MigrateTags] ✓ 认证通过');
    console.log(`[MigrateTags] 模式: ${dryRun ? 'DRY RUN (预览)' : '正式执行'}`);

    // 1. 获取所有现有标签
    const allTags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { prompts: true },
        },
      },
    });

    console.log(`[MigrateTags] 找到 ${allTags.length} 个现有标签`);

    // 2. 分析标签映射
    const migrationPlan: Array<{
      oldTag: string;
      newTag: string;
      promptCount: number;
      action: 'rename' | 'merge' | 'keep';
    }> = [];

    const tagsToDelete = new Set<string>();
    const targetTagsNeeded = new Set<string>();

    for (const tag of allTags) {
      const mappedTag = TAG_MAPPING[tag.name];
      
      if (mappedTag) {
        // 需要映射的标签
        migrationPlan.push({
          oldTag: tag.name,
          newTag: mappedTag,
          promptCount: tag._count.prompts,
          action: 'merge',
        });
        tagsToDelete.add(tag.name);
        targetTagsNeeded.add(mappedTag);
      } else if (CORE_TAGS.includes(tag.name)) {
        // 已经是核心标签，保持不变
        migrationPlan.push({
          oldTag: tag.name,
          newTag: tag.name,
          promptCount: tag._count.prompts,
          action: 'keep',
        });
      } else {
        // 未在映射表中的标签，尝试智能映射或删除
        console.log(`[MigrateTags] 警告: 标签 "${tag.name}" 未在映射表中，将被删除`);
        migrationPlan.push({
          oldTag: tag.name,
          newTag: '其他',
          promptCount: tag._count.prompts,
          action: 'merge',
        });
        tagsToDelete.add(tag.name);
        targetTagsNeeded.add('其他');
      }
    }

    // 3. 统计信息
    const stats = {
      totalTags: allTags.length,
      tagsToKeep: migrationPlan.filter(p => p.action === 'keep').length,
      tagsToMerge: migrationPlan.filter(p => p.action === 'merge').length,
      finalTagCount: new Set([...CORE_TAGS, ...Array.from(targetTagsNeeded)]).size,
    };

    console.log('[MigrateTags] 迁移计划:', stats);

    if (dryRun) {
      // 预览模式：只返回计划，不执行
      return NextResponse.json({
        success: true,
        data: {
          message: '预览模式：以下是迁移计划',
          dryRun: true,
          stats,
          migrationPlan: migrationPlan.slice(0, 50), // 只返回前50条作为示例
          coreTagsUsed: CORE_TAGS,
          instruction: '要执行迁移，请设置 dryRun: false',
        },
      });
    }

    // 4. 执行迁移
    let migratedCount = 0;
    let errorCount = 0;
    const migrationResults: Array<{ oldTag: string; newTag: string; success: boolean; error?: string }> = [];

    for (const plan of migrationPlan) {
      if (plan.action === 'keep') {
        // 保持不变
        migrationResults.push({
          oldTag: plan.oldTag,
          newTag: plan.newTag,
          success: true,
        });
        continue;
      }

      try {
        // 获取或创建目标标签
        const targetTagId = await getOrCreateTag(plan.newTag);
        const oldTag = await prisma.tag.findUnique({
          where: { name: plan.oldTag },
          include: { prompts: true },
        });

        if (!oldTag) {
          console.log(`[MigrateTags] 标签 "${plan.oldTag}" 已不存在，跳过`);
          continue;
        }

        // 将所有关联的 prompts 迁移到新标签
        for (const prompt of oldTag.prompts) {
          // 检查是否已经有目标标签
          const existingConnection = await prisma.prompt.findFirst({
            where: {
              id: prompt.id,
              tags: {
                some: { id: targetTagId },
              },
            },
          });

          if (!existingConnection) {
            // 添加新标签连接
            await prisma.prompt.update({
              where: { id: prompt.id },
              data: {
                tags: {
                  connect: { id: targetTagId },
                },
              },
            });
          }

          // 移除旧标签连接
          await prisma.prompt.update({
            where: { id: prompt.id },
            data: {
              tags: {
                disconnect: { name: plan.oldTag },
              },
            },
          });
        }

        // 删除旧标签
        await prisma.tag.delete({
          where: { name: plan.oldTag },
        });

        migrationResults.push({
          oldTag: plan.oldTag,
          newTag: plan.newTag,
          success: true,
        });
        migratedCount++;

        if (migratedCount % 10 === 0) {
          console.log(`[MigrateTags] 进度: ${migratedCount}/${migrationPlan.length}`);
        }
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        console.error(`[MigrateTags] 迁移失败 [${plan.oldTag} -> ${plan.newTag}]:`, errorMessage);
        migrationResults.push({
          oldTag: plan.oldTag,
          newTag: plan.newTag,
          success: false,
          error: errorMessage,
        });
      }
    }

    // 5. 获取最终标签列表
    const finalTags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { prompts: true },
        },
      },
      orderBy: {
        prompts: {
          _count: 'desc',
        },
      },
    });

    console.log(`[MigrateTags] ✓ 迁移完成: 成功=${migratedCount}, 失败=${errorCount}`);
    console.log(`[MigrateTags] 最终标签数: ${finalTags.length}`);

    return NextResponse.json({
      success: true,
      data: {
        message: '标签迁移完成',
        stats: {
          before: stats.totalTags,
          after: finalTags.length,
          migrated: migratedCount,
          errors: errorCount,
        },
        finalTags: finalTags.map(t => ({
          name: t.name,
          promptCount: t._count.prompts,
        })),
        migrationSample: migrationResults.slice(0, 20),
      },
    });

  } catch (error) {
    console.error('[MigrateTags] 迁移错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '迁移失败' },
      { status: 500 }
    );
  }
}

// GET 方法用于查看当前标签状态
export async function GET(request: NextRequest) {
  console.log('[MigrateTags] ===== 查看标签状态 =====');
  
  try {
    const body = undefined;
    const auth = verifyAuth(request, body);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: `认证失败: ${auth.error}` },
        { status: 401 }
      );
    }

    const allTags = await prisma.tag.findMany({
      include: {
        _count: {
          select: { prompts: true },
        },
      },
      orderBy: {
        prompts: {
          _count: 'desc',
        },
      },
    });

    // 分析哪些标签需要迁移
    const needMigration = allTags.filter(t => TAG_MAPPING[t.name] !== undefined);
    const alreadyChinese = allTags.filter(t => CORE_TAGS.includes(t.name));
    const others = allTags.filter(t => !TAG_MAPPING[t.name] && !CORE_TAGS.includes(t.name));

    return NextResponse.json({
      success: true,
      data: {
        message: '当前标签状态',
        currentTagCount: allTags.length,
        targetTagCount: CORE_TAGS.length,
        analysis: {
          needMigration: needMigration.length,
          alreadyChinese: alreadyChinese.length,
          others: others.length,
        },
        currentTags: allTags.map(t => ({
          name: t.name,
          promptCount: t._count.prompts,
          willMapTo: TAG_MAPPING[t.name] || (CORE_TAGS.includes(t.name) ? t.name : '其他'),
        })),
        coreTagsTarget: CORE_TAGS,
        usage: {
          preview: 'POST /api/migrate-tags with dryRun: true',
          execute: 'POST /api/migrate-tags with dryRun: false',
          body: {
            secret: 'YOUR_IMPORT_SECRET (必填)',
            dryRun: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('[MigrateTags] 查询错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '查询失败' },
      { status: 500 }
    );
  }
}
