'use client';

import { Bell } from 'lucide-react';

import { Panel, ScreenHeader } from '@/components/dashboard/shared';

export function NotificationsScreen() {
  return (
    <div className="flex flex-col gap-5">
      <ScreenHeader title="Notifications" caption="Alerts about your security posture." />

      <Panel className="flex flex-col items-center gap-3 py-14 text-center">
        <Bell className="h-8 w-8 text-content-muted" />
        <p className="text-body-md font-medium text-content-primary">No notifications yet</p>
        <p className="max-w-md text-body-sm text-content-secondary">
          When a scan completes, critical and high-severity findings will surface here. Delivery
          preferences (email / WhatsApp) aren&apos;t configurable in the current MVP.
        </p>
      </Panel>
    </div>
  );
}
