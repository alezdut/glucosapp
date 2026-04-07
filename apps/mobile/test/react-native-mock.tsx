import React from "react";

type BaseProps = {
  children?: React.ReactNode;
  testID?: string;
  accessibilityLabel?: string;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  editable?: boolean;
  visible?: boolean;
  onPress?: () => void;
  onChangeText?: (value: string) => void;
  onChange?: (event: { target: { value: string } }) => void;
  onSubmitEditing?: () => void;
};

const commonProps = (props: BaseProps) => ({
  "data-testid": props.testID,
  "aria-label": props.accessibilityLabel,
});

export const View = ({ children, ...props }: BaseProps) =>
  React.createElement("div", commonProps(props), children);

export const ScrollView = ({ children, ...props }: BaseProps) =>
  React.createElement("div", commonProps(props), children);

export const KeyboardAvoidingView = ({ children, ...props }: BaseProps) =>
  React.createElement("div", commonProps(props), children);

export const TouchableWithoutFeedback = ({ children, onPress, ...props }: BaseProps) =>
  React.createElement(
    "div",
    {
      ...commonProps(props),
      onClick: onPress,
      role: "presentation",
    },
    children,
  );

export const Text = ({ children, ...props }: BaseProps) =>
  React.createElement("span", commonProps(props), children);

export const TouchableOpacity = ({ children, onPress, disabled, ...props }: BaseProps) =>
  React.createElement(
    "button",
    {
      ...commonProps(props),
      type: "button",
      onClick: onPress,
      disabled,
    },
    children,
  );

export const TextInput = React.forwardRef<HTMLInputElement, BaseProps>(function TextInput(
  {
    value,
    placeholder,
    onChangeText,
    onChange,
    editable = true,
    disabled,
    onSubmitEditing,
    ...props
  },
  ref,
) {
  return React.createElement("input", {
    ...commonProps(props),
    ref,
    value: value ?? "",
    placeholder,
    disabled: disabled || editable === false,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.({ target: { value: event.target.value } });
      onChangeText?.(event.target.value);
    },
    onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        onSubmitEditing?.();
      }
    },
  });
});

export const ActivityIndicator = ({ testID }: BaseProps) =>
  React.createElement(
    "div",
    { "data-testid": testID ?? "activity-indicator" },
    "activity-indicator",
  );

export const Modal = ({ children, visible, ...props }: BaseProps) =>
  visible ? React.createElement("div", commonProps(props), children) : null;

export const StyleSheet = {
  create: <T,>(styles: T) => styles,
  hairlineWidth: 1,
};

export const Platform = {
  OS: "ios",
  select: <T,>(options: { ios?: T; android?: T; default?: T }) => options.ios ?? options.default,
};

export const UIManager = {
  setLayoutAnimationEnabledExperimental: jest.fn(),
};

export const LayoutAnimation = {
  configureNext: jest.fn(),
  Types: {
    easeInEaseOut: "easeInEaseOut",
  },
};

export const Keyboard = {
  dismiss: jest.fn(),
};

export const Alert = {
  alert: jest.fn(),
};

export const Dimensions = {
  get: jest.fn(() => ({ width: 390, height: 844 })),
};

export const Animated = {
  View: ({ children, ...props }: BaseProps) =>
    React.createElement("div", commonProps(props), children),
  Value: class {
    value: number;

    constructor(value: number) {
      this.value = value;
    }
  },
  timing: () => ({
    start: (callback?: () => void) => callback?.(),
  }),
};
