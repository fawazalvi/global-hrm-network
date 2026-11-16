'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Loader2,
  MailPlus,
  RefreshCw,
  Send,
  Users,
} from 'lucide-react';
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
import { Textarea } from '@/frontend/components/ui/textarea';
import { Badge } from '@/frontend/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/frontend/components/ui/table';
import { useToast } from '@/frontend/hooks/use-toast';

export default function SendSurveyInviteAdminPage() {
  const { toast } = useToast();
  const [templateType, setTemplateType] = useState<'pakistan_launch_invitation' | 'survey_invitation'>(
    'pakistan_launch_invitation'
  );
  const [mode, setMode] = useState<'single' | 'bulk'>('single');

  // Single lead state
  const [singleName, setSingleName] = useState('');
  const [singleEmail, setSingleEmail] = useState('');
  const [singleInstitution, setSingleInstitution] = useState('');

  // Bulk leads state (one per line: email or "Name <email>" or "email, Name")
  const [bulkText, setBulkText] = useState('');

  const [sending, setSending] = useState(false);
  const [dispatchResults, setDispatchResults] = useState<any[]>([]);
  const [recentInvites, setRecentInvites] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/admin/surveys/pakistan-banking-map/invite');
      const data = await res.json();
      if (res.ok) {
        setRecentInvites(data.recentInvites || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const parseBulkContacts = () => {
    const lines = bulkText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    return lines.map((line) => {
      // Match "Name <email@domain>"
      const angleMatch = /^(.+?)\s*<([^>]+)>$/.exec(line);
      if (angleMatch) {
        return { name: angleMatch[1].trim(), email: angleMatch[2].trim(), institution: '' };
      }
      // Match "email, Name" or "email, Name, Institution"
      if (line.includes(',')) {
        const [first, second, third] = line.split(',').map((p) => p.trim());
        if (first.includes('@')) {
          return { email: first, name: second || '', institution: third || '' };
        }
        return { name: first, email: second || '', institution: third || '' };
      }
      return { email: line, name: '', institution: '' };
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const contacts =
      mode === 'single'
        ? [
            {
              email: singleEmail.trim(),
              name: singleName.trim(),
              institution: singleInstitution.trim(),
            },
          ]
        : parseBulkContacts();

    if (contacts.length === 0 || !contacts[0]?.email) {
      toast({
        variant: 'destructive',
        title: 'Recipient Required',
        description: 'Enter at least one valid email contact.',
      });
      return;
    }

    setSending(true);
    setDispatchResults([]);
    try {
      const res = await fetch('/api/admin/surveys/pakistan-banking-map/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateType, contacts }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send survey invitations.');

      setDispatchResults(data.results || []);
      const acceptedCount = (data.results || []).filter((r: any) => r.success).length;
      toast({
        title: 'Invitation Dispatch Completed',
        description: `${acceptedCount} of ${data.results?.length || 0} invitation(s) accepted by SMTP.`,
      });

      if (mode === 'single' && acceptedCount > 0) {
        setSingleName('');
        setSingleEmail('');
        setSingleInstitution('');
      }
      await loadHistory();
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Send Failed',
        description: err.message,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <MailPlus className="h-6 w-6 text-primary" />
          Send Survey Invitation (Email Lead)
        </h1>
        <p className="text-sm text-muted-foreground">
          Send personalized Pakistan Banking Expertise Map invitations to email leads using your
          centralized SMTP configuration, branded templates, and suppression safeguards.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSend}>
          <CardHeader>
            <CardTitle>Compose Lead Invitation</CardTitle>
            <CardDescription>
              Each contact receives an individual personalized email (recipients are never exposed via
              To/CC). Suppressed addresses and already-verified participants are automatically skipped.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="templateType">Email Template</Label>
              <select
                id="templateType"
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value as any)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="pakistan_launch_invitation">
                  Pakistan Launch Campaign Invitation (Branded Poster Banner)
                </option>
                <option value="survey_invitation">
                  Standard Survey Invitation
                </option>
              </select>
            </div>

            <Tabs value={mode} onValueChange={(v) => setMode(v as 'single' | 'bulk')}>
              <TabsList>
                <TabsTrigger value="single">Single Email Lead</TabsTrigger>
                <TabsTrigger value="bulk">
                  <Users className="mr-1.5 h-3.5 w-3.5" />
                  Multiple Leads (Up to 50)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="space-y-4 pt-3">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="singleEmail">Official / Lead Email *</Label>
                    <Input
                      id="singleEmail"
                      type="email"
                      placeholder="name@bank.com.pk"
                      value={singleEmail}
                      onChange={(e) => setSingleEmail(e.target.value)}
                      required={mode === 'single'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="singleName">Preferred Name (Optional)</Label>
                    <Input
                      id="singleName"
                      placeholder="e.g., Fawaz Alvi"
                      value={singleName}
                      onChange={(e) => setSingleName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="singleInstitution">Institution (Optional)</Label>
                    <Input
                      id="singleInstitution"
                      placeholder="e.g., Habib Bank Limited"
                      value={singleInstitution}
                      onChange={(e) => setSingleInstitution(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="bulk" className="space-y-3 pt-3">
                <Label htmlFor="bulkText">
                  Paste One Contact Per Line (max 50)
                </Label>
                <Textarea
                  id="bulkText"
                  rows={6}
                  placeholder={`fawaz@bank.com.pk\nhina@bank.com.pk, Hina Saqib\nAli Khan <ali.khan@bank.com.pk>`}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Accepted formats per line: <code>email</code>, <code>email, Name</code>, or{' '}
                  <code>Name &lt;email&gt;</code>.
                </p>
              </TabsContent>
            </Tabs>

            {dispatchResults.length > 0 && (
              <div className="rounded-lg border p-3 bg-muted/20 space-y-2">
                <p className="text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  Dispatch Results
                </p>
                <div className="space-y-1 text-xs">
                  {dispatchResults.map((r, idx) => (
                    <div key={`${r.email}-${idx}`} className="flex items-center justify-between gap-2 border-b pb-1">
                      <span className="font-medium">{r.email}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={r.success ? 'default' : 'secondary'}>{r.status}</Badge>
                        <span className="text-muted-foreground max-w-xs truncate">{r.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button type="submit" disabled={sending}>
              {sending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              {sending ? 'Sending...' : 'Send Survey Invitation'}
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Survey Lead Invitations</CardTitle>
              <CardDescription>
                Logged in the centralized Email Outbox.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={loadHistory} disabled={loadingHistory}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sent / Queued</TableHead>
                <TableHead>Recipient</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No lead invitations sent yet.
                  </TableCell>
                </TableRow>
              ) : (
                recentInvites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(inv.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{inv.recipientEmail}</div>
                      {inv.recipientName && (
                        <div className="text-muted-foreground">{inv.recipientName}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">{inv.emailType}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          inv.status === 'accepted_by_smtp' || inv.status === 'delivered'
                            ? 'default'
                            : inv.status === 'permanently_failed' || inv.status === 'bounced'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[260px] truncate">
                      {inv.lastError || inv.smtpResponse || '—'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
