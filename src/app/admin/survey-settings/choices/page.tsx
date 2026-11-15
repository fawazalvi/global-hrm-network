'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Download,
  Edit3,
  GitMerge,
  History,
  Inbox,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { Badge } from '@/frontend/components/ui/badge';
import { Button } from '@/frontend/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/frontend/components/ui/card';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { useToast } from '@/frontend/hooks/use-toast';

type TabKey =
  | 'institutions'
  | 'categories'
  | 'expertise'
  | 'interests'
  | 'cities'
  | 'proposals'
  | 'csv'
  | 'audit';

interface InstitutionCategoryItem {
  id: string;
  code: string;
  name: string;
  shortLabel: string;
  description: string | null;
  displayOrder: number;
  isCommercialBank: boolean;
  isActive: boolean;
  campaignEnabled: boolean;
  _count: { institutions: number };
}

interface InstitutionItem {
  id: string;
  code: string | null;
  name: string;
  shortCode: string | null;
  categoryId: string | null;
  operatingStatus: string;
  statusNote: string | null;
  isSelectable: boolean;
  isHistorical: boolean;
  isActive: boolean;
  sourceUrl: string | null;
  category: { id: string; code: string; name: string; shortLabel: string } | null;
  successorInstitution: { id: string; name: string; shortCode: string | null } | null;
  aliases: Array<{ id: string; alias: string; aliasType: string }>;
  _count: { submissions: number; participants: number; predecessors: number };
}

interface ExpertiseItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  isOtherOption: boolean;
  campaignEnabled: boolean;
  _count: { rankedSelections: number };
}

interface InterestItem {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  campaignEnabled: boolean;
  _count: { submissions: number };
}

interface CityItem {
  id: string;
  code: string;
  label: string;
  aliases: string | null;
  displayOrder: number;
  isActive: boolean;
  isOtherOption: boolean;
  campaignEnabled: boolean;
  _count: { citySubmissions: number; cityParticipants: number };
}

interface ProposalItem {
  id: string;
  proposalType: string;
  submittedText: string;
  status: string;
  reviewNotes: string | null;
  createdAt: string;
  submission: {
    id: string;
    preferredName: string;
    officialEmail: string;
    institutionNameRaw: string;
    status: string;
    submittedAt: string;
  };
}

interface AuditLogItem {
  id: string;
  adminEmail: string;
  entityType: string;
  entityId: string;
  action: string;
  changeClassification: string;
  beforeValue: string | null;
  afterValue: string | null;
  notes: string | null;
  createdAt: string;
}

interface ChoiceManagementPayload {
  campaign: { id: string; slug: string; title: string; status: string };
  institutionCategories: InstitutionCategoryItem[];
  institutions: InstitutionItem[];
  expertiseCategories: ExpertiseItem[];
  engagementInterests: InterestItem[];
  cities: CityItem[];
  proposals: ProposalItem[];
  auditLogs: AuditLogItem[];
}

interface CsvPreviewResult {
  entityType: string;
  totalRows: number;
  creates: number;
  updates: number;
  errors: number;
  rows: Array<{
    rowNumber: number;
    key: string;
    label: string;
    action: 'create' | 'update' | 'error';
    error?: string;
  }>;
}

export default function AdminSurveyChoiceManagementPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>('institutions');
  const [data, setData] = useState<ChoiceManagementPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filters for institutions
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'historical'>('all');

  // Create / Edit Institution Form
  const [editingInstId, setEditingInstId] = useState<string | null>(null);
  const [instForm, setInstForm] = useState({
    name: '',
    shortCode: '',
    categoryId: '',
    operatingStatus: 'active',
    statusNote: '',
    aliases: '',
    isSelectable: true,
    isHistorical: false,
  });

  // Merge Tool
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [mergePreview, setMergePreview] = useState<{
    source: { id: string; name: string };
    target: { id: string; name: string };
    submissionsToReassign: number;
    participantsToReassign: number;
    aliasesToTransfer: number;
  } | null>(null);

  // Simple Add forms for other tabs
  const [newCategory, setNewCategory] = useState({ name: '', shortLabel: '', description: '' });
  const [newExpertise, setNewExpertise] = useState({ name: '', description: '' });
  const [newInterest, setNewInterest] = useState({ label: '', description: '' });
  const [newCity, setNewCity] = useState({ label: '', aliases: '' });

  // Proposal resolution state
  const [proposalTargets, setProposalTargets] = useState<Record<string, string>>({});

  // CSV Import/Export state
  const [csvEntityType, setCsvEntityType] = useState<'institution' | 'expertise_category' | 'engagement_interest' | 'city'>('institution');
  const [csvText, setCsvText] = useState('');
  const [csvPreview, setCsvPreview] = useState<CsvPreviewResult | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/survey-settings/choices', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to load choice management data');
      setData(json);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Load failed',
        description: err instanceof Error ? err.message : 'Unable to load choices',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredInstitutions = useMemo(() => {
    if (!data) return [];
    const q = searchQuery.trim().toLowerCase();
    return data.institutions.filter((inst) => {
      if (filterCategoryId !== 'all' && inst.categoryId !== filterCategoryId) return false;
      if (filterStatus === 'active' && (!inst.isActive || inst.isHistorical)) return false;
      if (filterStatus === 'inactive' && inst.isActive) return false;
      if (filterStatus === 'historical' && !inst.isHistorical) return false;
      if (!q) return true;
      return (
        inst.name.toLowerCase().includes(q) ||
        (inst.shortCode && inst.shortCode.toLowerCase().includes(q)) ||
        (inst.code && inst.code.toLowerCase().includes(q)) ||
        inst.aliases.some((a) => a.alias.toLowerCase().includes(q))
      );
    });
  }, [data, searchQuery, filterCategoryId, filterStatus]);

  const pendingProposalsCount = useMemo(
    () => (data?.proposals ?? []).filter((p) => p.status === 'pending').length,
    [data]
  );

  async function apiAction(
    method: 'POST' | 'PATCH' | 'DELETE',
    url: string,
    body?: Record<string, unknown>
  ) {
    setIsSaving(true);
    try {
      const res = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Request failed');
      await loadData();
      return json;
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Action failed',
        description: err instanceof Error ? err.message : 'Unexpected error',
      });
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveInstitution(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      ...instForm,
      categoryId: instForm.categoryId || data?.institutionCategories[0]?.id || '',
    };

    const res = editingInstId
      ? await apiAction('PATCH', '/api/admin/survey-settings/choices', {
          entityType: 'institution',
          id: editingInstId,
          data: payload,
        })
      : await apiAction('POST', '/api/admin/survey-settings/choices', {
          entityType: 'institution',
          data: payload,
        });

    if (res) {
      toast({
        title: editingInstId ? 'Institution updated' : 'Institution added',
        description: `${instForm.name} saved to directory.`,
      });
      setEditingInstId(null);
      setInstForm({
        name: '',
        shortCode: '',
        categoryId: '',
        operatingStatus: 'active',
        statusNote: '',
        aliases: '',
        isSelectable: true,
        isHistorical: false,
      });
    }
  }

  function startEditInstitution(inst: InstitutionItem) {
    setEditingInstId(inst.id);
    setInstForm({
      name: inst.name,
      shortCode: inst.shortCode || '',
      categoryId: inst.categoryId || '',
      operatingStatus: inst.operatingStatus,
      statusNote: inst.statusNote || '',
      aliases: inst.aliases.map((a) => a.alias).join(', '),
      isSelectable: inst.isSelectable,
      isHistorical: inst.isHistorical,
    });
  }

  async function handleReorder(
    entityType: 'institution_category' | 'expertise_category' | 'engagement_interest' | 'city',
    ids: string[],
    index: number,
    direction: -1 | 1
  ) {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= ids.length) return;
    const next = [...ids];
    [next[index], next[targetIdx]] = [next[targetIdx], next[index]];
    await apiAction('PATCH', '/api/admin/survey-settings/choices', {
      action: 'reorder',
      entityType,
      orderedIds: next,
    });
  }

  async function handleMergePreview() {
    if (!mergeSourceId || !mergeTargetId) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/survey-settings/choices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'merge_institutions',
          sourceInstitutionId: mergeSourceId,
          targetInstitutionId: mergeTargetId,
          previewOnly: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Preview failed');
      setMergePreview(json.summary);
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'Merge preview failed',
        description: err instanceof Error ? err.message : 'Error',
      });
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMergeExecute() {
    if (!mergeSourceId || !mergeTargetId) return;
    const res = await apiAction('POST', '/api/admin/survey-settings/choices', {
      action: 'merge_institutions',
      sourceInstitutionId: mergeSourceId,
      targetInstitutionId: mergeTargetId,
      previewOnly: false,
    });
    if (res) {
      toast({ title: 'Institutions merged', description: 'Responses reassigned and alias added.' });
      setMergePreview(null);
      setMergeSourceId('');
      setMergeTargetId('');
    }
  }

  async function handleCsvPreview(mode: 'preview' | 'apply') {
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/survey-settings/choices/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType: csvEntityType, csvText, mode }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'CSV import failed');
      if (mode === 'preview') {
        setCsvPreview(json);
      } else {
        toast({
          title: 'CSV import applied',
          description: `${json.result.creates} created, ${json.result.updates} updated.`,
        });
        setCsvPreview(null);
        setCsvText('');
        await loadData();
      }
    } catch (err: unknown) {
      toast({
        variant: 'destructive',
        title: 'CSV error',
        description: err instanceof Error ? err.message : 'Failed to parse CSV',
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading Survey Choice Management...</span>
      </div>
    );
  }

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: 'institutions', label: 'Institutions', count: data?.institutions.length },
    { key: 'categories', label: 'Institution Categories', count: data?.institutionCategories.length },
    { key: 'expertise', label: 'Expertise Areas', count: data?.expertiseCategories.length },
    { key: 'interests', label: 'Engagement Interests', count: data?.engagementInterests.length },
    { key: 'cities', label: 'Cities', count: data?.cities.length },
    { key: 'proposals', label: '"Other" Proposals', count: pendingProposalsCount },
    { key: 'csv', label: 'CSV Import / Export' },
    { key: 'audit', label: 'Audit Log', count: data?.auditLogs.length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Survey Settings — Choice Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage database-backed dropdowns, institution directory, aliases, campaign availability, and
            “Other” proposals without code changes.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading || isSaving}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {typeof tab.count === 'number' && (
              <Badge variant={activeTab === tab.key ? 'secondary' : 'outline'} className="ml-2">
                {tab.count}
              </Badge>
            )}
          </Button>
        ))}
      </div>

      {/* 1. INSTITUTIONS TAB */}
      {activeTab === 'institutions' && data && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {editingInstId ? 'Edit Institution' : 'Add New Institution'}
              </CardTitle>
              <CardDescription>
                Keep official names canonical and add abbreviations or former names as searchable aliases.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveInstitution} className="grid gap-4 md:grid-cols-3">
                <div className="space-y-1.5">
                  <Label>Canonical Institution Name *</Label>
                  <Input
                    required
                    value={instForm.name}
                    onChange={(e) => setInstForm((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g., Habib Bank Limited"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Short Code</Label>
                  <Input
                    value={instForm.shortCode}
                    onChange={(e) => setInstForm((p) => ({ ...p, shortCode: e.target.value }))}
                    placeholder="e.g., HBL"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Category *</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={instForm.categoryId}
                    onChange={(e) => setInstForm((p) => ({ ...p, categoryId: e.target.value }))}
                  >
                    <option value="">Select category...</option>
                    {data.institutionCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Operating Status</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={instForm.operatingStatus}
                    onChange={(e) => setInstForm((p) => ({ ...p, operatingStatus: e.target.value }))}
                  >
                    <option value="active">Active</option>
                    <option value="restricted_pilot">Restricted licence / pilot operations</option>
                    <option value="in_principle_prelaunch">In-principle approval / pre-launch</option>
                    <option value="merged">Merged</option>
                    <option value="liquidated_cancelled">Liquidated / licence cancelled</option>
                    <option value="other_placeholder">Other placeholder</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Aliases / Former Names (comma-separated)</Label>
                  <Input
                    value={instForm.aliases}
                    onChange={(e) => setInstForm((p) => ({ ...p, aliases: e.target.value }))}
                    placeholder="e.g., HBL, Summit Bank Limited"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Status Note (optional)</Label>
                  <Input
                    value={instForm.statusNote}
                    onChange={(e) => setInstForm((p) => ({ ...p, statusNote: e.target.value }))}
                    placeholder="e.g., Merged into United Bank Limited"
                  />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={instForm.isSelectable}
                      onChange={(e) => setInstForm((p) => ({ ...p, isSelectable: e.target.checked }))}
                    />
                    Selectable
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={instForm.isHistorical}
                      onChange={(e) => setInstForm((p) => ({ ...p, isHistorical: e.target.checked }))}
                    />
                    Historical
                  </label>
                </div>
                <div className="flex gap-2 md:col-span-3">
                  <Button type="submit" disabled={isSaving}>
                    <Plus className="mr-2 h-4 w-4" />
                    {editingInstId ? 'Save Changes' : 'Add Institution'}
                  </Button>
                  {editingInstId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingInstId(null);
                        setInstForm({
                          name: '',
                          shortCode: '',
                          categoryId: '',
                          operatingStatus: 'active',
                          statusNote: '',
                          aliases: '',
                          isSelectable: true,
                          isHistorical: false,
                        });
                      }}
                    >
                      Cancel Edit
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Merge / Reclassify Tool */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <GitMerge className="h-4 w-4" />
                Merge / Reclassify Institution
              </CardTitle>
              <CardDescription>
                Safely reassign responses from a duplicate or merged institution to a canonical target
                while preserving participants’ original declared text (`institutionNameRaw`).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <select
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={mergeSourceId}
                  onChange={(e) => {
                    setMergeSourceId(e.target.value);
                    setMergePreview(null);
                  }}
                >
                  <option value="">Source institution (to deactivate)...</option>
                  {data.institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i._count.submissions} subs)
                    </option>
                  ))}
                </select>
                <select
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={mergeTargetId}
                  onChange={(e) => {
                    setMergeTargetId(e.target.value);
                    setMergePreview(null);
                  }}
                >
                  <option value="">Target canonical institution...</option>
                  {data.institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  onClick={handleMergePreview}
                  disabled={!mergeSourceId || !mergeTargetId || isSaving}
                >
                  Preview Merge Impact
                </Button>
              </div>
              {mergePreview && (
                <div className="rounded-md border bg-muted/40 p-4 text-sm space-y-2">
                  <p>
                    Merging <strong>{mergePreview.source.name}</strong> into{' '}
                    <strong>{mergePreview.target.name}</strong>:
                  </p>
                  <ul className="list-disc pl-5 text-muted-foreground">
                    <li>Submissions to reassign: {mergePreview.submissionsToReassign}</li>
                    <li>Participants to reassign: {mergePreview.participantsToReassign}</li>
                    <li>Aliases to transfer: {mergePreview.aliasesToTransfer}</li>
                    <li>Original declared employer text (`institutionNameRaw`) remains untouched.</li>
                  </ul>
                  <Button variant="destructive" size="sm" onClick={handleMergeExecute} disabled={isSaving}>
                    Confirm & Execute Merge
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Directory Table */}
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <CardTitle className="text-lg">Institution Directory ({filteredInstitutions.length})</CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      className="pl-8 w-56"
                      placeholder="Search name, code, alias..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={filterCategoryId}
                    onChange={(e) => setFilterCategoryId(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {data.institutionCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                    value={filterStatus}
                    onChange={(e) =>
                      setFilterStatus(e.target.value as 'all' | 'active' | 'inactive' | 'historical')
                    }
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Deactivated</option>
                    <option value="historical">Historical / Merged</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-3">Institution</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3">Aliases</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Responses</th>
                    <th className="py-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInstitutions.map((inst) => (
                    <tr key={inst.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-3">
                        <div className="font-medium">
                          {inst.name}{' '}
                          {inst.shortCode && (
                            <span className="text-xs text-muted-foreground">({inst.shortCode})</span>
                          )}
                        </div>
                        {inst.statusNote && (
                          <div className="text-xs text-muted-foreground">{inst.statusNote}</div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge variant="outline">{inst.category?.shortLabel || 'Uncategorized'}</Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground max-w-xs">
                        {inst.aliases.map((a) => a.alias).join(', ') || '—'}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant={inst.isActive ? 'default' : 'secondary'}>
                            {inst.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {inst.operatingStatus !== 'active' && (
                            <Badge variant="outline">{inst.operatingStatus}</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        {inst._count.submissions} subs / {inst._count.participants} part.
                      </td>
                      <td className="py-2.5 text-right space-x-1 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditInstitution(inst)}
                          title="Edit"
                        >
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isSaving}
                          onClick={() =>
                            apiAction('PATCH', '/api/admin/survey-settings/choices', {
                              action: 'toggle_active',
                              entityType: 'institution',
                              id: inst.id,
                              isActive: !inst.isActive,
                            })
                          }
                        >
                          {inst.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={isSaving}
                          onClick={() =>
                            apiAction(
                              'DELETE',
                              `/api/admin/survey-settings/choices?entityType=institution&id=${inst.id}`
                            )
                          }
                          title="Delete (only if unused)"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 2. INSTITUTION CATEGORIES TAB */}
      {activeTab === 'categories' && data && (
        <Card>
          <CardHeader>
            <CardTitle>Institution Categories</CardTitle>
            <CardDescription>
              Control category grouping order, active status, and campaign visibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-wrap gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await apiAction('POST', '/api/admin/survey-settings/choices', {
                  entityType: 'institution_category',
                  data: newCategory,
                });
                if (res) setNewCategory({ name: '', shortLabel: '', description: '' });
              }}
            >
              <Input
                required
                className="w-60"
                placeholder="Category name"
                value={newCategory.name}
                onChange={(e) => setNewCategory((p) => ({ ...p, name: e.target.value }))}
              />
              <Input
                className="w-44"
                placeholder="Short badge label"
                value={newCategory.shortLabel}
                onChange={(e) => setNewCategory((p) => ({ ...p, shortLabel: e.target.value }))}
              />
              <Button type="submit" disabled={isSaving}>
                <Plus className="mr-1 h-4 w-4" /> Add Category
              </Button>
            </form>

            <div className="divide-y rounded-md border">
              {data.institutionCategories.map((cat, idx) => (
                <div key={cat.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <div className="font-medium">
                      {cat.displayOrder}. {cat.name}{' '}
                      <Badge variant="outline" className="ml-1">
                        {cat.shortLabel}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Code: {cat.code} • {cat._count.institutions} institutions
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === 0 || isSaving}
                      onClick={() =>
                        handleReorder(
                          'institution_category',
                          data.institutionCategories.map((c) => c.id),
                          idx,
                          -1
                        )
                      }
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === data.institutionCategories.length - 1 || isSaving}
                      onClick={() =>
                        handleReorder(
                          'institution_category',
                          data.institutionCategories.map((c) => c.id),
                          idx,
                          1
                        )
                      }
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={cat.campaignEnabled ? 'default' : 'outline'}
                      disabled={isSaving}
                      onClick={() =>
                        apiAction('PATCH', '/api/admin/survey-settings/choices', {
                          action: 'toggle_campaign',
                          entityType: 'institution_category',
                          id: cat.id,
                          isEnabled: !cat.campaignEnabled,
                        })
                      }
                    >
                      {cat.campaignEnabled ? 'Campaign: Shown' : 'Campaign: Hidden'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSaving}
                      onClick={() =>
                        apiAction('PATCH', '/api/admin/survey-settings/choices', {
                          action: 'toggle_active',
                          entityType: 'institution_category',
                          id: cat.id,
                          isActive: !cat.isActive,
                        })
                      }
                    >
                      {cat.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. EXPERTISE AREAS TAB */}
      {activeTab === 'expertise' && data && (
        <Card>
          <CardHeader>
            <CardTitle>Ranked Expertise Categories</CardTitle>
            <CardDescription>
              Add, reorder, deactivate, or toggle campaign availability for expertise options.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-wrap gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await apiAction('POST', '/api/admin/survey-settings/choices', {
                  entityType: 'expertise_category',
                  data: newExpertise,
                });
                if (res) setNewExpertise({ name: '', description: '' });
              }}
            >
              <Input
                required
                className="w-64"
                placeholder="New expertise category name"
                value={newExpertise.name}
                onChange={(e) => setNewExpertise((p) => ({ ...p, name: e.target.value }))}
              />
              <Input
                className="w-72"
                placeholder="Optional description"
                value={newExpertise.description}
                onChange={(e) => setNewExpertise((p) => ({ ...p, description: e.target.value }))}
              />
              <Button type="submit" disabled={isSaving}>
                <Plus className="mr-1 h-4 w-4" /> Add Expertise
              </Button>
            </form>

            <div className="divide-y rounded-md border">
              {data.expertiseCategories.map((exp, idx) => (
                <div key={exp.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <div className="font-medium">
                      {exp.displayOrder}. {exp.name}
                      {exp.isOtherOption && (
                        <Badge variant="secondary" className="ml-2">
                          Other option
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Slug: {exp.slug} • {exp._count.rankedSelections} selections
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === 0 || isSaving}
                      onClick={() =>
                        handleReorder(
                          'expertise_category',
                          data.expertiseCategories.map((e) => e.id),
                          idx,
                          -1
                        )
                      }
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === data.expertiseCategories.length - 1 || isSaving}
                      onClick={() =>
                        handleReorder(
                          'expertise_category',
                          data.expertiseCategories.map((e) => e.id),
                          idx,
                          1
                        )
                      }
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={exp.campaignEnabled ? 'default' : 'outline'}
                      disabled={isSaving}
                      onClick={() =>
                        apiAction('PATCH', '/api/admin/survey-settings/choices', {
                          action: 'toggle_campaign',
                          entityType: 'expertise_category',
                          id: exp.id,
                          isEnabled: !exp.campaignEnabled,
                        })
                      }
                    >
                      {exp.campaignEnabled ? 'Campaign: Enabled' : 'Campaign: Disabled'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSaving}
                      onClick={() =>
                        apiAction('PATCH', '/api/admin/survey-settings/choices', {
                          action: 'toggle_active',
                          entityType: 'expertise_category',
                          id: exp.id,
                          isActive: !exp.isActive,
                        })
                      }
                    >
                      {exp.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSaving}
                      onClick={() =>
                        apiAction(
                          'DELETE',
                          `/api/admin/survey-settings/choices?entityType=expertise_category&id=${exp.id}`
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. ENGAGEMENT INTERESTS TAB */}
      {activeTab === 'interests' && data && (
        <Card>
          <CardHeader>
            <CardTitle>Engagement Interests</CardTitle>
            <CardDescription>Manage multi-select engagement options for participants.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-wrap gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await apiAction('POST', '/api/admin/survey-settings/choices', {
                  entityType: 'engagement_interest',
                  data: newInterest,
                });
                if (res) setNewInterest({ label: '', description: '' });
              }}
            >
              <Input
                required
                className="w-72"
                placeholder="Engagement interest label"
                value={newInterest.label}
                onChange={(e) => setNewInterest((p) => ({ ...p, label: e.target.value }))}
              />
              <Input
                className="w-72"
                placeholder="Optional description"
                value={newInterest.description}
                onChange={(e) => setNewInterest((p) => ({ ...p, description: e.target.value }))}
              />
              <Button type="submit" disabled={isSaving}>
                <Plus className="mr-1 h-4 w-4" /> Add Interest
              </Button>
            </form>

            <div className="divide-y rounded-md border">
              {data.engagementInterests.map((item, idx) => (
                <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <div className="font-medium">
                      {item.displayOrder}. {item.label}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Slug: {item.slug} • {item._count.submissions} selections
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === 0 || isSaving}
                      onClick={() =>
                        handleReorder(
                          'engagement_interest',
                          data.engagementInterests.map((i) => i.id),
                          idx,
                          -1
                        )
                      }
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === data.engagementInterests.length - 1 || isSaving}
                      onClick={() =>
                        handleReorder(
                          'engagement_interest',
                          data.engagementInterests.map((i) => i.id),
                          idx,
                          1
                        )
                      }
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={item.campaignEnabled ? 'default' : 'outline'}
                      disabled={isSaving}
                      onClick={() =>
                        apiAction('PATCH', '/api/admin/survey-settings/choices', {
                          action: 'toggle_campaign',
                          entityType: 'engagement_interest',
                          id: item.id,
                          isEnabled: !item.campaignEnabled,
                        })
                      }
                    >
                      {item.campaignEnabled ? 'Campaign: Enabled' : 'Campaign: Disabled'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSaving}
                      onClick={() =>
                        apiAction('PATCH', '/api/admin/survey-settings/choices', {
                          action: 'toggle_active',
                          entityType: 'engagement_interest',
                          id: item.id,
                          isActive: !item.isActive,
                        })
                      }
                    >
                      {item.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSaving}
                      onClick={() =>
                        apiAction(
                          'DELETE',
                          `/api/admin/survey-settings/choices?entityType=engagement_interest&id=${item.id}`
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. CITIES TAB */}
      {activeTab === 'cities' && data && (
        <Card>
          <CardHeader>
            <CardTitle>Cities Choice List</CardTitle>
            <CardDescription>Database-backed city choices for the survey form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="flex flex-wrap gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await apiAction('POST', '/api/admin/survey-settings/choices', {
                  entityType: 'city',
                  data: newCity,
                });
                if (res) setNewCity({ label: '', aliases: '' });
              }}
            >
              <Input
                required
                className="w-56"
                placeholder="City name (e.g., Bahawalpur)"
                value={newCity.label}
                onChange={(e) => setNewCity((p) => ({ ...p, label: e.target.value }))}
              />
              <Input
                className="w-60"
                placeholder="Optional aliases (comma-separated)"
                value={newCity.aliases}
                onChange={(e) => setNewCity((p) => ({ ...p, aliases: e.target.value }))}
              />
              <Button type="submit" disabled={isSaving}>
                <Plus className="mr-1 h-4 w-4" /> Add City
              </Button>
            </form>

            <div className="divide-y rounded-md border">
              {data.cities.map((city, idx) => (
                <div key={city.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
                  <div>
                    <div className="font-medium">
                      {city.displayOrder}. {city.label}
                      {city.isOtherOption && (
                        <Badge variant="secondary" className="ml-2">
                          Other option
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Code: {city.code} • {city._count.citySubmissions} submissions
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === 0 || isSaving}
                      onClick={() =>
                        handleReorder(
                          'city',
                          data.cities.map((c) => c.id),
                          idx,
                          -1
                        )
                      }
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={idx === data.cities.length - 1 || isSaving}
                      onClick={() =>
                        handleReorder(
                          'city',
                          data.cities.map((c) => c.id),
                          idx,
                          1
                        )
                      }
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={city.campaignEnabled ? 'default' : 'outline'}
                      disabled={isSaving}
                      onClick={() =>
                        apiAction('PATCH', '/api/admin/survey-settings/choices', {
                          action: 'toggle_campaign',
                          entityType: 'city',
                          id: city.id,
                          isEnabled: !city.campaignEnabled,
                        })
                      }
                    >
                      {city.campaignEnabled ? 'Campaign: Enabled' : 'Campaign: Disabled'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isSaving}
                      onClick={() =>
                        apiAction('PATCH', '/api/admin/survey-settings/choices', {
                          action: 'toggle_active',
                          entityType: 'city',
                          id: city.id,
                          isActive: !city.isActive,
                        })
                      }
                    >
                      {city.isActive ? 'Deactivate' : 'Activate'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSaving}
                      onClick={() =>
                        apiAction(
                          'DELETE',
                          `/api/admin/survey-settings/choices?entityType=city&id=${city.id}`
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 6. OTHER PROPOSALS QUEUE */}
      {activeTab === 'proposals' && data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              “Other — please specify” Review Queue
            </CardTitle>
            <CardDescription>
              Participant-entered values are never auto-published. Review and either approve as a new
              canonical choice, map to an existing choice, or reject.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.proposals.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">
                No “Other — please specify” submissions yet.
              </p>
            )}
            {data.proposals.map((prop) => (
              <div key={prop.id} className="rounded-md border p-4 space-y-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{prop.proposalType}</Badge>
                    <span className="font-semibold text-base">{prop.submittedText}</span>
                  </div>
                  <Badge variant={prop.status === 'pending' ? 'default' : 'secondary'}>
                    {prop.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Submitted by {prop.submission.preferredName} ({prop.submission.officialEmail}) on{' '}
                  {new Date(prop.createdAt).toLocaleString()}
                </div>
                {prop.status === 'pending' && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      disabled={isSaving}
                      onClick={() =>
                        apiAction('POST', '/api/admin/survey-settings/proposals', {
                          proposalId: prop.id,
                          action: 'approve_new',
                          canonicalName: prop.submittedText,
                          categoryId: data.institutionCategories[0]?.id,
                        })
                      }
                    >
                      <CheckCircle2 className="mr-1 h-4 w-4" />
                      Approve as New Choice
                    </Button>
                    {prop.proposalType === 'institution' && (
                      <>
                        <select
                          className="h-9 rounded-md border border-input bg-background px-2 text-xs"
                          value={proposalTargets[prop.id] || ''}
                          onChange={(e) =>
                            setProposalTargets((p) => ({ ...p, [prop.id]: e.target.value }))
                          }
                        >
                          <option value="">Map to existing institution...</option>
                          {data.institutions
                            .filter((i) => i.isSelectable && !i.isHistorical)
                            .map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.name}
                              </option>
                            ))}
                        </select>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!proposalTargets[prop.id] || isSaving}
                          onClick={() =>
                            apiAction('POST', '/api/admin/survey-settings/proposals', {
                              proposalId: prop.id,
                              action: 'map_existing',
                              targetId: proposalTargets[prop.id],
                              addAlias: true,
                            })
                          }
                        >
                          Map & Add Alias
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={isSaving}
                      onClick={() =>
                        apiAction('POST', '/api/admin/survey-settings/proposals', {
                          proposalId: prop.id,
                          action: 'reject',
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 7. CSV IMPORT / EXPORT */}
      {activeTab === 'csv' && (
        <Card>
          <CardHeader>
            <CardTitle>CSV Bulk Export & Import</CardTitle>
            <CardDescription>
              Export current choices as CSV or paste CSV data to validate duplicates before applying.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={csvEntityType}
                onChange={(e) => {
                  setCsvEntityType(
                    e.target.value as
                      | 'institution'
                      | 'expertise_category'
                      | 'engagement_interest'
                      | 'city'
                  );
                  setCsvPreview(null);
                }}
              >
                <option value="institution">Institutions</option>
                <option value="expertise_category">Expertise Categories</option>
                <option value="engagement_interest">Engagement Interests</option>
                <option value="city">Cities</option>
              </select>
              <a href={`/api/admin/survey-settings/choices/export?entityType=${csvEntityType}`}>
                <Button type="button" variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  Download Current CSV
                </Button>
              </a>
            </div>

            <div className="space-y-2">
              <Label>Paste CSV Content (with header row)</Label>
              <textarea
                rows={8}
                className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs"
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setCsvPreview(null);
                }}
                placeholder="code,name,shortCode,categoryCode,operatingStatus,aliases..."
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                disabled={!csvText.trim() || isSaving}
                onClick={() => handleCsvPreview('preview')}
              >
                <Upload className="mr-2 h-4 w-4" />
                Validate & Preview Import
              </Button>
              {csvPreview && csvPreview.errors === 0 && (
                <Button disabled={isSaving} onClick={() => handleCsvPreview('apply')}>
                  Apply Import ({csvPreview.creates} new, {csvPreview.updates} updates)
                </Button>
              )}
            </div>

            {csvPreview && (
              <div className="rounded-md border p-4 space-y-2 text-sm">
                <div className="font-medium">
                  Preview Summary: {csvPreview.totalRows} rows — {csvPreview.creates} creates,{' '}
                  {csvPreview.updates} updates, {csvPreview.errors} errors
                </div>
                <div className="max-h-56 overflow-y-auto divide-y text-xs">
                  {csvPreview.rows.map((r) => (
                    <div key={r.rowNumber} className="flex justify-between py-1.5">
                      <span>
                        Row {r.rowNumber}: <strong>{r.label || r.key}</strong> ({r.key})
                      </span>
                      <span
                        className={
                          r.action === 'error'
                            ? 'text-destructive font-medium'
                            : 'text-muted-foreground'
                        }
                      >
                        {r.action.toUpperCase()} {r.error ? `— ${r.error}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 8. AUDIT LOG */}
      {activeTab === 'audit' && data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Choice Management Audit Log
            </CardTitle>
            <CardDescription>
              Tracks who changed each choice, when, and whether the edit was minor or material.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.auditLogs.length === 0 && (
              <p className="text-sm text-muted-foreground py-6 text-center">No audit entries yet.</p>
            )}
            <div className="divide-y rounded-md border">
              {data.auditLogs.map((log) => (
                <div key={log.id} className="p-3 text-xs space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{log.entityType}</Badge>
                      <Badge>{log.action}</Badge>
                      <Badge variant="secondary">{log.changeClassification}</Badge>
                      <span className="font-medium">{log.adminEmail}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-muted-foreground font-mono truncate">
                    Entity ID: {log.entityId}
                    {log.afterValue ? ` • After: ${log.afterValue}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
