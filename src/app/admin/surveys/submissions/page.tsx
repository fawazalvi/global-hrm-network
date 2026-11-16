'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList,
  Loader2,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/frontend/components/ui/card';
import { Input } from '@/frontend/components/ui/input';
import { Button } from '@/frontend/components/ui/button';
import { Badge } from '@/frontend/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/frontend/components/ui/table';
import { useToast } from '@/frontend/hooks/use-toast';

export default function SurveySubmissionsAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [campaignTitle, setCampaignTitle] = useState('Pakistan Banking Expertise Map');
  const [total, setTotal] = useState(0);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');
  const [selected, setSelected] = useState<any>(null);

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/surveys/pakistan-banking-map/submissions?limit=100&offset=0');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load survey submissions.');
      setCampaignTitle(data.campaign?.title || 'Pakistan Banking Expertise Map');
      setTotal(data.total || 0);
      setSubmissions(data.submissions || []);
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error Loading Submissions',
        description: err.message,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return submissions.filter((s) => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      if (!q) return true;
      const inst = s.institution?.name || s.otherInstitutionName || '';
      return (
        (s.preferredName || '').toLowerCase().includes(q) ||
        (s.officialEmail || '').toLowerCase().includes(q) ||
        inst.toLowerCase().includes(q) ||
        (s.designation || '').toLowerCase().includes(q)
      );
    });
  }, [submissions, searchQuery, statusFilter]);

  const verifiedCount = submissions.filter((s) => s.status === 'verified').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Filled Survey Submissions
          </h1>
          <p className="text-sm text-muted-foreground">
            {campaignTitle} &mdash; Total: <strong>{total}</strong> ({verifiedCount} verified)
          </p>
        </div>
        <Button variant="outline" onClick={loadSubmissions} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions</CardTitle>
          <CardDescription>
            View participant responses, verification status, ranked expertise, and consent records.
          </CardDescription>
          <div className="flex flex-col gap-2 pt-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, bank, or designation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending Verification</option>
            </select>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading submissions...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Institution &amp; Role</TableHead>
                  <TableHead>Top Expertise</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No survey submissions found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">
                        <div className="font-semibold">{s.preferredName}</div>
                        <div className="text-muted-foreground">{s.officialEmail}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-medium">
                          {s.institution?.name || s.otherInstitutionName || '—'}
                        </div>
                        <div className="text-muted-foreground">
                          {s.designation}
                          {s.organizationalGrade ? ` (${s.organizationalGrade})` : ''}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-wrap gap-1">
                          {(s.rankedExpertise || []).map((r: any) => (
                            <Badge key={r.id} variant="outline" className="text-[11px]">
                              #{r.rank} {r.category?.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={s.status === 'verified' ? 'default' : 'secondary'}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(s.submittedAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" onClick={() => setSelected(s)}>
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}

          {selected && (
            <div className="rounded-lg border p-4 bg-muted/20 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <strong className="text-sm">
                  {selected.preferredName} ({selected.officialEmail})
                </strong>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>
                  Close
                </Button>
              </div>
              <p>
                <strong>Institution:</strong>{' '}
                {selected.institution?.name || selected.otherInstitutionName || '—'} |{' '}
                <strong>City:</strong> {selected.city || selected.otherCityName || '—'} |{' '}
                <strong>Experience:</strong> {selected.yearsOfExperience} years
              </p>
              {selected.experienceOverview && (
                <p>
                  <strong>Experience Overview:</strong> {selected.experienceOverview}
                </p>
              )}
              {selected.otherExpertiseText && (
                <p>
                  <strong>Other Expertise:</strong> {selected.otherExpertiseText}
                </p>
              )}
              <p>
                <strong>Interests:</strong>{' '}
                {(selected.interests || []).map((i: any) => i.interest?.label).join(', ') || 'None'}
              </p>
              <p>
                <strong>Consents:</strong>{' '}
                {(selected.consentRecords || [])
                  .map((c: any) => `${c.consentType}: ${c.granted ? 'Yes' : 'No'}`)
                  .join(' | ')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
