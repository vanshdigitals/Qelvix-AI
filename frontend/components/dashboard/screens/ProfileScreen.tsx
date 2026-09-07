'use client';

import { useState } from 'react';

import { useToast } from '@/components/dashboard/AppShell';
import { DeleteAccountModal } from '@/components/dashboard/DeleteAccountModal';
import {
  GhostButton,
  Panel,
  PanelTitle,
  PrimaryButton,
  ScreenHeader,
} from '@/components/dashboard/shared';
import { useAuth } from '@/components/providers/AuthProvider';

export function ProfileScreen() {
  const toast = useToast();
  const { user } = useAuth();

  const realName =
    (user?.user_metadata.full_name as string | undefined) ??
    (user?.user_metadata.name as string | undefined) ??
    user?.email?.split('@')[0] ??
    'Account Owner';

  const realEmail = user?.email ?? '';

  const initials = realName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('') || 'U';

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recently';

  const [nameInput, setNameInput] = useState(realName);
  const [titleInput, setTitleInput] = useState('Account Owner');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader title="Profile" caption="Your account details" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <Panel className="flex flex-col gap-5">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border border-border bg-surface-inset font-display text-h4 font-semibold text-content-primary">
                {initials}
              </span>
              <div className="flex flex-col gap-1">
                <span className="font-display text-h3 text-content-primary">{realName}</span>
                <span className="text-body-sm text-content-muted">
                  Owner · Member since {memberSince}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="p-name" className="text-body-sm font-medium text-content-secondary">
                Full name
              </label>
              <input
                id="p-name"
                type="text"
                value={nameInput}
                onChange={(e) => {
                  setNameInput(e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-border-strong bg-surface-inset px-3.5 text-body-md text-content-primary outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="p-email" className="text-body-sm font-medium text-content-secondary">
                Email
              </label>
              <input
                id="p-email"
                type="text"
                value={realEmail}
                disabled
                className="h-11 w-full rounded-xl border border-border-strong bg-surface-inset px-3.5 tabular-nums text-body-sm text-content-primary outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
              <span className="text-caption text-content-muted">
                Managed through your login provider and cannot be modified here.
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="p-title" className="text-body-sm font-medium text-content-secondary">
                Role / Title
              </label>
              <input
                id="p-title"
                type="text"
                value={titleInput}
                onChange={(e) => {
                  setTitleInput(e.target.value);
                }}
                className="h-11 w-full rounded-xl border border-border-strong bg-surface-inset px-3.5 text-body-md text-content-primary outline-none transition-colors focus:border-accent focus:ring-1 focus:ring-accent"
              />
            </div>

            <PrimaryButton
              onClick={() => {
                toast('Profile saved.');
              }}
            >
              Save profile
            </PrimaryButton>
          </Panel>

          {/* Danger Zone */}
          <div className="flex flex-col gap-4 rounded-2xl border border-critical-text/40 bg-surface p-6 shadow-xs">
            <PanelTitle>Delete account</PanelTitle>
            <p className="text-body-sm leading-relaxed text-content-secondary">
              Permanently deletes your Qelvix account, your organisation, all monitored domains,
              scans, findings, DPDP reports, and authentication credentials. This action cannot be
              undone.
            </p>
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(true);
              }}
              className="inline-flex h-10 items-center justify-center self-start rounded-lg border border-critical-text/40 px-4 text-body-sm font-semibold text-critical-text transition-colors hover:bg-critical-bg"
            >
              Delete account
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <Panel className="flex flex-col gap-3.5">
            <PanelTitle>Two-factor authentication</PanelTitle>
            <div className="flex items-center gap-3">
              <span className="inline-flex flex-1 items-center gap-1.5 text-body-sm text-content-muted">
                <span className="h-1.5 w-1.5 rounded-full bg-content-muted" />
                Managed by Supabase OAuth
              </span>
              <GhostButton
                onClick={() => {
                  toast('2FA management is controlled via your OAuth provider.');
                }}
              >
                Info
              </GhostButton>
            </div>
          </Panel>

          <Panel className="flex flex-col gap-3">
            <PanelTitle>Session</PanelTitle>
            <div className="flex items-center justify-between text-body-sm">
              <div className="flex flex-col">
                <span className="font-medium text-content-primary">Current device</span>
                <span className="text-caption text-content-muted">Active authenticated session</span>
              </div>
              <span className="text-caption font-medium text-success-text">Active</span>
            </div>
          </Panel>
        </div>
      </div>

      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
        }}
      />
    </div>
  );
}
