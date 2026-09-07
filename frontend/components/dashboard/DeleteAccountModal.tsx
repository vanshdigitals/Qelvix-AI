'use client';

import { AlertTriangle, Check, Copy, Globe, Loader2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { getApiUrl } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';

interface DnsRecord {
  domain: string;
  record_type: string;
  host: string;
  value: string;
  verified: boolean;
}

interface DeletionSummary {
  total_organizations: number;
  total_scans: number;
  total_findings: number;
  total_assets: number;
  total_compliance_reports: number;
  total_notifications: number;
  total_audit_logs: number;
}

interface DeletionPreview {
  user_id: string;
  email: string | null;
  organizations: { id: string; name: string; primary_domain?: string }[];
  dns_records: DnsRecord[];
  summary_counts: DeletionSummary;
}

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountModal({ isOpen, onClose }: DeleteAccountModalProps) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<DeletionPreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [confirmInput, setConfirmInput] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setConfirmInput('');
      setDeleteError(null);
      setCopiedToken(null);
      return;
    }

    async function loadPreview(): Promise<void> {
      setLoading(true);
      setLoadError(null);
      try {
        const supabase = createClient();
        if (!supabase) {
          setLoadError('Supabase client not available');
          setLoading(false);
          return;
        }
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          setLoadError('Not authenticated');
          setLoading(false);
          return;
        }

        const baseUrl = getApiUrl();
        const res = await fetch(`${baseUrl}/account/deletion-preview`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          setLoadError(`Failed to load deletion preview (${String(res.status)})`);
          setLoading(false);
          return;
        }

        const data = (await res.json()) as DeletionPreview;
        setPreview(data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Network error');
      } finally {
        setLoading(false);
      }
    }

    void loadPreview();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (val: string): void => {
    void navigator.clipboard.writeText(val);
    setCopiedToken(val);
    setTimeout(() => {
      setCopiedToken(null);
    }, 2500);
  };

  const handleDelete = async (): Promise<void> => {
    if (confirmInput.trim() !== 'DELETE') return;

    setDeleting(true);
    setDeleteError(null);

    try {
      const supabase = createClient();
      if (!supabase) {
        setDeleteError('Supabase client not available');
        setDeleting(false);
        return;
      }
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setDeleteError('Not authenticated');
        setDeleting(false);
        return;
      }

      const baseUrl = getApiUrl();
      const res = await fetch(`${baseUrl}/account/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ confirmation: 'DELETE' }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { detail?: string };
        setDeleteError(data.detail ?? `Deletion failed (${String(res.status)})`);
        setDeleting(false);
        return;
      }

      // Deletion succeeded on backend. Sign out locally and redirect.
      await supabase.auth.signOut();
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
      }
      router.push('/login?deleted=true');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Network error during deletion');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={deleting ? undefined : onClose}
        aria-hidden
      />

      {/* Modal dialog */}
      <div className="relative z-10 max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2.5 text-critical-text">
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
            <h2 className="font-display text-h3 font-semibold text-content-primary">
              Delete Account
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-lg p-1 text-content-muted transition-colors hover:bg-surface-inset hover:text-content-primary disabled:opacity-40"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-content-muted">
            <Loader2 className="h-7 w-7 animate-spin" />
            <span className="text-body-sm">Auditing account data to prepare deletion…</span>
          </div>
        )}

        {loadError && (
          <div className="my-6 rounded-xl border border-critical-text/40 bg-critical-bg/30 p-4 text-body-sm text-critical-text">
            <p className="font-medium">Couldn&apos;t load account preview</p>
            <p className="mt-1 text-content-secondary">{loadError}</p>
          </div>
        )}

        {!loading && preview && (
          <div className="mt-5 space-y-6">
            {/* Warning description */}
            <div className="rounded-xl border border-critical-text/30 bg-critical-bg/20 p-4 text-body-sm leading-relaxed text-content-secondary">
              <span className="font-semibold text-critical-text">Warning:</span> This permanently
              deletes your Qelvix account and all data associated with it. This action cannot be
              undone.
            </div>

            {/* DNS Cleanup Guidance if domain records exist */}
            {preview.dns_records.length > 0 && (
              <div className="space-y-3 rounded-xl border border-border bg-surface-inset p-4">
                <div className="flex items-center gap-2 text-content-primary">
                  <Globe className="h-4 w-4 text-accent" />
                  <span className="font-display text-body-sm font-semibold">
                    Remove Qelvix DNS verification records
                  </span>
                </div>
                <p className="text-body-xs text-content-secondary">
                  Qelvix cannot remove this DNS record automatically because we do not control your
                  DNS provider. Before deleting your account, remove the Qelvix verification TXT
                  record from your domain&apos;s DNS settings:
                </p>

                {preview.dns_records.map((rec) => (
                  <div
                    key={rec.domain}
                    className="space-y-2 rounded-lg border border-border/80 bg-surface p-3"
                  >
                    <div className="flex items-center justify-between text-caption">
                      <span className="text-content-muted">DOMAIN</span>
                      <span className="tabular-nums font-medium text-content-primary">
                        {rec.domain}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-caption">
                      <span className="text-content-muted">TYPE</span>
                      <span className="tabular-nums font-medium text-content-primary">
                        {rec.record_type}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-caption">
                      <span className="text-content-muted">HOST / NAME</span>
                      <span className="tabular-nums font-medium text-content-primary">
                        {rec.host}
                      </span>
                    </div>
                    <div className="pt-1">
                      <span className="text-caption text-content-muted">VALUE TO REMOVE:</span>
                      <div className="mt-1 flex items-center justify-between gap-2 rounded-md bg-surface-inset p-2 font-mono text-[11px] text-accent">
                        <span className="break-all">{rec.value}</span>
                        <button
                          type="button"
                          onClick={() => {
                            handleCopy(rec.value);
                          }}
                          className="shrink-0 rounded p-1 text-content-secondary transition-colors hover:bg-surface hover:text-content-primary"
                          title="Copy verification value"
                        >
                          {copiedToken === rec.value ? (
                            <Check className="h-3.5 w-3.5 text-success-text" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                <p className="text-caption text-content-muted">
                  Open your DNS provider (Cloudflare, GoDaddy, Namecheap, etc.) → find the Qelvix
                  verification TXT record → remove it → then continue below.
                </p>
              </div>
            )}

            {/* Itemized Deletion Scope */}
            <div className="space-y-2 rounded-xl border border-border bg-surface-inset p-4">
              <span className="text-caption font-semibold uppercase tracking-wider text-content-muted">
                Data marked for permanent erasure:
              </span>
              <ul className="space-y-1 text-body-sm text-content-secondary">
                <li>
                  • <span className="text-content-primary font-medium">{preview.summary_counts.total_organizations}</span> organisation(s) and configuration settings
                </li>
                <li>
                  • <span className="text-content-primary font-medium">{preview.summary_counts.total_assets}</span> monitored domains and asset records
                </li>
                <li>
                  • <span className="text-content-primary font-medium">{preview.summary_counts.total_scans}</span> attack surface scans and history logs
                </li>
                <li>
                  • <span className="text-content-primary font-medium">{preview.summary_counts.total_findings}</span> security findings and remediation guides
                </li>
                <li>
                  • <span className="text-content-primary font-medium">{preview.summary_counts.total_compliance_reports}</span> DPDP compliance readiness evaluations
                </li>
                <li>
                  • <span className="text-content-primary font-medium">{preview.summary_counts.total_notifications}</span> alerts and notifications
                </li>
                <li>
                  • <span className="text-content-primary font-medium">{preview.summary_counts.total_audit_logs}</span> tamper-evident audit log entries
                </li>
                <li>
                  • Your user login and authentication identity in Supabase Auth
                </li>
              </ul>
            </div>

            {/* Deletion confirmation input */}
            <div className="space-y-3 pt-2">
              <label
                htmlFor="confirm-delete-input"
                className="block text-body-sm font-medium text-content-primary"
              >
                To confirm permanent deletion, type <span className="font-mono text-critical-text font-semibold">DELETE</span> below:
              </label>
              <input
                id="confirm-delete-input"
                type="text"
                disabled={deleting}
                value={confirmInput}
                onChange={(e) => {
                  setConfirmInput(e.target.value);
                }}
                placeholder="DELETE"
                autoComplete="off"
                className="h-11 w-full rounded-xl border border-border-strong bg-surface-inset px-3.5 font-mono text-body-md text-content-primary outline-none transition-colors focus:border-critical-text focus:ring-1 focus:ring-critical-text"
              />
            </div>

            {deleteError && (
              <div className="rounded-xl border border-critical-text/40 bg-critical-bg/30 p-3 text-body-sm text-critical-text">
                {deleteError}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border/60 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={deleting}
                className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-body-sm font-semibold text-content-secondary transition-colors hover:bg-surface-inset hover:text-content-primary disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={confirmInput.trim() !== 'DELETE' || deleting}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-critical-text px-4 text-body-sm font-semibold text-white transition-colors hover:bg-critical-text/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Permanently deleting…
                  </>
                ) : (
                  'Delete My Account Permanently'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
