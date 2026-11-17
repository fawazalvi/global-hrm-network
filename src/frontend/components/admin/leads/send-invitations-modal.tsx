'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Eye, Loader2, Send } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/frontend/components/ui/dialog';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Badge } from '@/frontend/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs';
import { useToast } from '@/frontend/hooks/use-toast';

interface SendInvitationsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaigns: Array<{ id: string; title: string }>;
  templates: Array<{ emailType: string; name: string }>;
  selectedLeadIds: string[];
  totalMatchingCount: number;
  currentFilters: Record<string, any>;
  presetSingleLead?: { email: string; fullName?: string | null } | null;
  defaultAudienceMode?: 'single' | 'manual_batch' | 'selected_ids' | 'all_matching';
  onSent: () => void;
}

export default function SendInvitationsModal({
  open,
  onOpenChange,
  campaigns,
  templates,
  selectedLeadIds,
  totalMatchingCount,
  currentFilters,
  presetSingleLead,
  defaultAudienceMode,
  onSent,
}: SendInvitationsModalProps) {
  const { toast } = useToast();
  const [mode, setMode] = useState<'single' | 'manual_batch' | 'selected_ids' | 'all_matching'>(
    'single'
  );
  const [campaignId, setCampaignId] = useState('');
  const [templateType, setTemplateType] = useState<'pakistan_launch_invitation' | 'survey_invitation'>(
    'pakistan_launch_invitation'
  );
  const [expiryDays, setExpiryDays] = useState(14);
  const [allowResend, setAllowResend] = useState(false);

  const [singleEmail, setSingleEmail] = useState('');
  const [singleName, setSingleName] = useState('');
  const [singleInstitution, setSingleInstitution] = useState('');
  const [bulkText, setBulkText] = useState('');

  const [review, setReview] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [templatePreviewHtml, setTemplatePreviewHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setReview(null);
      setResults([]);
      setTemplatePreviewHtml(null);
      if (campaigns.length > 0 && !campaignId) setCampaignId(campaigns[0].id);
      if (presetSingleLead) {
        setMode('single');
        setSingleEmail(presetSingleLead.email);
        setSingleName(presetSingleLead.fullName || '');
      } else if (defaultAudienceMode) {
        setMode(defaultAudienceMode);
      } else if (selectedLeadIds.length > 0) {
        setMode('selected_ids');
      } else {
        setMode('single');
      }
    }
  }, [open, presetSingleLead, defaultAudienceMode, selectedLeadIds.length, campaigns]);

  const parseBulk = () =>
    bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .map((line) => {
        const angle = /^(.+?)\s*<([^>]+)>$/.exec(line);
        if (angle) return { name: angle[1].trim(), email: angle[2].trim(), institution: '' };
        if (line.includes(',')) {
          const [a, b, c] = line.split(',').map((s) => s.trim());
          return a.includes('@')
            ? { email: a, name: b || '', institution: c || '' }
            : { name: a, email: b || '', institution: c || '' };
        }
        return { email: line, name: '', institution: '' };
      });

  const buildPayload = (action: 'preview' | 'send') => {
    const contacts =
      mode === 'single'
        ? [{ email: singleEmail.trim(), name: singleName.trim(), institution: singleInstitution.trim() }]
        : mode === 'manual_batch'
          ? parseBulk()
          : undefined;

    return {
      action,
      mode,
      contacts,
      leadIds: mode === 'selected_ids' ? selectedLeadIds : undefined,
      filters: mode === 'all_matching' ? currentFilters : undefined,
      campaignId: campaignId || undefined,
      templateType,
      expiryDays,
      allowResend,
    };
  };

  const handleReviewEligibility = async () => {
    setLoading(true);
    setResults([]);
    try {
      const res = await fetch('/api/admin/leads/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload('preview')),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Eligibility check failed.');
      setReview(data.review);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Review Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplatePreview = async () => {
    try {
      const res = await fetch('/api/admin/settings/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', emailType: templateType }),
      });
      const data = await res.json();
      if (res.ok && data.preview?.html) {
        setTemplatePreviewHtml(data.preview.html);
      }
    } catch {
      // ignore
    }
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/leads/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload('send')),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to queue invitations.');
      setReview(data.review);
      setResults(data.results || []);
      toast({
        title: 'Invitations Processed',
        description: `Queued/processed ${data.review?.finalToQueue || 0} invitation(s).`,
      });
      onSent();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Send Failed', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Send Survey Invitations</DialogTitle>
          <DialogDescription>
            Each recipient receives an individual personalized email with a unique expiring survey
            link. Suppressed and already-verified contacts are always excluded.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Campaign</Label>
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email Template</Label>
              <select
                value={templateType}
                onChange={(e) => {
                  setTemplateType(e.target.value as any);
                  setTemplatePreviewHtml(null);
                }}
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-xs"
              >
                {templates.map((t) => (
                  <option key={t.emailType} value={t.emailType}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expiry (Days)</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={expiryDays}
                onChange={(e) => setExpiryDays(Math.max(1, Math.min(365, Number(e.target.value) || 14)))}
                className="h-9"
              />
            </div>
          </div>

          <Tabs value={mode} onValueChange={(v) => { setMode(v as any); setReview(null); }}>
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="single">Single Lead</TabsTrigger>
              <TabsTrigger value="manual_batch">Manual Batch (≤50)</TabsTrigger>
              <TabsTrigger value="selected_ids" disabled={selectedLeadIds.length === 0}>
                Selected Rows ({selectedLeadIds.length})
              </TabsTrigger>
              <TabsTrigger value="all_matching">
                All Matching Results ({totalMatchingCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="grid gap-3 sm:grid-cols-3 pt-2">
              <div className="space-y-1">
                <Label className="text-xs">Email *</Label>
                <Input
                  type="email"
                  placeholder="name@bank.com.pk"
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Preferred Name (fallback: Hello,)</Label>
                <Input
                  placeholder="e.g., Fawaz Alvi"
                  value={singleName}
                  onChange={(e) => setSingleName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Institution</Label>
                <Input
                  placeholder="e.g., Habib Bank Limited"
                  value={singleInstitution}
                  onChange={(e) => setSingleInstitution(e.target.value)}
                />
              </div>
            </TabsContent>

            <TabsContent value="manual_batch" className="space-y-2 pt-2">
              <Label className="text-xs">One contact per line (email, email, Name, or Name &lt;email&gt;)</Label>
              <Textarea
                rows={4}
                className="font-mono text-xs"
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'fawaz@bank.com.pk\nhina@bank.com.pk, Hina Saqib'}
              />
            </TabsContent>

            <TabsContent value="selected_ids" className="pt-2">
              <p className="rounded border bg-[#EFF6FC] p-3 text-xs text-[#123B70]">
                Targeting <strong>{selectedLeadIds.length}</strong> explicitly selected lead row(s).
              </p>
            </TabsContent>

            <TabsContent value="all_matching" className="pt-2">
              <p className="rounded border bg-[#FFF7ED] p-3 text-xs text-amber-900">
                Targeting <strong>all {totalMatchingCount} lead(s)</strong> matching your active
                server-side filters (not just the current visible page).
              </p>
            </TabsContent>
          </Tabs>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={allowResend}
                onChange={(e) => {
                  setAllowResend(e.target.checked);
                  setReview(null);
                }}
              />
              Allow resending to previously invited leads
            </label>
            <Button type="button" variant="ghost" size="sm" onClick={handleLoadTemplatePreview}>
              <Eye className="mr-1.5 h-3.5 w-3.5" />
              Preview Template
            </Button>
          </div>

          {templatePreviewHtml && (
            <iframe
              title="Invitation Template Preview"
              sandbox=""
              srcDoc={templatePreviewHtml}
              className="w-full h-64 rounded border bg-white"
            />
          )}

          {review && (
            <div className="rounded-lg border bg-[#EFF6FC] p-3 space-y-2 text-xs">
              <div className="font-semibold text-[#123B70]">Pre-Send Eligibility Review</div>
              <div className="flex flex-wrap gap-2">
                <Badge>Eligible to Queue: {review.finalToQueue}</Badge>
                <Badge variant="secondary">Suppressed Excluded: {review.suppressedExcluded}</Badge>
                <Badge variant="secondary">Verified Excluded: {review.alreadyVerifiedExcluded}</Badge>
                <Badge variant="secondary">Previously Invited Excluded: {review.previouslyInvitedExcluded}</Badge>
                <Badge variant="outline">Invalid/Duplicate: {review.invalidOrDuplicateExcluded}</Badge>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="rounded-lg border p-3 max-h-40 overflow-y-auto space-y-1 text-xs">
              {results.map((r, i) => (
                <div key={i} className="flex justify-between gap-2 border-b pb-1">
                  <span>{r.email}</span>
                  <Badge variant={r.success ? 'default' : 'destructive'}>{r.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={handleReviewEligibility} disabled={loading}>
            Review Eligibility
          </Button>
          <Button type="button" onClick={handleSend} disabled={loading}>
            {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
            {review ? `Queue & Send (${review.finalToQueue})` : 'Send Invitations'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
