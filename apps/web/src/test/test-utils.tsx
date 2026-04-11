import type { ReactElement, ReactNode } from "react";
import { render } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { borderRadius, colors } from "@glucosapp/theme";

const testTheme = createTheme({
  palette: {
    primary: { main: colors.primary },
    secondary: { main: colors.secondary },
    error: { main: colors.error },
    warning: { main: colors.warning },
    success: { main: colors.success },
    info: { main: colors.info },
    background: {
      default: colors.background,
      paper: colors.surface,
    },
    text: {
      primary: colors.text,
      secondary: colors.textSecondary,
    },
  },
  shape: {
    borderRadius: borderRadius.md,
  },
});

export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

export const createProvidersWrapper = (queryClient = createTestQueryClient()) => {
  return {
    queryClient,
    Wrapper: ({ children }: { children: ReactNode }) => (
      <ThemeProvider theme={testTheme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ThemeProvider>
    ),
  };
};

export const renderWithProviders = (ui: ReactElement, queryClient = createTestQueryClient()) => {
  return {
    queryClient,
    ...render(
      <ThemeProvider theme={testTheme}>
        <CssBaseline />
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </ThemeProvider>,
    ),
  };
};
