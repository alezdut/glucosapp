import { loadWebEnv } from "@glucosapp/env";

export const getWebEnv = () => loadWebEnv();

const normalizeApiOrigin = (baseUrl: string) => baseUrl.replace(/\/+$/, "").replace(/\/v1$/, "");

export const getWebApiOrigin = () => normalizeApiOrigin(getWebEnv().NEXT_PUBLIC_API_BASE_URL);

export const getWebApiBaseUrl = () => `${getWebApiOrigin()}/v1`;
