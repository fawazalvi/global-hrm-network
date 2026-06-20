// 3️⃣ Core Data Models (Firestore)

import { Timestamp } from "firebase/firestore";

// 🔹 Users Collection
// users/{userId}
export type User = {
    uid: string;
    fullName: string;
    email: string;
    profilePhotoURL: string; // Corresponds to an ID in placeholder-images.json
    role: 'user' | 'admin' | 'moderator';
    accountStatus: 'active' | 'suspended' | 'pending';
    emailVerified: boolean;
    createdAt: any; 
    lastLogin: any; 
};

// 🔹 HR Profiles Collection
// users/{userId}/profile/main
export type HRProfile = {
    profileId: string; // Should be 'main'
    userId: string; // ref to User
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
    visibility: 'public' | 'private';
    verificationStatus: 'unverified' | 'verified' | 'rejected' | 'pending';
    profileScore: number; 
    updatedAt: any;
};

// 🔹 Achievements Collection
// users/{userId}/achievements/{achievementId}
export type Achievement = {
    id: string; 
    userId: string;
    title: string;
    description: string;
    year: number;
    proofURL?: string; 
    verified: boolean;
};

// 🔹 Subscriptions Collection
// subscriptions/{subscriptionId}
export type Subscription = {
    id: string;
    userId: string;
    plan: 'free' | 'pro' | 'enterprise';
    status: 'active' | 'canceled' | 'expired';
    startDate: any;
    endDate: any;
    paymentProvider: 'Stripe';
};

// 🔹 Admin Logs Collection
// adminLogs/{logId}
export type AdminLog = {
    logId: string;
    adminId: string;
    action: string;
    targetUserId: string;
    timestamp: Date;
    remarks: string;
};

export type DimensionScore = {
    dimension: string;
    score: number;
    reasoning: string;
};

export type AssessmentResult = {
    strategicLeader: DimensionScore[];
    coreGeneralist: DimensionScore[];
    softSkills: DimensionScore[];
    academicAssessment: DimensionScore[];
};


// 🔹 Applications Collection
// applications/{applicationId}
export type Application = {
    id: string;
    fullName: string;
    email: string;
    currentRole: string;
    yearsOfExperience: number;
    linkedinUrl: string;
    expertise: string[];
    interest: string;
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: any;
    profileScore?: number;
    relevanceScore?: number;
    profileScoreFeedback?: string;
    relevanceScoreFeedback?: string;
    assessments?: AssessmentResult;
    approvedUserId?: string; // Links to the newly created UID in /users
};

// 🔹 HR Expertise Collection
// hr_expertise/{expertiseId}
export type HRExpertise = {
    id: string;
    name: string;
};

export type AdminUser = {
  uid: string;
  fullName: string;
  email: string;
  role: 'admin';
  createdAt: Timestamp; 
};

// Global Configuration
// configuration/global
export type GlobalConfig = {
    logoUrl: string;
}
