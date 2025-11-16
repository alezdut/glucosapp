import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { EncryptionService } from "./encryption.service";
import { createMockConfigService } from "../test-helpers/config.mock";

describe("EncryptionService", () => {
  let service: EncryptionService;
  let configService: ConfigService;

  beforeEach(async () => {
    // Mock Logger and console to suppress logs during tests
    jest.spyOn(Logger.prototype, "log").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "error").mockImplementation(() => {});
    jest.spyOn(Logger.prototype, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "log").mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EncryptionService,
        {
          provide: ConfigService,
          useValue: createMockConfigService(),
        },
      ],
    }).compile();

    service = module.get<EncryptionService>(EncryptionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("constructor", () => {
    it("should throw error if ENCRYPTION_KEY is not provided", () => {
      const mockConfig = createMockConfigService({ ENCRYPTION_KEY: undefined });
      expect(() => {
        new EncryptionService(mockConfig as ConfigService);
      }).toThrow("ENCRYPTION_KEY environment variable is required");
    });

    it("should throw error if ENCRYPTION_KEY has wrong length", () => {
      const mockConfig = createMockConfigService({
        ENCRYPTION_KEY: "short-key",
      });
      expect(() => {
        new EncryptionService(mockConfig as ConfigService);
      }).toThrow("Encryption key must be 32 bytes");
    });

    it("should initialize with valid encryption key", () => {
      const mockConfig = createMockConfigService();
      const encryptionService = new EncryptionService(mockConfig as ConfigService);
      expect(encryptionService).toBeDefined();
    });
  });

  describe("encrypt and decrypt", () => {
    it("should encrypt and decrypt plaintext correctly", () => {
      const plaintext = "test data";
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(plaintext);
      expect(decrypted).toBe(plaintext);
    });

    it("should produce different ciphertext for same plaintext (IV randomness)", () => {
      const plaintext = "test data";
      const encrypted1 = service.encrypt(plaintext);
      const encrypted2 = service.encrypt(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
      expect(service.decrypt(encrypted1)).toBe(plaintext);
      expect(service.decrypt(encrypted2)).toBe(plaintext);
    });

    it("should handle empty string", () => {
      const plaintext = "";
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should handle special characters", () => {
      const plaintext = "test@#$%^&*()_+{}|:<>?[]\\;',./";
      const encrypted = service.encrypt(plaintext);
      const decrypted = service.decrypt(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("should throw error when decrypting invalid hex string", () => {
      expect(() => {
        service.decrypt("invalid-hex");
      }).toThrow("Failed to decrypt data");
    });

    it("should throw error when decrypting tampered data", () => {
      const plaintext = "test data";
      const encrypted = service.encrypt(plaintext);
      const tampered = encrypted.slice(0, -10) + "0000000000";

      expect(() => {
        service.decrypt(tampered);
      }).toThrow("Failed to decrypt data");
    });
  });

  describe("encryptGlucoseValue and decryptGlucoseValue", () => {
    it("should encrypt and decrypt glucose value correctly", () => {
      const glucoseValue = 120;
      const encrypted = service.encryptGlucoseValue(glucoseValue);
      const decrypted = service.decryptGlucoseValue(encrypted);

      expect(encrypted).toBeDefined();
      expect(decrypted).toBe(glucoseValue);
    });

    it("should handle decimal glucose values", () => {
      const glucoseValue = 120.5;
      const encrypted = service.encryptGlucoseValue(glucoseValue);
      const decrypted = service.decryptGlucoseValue(encrypted);

      expect(decrypted).toBeCloseTo(glucoseValue, 1);
    });

    it("should handle high glucose values", () => {
      const glucoseValue = 400;
      const encrypted = service.encryptGlucoseValue(glucoseValue);
      const decrypted = service.decryptGlucoseValue(encrypted);

      expect(decrypted).toBe(glucoseValue);
    });

    it("should handle low glucose values", () => {
      const glucoseValue = 50;
      const encrypted = service.encryptGlucoseValue(glucoseValue);
      const decrypted = service.decryptGlucoseValue(encrypted);

      expect(decrypted).toBe(glucoseValue);
    });

    it("should throw error for invalid glucose value", () => {
      expect(() => {
        service.encryptGlucoseValue(NaN);
      }).toThrow("Invalid glucose value");

      expect(() => {
        service.encryptGlucoseValue("invalid" as any);
      }).toThrow("Invalid glucose value");
    });

    it("should throw error when decrypting invalid encrypted value", () => {
      expect(() => {
        service.decryptGlucoseValue("invalid-encrypted-value");
      }).toThrow();
    });
  });

  describe("hash", () => {
    it("should generate consistent hash for same input", () => {
      const data = "test data";
      const hash1 = service.hash(data);
      const hash2 = service.hash(data);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 produces 64 hex characters
    });

    it("should produce different hash for different input", () => {
      const hash1 = service.hash("test data 1");
      const hash2 = service.hash("test data 2");

      expect(hash1).not.toBe(hash2);
    });
  });

  describe("generateToken", () => {
    it("should generate token of default length", () => {
      const token = service.generateToken();
      expect(token).toBeDefined();
      expect(token).toHaveLength(64); // 32 bytes = 64 hex characters
    });

    it("should generate token of specified length", () => {
      const token = service.generateToken(16);
      expect(token).toBeDefined();
      expect(token).toHaveLength(32); // 16 bytes = 32 hex characters
    });

    it("should generate different tokens each time", () => {
      const token1 = service.generateToken();
      const token2 = service.generateToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe("generateEncryptionKey (static)", () => {
    it("should generate valid encryption key", () => {
      const key = EncryptionService.generateEncryptionKey();
      expect(key).toBeDefined();
      expect(key).toHaveLength(64); // 32 bytes = 64 hex characters
    });

    it("should generate different keys each time", () => {
      const key1 = EncryptionService.generateEncryptionKey();
      const key2 = EncryptionService.generateEncryptionKey();

      expect(key1).not.toBe(key2);
    });
  });
});
