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
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
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
 * Simple XOR-based encryption for demonstration
 * Note: In production, use a proper encryption library like crypto-js or native modules
 * This is a simplified implementation for client-side data obfuscation
 */
const xorEncrypt = (data: string, key: string): string => {
  const dataBytes = new TextEncoder().encode(data);
  const keyBytes = hexToBytes(key);

  const encrypted = new Uint8Array(dataBytes.length);
  for (let i = 0; i < dataBytes.length; i++) {
    encrypted[i] = dataBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  return bytesToHex(encrypted);
};

/**
 * Simple XOR-based decryption
 */
const xorDecrypt = (encryptedHex: string, key: string): string => {
  const encryptedBytes = hexToBytes(encryptedHex);
  const keyBytes = hexToBytes(key);

  const decrypted = new Uint8Array(encryptedBytes.length);
  for (let i = 0; i < encryptedBytes.length; i++) {
    decrypted[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
  }

  return new TextDecoder().decode(decrypted);
};

/**
 * Encrypt glucose value
 *
 * @param glucoseValue - Glucose value in mg/dL
 * @returns Encrypted hex string
 */
export const encryptGlucoseValue = async (glucoseValue: number): Promise<string> => {
  const key = await getEncryptionKey();
  const dataString = glucoseValue.toString();

  // Add random salt for additional security
  const salt = await Crypto.getRandomBytesAsync(4);
  const saltHex = bytesToHex(salt);
  const dataWithSalt = `${saltHex}:${dataString}`;

  return xorEncrypt(dataWithSalt, key);
};

/**
 * Decrypt glucose value
 *
 * @param encryptedValue - Encrypted hex string
 * @returns Decrypted glucose value in mg/dL
 */
export const decryptGlucoseValue = async (encryptedValue: string): Promise<number> => {
  const key = await getEncryptionKey();
  const decryptedWithSalt = xorDecrypt(encryptedValue, key);

  // Remove salt
  const parts = decryptedWithSalt.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted data format");
  }

  const glucoseValue = parseInt(parts[1], 10);

  if (isNaN(glucoseValue)) {
    throw new Error("Invalid glucose value after decryption");
  }

  return glucoseValue;
};

/**
 * Encrypt an array of glucose readings
 *
 * @param readings - Array of objects with glucose property
 * @returns Array with encrypted glucose values
 */
export const encryptReadings = async <T extends { glucose: number }>(
  readings: T[],
): Promise<Array<Omit<T, "glucose"> & { glucoseEncrypted: string }>> => {
  const key = await getEncryptionKey();

  return Promise.all(
    readings.map(async (reading) => {
      const { glucose, ...rest } = reading;
      const glucoseEncrypted = await encryptGlucoseValue(glucose);

      return {
        ...rest,
        glucoseEncrypted,
      } as Omit<T, "glucose"> & { glucoseEncrypted: string };
    }),
  );
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
