import type { Metadata } from 'next';

import { FindingsScreen } from '@/components/dashboard/screens/FindingsScreen';

export const metadata: Metadata = { title: 'Findings — Qelvix' };

export default function FindingsPage() {
  return <FindingsScreen />;
}
