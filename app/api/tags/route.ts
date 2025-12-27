/**
 * Tags API Route
 * GET /api/tags - Get all tags
 * POST /api/tags - Create a new tag (requires authentication)
 * PUT /api/tags - Update a tag (requires authentication)
 * DELETE /api/tags - Delete a tag (requires authentication)
 */

import { NextRequest } from 'next/server';
import { tagRepository } from '@/repositories';
import { successResponse, errorResponse, handleApiRoute } from '@/lib/api-utils';
import { requireAuth } from '@/lib/security';

// Force dynamic rendering to avoid database calls during build
export const dynamic = 'force-dynamic';

// GET all tags
export async function GET() {
  return handleApiRoute(async () => {
    const tags = await tagRepository.findAll();
    return successResponse(tags);
  });
}

// POST - Create a new tag (requires authentication)
export async function POST(request: NextRequest) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  return handleApiRoute(async () => {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return errorResponse('标签名称不能为空', 400);
    }

    const trimmedName = name.trim();

    // Check if tag already exists
    const existingTag = await tagRepository.findByName(trimmedName);
    if (existingTag) {
      return errorResponse('标签已存在', 400);
    }

    const tag = await tagRepository.create(trimmedName);
    if (!tag) {
      return errorResponse('创建标签失败', 500);
    }

    return successResponse(tag);
  });
}

// PUT - Update a tag (requires authentication)
export async function PUT(request: NextRequest) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  return handleApiRoute(async () => {
    const body = await request.json();
    const { oldName, newName } = body;

    if (!oldName || typeof oldName !== 'string' || !oldName.trim()) {
      return errorResponse('原标签名称不能为空', 400);
    }

    if (!newName || typeof newName !== 'string' || !newName.trim()) {
      return errorResponse('新标签名称不能为空', 400);
    }

    const trimmedOldName = oldName.trim();
    const trimmedNewName = newName.trim();

    if (trimmedOldName === trimmedNewName) {
      return successResponse({ message: '标签名称未更改' });
    }

    // Check if the new name already exists
    const existingTag = await tagRepository.findByName(trimmedNewName);
    if (existingTag) {
      return errorResponse('新标签名称已存在', 400);
    }

    const success = await tagRepository.update(trimmedOldName, trimmedNewName);
    if (!success) {
      return errorResponse('更新标签失败', 500);
    }

    return successResponse({ message: '标签更新成功' });
  });
}

// DELETE - Delete a tag (requires authentication)
export async function DELETE(request: NextRequest) {
  // Check authentication
  const authError = requireAuth(request);
  if (authError) return authError;

  return handleApiRoute(async () => {
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name || !name.trim()) {
      return errorResponse('标签名称不能为空', 400);
    }

    const trimmedName = name.trim();

    const success = await tagRepository.delete(trimmedName);
    if (!success) {
      return errorResponse('删除标签失败', 500);
    }

    return successResponse({ message: '标签删除成功' });
  });
}
