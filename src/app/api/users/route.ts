import { NextResponse } from 'next/server';
import { auth } from '@/backend/auth';
import { db } from '@/backend/db';
import { createUserAction } from '@/backend/actions';
import { UserCreateSchema } from '@/backend/validation';

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Failed to fetch users." }, { status: 500 });
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

    const result = await createUserAction(validatedData);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Error creating user:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
