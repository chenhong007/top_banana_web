/**
 * R2 连接测试脚本
 * 运行: npx ts-node scripts/test-r2.ts
 */

import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// 从环境变量或直接配置
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_R2_ACCOUNT_ID || 'c2c1f8a280d235260be9f33f2f089d21';
const R2_ACCESS_KEY_ID = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'topai-images';

async function testR2Connection() {
  console.log('🔍 测试 Cloudflare R2 连接...\n');
  
  console.log('配置信息:');
  console.log(`  Account ID: ${R2_ACCOUNT_ID}`);
  console.log(`  Access Key ID: ${R2_ACCESS_KEY_ID ? R2_ACCESS_KEY_ID.substring(0, 8) + '...' : '❌ 未配置'}`);
  console.log(`  Secret Access Key: ${R2_SECRET_ACCESS_KEY ? '***已配置***' : '❌ 未配置'}`);
  console.log(`  Bucket Name: ${R2_BUCKET_NAME}`);
  console.log(`  Endpoint: https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com\n`);

  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error('❌ 错误: 请配置 CLOUDFLARE_R2_ACCESS_KEY_ID 和 CLOUDFLARE_R2_SECRET_ACCESS_KEY');
    console.log('\n步骤:');
    console.log('1. 登录 Cloudflare Dashboard');
    console.log('2. 进入 R2 > Manage R2 API Tokens');
    console.log('3. 创建 API Token (选择 Object Read & Write 权限)');
    console.log('4. 将 Access Key ID 和 Secret Access Key 添加到 .env.local 文件');
    return;
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  try {
    // 测试1: 列出存储桶内容
    console.log('📋 测试 1: 列出存储桶内容...');
    const listCommand = new ListObjectsV2Command({
      Bucket: R2_BUCKET_NAME,
      MaxKeys: 5,
    });
    
    const listResult = await client.send(listCommand);
    console.log(`  ✅ 成功! 存储桶中有 ${listResult.KeyCount || 0} 个对象\n`);

    // 测试2: 上传测试文件
    console.log('📤 测试 2: 上传测试文件...');
    const testContent = `R2 Connection Test - ${new Date().toISOString()}`;
    const testKey = `test/connection-test-${Date.now()}.txt`;
    
    const putCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: testKey,
      Body: testContent,
      ContentType: 'text/plain',
    });

    await client.send(putCommand);
    console.log(`  ✅ 成功! 已上传测试文件: ${testKey}\n`);

    // 测试3: 上传测试图片（从网络下载）
    console.log('🖼️ 测试 3: 从 URL 下载并上传图片...');
    const imageUrl = 'https://picsum.photos/200/200';
    
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const imageBuffer = Buffer.from(await response.arrayBuffer());
    const imageKey = `images/test-${Date.now()}.jpg`;

    const putImageCommand = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: imageKey,
      Body: imageBuffer,
      ContentType: 'image/jpeg',
    });

    await client.send(putImageCommand);
    console.log(`  ✅ 成功! 已上传测试图片: ${imageKey}`);
    console.log(`  图片大小: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`);

    console.log('🎉 所有测试通过! Cloudflare R2 配置正确。');
    
  } catch (error) {
    console.error('\n❌ 测试失败:');
    if (error instanceof Error) {
      console.error(`  错误信息: ${error.message}`);
      if (error.message.includes('AccessDenied')) {
        console.error('\n  可能的原因:');
        console.error('  1. API Token 权限不足 (需要 Object Read & Write)');
        console.error('  2. Bucket 名称不正确');
        console.error('  3. API Token 已过期或被撤销');
      } else if (error.message.includes('NoSuchBucket')) {
        console.error('\n  可能的原因:');
        console.error(`  Bucket "${R2_BUCKET_NAME}" 不存在，请先在 Cloudflare R2 控制台创建`);
      }
    } else {
      console.error(error);
    }
  }
}

testR2Connection();

