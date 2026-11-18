'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Clock,
  KeyRound,
  Loader2,
  Send,
  Sparkles,
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
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/frontend/components/ui/select';
import { Textarea } from '@/frontend/components/ui/textarea';
import { useToast } from '@/frontend/hooks/use-toast';

interface SavedKeyOption {
  id: string;
  provider: string;
  label: string;
  keyPreview: string;
  defaultModel: string | null;
  isActive: boolean;
  isDefault: boolean;
}

interface ChatTestResult {
  ok: boolean;
  reply: string;
  model: string;
  usage: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
  latencyMs: number;
  keyLabel: string;
  keyPreview: string;
  finishReason: string | null;
}

const PRESET_PROMPTS = [
  'Hello Groq! Confirm we are communicating properly and reply with one short sentence.',
  'List 3 practical HR best practices for onboarding senior banking executives.',
  'Draft a 2-sentence professional invitation welcoming HR leaders to a banking compensation survey.',
];

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'deepseek-r1-distill-llama-70b',
  'qwen-qwq-32b',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
];

export default function TestAiConsole() {
  const { toast } = useToast();

  const [loadingKeys, setLoadingKeys] = useState(true);
  const [keys, setKeys] = useState<SavedKeyOption[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState('auto');
  const [model, setModel] = useState('llama-3.3-70b-versatile');
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a concise, helpful AI assistant for Global HRM Network.'
  );
  const [prompt, setPrompt] = useState(PRESET_PROMPTS[0]);
  const [temperature, setTemperature] = useState('0.3');

  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ChatTestResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadKeys = useCallback(async () => {
    setLoadingKeys(true);
    try {
      const res = await fetch('/api/admin/settings/ai-keys', { cache: 'no-store' });
      const data = await res.json();
      if (res.ok && Array.isArray(data.keys)) {
        const groqKeys = (data.keys as SavedKeyOption[]).filter(
          (k) => k.provider === 'groq' || k.provider === 'custom'
        );
        setKeys(groqKeys);
        const def = groqKeys.find((k) => k.isDefault && k.isActive) || groqKeys.find((k) => k.isActive);
        if (def?.defaultModel) {
          setModel(def.defaultModel);
        }
      }
    } catch {
      // Non-fatal
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const activeDefaultKey = useMemo(
    () => keys.find((k) => k.provider === 'groq' && k.isDefault && k.isActive) || keys.find((k) => k.provider === 'groq' && k.isActive),
    [keys]
  );

  const handleRunTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setSending(true);
    setErrorMessage(null);
    setResult(null);

    try {
      const res = await fetch('/api/admin/settings/ai-keys/chat-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keyId: selectedKeyId,
          model: model.trim(),
          systemPrompt: systemPrompt.trim() || undefined,
          prompt: prompt.trim(),
          temperature: Number(temperature) || 0.3,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Groq test request failed');
      }

      setResult(data);
      toast({
        title: 'Groq responded successfully',
        description: `Model ${data.model} replied in ${data.latencyMs} ms.`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to reach Groq API';
      setErrorMessage(msg);
      toast({
        variant: 'destructive',
        title: 'Groq communication failed',
        description: msg,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Test Groq AI Connection
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Send a live prompt through your encrypted Groq API key to verify end-to-end AI communication.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/admin/settings/ai-keys">
            <KeyRound className="h-4 w-4 mr-2" />
            Manage API Keys
          </Link>
        </Button>
      </div>

      {/* Key Status Card */}
      {!loadingKeys && !activeDefaultKey && keys.length === 0 && (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-4">
            <div className="flex items-start gap-2.5 text-sm">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-900">No Groq API key saved in database yet</p>
                <p className="text-amber-800/90 text-xs mt-0.5">
                  Save a Groq key in AI &amp; API Keys (or set <code className="bg-white/70 px-1 rounded">GROQ_API_KEY</code>) before running a test.
                </p>
              </div>
            </div>
            <Button size="sm" asChild>
              <Link href="/admin/settings/ai-keys">Add Groq Key</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Prompt Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Send Test Prompt</CardTitle>
            <CardDescription>
              Uses <code className="text-xs bg-muted px-1 py-0.5 rounded">/chat/completions</code> with your stored Groq key.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRunTest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="test-key">API Key</Label>
                <Select value={selectedKeyId} onValueChange={setSelectedKeyId}>
                  <SelectTrigger id="test-key">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">
                      {activeDefaultKey
                        ? `Active Default: ${activeDefaultKey.label} (${activeDefaultKey.keyPreview})`
                        : 'Active Default Groq Key (or Env Fallback)'}
                    </SelectItem>
                    {keys.map((k) => (
                      <SelectItem key={k.id} value={k.id} disabled={!k.isActive}>
                        {k.label} ({k.keyPreview}){!k.isActive ? ' — Disabled' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="test-model">Model</Label>
                  <Input
                    id="test-model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="llama-3.3-70b-versatile"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test-temp">Temperature</Label>
                  <Input
                    id="test-temp"
                    type="number"
                    step="0.1"
                    min="0"
                    max="2"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {GROQ_MODELS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className={`text-[11px] px-2 py-0.5 rounded font-mono transition-colors ${
                      model === m
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <Label htmlFor="test-system">System Prompt (optional)</Label>
                <Input
                  id="test-system"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="test-prompt">User Prompt</Label>
                  <span className="text-[11px] text-muted-foreground">Presets:</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pb-1">
                  {PRESET_PROMPTS.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(p)}
                      className="text-[11px] px-2 py-0.5 rounded bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground"
                    >
                      Preset {idx + 1}
                    </button>
                  ))}
                </div>
                <Textarea
                  id="test-prompt"
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a prompt to test Groq..."
                  required
                />
              </div>

              <Button type="submit" disabled={sending} className="w-full sm:w-auto">
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Communicating with Groq...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Prompt
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Response Panel */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Groq Response
            </CardTitle>
            <CardDescription>
              Live output, latency, and token usage from Groq.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4">
            {sending ? (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mb-2 text-primary" />
                <p className="text-sm">Waiting for Groq response...</p>
              </div>
            ) : errorMessage ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertCircle className="h-4 w-4" />
                  Communication Error
                </div>
                <p className="text-xs break-words">{errorMessage}</p>
              </div>
            ) : result ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200" variant="outline">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Success
                  </Badge>
                  <Badge variant="secondary" className="font-mono text-xs">
                    {result.model}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {result.latencyMs} ms
                  </Badge>
                  <Badge variant="outline" className="text-xs font-mono">
                    {result.keyLabel} ({result.keyPreview})
                  </Badge>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 text-sm whitespace-pre-wrap leading-relaxed">
                  {result.reply || <span className="text-muted-foreground">(Empty response)</span>}
                </div>

                {result.usage && (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-md border p-2">
                      <div className="text-[11px] text-muted-foreground">Prompt Tokens</div>
                      <div className="font-semibold text-sm">{result.usage.prompt_tokens ?? '—'}</div>
                    </div>
                    <div className="rounded-md border p-2">
                      <div className="text-[11px] text-muted-foreground">Completion Tokens</div>
                      <div className="font-semibold text-sm">{result.usage.completion_tokens ?? '—'}</div>
                    </div>
                    <div className="rounded-md border p-2">
                      <div className="text-[11px] text-muted-foreground">Total Tokens</div>
                      <div className="font-semibold text-sm">{result.usage.total_tokens ?? '—'}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                <Bot className="h-8 w-8 mb-2 opacity-60" />
                <p className="text-sm font-medium">Ready to test</p>
                <p className="text-xs mt-1 max-w-xs">
                  Click <strong>Send Test Prompt</strong> to verify your Groq API key and inspect the response.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
