import { redirect } from 'next/navigation';
import { UserManagementPage } from '@/components/admin/user-management-page';
import { getCurrentUser } from '@/lib/services/auth.service';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');
  if (user.role !== 'ADMIN') redirect('/admin');
  return <UserManagementPage currentUserId={user.id} />;
}
