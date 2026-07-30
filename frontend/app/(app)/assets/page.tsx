import type { Metadata } from 'next';

import { AssetsScreen } from '@/components/dashboard/screens/AssetsScreen';

export const metadata: Metadata = { title: 'Assets — Qelvix' };

export default function AssetsPage() {
  return <AssetsScreen />;
}
