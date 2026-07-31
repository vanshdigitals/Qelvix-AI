'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useToast } from '@/components/dashboard/AppShell';
import { Panel, PanelTitle, PrimaryButton, ScreenHeader } from '@/components/dashboard/shared';
import { API_URL, useApi } from '@/lib/api/client';
import { createClient } from '@/lib/supabase/client';

const TABS = [
  { label: 'Organisation', href: '/settings', active: true },
  { label: 'Notifications', href: '/notifications', active: false },
  { label: 'Profile', href: '/profile', active: false },
];

export interface ApiOrgProfile {
  id: string;
  name: string;
  primary_domain: string;
  whatsapp_number: string | null;
  notification_email: string | null;
  domain_verified: boolean;
  created_at: string;
}

export function SettingsScreen() {
  const toast = useToast();
  const { data: org, loading, error } = useApi<ApiOrgProfile>('/org/me');
  
  const [name, setName] = useState('');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name);
      setNotificationEmail(org.notification_email ?? '');
      setWhatsappNumber(org.whatsapp_number ?? '');
    }
  }, [org]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-content-muted" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <div className="text-body-md font-medium text-high-text">
          Couldn't load your settings — {error}
        </div>
        <p className="text-body-sm text-content-secondary">
          Please try reloading the page or check your authentication.
        </p>
      </div>
    );
  }

  if (error || !org) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-body-sm text-content-muted">{error ?? 'Organisation not found.'}</p>
      </div>
    );
  }

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const supabase = createClient();
      if (!supabase) {
        toast('Backend not configured.');
        return;
      }
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      if (!token) {
        toast('Not authenticated.');
        return;
      }
      
      const res = await fetch(`${API_URL}/org/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name,
          notification_email: notificationEmail || null,
          whatsapp_number: whatsappNumber || null,
        }),
      });
      
      if (res.ok) {
        toast('Organisation details saved.');
      } else {
        toast(`Failed to save (${String(res.status)}).`);
      }
    } catch {
      toast('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader
        title="Organisation"
        caption="Appears on every report you share outside the company"
      />

      <div className="flex flex-wrap items-center gap-1 self-start rounded-lg border border-border bg-surface-inset p-1">
        {TABS.map((t) =>
          t.active ? (
            <span
              key={t.label}
              aria-current="page"
              className="h-8 rounded-md bg-surface px-3 text-body-sm font-semibold leading-8 text-content-primary shadow-2xs"
            >
              {t.label}
            </span>
          ) : (
            <Link
              key={t.label}
              href={t.href}
              className="h-8 rounded-md px-3 text-body-sm font-semibold leading-8 text-content-secondary transition-colors hover:text-content-primary"
            >
              {t.label}
            </Link>
          ),
        )}
      </div>

      <div className="flex max-w-2xl flex-col gap-5">
        <Panel className="flex flex-col gap-5">
          <PanelTitle>Business details</PanelTitle>
          
          <div className="flex flex-col gap-2">
            <label htmlFor="org-name" className="text-body-sm font-medium text-content-secondary">
              Legal name
            </label>
            <input
              id="org-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); }}
              className="h-11 w-full rounded-xl border border-border-strong bg-surface-inset px-3.5 text-body-md text-content-primary outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <span className="text-caption text-content-muted">Shown on every shared report</span>
          </div>
          
          <div className="flex flex-col gap-2">
            <label htmlFor="org-domain" className="text-body-sm font-medium text-content-secondary">
              Primary domain
            </label>
            <input
              id="org-domain"
              type="text"
              disabled
              value={org.primary_domain}
              className="h-11 w-full rounded-xl border border-border-strong bg-surface-inset px-3.5 tabular-nums text-body-sm text-content-primary outline-none disabled:opacity-50"
            />
            <span className="text-caption text-content-muted">
              {org.domain_verified ? 'Verified via DNS TXT' : 'Not verified'}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="org-email" className="text-body-sm font-medium text-content-secondary">
              Security contact
            </label>
            <input
              id="org-email"
              type="email"
              value={notificationEmail}
              onChange={(e) => { setNotificationEmail(e.target.value); }}
              className="h-11 w-full rounded-xl border border-border-strong bg-surface-inset px-3.5 tabular-nums text-body-sm text-content-primary outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <span className="text-caption text-content-muted">Receives critical alerts</span>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="org-phone" className="text-body-sm font-medium text-content-secondary">
              WhatsApp number
            </label>
            <input
              id="org-phone"
              type="tel"
              value={whatsappNumber}
              onChange={(e) => { setWhatsappNumber(e.target.value); }}
              className="h-11 w-full rounded-xl border border-border-strong bg-surface-inset px-3.5 tabular-nums text-body-sm text-content-primary outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <span className="text-caption text-content-muted">For real-time alerts</span>
          </div>

          <div className="flex items-center gap-3">
            <PrimaryButton
              disabled={isSaving}
              onClick={() => { void handleSave(); }}
            >
              {isSaving ? 'Saving...' : 'Save changes'}
            </PrimaryButton>
            <span className="text-caption text-content-muted">Changes apply to new reports</span>
          </div>
        </Panel>

        <div className="border-critical-text/40 flex flex-col gap-4 rounded-2xl border bg-surface p-6 shadow-xs">
          <PanelTitle>Delete organisation</PanelTitle>
          <p className="text-body-sm leading-relaxed text-content-secondary">
            Removes every asset, finding, report and audit record for {org.name}. Team members
            lose access immediately. This cannot be undone and support cannot restore it.
          </p>
          <button
            type="button"
            onClick={() => {
              toast('Deleting the organisation requires email confirmation.');
            }}
            className="border-critical-text/40 inline-flex h-10 items-center justify-center self-start rounded-lg border px-4 text-body-sm font-semibold text-critical-text transition-colors hover:bg-critical-bg"
          >
            Delete organisation
          </button>
        </div>
      </div>
    </div>
  );
}
