import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

const ProfileScoreInputSchema = z.object({
  userId: z.string().describe('The unique identifier of the user.'),
  headline: z.string().describe('The profile headline or job title.'),
  summary: z.string().describe('A brief summary or bio of the user.'),
  yearsOfExperience: z.number().describe('The number of years of professional experience.'),
  industries: z.array(z.string()).describe('A list of industries the user has worked in.'),
  skills: z.array(z.string()).describe('A list of skills the user possesses.'),
  certifications: z.array(z.string()).describe('A list of certifications the user holds.'),
  achievements: z.array(z.string()).describe('A list of achievements the user has accomplished.'),
  employmentHistory: z.array(z.string()).describe('A list of previous employment history.'),
  education: z.array(z.string()).describe('A list of educational qualifications.'),
  country: z.string().describe('The country where the user is located.'),
});

type ProfileScoreInput = z.infer<typeof ProfileScoreInputSchema>;

const ProfileScoreOutputSchema = z.object({
  profileScore: z.number().describe('A score representing the completeness and relevance of the profile (0-100).'),
  feedback: z.string().describe('Feedback on how to improve the profile based on the score.'),
});

type ProfileScoreOutput = z.infer<typeof ProfileScoreOutputSchema>;

export async function calculateProfileScore(input: ProfileScoreInput): Promise<ProfileScoreOutput> {
  const industriesStr = input.industries.join(', ');
  const skillsStr = input.skills.join(', ');
  const certificationsStr = input.certifications.join(', ');
  const achievementsStr = input.achievements.join(', ');
  const employmentHistoryStr = input.employmentHistory.join(', ');
  const educationStr = input.education.join(', ');

  const prompt = `You are an AI profile evaluator. Given the following HR professional's profile data, evaluate the profile and provide a score between 0 and 100, as well as specific feedback for improvement.

Consider completeness, relevance to the HR profession, and overall presentation.

Profile Data:
Headline: ${input.headline}
Summary: ${input.summary}
Years of Experience: ${input.yearsOfExperience}
Industries: ${industriesStr}
Skills: ${skillsStr}
Certifications: ${certificationsStr}
Achievements: ${achievementsStr}
Employment History: ${employmentHistoryStr}
Education: ${educationStr}
Country: ${input.country}

Provide a profileScore (0-100) and actionable feedback to improve the profile.`;

  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: ProfileScoreOutputSchema,
    prompt,
  });

  return object;
}
