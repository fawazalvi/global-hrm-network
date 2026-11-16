'use server';

import type { Application } from '@/lib/types';
import { enqueueAndSendEmail } from '@/backend/email/service';
import { resolveSiteOrigin } from '@/backend/survey-email';

export type EmailType = 'applicationApproved' | 'applicationReceived';

export interface UserInfo {
  name: string;
  email: string;
}

export async function sendNotificationEmail(
  user: UserInfo,
  type: EmailType,
  data?: any
): Promise<{ success: boolean; message: string }> {
  const origin = resolveSiteOrigin();
  const loginUrl = `${origin}/login`;

  if (type === 'applicationApproved') {
    return enqueueAndSendEmail({
      businessKey: `app-approved:${user.email}:${Date.now()}`,
      emailType: 'account_password',
      recipientEmail: user.email,
      recipientName: user.name,
      templateData: {
        loginUrl,
      },
    });
  }

  const app = data as Application | undefined;
  return enqueueAndSendEmail({
    businessKey: app?.id
      ? `app-received:${app.id}`
      : `app-received:${user.email}:${Date.now()}`,
    emailType: 'admin_notification',
    recipientEmail: user.email,
    recipientName: user.name,
    templateData: {
      notificationSubject: app?.id
        ? `Your GHRMN Application has been Received (ID: ${app.id})`
        : 'Your GHRMN Application has been Received',
      notificationHeading: 'Application Received',
      notificationMessage: `Thank you for applying to Global HRM Network. Your application${app?.currentRole ? ` (${app.currentRole})` : ''} has been received and is under review.`,
      actionUrl: loginUrl,
    },
  });
}
