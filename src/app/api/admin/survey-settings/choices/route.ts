import { NextResponse } from 'next/server';
import {
  handleAdminApiError,
  requireAdminActor,
  revalidateSurveyPaths,
} from '@/backend/admin-auth-guard';
import {
  createChoiceItem,
  deleteChoiceItem,
  listChoiceManagementData,
  mergeInstitutions,
  reorderChoiceItems,
  toggleCampaignAvailability,
  toggleChoiceActive,
  updateChoiceItem,
  type ManagedEntityType,
} from '@/backend/admin-choices-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const authRes = await requireAdminActor();
    if (authRes.errorResponse) return authRes.errorResponse;

    const data = await listChoiceManagementData();
    return NextResponse.json(data);
  } catch (error: unknown) {
    return handleAdminApiError(error, 'Unable to load survey choice management data.');
  }
}

export async function POST(req: Request) {
  try {
    const authRes = await requireAdminActor();
    if (authRes.errorResponse) return authRes.errorResponse;

    const body = await req.json();
    if (body.action === 'merge_institutions') {
      const result = await mergeInstitutions(
        authRes.actor,
        String(body.sourceInstitutionId || ''),
        String(body.targetInstitutionId || ''),
        Boolean(body.previewOnly)
      );
      if (!body.previewOnly) revalidateSurveyPaths();
      return NextResponse.json(result);
    }

    const entityType = body.entityType as ManagedEntityType;
    const created = await createChoiceItem(authRes.actor, entityType, body.data ?? body);
    revalidateSurveyPaths();
    return NextResponse.json({ item: created }, { status: 201 });
  } catch (error: unknown) {
    return handleAdminApiError(error, 'Unable to create choice item.');
  }
}

export async function PATCH(req: Request) {
  try {
    const authRes = await requireAdminActor();
    if (authRes.errorResponse) return authRes.errorResponse;

    const body = await req.json();
    const entityType = body.entityType as ManagedEntityType;

    if (body.action === 'reorder') {
      await reorderChoiceItems(authRes.actor, entityType, body.orderedIds ?? []);
      revalidateSurveyPaths();
      return NextResponse.json({ success: true });
    }

    if (body.action === 'toggle_active') {
      const updated = await toggleChoiceActive(
        authRes.actor,
        entityType,
        String(body.id),
        Boolean(body.isActive)
      );
      revalidateSurveyPaths();
      return NextResponse.json({ item: updated });
    }

    if (body.action === 'toggle_campaign') {
      const updated = await toggleCampaignAvailability(
        authRes.actor,
        entityType,
        String(body.id),
        Boolean(body.isEnabled)
      );
      revalidateSurveyPaths();
      return NextResponse.json({ item: updated });
    }

    const updated = await updateChoiceItem(
      authRes.actor,
      entityType,
      String(body.id),
      body.data ?? body
    );
    revalidateSurveyPaths();
    return NextResponse.json({ item: updated });
  } catch (error: unknown) {
    return handleAdminApiError(error, 'Unable to update choice item.');
  }
}

export async function DELETE(req: Request) {
  try {
    const authRes = await requireAdminActor();
    if (authRes.errorResponse) return authRes.errorResponse;

    const url = new URL(req.url);
    const entityType = url.searchParams.get('entityType') as ManagedEntityType;
    const id = url.searchParams.get('id') || '';

    await deleteChoiceItem(authRes.actor, entityType, id);
    revalidateSurveyPaths();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return handleAdminApiError(error, 'Unable to delete choice item.');
  }
}
