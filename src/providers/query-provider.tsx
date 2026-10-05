"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";
import { createRetryDelayResolver, createRetryPredicate } from "./query-retry";

interface QueryProviderProps {
  children: ReactNode;
}

// Bound once at module scope: the policy is stateless, so every QueryClient
// created by this provider shares the same backoff behaviour.
const rateLimitAwareRetry = createRetryPredicate();
const rateLimitAwareRetryDelay = createRetryDelayResolver();

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // #481: keep dashboard queries from refetching on every window
            // focus. Stale data is served for a minute instead.
            staleTime: 60000,
            // #412: honours Retry-After on 429s, otherwise backs off
            // exponentially with a cap instead of retrying immediately and
            // worsening the throttling. See ./query-retry.
            retry: rateLimitAwareRetry,
            retryDelay: rateLimitAwareRetryDelay,
            refetchOnWindowFocus: false,
          },
        },
      })
  );
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const userId = useAuthStore((state) => state.user?.id);
  const identity = isAuthenticated ? userId ?? "authenticated" : null;
  const previousIdentity = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (previousIdentity.current !== undefined && previousIdentity.current !== identity) {
      queryClient.removeQueries({ queryKey: queryKeys.notifications.all });
    }
    previousIdentity.current = identity;
  }, [identity, queryClient]);

  useEffect(() => {
    const clearNotificationQueries = () => {
      queryClient.removeQueries({ queryKey: queryKeys.notifications.all });
    };
    window.addEventListener("auth:required", clearNotificationQueries);
    return () => window.removeEventListener("auth:required", clearNotificationQueries);
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
