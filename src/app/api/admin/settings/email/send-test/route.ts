import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { db } from '@/backend/db';
import { requireAdminSession } from '@/backend/email/admin-auth';
import { sendTestEmailUsingConfig } from '@/backend/email/service';
import { SendTestEmailSchema } from '@/backend/email/validation';

export async function POST(req: Request) {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;
  const { session } = authCheck;

  try {
    const body = await req.json().catch(() => null);
    const { recipientEmail } = SendTestEmailSchema.parse(body);

    const target =
      (await db.emailConfig.findFirst({
        where: { status: 'draft' },
        orderBy: { version: 'desc' },
      })) ||
      (await db.emailConfig.findFirst({
        where: { status: 'active' },
        orderBy: { version: 'desc' },
      }));

    if (!target) {
      return NextResponse.json(
        { error: 'No email configuration found. Please save a draft first.' },
        { status: 400 }
      );
    }

    const result = await sendTestEmailUsingConfig(target, recipientEmail);

    await db.emailConfigAuditLog.create({
      data: {
        configId: target.id,
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'test_email_sent',
        summary: result.success
          ? `Sent admin test email to ${recipientEmail} (accepted by SMTP).`
          : `Admin test email to ${recipientEmail} failed: ${result.message}`,
      },
    });

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid recipient email.' },
        { status: 400 }
      );
    }
    console.error('Error sending test email:', error);
    return NextResponse.json({ error: 'Failed to send test email.' }, { status: 500 });
  }
}
