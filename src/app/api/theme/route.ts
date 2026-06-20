import { NextResponse } from 'next/server';
import { auth } from '@/backend/auth';
import { db } from '@/backend/db';
import { uploadLogoAction } from '@/backend/actions';

export async function GET() {
  try {
    const config = await db.globalConfig.findUnique({
      where: { id: 'global' },
    });
    return NextResponse.json({ logoUrl: config?.logoUrl || "" });
  } catch (error: any) {
    console.error("Error fetching theme config:", error);
    return NextResponse.json({ error: "Failed to fetch theme configuration." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { dataUrl } = body || {};
    
    if (!dataUrl) {
      return NextResponse.json({ error: "Missing logo data." }, { status: 400 });
    }

    const result = await uploadLogoAction(dataUrl);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, logoUrl: result.downloadUrl });
  } catch (error: any) {
    console.error("Error uploading logo:", error);
    return NextResponse.json({ error: error.message || "Internal server error." }, { status: 500 });
  }
}
