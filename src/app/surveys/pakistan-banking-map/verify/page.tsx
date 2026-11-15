'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/frontend/components/ui/button';
import { Input } from '@/frontend/components/ui/input';
import { Label } from '@/frontend/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/frontend/components/ui/card';
import { Icons } from '@/frontend/components/icons';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
  Plus,
  Send,
  Share2,
  Trash2,
  Users,
} from 'lucide-react';

interface SentInvitationRecord {
  id: string;
  invitedPreferredName: string | null;
  invitedEmail: string;
  status: string;
  invitedAt: string;
  deliveryMessage?: string;
}

interface ColleagueDraft {
  id: string;
  preferredName: string;
  officialEmail: string;
}

function VerifySurveyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [message, setMessage] = useState(
    'Verifying your email and confirming your survey participation...'
  );
  const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
  const [finishedLater, setFinishedLater] = useState(false);

  // Referral state
  const [preferredName, setPreferredName] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [maxInvitations, setMaxInvitations] = useState(3);
  const [remainingInvitations, setRemainingInvitations] = useState(3);
  const [sentInvitations, setSentInvitations] = useState<SentInvitationRecord[]>([]);
  const [origin, setOrigin] = useState('');

  // Option A: Share Link state
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // Option B: Invite by Email state
  const [activeOption, setActiveOption] = useState<'link' | 'email'>('link');
  const [colleagues, setColleagues] = useState<ColleagueDraft[]>([
    { id: 'row-1', preferredName: '', officialEmail: '' },
  ]);
  const [permissionConfirmed, setPermissionConfirmed] = useState(false);
  const [isSendingInvites, setIsSendingInvites] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccessMsg, setInviteSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
      setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadOrVerify() {
      if (token) {
        try {
          const res = await fetch('/api/surveys/pakistan-banking-map/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          });
          const data = await res.json();
          if (!active) return;

          if (!res.ok) {
            // Fall back to checking if an active referral session already exists
            const sessionRes = await fetch('/api/surveys/pakistan-banking-map/invitations');
            if (sessionRes.ok) {
              const sessionData = await sessionRes.json();
              if (!active) return;
              setStatus('success');
              setMessage('Your official email is verified and your survey participation is confirmed.');
              setPreferredName(sessionData.preferredName || '');
              setReferralCode(sessionData.referralCode || '');
              setMaxInvitations(sessionData.maxInvitations ?? 3);
              setRemainingInvitations(sessionData.remainingInvitations ?? 3);
              setSentInvitations(sessionData.invitations || []);
              return;
            }
            setStatus('error');
            setMessage(data.error || 'Unable to verify this submission.');
            return;
          }

          setStatus('success');
          setVerifiedAt(data.verifiedAt || null);
          setMessage(
            'Your official email has been verified and your survey participation is now confirmed.'
          );
          setPreferredName(data.preferredName || '');
          setReferralCode(data.referralCode || '');
          setMaxInvitations(data.maxInvitations ?? 3);
          setRemainingInvitations(data.remainingInvitations ?? 3);
          setSentInvitations(data.invitations || []);
        } catch {
          if (!active) return;
          setStatus('error');
          setMessage('Network error while verifying your submission. Please try again.');
        }
        return;
      }

      // No token in query string — check for active verified referral session cookie
      try {
        const sessionRes = await fetch('/api/surveys/pakistan-banking-map/invitations');
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (!active) return;
          setStatus('success');
          setMessage('Your official email is verified and your survey participation is confirmed.');
          setPreferredName(sessionData.preferredName || '');
          setReferralCode(sessionData.referralCode || '');
          setMaxInvitations(sessionData.maxInvitations ?? 3);
          setRemainingInvitations(sessionData.remainingInvitations ?? 3);
          setSentInvitations(sessionData.invitations || []);
          return;
        }
      } catch {
        // Ignore and fall through to missing token error
      }

      if (!active) return;
      setStatus('error');
      setMessage('Missing verification token. Please use the full verification link from your email.');
    }

    loadOrVerify();
    return () => {
      active = false;
    };
  }, [token]);

  const referralUrl = useMemo(() => {
    if (!referralCode || !origin) return '';
    return `${origin}/surveys/pakistan-banking-map?ref=${encodeURIComponent(referralCode)}`;
  }, [referralCode, origin]);

  const sharingMessage = useMemo(() => {
    if (!referralUrl) return '';
    return `I’m participating in Global HRM Network’s Pakistan Banking Expertise Map, an initiative to understand the experience and expertise of banking professionals across Pakistan. Please consider contributing your professional profile—it takes approximately 3 minutes: ${referralUrl}`;
  }, [referralUrl]);

  const handleCopyLink = async () => {
    if (!referralUrl) return;
    setShareFeedback(null);
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setShareFeedback('Could not copy automatically. Please select and copy the link manually.');
    }
  };

  const handleNativeShare = async () => {
    if (!referralUrl) return;
    setShareFeedback(null);
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Pakistan Banking Expertise Map',
          text: sharingMessage,
          url: referralUrl,
        });
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }
    await handleCopyLink();
  };

  const addColleagueRow = () => {
    if (colleagues.length >= remainingInvitations) return;
    setColleagues((prev) => [
      ...prev,
      { id: `row-${Date.now()}-${prev.length + 1}`, preferredName: '', officialEmail: '' },
    ]);
  };

  const removeColleagueRow = (id: string) => {
    if (colleagues.length <= 1) return;
    setColleagues((prev) => prev.filter((row) => row.id !== id));
  };

  const updateColleagueRow = (id: string, field: 'preferredName' | 'officialEmail', value: string) => {
    setColleagues((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleSendInvitations = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setInviteSuccessMsg(null);

    if (remainingInvitations <= 0) {
      setInviteError(`You have already used all ${maxInvitations} invitations for this campaign.`);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const row of colleagues) {
      if (!row.officialEmail.trim() || !emailRegex.test(row.officialEmail.trim())) {
        setInviteError('Please enter a valid official email address for each colleague.');
        return;
      }
    }

    if (!permissionConfirmed) {
      setInviteError(
        'Please confirm that you have permission to share these email addresses with Global HRM Network.'
      );
      return;
    }

    setIsSendingInvites(true);
    try {
      const res = await fetch('/api/surveys/pakistan-banking-map/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissionConfirmed,
          colleagues: colleagues.map((c) => ({
            preferredName: c.preferredName.trim() || null,
            officialEmail: c.officialEmail.trim(),
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (Array.isArray(data.details) && data.details.length > 0) {
          setInviteError(data.details[0].message || data.error || 'Validation failed.');
        } else {
          setInviteError(data.error || 'Unable to send invitations.');
        }
        return;
      }

      setRemainingInvitations(data.remainingInvitations ?? 0);
      setSentInvitations(data.invitations || []);
      setPermissionConfirmed(false);
      setColleagues([{ id: `row-${Date.now()}`, preferredName: '', officialEmail: '' }]);

      const sentCount = Array.isArray(data.sentResults)
        ? data.sentResults.filter((r: SentInvitationRecord) => r.status === 'sent').length
        : 0;
      const failedCount = Array.isArray(data.sentResults)
        ? data.sentResults.filter((r: SentInvitationRecord) => r.status === 'failed').length
        : 0;

      if (failedCount > 0 && sentCount === 0) {
        setInviteError(
          'Your invitation(s) were recorded, but the server could not dispatch the email(s) at this time.'
        );
      } else if (failedCount > 0) {
        setInviteSuccessMsg(
          `${sentCount} invitation(s) sent successfully; ${failedCount} could not be delivered.`
        );
      } else {
        setInviteSuccessMsg(`${sentCount} invitation email(s) sent via Global HRM Network.`);
      }
    } catch {
      setInviteError('Network error while sending invitations. Please try again.');
    } finally {
      setIsSendingInvites(false);
    }
  };

  const whatsappHref = referralUrl
    ? `https://wa.me/?text=${encodeURIComponent(sharingMessage)}`
    : '#';
  const mailtoHref = referralUrl
    ? `mailto:?subject=${encodeURIComponent(
        'Invitation: Pakistan Banking Expertise Map'
      )}&body=${encodeURIComponent(sharingMessage)}`
    : '#';

  return (
    <div className="force-light min-h-screen flex flex-col bg-ghrm-bg/40 text-ghrm-text">
      <header className="px-4 lg:px-6 h-20 flex items-center border-b border-ghrm-border bg-white sticky top-0 z-50 shadow-sm">
        <Link href="/" className="flex items-center justify-center">
          <img src="/logo.png" alt="Global HRM Network" className="h-14 md:h-16 w-auto object-contain" />
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link href="/" className="text-sm font-semibold text-ghrm-navy hover:text-ghrm-primary transition-colors">
            Home
          </Link>
          <Link href="/surveys/pakistan-banking-map" className="text-sm font-semibold text-ghrm-navy hover:text-ghrm-primary transition-colors">
            Survey
          </Link>
        </nav>
      </header>

      <main className="flex-1 py-10 md:py-14 px-4">
        <div className="container mx-auto max-w-3xl space-y-8">
          {/* Verification Status Card */}
          <Card className="border-ghrm-border shadow-sm bg-white">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-ghrm-bg border border-ghrm-border">
                {status === 'verifying' && (
                  <Loader2 className="h-7 w-7 animate-spin text-ghrm-primary" />
                )}
                {status === 'success' && (
                  <CheckCircle2 className="h-7 w-7 text-ghrm-green" />
                )}
                {status === 'error' && (
                  <AlertCircle className="h-7 w-7 text-red-600" />
                )}
              </div>
              <CardTitle className="text-2xl text-ghrm-navy">
                {status === 'verifying' && 'Verifying Submission'}
                {status === 'success' && 'Email Verified — Participation Confirmed'}
                {status === 'error' && 'Verification Failed'}
              </CardTitle>
              <CardDescription className="text-base mt-1">{message}</CardDescription>
            </CardHeader>
            {status !== 'success' && (
              <CardContent className="text-center space-y-4">
                <div className="flex justify-center gap-3 pt-2">
                  <Button asChild variant="outline">
                    <Link href="/surveys/pakistan-banking-map">Back to Survey</Link>
                  </Button>
                  <Button asChild className="bg-ghrm-primary hover:bg-ghrm-primary-dark text-white">
                    <Link href="/">Return Home</Link>
                  </Button>
                </div>
              </CardContent>
            )}
            {status === 'success' && verifiedAt && (
              <CardContent className="pt-0 text-center">
                <p className="text-xs text-ghrm-text-secondary">
                  Verified on {new Date(verifiedAt).toLocaleString()}
                </p>
              </CardContent>
            )}
          </Card>

          {/* Optional Referral Section after verification */}
          {status === 'success' && !finishedLater && (
            <Card className="border-ghrm-border shadow-md bg-white">
              <CardHeader className="border-b border-ghrm-border bg-ghrm-bg/50 rounded-t-xl">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-ghrm-primary">
                      <Users className="h-4 w-4" />
                      Optional — Peer Invitation
                    </div>
                    <CardTitle className="text-2xl text-ghrm-navy">
                      Help Us Connect Pakistan’s Banking Professionals
                    </CardTitle>
                    <CardDescription className="text-sm text-ghrm-text-secondary leading-relaxed">
                      Invite two or three colleagues you have worked with to contribute their experience. Share your personal invitation link or send them an email invitation through Global HRM Network.
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFinishedLater(true)}
                    className="shrink-0 border-ghrm-border text-ghrm-navy hover:bg-ghrm-bg"
                  >
                    Finish — Maybe Later
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {/* Two Clearly Distinguishable Option Switchers */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveOption('link')}
                    className={`text-left rounded-xl border p-4 transition-all flex items-start gap-3 cursor-pointer ${
                      activeOption === 'link'
                        ? 'border-ghrm-primary bg-ghrm-bg-soft/70 shadow-sm ring-1 ring-ghrm-primary/30'
                        : 'border-ghrm-border bg-white hover:bg-ghrm-bg/40'
                    }`}
                  >
                    <div
                      className={`rounded-lg p-2 shrink-0 ${
                        activeOption === 'link'
                          ? 'bg-ghrm-primary text-white'
                          : 'bg-ghrm-bg text-ghrm-primary'
                      }`}
                    >
                      <Link2 className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-ghrm-navy text-sm">
                        Share My Invitation Link
                      </div>
                      <p className="text-xs text-ghrm-text-secondary mt-0.5">
                        Copy or share your personal link via WhatsApp, email, or mobile share.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveOption('email')}
                    className={`text-left rounded-xl border p-4 transition-all flex items-start gap-3 cursor-pointer ${
                      activeOption === 'email'
                        ? 'border-ghrm-primary bg-ghrm-bg-soft/70 shadow-sm ring-1 ring-ghrm-primary/30'
                        : 'border-ghrm-border bg-white hover:bg-ghrm-bg/40'
                    }`}
                  >
                    <div
                      className={`rounded-lg p-2 shrink-0 ${
                        activeOption === 'email'
                          ? 'bg-ghrm-primary text-white'
                          : 'bg-ghrm-bg text-ghrm-primary'
                      }`}
                    >
                      <Mail className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-ghrm-navy text-sm">
                        Invite by Email ({remainingInvitations} of {maxInvitations} left)
                      </div>
                      <p className="text-xs text-ghrm-text-secondary mt-0.5">
                        Send up to {maxInvitations} official email invitations through Global HRM Network.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Option A: Share My Invitation Link */}
                {activeOption === 'link' && (
                  <div className="space-y-5 rounded-xl border border-ghrm-border bg-ghrm-bg/30 p-5">
                    <div className="space-y-2">
                      <Label htmlFor="referralLinkInput" className="text-ghrm-navy font-semibold">
                        Your Personal Invitation Link
                      </Label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          id="referralLinkInput"
                          readOnly
                          value={referralUrl || 'Generating link...'}
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                          className="bg-white font-mono text-xs sm:text-sm"
                        />
                        <Button
                          type="button"
                          onClick={handleCopyLink}
                          disabled={!referralUrl}
                          className="bg-ghrm-primary hover:bg-ghrm-primary-dark text-white shrink-0"
                        >
                          {copied ? (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Link
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button asChild variant="outline" className="bg-white border-ghrm-border">
                        <a href={whatsappHref} target="_blank" rel="noopener noreferrer">
                          <MessageCircle className="mr-2 h-4 w-4 text-green-600" />
                          Share on WhatsApp
                        </a>
                      </Button>

                      <Button asChild variant="outline" className="bg-white border-ghrm-border">
                        <a href={mailtoHref}>
                          <Mail className="mr-2 h-4 w-4 text-ghrm-primary" />
                          Share by Email
                        </a>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleNativeShare}
                        disabled={!referralUrl}
                        className="bg-white border-ghrm-border"
                      >
                        <Share2 className="mr-2 h-4 w-4 text-ghrm-navy" />
                        {canNativeShare ? 'Share via Device' : 'Share'}
                      </Button>
                    </div>

                    {shareFeedback && (
                      <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                        {shareFeedback}
                      </p>
                    )}

                    <div className="rounded-lg bg-white border border-ghrm-border p-3.5 text-xs text-ghrm-text-secondary space-y-1">
                      <p className="font-semibold text-ghrm-navy">Suggested sharing message:</p>
                      <p className="italic leading-relaxed">{sharingMessage}</p>
                    </div>
                  </div>
                )}

                {/* Option B: Invite by Email */}
                {activeOption === 'email' && (
                  <div className="space-y-5 rounded-xl border border-ghrm-border bg-ghrm-bg/30 p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-ghrm-navy">
                        Send Email Invitations via Global HRM Network
                      </div>
                      <span className="rounded-full bg-white border border-ghrm-border px-3 py-1 text-xs font-semibold text-ghrm-primary">
                        {remainingInvitations} of {maxInvitations} invitations remaining
                      </span>
                    </div>

                    {remainingInvitations > 0 ? (
                      <form onSubmit={handleSendInvitations} className="space-y-4">
                        <div className="space-y-3">
                          {colleagues.map((row, idx) => (
                            <div
                              key={row.id}
                              className="rounded-xl border border-ghrm-border bg-white p-4 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold uppercase tracking-wider text-ghrm-navy">
                                  Colleague #{idx + 1}
                                </span>
                                {colleagues.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeColleagueRow(row.id)}
                                    className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Remove
                                  </button>
                                )}
                              </div>
                              <div className="grid sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                  <Label htmlFor={`colleague-name-${row.id}`}>
                                    Colleague’s preferred name{' '}
                                    <span className="text-xs text-muted-foreground">(Optional)</span>
                                  </Label>
                                  <Input
                                    id={`colleague-name-${row.id}`}
                                    value={row.preferredName}
                                    onChange={(e) =>
                                      updateColleagueRow(row.id, 'preferredName', e.target.value)
                                    }
                                    placeholder="e.g., Hina Saqib"
                                    maxLength={120}
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label htmlFor={`colleague-email-${row.id}`}>
                                    Colleague’s official email address{' '}
                                    <span className="text-red-500">*</span>
                                  </Label>
                                  <Input
                                    id={`colleague-email-${row.id}`}
                                    type="email"
                                    required
                                    value={row.officialEmail}
                                    onChange={(e) =>
                                      updateColleagueRow(row.id, 'officialEmail', e.target.value)
                                    }
                                    placeholder="colleague@bank.com.pk"
                                    maxLength={254}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {colleagues.length < remainingInvitations && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={addColleagueRow}
                            className="bg-white border-ghrm-border text-ghrm-navy"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Another Colleague
                          </Button>
                        )}

                        <p className="text-xs text-ghrm-text-secondary">
                          The invitation will identify you by your preferred name
                          {preferredName ? ` (${preferredName})` : ''}. Your colleagues can choose whether to participate.
                        </p>

                        <button
                          type="button"
                          onClick={() => setPermissionConfirmed((prev) => !prev)}
                          aria-pressed={permissionConfirmed}
                          className={`w-full text-left rounded-xl border p-4 transition-all flex items-start justify-between gap-3 cursor-pointer ${
                            permissionConfirmed
                              ? 'border-ghrm-green bg-green-50/70 ring-1 ring-ghrm-green/30'
                              : 'border-ghrm-border bg-white hover:border-ghrm-primary/60'
                          }`}
                        >
                          <span className="text-sm text-ghrm-navy font-medium leading-snug">
                            I have permission to share these email addresses with Global HRM Network for this invitation.{' '}
                            <span className="text-red-500">*</span>
                          </span>
                          <span
                            className={`shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                              permissionConfirmed
                                ? 'bg-ghrm-green text-white'
                                : 'bg-ghrm-bg border border-ghrm-border text-ghrm-text-secondary'
                            }`}
                          >
                            {permissionConfirmed ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                Confirmed
                              </>
                            ) : (
                              'Click to confirm'
                            )}
                          </span>
                        </button>

                        {inviteError && (
                          <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800">
                            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                            <p>{inviteError}</p>
                          </div>
                        )}

                        {inviteSuccessMsg && (
                          <div className="flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 p-3.5 text-sm text-green-900">
                            <CheckCircle2 className="h-4 w-4 text-ghrm-green shrink-0 mt-0.5" />
                            <p>{inviteSuccessMsg}</p>
                          </div>
                        )}

                        <div className="flex justify-end">
                          <Button
                            type="submit"
                            disabled={isSendingInvites}
                            className="bg-ghrm-primary hover:bg-ghrm-primary-dark text-white"
                          >
                            {isSendingInvites ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Sending Invitations...
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                Send Invitations
                              </>
                            )}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className="rounded-xl border border-ghrm-border bg-white p-4 text-sm text-ghrm-text-secondary">
                        You have reached the maximum of {maxInvitations} email invitations for this campaign. You can still share your personal invitation link anytime!
                      </div>
                    )}

                    {/* Previously sent invitations */}
                    {sentInvitations.length > 0 && (
                      <div className="pt-2 space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wider text-ghrm-navy">
                          Invitations Sent ({sentInvitations.length}/{maxInvitations})
                        </div>
                        <div className="space-y-2">
                          {sentInvitations.map((inv) => (
                            <div
                              key={inv.id}
                              className="flex items-center justify-between gap-2 rounded-lg border border-ghrm-border bg-white px-3.5 py-2.5 text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-ghrm-navy">
                                  {inv.invitedPreferredName || inv.invitedEmail}
                                </span>
                                {inv.invitedPreferredName && (
                                  <span className="text-ghrm-text-secondary ml-1.5">
                                    ({inv.invitedEmail})
                                  </span>
                                )}
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-0.5 font-semibold capitalize ${
                                  inv.status === 'accepted'
                                    ? 'bg-green-100 text-green-800'
                                    : inv.status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-ghrm-bg text-ghrm-primary'
                                }`}
                              >
                                {inv.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-2 border-t border-ghrm-border">
                  <span className="text-xs text-ghrm-text-secondary">
                    Inviting colleagues is completely optional.
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setFinishedLater(true)}
                    className="text-ghrm-navy hover:bg-ghrm-bg"
                  >
                    Finish — Maybe Later
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Completed / Skipped Referral State */}
          {status === 'success' && finishedLater && (
            <Card className="border-ghrm-border shadow-sm bg-white text-center">
              <CardContent className="py-8 space-y-4">
                <p className="text-base font-medium text-ghrm-navy">
                  Thank you for contributing to the Pakistan Banking Expertise Map.
                </p>
                <div className="flex justify-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFinishedLater(false)}
                  >
                    Invite Colleagues
                  </Button>
                  <Button asChild className="bg-ghrm-primary hover:bg-ghrm-primary-dark text-white">
                    <Link href="/">Return Home</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <div className="h-1.5 w-full bg-gradient-to-r from-ghrm-orange via-ghrm-green-soft to-ghrm-primary-light" />
      <footer className="bg-ghrm-primary-dark text-white py-10">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-full shadow-md flex items-center justify-center shrink-0">
              <Icons.logo className="h-10 w-10" />
            </div>
            <span className="font-bold text-lg text-white tracking-tight">Global HRM Network</span>
          </div>
          <nav className="flex gap-4 sm:gap-6 flex-wrap justify-center text-sm text-white/70">
            <Link href="/about" className="hover:text-white hover:underline">About</Link>
            <Link href="/privacy" className="hover:text-white hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white hover:underline">Terms of Use</Link>
            <Link href="/contact" className="hover:text-white hover:underline">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default function VerifySurveyPage() {
  return (
    <Suspense
      fallback={
        <div className="force-light min-h-screen flex items-center justify-center bg-background text-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-ghrm-primary" />
        </div>
      }
    >
      <VerifySurveyContent />
    </Suspense>
  );
}
