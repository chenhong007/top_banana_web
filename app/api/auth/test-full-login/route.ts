import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, generateToken } from '@/lib/auth';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const steps: Record<string, unknown> = {};
  
  try {
    // Step 1: Parse request
    steps.step1_parseRequest = 'starting';
    const body = await request.json();
    const { username, password } = body;
    steps.step1_parseRequest = 'success';
    steps.receivedUsername = username;
    steps.receivedPasswordLength = password?.length;

    // Step 2: Validate credentials
    steps.step2_validateCredentials = 'starting';
    try {
      const isValid = validateCredentials(username, password);
      steps.step2_validateCredentials = isValid ? 'valid' : 'invalid';
      steps.credentialsValid = isValid;
    } catch (error) {
      steps.step2_validateCredentials = 'error';
      steps.step2_error = error instanceof Error ? error.message : String(error);
    }

    // Step 3: Generate token (only if credentials valid)
    if (steps.credentialsValid) {
      steps.step3_generateToken = 'starting';
      try {
        const token = generateToken(username);
        steps.step3_generateToken = 'success';
        steps.tokenGenerated = true;
        steps.tokenLength = token.length;
      } catch (error) {
        steps.step3_generateToken = 'error';
        steps.step3_error = error instanceof Error ? error.message : String(error);
      }
    }

    return NextResponse.json({
      success: steps.credentialsValid === true,
      steps,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      steps,
    }, { status: 500 });
  }
}

