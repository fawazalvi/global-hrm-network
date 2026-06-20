import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

const LinkedInProfileInputSchema = z.object({
  linkedinUrl: z.string().url().describe('The public URL of the LinkedIn profile to scrape.'),
});

type LinkedInProfileInput = z.infer<typeof LinkedInProfileInputSchema>;

const LinkedInProfileOutputSchema = z.object({
  headline: z.string().describe('The main professional headline from the profile.'),
  summary: z.string().describe('The "About" or summary section of the profile.'),
  yearsOfExperience: z.number().describe('An estimated number of years of professional experience based on the employment history.'),
  industries: z.array(z.string()).describe('A list of industries the person has worked in.'),
  skills: z.array(z.string()).describe('A list of skills listed on the profile.'),
  employmentHistory: z.array(z.string()).describe('A list of job titles and companies, formatted as "Job Title at Company Name".'),
  education: z.array(z.string()).describe('A list of degrees and institutions, formatted as "Degree from Institution Name".'),
  country: z.string().describe('The country extracted from the location field.'),
});

type LinkedInProfileOutput = z.infer<typeof LinkedInProfileOutputSchema>;

export async function scrapeLinkedInProfile(input: LinkedInProfileInput): Promise<LinkedInProfileOutput> {
  const prompt = `You are an expert data extractor. Your task is to extract structured information from the provided LinkedIn profile URL.
    
Based on the content of the profile at ${input.linkedinUrl}, extract the following information:
- Headline
- Summary
- Estimated Years of Professional Experience
- Key Industries
- Top Skills
- Employment History (as 'Job Title at Company')
- Education History (as 'Degree from Institution')
- Country
    
Return the data in the specified JSON format. If a field is not present, return an appropriate default value (e.g., empty string, empty array, or 0).`;

  const { object } = await generateObject({
    model: google('gemini-2.5-flash'),
    schema: LinkedInProfileOutputSchema,
    prompt,
  });

  return object;
}
