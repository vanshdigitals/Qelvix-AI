import type { Metadata } from 'next';

import { SettingsScreen } from '@/components/dashboard/screens/SettingsScreen';

export const metadata: Metadata = { title: 'Settings — Qelvix' };

export default function SettingsPage() {
  return <SettingsScreen />;
}
