import crypto from 'crypto';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';

export const REFERRAL_SESSION_COOKIE_NAME = 'ghrm_survey_ref_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface ReferralSessionPayload {
  participantId: string;
  campaignSlug: string;
  exp: number;
}

function getSigningSecret(): string {
  return process.env.NEXTAUTH_SECRET || 'ghrm-survey-referral-dev-secret';
}

function signPayload(encodedPayload: string): string {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');
}

export function createReferralSessionToken(
  participantId: string,
  campaignSlug: string
): string {
  const payload: ReferralSessionPayload = {
    participantId,
    campaignSlug,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

export function verifyReferralSessionToken(token: string | undefined): ReferralSessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [encoded, providedSig] = parts;
  const expectedSig = signPayload(encoded);

  const a = Buffer.from(providedSig, 'utf8');
  const b = Buffer.from(expectedSig, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as ReferralSessionPayload;
    if (!parsed.participantId || !parsed.campaignSlug || typeof parsed.exp !== 'number') {
      return null;
    }
    if (parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function attachReferralSessionCookie(
  response: NextResponse,
  participantId: string,
  campaignSlug: string
) {
  const token = createReferralSessionToken(participantId, campaignSlug);
  response.cookies.set(REFERRAL_SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function getActiveReferralSession(): Promise<ReferralSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(REFERRAL_SESSION_COOKIE_NAME)?.value;
  return verifyReferralSessionToken(token);
}
