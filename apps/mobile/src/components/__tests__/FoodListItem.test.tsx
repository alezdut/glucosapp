import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import FoodListItem from "../FoodListItem";
import { renderMobile } from "../../../test/render-mobile";

jest.mock("react-native-gesture-handler", () => {
  const ReactLib = require("react");

  const Swipeable = ReactLib.forwardRef(
    (
      {
        children,
        renderRightActions,
      }: {
        children: React.ReactNode;
        renderRightActions?: (
          progress: unknown,
          dragX: { interpolate: () => number },
        ) => React.ReactNode;
      },
      ref: React.Ref<{ close: () => void }>,
    ) => {
      ReactLib.useImperativeHandle(ref, () => ({ close: jest.fn() }), []);

      return ReactLib.createElement(
        "div",
        { "data-testid": "swipeable" },
        children,
        renderRightActions ? renderRightActions({}, { interpolate: () => 0 }) : null,
      );
    },
  );

  return { Swipeable };
});

describe("FoodListItem", () => {
  it("renders item details and handles tap", () => {
    const onPress = jest.fn();

    renderMobile(
      <FoodListItem
        item={{ name: "Pan integral", quantity: 45, carbohydrates: 22.456 }}
        onDelete={jest.fn()}
        onPress={onPress}
      />,
    );

    expect(screen.getByText("Pan integral")).toBeTruthy();
    expect(screen.getByText("45 g • 22.46 g carbohidratos")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /pan integral/i }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("runs swipe delete action", () => {
    const onDelete = jest.fn();

    renderMobile(
      <FoodListItem
        item={{ name: "Banana", quantity: 120, carbohydrates: 27.1 }}
        onDelete={onDelete}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /eliminar/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
