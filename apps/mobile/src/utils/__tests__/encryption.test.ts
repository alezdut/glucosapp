import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
jest.mock("expo-crypto", () => ({
  getRandomBytesAsync: jest.fn(),
  digestStringAsync: jest.fn(),
  CryptoDigestAlgorithm: {
    SHA256: "SHA256",
  },
}));

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import {
  bytesToHex,
  deleteEncryptionKey,
  generateEncryptionKey,
  generateSecureToken,
  getEncryptionKey,
  hashData,
  hexToBytes,
} from "../encryption";

const mockGetRandomBytesAsync = Crypto.getRandomBytesAsync as jest.MockedFunction<
  typeof Crypto.getRandomBytesAsync
>;
const mockDigestStringAsync = Crypto.digestStringAsync as jest.MockedFunction<
  typeof Crypto.digestStringAsync
>;
const mockSecureGetItemAsync = SecureStore.getItemAsync as jest.MockedFunction<
  typeof SecureStore.getItemAsync
>;

describe("encryption utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("generates and stores encryption key as hex", async () => {
    mockGetRandomBytesAsync.mockResolvedValue(new Uint8Array([15, 255, 0]));

    const key = await generateEncryptionKey();

    expect(key).toBe("0fff00");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith("glucosapp_encryption_key", "0fff00");
  });

  it("returns existing encryption key if present", async () => {
    mockSecureGetItemAsync.mockResolvedValue("existing-key");

    const key = await getEncryptionKey();

    expect(key).toBe("existing-key");
    expect(Crypto.getRandomBytesAsync).not.toHaveBeenCalled();
  });

  it("creates a new key when none exists", async () => {
    mockSecureGetItemAsync.mockResolvedValue(null);
    mockGetRandomBytesAsync.mockResolvedValue(new Uint8Array([1, 2, 3]));

    const key = await getEncryptionKey();

    expect(key).toBe("010203");
    expect(SecureStore.setItemAsync).toHaveBeenCalled();
  });

  it("deletes stored encryption key", async () => {
    await deleteEncryptionKey();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("glucosapp_encryption_key");
  });

  it("converts hex to bytes and bytes back to hex", () => {
    const bytes = hexToBytes("0a0b0c");

    expect(Array.from(bytes)).toEqual([10, 11, 12]);
    expect(bytesToHex(bytes)).toBe("0a0b0c");
  });

  it("hashes data with SHA-256", async () => {
    mockDigestStringAsync.mockResolvedValue("hashed-value");

    const digest = await hashData("payload");

    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      Crypto.CryptoDigestAlgorithm.SHA256,
      "payload",
    );
    expect(digest).toBe("hashed-value");
  });

  it("generates secure token with configurable length", async () => {
    mockGetRandomBytesAsync.mockResolvedValue(new Uint8Array([222, 173, 190, 239]));

    const token = await generateSecureToken(4);

    expect(Crypto.getRandomBytesAsync).toHaveBeenCalledWith(4);
    expect(token).toBe("deadbeef");
  });
});
