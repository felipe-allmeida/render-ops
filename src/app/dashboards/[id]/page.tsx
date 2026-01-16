import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardViewContent } from './dashboard-view-content';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DashboardViewPage({ params }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  const { id } = await params;

  return <DashboardViewContent dashboardId={id} user={session.user} />;
}
