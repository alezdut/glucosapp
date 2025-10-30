import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

/**
 * Encryption Service
 *
 * Provides AES-256-GCM encryption/decryption for sensitive data
 * Uses environment-based key management with support for KMS integration
 */
@Injectable()
export class EncryptionService {
  private readonly algorithm = "aes-256-gcm";
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 64;
  private readonly tagLength = 16;
  private readonly encryptionKey: Buffer;

  constructor(private readonly configService: ConfigService) {
    // Get encryption key from environment
    const keyHex = this.configService.get<string>("ENCRYPTION_KEY");

    if (!keyHex) {
      throw new Error("ENCRYPTION_KEY environment variable is required");
    }

    // Convert hex string to buffer
    this.encryptionKey = Buffer.from(keyHex, "hex");

    if (this.encryptionKey.length !== this.keyLength) {
      throw new Error(
        `Encryption key must be ${this.keyLength} bytes (${this.keyLength * 2} hex characters)`,
      );
    }
  }

  /**
   * Encrypt data using AES-256-GCM
   *
   * @param plaintext - Data to encrypt (will be converted to string)
   * @returns Encrypted data as hex string (includes IV, salt, tag, and ciphertext)
   */
  encrypt(plaintext: string): string {
    try {
      // Generate random IV (initialization vector)
      const iv = crypto.randomBytes(this.ivLength);

      // Generate random salt for additional entropy
      const salt = crypto.randomBytes(this.saltLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

      // Encrypt the data
      const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);

      // Get authentication tag
      const tag = cipher.getAuthTag();

      // Combine: salt + iv + tag + encrypted data
      const combined = Buffer.concat([salt, iv, tag, encrypted]);

      // Return as hex string
      return combined.toString("hex");
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypt data using AES-256-GCM
   *
   * @param encryptedHex - Encrypted data as hex string
   * @returns Decrypted plaintext
   */
  decrypt(encryptedHex: string): string {
    try {
      // Convert hex string to buffer
      const combined = Buffer.from(encryptedHex, "hex");

      // Extract components
      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(this.saltLength, this.saltLength + this.ivLength);
      const tag = combined.subarray(
        this.saltLength + this.ivLength,
        this.saltLength + this.ivLength + this.tagLength,
      );
      const encrypted = combined.subarray(this.saltLength + this.ivLength + this.tagLength);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(tag);

      // Decrypt the data
      const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

      return decrypted.toString("utf8");
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt data");
    }
  }

  /**
   * Encrypt glucose value
   *
   * @param glucoseValue - Glucose value in mg/dL
   * @returns Encrypted hex string
   */
  encryptGlucoseValue(glucoseValue: number): string {
    if (typeof glucoseValue !== "number" || isNaN(glucoseValue)) {
      throw new Error("Invalid glucose value");
    }

    return this.encrypt(glucoseValue.toString());
  }

  /**
   * Decrypt glucose value
   *
   * @param encryptedValue - Encrypted hex string
   * @returns Decrypted glucose value in mg/dL
   */
  decryptGlucoseValue(encryptedValue: string): number {
    const decrypted = this.decrypt(encryptedValue);
    const glucoseValue = parseFloat(decrypted);

    if (isNaN(glucoseValue)) {
      throw new Error("Invalid decrypted glucose value");
    }

    return glucoseValue;
  }

  /**
   * Hash data using SHA-256
   * Useful for data integrity verification
   *
   * @param data - Data to hash
   * @returns Hash as hex string
   */
  hash(data: string): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  /**
   * Generate a secure random token
   *
   * @param length - Token length in bytes (default: 32)
   * @returns Random token as hex string
   */
  generateToken(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Generate encryption key (for initial setup)
   * Use this to generate a new encryption key for ENCRYPTION_KEY env variable
   *
   * @returns New encryption key as hex string
   */
  static generateEncryptionKey(): string {
    const key = crypto.randomBytes(32); // 256 bits
    return key.toString("hex");
  }
}
