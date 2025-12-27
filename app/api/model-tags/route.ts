/**
 * Model Tags API Route
 * GET /api/model-tags - Get all AI model tags
 */

import { NextRequest } from 'next/server';
import { modelTagRepository } from '@/repositories';
import { successResponse, handleApiRoute } from '@/lib/api-utils';
import { applyApiProtection, addProtectionHeaders } from '@/lib/anti-scraping';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

// GET all model tags with anti-scraping protection
export async function GET(request: NextRequest) {
  // Apply anti-scraping protection
  const protection = applyApiProtection(request, 'modelTags');
  if (!protection.allowed && protection.response) {
    return addProtectionHeaders(protection.response);
  }

  return handleApiRoute(async () => {
    // 返回完整的模型标签信息，包括 id、name、color、type 等
    const modelTags = await modelTagRepository.findAllWithDetails();
    const response = successResponse(modelTags);
    return addProtectionHeaders(response);
  });
}
