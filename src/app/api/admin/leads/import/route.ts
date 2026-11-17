import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/backend/db';
import { requireLeadPermission } from '@/backend/leads/permissions';
import { parseTags } from '@/backend/leads/service';
import { normalizeEmail } from '@/backend/survey-validation';

const ImportRowSchema = z.object({
  rowNumber: z.number().int().min(1),
  email: z.string().trim(),
  fullName: z.string().trim().max(120).optional().default(''),
  institutionName: z.string().trim().max(160).optional().default(''),
  designation: z.string().trim().max(140).optional().default(''),
  tags: z.string().trim().max(300).optional().default(''),
});

const CsvImportSchema = z.object({
  dryRun: z.boolean().default(true),
  existingStrategy: z.enum(['skip', 'update_missing', 'overwrite']).default('skip'),
  campaignId: z.string().optional().nullable(),
  rows: z.array(ImportRowSchema).min(1).max(1000),
});

export async function POST(req: Request) {
  const perm = await requireLeadPermission('edit_import_leads');
  if (!perm.ok) return perm.response;
  const { session } = perm;

  try {
    const body = await req.json().catch(() => null);
    const parsed = CsvImportSchema.parse(body);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seenInUpload = new Set<string>();
    const validRows: Array<{
      rowNumber: number;
      email: string;
      normalized: string;
      fullName: string;
      institutionName: string;
      designation: string;
      tags: string[];
    }> = [];
    const rowErrors: Array<{ rowNumber: number; email: string; reason: string }> = [];

    for (const r of parsed.rows) {
      if (!emailRegex.test(r.email)) {
        rowErrors.push({ rowNumber: r.rowNumber, email: r.email, reason: 'Invalid email address.' });
        continue;
      }
      const norm = normalizeEmail(r.email);
      if (seenInUpload.has(norm)) {
        rowErrors.push({
          rowNumber: r.rowNumber,
          email: r.email,
          reason: 'Duplicate email within uploaded CSV.',
        });
        continue;
      }
      seenInUpload.add(norm);
      const parsedTags = r.tags
        ? r.tags
            .split(/[;|,]/)
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      validRows.push({
        rowNumber: r.rowNumber,
        email: r.email,
        normalized: norm,
        fullName: r.fullName,
        institutionName: r.institutionName,
        designation: r.designation,
        tags: parsedTags,
      });
    }

    const existingList = validRows.length
      ? await db.leadContact.findMany({
          where: { normalizedEmail: { in: validRows.map((r) => r.normalized) } },
          select: {
            id: true,
            normalizedEmail: true,
            fullName: true,
            institutionName: true,
            designation: true,
            tagsJson: true,
          },
        })
      : [];
    const existingMap = new Map(existingList.map((e) => [e.normalizedEmail, e]));

    const newRows = validRows.filter((r) => !existingMap.has(r.normalized));
    const duplicateExistingRows = validRows.filter((r) => existingMap.has(r.normalized));

    if (parsed.dryRun) {
      return NextResponse.json({
        dryRun: true,
        summary: {
          totalRows: parsed.rows.length,
          newToCreate: newRows.length,
          existingMatches: duplicateExistingRows.length,
          errorCount: rowErrors.length,
        },
        errors: rowErrors.slice(0, 50),
        previewNew: newRows.slice(0, 10),
      });
    }

    // Match selectable institutions by exact normalized name when possible
    const institutions = await db.institution.findMany({
      where: { isActive: true },
      select: { id: true, name: true, shortCode: true },
    });
    const instByName = new Map<string, string>();
    for (const inst of institutions) {
      instByName.set(inst.name.trim().toLowerCase(), inst.id);
      if (inst.shortCode) instByName.set(inst.shortCode.trim().toLowerCase(), inst.id);
    }

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const r of validRows) {
      const matchedInstId = r.institutionName
        ? instByName.get(r.institutionName.trim().toLowerCase()) || null
        : null;
      const existing = existingMap.get(r.normalized);

      let leadId: string;
      if (!existing) {
        const created = await db.leadContact.create({
          data: {
            email: r.email,
            normalizedEmail: r.normalized,
            fullName: r.fullName || null,
            institutionId: matchedInstId,
            institutionName: r.institutionName || null,
            designation: r.designation || null,
            source: 'csv_import',
            tagsJson: JSON.stringify(r.tags),
            createdByUserId: session.user.id,
            updatedByUserId: session.user.id,
          },
        });
        leadId = created.id;
        createdCount++;
      } else if (parsed.existingStrategy === 'skip') {
        skippedCount++;
        continue;
      } else {
        const mergedTags = Array.from(new Set([...parseTags(existing.tagsJson), ...r.tags]));
        const updateData: any = {
          tagsJson: JSON.stringify(mergedTags),
          updatedByUserId: session.user.id,
        };
        if (parsed.existingStrategy === 'overwrite') {
          if (r.fullName) updateData.fullName = r.fullName;
          if (r.institutionName) {
            updateData.institutionName = r.institutionName;
            updateData.institutionId = matchedInstId;
          }
          if (r.designation) updateData.designation = r.designation;
        } else {
          if (!existing.fullName && r.fullName) updateData.fullName = r.fullName;
          if (!existing.institutionName && r.institutionName) {
            updateData.institutionName = r.institutionName;
            updateData.institutionId = matchedInstId;
          }
          if (!existing.designation && r.designation) updateData.designation = r.designation;
        }
        await db.leadContact.update({ where: { id: existing.id }, data: updateData });
        leadId = existing.id;
        updatedCount++;
      }

      if (parsed.campaignId) {
        await db.leadCampaignMembership.upsert({
          where: { leadId_campaignId: { leadId, campaignId: parsed.campaignId } },
          update: {},
          create: {
            leadId,
            campaignId: parsed.campaignId,
            assignedByUserId: session.user.id,
          },
        });
      }
    }

    await db.leadAuditLog.create({
      data: {
        actorUserId: session.user.id,
        actorEmail: session.user.email,
        action: 'imported',
        summary: `CSV import completed: ${createdCount} created, ${updatedCount} updated, ${skippedCount} skipped, ${rowErrors.length} errors.`,
      },
    });

    return NextResponse.json({
      dryRun: false,
      summary: {
        createdCount,
        updatedCount,
        skippedCount,
        errorCount: rowErrors.length,
      },
      errors: rowErrors.slice(0, 50),
    });
  } catch (error: any) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Invalid import payload.' },
        { status: 400 }
      );
    }
    console.error('CSV import error:', error);
    return NextResponse.json({ error: 'CSV import failed.' }, { status: 500 });
  }
}
