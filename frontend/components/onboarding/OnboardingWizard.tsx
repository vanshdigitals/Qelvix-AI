'use client';

import { Check, ChevronRight, ExternalLink, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';

import { Logo } from '@/components/layout/Logo';
import { SeverityBadge } from '@/components/dashboard/shared';
import { SurfaceField } from '@/components/marketing/SurfaceField';
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

// Domain verification is a hard gate (01 §Tier-1), so it sits right after the
// domain is entered — before size/team/notify — and the flow cannot skip past it.
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

// The seven numbered steps the persistent stepper reflects.
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
  scan: 'Running your first scan',
  report: 'Here is where you stand',
};

// Steps a user may skip; skipping only advances to the next step, never past
// verification/notification setup (01 §exit-paths).
const SKIPPABLE = new Set<OnboardingStep>(['business', 'industry', 'size', 'team']);

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

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>('welcome');

  // Form fields
  const [org, setOrg] = useState('');
  const [gst, setGst] = useState('');
  const [contact, setContact] = useState('');
  const [domain, setDomain] = useState('');
  const [domainTouched, setDomainTouched] = useState(false);
  const [industry, setIndustry] = useState<string>('Manufacturing');
  const [size, setSize] = useState<string>('11–50');
  const [invites, setInvites] = useState<Invite[]>([{ email: 'it@company.in', role: 'Admin' }]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');

  // Notification setup
  const [countryCode, setCountryCode] = useState<string>('+91');
  const [whatsapp, setWhatsapp] = useState('');
  const [emailOnly, setEmailOnly] = useState(false);
  const [waConsent, setWaConsent] = useState(false);

  // Timeline animation states for verify & scan
  const [timelineDone, setTimelineDone] = useState(0);
  const [timelineActive, setTimelineActive] = useState(-1);
  const [timelineComplete, setTimelineComplete] = useState(false);

  // Accessibility: move focus to the step heading and announce the change.
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [announce, setAnnounce] = useState('');
  const [timelineAnnounce, setTimelineAnnounce] = useState('');

  const stepperIndex = STEPPER.findIndex((s) => s.key === step); // -1 for welcome/scan/report
  const domainValid = DOMAIN_RE.test(domain.trim());
  const domainError = domainTouched && domain.trim().length > 0 && !domainValid;
  const waValid = whatsapp.replace(/\D/g, '').length >= 7;

  const timelineItems = useMemo(
    () =>
      step === 'verify'
        ? ['Reading DNS for domain', 'TXT record found', 'Signature matched', 'Domain verified']
        : [
            'Asset discovery (14 assets)',
            'SSL/TLS analysis (3 findings)',
            'DNS analysis (4 findings)',
            'Risk scoring (score 47)',
          ],
    [step],
  );

  useEffect(() => {
    // Announce and focus the new step's heading for keyboard/SR users.
    const title = STEP_TITLES[step];
    if (stepperIndex >= 0) {
      setAnnounce(`Step ${String(stepperIndex + 1)} of ${String(STEPPER.length)}: ${title}`);
    } else {
      setAnnounce(title);
    }
    headingRef.current?.focus();
  }, [step, stepperIndex]);

  useEffect(() => {
    if (step !== 'verify' && step !== 'scan') return undefined;
    const isScan = step === 'scan';
    const maxCount = 4;
    setTimelineDone(0);
    setTimelineActive(0);
    setTimelineComplete(false);

    const timers: NodeJS.Timeout[] = [];
    let elapsed = 300;
    for (let i = 0; i < maxCount; i++) {
      elapsed += isScan ? 900 : 600;
      const currentIdx = i;
      timers.push(
        setTimeout(() => {
          setTimelineDone(currentIdx + 1);
          setTimelineActive(currentIdx + 1 < maxCount ? currentIdx + 1 : -1);
          if (currentIdx + 1 === maxCount) setTimelineComplete(true);
        }, elapsed),
      );
    }
    return () => {
      timers.forEach((t) => {
        clearTimeout(t);
      });
    };
  }, [step]);

  useEffect(() => {
    // Announce each completed timeline row so SR users get the live moment too.
    if (timelineDone > 0 && timelineDone <= timelineItems.length) {
      setTimelineAnnounce(`${timelineItems[timelineDone - 1] ?? ''} — complete`);
    }
  }, [timelineDone, timelineItems]);

  function completeOnboarding(): void {
    try {
      localStorage.setItem('qelvix_onboarding_completed', 'true');
      document.cookie = 'qelvix_onboarding_completed=true; path=/; max-age=31536000';
    } catch {
      // ignore storage errors
    }
    router.push('/dashboard');
  }

  function goTo(next: OnboardingStep): void {
    setStep(next);
  }

  function handleNext(): void {
    const idx = FLOW.indexOf(step);
    if (idx < FLOW.length - 1) {
      goTo(FLOW[idx + 1] ?? 'report');
    } else {
      completeOnboarding();
    }
  }

  function handleBack(): void {
    const idx = FLOW.indexOf(step);
    if (idx > 0) goTo(FLOW[idx - 1] ?? 'welcome');
  }

  function addInvite(): void {
    const email = inviteEmail.trim();
    if (!email) return;
    if (!EMAIL_RE.test(email)) {
      setInviteError('Enter a valid email address.');
      return;
    }
    setInvites((prev) => [...prev, { email, role: 'Member' }]);
    setInviteEmail('');
    setInviteError('');
  }

  function removeInvite(idx: number): void {
    setInvites((prev) => prev.filter((_, i) => i !== idx));
  }

  // Whether Continue is allowed for the current step.
  const continueBlocked =
    (step === 'domain' && !domainValid) ||
    ((step === 'verify' || step === 'scan') && !timelineComplete) ||
    (step === 'notify' && !emailOnly && whatsapp.trim().length > 0 && (!waValid || !waConsent));

  const showSkip = SKIPPABLE.has(step);
  const continueLabel =
    step === 'welcome' ? 'Get started' : step === 'report' ? 'Go to dashboard' : 'Continue';
  const effectiveDomain = domain.trim() || 'vardhmanexports.in';

  return (
    <div className="relative min-h-screen bg-surface px-4 py-8 md:px-8">
      <SurfaceField state="rest" />

      {/* Live regions: step changes + timeline progress (visually hidden). */}
      <div aria-live="polite" className="sr-only">
        {announce}
      </div>
      <div aria-live="polite" className="sr-only">
        {timelineAnnounce}
      </div>

      {/* Brand row (unchanged). */}
      <div className="relative z-10 mx-auto flex max-w-2xl items-center justify-between pb-6">
        <Logo />
      </div>

      {/* Persistent stepper replaces the repeated static header. */}
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
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full tabular-nums text-caption font-semibold transition-colors',
                      state === 'current' && 'bg-accent text-white',
                      state === 'done' && 'bg-accent/20 text-accent',
                      state === 'upcoming' && 'border border-border text-content-muted',
                    )}
                  >
                    {state === 'done' ? (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      String(i + 1)
                    )}
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
                    className={cn(
                      'h-px flex-1 self-start',
                      i < stepperIndex ? 'bg-accent/40' : 'bg-border',
                    )}
                    style={{ marginTop: '13px' }}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Main Card */}
      <div className="relative z-10 mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-md md:p-8">
        <div className="py-2">
          {/* Every step renders a consistent, focusable h1. */}
          {step !== 'welcome' && (
            <div className="mb-6">
              <span className="tabular-nums text-caption text-accent">
                {stepperIndex >= 0
                  ? `STEP ${String(stepperIndex + 1)} OF ${String(STEPPER.length)}`
                  : step === 'scan'
                    ? 'FIRST SCAN'
                    : 'FIRST REPORT'}
              </span>
              <h1
                ref={headingRef}
                tabIndex={-1}
                className="font-display text-h2 font-bold tracking-tight text-content-primary outline-none"
              >
                {step === 'scan' ? `Scanning ${effectiveDomain}` : STEP_TITLES[step]}
              </h1>
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
                Seven short steps and one DNS record. After that, scanning is automatic and you only
                hear from us when something needs you.
              </p>
            </div>
          )}

          {step === 'business' && (
            <div className="space-y-4">
              <p className="text-body-sm text-content-secondary">
                This appears on reports you share with banks, clients, or auditors.
              </p>

              <div className="flex flex-col gap-2">
                <label htmlFor="ob-org" className="text-body-sm font-medium text-content-secondary">
                  Registered business name
                </label>
                <input
                  id="ob-org"
                  type="text"
                  value={org}
                  onChange={(e) => {
                    setOrg(e.target.value);
                  }}
                  placeholder="Vardhman Exports Pvt Ltd"
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-body-sm text-content-primary outline-none focus:border-accent"
                />
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="ob-gst"
                    className="text-body-sm font-medium text-content-secondary"
                  >
                    GSTIN
                  </label>
                  <span className="rounded-full bg-surface-inset px-2 py-0.5 text-caption text-content-muted">
                    Optional
                  </span>
                </div>
                <input
                  id="ob-gst"
                  type="text"
                  value={gst}
                  onChange={(e) => {
                    setGst(e.target.value);
                  }}
                  placeholder="27AAECV1234F1Z5"
                  aria-describedby="ob-gst-hint"
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 tabular-nums text-body-sm text-content-primary outline-none focus:border-accent"
                />
                <p id="ob-gst-hint" className="text-caption text-content-muted">
                  Shown on compliance reports. Leave blank if you would rather not provide it.
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <label
                  htmlFor="ob-contact"
                  className="text-body-sm font-medium text-content-secondary"
                >
                  Breach-notification contact
                </label>
                <input
                  id="ob-contact"
                  type="email"
                  value={contact}
                  onChange={(e) => {
                    setContact(e.target.value);
                  }}
                  placeholder="priya@vardhmanexports.in"
                  aria-describedby="ob-contact-hint"
                  className="h-11 w-full rounded-lg border border-border bg-surface px-3 text-body-sm text-content-primary outline-none focus:border-accent"
                />
                <p id="ob-contact-hint" className="text-caption text-content-muted">
                  Who we contact first if something critical appears (DPDP §8.6).
                </p>
              </div>
            </div>
          )}

          {step === 'industry' && (
            <div className="space-y-4">
              <p className="text-body-sm text-content-secondary">
                Industry sets your DPDP clause defaults and the benchmarks we compare you against.
              </p>
              <RadioCards
                name="industry"
                legend="Select your industry"
                options={INDUSTRIES}
                value={industry}
                onChange={setIndustry}
                className="grid grid-cols-1 gap-3 sm:grid-cols-2"
              />
            </div>
          )}

          {step === 'domain' && (
            <div className="space-y-4">
              <p className="text-body-sm text-content-secondary">
                Qelvix only scans domains you prove ownership of. Nothing is scanned before that.
              </p>
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="ob-domain"
                  className="text-body-sm font-medium text-content-secondary"
                >
                  Primary domain
                </label>
                <input
                  id="ob-domain"
                  type="text"
                  inputMode="url"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value);
                  }}
                  onBlur={() => {
                    setDomainTouched(true);
                  }}
                  placeholder="vardhmanexports.in"
                  aria-invalid={domainError}
                  aria-describedby={domainError ? 'ob-domain-error' : 'ob-domain-hint'}
                  className={cn(
                    'h-11 w-full rounded-lg border bg-surface px-3 tabular-nums text-body-sm text-content-primary outline-none focus:border-accent',
                    domainError ? 'border-critical-text' : 'border-border',
                  )}
                />
                {domainError ? (
                  <p id="ob-domain-error" className="text-caption text-critical-text">
                    Enter a valid domain like example.in — no http:// or paths.
                  </p>
                ) : (
                  <p id="ob-domain-hint" className="text-caption text-content-muted">
                    Subdomains are discovered automatically — you do not need to list them.
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <p className="text-body-sm text-content-secondary">
                Add one TXT record for{' '}
                <span className="tabular-nums text-content-primary">{effectiveDomain}</span>. We check
                every 30 seconds and continue on our own.
              </p>

              <div className="rounded-xl border border-border bg-surface-inset p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="tabular-nums text-caption text-content-muted">TXT RECORD</span>
                  <span className="tabular-nums text-caption text-accent">qelvix-verify=6a8d9e2c</span>
                </div>
              </div>

              <ol className="flex flex-col gap-3 pt-2 text-left">
                {timelineItems.map((label, idx) => {
                  const isDone = idx < timelineDone;
                  const isActive = idx === timelineActive;
                  return (
                    <li
                      key={label}
                      className={cn(
                        'flex items-center gap-3 transition-opacity duration-200',
                        isDone || isActive ? 'opacity-100' : 'opacity-50',
                      )}
                    >
                      <span className="flex h-5 w-5 items-center justify-center">
                        {isDone ? (
                          <Check className="h-4 w-4 text-content-primary" aria-hidden />
                        ) : isActive ? (
                          <span className="h-2 w-2 animate-ping rounded-full bg-accent" />
                        ) : (
                          <span className="h-2 w-2 rounded-full border border-content-muted" />
                        )}
                      </span>
                      <span className="text-body-sm text-content-primary">{label}</span>
                    </li>
                  );
                })}
              </ol>

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
            <div className="space-y-4">
              <p className="text-body-sm text-content-secondary">
                Used for scan scheduling and seat limits — nothing else.
              </p>
              <RadioCards
                name="size"
                legend="Select your company size"
                options={SIZES}
                value={size}
                onChange={setSize}
                className="grid grid-cols-2 gap-3 sm:grid-cols-4"
              />
            </div>
          )}

          {step === 'team' && (
            <div className="space-y-4">
              <p className="text-body-sm text-content-secondary">
                Usually whoever runs your website or IT. You can do this later from Settings.
              </p>

              <ul className="flex flex-col gap-2">
                {invites.map((inv, idx) => (
                  <li
                    key={`${inv.email}-${inv.role}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-inset px-4 py-3"
                  >
                    <span className="min-w-0 truncate tabular-nums text-body-sm text-content-primary">
                      {inv.email}
                    </span>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="rounded-full border border-border/80 px-2.5 py-0.5 text-caption font-medium text-content-secondary">
                        <span className="sr-only">Role: </span>
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
              </ul>

              <div className="flex flex-col gap-2 pt-1">
                <label htmlFor="ob-invite" className="sr-only">
                  Teammate email
                </label>
                <div className="flex gap-2">
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
                    aria-invalid={inviteError.length > 0}
                    aria-describedby={inviteError ? 'ob-invite-error' : undefined}
                    className={cn(
                      'h-10 flex-1 rounded-lg border bg-surface px-3 text-body-sm text-content-primary outline-none focus:border-accent',
                      inviteError ? 'border-critical-text' : 'border-border',
                    )}
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
                {inviteError && (
                  <p id="ob-invite-error" className="text-caption text-critical-text">
                    {inviteError}
                  </p>
                )}
              </div>
            </div>
          )}

          {step === 'notify' && (
            <div className="space-y-5">
              <p className="text-body-sm text-content-secondary">
                Critical findings always reach you. Choose how the rest are delivered.
              </p>

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
                    aria-describedby="ob-wa-consent"
                    className="h-11 flex-1 rounded-lg border border-border bg-surface px-3 tabular-nums text-body-sm text-content-primary outline-none focus:border-accent disabled:opacity-50"
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
                    <span id="ob-wa-consent">
                      I consent to receiving security alerts from Qelvix on this WhatsApp number.
                      Message rates may apply, and I can withdraw consent anytime from Settings
                      (DPDP §6, 07 §consent).
                    </span>
                  </label>
                )}
              </fieldset>
            </div>
          )}

          {step === 'scan' && (
            <div className="space-y-4">
              <p className="text-body-sm text-content-secondary">
                Real checks against your real infrastructure. Four agents, roughly two minutes.
              </p>
              <ol className="flex flex-col gap-3 pt-2 text-left">
                {timelineItems.map((label, idx) => {
                  const isDone = idx < timelineDone;
                  const isActive = idx === timelineActive;
                  return (
                    <li
                      key={label}
                      className={cn(
                        'flex items-center gap-3 transition-opacity duration-200',
                        isDone || isActive ? 'opacity-100' : 'opacity-50',
                      )}
                    >
                      <span className="flex h-5 w-5 items-center justify-center">
                        {isDone ? (
                          <Check className="h-4 w-4 text-content-primary" aria-hidden />
                        ) : isActive ? (
                          <span className="h-2 w-2 animate-ping rounded-full bg-accent" />
                        ) : (
                          <span className="h-2 w-2 rounded-full border border-content-muted" />
                        )}
                      </span>
                      <span className="text-body-sm text-content-primary">{label}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {step === 'report' && (
            <div className="space-y-4">
              <p className="text-body-sm text-content-secondary">
                Two issues need attention this week. Start with the expired certificate.
              </p>
              <ul className="flex flex-col gap-3">
                {[
                  {
                    sev: 'Critical',
                    title: 'SSL certificate expired 4 days ago',
                    asset: `mail.${effectiveDomain}`,
                  },
                  {
                    sev: 'High',
                    title: 'No DMARC record — email is spoofable',
                    asset: effectiveDomain,
                  },
                  {
                    sev: 'Medium',
                    title: 'SPF uses ~all instead of -all',
                    asset: effectiveDomain,
                  },
                ].map((f) => (
                  <li
                    key={f.title}
                    className="flex flex-col gap-2 rounded-xl border border-border p-4"
                  >
                    <SeverityBadge severity={f.sev} />
                    <p className="text-body-sm font-medium text-content-primary">{f.title}</p>
                    <p className="tabular-nums text-caption text-content-muted">{f.asset}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-border/60 pt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 'welcome'}
            className="rounded-lg px-4 py-2 text-caption font-medium text-content-secondary hover:text-content-primary disabled:opacity-30"
          >
            Back
          </button>

          <div className="flex items-center gap-2">
            {showSkip && (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-lg px-4 py-2 text-caption font-medium text-content-muted hover:text-content-primary"
              >
                Skip for now
              </button>
            )}
            <button
              type="button"
              onClick={handleNext}
              disabled={continueBlocked}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-5 text-caption font-semibold text-white shadow-2xs transition-all hover:brightness-105 disabled:opacity-50"
            >
              <span>{continueLabel}</span>
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>
      </div>
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

/** Accessible radio group rendered as selectable cards (native inputs). */
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
                isSel
                  ? 'border-accent bg-surface-inset'
                  : 'border-border/80 hover:bg-surface-inset/50',
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
