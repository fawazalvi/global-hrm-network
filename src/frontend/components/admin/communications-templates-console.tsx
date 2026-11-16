'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Eye,
  History,
  Loader2,
  Mail,
  Monitor,
  Palette,
  RotateCcw,
  Search,
  Send,
  Smartphone,
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
import { Badge } from '@/frontend/components/ui/badge';
import { Textarea } from '@/frontend/components/ui/textarea';
import { useToast } from '@/frontend/hooks/use-toast';

export default function CommunicationsTemplatesConsole() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<any[]>([]);
  const [variables, setVariables] = useState<Array<{ key: string; description: string }>>([]);
  const [selectedType, setSelectedType] = useState<string>('pakistan_launch_invitation');
  const [draft, setDraft] = useState<any>(null);
  const [preview, setPreview] = useState<{ subject: string; html: string; text: string } | null>(null);
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [searchQuery, setSearchQuery] = useState('');
  const [classificationFilter, setClassificationFilter] = useState<'all' | 'transactional' | 'community'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft'>('all');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  // Email Theme state
  const [themeDraft, setThemeDraft] = useState<any>(null);
  const [savingTheme, setSavingTheme] = useState(false);

  const loadAll = async (preserveType?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/email/templates');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load templates.');
      setTemplates(data.templates || []);
      setVariables(data.allowlistedVariables || []);
      if (data.theme?.draft) setThemeDraft(data.theme.draft);

      const targetType = preserveType || selectedType;
      const found =
        (data.templates || []).find((t: any) => t.emailType === targetType) ||
        data.templates?.[0];
      if (found) {
        setSelectedType(found.emailType);
        setDraft(found);
        setPreview(found.preview);
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error loading templates',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return templates.filter((t) => {
      if (classificationFilter !== 'all' && t.classification !== classificationFilter) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.emailType.toLowerCase().includes(q)
      );
    });
  }, [templates, searchQuery, classificationFilter, statusFilter]);

  const handleSelectTemplate = (t: any) => {
    setSelectedType(t.emailType);
    setDraft({ ...t });
    setPreview(t.preview);
  };

  const handleRefreshPreview = async (customDraft?: any) => {
    const target = customDraft || draft;
    if (!target) return;
    try {
      const res = await fetch('/api/admin/settings/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'preview',
          ...target,
          theme: themeDraft || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.preview) setPreview(data.preview);
    } catch {
      // ignore
    }
  };

  const handleSaveDraft = async (): Promise<boolean> => {
    if (!draft) return false;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/email/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save draft.');
      toast({ title: 'Template Draft Saved', description: `${draft.name} saved as draft.` });
      await loadAll(draft.emailType);
      return true;
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handlePublishTemplate = async () => {
    if (!draft) return;
    const saved = await handleSaveDraft();
    if (!saved) return;
    setPublishing(true);
    try {
      const res = await fetch('/api/admin/settings/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish', emailType: draft.emailType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish template.');
      toast({
        title: 'Template Published',
        description: `${draft.name} v${data.template?.version} is now published.`,
      });
      await loadAll(draft.emailType);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Publish Failed', description: err.message });
    } finally {
      setPublishing(false);
    }
  };

  const handleRollbackVersion = async (versionId: string) => {
    if (!draft) return;
    try {
      const res = await fetch('/api/admin/settings/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rollback', emailType: draft.emailType, versionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rollback failed.');
      toast({ title: 'Template Rolled Back', description: 'Restored selected version.' });
      await loadAll(draft.emailType);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Rollback Failed', description: err.message });
    }
  };

  const handleRestoreDefault = async () => {
    if (!draft) return;
    try {
      const res = await fetch('/api/admin/settings/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restore', emailType: draft.emailType }),
      });
      if (!res.ok) throw new Error('Restore failed.');
      toast({ title: 'Restored Default', description: `${draft.name} reset to system default.` });
      await loadAll(draft.emailType);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Restore Failed', description: err.message });
    }
  };

  const handleSendTest = async () => {
    if (!testRecipient.trim() || !draft) {
      toast({ variant: 'destructive', title: 'Enter an explicit recipient email.' });
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch('/api/admin/settings/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send_test',
          emailType: draft.emailType,
          recipientEmail: testRecipient.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || data.message || 'Test send failed.');
      toast({ title: 'Test Email Accepted by SMTP', description: data.message });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Test Send Failed', description: err.message });
    } finally {
      setSendingTest(false);
    }
  };

  const handleThemeAction = async (action: 'save_theme' | 'publish_theme') => {
    if (!themeDraft) return;
    setSavingTheme(true);
    try {
      const res = await fetch('/api/admin/settings/email/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          theme: {
            logoPath: themeDraft.logoUrl,
            bannerPath: themeDraft.bannerUrl,
            primaryColor: themeDraft.primaryColor,
            deepBlueColor: themeDraft.deepBlueColor,
            orangeAccent: themeDraft.orangeAccent,
            greenAccent: themeDraft.greenAccent,
            paleBgColor: themeDraft.paleBgColor,
            bodyTextColor: themeDraft.bodyTextColor,
            secondaryTextColor: themeDraft.secondaryTextColor,
            surfaceColor: themeDraft.surfaceColor,
            senderDisplayName: themeDraft.senderDisplayName,
            supportEmail: themeDraft.supportEmail || '',
            websiteUrl: themeDraft.websiteUrl,
            tagline: themeDraft.tagline,
            footerTagline: themeDraft.footerTagline,
            socialLinks: themeDraft.socialLinks || [],
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Theme update failed.');
      toast({
        title: action === 'publish_theme' ? 'Email Theme Published' : 'Theme Draft Saved',
        description: 'Branded email palette and header/footer defaults updated.',
      });
      await loadAll();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Theme Error', description: err.message });
    } finally {
      setSavingTheme(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading Communications Templates...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[#D9E6F2] bg-gradient-to-r from-[#EFF6FC] via-white to-[#FFF7ED] p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0868B5]">
              <Sparkles className="h-3.5 w-3.5 text-[#F58220]" />
              Global HRM Network Communications
            </div>
            <h1 className="text-2xl font-bold text-[#123B70] mt-1">
              Email Templates &amp; Brand Theme
            </h1>
            <p className="text-sm text-[#5C6B7A]">
              Manage branded Outlook-compatible HTML &amp; plain-text templates, versioning, and
              shared visual identity. Sending uses published templates via your central SMTP queue.
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href="/admin/settings/email">
              <Mail className="mr-2 h-4 w-4" />
              SMTP / Outbox Settings
            </a>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="library" className="space-y-4">
        <TabsList>
          <TabsTrigger value="library">1. Template Library ({templates.length})</TabsTrigger>
          <TabsTrigger value="editor">2. Editor &amp; Live Preview</TabsTrigger>
          <TabsTrigger value="theme">3. Shared Brand Theme</TabsTrigger>
        </TabsList>

        {/* 1. Template Library Cards */}
        <TabsContent value="library" className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates by name or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={classificationFilter}
              onChange={(e) => setClassificationFilter(e.target.value as any)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Classifications</option>
              <option value="transactional">Transactional</option>
              <option value="community">Community / Research</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredTemplates.map((t) => (
              <Card
                key={t.emailType}
                className={`flex flex-col justify-between border ${
                  selectedType === t.emailType ? 'border-[#0868B5] ring-1 ring-[#0868B5]/30' : ''
                }`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={t.classification === 'transactional' ? 'secondary' : 'default'}>
                      {t.classification}
                    </Badge>
                    <Badge variant={t.status === 'published' ? 'default' : 'outline'}>
                      {t.status} · v{t.version}
                    </Badge>
                  </div>
                  <CardTitle className="text-base text-[#123B70] pt-2">{t.name}</CardTitle>
                  <CardDescription className="text-xs">{t.description}</CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="rounded-md border bg-[#EFF6FC] p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-[#5C6B7A]">
                      <span>Variant: {t.variant}</span>
                      <span>
                        {t.updatedAt ? new Date(t.updatedAt).toLocaleDateString() : 'System default'}
                      </span>
                    </div>
                    <p className="font-medium text-[#263445] truncate">
                      Subject: {t.subject}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between border-t pt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSelectTemplate(t)}
                  >
                    <Eye className="mr-1.5 h-3.5 w-3.5" />
                    Select &amp; Preview
                  </Button>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {t.emailType}
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 2. Structured Editor & Responsive Preview */}
        <TabsContent value="editor" className="space-y-4">
          {draft && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{draft.name}</CardTitle>
                      <CardDescription>
                        Status: <strong>{draft.status}</strong> (v{draft.version}) &middot;{' '}
                        {draft.classification}
                      </CardDescription>
                    </div>
                    <select
                      value={draft.emailType}
                      onChange={(e) => {
                        const found = templates.find((t) => t.emailType === e.target.value);
                        if (found) handleSelectTemplate(found);
                      }}
                      className="flex h-9 rounded-md border border-input bg-background px-2 text-xs"
                    >
                      {templates.map((t) => (
                        <option key={t.emailType} value={t.emailType}>
                          {t.name} ({t.status})
                        </option>
                      ))}
                    </select>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-md border bg-[#EFF6FC] p-3 text-xs space-y-1.5">
                    <p className="font-semibold text-[#123B70]">
                      Allowlisted Variables (* = required for this template):
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {variables.map((v) => {
                        const req = draft.requiredPlaceholders?.includes(v.key);
                        return (
                          <Badge
                            key={v.key}
                            variant={req ? 'default' : 'outline'}
                            className="text-[11px]"
                            title={v.description}
                          >
                            {`{{${v.key}}}`}
                            {req ? ' *' : ''}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Subject Line</Label>
                      <Input
                        value={draft.subject}
                        onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Inbox Preheader</Label>
                      <Input
                        value={draft.preheader || ''}
                        onChange={(e) => setDraft({ ...draft, preheader: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Category / Eyebrow</Label>
                      <Input
                        value={draft.eyebrow || ''}
                        onChange={(e) => setDraft({ ...draft, eyebrow: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Banner Selection</Label>
                      <select
                        value={draft.bannerKey || ''}
                        onChange={(e) =>
                          setDraft({ ...draft, bannerKey: e.target.value || null })
                        }
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      >
                        <option value="">No banner (compact)</option>
                        <option value="community_globe">
                          Community Globe Banner (640x260)
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Headline</Label>
                      <Input
                        value={draft.heading}
                        onChange={(e) => setDraft({ ...draft, heading: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Greeting</Label>
                      <Input
                        value={draft.greeting || 'Hello {{preferred_name}},'}
                        onChange={(e) => setDraft({ ...draft, greeting: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Main Body (Safe HTML paragraphs &amp; links)</Label>
                    <Textarea
                      rows={6}
                      className="font-mono text-xs"
                      value={draft.bodyHtml}
                      onChange={(e) => setDraft({ ...draft, bodyHtml: e.target.value })}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Info Panel Title (Optional)</Label>
                      <Input
                        value={draft.infoPanelTitle || ''}
                        onChange={(e) => setDraft({ ...draft, infoPanelTitle: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Info Panel Text (Optional)</Label>
                      <Input
                        value={draft.infoPanelBody || ''}
                        onChange={(e) => setDraft({ ...draft, infoPanelBody: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>CTA Button Label</Label>
                      <Input
                        value={draft.ctaLabel || ''}
                        onChange={(e) => setDraft({ ...draft, ctaLabel: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>CTA Destination URL / Variable</Label>
                      <Input
                        value={draft.ctaUrlTemplate || ''}
                        onChange={(e) => setDraft({ ...draft, ctaUrlTemplate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Plain-Text Body</Label>
                    <Textarea
                      rows={4}
                      className="font-mono text-xs"
                      value={draft.bodyText}
                      onChange={(e) => setDraft({ ...draft, bodyText: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Footer Note</Label>
                    <Input
                      value={draft.footerText}
                      onChange={(e) => setDraft({ ...draft, footerText: e.target.value })}
                    />
                  </div>

                  {draft.versions?.length > 0 && (
                    <div className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <History className="h-3.5 w-3.5" />
                        Published Version History (Rollback)
                      </div>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {draft.versions.map((v: any) => (
                          <div
                            key={v.id}
                            className="flex items-center justify-between text-xs border-b pb-1"
                          >
                            <span>
                              v{v.version} — {v.changedByEmail || 'admin'} (
                              {new Date(v.createdAt).toLocaleString()})
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 text-xs"
                              onClick={() => handleRollbackVersion(v.id)}
                            >
                              Restore
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-wrap justify-between gap-2 border-t pt-4">
                  <Button variant="outline" onClick={handleRestoreDefault}>
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Restore Default
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => handleRefreshPreview()}>
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
                      {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      Save Draft
                    </Button>
                    <Button onClick={handlePublishTemplate} disabled={publishing}>
                      {publishing && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      Publish
                    </Button>
                  </div>
                </CardFooter>
              </Card>

              {/* Live Preview + Test Send */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Synthetic Preview</CardTitle>
                        <CardDescription>
                          Subject: <strong>{preview?.subject}</strong>
                        </CardDescription>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant={previewViewport === 'desktop' ? 'default' : 'outline'}
                          onClick={() => setPreviewViewport('desktop')}
                        >
                          <Monitor className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={previewViewport === 'mobile' ? 'default' : 'outline'}
                          onClick={() => setPreviewViewport('mobile')}
                        >
                          <Smartphone className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {preview && (
                      <>
                        <div className="flex justify-center rounded-lg border bg-slate-100 p-3">
                          <iframe
                            title="Branded Email Preview"
                            sandbox=""
                            srcDoc={preview.html}
                            style={{
                              width: previewViewport === 'mobile' ? '375px' : '100%',
                              height: '520px',
                            }}
                            className="rounded border bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Plain-Text Alternative</Label>
                          <pre className="rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap max-h-48 overflow-y-auto">
                            {preview.text}
                          </pre>
                        </div>
                      </>
                    )}
                  </CardContent>
                  <CardFooter className="border-t pt-4">
                    <div className="flex w-full gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs">Send Test Email (Explicit Recipient)</Label>
                        <Input
                          type="email"
                          placeholder="admin@example.com"
                          value={testRecipient}
                          onChange={(e) => setTestRecipient(e.target.value)}
                        />
                      </div>
                      <Button onClick={handleSendTest} disabled={sendingTest}>
                        {sendingTest ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-1.5 h-4 w-4" />
                        )}
                        Send Test
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* 3. Shared Email Theme Configuration */}
        <TabsContent value="theme" className="space-y-4">
          {themeDraft && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-[#0868B5]" />
                  Shared Email Brand Theme
                </CardTitle>
                <CardDescription>
                  Controls the canonical logo, colors (with WCAG contrast enforcement), header, and
                  footer across all Global HRM Network templates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Logo Asset Path</Label>
                    <Input
                      value={themeDraft.logoUrl}
                      onChange={(e) => setThemeDraft({ ...themeDraft, logoUrl: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Community Banner Asset Path</Label>
                    <Input
                      value={themeDraft.bannerUrl || ''}
                      onChange={(e) => setThemeDraft({ ...themeDraft, bannerUrl: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  {[
                    ['primaryColor', 'Primary Blue'],
                    ['deepBlueColor', 'Deep Blue'],
                    ['orangeAccent', 'Orange Accent'],
                    ['greenAccent', 'Green Accent'],
                    ['paleBgColor', 'Pale Sky Background'],
                    ['bodyTextColor', 'Body Text'],
                    ['secondaryTextColor', 'Secondary Text'],
                    ['surfaceColor', 'Card Surface'],
                  ].map(([field, label]) => (
                    <div key={field} className="space-y-1.5">
                      <Label className="text-xs">{label}</Label>
                      <div className="flex gap-2">
                        <input
                          type="color"
                          value={themeDraft[field]}
                          onChange={(e) =>
                            setThemeDraft({ ...themeDraft, [field]: e.target.value })
                          }
                          className="h-10 w-10 rounded border p-1"
                        />
                        <Input
                          value={themeDraft[field]}
                          onChange={(e) =>
                            setThemeDraft({ ...themeDraft, [field]: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Sender Display Name</Label>
                    <Input
                      value={themeDraft.senderDisplayName}
                      onChange={(e) =>
                        setThemeDraft({ ...themeDraft, senderDisplayName: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Support Email</Label>
                    <Input
                      value={themeDraft.supportEmail || ''}
                      onChange={(e) =>
                        setThemeDraft({ ...themeDraft, supportEmail: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Website URL</Label>
                    <Input
                      value={themeDraft.websiteUrl}
                      onChange={(e) =>
                        setThemeDraft({ ...themeDraft, websiteUrl: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Brand Tagline</Label>
                    <Input
                      value={themeDraft.tagline}
                      onChange={(e) => setThemeDraft({ ...themeDraft, tagline: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Footer Tagline</Label>
                    <Input
                      value={themeDraft.footerTagline}
                      onChange={(e) =>
                        setThemeDraft({ ...themeDraft, footerTagline: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleThemeAction('save_theme')}
                  disabled={savingTheme}
                >
                  Save Theme Draft
                </Button>
                <Button
                  onClick={() => handleThemeAction('publish_theme')}
                  disabled={savingTheme}
                >
                  {savingTheme && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Publish Theme
                </Button>
              </CardFooter>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
