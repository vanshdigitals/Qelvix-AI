'use client';

import {
  AlertCircle,
  Check,
  ChevronRight,
  ExternalLink,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Logo } from '@/components/layout/Logo';
import { SurfaceField } from '@/components/marketing/SurfaceField';
import {
  finishOnboarding,
  generateVerifyToken,
  getOnboarding,
  OnboardingError,
  saveDomain,
  saveOnboardingStep,
  verifyDomain,
  type OnboardingState,
} from '@/lib/api/onboarding';
import { cn } from '@/lib/utils/cn';

export type OnboardingStep =
  | 'welcome'
  | 'business'
  | 'industry'
  | 'domain'
  | 'verify'
  | 'size'
  | 'team'
  | 'notify'
  | 'scan'
  | 'report';

// Domain verification is a hard gate; it sits right after the domain is entered
// and the flow cannot advance past it until the backend confirms the TXT record.
const FLOW: OnboardingStep[] = [
  'welcome',
  'business',
  'industry',
  'domain',
  'verify',
  'size',
  'team',
  'notify',
  'scan',
  'report',
];

const STEPPER: { key: OnboardingStep; label: string }[] = [
  { key: 'business', label: 'Business' },
  { key: 'industry', label: 'Industry' },
  { key: 'domain', label: 'Domain' },
  { key: 'verify', label: 'Verify' },
  { key: 'size', label: 'Size' },
  { key: 'team', label: 'Team' },
  { key: 'notify', label: 'Alerts' },
];

const STEP_TITLES: Record<OnboardingStep, string> = {
  welcome: 'Welcome to Qelvix',
  business: 'About your business',
  industry: 'What does the business do?',
  domain: 'Which domain should we monitor?',
  verify: 'Verify domain ownership',
  size: 'How many people work here?',
  team: 'Invite the people who fix things',
  notify: 'Notification setup',
  scan: 'Your first scan',
  report: 'You are all set',
};

// What each step is for — shown to the user so they always know why we ask.
const STEP_WHY: Record<OnboardingStep, string> = {
  welcome: '',
  business: 'This appears on the reports you share with banks, clients, or auditors.',
  industry: 'Industry sets your DPDP clause defaults and the benchmarks we compare you against.',
  domain: 'We only scan a domain after you prove you own it. Nothing is scanned before that.',
  verify: 'Proving ownership stops anyone scanning a domain that is not theirs.',
  size: 'Used only for scan scheduling and seat limits.',
  team: 'Usually whoever runs your website or IT. You can also do this later from Settings.',
  notify: 'Critical findings always reach you. Choose how the rest are delivered.',
  scan: '',
  report: '',
};

// Steps a user may skip. Skipping still advances one step; it never jumps the gate.
const SKIPPABLE = new Set<OnboardingStep>(['industry', 'size', 'team']);

// Maps the backend's onboarding_step to the wizard step to resume on.
const BACKEND_STEP_TO_WIZARD: Record<string, OnboardingStep> = {
  business: 'business',
  industry: 'industry',
  domain: 'domain',
  verify: 'verify',
  size: 'size',
  team: 'team',
  notify: 'notify',
};

const INDUSTRIES = [
  { label: 'Manufacturing', note: 'Plant, ERP, vendor portals' },
  { label: 'Export / Trade', note: 'Cross-border data, DPDP §16' },
  { label: 'Professional services', note: 'Client records, CA firms' },
  { label: 'Retail / D2C', note: 'Payments, customer PII' },
  { label: 'Logistics', note: 'Fleet, tracking APIs' },
  { label: 'Other', note: "We'll use general defaults" },
] as const;

const SIZES = [
  { label: '1–10', note: 'Freemium fits' },
  { label: '11–50', note: 'Starter' },
  { label: '51–250', note: 'Growth' },
  { label: '250+', note: 'Talk to us' },
] as const;

