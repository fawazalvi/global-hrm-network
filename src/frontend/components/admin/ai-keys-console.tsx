'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/frontend/components/ui/badge';
import { Button } from '@/frontend/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/frontend/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/frontend/components/ui/dialog';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/frontend/components/ui/select';
import { Switch } from '@/frontend/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/frontend/components/ui/table';
import { useToast } from '@/frontend/hooks/use-toast';

type ProviderId = 'groq' | 'openai' | 'anthropic' | 'gemini' | 'custom';

interface ProviderMeta {
  id: ProviderId;
  name: string;
  defaultBaseUrl: string;
  defaultModel: string;
  keyPrefixHint: string;
  suggestedModels: string[];
}

interface RedactedAiApiKey {
  id: string;
  provider: string;
  label: string;
  keyPreview: string;
  defaultModel: string | null;
  baseUrl: string | null;
  isActive: boolean;
  isDefault: boolean;
  lastTestedAt: string | null;
  lastTestStatus: string | null;
  lastTestMessage: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AuditLogItem {
  id: string;
  provider: string;
  label: string;
  actorEmail: string | null;
  action: string;
  summary: string;
  createdAt: string;
}

function formatDateTime(value: string | null): string {
  if (!value) return 'Never';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export default function AiKeysConsole() {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [keys, setKeys] = useState<RedactedAiApiKey[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [providers, setProviders] = useState<ProviderMeta[]>([]);
  const [encryptionConfigured, setEncryptionConfigured] = useState(true);
  const [encryptionError, setEncryptionError] = useState<string | null>(null);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [testedModels, setTestedModels] = useState<{ label: string; models: string[] } | null>(null);

  // Add / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<RedactedAiApiKey | null>(null);
  const [saving, setSaving] = useState(false);

  const [provider, setProvider] = useState<ProviderId>('groq');
  const [label, setLabel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [defaultModel, setDefaultModel] = useState('llama-3.3-70b-versatile');
  const [baseUrl, setBaseUrl] = useState('https://api.groq.com/openai/v1');
  const [isActive, setIsActive] = useState(true);
  const [isDefault, setIsDefault] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/ai-keys', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load AI API keys');
      }
      setKeys(data.keys || []);
      setAuditLogs(data.auditLogs || []);
      setProviders(data.providers || []);
      setEncryptionConfigured(Boolean(data.encryptionKeyConfigured));
      setEncryptionError(data.encryptionKeyError || null);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to load AI API keys',
        description: err instanceof Error ? err.message : 'Unexpected error',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currentProviderMeta = useMemo(() => {
    return providers.find((p) => p.id === provider) || providers[0];
  }, [providers, provider]);

  const openCreateModal = () => {
    const groqMeta = providers.find((p) => p.id === 'groq');
    setEditingKey(null);
    setProvider('groq');
    setLabel('Groq Production Key');
    setApiKey('');
    setShowApiKey(false);
    setDefaultModel(groqMeta?.defaultModel || 'llama-3.3-70b-versatile');
    setBaseUrl(groqMeta?.defaultBaseUrl || 'https://api.groq.com/openai/v1');
    setIsActive(true);
    setIsDefault(keys.filter((k) => k.provider === 'groq').length === 0);
    setModalOpen(true);
  };

  const openEditModal = (item: RedactedAiApiKey) => {
    setEditingKey(item);
    setProvider((item.provider as ProviderId) || 'groq');
    setLabel(item.label);
    setApiKey('');
    setShowApiKey(false);
    setDefaultModel(item.defaultModel || '');
    setBaseUrl(item.baseUrl || '');
    setIsActive(item.isActive);
    setIsDefault(item.isDefault);
    setModalOpen(true);
  };

  const handleProviderChange = (next: ProviderId) => {
    setProvider(next);
    const meta = providers.find((p) => p.id === next);
    if (meta && !editingKey) {
      setBaseUrl(meta.defaultBaseUrl);
      setDefaultModel(meta.defaultModel);
      if (!label || label.endsWith('Production Key')) {
        setLabel(`${meta.name} Production Key`);
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingKey && !apiKey.trim()) {
      toast({
        variant: 'destructive',
        title: 'API Key required',
        description: 'Paste your Groq (or provider) API key before saving.',
      });
      return;
    }

    setSaving(true);
    try {
      const url = editingKey
        ? `/api/admin/settings/ai-keys/${editingKey.id}`
        : '/api/admin/settings/ai-keys';
      const method = editingKey ? 'PATCH' : 'POST';

      const payload: Record<string, unknown> = {
        label: label.trim(),
        defaultModel: defaultModel.trim() || null,
        baseUrl: baseUrl.trim() || null,
        isActive,
        isDefault,
      };

      if (!editingKey) {
        payload.provider = provider;
        payload.apiKey = apiKey.trim();
      } else if (apiKey.trim()) {
        payload.apiKey = apiKey.trim();
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save API key');
      }

      toast({
        title: editingKey ? 'API Key updated' : 'API Key saved securely',
        description: editingKey
          ? `Updated "${label.trim()}".`
          : `Encrypted and saved "${label.trim()}".`,
      });
      setModalOpen(false);
      await loadData();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: err instanceof Error ? err.message : 'Unable to save API key',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (item: RedactedAiApiKey) => {
    setTestingId(item.id);
    try {
      const res = await fetch(`/api/admin/settings/ai-keys/${item.id}/test`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Test failed');
      }

      if (data.ok) {
        toast({
          title: 'Connection verified',
          description: `${item.label}: ${data.message}`,
        });
        if (Array.isArray(data.models) && data.models.length > 0) {
          setTestedModels({ label: item.label, models: data.models });
        }
      } else {
        toast({
          variant: 'destructive',
          title: 'Connection test failed',
          description: data.message || 'Check your API key and Base URL.',
        });
      }

      await loadData();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Test failed',
        description: err instanceof Error ? err.message : 'Unable to test connection',
      });
    } finally {
      setTestingId(null);
    }
  };

  const handleSetDefault = async (item: RedactedAiApiKey) => {
    try {
      const res = await fetch(`/api/admin/settings/ai-keys/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true, isDefault: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to set default');
      toast({
        title: 'Default key updated',
        description: `"${item.label}" is now the active default for ${item.provider}.`,
      });
      await loadData();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update default key',
      });
    }
  };

  const handleToggleActive = async (item: RedactedAiApiKey, next: boolean) => {
    try {
      const res = await fetch(`/api/admin/settings/ai-keys/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle key');
      await loadData();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Could not update key status',
      });
    }
  };

  const handleDelete = async (item: RedactedAiApiKey) => {
    if (!window.confirm(`Delete API key "${item.label}" (${item.keyPreview})? This cannot be undone.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/settings/ai-keys/${item.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete key');
      toast({
        title: 'API Key deleted',
        description: `Removed "${item.label}".`,
      });
      await loadData();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Delete failed',
        description: err instanceof Error ? err.message : 'Could not delete API key',
      });
    }
  };

  const groqActiveCount = keys.filter((k) => k.provider === 'groq' && k.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            AI &amp; API Key Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Store, encrypt, test, and rotate Groq and AI provider API keys used by Global HRM Network.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadData()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openCreateModal} disabled={!encryptionConfigured}>
            <Plus className="h-4 w-4 mr-2" />
            Add API Key
          </Button>
        </div>
      </div>

      {/* Encryption status banner */}
      {!encryptionConfigured ? (
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <ShieldAlert className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-semibold text-destructive">Encryption key not configured</p>
              <p className="text-muted-foreground mt-1">
                {encryptionError ||
                  'Set EMAIL_CONFIG_ENCRYPTION_KEY (32-byte hex or base64) in your environment variables before saving API keys.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between py-4">
            <div className="flex items-center gap-2.5 text-sm">
              <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>
                <strong>AES-256-GCM encryption active.</strong> Keys are encrypted at rest in PostgreSQL and never exposed back to the browser.
              </span>
            </div>
            <Badge variant="outline" className="w-fit border-emerald-300 text-emerald-700 bg-white">
              {groqActiveCount} Active Groq {groqActiveCount === 1 ? 'Key' : 'Keys'}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Saved Keys Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Saved API Keys</CardTitle>
          <CardDescription>
            Manage keys per provider. Mark one key as <strong>Default</strong> so server-side AI features automatically pick it up.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Loading API keys...
            </div>
          ) : keys.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
              <h3 className="font-semibold">No AI API keys saved yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Add your Groq API key (<code className="text-xs bg-muted px-1 py-0.5 rounded">gsk_...</code>) to connect AI features across the platform.
              </p>
              <Button className="mt-4" onClick={openCreateModal} disabled={!encryptionConfigured}>
                <Plus className="h-4 w-4 mr-2" />
                Add Groq API Key
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider &amp; Label</TableHead>
                    <TableHead>Key Preview</TableHead>
                    <TableHead>Default Model</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Test</TableHead>
                    <TableHead>Last Used</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keys.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.label}</span>
                            {item.isDefault && (
                              <Badge className="bg-primary/10 text-primary hover:bg-primary/15 border-primary/20" variant="outline">
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="uppercase text-[10px]">
                              {item.provider}
                            </Badge>
                            {item.baseUrl && <span className="truncate max-w-[220px]">{item.baseUrl}</span>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {item.keyPreview}
                        </code>
                      </TableCell>
                      <TableCell className="text-sm">
                        {item.defaultModel || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={item.isActive}
                            onCheckedChange={(checked) => void handleToggleActive(item, checked)}
                            aria-label={`Toggle ${item.label} active`}
                          />
                          <span className="text-xs text-muted-foreground">
                            {item.isActive ? 'Active' : 'Disabled'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.lastTestStatus === 'ok' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Connected
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate max-w-[180px]" title={item.lastTestMessage || ''}>
                              {item.lastTestMessage}
                            </span>
                          </div>
                        ) : item.lastTestStatus === 'error' ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive">
                              <XCircle className="h-3.5 w-3.5" />
                              Failed
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate max-w-[180px]" title={item.lastTestMessage || ''}>
                              {item.lastTestMessage}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not tested</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(item.lastUsedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => void handleTest(item)}
                            disabled={testingId === item.id}
                          >
                            {testingId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Activity className="h-3.5 w-3.5 mr-1" />
                            )}
                            Test
                          </Button>
                          {!item.isDefault && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleSetDefault(item)}
                              title="Set as default for this provider"
                            >
                              <Star className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(item)}
                            title="Edit or rotate key"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => void handleDelete(item)}
                            title="Delete key"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Discovered models from last test */}
      {testedModels && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Available Models on &ldquo;{testedModels.label}&rdquo;
            </CardTitle>
            <CardDescription>
              Live model list returned by the provider during your connection test.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {testedModels.models.map((m) => (
              <Badge key={m} variant="secondary" className="font-mono text-xs">
                {m}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Backend Integration & Audit Log */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Server-Side Usage</CardTitle>
            <CardDescription>
              Backend routes can fetch the active decrypted key without hardcoding secrets in `.env`.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto font-mono">
{`import { getActiveAiKeyForProvider } from '@/backend/ai/keys';

const groq = await getActiveAiKeyForProvider('groq');
// groq => { apiKey, baseUrl, defaultModel }`}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Key Activity</CardTitle>
            <CardDescription>Audit trail of key additions, rotations, tests, and deletions.</CardDescription>
          </CardHeader>
          <CardContent>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {auditLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="text-xs border-b pb-2 last:border-b-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{log.summary}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {log.action}
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mt-0.5">
                      {log.actorEmail || 'Admin'} • {formatDateTime(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingKey ? `Edit / Rotate "${editingKey.label}"` : 'Add AI API Key'}
            </DialogTitle>
            <DialogDescription>
              {editingKey
                ? 'Update settings or paste a new key to rotate the encrypted secret.'
                : 'Your API key is encrypted with AES-256-GCM before being stored in PostgreSQL.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ai-provider">Provider</Label>
                <Select
                  value={provider}
                  onValueChange={(v) => handleProviderChange(v as ProviderId)}
                  disabled={Boolean(editingKey)}
                >
                  <SelectTrigger id="ai-provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ai-label">Label</Label>
                <Input
                  id="ai-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Groq Production Key"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-secret">
                {editingKey ? 'New API Key (leave blank to keep current)' : 'API Key'}
              </Label>
              <div className="relative">
                <Input
                  id="ai-secret"
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={
                    editingKey
                      ? `Current: ${editingKey.keyPreview}`
                      : currentProviderMeta?.keyPrefixHint || 'gsk_...'
                  }
                  className="pr-10 font-mono"
                  required={!editingKey}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowApiKey((prev) => !prev)}
                  aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-model">Default Model</Label>
              <Input
                id="ai-model"
                value={defaultModel}
                onChange={(e) => setDefaultModel(e.target.value)}
                placeholder="llama-3.3-70b-versatile"
              />
              {currentProviderMeta && currentProviderMeta.suggestedModels.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {currentProviderMeta.suggestedModels.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDefaultModel(m)}
                      className="text-[11px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 font-mono text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {m}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="ai-base-url">API Base URL</Label>
              <Input
                id="ai-base-url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.groq.com/openai/v1"
              />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="ai-active" className="cursor-pointer">
                  Active
                </Label>
                <p className="text-xs text-muted-foreground">Allow the app to use this key.</p>
              </div>
              <Switch id="ai-active" checked={isActive} onCheckedChange={setIsActive} />
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="ai-default" className="cursor-pointer">
                  Set as Default for {currentProviderMeta?.name || provider}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Used automatically when connecting AI features.
                </p>
              </div>
              <Switch
                id="ai-default"
                checked={isDefault}
                onCheckedChange={setIsDefault}
                disabled={!isActive}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editingKey ? 'Save Changes' : 'Encrypt & Save Key'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
