import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardEditContent } from './dashboard-edit-content';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardEditPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  const { id } = await params;

  return <DashboardEditContent dashboardId={id} user={session.user} />;
}
