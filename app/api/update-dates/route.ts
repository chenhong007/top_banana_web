/**
 * Update Dates API Route
 * POST /api/update-dates - 更新指定日期范围的数据创建时间
 * 
 * 使用方式:
 * curl -X POST https://your-domain.com/api/update-dates \
 *   -H "Content-Type: application/json" \
 *   -d '{"secret": "YOUR_SECRET"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

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

export async function POST(request: NextRequest) {
  console.log('[UpdateDates] ===== 开始处理日期更新请求 =====');
  
  try {
    // 解析 body
    const body = await request.json().catch(() => ({}));
    
    // 验证授权
    const auth = verifyAuth(request, body);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: `认证失败: ${auth.error}` },
        { status: 401 }
      );
    }

    console.log('[UpdateDates] ✓ 认证通过');

    // 定义日期范围: 2025年12月26日 00:00:00 到 2025年12月27日 23:59:59
    const startDate = new Date('2025-12-26T00:00:00.000Z');
    const endDate = new Date('2025-12-27T23:59:59.999Z');

    console.log(`[UpdateDates] 查询日期范围: ${startDate.toISOString()} ~ ${endDate.toISOString()}`);

    // 查询符合条件的记录
    const recordsToUpdate = await prisma.prompt.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        effect: true,
        createdAt: true,
      },
    });

    console.log(`[UpdateDates] 找到 ${recordsToUpdate.length} 条记录需要更新`);

    if (recordsToUpdate.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: '没有找到需要更新的记录',
          count: 0,
          dateRange: {
            from: startDate.toISOString(),
            to: endDate.toISOString(),
          },
        },
      });
    }

    // 批量更新记录，将创建时间减去30天
    const updatedRecords = [];
    let successCount = 0;
    let errorCount = 0;

    for (const record of recordsToUpdate) {
      try {
        // 计算新的创建时间（减去30天）
        const newCreatedAt = new Date(record.createdAt);
        newCreatedAt.setDate(newCreatedAt.getDate() - 30);

        // 更新记录
        await prisma.prompt.update({
          where: { id: record.id },
          data: {
            createdAt: newCreatedAt,
          },
        });

        updatedRecords.push({
          id: record.id,
          effect: record.effect,
          oldDate: record.createdAt.toISOString(),
          newDate: newCreatedAt.toISOString(),
        });

        successCount++;

        // 每处理10条输出一次进度
        if (successCount % 10 === 0) {
          console.log(`[UpdateDates] 进度: ${successCount}/${recordsToUpdate.length}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`[UpdateDates] 更新失败 [${record.id}]:`, error);
      }
    }

    console.log(`[UpdateDates] ✓ 更新完成: 成功=${successCount}, 失败=${errorCount}`);

    return NextResponse.json({
      success: true,
      data: {
        message: '日期更新完成',
        totalFound: recordsToUpdate.length,
        successCount,
        errorCount,
        dateRange: {
          original: {
            from: startDate.toISOString(),
            to: endDate.toISOString(),
          },
          updated: {
            from: new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        // 返回前10条更新的记录作为示例
        samples: updatedRecords.slice(0, 10),
      },
    });

  } catch (error) {
    console.error('[UpdateDates] 更新错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '更新失败' },
      { status: 500 }
    );
  }
}

// GET 方法用于预览将要更新的数据
export async function GET(request: NextRequest) {
  console.log('[UpdateDates] ===== 收到预览请求 =====');
  
  try {
    const body = undefined;
    const auth = verifyAuth(request, body);
    if (!auth.success) {
      return NextResponse.json(
        { success: false, error: `认证失败: ${auth.error}` },
        { status: 401 }
      );
    }

    // 定义日期范围
    const startDate = new Date('2025-12-26T00:00:00.000Z');
    const endDate = new Date('2025-12-27T23:59:59.999Z');

    // 查询符合条件的记录数量
    const count = await prisma.prompt.count({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 获取几条示例记录
    const samples = await prisma.prompt.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        id: true,
        effect: true,
        createdAt: true,
      },
      take: 5,
      orderBy: {
        createdAt: 'asc',
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        message: '预览：即将更新的数据',
        count,
        dateRange: {
          original: {
            from: startDate.toISOString(),
            to: endDate.toISOString(),
          },
          willUpdateTo: {
            from: new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            to: new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          },
        },
        samples: samples.map(s => ({
          id: s.id,
          effect: s.effect,
          currentDate: s.createdAt.toISOString(),
          willBecome: new Date(s.createdAt.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        })),
        usage: {
          preview: 'GET /api/update-dates (当前请求)',
          execute: 'POST /api/update-dates',
          body: {
            secret: 'YOUR_IMPORT_SECRET (必填)',
          },
        },
      },
    });
  } catch (error) {
    console.error('[UpdateDates] 预览错误:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : '预览失败' },
      { status: 500 }
    );
  }
}
