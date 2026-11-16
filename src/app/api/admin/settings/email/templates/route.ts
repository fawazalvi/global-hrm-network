import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/backend/db';
import { requireAdminSession } from '@/backend/email/admin-auth';
import {
  getActiveEmailConfig,
  getPublishedEmailTheme,
  sendTestEmailUsingConfig,
} from '@/backend/email/service';
import { DEFAULT_EMAIL_THEME, type EmailThemePalette } from '@/backend/email/layout';
import {
  ALLOWLISTED_VARIABLES,
  DEFAULT_EMAIL_TEMPLATES,
  renderBrandedEmail,
  sanitizeTemplateBodyHtml,
  validateTemplatePlaceholders,
  validateThemeContrast,
  type ManagedEmailType,
} from '@/backend/email/templates';

const TemplateSaveSchema = z.object({
  emailType: z.string().trim().min(1),
  subject: z.string().trim().min(1).max(300),
  preheader: z.string().trim().max(300).default(''),
  eyebrow: z.string().trim().max(120).optional().nullable(),
  heading: z.string().trim().min(1).max(200),
  greeting: z.string().trim().min(1).max(160).default('Hello {{preferred_name}},'),
  bodyHtml: z.string().trim().min(1).max(20000),
  bodyText: z.string().trim().min(1).max(20000),
  infoPanelTitle: z.string().trim().max(120).optional().nullable(),
  infoPanelBody: z.string().trim().max(2000).optional().nullable(),
  footerText: z.string().trim().max(1000),
  ctaLabel: z.string().trim().max(100).optional().nullable(),
  ctaUrlTemplate: z.string().trim().max(500).optional().nullable(),
  bannerKey: z.enum(['community_globe']).optional().nullable(),
});

const ThemeSaveSchema = z.object({
  logoPath: z.string().trim().min(1).max(500).default('/email-assets/ghrm-email-logo.png'),
  bannerPath: z.string().trim().max(500).optional().nullable(),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  deepBlueColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  orangeAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  greenAccent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  paleBgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  bodyTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  surfaceColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  senderDisplayName: z.string().trim().min(1).max(120),
  supportEmail: z.string().trim().email().optional().or(z.literal('')),
  websiteUrl: z.string().trim().url().default('https://www.global-hrm.net'),
  tagline: z.string().trim().max(200).default('Connecting HR Leaders Worldwide'),
  footerTagline: z
    .string()
    .trim()
    .max(250)
    .default('Empowering HR Professionals to Connect, Learn & Grow Globally.'),
  socialLinks: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(40),
        url: z.string().trim().url(),
      })
    )
    .max(6)
    .default([]),
});

function validateCtaUrlTemplate(urlTemplate: string | null | undefined): boolean {
  if (!urlTemplate || !urlTemplate.trim()) return true;
  const trimmed = urlTemplate.trim();
  if (/^\{\{[a-zA-Z0-9_]+\}\}$/.test(trimmed)) return true;
  return /^https?:\/\//i.test(trimmed);
}

