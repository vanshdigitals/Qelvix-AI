import type { Metadata } from 'next';

import { ScanDetailScreen } from '@/components/dashboard/screens/ScanDetailScreen';

export const metadata: Metadata = { title: 'Scan — Qelvix' };

export default function ScanDetailPage({ params }: { params: { id: string } }) {
  return <ScanDetailScreen id={params.id} />;
}
