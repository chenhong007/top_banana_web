/**
 * 远程导入执行脚本
 * 用法: node scripts/remote-import.js
 */

const API_URL = 'https://topai.ink/api/import/json';
const SECRET = 'my-super-secret-key-2024';
const BATCH_SIZE = 50; // 每次处理 50 条，防止超时

async function runImport() {
  console.log('🚀 开始远程导入任务...');
  console.log(`目标地址: ${API_URL}`);
  
  let offset = 0;
  let hasMore = true;
  let totalSuccess = 0;
  let totalSkipped = 0;

  while (hasMore) {
    console.log(`\n📦 正在处理批次: offset=${offset}, limit=${BATCH_SIZE}`);
    
    try {
      console.log(`   -> 发送请求到 ${API_URL}`);
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SECRET}`
      };
      
      console.log('   -> Request Headers:', headers);

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          secret: SECRET, // 通过 body 传递 token 作为备选
          limit: BATCH_SIZE,
          offset: offset,
          skipR2: false
        })
      });

      // 尝试解析 JSON
      let result;
      const text = await response.text();
      try {
        result = JSON.parse(text);
      } catch (e) {
        throw new Error(`无法解析服务器响应: ${text.substring(0, 100)}...`);
      }
      
      if (!response.ok) {
        throw new Error(result.error || `HTTP ${response.status}`);
      }

      const stats = result.data.stats;
      const skipped = (stats['跳过(URL重复)'] || 0) + (stats['跳过(内容相似)'] || 0);
      
      console.log(`✅ 本批次完成: 成功=${stats.成功导入}, 跳过=${skipped}, 错误=${stats.错误数}`);
      
      if (result.data.errors && result.data.errors.length > 0) {
        console.log('   错误示例:', result.data.errors[0]);
      }

      // 更新总计
      totalSuccess += stats.成功导入;
      totalSkipped += skipped;

      // 更新偏移量
      offset += BATCH_SIZE;

      // 如果本次处理的数量为0，或者小于请求的数量，说明已经到最后了
      if (stats.本次处理 < BATCH_SIZE) {
        hasMore = false;
        console.log('\n✨ 所有数据处理完毕！');
        console.log(`📊 总计: 成功导入=${totalSuccess}, 跳过=${totalSkipped}`);
      }

    } catch (error) {
      console.error('\n❌ 本批次失败!');
      console.error('----------------------------------------');
      console.error('错误类型:', error.name);
      console.error('错误信息:', error.message);
      if (error.cause) {
        console.error('错误原因:', error.cause);
      }
      if (error.stack) {
        console.error('调用堆栈:\n', error.stack);
      }
      console.error('----------------------------------------');
      
      console.log('⚠️ 停止执行。请检查网络连接或 API 地址是否正确。');
      break;
    }
    
    // 稍微等待一下，避免请求太快
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

runImport();

