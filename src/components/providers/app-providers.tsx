'use client';

import React from 'react';
import { SessionProvider } from 'next-auth/react';
import { DataProvider } from './data-provider';
import { ActionProvider } from './action-provider';

interface AppProvidersProps {
  children: React.ReactNode;
  initialData?: Record<string, unknown>;
  actions?: Record<string, (params: Record<string, unknown>) => Promise<unknown>>;
}

export function AppProviders({
  children,
  initialData = {},
  actions = {},
}: AppProvidersProps) {
  return (
    <SessionProvider>
      <DataProvider initialData={initialData}>
        <ActionProvider actions={actions}>{children}</ActionProvider>
      </DataProvider>
    </SessionProvider>
  );
}
