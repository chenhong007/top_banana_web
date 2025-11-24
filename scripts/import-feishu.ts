/**
 * Script to import data from Feishu document
 * Usage: npx tsx scripts/import-feishu.ts
 */

interface FeishuItem {
  效果?: string;
  描述?: string;
  评测对象?: string;
  提示词?: string;
  提示词来源?: string;
  更新时间?: string;
  [key: string]: any;
}

async function importFromFeishu() {
  const FEISHU_URL = 'https://u55dyuejxc.feishu.cn/wiki/S5nowuX3uiHXq4kNPb3c7cPpngh?table=tblJT29vyAEQmZzq&view=vewBBRuwm1';
  
  console.log('🚀 Starting Feishu data import...');
  console.log('📄 Source:', FEISHU_URL);
  
  try {
    // Note: Direct web scraping of Feishu may require authentication
    // This is a template - you may need to manually export data from Feishu
    
    console.log('\n⚠️  Note: Feishu documents typically require authentication.');
    console.log('📋 Please follow these steps:');
    console.log('   1. Open the Feishu document in your browser');
    console.log('   2. Export the table as JSON or CSV');
    console.log('   3. Save the file as: scripts/feishu-data.json');
    console.log('   4. Run this script again\n');
    
    // Try to read exported data
    const fs = await import('fs');
    const path = await import('path');
    
    const dataPath = path.join(process.cwd(), 'scripts', 'feishu-data.json');
    
    if (!fs.existsSync(dataPath)) {
      console.log('❌ File not found: scripts/feishu-data.json');
      console.log('\n💡 Alternative: Use the import feature in the admin panel');
      console.log('   URL: http://localhost:3000/admin\n');
      return;
    }
    
    const rawData = fs.readFileSync(dataPath, 'utf-8');
    const feishuData: FeishuItem[] = JSON.parse(rawData);
    
    if (!Array.isArray(feishuData) || feishuData.length === 0) {
      console.log('❌ Invalid data format or empty array');
      return;
    }
    
    console.log(`✅ Found ${feishuData.length} items in source file`);
    
    // Transform data to our format
    const transformedData = feishuData.map(item => ({
      effect: item.效果 || item.effect || '',
      description: item.描述 || item.description || '',
      tags: typeof item.评测对象 === 'string' 
        ? item.评测对象.split(/[,，、]/).map(t => t.trim()).filter(t => t)
        : (item.评测对象 || []),
      prompt: item.提示词 || item.prompt || '',
      source: item.提示词来源 || item.source || FEISHU_URL,
      imageUrl: item.图片 || item.imageUrl || '',
      createdAt: item.更新时间 || item.updatedAt || new Date().toISOString(),
    }));
    
    // Send to import API
    const response = await fetch('http://localhost:3000/api/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: transformedData,
        mode: 'merge', // or 'replace'
      }),
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('\n✅ Import successful!');
      console.log(`   📊 Imported: ${result.data.imported} items`);
      console.log(`   📈 Total: ${result.data.total} items`);
    } else {
      console.log('\n❌ Import failed:', result.error);
      if (result.invalidItems) {
        console.log('   Invalid items:', result.invalidItems);
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run the import
importFromFeishu();

