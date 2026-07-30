import type { Metadata } from 'next';

import { TeamScreen } from '@/components/dashboard/screens/TeamScreen';

export const metadata: Metadata = { title: 'Team & roles — Qelvix' };

export default function TeamPage() {
  return <TeamScreen />;
}
