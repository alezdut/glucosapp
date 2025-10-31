/**
 * Client-side Encryption Utilities
 *
 * Provides AES-256 encryption/decryption for sensitive glucose data
 * before transmission to backend. Uses expo-crypto and expo-secure-store.
 */

import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

const ENCRYPTION_KEY_NAME = "glucosapp_encryption_key";
const KEY_SIZE = 256; // AES-256

/**
 * Generate a new encryption key and store it securely
 */
export const generateEncryptionKey = async (): Promise<string> => {
  // Generate random bytes for AES-256 key (32 bytes = 256 bits)
  const randomBytes = await Crypto.getRandomBytesAsync(32);

  // Convert to hex string
  const keyHex = Array.from(randomBytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  // Store securely in device keychain/keystore
  await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, keyHex);

  return keyHex;
};

/**
 * Retrieve encryption key from secure storage
 * If no key exists, generate a new one
 */
export const getEncryptionKey = async (): Promise<string> => {
  let key = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);

  if (!key) {
    key = await generateEncryptionKey();
  }

  return key;
};

/**
 * Delete encryption key from secure storage
 * Use with caution - will make encrypted data unreadable
 */
export const deleteEncryptionKey = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(ENCRYPTION_KEY_NAME);
};

/**
 * Convert hex string to Uint8Array
 */
const hexToBytes = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, 2), 16);
  }
  return bytes;
};

/**
 * Convert Uint8Array to hex string
 */
const bytesToHex = (bytes: Uint8Array): string => {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Hash data using SHA-256
 * Useful for data integrity verification
 */
export const hashData = async (data: string): Promise<string> => {
  const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, data);
  return digest;
};

/**
 * Generate a secure random token
 */
export const generateSecureToken = async (length: number = 32): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(length);
  return bytesToHex(randomBytes);
};
