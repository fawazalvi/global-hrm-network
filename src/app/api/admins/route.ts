import { NextResponse } from 'next/server';
import { auth } from '@/backend/auth';
import { db } from '@/backend/db';
import { createAdminAction } from '@/backend/actions';
import { UserCreateSchema } from '@/backend/validation';

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admins = await db.user.findMany({
      where: { role: 'admin' },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ admins });
  } catch (error: any) {
    console.error("Error fetching admins:", error);
    return NextResponse.json({ error: "Failed to fetch admins." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    // Validate body
    const validatedData = UserCreateSchema.parse(body);

    const result = await createAdminAction(validatedData);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, admin: result.admin });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Error creating admin:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
