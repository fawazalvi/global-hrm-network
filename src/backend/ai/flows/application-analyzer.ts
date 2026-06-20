import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

const ApplicationAnalyzerInputSchema = z.object({
  linkedinUrl: z.string().url().describe('The public URL of the LinkedIn profile to analyze.'),
  expertise: z.array(z.string()).describe('A list of desired expertise areas to check for relevance.'),
});

type ApplicationAnalyzerInput = z.infer<typeof ApplicationAnalyzerInputSchema>;

const DimensionScoreSchema = z.object({
  dimension: z.string().describe('The name of the assessment dimension (e.g., "Strategic Planning").'),
  score: z.number().min(0).max(100).describe('The score for this dimension, from 0 to 100.'),
  reasoning: z.string().describe('A brief justification for the assigned score, referencing the profile data.'),
});

const ApplicationAnalyzerOutputSchema = z.object({
  profileScore: z.number().describe('A score from 0-100 representing the overall quality and completeness of the LinkedIn profile.'),
  profileScoreFeedback: z.string().describe('A detailed explanation of how the Profile Score was calculated, citing specific profile strengths and weaknesses.'),
  relevanceScore: z.number().describe('A score from 0-100 representing how relevant the profile is to the specified expertise areas.'),
  relevanceScoreFeedback: z.string().describe('A detailed explanation of how the Relevance Score was calculated, referencing alignment with the requested expertise.'),
  assessments: z.object({
    strategicLeader: z.array(DimensionScoreSchema).describe("Assessment based on the Modern Strategic Leader model."),
    coreGeneralist: z.array(DimensionScoreSchema).describe("Assessment based on the Core Generalist model."),
    softSkills: z.array(DimensionScoreSchema).describe("Assessment based on the Soft Skills model."),
    academicAssessment: z.array(DimensionScoreSchema).describe("Assessment based on the Academic & Professional Credentials model."),
  }).describe("Detailed assessments based on different HR models."),
});

type ApplicationAnalyzerOutput = z.infer<typeof ApplicationAnalyzerOutputSchema>;

export async function analyzeApplication(input: ApplicationAnalyzerInput): Promise<ApplicationAnalyzerOutput> {
  const expertiseStr = input.expertise.map(exp => `- ${exp}`).join('\n');

  const prompt = `You are an expert HR recruitment analyst. Your task is to evaluate a candidate's LinkedIn profile based on a provided URL and a list of required expertise areas.

First, you must "scrape" the profile data from the given LinkedIn URL. In a real scenario, you would extract this data, but for now, you will use realistic mock data based on the URL.

URL to scrape: ${input.linkedinUrl}

Candidate's self-declared expertise:
${expertiseStr}

Based on the scraped profile, perform the following assessments and return them in the specified JSON format:

1.  **Profile Score (0-100):** Evaluate the overall strength and completeness of the profile. Consider factors like a clear headline, detailed summary, comprehensive work history with described responsibilities, listed skills, and educational background. A higher score indicates a well-filled, professional profile.
    - **Provide detailed feedback (\`profileScoreFeedback\`)** explaining the score. Mention what is good (e.g., "Detailed summary") and what could be improved (e.g., "Lacks quantifiable achievements in work history").

2.  **Relevance Score (0-100):** Evaluate how closely the candidate's experience, skills, and history align with the required expertise areas listed above. A high score means the candidate is a strong match for a role requiring these specific skills. A low score means they are a poor match.
    - **Provide detailed feedback (\`relevanceScoreFeedback\`)** explaining this score. Justify your reasoning by citing specific examples from the profile that either support or contradict alignment with the required expertise.
    
3.  **Detailed Assessments:** Evaluate the profile against the four models below. For each dimension in each model, provide a score (0-100) and brief reasoning.

    **a. Modern Strategic Leader Model (\`assessments.strategicLeader\`):**
    - **Strategic Planning:** Ability to align HR with long-term business objectives.
    - **Digital HR & Analytics:** Proficiency in HRIS, data-driven decisions, automation.
    - **Change Management:** Experience navigating organizational shifts.
    - **Talent Management:** Strategy for acquisition, retention, succession.
    - **Employee Experience (EX):** Focus on culture, engagement, lifecycle.
    - **Financial Acumen:** Understanding of budgeting, compensation, ROI.

    **b. Core Generalist Model (\`assessments.coreGeneralist\`):**
    - **Recruitment & Selection:** Sourcing and hiring effectiveness.
    - **Performance Management:** Running appraisal cycles, KPI setting.
    - **Learning & Development (L&D):** Training needs analysis and delivery.
    - **Compensation & Benefits:** Managing payroll, rewards, grading.
    - **Labor Law & Compliance:** Knowledge of legal regulations.
    - **Employee Relations:** Conflict resolution, grievance handling.

    **c. Soft Skills Model (\`assessments.softSkills\`):**
    - **Communication:** Clarity in messaging across levels.
    - **Stakeholder Management:** Influencing department heads and executives.
    - **Emotional Intelligence (EQ):** Empathy and self-regulation.
    - **Negotiation:** Handling union talks, salary offers, vendors.
    - **Ethical Leadership:** Integrity and fairness.
    - **Cultural Inclusivity:** Promoting diversity and a safe environment.
    
    **d. Academic & Professional Credentials Model (\`assessments.academicAssessment\`):**
    - **Education Level:** Relevance and level of degrees obtained (e.g., Bachelor's, Master's, PhD).
    - **Certification Quality:** Relevance and prestige of professional certifications (e.g., SHRM, HRCI, CIPD).
    - **Institutional Prestige:** The reputation and ranking of the educational institutions attended.`;

  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: ApplicationAnalyzerOutputSchema,
    prompt,
  });

  return object;
}
