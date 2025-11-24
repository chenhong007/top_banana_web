import { NextRequest, NextResponse } from 'next/server';
import { scrapeFeishuDocument, extractTableData } from '@/lib/feishu-scraper';

// POST scrape Feishu document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, cookie } = body;
    
    if (!url) {
      return NextResponse.json(
        { success: false, error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Validate URL
    if (!url.includes('feishu.cn') && !url.includes('larksuite.com')) {
      return NextResponse.json(
        { success: false, error: 'Invalid Feishu URL' },
        { status: 400 }
      );
    }
    
    const result = await scrapeFeishuDocument({ url, cookie });
    
    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          message: result.message,
          requiresAuth: result.error === 'Authentication required'
        },
        { status: 400 }
      );
    }
    
    // Extract table data
    const items = extractTableData(result.data);
    
    if (items.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No data found',
          message: '未找到数据，请检查文档链接或权限'
        },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        items,
        count: items.length,
      },
    });
  } catch (error) {
    console.error('Feishu scrape error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Feishu document' },
      { status: 500 }
    );
  }
}

