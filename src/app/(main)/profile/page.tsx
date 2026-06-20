import { redirect } from "next/navigation";
import { auth } from "@/backend/auth";
import { db } from "@/backend/db";
import ProfileClient from "./profile-client";

export default async function ProfilePage() {
    const session = await auth();
    if (!session || !session.user) {
        redirect('/login');
    }

    const userId = session.user.id;
    const userEmail = session.user.email!;

    // Fetch profile and application from database
    const profile = await db.profile.findUnique({
      where: { userId }
    });

    const app = await db.application.findUnique({
      where: { email: userEmail }
    });

    // Sanitize profile Json fields
    const sanitizeProfile = (p: any) => {
      if (!p) return null;
      const parseField = (field: any) => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        try {
          return typeof field === 'string' ? JSON.parse(field) : field;
        } catch {
          return [];
        }
      };
      return {
        ...p,
        industries: parseField(p.industries),
        skills: parseField(p.skills),
        certifications: parseField(p.certifications),
        achievements: parseField(p.achievements),
        employmentHistory: parseField(p.employmentHistory),
        education: parseField(p.education),
      };
    };

    return (
      <ProfileClient 
        initialProfile={sanitizeProfile(profile) as any} 
        applicationLinkedinUrl={app?.linkedinUrl || null} 
      />
    );
}
