"use server";

import { calculateProfileScore } from "@/backend/ai/flows/profile-score-calculation";
import { scrapeLinkedInProfile } from "@/backend/ai/flows/linkedin-profile-scraper";
import { sendEmail } from "@/backend/ai/flows/send-email";
import { analyzeApplication } from "@/backend/ai/flows/application-analyzer";
import { db } from "@/backend/db";
import fs from "fs/promises";
import path from "path";
import { sendNotificationEmail, type UserInfo } from "@/backend/email-service";
import type { Application, HRProfile } from "@/lib/types";
import { auth } from "@/backend/auth";
import bcrypt from "bcryptjs";

// Define input types directly within the action file, as they are no longer exported from the flows.
type ProfileScoreInput = {
    userId: string;
    headline: string;
    summary: string;
    yearsOfExperience: number;
    industries: string[];
    skills: string[];
    certifications: string[];
    achievements: string[];
    employmentHistory: string[];
    education: string[];
    country: string;
};

type LinkedInProfileInput = {
    linkedinUrl: string;
};

type SendEmailInput = {
    to: string;
    from: string;
    subject: string;
    body: string;
    clientEmail: string;
    privateKey: string;
};

type AnalyzeApplicationInput = {
    linkedinUrl: string;
    expertise: string[];
};

export async function calculateProfileScoreAction(input: ProfileScoreInput) {
  try {
    const result = await calculateProfileScore(input);
    return result;
  } catch (error) {
    console.error("Error calculating profile score:", error);
    return {
      error: "Failed to calculate profile score. Please try again later.",
    };
  }
}

export async function scrapeLinkedInProfileAction(input: LinkedInProfileInput) {
    const apiKey = process.env.LINKEDIN_SCRAPER_API_KEY;

    // If an API key is provided, use the ScrapingBee service.
    if (apiKey) {
        try {
            console.log("Using ScrapingBee for LinkedIn profile scraping.");
            const scraperResponse = await fetch('https://app.scrapingbee.com/api/v1/linkedin/profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    api_key: apiKey,
                    url: input.linkedinUrl,
                }),
            });
            
            if (!scraperResponse.ok) {
                const errorBody = await scraperResponse.text();
                throw new Error(`Scraping API responded with status ${scraperResponse.status}: ${errorBody}`);
            }

            const liveData = await scraperResponse.json();
            
            if (liveData.error) {
                 throw new Error(`Scraping API returned an error: ${liveData.error}`);
            }

            const result = {
                headline: liveData.profile_headline || "",
                summary: liveData.profile_summary || "",
                industries: liveData.industries || [],
                skills: liveData.skills?.map((s: { name: string }) => s.name) || [],
                employmentHistory: liveData.experiences?.map((e: { title: string; company: string }) => `${e.title} at ${e.company}`) || [],
                education: liveData.educations?.map((e: { degree: string; school: string }) => `${e.degree} from ${e.school}`) || [],
                country: liveData.location?.split(',').pop()?.trim() || "",
            };

            return result;

        } catch (error: any) {
            console.error("Error scraping LinkedIn profile with third-party API:", error);
            console.log("Live scraper failed. Falling back to AI simulation.");
            try {
                const result = await scrapeLinkedInProfile(input);
                return { ...result, _fallback: true, _originalError: error.message };
            } catch (aiError: any) {
                 console.error("AI fallback for LinkedIn scrape also failed:", aiError);
                 return {
                    error: `Live scraping failed (${error.message}) and the AI fallback also failed.`,
                 };
            }
        }
    }

    // If no API key, use the AI simulation.
    try {
        console.log("LINKEDIN_SCRAPER_API_KEY not found. Using AI simulation.");
        const result = await scrapeLinkedInProfile(input);
        return result;
    } catch (error: any) {
        console.error("Error scraping LinkedIn profile with AI:", error);
        return {
            error: "Failed to scrape LinkedIn profile with AI simulation.",
        };
    }
}

export async function sendEmailAction(input: { to: string; from: string; subject: string; body: string; }) {
    try {
        const keyFilePath = path.join(process.cwd(), 'gmail.json');
        const keyFileContent = await fs.readFile(keyFilePath, 'utf8');
        const serviceAccountKey = JSON.parse(keyFileContent);

        if (!serviceAccountKey.client_email || !serviceAccountKey.private_key) {
            throw new Error("Service account credentials are not configured correctly in gmail.json.");
        }
        
        const sendEmailInput: SendEmailInput = { 
            ...input,
            clientEmail: serviceAccountKey.client_email,
            privateKey: serviceAccountKey.private_key,
        };
        
        const result = await sendEmail(sendEmailInput);

        if (!result.success) {
            throw new Error(result.message);
        }
        return result;
    } catch (error: any) {
        console.error("Error sending email:", error);
        return {
            success: false,
            message: error.message || "An unexpected error occurred while sending the email.",
        };
    }
}

