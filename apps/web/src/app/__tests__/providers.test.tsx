"use client";

import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@mui/material/styles";
import Providers from "../providers";

jest.mock("@/contexts/auth-context", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

jest.mock("@/contexts/search-context", () => ({
  SearchProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const Probe = () => {
  const queryClient = useQueryClient();
  const theme = useTheme();

  return <div>{queryClient && theme ? theme.shape.borderRadius : "missing"}</div>;
};

describe("Providers", () => {
  it("wraps children with theme and query client providers", () => {
    render(
      <Providers>
        <Probe />
        <span>child content</span>
      </Providers>,
    );

    expect(screen.getByText("child content")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });
});
