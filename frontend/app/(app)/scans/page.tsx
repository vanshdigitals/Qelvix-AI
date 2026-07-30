import type { Metadata } from 'next';

import { ScansScreen } from '@/components/dashboard/screens/ScansScreen';

export const metadata: Metadata = { title: 'Scans — Qelvix' };

export default function ScansPage() {
  return <ScansScreen />;
}
