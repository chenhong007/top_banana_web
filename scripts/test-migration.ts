/**
 * Test script for tag migration
 * Run this script to test the tag migration API endpoints
 */

import 'dotenv/config';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3001';
const SECRET = process.env.IMPORT_SECRET;

if (!SECRET) {
  console.error('❌ IMPORT_SECRET not found in environment variables');
  process.exit(1);
}

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

async function testGetStatus() {
  console.log('\n📊 测试 1: 获取当前标签状态');
  console.log('==========================================');
  
  try {
    const response = await fetch(`${BASE_URL}/api/migrate-tags`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SECRET}`,
      },
    });

    const result: ApiResponse = await response.json();
    
    if (result.success) {
      console.log('✅ 成功获取标签状态');
      console.log('当前标签数量:', result.data.currentTagCount);
      console.log('目标标签数量:', result.data.targetTagCount);
      console.log('需要迁移:', result.data.analysis.needMigration, '个');
      console.log('已是中文:', result.data.analysis.alreadyChinese, '个');
      console.log('其他:', result.data.analysis.others, '个');
      
      console.log('\n前 10 个标签:');
      result.data.currentTags.slice(0, 10).forEach((tag: any) => {
        console.log(`  - ${tag.name} (${tag.promptCount} prompts) → ${tag.willMapTo}`);
      });
      
      return result.data;
    } else {
      console.error('❌ 获取失败:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ 请求错误:', error);
    return null;
  }
}

async function testDryRun() {
  console.log('\n🔍 测试 2: 预览迁移计划 (DRY RUN)');
  console.log('==========================================');
  
  try {
    const response = await fetch(`${BASE_URL}/api/migrate-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: SECRET,
        dryRun: true,
      }),
    });

    const result: ApiResponse = await response.json();
    
    if (result.success) {
      console.log('✅ 成功生成迁移计划');
      console.log('迁移前标签数:', result.data.stats.totalTags);
      console.log('保持不变:', result.data.stats.tagsToKeep, '个');
      console.log('需要合并:', result.data.stats.tagsToMerge, '个');
      console.log('迁移后标签数:', result.data.stats.finalTagCount);
      
      console.log('\n迁移计划示例 (前 10 条):');
      result.data.migrationPlan.slice(0, 10).forEach((plan: any) => {
        console.log(`  ${plan.oldTag} (${plan.promptCount} prompts) → ${plan.newTag} [${plan.action}]`);
      });
      
      return result.data;
    } else {
      console.error('❌ 预览失败:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ 请求错误:', error);
    return null;
  }
}

async function testMigration(execute: boolean = false) {
  if (!execute) {
    console.log('\n⏭️  跳过实际迁移 (设置 execute=true 以执行)');
    return;
  }

  console.log('\n🚀 测试 3: 执行标签迁移');
  console.log('==========================================');
  console.log('⚠️  警告: 这将实际修改数据库!');
  
  // 等待 3 秒让用户有机会取消
  console.log('将在 3 秒后开始...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  try {
    const response = await fetch(`${BASE_URL}/api/migrate-tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: SECRET,
        dryRun: false,
      }),
    });

    const result: ApiResponse = await response.json();
    
    if (result.success) {
      console.log('✅ 迁移完成!');
      console.log('迁移前标签数:', result.data.stats.before);
      console.log('迁移后标签数:', result.data.stats.after);
      console.log('成功迁移:', result.data.stats.migrated, '个');
      console.log('失败:', result.data.stats.errors, '个');
      
      console.log('\n最终标签列表 (按 prompt 数量排序):');
      result.data.finalTags.forEach((tag: any) => {
        console.log(`  - ${tag.name}: ${tag.promptCount} prompts`);
      });
      
      return result.data;
    } else {
      console.error('❌ 迁移失败:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ 请求错误:', error);
    return null;
  }
}

async function testGetFinalTags() {
  console.log('\n📋 测试 4: 获取最终标签列表');
  console.log('==========================================');
  
  try {
    const response = await fetch(`${BASE_URL}/api/tags`);
    const result: ApiResponse = await response.json();
    
    if (result.success) {
      console.log('✅ 成功获取标签列表');
      console.log('标签数量:', result.data.length);
      console.log('标签列表:', result.data.join(', '));
      return result.data;
    } else {
      console.error('❌ 获取失败:', result.error);
      return null;
    }
  } catch (error) {
    console.error('❌ 请求错误:', error);
    return null;
  }
}

async function main() {
  console.log('🧪 标签迁移测试脚本');
  console.log('==========================================');
  console.log('API 地址:', BASE_URL);
  console.log('认证密钥:', SECRET ? '✓ 已配置' : '✗ 未配置');
  
  // 测试 1: 获取当前状态
  const status = await testGetStatus();
  if (!status) {
    console.error('\n❌ 测试失败: 无法获取标签状态');
    process.exit(1);
  }
  
  // 测试 2: 预览迁移
  const dryRunResult = await testDryRun();
  if (!dryRunResult) {
    console.error('\n❌ 测试失败: 无法生成迁移计划');
    process.exit(1);
  }
  
  // 询问是否执行实际迁移
  const executeArg = process.argv[2];
  if (executeArg === '--execute' || executeArg === '-e') {
    await testMigration(true);
    await testGetFinalTags();
  } else {
    console.log('\n✅ 预览测试通过!');
    console.log('\n要执行实际迁移，请运行:');
    console.log('  npm run test:migrate -- --execute');
    console.log('或:');
    console.log('  node --loader tsx scripts/test-migration.ts --execute');
  }
  
  console.log('\n==========================================');
  console.log('✅ 测试完成!');
}

main().catch(error => {
  console.error('测试脚本错误:', error);
  process.exit(1);
});
