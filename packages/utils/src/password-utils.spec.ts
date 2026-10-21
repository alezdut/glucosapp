import {
  getStrengthColor,
  getStrengthLabel,
  getStrengthValue,
  validatePassword,
} from "./password-utils";

describe("password-utils", () => {
  it("classifies password strength", () => {
    expect(validatePassword("abc")).toBe("weak");
    expect(validatePassword("Password1")).toBe("medium");
    expect(validatePassword("Password1!")).toBe("strong");
  });

  it("maps password strength metadata", () => {
    expect(getStrengthColor("weak")).toBe("#ef4444");
    expect(getStrengthColor("medium")).toBe("#eab308");
    expect(getStrengthColor("strong")).toBe("#22c55e");
    expect(getStrengthValue("weak")).toBe(33);
    expect(getStrengthValue("medium")).toBe(66);
    expect(getStrengthValue("strong")).toBe(100);
    expect(getStrengthLabel("weak")).toBe("Débil");
    expect(getStrengthLabel("medium")).toBe("Media");
    expect(getStrengthLabel("strong")).toBe("Fuerte");
  });
});
