export const createMockRouter = () => ({
  push: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
});

export const createMockSearchParams = (params: Record<string, string>) => ({
  get: (key: string) => params[key] ?? null,
});
