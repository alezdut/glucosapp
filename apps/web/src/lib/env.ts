import { loadWebEnv } from "@glucosapp/env";

export const getWebEnv = () => loadWebEnv();

export const getWebApiBaseUrl = () => getWebEnv().NEXT_PUBLIC_API_BASE_URL;