export async function sendApplicationConfirmationEmailAction(userInfo: UserInfo, applicationData: Omit<Application, 'submittedAt'>) {
    return sendNotificationEmail(userInfo, 'applicationReceived', applicationData);
}

export async function sendApplicationApprovedEmailAction(userInfo: UserInfo) {
    return sendNotificationEmail(userInfo, 'applicationApproved');
}

export async function uploadLogoAction(dataUrl: string): Promise<{ downloadUrl?: string; error?: string }> {
  try {
    // Save image locally inside the public directory
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = `logo_${Date.now()}.png`;
    const publicDir = path.join(process.cwd(), 'public', 'logos');
    
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(path.join(publicDir, filename), buffer);
    const downloadUrl = `/logos/${filename}`;

    // Save the URL to DB for persistence across the app
    await db.globalConfig.upsert({
      where: { id: "global" },
      update: { logoUrl: downloadUrl },
      create: { id: "global", logoUrl: downloadUrl }
    });

    return { downloadUrl };
  } catch (error: any) {
    console.error('Server-side logo update failed:', error);
    return { error: error.message || 'An unexpected error occurred during the update.' };
  }
}

export async function makeUserAdminAction(userId: string) {
  try {
    await db.user.update({
      where: { id: userId },
      data: { role: 'admin' }
    });
    return { success: true };
  } catch (error) {
    console.error("Error making user admin:", error);
    return {
      error: "Failed to grant admin privileges. Ensure database connectivity is set up correctly.",
    };
  }
}

export async function seedDatabaseAction() {
  try {
    const { hrExpertiseAreas } = await import("@/lib/hr-expertise-data");
    for (const name of hrExpertiseAreas) {
      await db.hRExpertise.upsert({
        where: { name },
        update: {},
        create: { name }
      });
    }
    return { success: true, message: "'hr_expertise' collection seeded successfully." };
  } catch (error) {
    console.error("Error seeding database:", error);
    return {
      error: "Failed to seed database.",
    };
  }
}

export async function analyzeApplicationAction(applicationId: string, input: AnalyzeApplicationInput) {
    try {
        // Call the AI flow to get the scores
        const analysisResult = await analyzeApplication(input);

        // Update the application document in DB
        await db.application.update({
            where: { id: applicationId },
            data: {
                profileScore: analysisResult.profileScore,
                relevanceScore: analysisResult.relevanceScore,
                profileScoreFeedback: analysisResult.profileScoreFeedback,
                relevanceScoreFeedback: analysisResult.relevanceScoreFeedback,
                assessments: analysisResult.assessments as any,
            }
        });

        return { ...analysisResult, success: true };
    } catch (error: any) {
        console.error("Error analyzing application:", error);
        return {
            error: error.message || "Failed to analyze application.",
        };
    }
}

export async function submitApplicationAction(data: {
  fullName: string;
  email: string;
  currentRole: string;
  yearsOfExperience: number;
  linkedinUrl: string;
  expertise: string[];
  interest: string;
}) {
  try {
    const existingApp = await db.application.findUnique({
      where: { email: data.email },
    });

    if (existingApp) {
      return { error: "An application with this email address has already been submitted." };
    }

    const app = await db.application.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        currentRole: data.currentRole,
        yearsOfExperience: data.yearsOfExperience,
        linkedinUrl: data.linkedinUrl,
        expertise: JSON.stringify(data.expertise),
        interest: data.interest,
        status: 'pending',
      },
    });

    const emailResult = await sendApplicationConfirmationEmailAction({
      name: app.fullName,
      email: app.email
    }, { ...app, expertise: data.expertise } as any);

    if (!emailResult.success) {
      console.warn("Application created, but confirmation email failed to send:", emailResult.message);
    }

    return { success: true, appId: app.id };
  } catch (error: any) {
    console.error("Error submitting application:", error);
    return { error: error.message || "Could not submit your application." };
  }
}