export async function GET() {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;

  try {
    const [savedRows, versions, activeConfig, publishedTheme, draftTheme] = await Promise.all([
      db.emailTemplate.findMany(),
      db.emailTemplateVersion.findMany({
        orderBy: [{ version: 'desc' }, { createdAt: 'desc' }],
        take: 100,
      }),
      getActiveEmailConfig(),
      getPublishedEmailTheme(),
      db.emailThemeConfig.findFirst({
        where: { status: 'draft' },
        orderBy: { version: 'desc' },
      }),
    ]);

    const savedMap = new Map(savedRows.map((r) => [r.emailType, r]));
    const versionsByType = new Map<string, any[]>();
    for (const v of versions) {
      const arr = versionsByType.get(v.emailType) || [];
      arr.push(v);
      versionsByType.set(v.emailType, arr);
    }

    const templates = (Object.keys(DEFAULT_EMAIL_TEMPLATES) as ManagedEmailType[]).map((type) => {
      const def = DEFAULT_EMAIL_TEMPLATES[type];
      const saved = savedMap.get(type);
      const current = saved
        ? {
            emailType: type,
            name: def.name,
            description: def.description,
            classification: saved.classification || def.classification,
            variant: (saved.variant as 'transactional' | 'community') || def.variant,
            status: saved.status || def.defaultStatus,
            version: saved.version,
            subject: saved.subject,
            preheader: saved.preheader || def.preheader,
            eyebrow: saved.eyebrow ?? def.eyebrow,
            heading: saved.heading,
            greeting: saved.greeting || def.greeting,
            bodyHtml: saved.bodyHtml,
            bodyText: saved.bodyText,
            infoPanelTitle: saved.infoPanelTitle ?? def.infoPanelTitle ?? '',
            infoPanelBody: saved.infoPanelBody ?? def.infoPanelBody ?? '',
            footerText: saved.footerText,
            ctaLabel: saved.ctaLabel || def.ctaLabel,
            ctaUrlTemplate: saved.ctaUrlTemplate || def.ctaUrlTemplate,
            bannerKey: saved.bannerKey ?? def.bannerKey ?? null,
            isCustomized: saved.isCustomized,
            updatedByEmail: saved.updatedByEmail,
            publishedByEmail: saved.publishedByEmail,
            publishedAt: saved.publishedAt ? saved.publishedAt.toISOString() : null,
            updatedAt: saved.updatedAt.toISOString(),
          }
        : {
            emailType: type,
            name: def.name,
            description: def.description,
            classification: def.classification,
            variant: def.variant,
            status: def.defaultStatus,
            version: 1,
            subject: def.subject,
            preheader: def.preheader,
            eyebrow: def.eyebrow,
            heading: def.heading,
            greeting: def.greeting,
            bodyHtml: def.bodyHtml,
            bodyText: def.bodyText,
            infoPanelTitle: def.infoPanelTitle || '',
            infoPanelBody: def.infoPanelBody || '',
            footerText: def.footerText,
            ctaLabel: def.ctaLabel,
            ctaUrlTemplate: def.ctaUrlTemplate,
            bannerKey: def.bannerKey || null,
            isCustomized: false,
            updatedByEmail: null,
            publishedByEmail: null,
            publishedAt: null,
            updatedAt: null,
          };

      const preview = renderBrandedEmail({
        template: {
          ...current,
          securityOrHelpNote: def.securityOrHelpNote,
          unsubscribeLabel: def.unsubscribeLabel,
        },
        variables: def.syntheticData,
        theme: publishedTheme,
      });

      return {
        ...current,
        requiredPlaceholders: def.requiredPlaceholders,
        versions: (versionsByType.get(type) || []).slice(0, 10),
        preview,
      };
    });

    const themeDraftPayload: EmailThemePalette = draftTheme
      ? {
          logoUrl: draftTheme.logoPath,
          bannerUrl: draftTheme.bannerPath,
          primaryColor: draftTheme.primaryColor,
          deepBlueColor: draftTheme.deepBlueColor,
          orangeAccent: draftTheme.orangeAccent,
          greenAccent: draftTheme.greenAccent,
          paleBgColor: draftTheme.paleBgColor,
          bodyTextColor: draftTheme.bodyTextColor,
          secondaryTextColor: draftTheme.secondaryTextColor,
          surfaceColor: draftTheme.surfaceColor,
          senderDisplayName: draftTheme.senderDisplayName,
          supportEmail: draftTheme.supportEmail || '',
          websiteUrl: draftTheme.websiteUrl,
          tagline: draftTheme.tagline,
          footerTagline: draftTheme.footerTagline,
          socialLinks: JSON.parse(draftTheme.socialLinksJson || '[]'),
        }
      : publishedTheme;

    return NextResponse.json({
      templates,
      allowlistedVariables: ALLOWLISTED_VARIABLES,
      theme: {
        published: publishedTheme,
        draft: themeDraftPayload,
        hasActiveSmtp: Boolean(activeConfig?.smtpEnabled),
      },
    });
  } catch (error: any) {
    console.error('Error fetching email templates:', error);
    return NextResponse.json({ error: 'Failed to load email templates.' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;
  const { session } = authCheck;

  try {
    const body = await req.json().catch(() => null);
    const parsed = TemplateSaveSchema.parse(body);

    const def = DEFAULT_EMAIL_TEMPLATES[parsed.emailType as ManagedEmailType];
    if (!def) {
      return NextResponse.json({ error: 'Unknown email template type.' }, { status: 400 });
    }

    if (!validateCtaUrlTemplate(parsed.ctaUrlTemplate)) {
      return NextResponse.json(
        { error: 'CTA URL must be an https:// or http:// URL or an allowlisted {{variable}}.' },
        { status: 400 }
      );
    }

    const sanitizedHtml = sanitizeTemplateBodyHtml(parsed.bodyHtml);
    const placeholderCheck = validateTemplatePlaceholders({
      requiredPlaceholders: def.requiredPlaceholders,
      subject: parsed.subject,
      bodyHtml: sanitizedHtml,
      bodyText: parsed.bodyText,
      ctaUrlTemplate: parsed.ctaUrlTemplate,
    });

    if (!placeholderCheck.valid) {
      const errs: string[] = [];
      if (placeholderCheck.missing.length) {
        errs.push(`Missing required placeholders: ${placeholderCheck.missing.map((k) => `{{${k}}}`).join(', ')}`);
      }
      if (placeholderCheck.unknown.length) {
        errs.push(`Unsupported placeholders: ${placeholderCheck.unknown.map((k) => `{{${k}}}`).join(', ')}`);
      }
      return NextResponse.json({ error: errs.join(' ') }, { status: 400 });
    }

    const updated = await db.emailTemplate.upsert({
      where: { emailType: parsed.emailType },
      update: {
        subject: parsed.subject.replace(/[\r\n]+/g, ' '),
        preheader: parsed.preheader,
        eyebrow: parsed.eyebrow || null,
        heading: parsed.heading,
        greeting: parsed.greeting,
        bodyHtml: sanitizedHtml,
        bodyText: parsed.bodyText,
        infoPanelTitle: parsed.infoPanelTitle || null,
        infoPanelBody: parsed.infoPanelBody || null,
        footerText: parsed.footerText,
        ctaLabel: parsed.ctaLabel || def.ctaLabel,
        ctaUrlTemplate: parsed.ctaUrlTemplate || def.ctaUrlTemplate,
        bannerKey: parsed.bannerKey ?? null,
        status: 'draft',
        isCustomized: true,
        updatedByUserId: session.user.id,
        updatedByEmail: session.user.email,
      },
      create: {
        emailType: parsed.emailType,
        name: def.name,
        description: def.description,
        classification: def.classification,
        variant: def.variant,
        status: 'draft',
        version: 1,
        subject: parsed.subject.replace(/[\r\n]+/g, ' '),
        preheader: parsed.preheader,
        eyebrow: parsed.eyebrow || null,
        heading: parsed.heading,
        greeting: parsed.greeting,
        bodyHtml: sanitizedHtml,
        bodyText: parsed.bodyText,
        infoPanelTitle: parsed.infoPanelTitle || null,
        infoPanelBody: parsed.infoPanelBody || null,
        footerText: parsed.footerText,
        ctaLabel: parsed.ctaLabel || def.ctaLabel,
        ctaUrlTemplate: parsed.ctaUrlTemplate || def.ctaUrlTemplate,
        bannerKey: parsed.bannerKey ?? null,
        requiredPlaceholders: JSON.stringify(def.requiredPlaceholders),
        isCustomized: true,
        updatedByUserId: session.user.id,
        updatedByEmail: session.user.email,
      },
    });

    return NextResponse.json({ success: true, template: updated });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Template validation failed.' },
        { status: 400 }
      );
    }
    console.error('Error saving email template draft:', error);
    return NextResponse.json({ error: 'Failed to save template draft.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const authCheck = await requireAdminSession();
  if (!authCheck.ok) return authCheck.response;
  const { session } = authCheck;

  try {
    const body = await req.json().catch(() => null);
    const action = body?.action;

    if (action === 'save_theme' || action === 'publish_theme') {
      const parsedTheme = ThemeSaveSchema.parse(body.theme);
      const contrast = validateThemeContrast(parsedTheme);
      if (!contrast.valid) {
        return NextResponse.json({ error: contrast.error }, { status: 400 });
      }

      const existingDraft = await db.emailThemeConfig.findFirst({
        where: { status: 'draft' },
        orderBy: { version: 'desc' },
      });
      const existingPublished = await db.emailThemeConfig.findFirst({
        where: { status: 'published' },
        orderBy: { version: 'desc' },
      });

      const nextVersion = Math.max(existingDraft?.version || 0, existingPublished?.version || 0) + 1;
      const themeData = {
        logoPath: parsedTheme.logoPath,
        bannerPath: parsedTheme.bannerPath || '',
        primaryColor: parsedTheme.primaryColor,
        deepBlueColor: parsedTheme.deepBlueColor,
        orangeAccent: parsedTheme.orangeAccent,
        greenAccent: parsedTheme.greenAccent,
        paleBgColor: parsedTheme.paleBgColor,
        bodyTextColor: parsedTheme.bodyTextColor,
        secondaryTextColor: parsedTheme.secondaryTextColor,
        surfaceColor: parsedTheme.surfaceColor,
        senderDisplayName: parsedTheme.senderDisplayName,
        supportEmail: parsedTheme.supportEmail || null,
        websiteUrl: parsedTheme.websiteUrl,
        tagline: parsedTheme.tagline,
        footerTagline: parsedTheme.footerTagline,
        socialLinksJson: JSON.stringify(parsedTheme.socialLinks),
        updatedByUserId: session.user.id,
        updatedByEmail: session.user.email,
      };

      if (action === 'save_theme') {
        const saved = existingDraft
          ? await db.emailThemeConfig.update({ where: { id: existingDraft.id }, data: themeData })
          : await db.emailThemeConfig.create({
              data: { ...themeData, status: 'draft', version: nextVersion },
            });
        return NextResponse.json({ success: true, theme: saved });
      }

      const published = await db.$transaction(async (tx) => {
        await tx.emailThemeConfig.updateMany({
          where: { status: 'published' },
          data: { status: 'archived' },
        });
        if (existingDraft) {
          return tx.emailThemeConfig.update({
            where: { id: existingDraft.id },
            data: {
              ...themeData,
              status: 'published',
              publishedAt: new Date(),
              publishedByUserId: session.user.id,
            },
          });
        }
        return tx.emailThemeConfig.create({
          data: {
            ...themeData,
            status: 'published',
            version: nextVersion,
            publishedAt: new Date(),
            publishedByUserId: session.user.id,
          },
        });
      });

      return NextResponse.json({ success: true, theme: published });
    }

    const emailType = body?.emailType as ManagedEmailType;
    const def = DEFAULT_EMAIL_TEMPLATES[emailType];
    if (!def) {
      return NextResponse.json({ error: 'Unknown email template type.' }, { status: 400 });
    }

    if (action === 'restore') {
      await db.emailTemplate.deleteMany({ where: { emailType } });
      return NextResponse.json({ success: true, restored: true });
    }

    if (action === 'publish') {
      const current = await db.emailTemplate.findUnique({ where: { emailType } });
      const nextVersion = current ? current.version + 1 : 1;

      const published = await db.$transaction(async (tx) => {
        const saved = current
          ? await tx.emailTemplate.update({
              where: { emailType },
              data: {
                status: 'published',
                version: nextVersion,
                publishedAt: new Date(),
                publishedByUserId: session.user.id,
                publishedByEmail: session.user.email,
              },
            })
          : await tx.emailTemplate.create({
              data: {
                emailType,
                name: def.name,
                description: def.description,
                classification: def.classification,
                variant: def.variant,
                status: 'published',
                version: 1,
                subject: def.subject,
                preheader: def.preheader,
                eyebrow: def.eyebrow,
                heading: def.heading,
                greeting: def.greeting,
                bodyHtml: def.bodyHtml,
                bodyText: def.bodyText,
                infoPanelTitle: def.infoPanelTitle || null,
                infoPanelBody: def.infoPanelBody || null,
                footerText: def.footerText,
                ctaLabel: def.ctaLabel,
                ctaUrlTemplate: def.ctaUrlTemplate,
                bannerKey: def.bannerKey || null,
                requiredPlaceholders: JSON.stringify(def.requiredPlaceholders),
                isCustomized: false,
                publishedAt: new Date(),
                publishedByUserId: session.user.id,
                publishedByEmail: session.user.email,
              },
            });

        await tx.emailTemplateVersion.create({
          data: {
            templateId: saved.id,
            emailType,
            version: saved.version,
            status: 'published',
            snapshotJson: JSON.stringify({
              subject: saved.subject,
              preheader: saved.preheader,
              eyebrow: saved.eyebrow,
              heading: saved.heading,
              greeting: saved.greeting,
              bodyHtml: saved.bodyHtml,
              bodyText: saved.bodyText,
              infoPanelTitle: saved.infoPanelTitle,
              infoPanelBody: saved.infoPanelBody,
              footerText: saved.footerText,
              ctaLabel: saved.ctaLabel,
              ctaUrlTemplate: saved.ctaUrlTemplate,
              bannerKey: saved.bannerKey,
            }),
            changedByUserId: session.user.id,
            changedByEmail: session.user.email,
          },
        });

        return saved;
      });

      return NextResponse.json({ success: true, template: published });
    }

    if (action === 'rollback') {
      const versionId = String(body.versionId || '');
      const ver = await db.emailTemplateVersion.findUnique({ where: { id: versionId } });
      if (!ver || ver.emailType !== emailType) {
        return NextResponse.json({ error: 'Template version not found.' }, { status: 404 });
      }
      const snap = JSON.parse(ver.snapshotJson);
      const current = await db.emailTemplate.findUnique({ where: { emailType } });
      const nextVersion = (current?.version || ver.version) + 1;

      const updated = await db.emailTemplate.update({
        where: { emailType },
        data: {
          ...snap,
          status: 'published',
          version: nextVersion,
          publishedAt: new Date(),
          publishedByUserId: session.user.id,
          publishedByEmail: session.user.email,
        },
      });

      return NextResponse.json({ success: true, template: updated });
    }

    if (action === 'preview') {
      const theme = await getPublishedEmailTheme();
      const previewTheme: EmailThemePalette = body.theme
        ? { ...DEFAULT_EMAIL_THEME, ...theme, ...body.theme }
        : theme;
      const preview = renderBrandedEmail({
        template: {
          variant: body.variant || def.variant,
          subject: body.subject || def.subject,
          preheader: body.preheader || def.preheader,
          eyebrow: body.eyebrow ?? def.eyebrow,
          heading: body.heading || def.heading,
          greeting: body.greeting || def.greeting,
          bodyHtml: body.bodyHtml || def.bodyHtml,
          bodyText: body.bodyText || def.bodyText,
          infoPanelTitle: body.infoPanelTitle ?? def.infoPanelTitle,
          infoPanelBody: body.infoPanelBody ?? def.infoPanelBody,
          footerText: body.footerText ?? def.footerText,
          ctaLabel: body.ctaLabel || def.ctaLabel,
          ctaUrlTemplate: body.ctaUrlTemplate || def.ctaUrlTemplate,
          bannerKey: body.bannerKey ?? def.bannerKey,
          securityOrHelpNote: def.securityOrHelpNote,
          unsubscribeLabel: def.unsubscribeLabel,
        },
        variables: def.syntheticData,
        theme: previewTheme,
      });
      return NextResponse.json({ success: true, preview });
    }

    if (action === 'send_test') {
      const recipientEmail = z.string().trim().email().parse(body.recipientEmail);
      const activeConfig = await getActiveEmailConfig();
      if (!activeConfig || !activeConfig.smtpEnabled) {
        return NextResponse.json(
          { error: 'Outgoing SMTP is not enabled/activated in Admin → Settings → Email.' },
          { status: 400 }
        );
      }
      const result = await sendTestEmailUsingConfig(activeConfig, recipientEmail);
      return NextResponse.json(result, { status: result.success ? 200 : 400 });
    }

    return NextResponse.json({ error: 'Unsupported template action.' }, { status: 400 });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Validation failed.' },
        { status: 400 }
      );
    }
    console.error('Error in template POST:', error);
    return NextResponse.json({ error: 'Template operation failed.' }, { status: 500 });
  }
}
