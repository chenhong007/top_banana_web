/**
 * 将所有提示词的模型标签设置为 Banana
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setAllToBanana() {
  console.log('将所有提示词的模型标签设置为 Banana...\n');
  
  // 获取 Banana 标签
  const bananaTag = await prisma.modelTag.findUnique({ where: { name: 'Banana' } });
  if (!bananaTag) {
    console.error('未找到 Banana 标签');
    return;
  }
  
  // 获取所有提示词
  const prompts = await prisma.prompt.findMany({ include: { modelTags: true } });
  
  console.log(`共 ${prompts.length} 条提示词需要处理...`);
  
  let updated = 0;
  for (const prompt of prompts) {
    // 先断开所有模型标签，然后只连接 Banana
    await prisma.prompt.update({
      where: { id: prompt.id },
      data: {
        modelTags: {
          set: [], // 清除所有
          connect: { name: 'Banana' } // 只连接 Banana
        }
      }
    });
    updated++;
    
    if (updated % 50 === 0) {
      console.log(`  已处理 ${updated}/${prompts.length} 条...`);
    }
  }
  
  console.log(`\n✓ 已更新 ${updated} 条提示词`);
  
  // 显示统计
  const stats = await prisma.modelTag.findMany({
    include: { _count: { select: { prompts: true } } },
    orderBy: { prompts: { _count: 'desc' } }
  });
  
  console.log('\n=== 模型标签统计 ===');
  for (const tag of stats) {
    console.log(`  ${tag.name}: ${tag._count.prompts} 条`);
  }
  
  await prisma.$disconnect();
}

setAllToBanana();

