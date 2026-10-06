import { redirect } from 'next/navigation';
import { ChangePasswordForm } from '@/components/admin/change-password-form';
import { getCurrentUser } from '@/lib/services/auth.service';

export const dynamic = 'force-dynamic';

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ obrigatorio?: string }>;
}) {
  const query = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');

  return (
    <ChangePasswordForm
      email={user.email}
      required={Boolean(user.mustChangePassword) || query.obrigatorio === '1'}
    />
  );
}
