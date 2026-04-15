import { loadMobileEnv } from "@glucosapp/env";

export const getMobileEnv = () => loadMobileEnv();

const normalizeApiOrigin = (baseUrl: string) => baseUrl.replace(/\/+$/, "").replace(/\/v1$/, "");

export const getMobileApiOrigin = () => normalizeApiOrigin(getMobileEnv().EXPO_PUBLIC_API_BASE_URL);

export const getMobileApiBaseUrl = () => `${getMobileApiOrigin()}/v1`;

export const getMobileImageAnalysisBaseUrl = () =>
  getMobileEnv().EXPO_PUBLIC_IMAGE_ANALYSIS_BASE_URL;
