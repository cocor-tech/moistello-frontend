"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { queryKeys } from "@/lib/query-keys";

interface QueryProviderProps {
  children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5000,
            retry: 1,
            refetchOnWindowFocus: true,
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
