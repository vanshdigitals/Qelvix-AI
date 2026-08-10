import type { Metadata } from 'next';

import { ApiKeysScreen } from '@/components/dashboard/screens/ApiKeysScreen';

export const metadata: Metadata = { title: 'API keys — Qelvix' };

export default function ApiKeysPage() {
  return <ApiKeysScreen />;
}
