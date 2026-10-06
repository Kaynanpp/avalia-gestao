import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/services/auth.service';
import { PeerManagementPage } from '@/components/peer/management-page';

export const dynamic = 'force-dynamic';
export default async function CoworkersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');
  if (user.role !== 'RH' && user.role !== 'ADMIN') redirect('/admin');
  return <PeerManagementPage />;
}
