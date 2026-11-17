import { NextResponse } from 'next/server';
import { auth, type AuthSession } from '@/backend/auth';

export type LeadPermission =
  | 'view_leads'
  | 'edit_import_leads'
  | 'send_invitations'
  | 'export_leads'
  | 'manage_suppression'
  | 'view_email_logs';

const ROLE_PERMISSIONS: Record<string, Set<LeadPermission>> = {
  admin: new Set([
    'view_leads',
    'edit_import_leads',
    'send_invitations',
    'export_leads',
    'manage_suppression',
    'view_email_logs',
  ]),
  moderator: new Set(['view_leads', 'view_email_logs']),
};

export async function requireLeadPermission(
  permission: LeadPermission
): Promise<{ ok: true; session: AuthSession } | { ok: false; response: NextResponse }> {
  const session = await auth();
  if (!session || !session.user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const allowed = ROLE_PERMISSIONS[session.user.role];
  if (!allowed || !allowed.has(permission)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: `Forbidden: Missing "${permission}" permission.` },
        { status: 403 }
      ),
    };
  }

  return { ok: true, session };
}
