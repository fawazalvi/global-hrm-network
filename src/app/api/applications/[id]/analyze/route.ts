import { NextResponse } from 'next/server';
import { auth } from '@/backend/auth';
import { analyzeApplicationAction } from '@/backend/actions';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: applicationId } = await params;
    const body = await req.json();
    const { linkedinUrl, expertise } = body || {};

    if (!linkedinUrl || !expertise) {
      return NextResponse.json({ error: "Missing required arguments" }, { status: 400 });
    }

    const result = await analyzeApplicationAction(applicationId, { linkedinUrl, expertise });
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Error analyzing application:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
