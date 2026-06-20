import { NextResponse } from 'next/server';
import { auth } from '@/backend/auth';
import { updateVerificationStatusAction } from '@/backend/actions';
import { ProfileVerifySchema } from '@/backend/validation';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: profileId } = await params;
    const body = await req.json();

    // Validate body
    const validatedData = ProfileVerifySchema.parse(body);

    const result = await updateVerificationStatusAction(profileId, validatedData.verificationStatus);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Error updating verification status:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
