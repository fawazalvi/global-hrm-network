import { z } from 'zod';

export const ApplicationSubmitSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  currentRole: z.string().min(2, "Current role is required").max(100),
  yearsOfExperience: z.number().min(0, "Experience must be a positive number"),
  linkedinUrl: z.string().url("Invalid LinkedIn URL").refine(
    (url) => url.includes("linkedin.com"),
    { message: "Must be a valid LinkedIn URL" }
  ),
  expertise: z.array(z.string()),
  interest: z.string().min(2, "Please state your interest"),
});

export const ApplicationUpdateStatusSchema = z.object({
  status: z.enum(["approved", "rejected"]),
});

export const ProfileUpsertSchema = z.object({
  headline: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  yearsOfExperience: z.number().min(0).optional(),
  industries: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  employmentHistory: z.array(z.string()).optional(),
  education: z.array(z.string()).optional(),
  country: z.string().nullable().optional(),
  visibility: z.enum(["public", "private"]).optional(),
  verificationStatus: z.enum(["unverified", "verified", "rejected", "pending"]).optional(),
});

export const UserCreateSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const UserUpdateStatusSchema = z.object({
  accountStatus: z.enum(["active", "suspended", "pending"]),
});

export const ProfileVerifySchema = z.object({
  verificationStatus: z.enum(["unverified", "verified", "rejected", "pending"]),
});