export async function createProfileAction(initialData: Partial<HRProfile>) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;
    if (!userId) {
      throw new Error("User ID is missing in session");
    }

    const parseField = (field: any) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      return [];
    };

    const newProfile = await db.profile.upsert({
      where: { userId },
      update: {
        headline: initialData.headline || "New Member",
        summary: initialData.summary || "",
        yearsOfExperience: initialData.yearsOfExperience || 0,
        industries: JSON.stringify(parseField(initialData.industries)),
        skills: JSON.stringify(parseField(initialData.skills)),
        certifications: JSON.stringify(parseField(initialData.certifications)),
        employmentHistory: JSON.stringify(parseField(initialData.employmentHistory)),
        education: JSON.stringify(parseField(initialData.education)),
        country: initialData.country || "",
        visibility: initialData.visibility || "public",
        verificationStatus: initialData.verificationStatus || "unverified",
      },
      create: {
        userId,
        headline: initialData.headline || "New Member",
        summary: initialData.summary || "",
        yearsOfExperience: initialData.yearsOfExperience || 0,
        industries: JSON.stringify(parseField(initialData.industries)),
        skills: JSON.stringify(parseField(initialData.skills)),
        certifications: JSON.stringify(parseField(initialData.certifications)),
        employmentHistory: JSON.stringify(parseField(initialData.employmentHistory)),
        education: JSON.stringify(parseField(initialData.education)),
        country: initialData.country || "",
        visibility: initialData.visibility || "public",
        verificationStatus: initialData.verificationStatus || "unverified",
        profileScore: 0,
      },
    });

    const parsedProfile = {
      ...newProfile,
      industries: newProfile.industries ? JSON.parse(newProfile.industries) : [],
      skills: newProfile.skills ? JSON.parse(newProfile.skills) : [],
      certifications: newProfile.certifications ? JSON.parse(newProfile.certifications) : [],
      employmentHistory: newProfile.employmentHistory ? JSON.parse(newProfile.employmentHistory) : [],
      education: newProfile.education ? JSON.parse(newProfile.education) : [],
    };

    return { success: true, profile: parsedProfile };
  } catch (error: any) {
    console.error("Error creating profile:", error);
    return { error: error.message || "Failed to create profile." };
  }
}

export async function getLinkedInUrlFromApplicationAction() {
  try {
    const session = await auth();
    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) return { error: "User not found." };

    const app = await db.application.findUnique({
      where: { email: user.email },
    });

    return { linkedinUrl: app?.linkedinUrl || null };
  } catch (error: any) {
    console.error("Error fetching application:", error);
    return { error: error.message };
  }
}

export async function updateProfileAction(updatedData: Partial<HRProfile>) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      throw new Error("Unauthorized");
    }

    const userId = session.user.id;

    const stringifyField = (field: any) => {
      if (field === undefined) return undefined;
      return JSON.stringify(Array.isArray(field) ? field : []);
    };

    await db.profile.update({
      where: { userId },
      data: {
        headline: updatedData.headline,
        summary: updatedData.summary,
        yearsOfExperience: updatedData.yearsOfExperience !== undefined ? Number(updatedData.yearsOfExperience) : undefined,
        country: updatedData.country,
        visibility: updatedData.visibility,
        verificationStatus: updatedData.verificationStatus,
        industries: stringifyField(updatedData.industries),
        skills: stringifyField(updatedData.skills),
        certifications: stringifyField(updatedData.certifications),
        employmentHistory: stringifyField(updatedData.employmentHistory),
        education: stringifyField(updatedData.education),
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return { error: error.message || "Failed to update profile." };
  }
}

export async function approveApplicationAction(applicationId: string) {
  try {
    const application = await db.application.findUnique({
      where: { id: applicationId }
    });
    if (!application) {
      throw new Error("Application not found.");
    }

    let profileDataFromLinkedIn: any = {};
    try {
      const scrapeResult = await scrapeLinkedInProfileAction({ linkedinUrl: application.linkedinUrl });
      if (scrapeResult && !('error' in scrapeResult)) {
        profileDataFromLinkedIn = scrapeResult;
      }
    } catch (scrapeError: any) {
      console.warn("LinkedIn Scrape Failed during approval:", scrapeError.message);
    }

    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const newUser = await db.user.create({
      data: {
        fullName: application.fullName,
        email: application.email,
        password: hashedPassword,
        profilePhotoURL: 'user-avatar-5',
        role: 'user',
        accountStatus: 'active',
        emailVerified: false,
      }
    });

    const parseField = (field: any) => {
      if (!field) return [];
      if (Array.isArray(field)) return field;
      try {
        return typeof field === 'string' ? JSON.parse(field) : field;
      } catch {
        return [];
      }
    };

    const applicationExpertise = application.expertise
      ? (typeof application.expertise === 'string' ? JSON.parse(application.expertise) : application.expertise)
      : [];

    await db.profile.create({
      data: {
        userId: newUser.id,
        headline: profileDataFromLinkedIn.headline || application.currentRole || "New Member",
        summary: profileDataFromLinkedIn.summary || "Profile created from application.",
        yearsOfExperience: profileDataFromLinkedIn.yearsOfExperience || application.yearsOfExperience || 0,
        industries: JSON.stringify(parseField(profileDataFromLinkedIn.industries)),
        skills: JSON.stringify(parseField(profileDataFromLinkedIn.skills || applicationExpertise)),
        certifications: JSON.stringify(parseField(profileDataFromLinkedIn.certifications)),
        employmentHistory: JSON.stringify(parseField(profileDataFromLinkedIn.employmentHistory)),
        education: JSON.stringify(parseField(profileDataFromLinkedIn.education)),
        country: profileDataFromLinkedIn.country || "",
        visibility: 'public',
        verificationStatus: 'unverified',
        profileScore: application.profileScore || 0,
      }
    });

    await sendApplicationApprovedEmailAction({ name: application.fullName, email: application.email });

    await db.application.update({
      where: { id: applicationId },
      data: {
        status: 'approved',
        approvedUserId: newUser.id
      }
    });

    return { success: true, tempPassword };
  } catch (error: any) {
    console.error("Error approving application:", error);
    return { error: error.message || "Failed to approve application." };
  }
}

export async function rejectApplicationAction(applicationId: string) {
  try {
    await db.application.update({
      where: { id: applicationId },
      data: { status: 'rejected' }
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error rejecting application:", error);
    return { error: error.message || "Failed to reject application." };
  }
}

export async function getAdminsAction() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      throw new Error("Unauthorized");
    }
    const admins = await db.user.findMany({
      where: { role: 'admin' },
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, admins };
  } catch (error: any) {
    console.error("Error fetching admins:", error);
    return { error: error.message || "Failed to fetch admins." };
  }
}

export async function createAdminAction(data: { fullName: string; email: string; password: string }) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      throw new Error("Unauthorized");
    }

    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      return { error: "A user with this email already exists." };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newAdmin = await db.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: hashedPassword,
        role: 'admin',
        accountStatus: 'active',
        emailVerified: true,
      },
    });

    return { success: true, admin: newAdmin };
  } catch (error: any) {
    console.error("Error creating admin:", error);
    return { error: error.message || "Failed to create admin." };
  }
}

