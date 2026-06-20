import { NextResponse } from 'next/server';
import { auth } from '@/backend/auth';
import { suspendUserAction, deleteUserAction } from '@/backend/actions';
import { UserUpdateStatusSchema } from '@/backend/validation';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;
    const body = await req.json();

    // Validate request body
    const validatedData = UserUpdateStatusSchema.parse(body);

    // Call suspendUserAction (which toggles based on the current status)
    // Note: suspendUserAction toggles, but since we are specifying the target accountStatus,
    // we can pass the OPPOSITE of target status so the toggle achieves the target status.
    // E.g. if target is 'suspended', passing currentStatus as 'active' will toggle it to 'suspended'.
    const currentSimulatedStatus = validatedData.accountStatus === 'suspended' ? 'active' : 'suspended';
    
    const result = await suspendUserAction(userId, currentSimulatedStatus);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, newStatus: result.newStatus });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Error updating user status:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: userId } = await params;

    const result = await deleteUserAction(userId);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
