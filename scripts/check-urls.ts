import { PrismaClient } from '@prisma/client';
import { isR2ImageUrl } from '../lib/r2';

const prisma = new PrismaClient();

async function main() {
  // 获取一些外部 URL 的示例
  const prompts = await prisma.prompt.findMany({
    where: {
      OR: [
        { imageUrl: { not: null } },
        { imageUrls: { isEmpty: false } },
      ],
    },
    select: {
      id: true,
      imageUrl: true,
      imageUrls: true,
    },
    take: 100,
  });

  // 分析 URL 类型 (使用 isR2ImageUrl 函数)
  const stats: Record<string, string[]> = {
    r2: [],
    external: [],
    local: [],
  };

  for (const p of prompts) {
    const urls: string[] = [];
    if (p.imageUrl) urls.push(p.imageUrl);
    if (p.imageUrls) urls.push(...p.imageUrls);
    
    for (const url of urls) {
      // 使用 isR2ImageUrl 函数判断
      if (isR2ImageUrl(url)) {
        stats.r2.push(url);
      } else if (url.startsWith('./data/') || url.startsWith('data/')) {
        stats.local.push(url);
      } else if (url.startsWith('http')) {
        stats.external.push(url);
      }
    }
  }

  console.log('=== 外部 URL 示例（前15个）===');
  stats.external.slice(0, 15).forEach((u, i) => console.log(i + 1, u));
  
  console.log('\n=== 统计 ===');
  console.log('R2:', stats.r2.length);
  console.log('外部:', stats.external.length);
  console.log('本地:', stats.local.length);

  // 测试所有外部 URL 是否可访问
  if (stats.external.length > 0) {
    console.log('\n=== 测试所有外部 URL 可访问性 (使用增强请求头) ===');
    for (const testUrl of stats.external) {
      console.log('\nTesting:', testUrl.substring(0, 80) + '...');
      try {
        const parsedUrl = new URL(testUrl);
        const host = parsedUrl.hostname.toLowerCase();
        
        // 根据域名选择最佳请求头
        let headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
          'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"',
          'Sec-Fetch-Dest': 'image',
          'Sec-Fetch-Mode': 'no-cors',
          'Sec-Fetch-Site': 'cross-site',
        };

        // 针对特定域名设置 Referer
        if (host.includes('camo.githubusercontent.com') || host.includes('github')) {
          headers['Referer'] = 'https://github.com/';
          headers['Origin'] = 'https://github.com';
        } else if (host.includes('linux.do')) {
          headers['Referer'] = 'https://linux.do/';
          headers['Origin'] = 'https://linux.do';
        } else {
          headers['Referer'] = parsedUrl.origin + '/';
        }

        const response = await fetch(testUrl, { 
          headers,
          redirect: 'follow',
        });
        console.log('  Status:', response.status, response.statusText);
        if (response.ok) {
          console.log('  Content-Type:', response.headers.get('content-type'));
          console.log('  Content-Length:', response.headers.get('content-length'));
        }
      } catch (error) {
        console.error('  Error:', error instanceof Error ? error.message : error);
      }
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(console.error);
