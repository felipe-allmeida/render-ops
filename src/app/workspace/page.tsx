import { Suspense } from 'react';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { DashboardContent } from './dashboard-content';

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600">Loading workspace...</p>
      </div>
    </div>
  );
}

export default async function WorkspacePage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <DashboardContent user={session.user} />
    </Suspense>
  );
}
