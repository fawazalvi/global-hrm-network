'use client';

import { useState } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/frontend/components/ui/dialog';
import { Button } from '@/frontend/components/ui/button';
import { Label } from '@/frontend/components/ui/label';
import { Badge } from '@/frontend/components/ui/badge';
import { useToast } from '@/frontend/hooks/use-toast';

interface CsvImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: Array<{ id: string; title: string }>;
  onImported: () => void;
}

function parseCsvLines(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell.trim());
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell.trim());
      if (row.some((c) => c.length > 0)) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some((c) => c.length > 0)) rows.push(row);
  return rows;
}

export default function CsvImportModal({
  open,
  onOpenChange,
  campaigns,
  onImported,
}: CsvImportModalProps) {
  const { toast } = useToast();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState({
    email: -1,
    fullName: -1,
    institutionName: -1,
    designation: -1,
    tags: -1,
  });
  const [existingStrategy, setExistingStrategy] = useState<'skip' | 'update_missing' | 'overwrite'>(
    'skip'
  );
  const [campaignId, setCampaignId] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsvLines(text);
    if (parsed.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Empty CSV',
        description: 'CSV must include a header row and at least one data row.',
      });
      return;
    }
    const hdrs = parsed[0];
    setHeaders(hdrs);
    setRawRows(parsed.slice(1, 1001));
    setPreview(null);

    const findCol = (patterns: RegExp[]) =>
      hdrs.findIndex((h) => patterns.some((p) => p.test(h.toLowerCase())));

    setMapping({
      email: findCol([/email/]),
      fullName: findCol([/name/, /full.?name/, /preferred/]),
      institutionName: findCol([/institution/, /bank/, /org/, /company/]),
      designation: findCol([/designation/, /title/, /role/]),
      tags: findCol([/tag/]),
    });
  };

  const downloadSample = () => {
    const sample =
      'Email,Full Name,Institution,Designation,Tags\n' +
      'fawaz@example.com,Fawaz Alvi,Habib Bank Limited,VP HR Transformation,"tier-1; hr"\n' +
      'hina@example.com,Hina Saqib,United Bank Limited,Head of Talent,"talent; karachi"\n';
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ghrm-leads-sample.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const buildMappedRows = () =>
    rawRows.map((cols, idx) => ({
      rowNumber: idx + 2,
      email: mapping.email >= 0 ? cols[mapping.email] || '' : '',
      fullName: mapping.fullName >= 0 ? cols[mapping.fullName] || '' : '',
      institutionName: mapping.institutionName >= 0 ? cols[mapping.institutionName] || '' : '',
      designation: mapping.designation >= 0 ? cols[mapping.designation] || '' : '',
      tags: mapping.tags >= 0 ? cols[mapping.tags] || '' : '',
    }));

  const runImport = async (dryRun: boolean) => {
    if (mapping.email < 0) {
      toast({ variant: 'destructive', title: 'Map the Email column first.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/admin/leads/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dryRun,
          existingStrategy,
          campaignId: campaignId || null,
          rows: buildMappedRows(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed.');

      if (dryRun) {
        setPreview(data);
      } else {
        toast({
          title: 'CSV Import Completed',
          description: `Created ${data.summary.createdCount}, updated ${data.summary.updatedCount}, skipped ${data.summary.skippedCount}.`,
        });
        onImported();
        onOpenChange(false);
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Import Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Leads from CSV</DialogTitle>
          <DialogDescription>
            Imported leads are never automatically emailed and never override existing suppressions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-center justify-between gap-2">
            <input type="file" accept=".csv,text/csv" onChange={handleFile} className="text-xs" />
            <Button type="button" variant="outline" size="sm" onClick={downloadSample}>
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Sample CSV
            </Button>
          </div>

          {headers.length > 0 && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 rounded-lg border p-3 bg-muted/20">
                {[
                  ['email', 'Email *'],
                  ['fullName', 'Full / Preferred Name'],
                  ['institutionName', 'Institution / Bank'],
                  ['designation', 'Designation'],
                  ['tags', 'Tags'],
                ].map(([field, label]) => (
                  <div key={field} className="space-y-1">
                    <Label className="text-xs">{label}</Label>
                    <select
                      value={(mapping as any)[field]}
                      onChange={(e) =>
                        setMapping({ ...mapping, [field]: Number(e.target.value) })
                      }
                      className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                    >
                      <option value={-1}>-- Ignore --</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Existing Lead Handling</Label>
                  <select
                    value={existingStrategy}
                    onChange={(e) => setExistingStrategy(e.target.value as any)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="skip">Skip existing leads</option>
                    <option value="update_missing">Fill only missing fields</option>
                    <option value="overwrite">Update with uploaded values</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Assign Campaign (Optional)</Label>
                  <select
                    value={campaignId}
                    onChange={(e) => setCampaignId(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
                  >
                    <option value="">None</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {preview && (
            <div className="rounded-lg border p-3 bg-[#EFF6FC] space-y-2 text-xs">
              <div className="flex flex-wrap gap-2">
                <Badge>Total Rows: {preview.summary.totalRows}</Badge>
                <Badge variant="default">New: {preview.summary.newToCreate}</Badge>
                <Badge variant="secondary">Existing: {preview.summary.existingMatches}</Badge>
                <Badge variant="destructive">Errors: {preview.summary.errorCount}</Badge>
              </div>
              {preview.errors?.length > 0 && (
                <div className="max-h-28 overflow-y-auto text-red-700 space-y-0.5">
                  {preview.errors.map((err: any, i: number) => (
                    <div key={i}>
                      Row {err.rowNumber} ({err.email || 'blank'}): {err.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => runImport(true)} disabled={loading || rawRows.length === 0}>
            Preview Import
          </Button>
          <Button onClick={() => runImport(false)} disabled={loading || rawRows.length === 0}>
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
            Import Leads
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
