import { NextResponse } from 'next/server';
import { auth } from '@/backend/auth';
import { approveApplicationAction, rejectApplicationAction } from '@/backend/actions';
import { ApplicationUpdateStatusSchema } from '@/backend/validation';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: applicationId } = await params;
    const body = await req.json();

    // Validate body
    const validatedData = ApplicationUpdateStatusSchema.parse(body);

    if (validatedData.status === "approved") {
      const result = await approveApplicationAction(applicationId);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ success: true, tempPassword: result.tempPassword });
    } else {
      const result = await rejectApplicationAction(applicationId);
      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Error updating application status:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