const COUNTRY_CODES = ['+91', '+1', '+44', '+65', '+971'] as const;

const DOMAIN_RE = /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.[a-z0-9-]{1,63})+$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Invite {
  email: string;
  role: 'Admin' | 'Member';
}

type VerifyStatus = 'idle' | 'checking' | 'verified' | 'failed';

export function OnboardingWizard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<OnboardingStep>('welcome');

  // Form fields
  const [orgName, setOrgName] = useState('');
  const [gst, setGst] = useState('');
  const [contact, setContact] = useState('');
  const [domain, setDomain] = useState('');
  const [domainTouched, setDomainTouched] = useState(false);
  const [industry, setIndustry] = useState<string>('Manufacturing');
  const [size, setSize] = useState<string>('11–50');
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [whatsapp, setWhatsapp] = useState('');
  const [emailOnly, setEmailOnly] = useState(false);
  const [waConsent, setWaConsent] = useState(false);

  // Domain verification (all real — no timers)
  const [verifyToken, setVerifyToken] = useState<string | null>(null);
  const [domainVerified, setDomainVerified] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('idle');
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Per-step network state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [announce, setAnnounce] = useState('');

  const stepperIndex = STEPPER.findIndex((s) => s.key === step);
  const domainValid = DOMAIN_RE.test(domain.trim());
  const domainError = domainTouched && domain.trim().length > 0 && !domainValid;
  const waValid = whatsapp.replace(/\D/g, '').length >= 7;
  const effectiveDomain = domain.trim() || 'your domain';

  const hydrate = useCallback((s: OnboardingState) => {
    if (s.name) setOrgName(s.name);
    if (s.notification_email) setContact(s.notification_email);
    if (s.industry) setIndustry(s.industry);
    if (s.primary_domain) setDomain(s.primary_domain);
    if (s.whatsapp_number) setWhatsapp(s.whatsapp_number);
    setDomainVerified(s.domain_verified);
    if (s.domain_verified) setVerifyStatus('verified');
    const token = (s.onboarding_data as { verification_token?: string }).verification_token;
    if (token) setVerifyToken(token);
    const savedSize = (s.onboarding_data as { size?: string }).size;
    if (savedSize) setSize(savedSize);
    const savedInvites = (s.onboarding_data as { invites?: Invite[] }).invites;
    if (Array.isArray(savedInvites)) setInvites(savedInvites);
  }, []);

  // Load server state and resume from the saved step.
  useEffect(() => {
    let active = true;
    async function load(): Promise<void> {
      try {
        const s = await getOnboarding();
        if (!active) return;
        if (s.onboarding_completed) {
          router.replace('/dashboard');
          return;
        }
        hydrate(s);
        const hasProgress =
          Object.keys(s.onboarding_data).length > 0 || Boolean(s.primary_domain);
        const resume = BACKEND_STEP_TO_WIZARD[s.onboarding_step];
        setStep(hasProgress && resume ? resume : 'welcome');
      } catch {
        // No org / not authenticated yet — stay on welcome; guards handle redirects.
        if (active) setStep('welcome');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [router, hydrate]);

  useEffect(() => {
    const title = STEP_TITLES[step];
    setAnnounce(
      stepperIndex >= 0
        ? `Step ${String(stepperIndex + 1)} of ${String(STEPPER.length)}: ${title}`
        : title,
    );
    headingRef.current?.focus();
  }, [step, stepperIndex]);

  const goTo = (next: OnboardingStep): void => {
    setSaveError(null);
    setStep(next);
  };

  const advance = (): void => {
    const idx = FLOW.indexOf(step);
    if (idx < FLOW.length - 1) goTo(FLOW[idx + 1] ?? 'report');
  };

  // Persist the current step to the backend, then advance. Errors block advance.
  const persistAndAdvance = useCallback(async (): Promise<void> => {
    setSaving(true);
    setSaveError(null);
    try {
      if (step === 'business') {
        await saveOnboardingStep('business', {
          name: orgName.trim() || undefined,
          notification_email: contact.trim() || undefined,
          gst: gst.trim() || undefined,
        });
      } else if (step === 'industry') {
        await saveOnboardingStep('industry', { industry });
      } else if (step === 'domain') {
        const s = await saveDomain(domain.trim());
        setDomainVerified(s.domain_verified);
        const tok = await generateVerifyToken();
        setVerifyToken(tok.txt_record);
        setVerifyStatus('idle');
        setVerifyError(null);
      } else if (step === 'size') {
        await saveOnboardingStep('size', { size });
      } else if (step === 'team') {
        await saveOnboardingStep('team', { invites });
      } else if (step === 'notify') {
        await saveOnboardingStep('notify', {
          whatsapp_number: emailOnly ? '' : `${countryCode} ${whatsapp}`.trim(),
          email_only: emailOnly,
        });
      } else if (step === 'report') {
        await finishOnboarding();
        router.replace('/dashboard');
        return;
      }
      if (mounted.current) advance();
    } catch (e) {
      if (mounted.current)
        setSaveError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      if (mounted.current) setSaving(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, orgName, contact, gst, industry, domain, size, invites, emailOnly, countryCode, whatsapp, router]);

  // Real DNS verification: hit the backend, surface the real result.
  const runVerify = useCallback(async (): Promise<void> => {
    setVerifyStatus('checking');
    setVerifyError(null);
    try {
      await verifyDomain();
      if (!mounted.current) return;
      setDomainVerified(true);
      setVerifyStatus('verified');
    } catch (e) {
      if (!mounted.current) return;
      setVerifyStatus('failed');
      setVerifyError(e instanceof OnboardingError ? e.message : 'Verification failed. Try again.');
    }
  }, []);

  // While on the verify step and not yet verified, poll every 30s (real checks).
  useEffect(() => {
    if (step !== 'verify' || domainVerified || !verifyToken) return undefined;
    const id = setInterval(() => {
      if (verifyStatus !== 'checking') void runVerify();
    }, 30000);
    return () => {
      clearInterval(id);
    };
  }, [step, domainVerified, verifyToken, verifyStatus, runVerify]);

  const handleNext = (): void => {
    void persistAndAdvance();
  };

  const handleSkip = (): void => {
    // Skipping still advances the backend resume pointer, so a refresh after a
    // skip does not bounce the user back to the skipped step.
    void (async () => {
      setSaving(true);
      setSaveError(null);
      try {
        await saveOnboardingStep(step, {});
        if (mounted.current) advance();
      } catch (e) {
        if (mounted.current)
          setSaveError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
      } finally {
        if (mounted.current) setSaving(false);
      }
    })();
  };

  const handleBack = (): void => {
    const idx = FLOW.indexOf(step);
    if (idx > 0) goTo(FLOW[idx - 1] ?? 'welcome');
  };

  const addInvite = (): void => {
    const email = inviteEmail.trim();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setInviteError('Enter a valid email address.');
      return;
    }
    setInvites((prev) => [...prev, { email, role: 'Member' }]);
    setInviteEmail('');
    setInviteError('');
  };

  const removeInvite = (idx: number): void => {
    setInvites((prev) => prev.filter((_, i) => i !== idx));
  };

  const continueBlocked =
    saving ||
    (step === 'domain' && !domainValid) ||
    (step === 'verify' && !domainVerified) ||
    (step === 'notify' && !emailOnly && whatsapp.trim().length > 0 && (!waValid || !waConsent));

  const continueLabel =
    step === 'welcome'
      ? 'Get started'
      : step === 'report'
        ? saving
          ? 'Finishing…'
          : 'Go to dashboard'
        : saving
          ? 'Saving…'
          : 'Continue';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <Loader2 className="h-5 w-5 animate-spin text-content-muted" aria-hidden />
        <span className="ml-2 text-body-sm text-content-muted">Loading your progress…</span>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-surface px-4 py-8 md:px-8">
      <SurfaceField state="rest" />

      <div aria-live="polite" className="sr-only">
        {announce}
      </div>

      <div className="relative z-10 mx-auto flex max-w-2xl items-center justify-between pb-6">
        <Logo />
      </div>

      <nav aria-label="Onboarding progress" className="relative z-10 mx-auto mb-6 max-w-2xl">
        <ol className="flex items-center gap-1.5">
          {STEPPER.map((s, i) => {
            const state =
              stepperIndex < 0
                ? step === 'welcome'
                  ? 'upcoming'
                  : 'done'
                : i < stepperIndex
                  ? 'done'
                  : i === stepperIndex
                    ? 'current'
                    : 'upcoming';
            return (
              <li key={s.key} className="flex flex-1 items-center gap-1.5">
                <div className="flex flex-col items-center gap-1">
                  <span
                    aria-current={state === 'current' ? 'step' : undefined}
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-semibold tabular-nums transition-colors',
                      state === 'current' && 'bg-accent text-white',
                      state === 'done' && 'bg-accent/20 text-accent',
                      state === 'upcoming' && 'border border-border text-content-muted',
                    )}
                  >
                    {state === 'done' ? <Check className="h-3.5 w-3.5" aria-hidden /> : String(i + 1)}
                    <span className="sr-only">
                      {s.label} — {state}
                    </span>
                  </span>
                  <span
                    className={cn(
                      'hidden text-caption sm:block',
                      state === 'current' ? 'text-content-primary' : 'text-content-muted',
                    )}
                  >
                    {s.label}
                  </span>
                </div>
                {i < STEPPER.length - 1 && (
                  <span
                    aria-hidden
                    className={cn('h-px flex-1 self-start', i < stepperIndex ? 'bg-accent/40' : 'bg-border')}
                    style={{ marginTop: '13px' }}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="relative z-10 mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-md md:p-8">
        <div className="py-2">
          {step !== 'welcome' && (
            <div className="mb-6">
              <span className="text-caption tabular-nums text-accent">
                {stepperIndex >= 0
                  ? `STEP ${String(stepperIndex + 1)} OF ${String(STEPPER.length)}`
                  : step === 'scan'
                    ? 'FIRST SCAN'
                    : 'ALL SET'}
              </span>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-display text-h2 font-bold tracking-tight text-content-primary outline-none"
              >
                {STEP_TITLES[step]}
              </h1>
              {STEP_WHY[step] && (
                <p className="mt-2 text-body-sm text-content-secondary">{STEP_WHY[step]}</p>
              )}
            </div>
          )}

          {step === 'welcome' && (
            <div className="space-y-4">
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-display text-h2 font-bold tracking-tight text-content-primary outline-none"
              >
                Welcome to Qelvix
              </h1>
              <p className="text-body-sm text-content-secondary">
                A few short steps and one DNS record. Everything you enter is saved as you go, so you
                can leave and pick up exactly where you stopped. After your domain is verified,
                scanning runs on its own.
              </p>
            </div>
          )}

          {step === 'business' && (
            <div className="space-y-4">
              <Field id="ob-org" label="Registered business name">
                <input
                  id="ob-org"
                  type="text"
                  value={orgName}
                  onChange={(e) => {
                    setOrgName(e.target.value);
                  }}
                  placeholder="Acme Technologies Pvt Ltd"
                  className={inputCls}
                />
              </Field>
              <Field id="ob-gst" label="GSTIN" optional hint="Shown on compliance reports. Optional.">
                <input
                  id="ob-gst"
                  type="text"
                  value={gst}
                  onChange={(e) => {
                    setGst(e.target.value);
                  }}
                  placeholder="27AAECV1234F1Z5"
                  className={cn(inputCls, 'tabular-nums')}
                />
              </Field>
              <Field
                id="ob-contact"
                label="Breach-notification contact"
                hint="Who we contact first if something critical appears (DPDP §8.6)."
              >
                <input
                  id="ob-contact"
                  type="email"
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value);
                  }}
                  placeholder="you@company.in"
                  className={inputCls}
                />
              </Field>
            </div>
          )}

          {step === 'industry' && (
            <RadioCards
              name="industry"
              legend="Select your industry"
              options={INDUSTRIES}
              value={industry}
              onChange={setIndustry}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2"
            />
          )}

          {step === 'domain' && (
            <Field
              id="ob-domain"
              label="Primary domain"
              error={domainError ? 'Enter a valid domain like example.in — no http:// or paths.' : undefined}
              hint="Subdomains are discovered automatically — you do not need to list them."
            >
              <input
                id="ob-domain"
                type="text"
                inputMode="url"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  setDomainVerified(false);
                }}
                onBlur={() => {
                  setDomainTouched(true);
                }}
                placeholder="yourbusiness.in"
                aria-invalid={domainError}
                className={cn(inputCls, 'tabular-nums', domainError && 'border-critical-text')}
              />
            </Field>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <p className="text-body-sm text-content-secondary">
                Add this <span className="font-medium">TXT record</span> at your DNS provider for{' '}
                <span className="tabular-nums text-content-primary">{effectiveDomain}</span>, then
                check. DNS can take a few minutes to propagate; we also re-check automatically every
                30 seconds.
              </p>

              <dl className="rounded-xl border border-border bg-surface-inset p-4 text-caption">
                <div className="flex items-center justify-between gap-3">
                  <dt className="tabular-nums text-content-muted">TYPE</dt>
                  <dd className="tabular-nums text-content-primary">TXT</dd>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <dt className="tabular-nums text-content-muted">NAME / HOST</dt>
                  <dd className="tabular-nums text-content-primary">@ (root)</dd>
                </div>
                <div className="mt-2 flex items-start justify-between gap-3">
                  <dt className="shrink-0 tabular-nums text-content-muted">VALUE</dt>
                  <dd className="break-all text-right tabular-nums text-accent">
                    {verifyToken ?? 'Generating…'}
                  </dd>
                </div>
              </dl>

              {verifyStatus === 'verified' || domainVerified ? (
                <p className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/10 p-3 text-body-sm text-content-primary">
                  <ShieldCheck className="h-4 w-4 text-accent" aria-hidden />
                  Domain verified. You can continue.
                </p>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => void runVerify()}
                    disabled={verifyStatus === 'checking' || !verifyToken}
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-4 text-caption font-medium text-content-primary hover:bg-surface-inset disabled:opacity-50"
                  >
                    {verifyStatus === 'checking' ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Checking DNS…
                      </>
                    ) : (
                      'Check verification now'
                    )}
                  </button>
                  {verifyStatus === 'failed' && verifyError && (
                    <p className="flex items-start gap-2 text-caption text-critical-text">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span className="break-all">{verifyError}</span>
                    </p>
                  )}
                </div>
              )}

              <p className="text-caption text-content-muted">
                Don&apos;t control your DNS?{' '}
                <a
                  href="/docs/domain-verification"
                  className="inline-flex items-center gap-1 font-medium text-accent underline underline-offset-2"
                >
                  Read the step-by-step guide
                  <ExternalLink className="h-3 w-3" aria-hidden />
                </a>
              </p>
            </div>
          )}

          {step === 'size' && (
            <RadioCards
              name="size"
              legend="Select your company size"
              options={SIZES}
              value={size}
              onChange={setSize}
              className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            />
          )}

          {step === 'team' && (
            <div className="space-y-4">
              <ul className="flex flex-col gap-2">
                {invites.map((inv, idx) => (
                  <li
                    key={`${inv.email}-${String(idx)}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-inset px-4 py-3"
                  >
                    <span className="min-w-0 truncate text-body-sm tabular-nums text-content-primary">
                      {inv.email}
                    </span>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="rounded-full border border-border/80 px-2.5 py-0.5 text-caption font-medium text-content-secondary">
                        {inv.role}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          removeInvite(idx);
                        }}
                        aria-label={`Remove invite for ${inv.email}`}
                        className="rounded text-content-muted transition-colors hover:text-critical-text"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </li>
                ))}
                {invites.length === 0 && (
                  <li className="text-caption text-content-muted">No teammates added yet.</li>
                )}
              </ul>
              <div className="flex gap-2">
                <label htmlFor="ob-invite" className="sr-only">
                  Teammate email
                </label>
                <input
                  id="ob-invite"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => {
                    setInviteEmail(e.target.value);
                    if (inviteError) setInviteError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addInvite();
                    }
                  }}
                  placeholder="teammate@company.in"
                  className={cn('h-10 flex-1', inputCls, inviteError && 'border-critical-text')}
                />
                <button
                  type="button"
                  onClick={addInvite}
                  className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-caption font-medium text-content-primary hover:bg-surface-inset"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  <span>Add</span>
                </button>
              </div>
              {inviteError && <p className="text-caption text-critical-text">{inviteError}</p>}
            </div>
          )}

          {step === 'notify' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-border bg-surface-inset p-4">
                <p className="text-body-sm font-medium text-content-primary">Email alerts</p>
                <p className="mt-0.5 text-caption text-content-muted">
                  Confirmed and always on:{' '}
                  <span className="tabular-nums text-content-secondary">
                    {contact.trim() || 'your account email'}
                  </span>
                </p>
              </div>
              <fieldset className="flex flex-col gap-2">
                <legend className="text-body-sm font-medium text-content-secondary">
                  WhatsApp alerts
                  <span className="ml-2 rounded-full bg-surface-inset px-2 py-0.5 text-caption font-normal text-content-muted">
                    Optional
                  </span>
                </legend>
                <div className="flex gap-2">
                  <label htmlFor="ob-cc" className="sr-only">
                    Country code
                  </label>
                  <select
                    id="ob-cc"
                    value={countryCode}
                    disabled={emailOnly}
                    onChange={(e) => {
                      setCountryCode(e.target.value);
                    }}
                    className="h-11 rounded-lg border border-border bg-surface px-2 text-body-sm text-content-primary outline-none focus:border-accent disabled:opacity-50"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <label htmlFor="ob-wa" className="sr-only">
                    WhatsApp number
                  </label>
                  <input
                    id="ob-wa"
                    type="tel"
                    inputMode="tel"
                    value={whatsapp}
                    disabled={emailOnly}
                    onChange={(e) => {
                      setWhatsapp(e.target.value);
                    }}
                    placeholder="98765 43210"
                    className={cn('flex-1 tabular-nums', inputCls, 'disabled:opacity-50')}
                  />
                </div>
                <label className="mt-1 flex cursor-pointer items-start gap-2.5 text-caption text-content-secondary">
                  <input
                    type="checkbox"
                    checked={emailOnly}
                    onChange={(e) => {
                      setEmailOnly(e.target.checked);
                      if (e.target.checked) {
                        setWhatsapp('');
                        setWaConsent(false);
                      }
                    }}
                    className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
                  />
                  <span>Skip WhatsApp — send me email only</span>
                </label>
                {!emailOnly && whatsapp.trim().length > 0 && (
                  <label className="mt-1 flex cursor-pointer items-start gap-2.5 text-caption text-content-secondary">
                    <input
                      type="checkbox"
                      checked={waConsent}
                      onChange={(e) => {
                        setWaConsent(e.target.checked);
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-border text-accent focus:ring-accent"
                    />
                    <span>
                      I consent to receiving security alerts from Qelvix on this WhatsApp number. I
                      can withdraw consent anytime from Settings (DPDP §6).
                    </span>
                  </label>
                )}
              </fieldset>
            </div>
          )}

          {step === 'scan' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-surface-inset p-5 text-center">
                <p className="text-body-sm font-medium text-content-primary">
                  Scanning is not yet available.
                </p>
                <p className="mt-1 text-caption text-content-muted">
                  Your domain <span className="tabular-nums">{effectiveDomain}</span> is verified and
                  queued. Automated scanning turns on once the scan pipeline is live — we&apos;ll
                  email you the first report. No results are shown until a real scan has run.
                </p>
              </div>
            </div>
          )}

          {step === 'report' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border p-5">
                <p className="text-body-sm font-medium text-content-primary">
                  Setup complete for {orgName.trim() || 'your organization'}.
                </p>
                <p className="mt-1 text-caption text-content-muted">
                  Domain verified, notifications set. Reports appear here after your first real scan
                  completes — nothing is shown before then.
                </p>
              </div>
            </div>
          )}

          {saveError && (
            <p className="mt-4 flex items-start gap-2 text-caption text-critical-text">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {saveError}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/60 pt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 'welcome' || saving}
            className="rounded-lg px-4 py-2 text-caption font-medium text-content-secondary hover:text-content-primary disabled:opacity-30"
          >
            Back
          </button>
          <div className="flex items-center gap-2">
            {SKIPPABLE.has(step) && (
              <button
                type="button"
                onClick={handleSkip}
                disabled={saving}
                className="rounded-lg px-4 py-2 text-caption font-medium text-content-muted hover:text-content-primary disabled:opacity-30"
              >
                Skip for now
              </button>
            )}
            <button
              type="button"
              onClick={step === 'welcome' ? advance : handleNext}
              disabled={continueBlocked}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-5 text-caption font-semibold text-white shadow-2xs transition-all hover:brightness-105 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              <span>{continueLabel}</span>
              {!saving && <ChevronRight className="h-4 w-4" aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  'h-11 w-full rounded-lg border border-border bg-surface px-3 text-body-sm text-content-primary outline-none focus:border-accent';

interface FieldProps {
  id: string;
  label: string;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, optional, hint, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-body-sm font-medium text-content-secondary">
          {label}
        </label>
        {optional && (
          <span className="rounded-full bg-surface-inset px-2 py-0.5 text-caption text-content-muted">
            Optional
          </span>
        )}
      </div>
      {children}
      {error ? (
        <p className="text-caption text-critical-text">{error}</p>
      ) : (
        hint && <p className="text-caption text-content-muted">{hint}</p>
      )}
    </div>
  );
}

interface RadioCardsProps {
  name: string;
  legend: string;
  options: readonly { label: string; note: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

function RadioCards({ name, legend, options, value, onChange, className }: RadioCardsProps) {
  return (
    <fieldset>
      <legend className="sr-only">{legend}</legend>
      <div className={className}>
        {options.map((opt) => {
          const isSel = value === opt.label;
          return (
            <label
              key={opt.label}
              className={cn(
                'flex cursor-pointer flex-col items-start rounded-xl border p-4 text-left transition-all focus-within:ring-2 focus-within:ring-focus focus-within:ring-offset-1 focus-within:ring-offset-surface',
                isSel ? 'border-accent bg-surface-inset' : 'border-border/80 hover:bg-surface-inset/50',
              )}
            >
              <input
                type="radio"
                name={name}
                value={opt.label}
                checked={isSel}
                onChange={() => {
                  onChange(opt.label);
                }}
                className="sr-only"
              />
              <span className="flex w-full items-center justify-between gap-2">
                <span className="text-body-sm font-medium text-content-primary">{opt.label}</span>
                {isSel && <Check className="h-4 w-4 shrink-0 text-accent" aria-hidden />}
              </span>
              <span className="mt-0.5 text-caption text-content-muted">{opt.note}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
