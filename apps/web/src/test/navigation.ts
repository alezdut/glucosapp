import type { useRouter, useSearchParams } from "next/navigation";

export type MockRouter = jest.Mocked<ReturnType<typeof useRouter>>;
export type MockSearchParams = ReturnType<typeof useSearchParams>;

export const createMockRouter = (overrides: Partial<MockRouter> = {}): MockRouter => ({
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  ...overrides,
});

export const createMockSearchParams = (params: Record<string, string>): MockSearchParams => {
  const searchParams = new URLSearchParams(params);
  return searchParams as unknown as MockSearchParams;
};

export const setMockSearchParams = (
  mockUseSearchParams: jest.MockedFunction<typeof useSearchParams>,
  params: Record<string, string>,
): void => {
  mockUseSearchParams.mockReturnValue(createMockSearchParams(params));
};
