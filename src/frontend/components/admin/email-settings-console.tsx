'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Inbox,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Switch } from '@/frontend/components/ui/switch';
import { Badge } from '@/frontend/components/ui/badge';
import { Textarea } from '@/frontend/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/frontend/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/frontend/components/ui/table';
import { useToast } from '@/frontend/hooks/use-toast';

type SecretAction = 'keep' | 'replace' | 'remove';

interface DraftFormState {
  smtpEnabled: boolean;
  smtpHost: string;
  smtpPort: number;
  smtpSecurity: 'implicit_tls' | 'starttls' | 'none_dev_only';
  smtpAuthEnabled: boolean;
  smtpUsername: string;
  smtpPassword: string;
  smtpPasswordAction: SecretAction;
  hasSmtpPassword: boolean;
  smtpConnectionTimeoutMs: number;
  smtpRateLimitPerMinute: number;
  smtpMaxRetries: number;
  fromDisplayName: string;
  fromEmail: string;
  replyToEmail: string;
  supportEmail: string;
  footerText: string;
  websiteUrl: string;
  senderOverrides: Record<
    string,
    { fromDisplayName?: string; fromEmail?: string; replyToEmail?: string }
  >;
  imapEnabled: boolean;
  imapHost: string;
  imapPort: number;
  imapSecurity: 'implicit_tls' | 'starttls';
  imapUsername: string;
  imapPassword: string;
  imapPasswordAction: SecretAction;
  hasImapPassword: boolean;
  imapFolder: string;
  imapPollingIntervalSec: number;
  imapInitialSyncMode: 'after_activation' | 'last_7_days' | 'last_30_days';
  imapRetentionDays: number;
}

const DEFAULT_FORM: DraftFormState = {
  smtpEnabled: false,
  smtpHost: '',
  smtpPort: 587,
  smtpSecurity: 'starttls',
  smtpAuthEnabled: true,
  smtpUsername: '',
  smtpPassword: '',
  smtpPasswordAction: 'keep',
  hasSmtpPassword: false,
  smtpConnectionTimeoutMs: 10000,
  smtpRateLimitPerMinute: 30,
  smtpMaxRetries: 3,
  fromDisplayName: 'Global HRM Network',
  fromEmail: '',
  replyToEmail: '',
  supportEmail: '',
  footerText: '',
  websiteUrl: '',
  senderOverrides: {},
  imapEnabled: false,
  imapHost: '',
  imapPort: 993,
  imapSecurity: 'implicit_tls',
  imapUsername: '',
  imapPassword: '',
  imapPasswordAction: 'keep',
  hasImapPassword: false,
  imapFolder: 'INBOX',
  imapPollingIntervalSec: 120,
  imapInitialSyncMode: 'after_activation',
  imapRetentionDays: 90,
};

const EMAIL_TYPE_LABELS: Record<string, string> = {
  verification: 'Official Email Verification',
  referral_invitation: 'Colleague Referral Invitation',
  participation_confirmation: 'Survey Participation Confirmation',
  profile_access: 'Secure Profile Access Link',
  admin_notification: 'Administrative Notification',
  account_password: 'Account & Password Email',
  survey_invitation: 'Future Survey Invitation',
};

