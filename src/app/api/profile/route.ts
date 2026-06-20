import { NextResponse } from 'next/server';
import { auth } from '@/backend/auth';
import { db } from '@/backend/db';
import { createProfileAction } from '@/backend/actions';
import { ProfileUpsertSchema } from '@/backend/validation';

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const filter = searchParams.get('filter');

    if (filter) {
      if ((session.user as any).role !== 'admin') {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const profiles = await db.profile.findMany({
        where: { verificationStatus: filter },
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
              profilePhotoURL: true,
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
      });

      return NextResponse.json({ success: true, profiles });
    }

    const profile = await db.profile.findUnique({
      where: { userId: session.user.id }
    });

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    // Parse JSON string arrays back to arrays for client convenience
    const parseField = (field: any) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      try {
        return typeof field === 'string' ? JSON.parse(field) : field;
      } catch {
        return [];
      }
    };

    const parsedProfile = {
      ...profile,
      industries: parseField(profile.industries),
      skills: parseField(profile.skills),
      certifications: parseField(profile.certifications),
      employmentHistory: parseField(profile.employmentHistory),
      education: parseField(profile.education),
    };

    return NextResponse.json({ profile: parsedProfile });
  } catch (error: any) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Failed to fetch profile." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    
    // Validate request body with Zod
    const validatedData = ProfileUpsertSchema.parse(body);

    const result = await createProfileAction(validatedData as any);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: result.profile });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json({ error: "Validation failed", details: error.errors }, { status: 400 });
    }
    console.error("Error upserting profile:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
