import type { Metadata } from 'next';

import { FindingDetailScreen } from '@/components/dashboard/screens/FindingDetailScreen';

export const metadata: Metadata = { title: 'Finding — Qelvix' };

export default function FindingDetailPage({ params }: { params: { id: string } }) {
  return <FindingDetailScreen id={params.id} />;
}
