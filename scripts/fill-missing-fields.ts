/**
 * 填充数据库中缺失的字段
 * 包括：
 * 1. 初始化默认类别(Category)
 * 2. 初始化默认AI模型标签(ModelTag)
 * 3. 为缺失类别的提示词设置默认类别
 * 4. 基于提示词内容智能推断AI模型标签
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 默认生成类型类别
const DEFAULT_CATEGORIES = ['文生图', '文生视频', '文生音频', '图像修复', '发现更多'];

// 默认AI模型标签及其类型
const DEFAULT_MODEL_TAGS = [
  { name: 'Midjourney', type: '文生图', color: '#7289DA' },
  { name: 'DALL-E 3', type: '文生图', color: '#10A37F' },
  { name: 'Stable Diffusion', type: '文生图', color: '#A855F7' },
  { name: 'Flux', type: '文生图', color: '#FF6B6B' },
  { name: 'Leonardo.AI', type: '文生图', color: '#6366F1' },
  { name: 'ComfyUI', type: '文生图', color: '#EC4899' },
  { name: 'Runway', type: '文生视频', color: '#14B8A6' },
  { name: 'Sora', type: '文生视频', color: '#0EA5E9' },
  { name: 'Pika', type: '文生视频', color: '#F59E0B' },
  { name: 'Kling（可灵）', type: '文生视频', color: '#EF4444' },
  { name: 'Suno', type: '文生音频', color: '#8B5CF6' },
  { name: 'Udio', type: '文生音频', color: '#06B6D4' },
  { name: 'DeepSeek', type: '多模态', color: '#3B82F6' },
  { name: 'Banana', type: '其他', color: '#FBBF24' },
  { name: '其他模型', type: '通用', color: '#6B7280' },
];

// 模型关键词匹配规则
const MODEL_KEYWORDS: Record<string, string[]> = {
  'Midjourney': ['midjourney', 'mj', 'midj'],
  'DALL-E 3': ['dall-e', 'dalle', 'openai'],
  'Stable Diffusion': ['stable diffusion', 'sd', 'sdxl', 'sd1.5', 'sd2.1'],
  'Flux': ['flux', 'black forest'],
  'Runway': ['runway', 'gen-2', 'gen2'],
  'Sora': ['sora'],
  'Pika': ['pika'],
  'Kling（可灵）': ['可灵', 'kling', '快手'],
  'ComfyUI': ['comfyui', 'comfy'],
  'Leonardo.AI': ['leonardo'],
  'DeepSeek': ['deepseek'],
  'Banana': ['banana'],
  'Suno': ['suno'],
  'Udio': ['udio'],
};

async function initializeCategories() {
  console.log('初始化默认类别...');
  for (const name of DEFAULT_CATEGORIES) {
    try {
      await prisma.category.upsert({
        where: { name },
        update: {},
        create: { name },
      });
      console.log(`  ✓ 类别: ${name}`);
    } catch (error) {
      console.log(`  - 类别已存在: ${name}`);
    }
  }
}

async function initializeModelTags() {
  console.log('\n初始化默认AI模型标签...');
  for (const tag of DEFAULT_MODEL_TAGS) {
    try {
      await prisma.modelTag.upsert({
        where: { name: tag.name },
        update: { type: tag.type, color: tag.color },
        create: { name: tag.name, type: tag.type, color: tag.color },
      });
      console.log(`  ✓ 模型标签: ${tag.name} (${tag.type})`);
    } catch (error) {
      console.log(`  - 模型标签已存在: ${tag.name}`);
    }
  }
}

async function fillMissingCategories() {
  console.log('\n为缺失类别的提示词设置默认值...');
  
  // 获取默认类别
  const defaultCategory = await prisma.category.findFirst({
    where: { name: '文生图' },
  });
  
  if (!defaultCategory) {
    console.error('  ✗ 未找到默认类别"文生图"，请先初始化类别');
    return;
  }
  
  // 更新所有缺失类别的提示词
  const result = await prisma.prompt.updateMany({
    where: { categoryId: null },
    data: { categoryId: defaultCategory.id },
  });
  
  console.log(`  ✓ 已为 ${result.count} 条提示词设置默认类别"文生图"`);
}

async function inferModelTags() {
  console.log('\n智能推断AI模型标签...');
  
  // 获取所有模型标签
  const modelTags = await prisma.modelTag.findMany();
  const tagMap = new Map(modelTags.map(t => [t.name, t]));
  
  // 获取所有没有模型标签的提示词
  const prompts = await prisma.prompt.findMany({
    include: { modelTags: true },
  });
  
  let updated = 0;
  
  for (const prompt of prompts) {
    // 跳过已有模型标签的提示词
    if (prompt.modelTags.length > 0) continue;
    
    // 检查提示词内容和来源
    const textToCheck = `${prompt.prompt} ${prompt.source} ${prompt.effect}`.toLowerCase();
    
    const matchedTags: string[] = [];
    
    // 基于关键词匹配模型
    for (const [modelName, keywords] of Object.entries(MODEL_KEYWORDS)) {
      for (const keyword of keywords) {
        if (textToCheck.includes(keyword.toLowerCase())) {
          if (!matchedTags.includes(modelName)) {
            matchedTags.push(modelName);
          }
          break;
        }
      }
    }
    
    // 如果来源是 banana，标记为 Banana 模型
    if (prompt.source === 'banana' && !matchedTags.includes('Banana')) {
      matchedTags.push('Banana');
    }
    
    // 根据用户说明，所有模型都是Banana PRO生成的，如果没有其他匹配，默认为Banana
    if (matchedTags.length === 0) {
      matchedTags.push('Banana');
    }
    
    // 如果有匹配的标签，更新提示词
    if (matchedTags.length > 0) {
      await prisma.prompt.update({
        where: { id: prompt.id },
        data: {
          modelTags: {
            connect: matchedTags.map(name => ({ name })),
          },
        },
      });
      updated++;
    }
  }
  
  console.log(`  ✓ 已为 ${updated} 条提示词推断并添加AI模型标签`);
}

async function showStatistics() {
  console.log('\n=== 数据统计 ===');
  
  const totalPrompts = await prisma.prompt.count();
  const promptsWithCategory = await prisma.prompt.count({
    where: { categoryId: { not: null } },
  });
  const promptsWithModelTags = await prisma.prompt.count({
    where: { modelTags: { some: {} } },
  });
  const promptsWithTags = await prisma.prompt.count({
    where: { tags: { some: {} } },
  });
  const promptsWithDescription = await prisma.prompt.count({
    where: { 
      description: { not: '' }
    },
  });
  
  console.log(`总提示词数: ${totalPrompts}`);
  console.log(`有类别的提示词: ${promptsWithCategory} (${(promptsWithCategory/totalPrompts*100).toFixed(1)}%)`);
  console.log(`有AI模型标签的提示词: ${promptsWithModelTags} (${(promptsWithModelTags/totalPrompts*100).toFixed(1)}%)`);
  console.log(`有场景标签的提示词: ${promptsWithTags} (${(promptsWithTags/totalPrompts*100).toFixed(1)}%)`);
  console.log(`有描述的提示词: ${promptsWithDescription} (${(promptsWithDescription/totalPrompts*100).toFixed(1)}%)`);
  
  // 显示各类别统计
  const categories = await prisma.category.findMany({
    include: { _count: { select: { prompts: true } } },
  });
  
  console.log('\n各类别统计:');
  for (const cat of categories) {
    console.log(`  ${cat.name}: ${cat._count.prompts} 条`);
  }
  
  // 显示各模型标签统计
  const modelTagStats = await prisma.modelTag.findMany({
    include: { _count: { select: { prompts: true } } },
    orderBy: { prompts: { _count: 'desc' } },
  });
  
  console.log('\n各AI模型标签统计:');
  for (const tag of modelTagStats) {
    if (tag._count.prompts > 0) {
      console.log(`  ${tag.name}: ${tag._count.prompts} 条`);
    }
  }
}

async function main() {
  console.log('========================================');
  console.log('开始填充缺失字段...');
  console.log('========================================\n');
  
  try {
    // 1. 初始化默认类别
    await initializeCategories();
    
    // 2. 初始化默认AI模型标签
    await initializeModelTags();
    
    // 3. 为缺失类别的提示词设置默认值
    await fillMissingCategories();
    
    // 4. 智能推断AI模型标签
    await inferModelTags();
    
    // 5. 显示统计信息
    await showStatistics();
    
    console.log('\n========================================');
    console.log('填充完成！');
    console.log('========================================');
  } catch (error) {
    console.error('执行出错:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

