import type { Metadata } from 'next';

import { AssetDetailScreen } from '@/components/dashboard/screens/AssetDetailScreen';

export const metadata: Metadata = { title: 'Asset — Qelvix' };

export default function AssetDetailPage({ params }: { params: { id: string } }) {
  return <AssetDetailScreen id={params.id} />;
}
