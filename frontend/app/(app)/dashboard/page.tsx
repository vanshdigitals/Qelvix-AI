import type { Metadata } from 'next';

import { DashboardOverview } from '@/components/dashboard/DashboardOverview';

export const metadata: Metadata = {
  title: 'Dashboard — Qelvix',
  description: 'Continuous exposure monitoring dashboard and security health overview.',
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
