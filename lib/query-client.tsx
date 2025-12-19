'use client';

/**
 * React Query Configuration
 * Provides QueryClient and QueryClientProvider for the application
 */

import { QueryClient, QueryClientProvider, HydrationBoundary, DehydratedState } from '@tanstack/react-query';
import { useState, ReactNode } from 'react';

// Default query client options
const defaultQueryClientOptions = {
  defaultOptions: {
    queries: {
      // Don't refetch on window focus by default
      refetchOnWindowFocus: false,
      // Retry failed requests once
      retry: 1,
      // Consider data stale after 30 seconds
      staleTime: 30 * 1000,
      // Cache data for 5 minutes
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
};

interface QueryProviderProps {
  children: ReactNode;
  dehydratedState?: DehydratedState;
}

/**
 * Query Provider Component
 * Wraps the application with React Query's QueryClientProvider
 * Supports hydration of server-prefetched data
 */
export function QueryProvider({ children, dehydratedState }: QueryProviderProps) {
  // Create a new QueryClient instance for each session
  // This prevents sharing state between users/requests in SSR
  const [queryClient] = useState(() => new QueryClient(defaultQueryClientOptions));

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        {children}
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

/**
 * Create a standalone QueryClient for server-side use
 */
export function createQueryClient() {
  return new QueryClient(defaultQueryClientOptions);
}

