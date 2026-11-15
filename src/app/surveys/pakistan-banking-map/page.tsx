'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/frontend/components/ui/button';
import { Icons } from '@/frontend/components/icons';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import { Textarea } from '@/frontend/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/frontend/components/ui/card';
import {
  AlertCircle,
  Award,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MailCheck,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

interface ExpertiseCategoryOption {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  displayOrder: number;
  isOtherOption?: boolean;
}

interface EngagementInterestOption {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  displayOrder: number;
}

interface InstitutionCategoryOption {
  id: string;
  code: string;
  name: string;
  shortLabel: string;
  description: string | null;
  displayOrder: number;
}

interface InstitutionOption {
  id: string;
  code: string | null;
  name: string;
  shortCode: string | null;
  categoryId: string | null;
  operatingStatus: string;
  statusNote: string | null;
  isSelectable: boolean;
  isHistorical: boolean;
  successorInstitution: {
    id: string;
    code: string | null;
    name: string;
    shortCode: string | null;
  } | null;
  aliases: string[];
}

interface CityOption {
  id: string;
  code: string;
  label: string;
  aliases: string | null;
  displayOrder: number;
  isOtherOption: boolean;
}

function getStatusBadgeLabel(status: string): string | null {
  if (status === 'restricted_pilot') return 'Restricted licence / pilot operations';
  if (status === 'in_principle_prelaunch') return 'In-principle approval / pre-launch';
  return null;
}

function PakistanBankingMapSurveyContent() {
  const searchParams = useSearchParams();
  const [year, setYear] = useState<number>(2026);

  // Database-backed reference options loaded strictly from API
  const [categories, setCategories] = useState<ExpertiseCategoryOption[]>([]);
  const [interests, setInterests] = useState<EngagementInterestOption[]>([]);
  const [institutionCategories, setInstitutionCategories] = useState<InstitutionCategoryOption[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [cities, setCities] = useState<CityOption[]>([]);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(true);
  const [dbOfflineNotice, setDbOfflineNotice] = useState(false);

  // Form fields
  const [preferredName, setPreferredName] = useState('');
  const [selectedInstitutionId, setSelectedInstitutionId] = useState('');
  const [otherInstitutionText, setOtherInstitutionText] = useState('');
  const [designation, setDesignation] = useState('');
  const [organizationalGrade, setOrganizationalGrade] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [otherCityText, setOtherCityText] = useState('');
  const [totalExperience, setTotalExperience] = useState('');
  const [experienceOverview, setExperienceOverview] = useState('');

  // Searchable Bank Combobox state
  const [bankSearch, setBankSearch] = useState('');
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [activeOptionIndex, setActiveOptionIndex] = useState(0);
  const comboboxRef = useRef<HTMLDivElement | null>(null);

  // Ranked expertise (ordered array of up to 3 category slugs: index 0 = Rank 1, etc.)
  const [rankedSlugs, setRankedSlugs] = useState<string[]>([]);
  const [otherExpertiseText, setOtherExpertiseText] = useState('');

  // Engagement interests & referral
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [referralValid, setReferralValid] = useState(false);
  const [skipReferralAttribution, setSkipReferralAttribution] = useState(false);

  // Separate consents
  const [participationConsent, setParticipationConsent] = useState(false);
  const [communicationsConsent, setCommunicationsConsent] = useState(false);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    submissionId: string;
    status: string;
    verificationExpiresAt: string;
  } | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
    const refParam = searchParams.get('ref');
    if (refParam && refParam.trim()) {
      const code = refParam.trim();
      setReferralCode(code);
      fetch(`/api/surveys/pakistan-banking-map/referral?code=${encodeURIComponent(code)}`)
        .then((res) => (res.ok ? res.json() : { valid: false }))
        .then((data) => {
          setReferralValid(Boolean(data?.valid));
        })
        .catch(() => {
          setReferralValid(false);
        });
    }
  }, [searchParams]);

  useEffect(() => {
    let active = true;
    async function loadMetadata() {
      try {
        const res = await fetch('/api/surveys/pakistan-banking-map', { cache: 'no-store' });
        if (!res.ok) {
          if (active) setDbOfflineNotice(true);
          return;
        }
        const data = await res.json();
        if (!active) return;
        if (Array.isArray(data.expertiseCategories)) {
          setCategories(data.expertiseCategories);
        }
        if (Array.isArray(data.engagementInterests)) {
          setInterests(data.engagementInterests);
        }
        if (Array.isArray(data.institutionCategories)) {
          setInstitutionCategories(data.institutionCategories);
        }
        if (Array.isArray(data.institutions)) {
          setInstitutions(data.institutions);
        }
        if (Array.isArray(data.cities)) {
          setCities(data.cities);
        }
        setDbOfflineNotice(false);
      } catch {
        if (active) setDbOfflineNotice(true);
      } finally {
        if (active) setIsLoadingMetadata(false);
      }
    }
    loadMetadata();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(event.target as Node)) {
        setBankDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedInstitution = useMemo(
    () => institutions.find((i) => i.id === selectedInstitutionId) ?? null,
    [institutions, selectedInstitutionId]
  );

  const isOtherInstitutionSelected =
    selectedInstitution?.operatingStatus === 'other_placeholder' ||
    selectedInstitution?.code === 'other_institution';

  const selectedCityObj = useMemo(
    () => cities.find((c) => c.id === selectedCityId) ?? null,
    [cities, selectedCityId]
  );

  const hasOtherExpertiseSelected = useMemo(
    () =>
      rankedSlugs.some((slug) => {
        const cat = categories.find((c) => c.slug === slug);
        return Boolean(cat?.isOtherOption);
      }),
    [rankedSlugs, categories]
  );

  const categoryById = useMemo(
    () => new Map(institutionCategories.map((c) => [c.id, c])),
    [institutionCategories]
  );

  const { groupedSelectableInstitutions, flatSelectableInstitutions, matchingHistoricalInstitutions } =
    useMemo(() => {
      const q = bankSearch.trim().toLowerCase();
      const matchesQuery = (inst: InstitutionOption) => {
        if (!q) return true;
        return (
          inst.name.toLowerCase().includes(q) ||
          (inst.shortCode && inst.shortCode.toLowerCase().includes(q)) ||
          inst.aliases.some((a) => a.toLowerCase().includes(q))
        );
      };

      const selectable = institutions
        .filter((inst) => inst.isSelectable && !inst.isHistorical && matchesQuery(inst))
        .sort((a, b) => a.name.localeCompare(b.name));

      const historical = q
        ? institutions.filter((inst) => (inst.isHistorical || !inst.isSelectable) && matchesQuery(inst))
        : [];

      const groups: Array<{
        category: InstitutionCategoryOption;
        items: InstitutionOption[];
      }> = [];

      for (const cat of institutionCategories) {
        if (cat.code === 'historical') continue;
        const items = selectable.filter((inst) => inst.categoryId === cat.id);
        if (items.length > 0) {
          groups.push({ category: cat, items });
        }
      }

      const uncategorized = selectable.filter(
        (inst) => !inst.categoryId || !categoryById.has(inst.categoryId)
      );
      if (uncategorized.length > 0) {
        groups.push({
          category: {
            id: 'uncategorized',
            code: 'other',
            name: 'Other Institutions',
            shortLabel: 'Other',
            description: null,
            displayOrder: 999,
          },
          items: uncategorized,
        });
      }

      const flat = groups.flatMap((g) => g.items);
      return {
        groupedSelectableInstitutions: groups,
        flatSelectableInstitutions: flat,
        matchingHistoricalInstitutions: historical,
      };
    }, [institutions, institutionCategories, categoryById, bankSearch]);

  const toggleRankedCategory = (slug: string) => {
    setRankedSlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((item) => item !== slug);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, slug];
    });
  };

  const toggleInterest = (slug: string) => {
    setSelectedInterests((prev) =>
      prev.includes(slug) ? prev.filter((item) => item !== slug) : [...prev, slug]
    );
  };

  const handleSelectInstitution = (inst: InstitutionOption) => {
    setSelectedInstitutionId(inst.id);
    setBankSearch('');
    setBankDropdownOpen(false);
    if (inst.operatingStatus !== 'other_placeholder' && inst.code !== 'other_institution') {
      setOtherInstitutionText('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedInstitution) {
      setSubmitError('Please select your Bank / Financial Institution from the directory.');
      return;
    }

    if (isOtherInstitutionSelected && otherInstitutionText.trim().length < 2) {
      setSubmitError('Please specify your Bank / Financial Institution name.');
      return;
    }

    if (selectedCityObj?.isOtherOption && otherCityText.trim().length < 2) {
      setSubmitError('Please specify your city.');
      return;
    }

    if (rankedSlugs.length === 0) {
      setSubmitError('Please click to select at least your Primary (Rank #1) expertise category.');
      return;
    }

    if (hasOtherExpertiseSelected && otherExpertiseText.trim().length < 2) {
      setSubmitError('Please specify your area of expertise for "Other — please specify".');
      return;
    }

    const parsedYears = Number(totalExperience);
    if (totalExperience.trim() === '' || Number.isNaN(parsedYears) || parsedYears < 0 || parsedYears > 70) {
      setSubmitError('Please enter valid total banking experience (0 to 70 years).');
      return;
    }

    if (!participationConsent) {
      setSubmitError('Participation consent is required to submit your survey response.');
      return;
    }

    const rankedExpertise = rankedSlugs.map((categorySlug, idx) => ({
      categorySlug,
      rank: idx + 1,
    }));

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/surveys/pakistan-banking-map/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          preferredName,
          institutionId: selectedInstitution.id,
          institutionName: selectedInstitution.name,
          otherInstitutionText: isOtherInstitutionSelected ? otherInstitutionText.trim() : null,
          designation,
          organizationalGrade: organizationalGrade || null,
          officialEmail,
          cityId: selectedCityObj ? selectedCityObj.id : null,
          city: selectedCityObj ? selectedCityObj.label : null,
          otherCityText: selectedCityObj?.isOtherOption ? otherCityText.trim() : null,
          rankedExpertise,
          otherExpertiseText: hasOtherExpertiseSelected ? otherExpertiseText.trim() : null,
          totalBankingExperienceYears: parsedYears,
          experienceOverview: experienceOverview || null,
          engagementInterestSlugs: selectedInterests,
          participationConsent,
          communicationsConsent,
          referralCode: skipReferralAttribution ? null : referralCode || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (Array.isArray(data.details) && data.details.length > 0) {
          setSubmitError(data.details[0].message || data.error || 'Validation failed.');
        } else {
          setSubmitError(data.error || 'Unable to submit survey response.');
        }
        return;
      }

      setSubmissionSuccess({
        submissionId: data.submissionId,
        status: data.status,
        verificationExpiresAt: data.verificationExpiresAt,
      });
    } catch {
      setSubmitError('Network error while submitting your response. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="force-light flex flex-col min-h-screen bg-ghrm-bg text-ghrm-text">
      {/* Header */}
      <header className="px-4 lg:px-6 h-20 flex items-center border-b border-ghrm-border bg-white sticky top-0 z-50 shadow-sm">
        <Link href="/" className="flex items-center justify-center">
          <img src="/logo.png" alt="Global HRM Network" className="h-14 md:h-16 w-auto object-contain" />
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link href="/" className="text-sm font-semibold text-ghrm-navy hover:text-ghrm-primary transition-colors">
            Home
          </Link>
          <Link href="/about" className="text-sm font-semibold text-ghrm-navy hover:text-ghrm-primary transition-colors hidden md:inline-block">
            About
          </Link>
          <Link href="/how-it-works" className="text-sm font-semibold text-ghrm-navy hover:text-ghrm-primary transition-colors hidden md:inline-block">
            How It Works
          </Link>
          <Link href="/contact" className="text-sm font-semibold text-ghrm-navy hover:text-ghrm-primary transition-colors hidden md:inline-block">
            Contact
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-14 md:py-20 bg-gradient-to-b from-ghrm-bg-soft via-ghrm-bg to-white border-b border-ghrm-border">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-ghrm-border px-4 py-1.5 text-xs font-semibold text-ghrm-primary shadow-sm mb-5">
              <Sparkles className="h-3.5 w-3.5" />
              Pakistan Banking Sector Research
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl text-ghrm-navy">
              Pakistan Banking Expertise Map
            </h1>
            <p className="mt-4 text-base md:text-lg font-medium text-ghrm-navy max-w-2xl mx-auto">
              Be part of our inaugural initiative to connect the expertise shaping Pakistan’s banking sector.
            </p>
            <p className="mt-2 text-base md:text-lg text-ghrm-text-secondary leading-relaxed max-w-2xl mx-auto">
              Help map domain expertise, leadership capabilities, and strategic priorities across Pakistan&apos;s banking sector. Your verified profile contributes to anonymized industry benchmarking and future peer research.
            </p>
          </div>
        </section>

        {/* Form Container */}
        <section className="w-full py-12 md:py-16 bg-ghrm-bg/40">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            {dbOfflineNotice && !submissionSuccess && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Survey choices temporarily unavailable</p>
                  <p className="text-amber-800 mt-0.5">
                    Unable to load survey choices from the PostgreSQL database. Please verify the database connection and try refreshing.
                  </p>
                </div>
              </div>
            )}

            {referralValid && !submissionSuccess && (
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-ghrm-border bg-white p-4 text-sm shadow-sm">
                <div className="space-y-0.5">
                  <p className="font-semibold text-ghrm-navy">
                    {skipReferralAttribution
                      ? 'Continuing without referral attribution'
                      : 'You were invited via a colleague’s invitation link'}
                  </p>
                  <p className="text-xs text-ghrm-text-secondary">
                    {skipReferralAttribution
                      ? 'Your submission will be recorded without any referral link association.'
                      : 'Your participation can be associated privately with the person who shared this link. Your profile details remain confidential.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSkipReferralAttribution((prev) => !prev)}
                  className="shrink-0 text-xs"
                >
                  {skipReferralAttribution
                    ? 'Use invitation link'
                    : 'Continue without referral attribution'}
                </Button>
              </div>
            )}

            {submissionSuccess ? (
              <Card className="border-ghrm-border shadow-lg bg-white">
                <CardHeader className="text-center pb-4">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-50 border border-green-200">
                    <MailCheck className="h-7 w-7 text-ghrm-green" />
                  </div>
                  <CardTitle className="text-2xl text-ghrm-navy">
                    Submission Received — Verification Pending
                  </CardTitle>
                  <CardDescription className="text-base mt-2">
                    Thank you for contributing to the Pakistan Banking Expertise Map.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5 text-sm text-ghrm-text-secondary">
                  <div className="rounded-xl bg-ghrm-bg p-4 border border-ghrm-border space-y-2">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-ghrm-navy">Submission Reference:</span>
                      <span className="font-mono text-xs">{submissionSuccess.submissionId}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-ghrm-navy">Status:</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                        Pending Email Verification
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-ghrm-navy">Verification Valid Until:</span>
                      <span>{new Date(submissionSuccess.verificationExpiresAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <p>
                    Your response is saved as a pending submission until your official email address is verified. Verified profiles are linked across future Global HRM Network surveys so you will not need to re-enter your details.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2 justify-center">
                    <Button asChild variant="outline">
                      <Link href="/">Return to Home</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Section 1: Participant & Institution Details */}
                <Card className="border-ghrm-border shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl text-ghrm-navy flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-ghrm-primary" />
                      1. Participant &amp; Institution Profile
                    </CardTitle>
                    <CardDescription>
                      Your profile is stored once and linked to future Global HRM Network surveys.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="preferredName">
                          Preferred Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="preferredName"
                          value={preferredName}
                          onChange={(e) => setPreferredName(e.target.value)}
                          placeholder="e.g., Fawaz Alvi"
                          required
                          maxLength={120}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="officialEmail">
                          Official Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="officialEmail"
                          type="email"
                          value={officialEmail}
                          onChange={(e) => setOfficialEmail(e.target.value)}
                          placeholder="name@bank.com.pk"
                          required
                          maxLength={254}
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5" ref={comboboxRef}>
                      <Label htmlFor="institution-combobox">
                        Bank / Financial Institution <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <div className="relative flex items-center">
                          <Search className="pointer-events-none absolute left-3 h-4 w-4 text-ghrm-text-secondary" />
                          <Input
                            id="institution-combobox"
                            role="combobox"
                            aria-expanded={bankDropdownOpen}
                            aria-controls="institution-listbox"
                            aria-autocomplete="list"
                            value={
                              bankDropdownOpen
                                ? bankSearch
                                : selectedInstitution
                                  ? selectedInstitution.name
                                  : bankSearch
                            }
                            onFocus={() => {
                              setBankDropdownOpen(true);
                              setActiveOptionIndex(0);
                            }}
                            onChange={(e) => {
                              setBankSearch(e.target.value);
                              setBankDropdownOpen(true);
                              setActiveOptionIndex(0);
                            }}
                            onKeyDown={(e) => {
                              if (!bankDropdownOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
                                setBankDropdownOpen(true);
                                return;
                              }
                              if (e.key === 'Escape') {
                                setBankDropdownOpen(false);
                                return;
                              }
                              if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                setActiveOptionIndex((prev) =>
                                  Math.min(prev + 1, Math.max(0, flatSelectableInstitutions.length - 1))
                                );
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                setActiveOptionIndex((prev) => Math.max(prev - 1, 0));
                              } else if (
                                e.key === 'Enter' &&
                                bankDropdownOpen &&
                                flatSelectableInstitutions[activeOptionIndex]
                              ) {
                                e.preventDefault();
                                handleSelectInstitution(flatSelectableInstitutions[activeOptionIndex]);
                              }
                            }}
                            placeholder={
                              isLoadingMetadata
                                ? 'Loading institution directory...'
                                : 'Search by bank name, abbreviation (e.g., HBL, UBL), or former name...'
                            }
                            className="pl-9 pr-16 bg-white"
                          />
                          <div className="absolute right-2 flex items-center gap-1">
                            {selectedInstitution && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedInstitutionId('');
                                  setOtherInstitutionText('');
                                  setBankSearch('');
                                  setBankDropdownOpen(true);
                                }}
                                aria-label="Clear selected institution"
                                className="rounded p-1 text-ghrm-text-secondary hover:bg-ghrm-bg hover:text-ghrm-navy"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setBankDropdownOpen((prev) => !prev)}
                              aria-label="Toggle institution list"
                              className="rounded p-1 text-ghrm-text-secondary hover:bg-ghrm-bg"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {bankDropdownOpen && (
                          <div
                            id="institution-listbox"
                            role="listbox"
                            className="absolute z-40 mt-1.5 max-h-80 w-full overflow-y-auto rounded-xl border border-ghrm-border bg-white shadow-xl"
                          >
                            {isLoadingMetadata ? (
                              <div className="flex items-center gap-2 p-4 text-xs text-ghrm-text-secondary">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading Pakistan banking directory...
                              </div>
                            ) : groupedSelectableInstitutions.length === 0 &&
                              matchingHistoricalInstitutions.length === 0 ? (
                              <div className="p-4 text-xs text-ghrm-text-secondary space-y-2">
                                <p>No matching institution found in the directory.</p>
                                {institutions.find(
                                  (i) => i.operatingStatus === 'other_placeholder' || i.code === 'other_institution'
                                ) && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      const otherInst = institutions.find(
                                        (i) =>
                                          i.operatingStatus === 'other_placeholder' ||
                                          i.code === 'other_institution'
                                      );
                                      if (otherInst) {
                                        handleSelectInstitution(otherInst);
                                        setOtherInstitutionText(bankSearch.trim());
                                      }
                                    }}
                                  >
                                    Select “Other — please specify”
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <div className="py-1.5">
                                {matchingHistoricalInstitutions.length > 0 && (
                                  <div className="mx-2 mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950 space-y-1.5">
                                    {matchingHistoricalInstitutions.map((hist) => (
                                      <div key={hist.id} className="space-y-1">
                                        <p className="font-semibold">
                                          {hist.name} (Historical / Non-Active)
                                        </p>
                                        {hist.statusNote && (
                                          <p className="text-amber-900">{hist.statusNote}</p>
                                        )}
                                        {hist.successorInstitution && (
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="h-7 bg-white text-xs"
                                            onClick={() => {
                                              const successor = institutions.find(
                                                (i) => i.id === hist.successorInstitution?.id
                                              );
                                              if (successor) handleSelectInstitution(successor);
                                            }}
                                          >
                                            Select {hist.successorInstitution.name}
                                          </Button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {groupedSelectableInstitutions.map((group) => (
                                  <div key={group.category.id} className="mb-1">
                                    <div className="sticky top-0 bg-ghrm-bg/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-ghrm-text-secondary border-y border-ghrm-border/60">
                                      {group.category.name}
                                    </div>
                                    {group.items.map((inst) => {
                                      const isSelected = inst.id === selectedInstitutionId;
                                      const flatIdx = flatSelectableInstitutions.findIndex(
                                        (f) => f.id === inst.id
                                      );
                                      const isHighlighted = flatIdx === activeOptionIndex;
                                      const statusBadge = getStatusBadgeLabel(inst.operatingStatus);

                                      return (
                                        <button
                                          key={inst.id}
                                          type="button"
                                          role="option"
                                          aria-selected={isSelected}
                                          onClick={() => handleSelectInstitution(inst)}
                                          className={`w-full px-3 py-2.5 text-left text-sm flex items-start justify-between gap-2 transition-colors ${
                                            isSelected
                                              ? 'bg-ghrm-bg-soft text-ghrm-navy font-semibold'
                                              : isHighlighted
                                                ? 'bg-ghrm-bg text-ghrm-navy'
                                                : 'text-ghrm-navy hover:bg-ghrm-bg/70'
                                          }`}
                                        >
                                          <div className="min-w-0 space-y-0.5">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <span>{inst.name}</span>
                                              {inst.shortCode && (
                                                <span className="text-xs text-ghrm-text-secondary">
                                                  ({inst.shortCode})
                                                </span>
                                              )}
                                            </div>
                                            {statusBadge && (
                                              <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                                                {statusBadge}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            <span className="rounded-full border border-ghrm-border bg-white px-2 py-0.5 text-[10px] font-medium text-ghrm-text-secondary">
                                              {group.category.shortLabel}
                                            </span>
                                            {isSelected && (
                                              <Check className="h-4 w-4 text-ghrm-primary" />
                                            )}
                                          </div>
                                        </button>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {selectedInstitution && (
                        <div className="flex flex-wrap items-center gap-2 text-xs text-ghrm-text-secondary">
                          <span className="font-medium text-ghrm-navy">
                            Selected: {selectedInstitution.name}
                          </span>
                          {getStatusBadgeLabel(selectedInstitution.operatingStatus) && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-900">
                              {getStatusBadgeLabel(selectedInstitution.operatingStatus)}
                            </span>
                          )}
                        </div>
                      )}

                      {isOtherInstitutionSelected && (
                        <div className="mt-2 space-y-1.5 rounded-lg border border-ghrm-border bg-ghrm-bg/50 p-3">
                          <Label htmlFor="otherInstitutionText" className="text-xs font-semibold">
                            Please specify your Bank / Financial Institution <span className="text-red-500">*</span>
                          </Label>
                          <Input
                            id="otherInstitutionText"
                            value={otherInstitutionText}
                            onChange={(e) => setOtherInstitutionText(e.target.value)}
                            placeholder="Enter the full name of your institution"
                            required
                            maxLength={240}
                            className="bg-white"
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="designation">
                          Designation <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="designation"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          placeholder="e.g., VP – HR Digital Transformation"
                          required
                          maxLength={140}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="organizationalGrade">
                          Organizational Grade <span className="text-muted-foreground text-xs">(Optional)</span>
                        </Label>
                        <Input
                          id="organizationalGrade"
                          value={organizationalGrade}
                          onChange={(e) => setOrganizationalGrade(e.target.value)}
                          placeholder="e.g., EVP / SVP / VP / AVP / OG-I"
                          maxLength={60}
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="city-select">
                          City <span className="text-muted-foreground text-xs">(Optional)</span>
                        </Label>
                        <select
                          id="city-select"
                          value={selectedCityId}
                          onChange={(e) => {
                            setSelectedCityId(e.target.value);
                            const chosen = cities.find((c) => c.id === e.target.value);
                            if (!chosen?.isOtherOption) setOtherCityText('');
                          }}
                          className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          <option value="">Select city...</option>
                          {cities.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.label}
                            </option>
                          ))}
                        </select>
                        {selectedCityObj?.isOtherOption && (
                          <Input
                            id="otherCityText"
                            value={otherCityText}
                            onChange={(e) => setOtherCityText(e.target.value)}
                            placeholder="Please specify your city"
                            required
                            maxLength={120}
                            className="bg-white mt-2"
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="totalExperience">
                          Total Banking Experience (Years) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="totalExperience"
                          type="number"
                          min={0}
                          max={70}
                          step="0.5"
                          value={totalExperience}
                          onChange={(e) => setTotalExperience(e.target.value)}
                          placeholder="e.g., 14"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experienceOverview">
                        Brief Experience Overview <span className="text-muted-foreground text-xs">(Optional)</span>
                      </Label>
                      <Textarea
                        id="experienceOverview"
                        value={experienceOverview}
                        onChange={(e) => setExperienceOverview(e.target.value)}
                        placeholder="Briefly describe your core banking domain focus, transformation initiatives, or areas of leadership..."
                        rows={3}
                        maxLength={2000}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Section 2: Ranked Expertise Categories (Click-to-Rank Cards) */}
                <Card className="border-ghrm-border shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl text-ghrm-navy flex items-center gap-2">
                      <Award className="h-5 w-5 text-ghrm-primary" />
                      2. Ranked Banking Expertise (Up to 3) <span className="text-red-500">*</span>
                    </CardTitle>
                    <CardDescription>
                      Click up to 3 domains in order of strength — your 1st click sets Rank #1 (Primary), 2nd sets Rank #2, and 3rd sets Rank #3. Click a selected card again to remove it.
                      {isLoadingMetadata && ' Loading latest categories...'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Selected Ranking Summary Bar */}
                    <div className="rounded-xl border border-ghrm-border bg-ghrm-bg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-ghrm-navy">
                          Your Selected Ranking ({rankedSlugs.length}/3)
                        </span>
                        {rankedSlugs.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setRankedSlugs([])}
                            className="text-xs font-medium text-ghrm-primary hover:underline"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                      <div className="grid sm:grid-cols-3 gap-2.5">
                        {[0, 1, 2].map((slotIdx) => {
                          const slug = rankedSlugs[slotIdx];
                          const cat = categories.find((c) => c.slug === slug);
                          const rankLabel =
                            slotIdx === 0 ? 'Rank #1 (Primary)' : slotIdx === 1 ? 'Rank #2' : 'Rank #3';

                          return (
                            <div
                              key={slotIdx}
                              className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                                cat
                                  ? 'bg-white border-ghrm-primary shadow-sm text-ghrm-navy'
                                  : 'bg-white/60 border-dashed border-ghrm-border text-ghrm-text-secondary'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-[11px] text-ghrm-primary">
                                  {rankLabel}
                                </div>
                                <div className="truncate font-medium">
                                  {cat ? cat.name : slotIdx === 0 ? 'Required — click below' : 'Optional'}
                                </div>
                              </div>
                              {cat && (
                                <button
                                  type="button"
                                  onClick={() => toggleRankedCategory(cat.slug)}
                                  aria-label={`Remove ${cat.name}`}
                                  className="rounded-full p-1 text-ghrm-text-secondary hover:bg-ghrm-bg hover:text-ghrm-navy shrink-0"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Clickable Expertise Grid */}
                    <div className="grid sm:grid-cols-2 gap-3">
                      {categories.map((cat) => {
                        const rankIndex = rankedSlugs.indexOf(cat.slug);
                        const isSelected = rankIndex !== -1;
                        const isMaxReached = rankedSlugs.length >= 3 && !isSelected;

                        const badgeStyles =
                          rankIndex === 0
                            ? 'bg-ghrm-primary text-white'
                            : rankIndex === 1
                            ? 'bg-ghrm-green text-white'
                            : 'bg-ghrm-orange text-white';

                        return (
                          <button
                            key={cat.slug}
                            type="button"
                            onClick={() => toggleRankedCategory(cat.slug)}
                            disabled={isMaxReached}
                            aria-pressed={isSelected}
                            className={`text-left rounded-xl border p-4 transition-all flex items-start justify-between gap-3 ${
                              isSelected
                                ? 'border-ghrm-primary bg-ghrm-bg-soft/70 shadow-sm ring-1 ring-ghrm-primary/30'
                                : isMaxReached
                                ? 'border-ghrm-border bg-slate-50 opacity-55 cursor-not-allowed'
                                : 'border-ghrm-border bg-white hover:border-ghrm-primary/60 hover:bg-ghrm-bg/50 cursor-pointer'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-ghrm-navy leading-snug">
                                {cat.name}
                              </div>
                              {cat.description && (
                                <p className="text-xs text-ghrm-text-secondary leading-relaxed">
                                  {cat.description}
                                </p>
                              )}
                            </div>
                            <span
                              className={`shrink-0 inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-bold min-w-[2.25rem] ${
                                isSelected
                                  ? badgeStyles
                                  : 'bg-ghrm-bg border border-ghrm-border text-ghrm-text-secondary'
                              }`}
                            >
                              {isSelected ? `#${rankIndex + 1}` : '+'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {hasOtherExpertiseSelected && (
                      <div className="space-y-2 rounded-xl border border-ghrm-border bg-ghrm-bg/50 p-4">
                        <Label htmlFor="otherExpertiseText" className="text-sm font-semibold text-ghrm-navy">
                          Please specify your “Other” area of expertise <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="otherExpertiseText"
                          value={otherExpertiseText}
                          onChange={(e) => setOtherExpertiseText(e.target.value)}
                          placeholder="Describe your banking expertise domain"
                          required
                          maxLength={240}
                          className="bg-white"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Section 3: Engagement Interests & Referral */}
                <Card className="border-ghrm-border shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl text-ghrm-navy flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-ghrm-primary" />
                      3. Engagement Interests &amp; Attribution
                    </CardTitle>
                    <CardDescription>
                      Optional — let us know how you would like to engage with the Global HRM Network.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex items-center justify-between text-xs text-ghrm-text-secondary">
                      <span className="font-semibold text-ghrm-navy">
                        Selected Interests ({selectedInterests.length}/{interests.length})
                      </span>
                      {selectedInterests.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedInterests([])}
                          className="font-medium text-ghrm-primary hover:underline"
                        >
                          Clear all
                        </button>
                      )}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {interests.map((interest) => {
                        const checked = selectedInterests.includes(interest.slug);
                        return (
                          <button
                            key={interest.slug}
                            type="button"
                            onClick={() => toggleInterest(interest.slug)}
                            aria-pressed={checked}
                            className={`text-left rounded-xl border p-4 transition-all flex items-start justify-between gap-3 cursor-pointer ${
                              checked
                                ? 'border-ghrm-primary bg-ghrm-bg-soft/70 shadow-sm ring-1 ring-ghrm-primary/30'
                                : 'border-ghrm-border bg-white hover:border-ghrm-primary/60 hover:bg-ghrm-bg/50'
                            }`}
                          >
                            <div className="space-y-1">
                              <div className="text-sm font-semibold text-ghrm-navy leading-snug">
                                {interest.label}
                              </div>
                              {interest.description && (
                                <p className="text-xs text-ghrm-text-secondary leading-relaxed">
                                  {interest.description}
                                </p>
                              )}
                            </div>
                            <span
                              className={`shrink-0 inline-flex items-center justify-center rounded-full h-7 w-7 text-xs font-bold transition-colors ${
                                checked
                                  ? 'bg-ghrm-primary text-white'
                                  : 'bg-ghrm-bg border border-ghrm-border text-ghrm-text-secondary'
                              }`}
                            >
                              {checked ? <Check className="h-4 w-4" /> : '+'}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-2 pt-2">
                      <Label htmlFor="referralCode">
                        Referral Code / Attribution <span className="text-muted-foreground text-xs">(Optional)</span>
                      </Label>
                      <Input
                        id="referralCode"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value)}
                        placeholder="If someone invited you, enter their referral code"
                        maxLength={64}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Section 4: Consent */}
                <Card className="border-ghrm-border shadow-sm bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl text-ghrm-navy flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-ghrm-primary" />
                      4. Participation &amp; Communications Consent
                    </CardTitle>
                    <CardDescription>
                      Click each card below to confirm your consent preferences.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <button
                      type="button"
                      onClick={() => setParticipationConsent((prev) => !prev)}
                      aria-pressed={participationConsent}
                      className={`w-full text-left rounded-xl border p-4 transition-all flex items-start justify-between gap-4 cursor-pointer ${
                        participationConsent
                          ? 'border-ghrm-green bg-green-50/60 shadow-sm ring-1 ring-ghrm-green/30'
                          : 'border-ghrm-border bg-ghrm-bg/40 hover:border-ghrm-primary/60'
                      }`}
                    >
                      <div className="text-sm leading-relaxed space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-ghrm-navy">
                            Participation Consent
                          </span>
                          <span className="rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-semibold text-red-700">
                            Required
                          </span>
                        </div>
                        <p className="text-ghrm-text-secondary">
                          I consent to participate in the Pakistan Banking Expertise Map survey and allow Global HRM Network to process my submission in accordance with the{' '}
                          <Link
                            href="/privacy"
                            onClick={(e) => e.stopPropagation()}
                            className="text-ghrm-primary underline font-medium"
                          >
                            Privacy Policy
                          </Link>
                          .
                        </p>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                          participationConsent
                            ? 'bg-ghrm-green text-white'
                            : 'bg-white border border-ghrm-border text-ghrm-text-secondary'
                        }`}
                      >
                        {participationConsent ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Agreed
                          </>
                        ) : (
                          'Click to agree'
                        )}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCommunicationsConsent((prev) => !prev)}
                      aria-pressed={communicationsConsent}
                      className={`w-full text-left rounded-xl border p-4 transition-all flex items-start justify-between gap-4 cursor-pointer ${
                        communicationsConsent
                          ? 'border-ghrm-primary bg-ghrm-bg-soft/70 shadow-sm ring-1 ring-ghrm-primary/30'
                          : 'border-ghrm-border bg-white hover:border-ghrm-primary/60 hover:bg-ghrm-bg/40'
                      }`}
                    >
                      <div className="text-sm leading-relaxed space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-ghrm-navy">
                            Communications Consent
                          </span>
                          <span className="rounded-full bg-ghrm-bg border border-ghrm-border px-2 py-0.5 text-[11px] font-medium text-ghrm-text-secondary">
                            Optional
                          </span>
                        </div>
                        <p className="text-ghrm-text-secondary">
                          I agree to receive survey findings, roundtable invitations, and future research updates from Global HRM Network.
                        </p>
                      </div>
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                          communicationsConsent
                            ? 'bg-ghrm-primary text-white'
                            : 'bg-ghrm-bg border border-ghrm-border text-ghrm-text-secondary'
                        }`}
                      >
                        {communicationsConsent ? (
                          <>
                            <Check className="h-3.5 w-3.5" />
                            Subscribed
                          </>
                        ) : (
                          'Optional'
                        )}
                      </span>
                    </button>
                  </CardContent>
                </Card>

                {submitError && (
                  <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <p>{submitError}</p>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto bg-ghrm-primary hover:bg-ghrm-primary-dark text-white px-8"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting Response...
                      </>
                    ) : (
                      'Submit Survey Response'
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* Footer Accent Line */}
      <div className="h-1.5 w-full bg-gradient-to-r from-ghrm-orange via-ghrm-green-soft to-ghrm-primary-light" />
      <footer className="bg-ghrm-primary-dark text-white py-12">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2.5 rounded-full shadow-md flex items-center justify-center shrink-0">
              <Icons.logo className="h-12 w-12" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl text-white tracking-tight">Global HRM Network</span>
              <span className="text-sm text-white/70">&copy; {year} All rights reserved.</span>
            </div>
          </div>
          <nav className="flex gap-4 sm:gap-6 mt-4 md:mt-0 flex-wrap justify-center">
            <Link href="/about" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
              About
            </Link>
            <Link href="/products" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
              Products
            </Link>
            <Link href="/how-it-works" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
              How It Works
            </Link>
            <Link href="/pricing" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
              Pricing
            </Link>
            <Link href="/certifications" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
              Certifications
            </Link>
            <Link href="/privacy" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
              Terms of Use
            </Link>
            <Link href="/contact" className="text-sm hover:underline hover:text-white transition-colors text-white/70">
              Contact
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default function PakistanBankingMapSurveyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-ghrm-primary" />
        </div>
      }
    >
      <PakistanBankingMapSurveyContent />
    </Suspense>
  );
}
