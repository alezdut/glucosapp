import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { Linking, WebBrowser } from "../expo-auth";

describe("expo-auth", () => {
  it("re-exports expo linking and web-browser modules", () => {
    const linkingModule = require("expo-linking");
    const webBrowserModule = require("expo-web-browser");

    expect(Linking).toBe(linkingModule);
    expect(WebBrowser).toBe(webBrowserModule);
  });
});
