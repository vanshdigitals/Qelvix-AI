import React from 'react';

interface DemoHelperCardProps {
  onFill: () => void;
  email: string;
}

export function DemoHelperCard({ onFill, email }: DemoHelperCardProps) {
  return (
    <div className="mt-4 rounded-xl border border-border bg-surface-inset p-4 shadow-sm">
      <h3 className="font-heading text-body-sm font-semibold text-content-primary">
        Demo Workspace
      </h3>
      <div className="mt-2 flex flex-col gap-1 text-caption text-content-secondary">
        <div className="flex items-center justify-between">
          <span>Email:</span>
          <span className="font-medium text-content-primary">{email}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Password:</span>
          <span className="font-mono text-content-primary">••••••••</span>
        </div>
      </div>
      <button
        type="button"
        onClick={onFill}
        className="hover:bg-accent-hover mt-3 w-full rounded-lg bg-accent px-4 py-2 text-body-sm font-medium text-white transition-colors"
      >
        Fill Demo Credentials
      </button>
    </div>
  );
}
