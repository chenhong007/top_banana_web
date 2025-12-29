/**
 * 测试不同方式获取图片
 */

const testUrls = [
  'https://camo.githubusercontent.com/4ffb81b3047df5f83649540ebaeb6cff34583c4b65c43819249b37610500bd77/68747470733a2f2f626962696770742d617070732e63686174696d672f67656d696e692d72657472792d347a38794e2d45564852427468546e704342384b612e706e673f763d31',
  'https://linux.do/uploads/default/optimized/4X/d/f/0/df08ae8cfb92b936135376ce87e8ca83a2f1e044_2_732x1000.jpeg',
];

async function testFetch(url: string) {
  console.log('\n========================================');
  console.log('Testing:', url.substring(0, 60) + '...');
  
  const parsedUrl = new URL(url);
  const host = parsedUrl.hostname;
  
  // 测试 1: 基础请求
  console.log('\n1. 基础请求 (无特殊 headers):');
  try {
    const res = await fetch(url);
    console.log('   Status:', res.status, res.statusText);
  } catch (e) {
    console.log('   Error:', e instanceof Error ? e.message : e);
  }

  // 测试 2: 带 User-Agent
  console.log('\n2. 带 User-Agent:');
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    });
    console.log('   Status:', res.status, res.statusText);
  } catch (e) {
    console.log('   Error:', e instanceof Error ? e.message : e);
  }

  // 测试 3: 带完整浏览器 headers
  console.log('\n3. 带完整浏览器 headers:');
  try {
    let referer = parsedUrl.origin;
    if (host.includes('github')) referer = 'https://github.com';
    if (host.includes('linux.do')) referer = 'https://linux.do';
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': referer,
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'Sec-Fetch-Dest': 'image',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'cross-site',
      },
      redirect: 'follow',
    });
    console.log('   Status:', res.status, res.statusText);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      console.log('   Size:', buffer.byteLength, 'bytes');
      console.log('   Content-Type:', res.headers.get('content-type'));
    }
  } catch (e) {
    console.log('   Error:', e instanceof Error ? e.message : e);
  }

  // 测试 4: 不带 Sec-Fetch 头
  console.log('\n4. 不带 Sec-Fetch 头:');
  try {
    let referer = parsedUrl.origin;
    if (host.includes('github')) referer = 'https://github.com';
    if (host.includes('linux.do')) referer = 'https://linux.do';
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': referer,
      },
      redirect: 'follow',
    });
    console.log('   Status:', res.status, res.statusText);
    if (res.ok) {
      const buffer = await res.arrayBuffer();
      console.log('   Size:', buffer.byteLength, 'bytes');
    }
  } catch (e) {
    console.log('   Error:', e instanceof Error ? e.message : e);
  }
}

async function main() {
  for (const url of testUrls) {
    await testFetch(url);
  }
}

main().catch(console.error);
