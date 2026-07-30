import type { Metadata } from 'next';

import { NotificationsScreen } from '@/components/dashboard/screens/NotificationsScreen';

export const metadata: Metadata = { title: 'Notifications — Qelvix' };

export default function NotificationsPage() {
  return <NotificationsScreen />;
}
