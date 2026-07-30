import type { Metadata } from 'next';

import { ReportsScreen } from '@/components/dashboard/screens/ReportsScreen';

export const metadata: Metadata = { title: 'Reports — Qelvix' };

export default function ReportsPage() {
  return <ReportsScreen />;
}
