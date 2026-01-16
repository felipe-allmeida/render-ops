import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardsListContent } from './dashboards-list-content';

export default async function DashboardsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  return <DashboardsListContent user={session.user} />;
}
