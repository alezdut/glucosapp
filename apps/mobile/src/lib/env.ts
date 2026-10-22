import { loadMobileEnv } from "@glucosapp/env";

export const getMobileEnv = () =>
  loadMobileEnv({
    NODE_ENV: process.env.NODE_ENV,
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_IMAGE_ANALYSIS_BASE_URL: process.env.EXPO_PUBLIC_IMAGE_ANALYSIS_BASE_URL,
    EXPO_PUBLIC_GOOGLE_CLIENT_ID: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    EXPO_PUBLIC_EAS_PROJECT_ID: process.env.EXPO_PUBLIC_EAS_PROJECT_ID,
  });

const normalizeApiOrigin = (baseUrl: string) => baseUrl.replace(/\/+$/, "").replace(/\/v1$/, "");

export const getMobileApiOrigin = () => normalizeApiOrigin(getMobileEnv().EXPO_PUBLIC_API_BASE_URL);

export const getMobileApiBaseUrl = () => `${getMobileApiOrigin()}/v1`;

export const getMobileImageAnalysisBaseUrl = () =>
  getMobileEnv().EXPO_PUBLIC_IMAGE_ANALYSIS_BASE_URL;
