import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import { SafeAreaProvider } from "react-native-safe-area-context";

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

type Options = Omit<RenderOptions, "wrapper"> & {
  queryClient?: QueryClient;
};

export const renderMobile = (ui: React.ReactElement, options: Options = {}) => {
  const queryClient = options.queryClient ?? createTestQueryClient();

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SafeAreaProvider>
  );

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...options }),
  };
};
