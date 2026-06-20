import { z } from 'zod';

const SendEmailInputSchema = z.object({
  to: z.string().email().describe("The recipient's email address."),
  from: z.string().email().describe("The email address of the Google Workspace user to impersonate (e.g., 'user@your-domain.com'). This requires domain-wide delegation for the service account."),
  subject: z.string().describe('The subject line of the email.'),
  body: z.string().describe('The HTML body of the email, pre-rendered.'),
  clientEmail: z.string().describe('The service account client email.'),
  privateKey: z.string().describe('The service account private key.'),
});

type SendEmailInput = z.infer<typeof SendEmailInputSchema>;

export async function sendEmail(input: SendEmailInput): Promise<{ success: boolean; message: string }> {
  const { google } = await import('googleapis');
  const { JWT } = await import('google-auth-library');

  try {
    // Create a new JWT client for service account authentication with domain-wide delegation.
    const auth = new JWT({
      email: input.clientEmail,
      key: input.privateKey,
      scopes: ['https://www.googleapis.com/auth/gmail.send'],
      subject: input.from, // Impersonate this user. This is the key for domain-wide delegation.
    });

    // Authorize the client
    await auth.authorize();

    // Get the Gmail API client
    const gmail = google.gmail({ version: 'v1', auth });

    // Construct the raw email message. The "From" header must match the impersonated user.
    const emailLines = [
      `From: "Global HRM Network" <${input.from}>`,
      `To: ${input.to}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      `Subject: ${input.subject}`,
      '',
      input.body,
    ];
    const email = emailLines.join('\r\n');

    // Encode the email in Base64URL format
    const base64EncodedEmail = Buffer.from(email).toString('base64url');

    // Send the email using the impersonated user's identity ('me').
    await gmail.users.messages.send({
      userId: 'me', // 'me' refers to the impersonated user specified in 'subject'.
      requestBody: {
        raw: base64EncodedEmail,
      },
    });

    return { success: true, message: `Email sent successfully from ${input.from} to ${input.to}` };
  } catch (error: any) {
    console.error('Failed to send email:', error.message);
    // Provide a structured error to the caller
    return { success: false, message: error.message || 'An unexpected error occurred during email sending.' };
  }
}
