'use client';

import { Check, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Logo } from '@/components/layout/Logo';
import { SurfaceField } from '@/components/marketing/SurfaceField';
import { cn } from '@/lib/utils/cn';

export type OnboardingStep =
  | 'welcome'
  | 'business'
  | 'industry'
  | 'domain'
  | 'size'
  | 'team'
  | 'verify'
  | 'scan'
  | 'report';

const STEPS: OnboardingStep[] = [
  'welcome',
  'business',
  'industry',
  'domain',
  'size',
  'team',
  'verify',
  'scan',
  'report',
];

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
  const [industry, setIndustry] = useState<string>('Manufacturing');
  const [size, setSize] = useState<string>('11–50');
  const [invites, setInvites] = useState<Invite[]>([
    { email: 'it@company.in', role: 'Admin' },
  ]);
  const [inviteEmail, setInviteEmail] = useState('');

  // Timeline animation states for verify & scan
  const [timelineDone, setTimelineDone] = useState(0);
  const [timelineActive, setTimelineActive] = useState(-1);
  const [timelineComplete, setTimelineComplete] = useState(false);

  useEffect(() => {
    if (step === 'verify' || step === 'scan') {
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
            if (currentIdx + 1 === maxCount) {
              setTimelineComplete(true);
            }
          }, elapsed),
        );
      }

      return () => {
        timers.forEach((t) => {
          clearTimeout(t);
        });
      };
    }
    return undefined;
  }, [step]);

  function completeOnboarding(): void {
    try {
      localStorage.setItem('qelvix_onboarding_completed', 'true');
      document.cookie = 'qelvix_onboarding_completed=true; path=/; max-age=31536000';
    } catch {
      // ignore storage errors
    }
    router.push('/dashboard');
  }

  function handleNext(): void {
    const idx = STEPS.indexOf(step);
    if (idx < STEPS.length - 1) {
      setStep(STEPS[idx + 1] ?? 'report');
    } else {
      completeOnboarding();
    }
  }

  function handleBack(): void {
    const idx = STEPS.indexOf(step);
    if (idx > 0) {
      setStep(STEPS[idx - 1] ?? 'welcome');
    }
  }

  function addInvite(): void {
    if (!inviteEmail.trim()) return;
    setInvites((prev) => [...prev, { email: inviteEmail.trim(), role: 'Member' }]);
    setInviteEmail('');
  }

  function removeInvite(idx: number): void {
    setInvites((prev) => prev.filter((_, i) => i !== idx));
  }


  function renderTimelineItems(): React.ReactNode {
    const items =
      step === 'verify'
        ? [
            'Reading DNS for domain',
            'TXT record found',
            'Signature matched',
            'Domain verified · asset whitelisted',
          ]
        : [
            'Asset Discovery (14 assets)',
            'SSL/TLS Analysis (3 findings)',
            'DNS Analysis (4 findings)',
            'Risk scoring (score 47)',
          ];

    return (
      <div className="mt-6 flex flex-col gap-3 text-left">
        {items.map((label, idx) => {
          const isDone = idx < timelineDone;
          const isActive = idx === timelineActive;

          return (
            <div
              key={label}
              className={cn(
                'flex items-center gap-3 transition-opacity duration-200',
                isDone || isActive ? 'opacity-100' : 'opacity-50',
              )}
            >
              <span className="flex h-5 w-5 items-center justify-center">
                {isDone ? (
                  <Check className="h-4 w-4 text-content-primary" />
                ) : isActive ? (
                  <span className="h-2 w-2 animate-ping rounded-full bg-accent" />
                ) : (
                  <span className="h-2 w-2 rounded-full border border-content-muted" />
                )}
              </span>
              <span className="font-body text-body-sm text-content-primary">{label}</span>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-surface px-4 py-8 md:px-8">
      <SurfaceField state="rest" />

      {/* Top Header */}
      <div className="relative z-10 mx-auto flex max-w-2xl items-center justify-between pb-6">
        <Logo />
        <button
          type="button"
          onClick={completeOnboarding}
          className="text-body-sm font-medium text-content-muted hover:text-content-primary transition-colors"
        >
          Skip
        </button>
      </div>

      <div className="relative z-10 mx-auto mb-6 max-w-2xl text-center">
        <h1 className="font-display text-h2 font-bold tracking-tight text-content-primary">
          Welcome to Qelvix
        </h1>
        <p className="mt-2 text-body-sm text-content-secondary">
          Let&apos;s set up your workspace in a few quick steps.
        </p>
      </div>

      {/* Main Card */}
      <div className="relative z-10 mx-auto max-w-2xl rounded-2xl border border-border bg-surface p-6 shadow-md md:p-8">
        {/* Step Body */}
        <div className="py-8">
          {step === 'welcome' && (
            <div className="space-y-4">
              <span className="font-mono text-caption text-accent">FIRST LOGIN</span>
              <p className="font-body text-body-sm text-content-secondary">
                Six short steps and one DNS record. After that, scanning is automatic and you
                only hear from us when something needs you.
              </p>
            </div>
          )}

          {step === 'business' && (
            <div className="space-y-6">
              <div>
                <span className="font-mono text-caption text-accent">STEP 1 OF 6</span>
                <h2 className="font-heading text-heading-md font-semibold text-content-primary">
                  About your business
                </h2>
                <p className="font-body text-body-sm text-content-secondary">
                  This appears on reports you share with banks, clients, or auditors.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-caption font-medium text-content-secondary">
                    Registered business name
                  </label>
                  <input
                    type="text"
                    value={org}
                    onChange={(e) => {
                      setOrg(e.target.value);
                    }}
                    placeholder="Vardhman Exports Pvt Ltd"
                    className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-3 font-body text-body-sm text-content-primary outline-none focus:border-accent"
                  />
                </div>

                <div>
                  <label className="block text-caption font-medium text-content-secondary">
                    GSTIN (optional)
                  </label>
                  <input
                    type="text"
                    value={gst}
                    onChange={(e) => {
                      setGst(e.target.value);
                    }}
                    placeholder="27AAECV1234F1Z5"
                    className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-3 font-mono text-body-sm text-content-primary outline-none focus:border-accent"
                  />
                  <p className="mt-1 text-caption text-content-muted">
                    Shown on compliance reports. Skip if you would rather not.
                  </p>
                </div>

                <div>
                  <label className="block text-caption font-medium text-content-secondary">
                    Breach-notification contact
                  </label>
                  <input
                    type="email"
                    value={contact}
                    onChange={(e) => {
                      setContact(e.target.value);
                    }}
                    placeholder="priya@vardhmanexports.in"
                    className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-3 font-body text-body-sm text-content-primary outline-none focus:border-accent"
                  />
                  <p className="mt-1 text-caption text-content-muted">
                    Who we contact first if something critical appears (DPDP §8.6).
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 'industry' && (
            <div className="space-y-6">
              <div>
                <span className="font-mono text-caption text-accent">STEP 2 OF 6</span>
                <h2 className="font-heading text-heading-md font-semibold text-content-primary">
                  What does the business do?
                </h2>
                <p className="font-body text-body-sm text-content-secondary">
                  Industry sets your DPDP clause defaults and the benchmarks we compare you
                  against.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {INDUSTRIES.map((ind) => {
                  const isSel = industry === ind.label;
                  return (
                    <button
                      key={ind.label}
                      type="button"
                      onClick={() => {
                        setIndustry(ind.label);
                      }}
                      className={cn(
                        'flex flex-col items-start rounded-xl border p-4 text-left transition-all',
                        isSel
                          ? 'border-accent bg-surface-inset'
                          : 'border-border/80 hover:bg-surface-inset/50',
                      )}
                    >
                      <span className="font-body text-body-sm font-medium text-content-primary">
                        {ind.label}
                      </span>
                      <span className="mt-0.5 text-caption text-content-muted">
                        {ind.note}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'domain' && (
            <div className="space-y-6">
              <div>
                <span className="font-mono text-caption text-accent">STEP 3 OF 6</span>
                <h2 className="font-heading text-heading-md font-semibold text-content-primary">
                  Which domain should we monitor?
                </h2>
                <p className="font-body text-body-sm text-content-secondary">
                  Qelvix only scans domains you prove ownership of. Nothing is scanned before
                  that.
                </p>
              </div>

              <div>
                <label className="block text-caption font-medium text-content-secondary">
                  Primary domain
                </label>
                <input
                  type="text"
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value);
                  }}
                  placeholder="vardhmanexports.in"
                  className="mt-1.5 h-11 w-full rounded-lg border border-border bg-surface px-3 font-mono text-body-sm text-content-primary outline-none focus:border-accent"
                />
                <p className="mt-1 text-caption text-content-muted">
                  Subdomains are discovered automatically — you do not need to list them.
                </p>
              </div>
            </div>
          )}

          {step === 'size' && (
            <div className="space-y-6">
              <div>
                <span className="font-mono text-caption text-accent">STEP 4 OF 6</span>
                <h2 className="font-heading text-heading-md font-semibold text-content-primary">
                  How many people work here?
                </h2>
                <p className="font-body text-body-sm text-content-secondary">
                  Used for scan scheduling and seat limits — nothing else.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {SIZES.map((sz) => {
                  const isSel = size === sz.label;
                  return (
                    <button
                      key={sz.label}
                      type="button"
                      onClick={() => {
                        setSize(sz.label);
                      }}
                      className={cn(
                        'flex flex-col items-start rounded-xl border p-4 text-left transition-all',
                        isSel
                          ? 'border-accent bg-surface-inset'
                          : 'border-border/80 hover:bg-surface-inset/50',
                      )}
                    >
                      <span className="font-body text-body-sm font-medium text-content-primary">
                        {sz.label}
                      </span>
                      <span className="mt-0.5 text-caption text-content-muted">
                        {sz.note}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'team' && (
            <div className="space-y-6">
              <div>
                <span className="font-mono text-caption text-accent">STEP 5 OF 6</span>
                <h2 className="font-heading text-heading-md font-semibold text-content-primary">
                  Invite the people who fix things
                </h2>
                <p className="font-body text-body-sm text-content-secondary">
                  Usually whoever runs your website or IT. You can do this later from Settings.
                </p>
              </div>

              <div className="space-y-2">
                {invites.map((inv, idx) => (
                  <div
                    key={`${inv.email}-${inv.role}`}
                    className="flex items-center justify-between rounded-xl border border-border bg-surface-inset px-4 py-3"
                  >
                    <span className="font-mono text-body-sm text-content-primary">
                      {inv.email}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="rounded-full border border-border/80 px-2.5 py-0.5 text-caption font-medium text-content-secondary">
                        {inv.role}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          removeInvite(idx);
                        }}
                        aria-label="Remove invite"
                        className="text-content-muted hover:text-critical-text"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                <div className="flex gap-2 pt-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => {
                      setInviteEmail(e.target.value);
                    }}
                    placeholder="teammate@company.in"
                    className="h-10 flex-1 rounded-lg border border-border bg-surface px-3 font-body text-body-sm text-content-primary outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={addInvite}
                    className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border px-4 text-caption font-medium text-content-primary hover:bg-surface-inset"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-6">
              <div>
                <span className="font-mono text-caption text-accent">STEP 6 OF 6</span>
                <h2 className="font-heading text-heading-md font-semibold text-content-primary">
                  Verify domain ownership
                </h2>
                <p className="font-body text-body-sm text-content-secondary">
                  Add one TXT record. We check every 30 seconds and continue on our own.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-surface-inset p-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-caption text-content-muted">TXT RECORD</span>
                  <span className="font-mono text-caption text-accent">qelvix-verify=6a8d9e2c</span>
                </div>
              </div>

              {renderTimelineItems()}
            </div>
          )}

          {step === 'scan' && (
            <div className="space-y-6">
              <div>
                <span className="font-mono text-caption text-accent">FIRST SCAN</span>
                <h2 className="font-heading text-heading-md font-semibold text-content-primary">
                  Scanning {domain || 'vardhmanexports.in'}
                </h2>
                <p className="font-body text-body-sm text-content-secondary">
                  Real checks against your real infrastructure. Three agents, roughly two
                  minutes.
                </p>
              </div>

              {renderTimelineItems()}
            </div>
          )}

          {step === 'report' && (
            <div className="space-y-6">
              <div>
                <span className="font-mono text-caption text-accent">FIRST REPORT</span>
                <h2 className="font-heading text-heading-md font-semibold text-content-primary">
                  Here is where you stand
                </h2>
                <p className="font-body text-body-sm text-content-secondary">
                  Two issues need attention this week. Start with the expired certificate.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="rounded-full bg-critical/10 px-2 py-0.5 text-caption font-semibold text-critical-text">
                      Critical
                    </span>
                    <p className="mt-2 font-body text-body-sm font-medium text-content-primary">
                      SSL certificate expired 4 days ago
                    </p>
                    <p className="font-mono text-caption text-content-muted">
                      mail.{domain || 'vardhmanexports.in'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="rounded-full bg-warning/10 px-2 py-0.5 text-caption font-semibold text-warning-text">
                      High
                    </span>
                    <p className="mt-2 font-body text-body-sm font-medium text-content-primary">
                      No DMARC record — email is spoofable
                    </p>
                    <p className="font-mono text-caption text-content-muted">
                      {domain || 'vardhmanexports.in'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-caption font-semibold text-accent">
                      Medium
                    </span>
                    <p className="mt-2 font-body text-body-sm font-medium text-content-primary">
                      SPF uses ~all instead of -all
                    </p>
                    <p className="font-mono text-caption text-content-muted">
                      {domain || 'vardhmanexports.in'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border/60 pt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 'welcome'}
            className="rounded-lg px-4 py-2 text-caption font-medium text-content-secondary hover:text-content-primary disabled:opacity-30"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleNext}
            disabled={(step === 'verify' || step === 'scan') && !timelineComplete}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-accent px-5 text-caption font-semibold text-white shadow-2xs transition-all hover:brightness-105 disabled:opacity-50"
          >
            <span>
              {step === 'welcome'
                ? 'Get started'
                : step === 'report'
                  ? 'Go to dashboard'
                  : 'Continue'}
            </span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
