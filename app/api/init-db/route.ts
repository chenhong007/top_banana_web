import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { isAuthenticated } from '@/lib/auth';

// 初始数据 - 从 prompts.json 精简
const INITIAL_DATA = [
  {
    effect: "新能源虚拟电厂数据大屏",
    description: "针对新能源虚拟电厂设计的数据展示大屏，用于向领导汇报，强调专业性和科技感。",
    tags: ["UI设计", "数据可视化", "商业办公"],
    prompt: "你帮我做一个新能源虚拟电厂的数据大屏，我要给领导展示的。",
    source: "banana",
    imageUrl: "https://cdn.nlark.com/yuque/0/2025/webp/57654522/1763970744304-678356e8-a867-49c3-818a-96af83512830.webp"
  },
  {
    effect: "原神改变游戏生态科普插画",
    description: "解释原神对中国国产游戏生态影响的科普类插画，包含中文文字说明。",
    tags: ["教育科普", "插画绘制", "游戏娱乐"],
    prompt: "用一个科普插画解释为什么原神改变了中国国产游戏生态，文字用中文",
    source: "banana",
    imageUrl: "https://cdn.nlark.com/yuque/0/2025/webp/57654522/1763970990719-3dc0211b-8b80-4b1a-814c-6fc7a98c1744.webp"
  }
];

export async function POST(request: NextRequest) {
  // 需要登录才能初始化
  if (!isAuthenticated(request)) {
    return NextResponse.json(
      { success: false, error: '请先登录' },
      { status: 401 }
    );
  }

  try {
    // 检查是否已有数据
    const existingCount = await prisma.prompt.count();
    if (existingCount > 0) {
      return NextResponse.json({
        success: true,
        message: `数据库已有 ${existingCount} 条数据，无需初始化`,
        count: existingCount
      });
    }

    // 导入初始数据
    let imported = 0;
    for (const item of INITIAL_DATA) {
      await prisma.prompt.create({
        data: {
          effect: item.effect,
          description: item.description,
          prompt: item.prompt,
          source: item.source,
          imageUrl: item.imageUrl,
          tags: {
            connectOrCreate: item.tags.map(name => ({
              where: { name },
              create: { name }
            }))
          }
        }
      });
      imported++;
    }

    return NextResponse.json({
      success: true,
      message: `成功导入 ${imported} 条示例数据`,
      count: imported
    });
  } catch (error) {
    console.error('Database init error:', error);
    return NextResponse.json(
      { success: false, error: '数据库初始化失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const count = await prisma.prompt.count();
    return NextResponse.json({
      success: true,
      count,
      message: count > 0 ? `数据库有 ${count} 条数据` : '数据库为空'
    });
  } catch (error) {
    console.error('Database check error:', error);
    return NextResponse.json(
      { success: false, error: '无法连接数据库', details: String(error) },
      { status: 500 }
    );
  }
}

