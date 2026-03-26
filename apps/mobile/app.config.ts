import type { ExpoConfig } from "expo/config";

const appJson = require("./app.json") as { expo: ExpoConfig };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const resolveEasProjectId = (): string | undefined => {
  const candidate =
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
    process.env.EAS_PROJECT_ID ??
    process.env.EXPO_EAS_PROJECT_ID;

  if (!candidate) {
    return undefined;
  }

  if (!UUID_PATTERN.test(candidate)) {
    console.warn(
      `Ignoring invalid EAS project id from environment. Expected UUID, received: ${candidate}`,
    );
    return undefined;
  }

  return candidate;
};

const config: ExpoConfig = {
  ...appJson.expo,
  extra: {
    ...(appJson.expo.extra ?? {}),
    eas: {
      ...((appJson.expo.extra?.eas as Record<string, unknown> | undefined) ?? {}),
      ...(resolveEasProjectId() ? { projectId: resolveEasProjectId() } : {}),
    },
  },
};

export default config;
