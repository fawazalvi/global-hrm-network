
'use server';

import { sendEmailAction } from '@/backend/actions';
import type { Application } from '@/lib/types';
import { db } from './db';

export type EmailType = 'applicationApproved' | 'applicationReceived';

export interface UserInfo {
  name: string;
  email: string;
}

/**
 * Fetches the global logo URL from the database.
 * @returns The logo URL string or an empty string if not found.
 */
async function getLogoUrl() {
  try {
    const config = await db.globalConfig.findUnique({
      where: { id: "global" }
    });
    if (config && config.logoUrl) {
      return config.logoUrl;
    }
  } catch (error) {
    console.error("Error fetching logo URL for email:", error);
  }
  return ""; // Fallback to no logo
}

/**
 * Generates the subject and body for a specific email type.
 * @param type The type of email to generate.
 * @param user The user to whom the email is being sent.
 * @param data Optional data for the template.
 * @returns An object with the email subject and body.
 */
const getEmailContent = async (type: EmailType, user: UserInfo, data?: any) => {
  const fromEmail = "memberships@global-hrm.net"; 
  const logoUrl = await getLogoUrl();
  const logoImage = logoUrl ? `<img src="${logoUrl}" alt="Global HRM Network Logo" width="150" style="margin-bottom: 20px;" />` : '';
  const loginPageUrl = "https://6000-firebase-studio-1767419890942.cluster-aic6jbiihrhmyrqafasatvzbwe.cloudworkstations.dev/login";

  const emailStyles = `
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; background-color: #f4f4f7; margin: 0; padding: 20px;}
      .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 30px; border: 1px solid #e2e2e8; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
      .button { background-color: hsl(205 90% 45%); color: #ffffff !important; padding: 12px 25px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500; }
      .content { color: #374151; }
      h2 { color: #111827; }
      p { line-height: 1.6; }
      .footer { font-size: 12px; color: #6b7280; text-align: center; margin-top: 20px; }
      .details-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
      .details-table td { padding: 8px 0; border-bottom: 1px solid #e2e2e8; }
      .details-table td:first-child { font-weight: 500; color: #111827; }
    </style>
  `;

  switch (type) {
    case 'applicationApproved':
      return {
        subject: 'Welcome to the Global HRM Network!',
        body: `
          <!DOCTYPE html>
          <html>
          <head>
            ${emailStyles}
          </head>
          <body>
            <div class="container">
              <div class="content">
                ${logoImage}
                <h2>Congratulations, ${user.name}!</h2>
                <p>Your application to join the Global HRM Network has been approved. We are thrilled to have you as a member.</p>
                <p>To get started, please go to our login page and use the "Forgot your password?" link to set your password for the first time. You will receive a separate email to complete this step.</p>
                <a href="${loginPageUrl}" class="button">Go to Login Page</a>
                <p>If you have any questions, please don't hesitate to contact us at ${fromEmail}.</p>
                <br/>
                <p>Best regards,</p>
                <p>The GHRMN Team</p>
              </div>
              <div class="footer">Global HRM Network | 123 Business Rd, Suite 456, New York, NY</div>
            </div>
          </body>
          </html>
        `,
      };
    
    case 'applicationReceived':
        const app = data as Application;
        return {
            subject: `Your GHRMN Application has been Received (ID: ${app.id})`,
            body: `
            <!DOCTYPE html>
            <html>
            <head>
                ${emailStyles}
            </head>
            <body>
                <div class="container">
                <div class="content">
                    ${logoImage}
                    <h2>Application Received, ${user.name}!</h2>
                    <p>Thank you for your interest in joining the Global HRM Network. We have successfully received your application (ID: <strong>${app.id}</strong>).</p>
                    <p>Due to a high volume of interest in our early access program, our expert panel will review your application and provide a response within <strong>5-10 working days</strong>. We appreciate your patience as we ensure the quality of our founding member community.</p>
                    
                    <h3>Your Submitted Details:</h3>
                    <table class="details-table">
                        <tr><td>Application ID:</td><td>${app.id}</td></tr>
                        <tr><td>Full Name:</td><td>${app.fullName}</td></tr>
                        <tr><td>Email:</td><td>${app.email}</td></tr>
                        <tr><td>Current Role:</td><td>${app.currentRole}</td></tr>
                        <tr><td>Years of Experience:</td><td>${app.yearsOfExperience}</td></tr>
                        <tr><td>LinkedIn:</td><td><a href="${app.linkedinUrl}">${app.linkedinUrl}</a></td></tr>
                    </table>

                    <p>If you have any urgent inquiries, please reply to this email.</p>
                    <br/>
                    <p>Best regards,</p>
                    <p>The GHRMN Team</p>
                </div>
                <div class="footer">You are receiving this email because you applied for early access.</div>
                </div>
            </body>
            </html>
            `,
        }

    default:
      throw new Error(`Unknown email type: ${type}`);
  }
};

/**
 * Sends a notification email to a user.
 * @param user An object containing the user's name and email.
 * @param type The type of email to send.
 * @param data Optional data to pass to the email template.
 * @returns The result from the sendEmailAction.
 */
export async function sendNotificationEmail(user: UserInfo, type: EmailType, data?: any) {
  try {
    const fromEmail = "memberships@global-hrm.net";
    const { subject, body } = await getEmailContent(type, user, data);
    
    return await sendEmailAction({
      to: user.email,
      from: fromEmail,
      subject,
      body,
    });
  } catch (error: any) {
    console.error(`[EmailService] Failed to send email of type ${type}:`, error);
    return {
      success: false,
      message: error.message || 'An unexpected error occurred in the email service.',
    };
  }
}
