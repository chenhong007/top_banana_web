import { NextRequest, NextResponse } from 'next/server';
import { parseCSV, transformCSVToPrompts } from '@/lib/csv-parser';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// POST parse CSV data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { csvText } = body;
    
    if (!csvText) {
      return NextResponse.json(
        { success: false, error: 'CSV text is required' },
        { status: 400 }
      );
    }
    
    // Parse CSV
    const csvData = parseCSV(csvText);
    
    if (csvData.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid data found in CSV' },
        { status: 400 }
      );
    }
    
    // Transform to prompt items
    const items = transformCSVToPrompts(csvData);
    
    if (items.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid items found',
          message: '未找到有效数据，请检查CSV格式和必填字段'
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: {
        items,
        count: items.length,
        total: csvData.length,
      },
    });
  } catch (error) {
    console.error('CSV parse error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to parse CSV',
        message: error instanceof Error ? error.message : 'CSV解析失败'
      },
      { status: 500 }
    );
  }
}