export async function getUsersAction() {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      throw new Error("Unauthorized");
    }
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return { success: true, users };
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return { error: error.message || "Failed to fetch users." };
  }
}

export async function createUserAction(data: { fullName: string; email: string; password: string }) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      throw new Error("Unauthorized");
    }

    const existingUser = await db.user.findUnique({
      where: { email: data.email },
    });
    if (existingUser) {
      return { error: "A user with this email already exists." };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const newUser = await db.user.create({
      data: {
        fullName: data.fullName,
        email: data.email,
        password: hashedPassword,
        profilePhotoURL: 'user-avatar-5',
        role: 'user',
        accountStatus: 'active',
        emailVerified: false,
      },
    });

    // Create empty profile
    await db.profile.create({
      data: {
        userId: newUser.id,
        headline: "New Member",
        summary: "",
        yearsOfExperience: 0,
        industries: "[]",
        skills: "[]",
        certifications: "[]",
        employmentHistory: "[]",
        education: "[]",
        country: "",
        visibility: 'public',
        verificationStatus: 'unverified',
        profileScore: 0,
      },
    });

    return { success: true, user: newUser };
  } catch (error: any) {
    console.error("Error creating user:", error);
    return { error: error.message || "Failed to create user." };
  }
}

export async function suspendUserAction(userId: string, currentStatus: string) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      throw new Error("Unauthorized");
    }

    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    await db.user.update({
      where: { id: userId },
      data: { accountStatus: newStatus },
    });

    return { success: true, newStatus };
  } catch (error: any) {
    console.error("Error suspending user:", error);
    return { error: error.message || "Failed to change user status." };
  }
}

export async function deleteUserAction(userId: string) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      throw new Error("Unauthorized");
    }

    // Delete user from db (cascades to profile, achievements, subscription, sessions, accounts)
    await db.user.delete({
      where: { id: userId },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return { error: error.message || "Failed to delete user." };
  }
}

export async function getPendingVerificationsAction(filter: string = 'pending') {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      throw new Error("Unauthorized");
    }

    // Fetch profiles that match the filter, include the user details
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

    return { success: true, profiles };
  } catch (error: any) {
    console.error("Error fetching verifications:", error);
    return { error: error.message || "Failed to fetch verification queue." };
  }
}

export async function updateVerificationStatusAction(profileId: string, status: string) {
  try {
    const session = await auth();
    if (!session || (session.user as any).role !== 'admin') {
      throw new Error("Unauthorized");
    }

    await db.profile.update({
      where: { id: profileId },
      data: { verificationStatus: status },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error updating verification status:", error);
    return { error: error.message || "Failed to update verification status." };
  }
}

