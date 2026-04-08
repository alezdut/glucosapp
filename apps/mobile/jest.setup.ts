import mockReact from "react";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock("expo-linking", () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn().mockResolvedValue(null),
}));

jest.mock("./src/lib/expo-auth", () => ({
  Linking: jest.requireMock("expo-linking"),
  WebBrowser: jest.requireMock("expo-web-browser"),
}));

jest.mock("expo-notifications", () => ({
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { HIGH: "HIGH" },
  AndroidNotificationVisibility: { PUBLIC: "PUBLIC" },
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaProvider: ({ children }: { children: unknown }) => children,
  useSafeAreaInsets: jest.fn(() => ({ top: 0, right: 0, bottom: 0, left: 0 })),
}));

jest.mock("lucide-react-native", () => {
  const createIcon = (name: string) =>
    function IconMock({ children, ...props }: { children?: unknown }) {
      return mockReact.createElement(
        "span",
        { ...props, "data-testid": `icon-${name}` },
        children ?? name,
      );
    };

  return new Proxy(
    {},
    {
      get: (_target, prop) => createIcon(String(prop)),
    },
  );
});

jest.mock("./src/components/BrandLogo", () => ({
  BrandLogo: ({ accessibilityLabel = "brand-logo" }: { accessibilityLabel?: string }) =>
    mockReact.createElement("div", { "aria-label": accessibilityLabel }, "brand-logo"),
}));