export default function EmailSettingsConsole() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [testingImap, setTestingImap] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [activating, setActivating] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  const [encryptionKeyConfigured, setEncryptionKeyConfigured] = useState(true);
  const [encryptionKeyError, setEncryptionKeyError] = useState<string | null>(null);
  const [legacyEnvDetected, setLegacyEnvDetected] = useState(false);
  const [activeSummary, setActiveSummary] = useState<any>(null);
  const [draftMeta, setDraftMeta] = useState<any>(null);
  const [hasRollbackTarget, setHasRollbackTarget] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [form, setForm] = useState<DraftFormState>(DEFAULT_FORM);
  const [discoveredFolders, setDiscoveredFolders] = useState<string[]>([]);
  const [testRecipient, setTestRecipient] = useState('');
  const [testResultBanner, setTestResultBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Templates tab state
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplateType, setSelectedTemplateType] = useState<string>('verification');
  const [templateDraft, setTemplateDraft] = useState<any>(null);
  const [templatePreview, setTemplatePreview] = useState<{
    subject: string;
    html: string;
    text: string;
  } | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Logs tab state
  const [outboxLogs, setOutboxLogs] = useState<any[]>([]);
  const [inboundLogs, setInboundLogs] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [imapCursors, setImapCursors] = useState<any[]>([]);
  const [selectedInbound, setSelectedInbound] = useState<any>(null);
  const [logFilters, setLogFilters] = useState({
    status: 'all',
    emailType: 'all',
    recipient: '',
    campaignId: 'all',
    dateFrom: '',
    dateTo: '',
  });
  const [runningWorker, setRunningWorker] = useState(false);

  const hydrateForm = (cfg: any) => {
    if (!cfg) return;
    setForm({
      smtpEnabled: Boolean(cfg.smtpEnabled),
      smtpHost: cfg.smtpHost || '',
      smtpPort: Number(cfg.smtpPort || 587),
      smtpSecurity: cfg.smtpSecurity || 'starttls',
      smtpAuthEnabled: cfg.smtpAuthEnabled ?? true,
      smtpUsername: cfg.smtpUsername || '',
      smtpPassword: '',
      smtpPasswordAction: 'keep',
      hasSmtpPassword: Boolean(cfg.hasSmtpPassword),
      smtpConnectionTimeoutMs: Number(cfg.smtpConnectionTimeoutMs || 10000),
      smtpRateLimitPerMinute: Number(cfg.smtpRateLimitPerMinute || 30),
      smtpMaxRetries: Number(cfg.smtpMaxRetries ?? 3),
      fromDisplayName: cfg.fromDisplayName || 'Global HRM Network',
      fromEmail: cfg.fromEmail || '',
      replyToEmail: cfg.replyToEmail || '',
      supportEmail: cfg.supportEmail || '',
      footerText: cfg.footerText || '',
      websiteUrl: cfg.websiteUrl || '',
      senderOverrides: cfg.senderOverrides || {},
      imapEnabled: Boolean(cfg.imapEnabled),
      imapHost: cfg.imapHost || '',
      imapPort: Number(cfg.imapPort || 993),
      imapSecurity: cfg.imapSecurity || 'implicit_tls',
      imapUsername: cfg.imapUsername || '',
      imapPassword: '',
      imapPasswordAction: 'keep',
      hasImapPassword: Boolean(cfg.hasImapPassword),
      imapFolder: cfg.imapFolder || 'INBOX',
      imapPollingIntervalSec: Number(cfg.imapPollingIntervalSec || 120),
      imapInitialSyncMode: cfg.imapInitialSyncMode || 'after_activation',
      imapRetentionDays: Number(cfg.imapRetentionDays || 90),
    });
  };

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/email');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load email settings.');
      setEncryptionKeyConfigured(Boolean(data.encryptionKeyConfigured));
      setEncryptionKeyError(data.encryptionKeyError || null);
      setLegacyEnvDetected(Boolean(data.legacyEnvDetected));
      setActiveSummary(data.active || null);
      setDraftMeta(data.draft || null);
      setHasRollbackTarget(Boolean(data.hasRollbackTarget));
      setAuditLogs(data.auditLogs || []);
      if (data.draft) hydrateForm(data.draft);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading Email Settings',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/admin/settings/email/templates');
      const data = await res.json();
      if (res.ok && data.templates) {
        setTemplates(data.templates);
        const found = data.templates.find((t: any) => t.emailType === selectedTemplateType) || data.templates[0];
        if (found) {
          setTemplateDraft(found);
          setTemplatePreview(found.preview);
        }
      }
    } catch {
      // handled silently
    }
  };

  const loadLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (logFilters.status !== 'all') params.set('status', logFilters.status);
      if (logFilters.emailType !== 'all') params.set('emailType', logFilters.emailType);
      if (logFilters.recipient) params.set('recipient', logFilters.recipient);
      if (logFilters.campaignId !== 'all') params.set('campaignId', logFilters.campaignId);
      if (logFilters.dateFrom) params.set('dateFrom', logFilters.dateFrom);
      if (logFilters.dateTo) params.set('dateTo', logFilters.dateTo);

      const res = await fetch(`/api/admin/settings/email/logs?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setOutboxLogs(data.outboxLogs || []);
        setInboundLogs(data.inboundLogs || []);
        setCampaigns(data.campaigns || []);
        setImapCursors(data.imapCursors || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSettings();
    loadTemplates();
    loadLogs();
  }, []);

  const handleSaveDraft = async (): Promise<boolean> => {
    setSaving(true);
    setTestResultBanner(null);
    try {
      const res = await fetch('/api/admin/settings/email/draft', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save draft.');
      }
      setDraftMeta(data.draft);
      hydrateForm(data.draft);
      toast({ title: 'Draft Saved', description: 'Your draft email settings have been saved.' });
      await loadSettings();
      return true;
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Save Draft Failed',
        description: err.message,
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    const saved = await handleSaveDraft();
    if (!saved) return;
    setTestingSmtp(true);
    setTestResultBanner(null);
    try {
      const res = await fetch('/api/admin/settings/email/test-smtp', { method: 'POST' });
      const data = await res.json();
      setDraftMeta(data.config || draftMeta);
      setTestResultBanner({
        type: data.success ? 'success' : 'error',
        text: data.message,
      });
      toast({
        variant: data.success ? 'default' : 'destructive',
        title: data.success ? 'SMTP Connection Verified' : 'SMTP Test Failed',
        description: data.message,
      });
      await loadSettings();
    } catch (err: any) {
      setTestResultBanner({ type: 'error', text: err.message });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient.trim()) {
      toast({
        variant: 'destructive',
        title: 'Recipient Required',
        description: 'Enter a test recipient email address.',
      });
      return;
    }
    const saved = await handleSaveDraft();
    if (!saved) return;
    setSendingTest(true);
    setTestResultBanner(null);
    try {
      const res = await fetch('/api/admin/settings/email/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientEmail: testRecipient.trim() }),
      });
      const data = await res.json();
      setTestResultBanner({
        type: data.success ? 'success' : 'error',
        text: data.message || data.error,
      });
      toast({
        variant: data.success ? 'default' : 'destructive',
        title: data.success ? 'Test Email Accepted by SMTP' : 'Test Email Failed',
        description: data.message || data.error,
      });
    } catch (err: any) {
      setTestResultBanner({ type: 'error', text: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  const handleTestImap = async () => {
    const saved = await handleSaveDraft();
    if (!saved) return;
    setTestingImap(true);
    setTestResultBanner(null);
    try {
      const res = await fetch('/api/admin/settings/email/test-imap', { method: 'POST' });
      const data = await res.json();
      if (data.folders?.length) setDiscoveredFolders(data.folders);
      setTestResultBanner({
        type: data.success ? 'success' : 'error',
        text: data.message,
      });
      toast({
        variant: data.success ? 'default' : 'destructive',
        title: data.success ? 'IMAP Connection Verified' : 'IMAP Test Failed',
        description: data.message,
      });
      await loadSettings();
    } catch (err: any) {
      setTestResultBanner({ type: 'error', text: err.message });
    } finally {
      setTestingImap(false);
    }
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      const res = await fetch('/api/admin/settings/email/activate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Activation failed.');
      toast({
        title: 'Configuration Activated',
        description: `Email configuration v${data.active?.version} is now live.`,
      });
      await loadSettings();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Activation Blocked',
        description: err.message,
      });
    } finally {
      setActivating(false);
    }
  };

  const handleRollback = async () => {
    setRollingBack(true);
    try {
      const res = await fetch('/api/admin/settings/email/rollback', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rollback failed.');
      toast({
        title: 'Rolled Back Configuration',
        description: `Restored active email configuration to v${data.active?.version}.`,
      });
      await loadSettings();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Rollback Failed',
        description: err.message,
      });
    } finally {
      setRollingBack(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateDraft) return;
    setSavingTemplate(true);
    try {
      const res = await fetch('/api/admin/settings/email/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(templateDraft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save template.');
      toast({ title: 'Template Saved', description: `${templateDraft.name} updated.` });
      await loadTemplates();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Template Error', description: err.message });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handlePreviewTemplate = async () => {
    if (!templateDraft) return;
    try {
      const res = await fetch('/api/admin/settings/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview', ...templateDraft }),
      });
      const data = await res.json();
      if (res.ok && data.preview) {
        setTemplatePreview(data.preview);
      }
    } catch {
      // ignore
    }
  };

  const handleRestoreTemplateDefault = async () => {
    if (!templateDraft) return;
    try {
      const res = await fetch('/api/admin/settings/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', emailType: templateDraft.emailType }),
      });
      if (res.ok) {
        toast({ title: 'Default Restored', description: 'Template reset to system default.' });
        await loadTemplates();
      }
    } catch {
      // ignore
    }
  };

  const handleRunWorkerAction = async (action: 'process_queue' | 'poll_imap') => {
    setRunningWorker(true);
    try {
      const res = await fetch('/api/admin/settings/email/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Worker run failed.');
      toast({
        title: action === 'process_queue' ? 'Queue Processed' : 'Inbox Polled',
        description: JSON.stringify(data.result),
      });
      await loadLogs();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: err.message });
    } finally {
      setRunningWorker(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading Email Settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Active Status Bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Settings</h1>
          <p className="text-sm text-muted-foreground">
            Centralized SMTP, IMAP, sender identity, template management, and delivery logs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Draft
          </Button>
          <Button onClick={handleActivate} disabled={activating}>
            {activating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <ShieldCheck className="mr-2 h-4 w-4" />
            Activate Configuration
          </Button>
          {hasRollbackTarget && (
            <Button variant="outline" onClick={handleRollback} disabled={rollingBack}>
              {rollingBack && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <RotateCcw className="mr-2 h-4 w-4" />
              Rollback
            </Button>
          )}
        </div>
      </div>

      {!encryptionKeyConfigured && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Encryption Key Missing or Invalid</AlertTitle>
          <AlertDescription>{encryptionKeyError}</AlertDescription>
        </Alert>
      )}

      {legacyEnvDetected && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Legacy Environment Mail Variables Detected</AlertTitle>
          <AlertDescription>
            Database-backed Email Settings take strict precedence over legacy environment variables
            (`GMAIL_SERVICE_ACCOUNT_KEY`, `SMTP_HOST`). The application never silently falls back to
            legacy transports when outgoing mail is disabled or unconfigured.
          </AlertDescription>
        </Alert>
      )}

      {/* Active vs Draft Status Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Outgoing Mail</CardTitle>
          </CardHeader>
          <CardContent>
            {activeSummary?.smtpEnabled ? (
              <div className="space-y-1">
                <Badge>Active (v{activeSummary.version})</Badge>
                <p className="text-xs text-muted-foreground pt-1">
                  {activeSummary.smtpHost}:{activeSummary.smtpPort} ({activeSummary.smtpSecurity})
                </p>
              </div>
            ) : (
              <Badge variant="secondary">Disabled / Not Activated</Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Incoming Mail (IMAP)</CardTitle>
          </CardHeader>
          <CardContent>
            {activeSummary?.imapEnabled ? (
              <div className="space-y-1">
                <Badge>Enabled</Badge>
                <p className="text-xs text-muted-foreground pt-1">
                  {activeSummary.imapHost}:{activeSummary.imapPort} ({activeSummary.imapFolder})
                </p>
              </div>
            ) : (
              <Badge variant="outline">Optional / Disabled</Badge>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Draft Activation Gate</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              {draftMeta?.smtpTestMatchesCurrentDraft || !form.smtpEnabled ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              <span>
                SMTP: {form.smtpEnabled ? (draftMeta?.smtpTestMatchesCurrentDraft ? 'Verified' : 'Test required') : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {draftMeta?.imapTestMatchesCurrentDraft || !form.imapEnabled ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-600" />
              )}
              <span>
                IMAP: {form.imapEnabled ? (draftMeta?.imapTestMatchesCurrentDraft ? 'Verified' : 'Test required') : 'Disabled'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {testResultBanner && (
        <Alert variant={testResultBanner.type === 'error' ? 'destructive' : 'default'}>
          {testResultBanner.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>{testResultBanner.type === 'success' ? 'Verification Result' : 'Verification Failed'}</AlertTitle>
          <AlertDescription>{testResultBanner.text}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="outgoing" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="outgoing">1. Outgoing Mail</TabsTrigger>
          <TabsTrigger value="incoming">2. Incoming Mail</TabsTrigger>
          <TabsTrigger value="identity">3. Sender Identity</TabsTrigger>
          <TabsTrigger value="templates">4. Templates</TabsTrigger>
          <TabsTrigger value="logs">5. Delivery &amp; Processing Logs</TabsTrigger>
        </TabsList>

        {/* 1. Outgoing Mail (SMTP) */}
        <TabsContent value="outgoing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Outgoing Mail Configuration (SMTP)</CardTitle>
              <CardDescription>
                Configure SMTP client settings for Stalwart or your mail relay. Port 465 commonly
                uses Implicit TLS; Port 587 commonly uses STARTTLS. Entering credentials here does
                not configure DNS (SPF, DKIM, DMARC) or authorize domains in Stalwart.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label className="text-base">Enable Outgoing Email</Label>
                  <p className="text-xs text-muted-foreground">
                    Master switch for all website-generated outgoing messages.
                  </p>
                </div>
                <Switch
                  checked={form.smtpEnabled}
                  onCheckedChange={(v) => setForm({ ...form, smtpEnabled: v })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="smtpHost">SMTP Hostname</Label>
                  <Input
                    id="smtpHost"
                    placeholder="mail.global-hrm.net"
                    value={form.smtpHost}
                    onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    type="number"
                    value={form.smtpPort}
                    onChange={(e) => setForm({ ...form, smtpPort: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpSecurity">Connection Security</Label>
                  <select
                    id="smtpSecurity"
                    value={form.smtpSecurity}
                    onChange={(e) =>
                      setForm({ ...form, smtpSecurity: e.target.value as any })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="starttls">STARTTLS (Recommended for Port 587)</option>
                    <option value="implicit_tls">Implicit TLS / SMTPS (Recommended for Port 465)</option>
                    <option value="none_dev_only">Unencrypted (Local Development Only)</option>
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Production enforces strict TLS certificate validation.
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label>SMTP Authentication</Label>
                    <p className="text-xs text-muted-foreground">
                      Authenticate using username &amp; encrypted password.
                    </p>
                  </div>
                  <Switch
                    checked={form.smtpAuthEnabled}
                    onCheckedChange={(v) => setForm({ ...form, smtpAuthEnabled: v })}
                  />
                </div>
              </div>

              {form.smtpAuthEnabled && (
                <div className="grid gap-4 md:grid-cols-2 rounded-lg border p-4 bg-muted/20">
                  <div className="space-y-2">
                    <Label htmlFor="smtpUsername">SMTP Username</Label>
                    <Input
                      id="smtpUsername"
                      placeholder="noreply@global-hrm.net"
                      value={form.smtpUsername}
                      onChange={(e) => setForm({ ...form, smtpUsername: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="smtpPassword">SMTP Password</Label>
                      {form.hasSmtpPassword && form.smtpPasswordAction === 'keep' && (
                        <Badge variant="secondary">
                          <KeyRound className="mr-1 h-3 w-3" /> Configured
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="smtpPassword"
                        type="password"
                        placeholder={
                          form.hasSmtpPassword && form.smtpPasswordAction === 'keep'
                            ? '•••••••• (unchanged)'
                            : 'Enter new SMTP password'
                        }
                        value={form.smtpPassword}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            smtpPassword: e.target.value,
                            smtpPasswordAction: e.target.value ? 'replace' : 'keep',
                          })
                        }
                      />
                      {form.hasSmtpPassword && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            setForm({
                              ...form,
                              smtpPassword: '',
                              smtpPasswordAction:
                                form.smtpPasswordAction === 'remove' ? 'keep' : 'remove',
                            })
                          }
                        >
                          {form.smtpPasswordAction === 'remove' ? 'Undo Remove' : 'Remove'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="smtpTimeout">Connection Timeout (ms)</Label>
                  <Input
                    id="smtpTimeout"
                    type="number"
                    min={1000}
                    max={60000}
                    value={form.smtpConnectionTimeoutMs}
                    onChange={(e) =>
                      setForm({ ...form, smtpConnectionTimeoutMs: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpRateLimit">Rate Limit (emails/min)</Label>
                  <Input
                    id="smtpRateLimit"
                    type="number"
                    min={1}
                    max={600}
                    value={form.smtpRateLimitPerMinute}
                    onChange={(e) =>
                      setForm({ ...form, smtpRateLimitPerMinute: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpRetries">Max Retry Attempts</Label>
                  <Input
                    id="smtpRetries"
                    type="number"
                    min={0}
                    max={10}
                    value={form.smtpMaxRetries}
                    onChange={(e) =>
                      setForm({ ...form, smtpMaxRetries: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 border-t pt-6 md:flex-row md:items-end md:justify-between">
              <Button variant="outline" onClick={handleTestSmtp} disabled={testingSmtp}>
                {testingSmtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test SMTP Connection (No Email Sent)
              </Button>
              <div className="flex w-full md:w-auto gap-2 items-end">
                <div className="space-y-1 flex-1 md:w-64">
                  <Label htmlFor="testRecipient" className="text-xs">
                    Explicit Test Recipient
                  </Label>
                  <Input
                    id="testRecipient"
                    type="email"
                    placeholder="admin@example.com"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                  />
                </div>
                <Button onClick={handleSendTestEmail} disabled={sendingTest}>
                  {sendingTest ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  Send Test Email
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 2. Incoming Mail (IMAP) */}
        <TabsContent value="incoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Incoming Mail Configuration (IMAP — Optional)</CardTitle>
              <CardDescription>
                Port 993 commonly uses Implicit TLS. Incoming mail is read-only by default (messages
                are never marked read, moved, or deleted). Outgoing mail continues working if IMAP
                is disabled or unavailable.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Label className="text-base">Enable Incoming Email (IMAP)</Label>
                  <p className="text-xs text-muted-foreground">
                    Independently enable read-only inbound message &amp; DSN bounce correlation.
                  </p>
                </div>
                <Switch
                  checked={form.imapEnabled}
                  onCheckedChange={(v) => setForm({ ...form, imapEnabled: v })}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="imapHost">IMAP Hostname</Label>
                  <Input
                    id="imapHost"
                    placeholder="mail.global-hrm.net"
                    value={form.imapHost}
                    onChange={(e) => setForm({ ...form, imapHost: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapPort">IMAP Port</Label>
                  <Input
                    id="imapPort"
                    type="number"
                    value={form.imapPort}
                    onChange={(e) => setForm({ ...form, imapPort: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="imapSecurity">Connection Security</Label>
                  <select
                    id="imapSecurity"
                    value={form.imapSecurity}
                    onChange={(e) => setForm({ ...form, imapSecurity: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="implicit_tls">Implicit TLS / IMAPS (Port 993)</option>
                    <option value="starttls">STARTTLS (Port 143)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapFolder">Mailbox Folder</Label>
                  {discoveredFolders.length > 0 ? (
                    <select
                      id="imapFolder"
                      value={form.imapFolder}
                      onChange={(e) => setForm({ ...form, imapFolder: e.target.value })}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {discoveredFolders.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id="imapFolder"
                      value={form.imapFolder}
                      onChange={(e) => setForm({ ...form, imapFolder: e.target.value })}
                    />
                  )}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 rounded-lg border p-4 bg-muted/20">
                <div className="space-y-2">
                  <Label htmlFor="imapUsername">IMAP Username</Label>
                  <Input
                    id="imapUsername"
                    placeholder="noreply@global-hrm.net"
                    value={form.imapUsername}
                    onChange={(e) => setForm({ ...form, imapUsername: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="imapPassword">IMAP Password</Label>
                    {form.hasImapPassword && form.imapPasswordAction === 'keep' && (
                      <Badge variant="secondary">
                        <KeyRound className="mr-1 h-3 w-3" /> Configured
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      id="imapPassword"
                      type="password"
                      placeholder={
                        form.hasImapPassword && form.imapPasswordAction === 'keep'
                          ? '•••••••• (unchanged)'
                          : 'Enter new IMAP password'
                      }
                      value={form.imapPassword}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          imapPassword: e.target.value,
                          imapPasswordAction: e.target.value ? 'replace' : 'keep',
                        })
                      }
                    />
                    {form.hasImapPassword && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setForm({
                            ...form,
                            imapPassword: '',
                            imapPasswordAction:
                              form.imapPasswordAction === 'remove' ? 'keep' : 'remove',
                          })
                        }
                      >
                        {form.imapPasswordAction === 'remove' ? 'Undo Remove' : 'Remove'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="imapPoll">Polling Interval (sec)</Label>
                  <Input
                    id="imapPoll"
                    type="number"
                    min={30}
                    max={3600}
                    value={form.imapPollingIntervalSec}
                    onChange={(e) =>
                      setForm({ ...form, imapPollingIntervalSec: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapSyncMode">Initial Sync Point</Label>
                  <select
                    id="imapSyncMode"
                    value={form.imapInitialSyncMode}
                    onChange={(e) =>
                      setForm({ ...form, imapInitialSyncMode: e.target.value as any })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="after_activation">Only messages arriving after activation</option>
                    <option value="last_7_days">Bounded import: last 7 days</option>
                    <option value="last_30_days">Bounded import: last 30 days</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="imapRetention">Log Retention (days)</Label>
                  <Input
                    id="imapRetention"
                    type="number"
                    min={1}
                    max={3650}
                    value={form.imapRetentionDays}
                    onChange={(e) =>
                      setForm({ ...form, imapRetentionDays: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button variant="outline" onClick={handleTestImap} disabled={testingImap}>
                {testingImap && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Test IMAP Connection &amp; Discover Folders
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* 3. Sender Identity */}
        <TabsContent value="identity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sender Identity &amp; Routing Defaults</CardTitle>
              <CardDescription>
                Configure central organization branding and approved per-email-type sender overrides.
                Never spoof participant addresses; sender domains must match your Stalwart mailbox
                permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fromDisplayName">Organization / Display Name</Label>
                  <Input
                    id="fromDisplayName"
                    value={form.fromDisplayName}
                    onChange={(e) => setForm({ ...form, fromDisplayName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">Default From Address</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    placeholder="noreply@global-hrm.net"
                    value={form.fromEmail}
                    onChange={(e) => setForm({ ...form, fromEmail: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="replyToEmail">Default Reply-To Address</Label>
                  <Input
                    id="replyToEmail"
                    type="email"
                    placeholder="support@global-hrm.net"
                    value={form.replyToEmail}
                    onChange={(e) => setForm({ ...form, replyToEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support / Contact Address</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    placeholder="support@global-hrm.net"
                    value={form.supportEmail}
                    onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    placeholder="https://global-hrm.net"
                    value={form.websiteUrl}
                    onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="footerText">Default Email Footer Text (Optional Override)</Label>
                <Textarea
                  id="footerText"
                  rows={2}
                  placeholder="Global HRM Network | Research & Executive HR Community"
                  value={form.footerText}
                  onChange={(e) => setForm({ ...form, footerText: e.target.value })}
                />
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-semibold">
                  Optional Sender Overrides by Email Type (Uses Central SMTP Transport)
                </Label>
                <div className="space-y-2">
                  {Object.entries(EMAIL_TYPE_LABELS).map(([typeKey, label]) => {
                    const ov = form.senderOverrides[typeKey] || {};
                    return (
                      <div
                        key={typeKey}
                        className="grid gap-2 md:grid-cols-4 items-center rounded-md border p-2.5 text-xs"
                      >
                        <span className="font-medium">{label}</span>
                        <Input
                          placeholder="Display Name override"
                          value={ov.fromDisplayName || ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              senderOverrides: {
                                ...form.senderOverrides,
                                [typeKey]: { ...ov, fromDisplayName: e.target.value },
                              },
                            })
                          }
                        />
                        <Input
                          placeholder="From Email override"
                          value={ov.fromEmail || ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              senderOverrides: {
                                ...form.senderOverrides,
                                [typeKey]: { ...ov, fromEmail: e.target.value },
                              },
                            })
                          }
                        />
                        <Input
                          placeholder="Reply-To override"
                          value={ov.replyToEmail || ''}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              senderOverrides: {
                                ...form.senderOverrides,
                                [typeKey]: { ...ov, replyToEmail: e.target.value },
                              },
                            })
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Templates */}
        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Edit Email Template</CardTitle>
                <CardDescription>
                  Placeholders are safely escaped. Required verification and opt-out placeholders
                  are enforced on save.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Email Type</Label>
                  <select
                    value={selectedTemplateType}
                    onChange={(e) => {
                      const t = templates.find((item) => item.emailType === e.target.value);
                      setSelectedTemplateType(e.target.value);
                      if (t) {
                        setTemplateDraft(t);
                        setTemplatePreview(t.preview);
                      }
                    }}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {templates.map((t) => (
                      <option key={t.emailType} value={t.emailType}>
                        {t.name} {t.isCustomized ? '(Customized)' : '(Default)'}
                      </option>
                    ))}
                  </select>
                </div>

                {templateDraft && (
                  <>
                    <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
                      <p className="font-semibold">Available Placeholders:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {templateDraft.availablePlaceholders?.map((p: any) => (
                          <Badge
                            key={p.key}
                            variant={
                              templateDraft.requiredPlaceholders?.includes(p.key)
                                ? 'default'
                                : 'secondary'
                            }
                            title={p.description}
                          >
                            {`{{${p.key}}}`}
                            {templateDraft.requiredPlaceholders?.includes(p.key) ? ' *' : ''}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input
                        value={templateDraft.subject}
                        onChange={(e) =>
                          setTemplateDraft({ ...templateDraft, subject: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Heading</Label>
                        <Input
                          value={templateDraft.heading}
                          onChange={(e) =>
                            setTemplateDraft({ ...templateDraft, heading: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>CTA Button Label</Label>
                        <Input
                          value={templateDraft.ctaLabel || ''}
                          onChange={(e) =>
                            setTemplateDraft({ ...templateDraft, ctaLabel: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Body HTML</Label>
                      <Textarea
                        rows={7}
                        className="font-mono text-xs"
                        value={templateDraft.bodyHtml}
                        onChange={(e) =>
                          setTemplateDraft({ ...templateDraft, bodyHtml: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Plain-Text Body</Label>
                      <Textarea
                        rows={5}
                        className="font-mono text-xs"
                        value={templateDraft.bodyText}
                        onChange={(e) =>
                          setTemplateDraft({ ...templateDraft, bodyText: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Template Footer</Label>
                      <Input
                        value={templateDraft.footerText}
                        onChange={(e) =>
                          setTemplateDraft({ ...templateDraft, footerText: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4">
                <Button variant="outline" onClick={handleRestoreTemplateDefault}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Restore Default
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handlePreviewTemplate}>
                    <Eye className="mr-2 h-4 w-4" />
                    Preview
                  </Button>
                  <Button onClick={handleSaveTemplate} disabled={savingTemplate}>
                    {savingTemplate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Template
                  </Button>
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Synthetic Data Preview</CardTitle>
                <CardDescription>
                  Subject: <span className="font-medium text-foreground">{templatePreview?.subject}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {templatePreview && (
                  <>
                    <iframe
                      title="Email Template Preview"
                      sandbox=""
                      srcDoc={templatePreview.html}
                      className="w-full h-[420px] rounded-md border bg-white"
                    />
                    <div className="space-y-1">
                      <Label className="text-xs">Plain-Text Fallback</Label>
                      <pre className="rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
                        {templatePreview.text}
                      </pre>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 5. Delivery & Processing Logs */}
        <TabsContent value="logs" className="space-y-6">
          {/* Outbox Delivery Logs */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" /> Outgoing Delivery &amp; Queue Logs
                  </CardTitle>
                  <CardDescription>
                    “Accepted by SMTP” confirms handoff to your mail server; it does not claim inbox
                    placement. Sensitive verification payloads are redacted after dispatch.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunWorkerAction('process_queue')}
                    disabled={runningWorker}
                  >
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Process Queue Now
                  </Button>
                  <Button variant="outline" size="sm" onClick={loadLogs}>
                    Refresh
                  </Button>
                </div>
              </div>
              <div className="grid gap-2 pt-3 md:grid-cols-5">
                <Input
                  placeholder="Filter recipient..."
                  value={logFilters.recipient}
                  onChange={(e) => setLogFilters({ ...logFilters, recipient: e.target.value })}
                />
                <select
                  value={logFilters.status}
                  onChange={(e) => setLogFilters({ ...logFilters, status: e.target.value })}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="queued">Queued</option>
                  <option value="processing">Processing</option>
                  <option value="accepted_by_smtp">Accepted by SMTP</option>
                  <option value="temporarily_failed">Temporarily Failed</option>
                  <option value="permanently_failed">Permanently Failed</option>
                  <option value="bounced">Bounced</option>
                  <option value="suppressed">Suppressed</option>
                  <option value="delivered">Delivered</option>
                </select>
                <select
                  value={logFilters.emailType}
                  onChange={(e) => setLogFilters({ ...logFilters, emailType: e.target.value })}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Types</option>
                  {Object.entries(EMAIL_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={logFilters.campaignId}
                  onChange={(e) => setLogFilters({ ...logFilters, campaignId: e.target.value })}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="all">All Campaigns</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <Button onClick={loadLogs}>Apply Filters</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts / Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outboxLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No outgoing email records match your filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    outboxLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">{log.emailType}</TableCell>
                        <TableCell className="text-xs">{log.recipientEmail}</TableCell>
                        <TableCell className="text-xs max-w-[220px] truncate">{log.subject}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              log.status === 'accepted_by_smtp' || log.status === 'delivered'
                                ? 'default'
                                : log.status === 'permanently_failed' || log.status === 'bounced'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                          {log.attemptCount}/{log.maxAttempts} — {log.lastError || log.smtpResponse || '—'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Protected Incoming Message Log */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Inbox className="h-5 w-5" /> Incoming Message Log (Read-Only, Sanitized)
                  </CardTitle>
                  <CardDescription>
                    Email headers and bodies are treated as untrusted. Remote images and scripts are
                    blocked; matching From addresses do not grant access or alter consent.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRunWorkerAction('poll_imap')}
                  disabled={runningWorker}
                >
                  <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                  Poll Inbox Now
                </Button>
              </div>
              {imapCursors.length > 0 && (
                <p className="text-xs text-muted-foreground pt-1">
                  Last IMAP poll:{' '}
                  {imapCursors[0].lastPolledAt
                    ? new Date(imapCursors[0].lastPolledAt).toLocaleString()
                    : 'Never'}{' '}
                  | Folder: {imapCursors[0].folder} | Last UID: {imapCursors[0].lastProcessedUid}
                  {imapCursors[0].lastError ? ` | Error: ${imapCursors[0].lastError}` : ''}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Received</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Subject &amp; Preview</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Inspect</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inboundLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        No incoming messages recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    inboundLogs.map((msg) => (
                      <TableRow key={msg.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(msg.receivedAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">{msg.fromAddress || '—'}</TableCell>
                        <TableCell className="text-xs">{msg.toAddress || '—'}</TableCell>
                        <TableCell className="text-xs max-w-[280px]">
                          <div className="font-medium truncate">{msg.subject}</div>
                          <div className="text-muted-foreground truncate">{msg.textPreview}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{msg.processingStatus}</Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedInbound(msg)}
                          >
                            View Safe
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {selectedInbound && (
                <div className="rounded-lg border p-4 bg-muted/20 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <strong>{selectedInbound.subject}</strong>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setSelectedInbound(null)}
                    >
                      Close
                    </Button>
                  </div>
                  <p>
                    <strong>From:</strong> {selectedInbound.fromAddress} | <strong>Message-ID:</strong>{' '}
                    {selectedInbound.messageId || 'N/A'} | <strong>In-Reply-To:</strong>{' '}
                    {selectedInbound.inReplyTo || 'N/A'}
                  </p>
                  {selectedInbound.attachmentMetadataJson && (
                    <p>
                      <strong>Attachments (metadata only, not downloaded):</strong>{' '}
                      {selectedInbound.attachmentMetadataJson}
                    </p>
                  )}
                  <div className="rounded border bg-white p-3 text-slate-900">
                    {selectedInbound.sanitizedHtml ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: selectedInbound.sanitizedHtml }}
                      />
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans">
                        {selectedInbound.textPreview}
                      </pre>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Config Audit Log */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration &amp; Credential Audit Log</CardTitle>
              <CardDescription>
                Tracks configuration changes and credential updates without storing secret values.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(a.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs">{a.actorEmail || 'System'}</TableCell>
                      <TableCell className="text-xs font-mono">{a.action}</TableCell>
                      <TableCell className="text-xs">{a.summary}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
