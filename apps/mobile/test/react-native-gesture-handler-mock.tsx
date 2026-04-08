import React from "react";

export const GestureHandlerRootView = ({ children }: { children?: React.ReactNode }) =>
  React.createElement("div", { "data-testid": "gesture-root" }, children);
