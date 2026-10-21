import { loadWebEnv } from "@glucosapp/env";

export const getWebEnv = () =>
  loadWebEnv({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  });

export const getWebApiBaseUrl = () => getWebEnv().NEXT_PUBLIC_API_BASE_URL;
