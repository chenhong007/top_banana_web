/**
 * Feishu document scraper utility
 * Attempts to fetch and parse Feishu document data
 */

export interface FeishuScraperOptions {
  url: string;
  cookie?: string; // Optional authentication cookie
}

export async function scrapeFeishuDocument(options: FeishuScraperOptions) {
  try {
    const headers: HeadersInit = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/json',
    };
    
    if (options.cookie) {
      headers['Cookie'] = options.cookie;
    }
    
    const response = await fetch(options.url, {
      headers,
      method: 'GET',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    
    // Try to parse as JSON first
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      return { success: true, data, contentType: 'json' };
    }
    
    // Otherwise get HTML
    const html = await response.text();
    
    // Check if it's a login page or requires authentication
    if (html.includes('登录') || html.includes('login') || html.includes('auth')) {
      return { 
        success: false, 
        error: 'Authentication required',
        message: '文档需要登录访问，请提供 Cookie 或手动导出数据'
      };
    }
    
    // Try to extract JSON data from HTML
    const jsonMatch = html.match(/<script[^>]*>window\.__INITIAL_STATE__\s*=\s*({.+?})<\/script>/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[1]);
      return { success: true, data, contentType: 'embedded-json' };
    }
    
    return { 
      success: false, 
      error: 'Could not parse document',
      message: '无法自动解析文档，建议手动导出数据'
    };
    
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: '请求失败，可能是网络问题或需要认证'
    };
  }
}

// Helper to extract table data from Feishu API response
export function extractTableData(data: any): any[] {
  try {
    // Try different possible data structures
    if (Array.isArray(data)) {
      return data;
    }
    
    if (data.data?.items) {
      return data.data.items;
    }
    
    if (data.items) {
      return data.items;
    }
    
    if (data.records) {
      return data.records;
    }
    
    return [];
  } catch (error) {
    console.error('Error extracting table data:', error);
    return [];
  }
}

