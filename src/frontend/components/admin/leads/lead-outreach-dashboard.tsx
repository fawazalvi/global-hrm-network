'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Archive,
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  Send,
  SlidersHorizontal,
  Tag,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/frontend/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/frontend/components/ui/card';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Badge } from '@/frontend/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/frontend/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/frontend/components/ui/dialog';
import { Label } from '@/frontend/components/ui/label';
import { useToast } from '@/frontend/hooks/use-toast';
import LeadDetailsDrawer from './lead-details-drawer';
import SendInvitationsModal from './send-invitations-modal';
import CsvImportModal from './csv-import-modal';

const DEFAULT_COLUMNS = {
  institution: true,
  designation: true,
  source: true,
  deliveryStatus: true,
  lastInvited: true,
  stage: true,
  attempts: true,
  tags: false,
};

export default function LeadOutreachDashboard() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<string>(searchParams.get('tab') || 'overview');
  const [options, setOptions] = useState<{
    institutions: Array<{ id: string; name: string; shortCode: string }>;
    campaigns: Array<{ id: string; slug: string; title: string; status: string }>;
    templates: Array<{ emailType: string; name: string }>;
  }>({ institutions: [], campaigns: [], templates: [] });

  // Overview state
  const [overviewFilters, setOverviewFilters] = useState({
    dateFrom: '',
    dateTo: '',
    institutionId: 'all',
    campaignId: 'all',
  });
  const [overview, setOverview] = useState<any>(null);
  const [loadingOverview, setLoadingOverview] = useState(true);

  // Leads state (server-side search, filters, sorting, pagination)
  const [searchInput, setSearchInput] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState({
    search: searchParams.get('q') || '',
    institutionId: searchParams.get('institutionId') || 'all',
    source: searchParams.get('source') || 'all',
    campaignId: searchParams.get('campaignId') || 'all',
    participationStage: searchParams.get('stage') || 'all',
    deliveryStatus: searchParams.get('delivery') || 'all',
    suppressed: searchParams.get('suppressed') || 'all',
    visited: searchParams.get('visited') || 'all',
    expired: searchParams.get('expired') || 'all',
    neverInvited: searchParams.get('neverInvited') || 'all',
    archived: (searchParams.get('archived') as 'active' | 'archived' | 'all') || 'active',
    tag: searchParams.get('tag') || '',
  });
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(
    searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc'
  );
  const [page, setPage] = useState(Math.max(1, Number(searchParams.get('page') || 1)));
  const [pageSize, setPageSize] = useState(
    [10, 25, 50, 100].includes(Number(searchParams.get('pageSize')))
      ? Number(searchParams.get('pageSize'))
      : 25
  );
  const [leadsData, setLeadsData] = useState<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({ items: [], total: 0, page: 1, pageSize: 25, totalPages: 1 });
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showFiltersPanel, setShowFiltersPanel] = useState(false);

  // Column preferences persisted in localStorage
  const [columns, setColumns] = useState(DEFAULT_COLUMNS);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ghrm_lead_columns');
      if (saved) setColumns({ ...DEFAULT_COLUMNS, ...JSON.parse(saved) });
    } catch {
      // ignore
    }
  }, []);
  const toggleColumn = (key: keyof typeof DEFAULT_COLUMNS) => {
    setColumns((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('ghrm_lead_columns', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Invitations & Activity tab state
  const [invPage, setInvPage] = useState(1);
  const [invPageSize, setInvPageSize] = useState(25);
  const [invStatusFilter, setInvStatusFilter] = useState('all');
  const [invSearch, setInvSearch] = useState('');
  const [invData, setInvData] = useState<{
    items: any[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>({ items: [], total: 0, page: 1, pageSize: 25, totalPages: 1 });
  const [loadingInv, setLoadingInv] = useState(false);

  // Drawers & Modals
  const [drawerLeadId, setDrawerLeadId] = useState<string | null>(null);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [presetSingleLead, setPresetSingleLead] = useState<{ email: string; fullName?: string | null } | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [addLeadModalOpen, setAddLeadModalOpen] = useState(false);
  const [newLead, setNewLead] = useState({
    email: '',
    fullName: '',
    institutionId: '',
    institutionName: '',
    designation: '',
    tags: '',
  });
  const [savingNewLead, setSavingNewLead] = useState(false);

  // Debounce search input -> filters.search & reset page
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => {
        if (prev.search === searchInput) return prev;
        setPage(1);
        return { ...prev, search: searchInput };
      });
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sync non-PII filters/sort/page to URL query parameters
  useEffect(() => {
    const params = new URLSearchParams();
    if (activeTab !== 'overview') params.set('tab', activeTab);
    if (filters.institutionId !== 'all') params.set('institutionId', filters.institutionId);
    if (filters.source !== 'all') params.set('source', filters.source);
    if (filters.campaignId !== 'all') params.set('campaignId', filters.campaignId);
    if (filters.participationStage !== 'all') params.set('stage', filters.participationStage);
    if (filters.deliveryStatus !== 'all') params.set('delivery', filters.deliveryStatus);
    if (filters.suppressed !== 'all') params.set('suppressed', filters.suppressed);
    if (filters.visited !== 'all') params.set('visited', filters.visited);
    if (filters.expired !== 'all') params.set('expired', filters.expired);
    if (filters.neverInvited !== 'all') params.set('neverInvited', filters.neverInvited);
    if (filters.archived !== 'active') params.set('archived', filters.archived);
    if (sortBy !== 'createdAt') params.set('sortBy', sortBy);
    if (sortDir !== 'desc') params.set('sortDir', sortDir);
    if (page > 1) params.set('page', String(page));
    if (pageSize !== 25) params.set('pageSize', String(pageSize));

    const qs = params.toString();
    router.replace(qs ? `/admin/surveys/invite?${qs}` : '/admin/surveys/invite', { scroll: false });
  }, [activeTab, filters, sortBy, sortDir, page, pageSize]);

  const loadOverview = async () => {
    setLoadingOverview(true);
    try {
      const params = new URLSearchParams();
      if (overviewFilters.dateFrom) params.set('dateFrom', overviewFilters.dateFrom);
      if (overviewFilters.dateTo) params.set('dateTo', overviewFilters.dateTo);
      if (overviewFilters.institutionId !== 'all') params.set('institutionId', overviewFilters.institutionId);
      if (overviewFilters.campaignId !== 'all') params.set('campaignId', overviewFilters.campaignId);

      const res = await fetch(`/api/admin/leads/overview?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setOverview(data.overview);
        if (data.options) setOptions(data.options);
      }
    } catch {
      // ignore
    } finally {
      setLoadingOverview(false);
    }
  };

  const loadLeads = async () => {
    setLoadingLeads(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sortBy,
        sortDir,
        archived: filters.archived,
      });
      if (filters.search) params.set('search', filters.search);
      if (filters.institutionId !== 'all') params.set('institutionId', filters.institutionId);
      if (filters.source !== 'all') params.set('source', filters.source);
      if (filters.campaignId !== 'all') params.set('campaignId', filters.campaignId);
      if (filters.participationStage !== 'all') params.set('participationStage', filters.participationStage);
      if (filters.deliveryStatus !== 'all') params.set('deliveryStatus', filters.deliveryStatus);
      if (filters.suppressed !== 'all') params.set('suppressed', filters.suppressed);
      if (filters.visited !== 'all') params.set('visited', filters.visited);
      if (filters.expired !== 'all') params.set('expired', filters.expired);
      if (filters.neverInvited !== 'all') params.set('neverInvited', filters.neverInvited);
      if (filters.tag) params.set('tag', filters.tag);

      const res = await fetch(`/api/admin/leads?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load leads.');
      setLeadsData(data);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Leads Error', description: err.message });
    } finally {
      setLoadingLeads(false);
    }
  };

  const loadInvitationsActivity = async () => {
    setLoadingInv(true);
    try {
      const params = new URLSearchParams({
        page: String(invPage),
        pageSize: String(invPageSize),
      });
      if (invStatusFilter !== 'all') params.set('status', invStatusFilter);
      if (invSearch) params.set('search', invSearch);
      const res = await fetch(`/api/admin/leads/invitations?${params.toString()}`);
      const data = await res.json();
      if (res.ok) setInvData(data);
    } catch {
      // ignore
    } finally {
      setLoadingInv(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, [overviewFilters]);

  useEffect(() => {
    loadLeads();
  }, [filters, sortBy, sortDir, page, pageSize]);

  useEffect(() => {
    loadInvitationsActivity();
  }, [invPage, invPageSize, invStatusFilter, invSearch]);

  const refreshAll = () => {
    loadOverview();
    loadLeads();
    loadInvitationsActivity();
  };

  const updateFilter = (key: keyof typeof filters, value: string) => {
    setPage(1);
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setPage(1);
    setFilters({
      search: '',
      institutionId: 'all',
      source: 'all',
      campaignId: 'all',
      participationStage: 'all',
      deliveryStatus: 'all',
      suppressed: 'all',
      visited: 'all',
      expired: 'all',
      neverInvited: 'all',
      archived: 'active',
      tag: '',
    });
  };

  const activeChips = useMemo(() => {
    const chips: Array<{ key: keyof typeof filters; label: string }> = [];
    if (filters.search) chips.push({ key: 'search', label: `Search: ${filters.search}` });
    if (filters.institutionId !== 'all') chips.push({ key: 'institutionId', label: 'Institution filtered' });
    if (filters.source !== 'all') chips.push({ key: 'source', label: `Source: ${filters.source}` });
    if (filters.participationStage !== 'all') chips.push({ key: 'participationStage', label: `Stage: ${filters.participationStage}` });
    if (filters.deliveryStatus !== 'all') chips.push({ key: 'deliveryStatus', label: `Delivery: ${filters.deliveryStatus}` });
    if (filters.suppressed !== 'all') chips.push({ key: 'suppressed', label: `Suppressed: ${filters.suppressed}` });
    if (filters.visited !== 'all') chips.push({ key: 'visited', label: `Visited: ${filters.visited}` });
    if (filters.expired !== 'all') chips.push({ key: 'expired', label: `Expired: ${filters.expired}` });
    if (filters.neverInvited !== 'all') chips.push({ key: 'neverInvited', label: `Never invited: ${filters.neverInvited}` });
    if (filters.archived !== 'active') chips.push({ key: 'archived', label: `Archive: ${filters.archived}` });
    return chips;
  }, [filters]);

  const handleBulkAction = async (action: string, extra?: Record<string, any>) => {
    if (selectedLeadIds.length === 0) return;
    try {
      const res = await fetch('/api/admin/leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          scope: 'selected_ids',
          leadIds: selectedLeadIds,
          ...extra,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk action failed.');
      toast({ title: 'Bulk Action Completed', description: `Updated ${data.affected} lead(s).` });
      setSelectedLeadIds([]);
      refreshAll();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Action Failed', description: err.message });
    }
  };

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNewLead(true);
    try {
      const res = await fetch('/api/admin/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newLead.email,
          fullName: newLead.fullName || null,
          institutionId: newLead.institutionId || null,
          institutionName: newLead.institutionName || null,
          designation: newLead.designation || null,
          tags: newLead.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add lead.');
      toast({ title: 'Lead Added', description: `${newLead.email} saved.` });
      setNewLead({ email: '', fullName: '', institutionId: '', institutionName: '', designation: '', tags: '' });
      setAddLeadModalOpen(false);
      refreshAll();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    } finally {
      setSavingNewLead(false);
    }
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (selectedLeadIds.length > 0) {
      params.set('ids', selectedLeadIds.join(','));
    } else {
      if (filters.search) params.set('search', filters.search);
      if (filters.institutionId !== 'all') params.set('institutionId', filters.institutionId);
      if (filters.source !== 'all') params.set('source', filters.source);
      if (filters.participationStage !== 'all') params.set('participationStage', filters.participationStage);
      if (filters.deliveryStatus !== 'all') params.set('deliveryStatus', filters.deliveryStatus);
      if (filters.suppressed !== 'all') params.set('suppressed', filters.suppressed);
      params.set('archived', filters.archived);
    }
    window.location.href = `/api/admin/leads/export?${params.toString()}`;
  };

  const handleOutboxAction = async (action: 'cancel' | 'retry_outbox', outboxId: string) => {
    try {
      const res = await fetch('/api/admin/leads/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, outboxId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Operation failed.');
      toast({ title: action === 'cancel' ? 'Queued Message Cancelled' : 'Retry Queued' });
      refreshAll();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  const allVisibleSelected =
    leadsData.items.length > 0 &&
    leadsData.items.every((item) => selectedLeadIds.includes(item.id));

  const startItem = leadsData.total === 0 ? 0 : (leadsData.page - 1) * leadsData.pageSize + 1;
  const endItem = Math.min(leadsData.total, leadsData.page * leadsData.pageSize);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-[#D9E6F2] bg-gradient-to-r from-[#EFF6FC] via-white to-[#FFF7ED] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#123B70]">
              Lead &amp; Outreach Management
            </h1>
            <p className="text-sm text-[#5C6B7A]">
              Manage leads, segmentation, CSV imports, personalized survey invitations, and delivery
              analytics across Global HRM Network campaigns.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setAddLeadModalOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Lead
            </Button>
            <Button variant="outline" size="sm" onClick={() => setImportModalOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setPresetSingleLead(null);
                setSendModalOpen(true);
              }}
            >
              <Send className="mr-1.5 h-4 w-4" />
              Send Invitations
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">1. Overview</TabsTrigger>
          <TabsTrigger value="leads">2. Leads ({leadsData.total})</TabsTrigger>
          <TabsTrigger value="activity">3. Invitations &amp; Activity ({invData.total})</TabsTrigger>
        </TabsList>

        {/* 1. OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">From Date</Label>
                  <Input
                    type="date"
                    value={overviewFilters.dateFrom}
                    onChange={(e) => setOverviewFilters({ ...overviewFilters, dateFrom: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To Date</Label>
                  <Input
                    type="date"
                    value={overviewFilters.dateTo}
                    onChange={(e) => setOverviewFilters({ ...overviewFilters, dateTo: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Institution</Label>
                  <select
                    value={overviewFilters.institutionId}
                    onChange={(e) =>
                      setOverviewFilters({ ...overviewFilters, institutionId: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="all">All Institutions</option>
                    {options.institutions.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Campaign</Label>
                  <select
                    value={overviewFilters.campaignId}
                    onChange={(e) =>
                      setOverviewFilters({ ...overviewFilters, campaignId: e.target.value })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  >
                    <option value="all">All Campaigns</option>
                    {options.campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {loadingOverview || !overview ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Loading metrics...
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {[
                  ['Total Leads', overview.cards.totalLeads, 'Active non-archived contacts'],
                  ['Eligible Not Yet Invited', overview.cards.eligibleNotInvited, 'Not suppressed or verified'],
                  ['Unique Leads Invited', overview.cards.uniqueLeadsInvited, 'Distinct invited recipients'],
                  ['Invitations Queued', overview.cards.invitationsQueued, 'Pending worker dispatch'],
                  ['Accepted by SMTP', overview.cards.invitationsAcceptedBySmtp, 'Relay accepted (not inbox proof)'],
                  ['Failed Email Attempts', overview.cards.failedEmailAttempts, 'Transient/permanent/bounced'],
                  ['Recorded Survey Visits', overview.cards.uniqueLeadsWithSurveyVisits, 'Unique invite link visits*'],
                  ['Verified Participants', overview.cards.verifiedParticipants, 'Email-verified submissions'],
                  ['Completed Surveys', overview.cards.completedSurveys, 'Total submitted responses'],
                  ['Suppressed Leads', overview.cards.suppressedLeads, 'Opted out or suppressed'],
                ].map(([title, val, hint]) => (
                  <Card key={String(title)}>
                    <CardHeader className="pb-1 pt-4 px-4">
                      <CardTitle className="text-xs font-medium text-muted-foreground">
                        {title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                      <div className="text-2xl font-bold text-[#123B70]">{val}</div>
                      <p className="text-[11px] text-muted-foreground">{hint}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <p className="text-[11px] text-muted-foreground">
                *Note: Recorded survey visits measure HTTP visits to the unique invitation URL—automated
                link scanners in corporate mail gateways can occasionally trigger initial visits.
                &ldquo;Accepted by SMTP&rdquo; indicates mail server acceptance, not confirmed inbox placement.
              </p>

              {/* Funnel + Attention */}
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Outreach Funnel &amp; Conversion</CardTitle>
                    <CardDescription>
                      Denominators reflect unique invited leads across matching records.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-4 text-center">
                    <div className="rounded-lg border bg-[#EFF6FC] p-3">
                      <div className="text-xl font-bold text-[#123B70]">{overview.funnel.totalLeads}</div>
                      <div className="text-xs text-muted-foreground">Total Leads</div>
                    </div>
                    <div className="rounded-lg border bg-[#EFF6FC] p-3">
                      <div className="text-xl font-bold text-[#0868B5]">{overview.funnel.uniqueInvited}</div>
                      <div className="text-xs text-muted-foreground">Unique Invited</div>
                    </div>
                    <div className="rounded-lg border bg-[#EFF6FC] p-3">
                      <div className="text-xl font-bold text-[#F58220]">{overview.funnel.uniqueVisited}</div>
                      <div className="text-xs text-muted-foreground">
                        Visited ({overview.funnel.visitRateOfInvitedPct}% of invited)
                      </div>
                    </div>
                    <div className="rounded-lg border bg-[#EFF6FC] p-3">
                      <div className="text-xl font-bold text-[#8DBB32]">{overview.funnel.verifiedCompleted}</div>
                      <div className="text-xs text-muted-foreground">
                        Verified ({overview.funnel.completionRateOfInvitedPct}% of invited)
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-[#F58220]" />
                      Needs Attention
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    <div className="flex justify-between items-center rounded border p-2.5">
                      <span>Failed email attempts</span>
                      <Badge variant={overview.attention.failedEmailAttempts > 0 ? 'destructive' : 'secondary'}>
                        {overview.attention.failedEmailAttempts}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center rounded border p-2.5">
                      <span>Expired uncompleted invites</span>
                      <Badge variant="outline">{overview.attention.expiredUncompletedInvitations}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Institution Breakdown + Recent Activity */}
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top Institutions (Leads &amp; Completions)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {(overview.leadDistributionByInstitution || []).map((row: any) => (
                      <div key={row.institution} className="flex justify-between border-b pb-1">
                        <span className="truncate pr-2">{row.institution}</span>
                        <span className="font-semibold">{row.count} leads</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recent Outreach Activity</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs max-h-60 overflow-y-auto">
                    {(overview.recentActivity || []).map((act: any) => (
                      <div key={act.id} className="flex justify-between gap-2 border-b pb-1">
                        <span className="truncate">{act.summary}</span>
                        <span className="text-muted-foreground whitespace-nowrap">
                          {new Date(act.createdAt).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* 2. LEADS TAB */}
        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search email, name, institution, designation, or tag..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFiltersPanel((p) => !p)}
                  >
                    <Filter className="mr-1.5 h-3.5 w-3.5" />
                    Filters
                  </Button>
                  <Button variant="outline" size="sm" onClick={loadLeads}>
                    <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingLeads ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
              </div>

              {showFiltersPanel && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-lg border bg-muted/20 p-3 text-xs">
                  <select
                    value={filters.institutionId}
                    onChange={(e) => updateFilter('institutionId', e.target.value)}
                    className="h-9 rounded-md border bg-background px-2"
                  >
                    <option value="all">Institution: All</option>
                    {options.institutions.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filters.source}
                    onChange={(e) => updateFilter('source', e.target.value)}
                    className="h-9 rounded-md border bg-background px-2"
                  >
                    <option value="all">Source: All</option>
                    <option value="manual">Manual</option>
                    <option value="csv_import">CSV Import</option>
                    <option value="referral">Referral</option>
                    <option value="legacy_invite">Legacy Invite</option>
                  </select>
                  <select
                    value={filters.participationStage}
                    onChange={(e) => updateFilter('participationStage', e.target.value)}
                    className="h-9 rounded-md border bg-background px-2"
                  >
                    <option value="all">Stage: All</option>
                    <option value="not_invited">Not Invited</option>
                    <option value="invited">Invited (No Visit)</option>
                    <option value="visited_survey">Visited Survey</option>
                    <option value="pending_verification">Pending Verification</option>
                    <option value="verified_completed">Verified &amp; Completed</option>
                  </select>
                  <select
                    value={filters.deliveryStatus}
                    onChange={(e) => updateFilter('deliveryStatus', e.target.value)}
                    className="h-9 rounded-md border bg-background px-2"
                  >
                    <option value="all">Delivery Status: All</option>
                    <option value="queued">Queued</option>
                    <option value="accepted_by_smtp">Accepted by mail server</option>
                    <option value="permanently_failed">Failed</option>
                    <option value="bounced">Bounced</option>
                    <option value="suppressed">Suppressed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <select
                    value={filters.suppressed}
                    onChange={(e) => updateFilter('suppressed', e.target.value)}
                    className="h-9 rounded-md border bg-background px-2"
                  >
                    <option value="all">Suppression: All</option>
                    <option value="no">Eligible (Not Suppressed)</option>
                    <option value="yes">Suppressed Only</option>
                  </select>
                  <select
                    value={filters.neverInvited}
                    onChange={(e) => updateFilter('neverInvited', e.target.value)}
                    className="h-9 rounded-md border bg-background px-2"
                  >
                    <option value="all">Invite History: All</option>
                    <option value="yes">Never Invited</option>
                    <option value="no">Previously Invited</option>
                  </select>
                  <select
                    value={filters.expired}
                    onChange={(e) => updateFilter('expired', e.target.value)}
                    className="h-9 rounded-md border bg-background px-2"
                  >
                    <option value="all">Expiry: All</option>
                    <option value="yes">Expired Uncompleted</option>
                    <option value="no">Active Link</option>
                  </select>
                  <select
                    value={filters.archived}
                    onChange={(e) => updateFilter('archived', e.target.value)}
                    className="h-9 rounded-md border bg-background px-2"
                  >
                    <option value="active">Active Leads Only</option>
                    <option value="archived">Archived Leads Only</option>
                    <option value="all">All (Active + Archived)</option>
                  </select>
                </div>
              )}

              {activeChips.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeChips.map((chip) => (
                    <Badge key={chip.key} variant="secondary" className="gap-1">
                      {chip.label}
                      <button
                        type="button"
                        onClick={() => {
                          if (chip.key === 'search') setSearchInput('');
                          updateFilter(
                            chip.key,
                            chip.key === 'archived' ? 'active' : chip.key === 'search' ? '' : 'all'
                          );
                        }}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearAllFilters}>
                    Clear All
                  </Button>
                </div>
              )}

              {/* Bulk Actions Bar */}
              {selectedLeadIds.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#0868B5]/40 bg-[#EFF6FC] p-2.5 text-xs">
                  <span className="font-semibold text-[#123B70]">
                    {selectedLeadIds.length} lead(s) selected
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      size="sm"
                      onClick={() => {
                        setPresetSingleLead(null);
                        setSendModalOpen(true);
                      }}
                    >
                      <Send className="mr-1 h-3.5 w-3.5" />
                      Send Invitations
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const tag = window.prompt('Enter tag to add to selected leads:');
                        if (tag?.trim()) handleBulkAction('add_tags', { tags: [tag.trim()] });
                      }}
                    >
                      <Tag className="mr-1 h-3.5 w-3.5" />
                      Add Tag
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBulkAction('suppress', { reason: 'manual' })}
                    >
                      <Ban className="mr-1 h-3.5 w-3.5" />
                      Suppress
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('archive')}>
                      <Archive className="mr-1 h-3.5 w-3.5" />
                      Archive
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedLeadIds([])}>
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          checked={allVisibleSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLeadIds(
                                Array.from(new Set([...selectedLeadIds, ...leadsData.items.map((i) => i.id)]))
                              );
                            } else {
                              const visibleSet = new Set(leadsData.items.map((i) => i.id));
                              setSelectedLeadIds(selectedLeadIds.filter((id) => !visibleSet.has(id)));
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>
                        <button
                          type="button"
                          className="font-semibold hover:underline"
                          onClick={() => {
                            setSortBy('email');
                            setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
                          }}
                        >
                          Name &amp; Email
                        </button>
                      </TableHead>
                      {columns.institution && <TableHead>Institution</TableHead>}
                      {columns.designation && <TableHead>Designation</TableHead>}
                      {columns.source && <TableHead>Source</TableHead>}
                      {columns.deliveryStatus && <TableHead>Latest Delivery</TableHead>}
                      {columns.lastInvited && <TableHead>Last Invited</TableHead>}
                      {columns.stage && <TableHead>Survey Stage</TableHead>}
                      {columns.attempts && <TableHead>Attempts</TableHead>}
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLeads ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />
                          Loading leads...
                        </TableCell>
                      </TableRow>
                    ) : leadsData.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                          No leads match your current search or filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      leadsData.items.map((lead) => (
                        <TableRow
                          key={lead.id}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => setDrawerLeadId(lead.id)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedLeadIds.includes(lead.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLeadIds([...selectedLeadIds, lead.id]);
                                } else {
                                  setSelectedLeadIds(selectedLeadIds.filter((id) => id !== lead.id));
                                }
                              }}
                            />
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="font-semibold text-[#123B70]">
                              {lead.fullName || '—'}
                            </div>
                            <div className="text-muted-foreground">{lead.email}</div>
                            {lead.suppressed && (
                              <Badge variant="destructive" className="mt-1 text-[10px]">
                                Suppressed
                              </Badge>
                            )}
                          </TableCell>
                          {columns.institution && (
                            <TableCell className="text-xs">{lead.institutionName || '—'}</TableCell>
                          )}
                          {columns.designation && (
                            <TableCell className="text-xs">{lead.designation || '—'}</TableCell>
                          )}
                          {columns.source && (
                            <TableCell className="text-xs">
                              <Badge variant="outline">{lead.source}</Badge>
                            </TableCell>
                          )}
                          {columns.deliveryStatus && (
                            <TableCell className="text-xs">
                              <Badge
                                variant={
                                  lead.latestDeliveryStatus === 'accepted_by_smtp' ||
                                  lead.latestDeliveryStatus === 'delivered'
                                    ? 'default'
                                    : lead.latestDeliveryStatus === 'permanently_failed' ||
                                        lead.latestDeliveryStatus === 'bounced'
                                      ? 'destructive'
                                      : 'secondary'
                                }
                              >
                                {lead.latestDeliveryLabel}
                              </Badge>
                            </TableCell>
                          )}
                          {columns.lastInvited && (
                            <TableCell className="text-xs whitespace-nowrap">
                              {lead.latestInvite
                                ? new Date(lead.latestInvite.createdAt).toLocaleDateString()
                                : 'Never'}
                            </TableCell>
                          )}
                          {columns.stage && (
                            <TableCell className="text-xs">
                              <Badge variant="outline">{lead.participationStage}</Badge>
                            </TableCell>
                          )}
                          {columns.attempts && (
                            <TableCell className="text-xs text-center">{lead.attemptCount}</TableCell>
                          )}
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDrawerLeadId(lead.id)}
                              >
                                Details
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={lead.suppressed || lead.verified || lead.isArchived}
                                onClick={() => {
                                  setPresetSingleLead({ email: lead.email, fullName: lead.fullName });
                                  setSendModalOpen(true);
                                }}
                              >
                                <Send className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination & Column Preferences */}
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between text-xs">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <span>
                    Showing <strong>{startItem}–{endItem}</strong> of <strong>{leadsData.total}</strong>
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="h-8 rounded border bg-background px-2"
                  >
                    {[10, 25, 50, 100].map((s) => (
                      <option key={s} value={s}>
                        {s} / page
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1 mr-2">
                    {(['designation', 'source', 'attempts'] as const).map((col) => (
                      <Button
                        key={col}
                        size="sm"
                        variant={columns[col] ? 'secondary' : 'ghost'}
                        className="h-7 text-[11px]"
                        onClick={() => toggleColumn(col)}
                      >
                        {col}
                      </Button>
                    ))}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={leadsData.page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <span>
                    Page {leadsData.page} of {leadsData.totalPages}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={leadsData.page >= leadsData.totalPages}
                    onClick={() => setPage((p) => Math.min(leadsData.totalPages, p + 1))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. INVITATIONS & ACTIVITY TAB */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Invitations &amp; Outbox Activity</CardTitle>
                  <CardDescription>
                    Every send attempt is preserved in chronological order with separate delivery,
                    survey visit, expiry, and completion indicators.
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={loadInvitationsActivity}>
                  <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loadingInv ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Input
                  placeholder="Filter by recipient email..."
                  value={invSearch}
                  onChange={(e) => {
                    setInvSearch(e.target.value);
                    setInvPage(1);
                  }}
                  className="max-w-xs"
                />
                <select
                  value={invStatusFilter}
                  onChange={(e) => {
                    setInvStatusFilter(e.target.value);
                    setInvPage(1);
                  }}
                  className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-xs"
                >
                  <option value="all">All Delivery Statuses</option>
                  <option value="queued">Queued</option>
                  <option value="processing">Processing</option>
                  <option value="accepted_by_smtp">Accepted by mail server</option>
                  <option value="permanently_failed">Failed</option>
                  <option value="suppressed">Suppressed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Delivery Status</TableHead>
                    <TableHead>Survey Visit</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invData.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No invitation attempts found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invData.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-xs whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="font-medium">{item.recipientEmail}</div>
                          {item.institutionName && (
                            <div className="text-muted-foreground">{item.institutionName}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === 'accepted_by_smtp' || item.status === 'delivered'
                                ? 'default'
                                : item.status === 'permanently_failed' || item.status === 'bounced'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {item.friendlyStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.visitStatus?.visited ? (
                            <Badge variant="outline">
                              Visited ({item.visitStatus.openCount}x)
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">None</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <Badge variant="outline">{item.completionStatus}</Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {!item.expiry ? (
                            '—'
                          ) : item.expiry.isExpired ? (
                            <Badge variant="destructive">Expired</Badge>
                          ) : (
                            new Date(item.expiry.expiresAt).toLocaleDateString()
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {item.attemptCount}/{item.maxAttempts}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {item.leadId && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setDrawerLeadId(item.leadId)}
                              >
                                Lead
                              </Button>
                            )}
                            {['queued', 'temporarily_failed'].includes(item.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOutboxAction('cancel', item.id)}
                              >
                                Cancel
                              </Button>
                            )}
                            {['temporarily_failed', 'permanently_failed'].includes(item.status) && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOutboxAction('retry_outbox', item.id)}
                              >
                                <RotateCw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between border-t pt-4 text-xs">
                <span className="text-muted-foreground">
                  Page {invData.page} of {invData.totalPages} ({invData.total} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={invData.page <= 1}
                    onClick={() => setInvPage((p) => Math.max(1, p - 1))}
                  >
                    Prev
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={invData.page >= invData.totalPages}
                    onClick={() => setInvPage((p) => Math.min(invData.totalPages, p + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals & Drawers */}
      <LeadDetailsDrawer
        leadId={drawerLeadId}
        institutions={options.institutions}
        onClose={() => setDrawerLeadId(null)}
        onRefresh={refreshAll}
        onSendInviteToLead={(lead) => {
          setPresetSingleLead(lead);
          setSendModalOpen(true);
        }}
      />

      <SendInvitationsModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        campaigns={options.campaigns}
        templates={options.templates}
        selectedLeadIds={selectedLeadIds}
        totalMatchingCount={leadsData.total}
        currentFilters={filters}
        presetSingleLead={presetSingleLead}
        onSent={refreshAll}
      />

      <CsvImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        campaigns={options.campaigns}
        onImported={refreshAll}
      />

      {/* Add Single Lead Modal */}
      <Dialog open={addLeadModalOpen} onOpenChange={setAddLeadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Lead</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddLead} className="space-y-3 text-sm">
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input
                type="email"
                required
                value={newLead.email}
                onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Full / Preferred Name</Label>
              <Input
                value={newLead.fullName}
                onChange={(e) => setNewLead({ ...newLead, fullName: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Institution</Label>
                <select
                  value={newLead.institutionId}
                  onChange={(e) => setNewLead({ ...newLead, institutionId: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-xs"
                >
                  <option value="">-- Optional --</option>
                  {options.institutions.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Designation</Label>
                <Input
                  value={newLead.designation}
                  onChange={(e) => setNewLead({ ...newLead, designation: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tags (comma-separated)</Label>
              <Input
                value={newLead.tags}
                onChange={(e) => setNewLead({ ...newLead, tags: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={savingNewLead}>
                {savingNewLead && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Save Lead
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
