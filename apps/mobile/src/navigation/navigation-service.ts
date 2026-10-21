import { CommonActions, createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "./types";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const pendingActions: Array<() => void> = [];

export const flushPendingNavigationActions = () => {
  while (pendingActions.length > 0 && navigationRef.isReady()) {
    const action = pendingActions.shift();
    if (action) {
      action();
    }
  }
};

export const navigate = <RouteName extends keyof RootStackParamList>(
  ...args: undefined extends RootStackParamList[RouteName]
    ? [screen: RouteName] | [screen: RouteName, params: RootStackParamList[RouteName]]
    : [screen: RouteName, params: RootStackParamList[RouteName]]
) => {
  const action = () => {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: args[0] as string,
        params: args.length > 1 ? ((args[1] ?? undefined) as object | undefined) : undefined,
      }),
    );
  };

  if (navigationRef.isReady()) {
    action();
    return;
  }

  pendingActions.push(action);
};
