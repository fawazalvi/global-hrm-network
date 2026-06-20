import { NextResponse } from 'next/server';
import { auth } from '@/backend/auth';
import { db } from '@/backend/db';
import { submitApplicationAction } from '@/backend/actions';
import { ApplicationSubmitSchema } from '@/backend/validation';

export async function GET() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbApplications = await db.application.findMany({
      orderBy: { submittedAt: 'desc' }
    });

    // Parse array properties back for client convenience
    const parseField = (field: any) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      try {
        return typeof field === 'string' ? JSON.parse(field) : field;
      } catch {
        return [];
      }
    };

    const applications = dbApplications.map(app => ({
      ...app,
      expertise: parseField(app.expertise),
      assessments: parseField(app.assessments),
    }));

    return NextResponse.json({ applications });
  } catch (error: any) {
    console.error("Error fetching applications:", error);
    return NextResponse.json({ error: "Failed to fetch applications." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Validate incoming application data with Zod
    const validatedData = ApplicationSubmitSchema.parse(body);

    const result = await submitApplicationAction(validatedData);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, appId: result.appId });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Error submitting application:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
