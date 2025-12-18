/**
 * 检查数据库中提示词缺失的字段
 */

import { PrismaClient } from '@prisma/client';

// 使用环境变量中的数据库连接
const prisma = new PrismaClient();

async function checkMissingFields() {
  try {
    // 获取所有提示词及其关联数据
    const prompts = await prisma.prompt.findMany({
      include: { tags: true, category: true, modelTags: true }
    });
    
    console.log('=== 数据库字段缺失统计 ===');
    console.log('总提示词数:', prompts.length);
    
    // 统计缺失的字段
    let missingCategory = 0;
    let missingTags = 0;
    let missingModelTags = 0;
    let missingDescription = 0;
    let missingSource = 0;
    let missingImageUrl = 0;
    
    const promptsWithMissingCategory: string[] = [];
    const promptsWithMissingTags: string[] = [];
    const promptsWithMissingModelTags: string[] = [];
    const promptsWithMissingDescription: string[] = [];
    
    for (const p of prompts) {
      if (!p.categoryId || !p.category) {
        missingCategory++;
        promptsWithMissingCategory.push(p.id);
      }
      if (!p.tags || p.tags.length === 0) {
        missingTags++;
        promptsWithMissingTags.push(p.id);
      }
      if (!p.modelTags || p.modelTags.length === 0) {
        missingModelTags++;
        promptsWithMissingModelTags.push(p.id);
      }
      if (!p.description || p.description.trim() === '') {
        missingDescription++;
        promptsWithMissingDescription.push(p.id);
      }
      if (!p.source || p.source === 'unknown' || p.source.trim() === '') {
        missingSource++;
      }
      if (!p.imageUrl) {
        missingImageUrl++;
      }
    }
    
    console.log('\n=== 缺失字段统计 ===');
    console.log('缺失类别(category):', missingCategory, '条', `(${(missingCategory/prompts.length*100).toFixed(1)}%)`);
    console.log('缺失场景标签(tags):', missingTags, '条', `(${(missingTags/prompts.length*100).toFixed(1)}%)`);
    console.log('缺失AI模型标签(modelTags):', missingModelTags, '条', `(${(missingModelTags/prompts.length*100).toFixed(1)}%)`);
    console.log('缺失描述(description):', missingDescription, '条', `(${(missingDescription/prompts.length*100).toFixed(1)}%)`);
    console.log('缺失来源(source):', missingSource, '条', `(${(missingSource/prompts.length*100).toFixed(1)}%)`);
    console.log('缺失图片(imageUrl):', missingImageUrl, '条', `(${(missingImageUrl/prompts.length*100).toFixed(1)}%)`);
    
    // 显示现有的类别和模型标签
    const categories = await prisma.category.findMany();
    const modelTags = await prisma.modelTag.findMany();
    const tags = await prisma.tag.findMany();
    
    console.log('\n=== 现有分类数据 ===');
    console.log('类别(Category):', categories.map(c => c.name).join(', ') || '(空)');
    console.log('AI模型标签(ModelTag):', modelTags.map(m => m.name).join(', ') || '(空)');
    console.log('场景标签(Tag)数量:', tags.length);
    if (tags.length <= 20) {
      console.log('场景标签列表:', tags.map(t => t.name).join(', '));
    }
    
    // 显示前5条缺失数据的示例
    if (promptsWithMissingCategory.length > 0) {
      console.log('\n缺失类别的提示词(前5条):');
      for (const id of promptsWithMissingCategory.slice(0, 5)) {
        const p = prompts.find(x => x.id === id);
        console.log(`  - [${id.slice(0, 8)}...] ${p?.effect?.slice(0, 30)}...`);
      }
    }
    
    if (promptsWithMissingTags.length > 0) {
      console.log('\n缺失场景标签的提示词(前5条):');
      for (const id of promptsWithMissingTags.slice(0, 5)) {
        const p = prompts.find(x => x.id === id);
        console.log(`  - [${id.slice(0, 8)}...] ${p?.effect?.slice(0, 30)}...`);
      }
    }
    
    if (promptsWithMissingModelTags.length > 0) {
      console.log('\n缺失AI模型标签的提示词(前5条):');
      for (const id of promptsWithMissingModelTags.slice(0, 5)) {
        const p = prompts.find(x => x.id === id);
        console.log(`  - [${id.slice(0, 8)}...] ${p?.effect?.slice(0, 30)}...`);
      }
    }
    
    console.log('\n=== 检查完成 ===');
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkMissingFields();

