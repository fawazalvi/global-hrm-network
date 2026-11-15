import { NextResponse } from 'next/server';
import {
  handleAdminApiError,
  requireAdminActor,
  revalidateSurveyPaths,
} from '@/backend/admin-auth-guard';
import { listChoiceManagementData, resolveOtherProposal } from '@/backend/admin-choices-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authRes = await requireAdminActor();
    if (authRes.errorResponse) return authRes.errorResponse;

    const data = await listChoiceManagementData();
    return NextResponse.json({ proposals: data.proposals });
  } catch (error: unknown) {
    return handleAdminApiError(error, 'Unable to load "Other" proposals.');
  }
}

export async function POST(req: Request) {
  try {
    const authRes = await requireAdminActor();
    if (authRes.errorResponse) return authRes.errorResponse;

    const body = await req.json();
    const updated = await resolveOtherProposal(authRes.actor, {
      proposalId: String(body.proposalId || ''),
      action: body.action,
      canonicalName: body.canonicalName,
      shortCode: body.shortCode,
      categoryId: body.categoryId,
      targetId: body.targetId,
      addAlias: Boolean(body.addAlias),
      reviewNotes: body.reviewNotes,
    });
    revalidateSurveyPaths();
    return NextResponse.json({ proposal: updated });
  } catch (error: unknown) {
    return handleAdminApiError(error, 'Unable to resolve proposal.');
  }
}
