/**
 * Revalidate API Route
 * POST /api/revalidate - Trigger on-demand revalidation of cached pages
 * 
 * This allows the admin to manually refresh the cache after importing new data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { requireAuth } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Check authentication - only admin can trigger revalidation
  const authError = requireAuth(request);
  if (authError) return authError;

  try {
    // Revalidate the home page for all locales
    revalidatePath('/zh', 'page');
    revalidatePath('/en', 'page');
    revalidatePath('/', 'page');
    
    // Also revalidate by tag if needed
    revalidateTag('prompts');

    return NextResponse.json({
      success: true,
      message: 'Cache revalidated successfully',
      revalidatedPaths: ['/zh', '/en', '/'],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Revalidation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Revalidation failed',
      },
      { status: 500 }
    );
  }
}
