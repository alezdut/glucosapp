import { loadMobileEnv } from "@glucosapp/env";

export const getMobileEnv = () => loadMobileEnv();

export const getMobileApiBaseUrl = () => getMobileEnv().EXPO_PUBLIC_API_BASE_URL;

export const getMobileImageAnalysisBaseUrl = () =>
  getMobileEnv().EXPO_PUBLIC_IMAGE_ANALYSIS_BASE_URL;
