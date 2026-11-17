'use client';

import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Loader2,
  Mail,
  Save,
  Send,
  ShieldCheck,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/frontend/components/ui/sheet';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Badge } from '@/frontend/components/ui/badge';
import { useToast } from '@/frontend/hooks/use-toast';

interface LeadDetailsDrawerProps {
  leadId: string | null;
  institutions: Array<{ id: string; name: string }>;
  onClose: () => void;
  onRefresh: () => void;
  onSendInviteToLead: (lead: { id: string; email: string; fullName?: string | null }) => void;
}

export default function LeadDetailsDrawer({
  leadId,
  institutions,
  onClose,
  onRefresh,
  onSendInviteToLead,
}: LeadDetailsDrawerProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [showTech, setShowTech] = useState(false);

  const [fullName, setFullName] = useState('');
  const [institutionId, setInstitutionId] = useState('');
  const [institutionName, setInstitutionName] = useState('');
  const [designation, setDesignation] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [notes, setNotes] = useState('');
  const [suppressionReason, setSuppressionReason] = useState('');

  const loadDetails = async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load lead details.');
      setDetails(data);
      setFullName(data.lead.fullName || '');
      setInstitutionId(data.lead.institutionId || '');
      setInstitutionName(data.lead.institutionName || '');
      setDesignation(data.lead.designation || '');
      setTagsText((data.lead.tags || []).join(', '));
      setNotes(data.lead.notes || '');
      setSuppressionReason('');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leadId) loadDetails(leadId);
    else setDetails(null);
  }, [leadId]);

  const handleSaveProfile = async () => {
    if (!leadId) return;
    setSaving(true);
    try {
      const tags = tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName || null,
          institutionId: institutionId || null,
          institutionName: institutionName || null,
          designation: designation || null,
          tags,
          notes: notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save lead.');
      toast({ title: 'Lead Updated' });
      await loadDetails(leadId);
      onRefresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleSuppression = async () => {
    if (!leadId || !details) return;
    const isSuppressed = Boolean(details.suppression);
    if (isSuppressed && !suppressionReason.trim()) {
      toast({
        variant: 'destructive',
        title: 'Reason Required',
        description: 'Provide an explicit reason to unsuppress this contact.',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isSuppressed ? 'unsuppress' : 'suppress',
          scope: 'selected_ids',
          leadIds: [leadId],
          reason: suppressionReason.trim() || 'manual',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed.');
      toast({ title: isSuppressed ? 'Contact Unsuppressed' : 'Contact Suppressed' });
      await loadDetails(leadId);
      onRefresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!leadId || !details) return;
    const nextArchived = !details.lead.isArchived;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${encodeURIComponent(leadId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isArchived: nextArchived }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Archive action failed.');
      toast({ title: nextArchived ? 'Lead Archived' : 'Lead Restored' });
      await loadDetails(leadId);
      onRefresh();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={Boolean(leadId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Lead Details &amp; Activity</SheetTitle>
          <SheetDescription>
            {details?.lead?.email || 'Loading lead profile...'}
          </SheetDescription>
        </SheetHeader>

        {loading || !details ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading lead details...
          </div>
        ) : (
          <div className="space-y-6 py-4 text-sm">
            {/* Status Badges + Quick Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-[#EFF6FC] p-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">{details.lead.source}</Badge>
                {details.lead.isArchived && <Badge variant="secondary">Archived</Badge>}
                {details.suppression ? (
                  <Badge variant="destructive">
                    Suppressed ({details.suppression.reason})
                  </Badge>
                ) : (
                  <Badge variant="default">Eligible</Badge>
                )}
                {details.submissions?.some((s: any) => s.status === 'verified') && (
                  <Badge className="bg-[#8DBB32] text-white">Verified Participant</Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() =>
                    onSendInviteToLead({
                      id: details.lead.id,
                      email: details.lead.email,
                      fullName: details.lead.fullName,
                    })
                  }
                  disabled={Boolean(details.suppression) || details.lead.isArchived}
                >
                  <Send className="mr-1.5 h-3.5 w-3.5" />
                  Send Invite
                </Button>
                <Button size="sm" variant="outline" onClick={handleToggleArchive} disabled={saving}>
                  <Archive className="mr-1.5 h-3.5 w-3.5" />
                  {details.lead.isArchived ? 'Unarchive' : 'Archive'}
                </Button>
              </div>
            </div>

            {/* Editable Profile */}
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold text-[#123B70]">Contact &amp; Organization</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Full / Preferred Name</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Designation</Label>
                  <Input value={designation} onChange={(e) => setDesignation(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Managed Institution</Label>
                  <select
                    value={institutionId}
                    onChange={(e) => setInstitutionId(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="">-- Unlinked / Custom --</option>
                    {institutions.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Custom Institution Name</Label>
                  <Input
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tags (comma-separated)</Label>
                <Input
                  placeholder="e.g., tier-1, hr-director, karachi"
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Internal Notes</Label>
                <Textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  Created {new Date(details.lead.createdAt).toLocaleString()}
                </span>
                <Button size="sm" onClick={handleSaveProfile} disabled={saving}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save Changes
                </Button>
              </div>
            </div>

            {/* Suppression Controls */}
            <div className="space-y-2 rounded-lg border p-4">
              <h3 className="font-semibold flex items-center gap-1.5 text-xs uppercase tracking-wider">
                <Ban className="h-3.5 w-3.5 text-destructive" />
                Suppression &amp; Eligibility
              </h3>
              <div className="flex gap-2">
                <Input
                  className="text-xs"
                  placeholder={
                    details.suppression
                      ? 'Required reason to unsuppress...'
                      : 'Optional suppression reason (default: manual)'
                  }
                  value={suppressionReason}
                  onChange={(e) => setSuppressionReason(e.target.value)}
                />
                <Button
                  size="sm"
                  variant={details.suppression ? 'outline' : 'destructive'}
                  onClick={handleToggleSuppression}
                  disabled={saving}
                >
                  {details.suppression ? 'Unsuppress' : 'Suppress'}
                </Button>
              </div>
            </div>

            {/* Chronological Timeline */}
            <div className="space-y-2 rounded-lg border p-4">
              <h3 className="font-semibold text-[#123B70] flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                Activity Timeline ({details.timeline?.length || 0})
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {(details.timeline || []).map((ev: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-[#0868B5] pl-3 py-0.5 text-xs">
                    <div className="font-medium">{ev.title}</div>
                    {ev.detail && <div className="text-muted-foreground">{ev.detail}</div>}
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(ev.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expandable Technical SMTP Troubleshooting */}
            <div className="rounded-lg border p-3 text-xs">
              <button
                type="button"
                className="flex w-full items-center justify-between font-semibold"
                onClick={() => setShowTech((p) => !p)}
              >
                <span>Technical Email Attempts ({details.outboxAttempts?.length || 0})</span>
                {showTech ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
              {showTech && (
                <div className="mt-3 space-y-2">
                  {(details.outboxAttempts || []).map((a: any) => (
                    <div key={a.id} className="rounded bg-muted/40 p-2 space-y-1">
                      <div className="flex justify-between">
                        <span className="font-medium">{a.emailType}</span>
                        <Badge variant="outline">{a.friendlyStatus}</Badge>
                      </div>
                      <p className="text-muted-foreground">
                        Attempts: {a.attemptCount}/{a.maxAttempts} |{' '}
                        {new Date(a.createdAt).toLocaleString()}
                      </p>
                      {(a.smtpResponse || a.lastError) && (
                        <p className="font-mono text-[11px] break-all">
                          {a.lastError || a.smtpResponse}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
