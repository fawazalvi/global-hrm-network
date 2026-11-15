import { NextResponse } from 'next/server';
import { isDatabaseUnavailableError } from '@/backend/db';
import {
  PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG,
  validateReferralCode,
} from '@/backend/survey-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code') || '';
    const result = await validateReferralCode(PAKISTAN_BANKING_MAP_CAMPAIGN_SLUG, code);
    return NextResponse.json(result);
  } catch (error: unknown) {
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ valid: false }, { status: 200 });
    }
    console.error('Error validating referral code:', error);
    return NextResponse.json({ valid: false }, { status: 200 });
  }
}
