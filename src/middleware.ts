export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: ['/workspace/:path*', '/dashboards/:path*', '/api/connections/:path*', '/api/actions/:path*', '/api/ui/:path*', '/api/dashboards/:path*'],
};
