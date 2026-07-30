import type { Metadata } from 'next';

import { ProfileScreen } from '@/components/dashboard/screens/ProfileScreen';

export const metadata: Metadata = { title: 'Profile — Qelvix' };

export default function ProfilePage() {
  return <ProfileScreen />;
}
