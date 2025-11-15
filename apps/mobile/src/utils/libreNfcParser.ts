/**
 * FreeStyle Libre 1 NFC Parser
 *
 * Parses NFC data from FreeStyle Libre 1 sensors using ISO15693 protocol.
 * The sensor stores glucose readings in its memory that can be read via NFC.
 *
 * Memory structure (simplified):
 * - Bytes 0x24-0x25: Current glucose value (raw)
 * - Bytes 0x28-0x29: Current glucose value (alternative location)
 * - Bytes 0x100-0x15F: Trend data (16 entries × 6 bytes each)
 * - Each trend entry represents 15 minutes of data
 */

export interface LibreReading {
  glucose: number; // mg/dL
  timestamp: Date;
}

export interface LibreSensorData {
  currentGlucose: number; // mg/dL
  historicalReadings: LibreReading[];
  sensorStartTime?: Date;
  sensorAge?: number; // minutes
}

/**
 * Convert raw glucose value to mg/dL
 * FreeStyle Libre stores glucose as raw values that need conversion
 */
const rawToMgDl = (rawValue: number): number => {
  // Libre 1 raw value conversion formula
  // Raw values are typically in 0.1 mg/dL units
  return Math.round(rawValue / 10);
};

/**
 * Extract 16-bit value from byte array (little-endian)
 */
const bytesToInt16 = (byte1: number, byte2: number): number => {
  return (byte2 << 8) | byte1;
};

/**
 * Validate glucose reading range
 */
const isValidGlucose = (glucose: number): boolean => {
  return glucose >= 20 && glucose <= 500;
};

/**
 * Parse NFC tag data from FreeStyle Libre 1 sensor
 *
 * @param data - Raw byte array from NFC tag read
 * @returns Parsed sensor data with current glucose and historical readings
 */
export const parseLibreNfcData = (data: number[]): LibreSensorData => {
  if (!data || data.length < 344) {
    throw new Error("Invalid NFC data: insufficient bytes");
  }

  // Extract current glucose (bytes 0x28-0x29)
  const currentGlucoseRaw = bytesToInt16(data[0x28], data[0x29]);
  const currentGlucose = rawToMgDl(currentGlucoseRaw);

  if (!isValidGlucose(currentGlucose)) {
    throw new Error(`Invalid current glucose reading: ${currentGlucose} mg/dL`);
  }

  // Extract sensor start time (bytes 0x1F7-0x1FA, 4 bytes, little-endian timestamp)
  // Note: Sensor start time is stored as minutes since sensor activation
  const sensorAge = bytesToInt16(data[0x16f], data[0x170]); // Sensor age in minutes
  const sensorStartTime = new Date(Date.now() - sensorAge * 60 * 1000);

  // Extract trend data (last 8 hours)
  // Libre 1 stores 16 trend entries, each representing 15 minutes
  // Trend data starts at byte 0x100 (256 decimal)
  const historicalReadings: LibreReading[] = [];
  const trendStartByte = 0x100;
  const trendEntrySize = 6;
  const numberOfTrendEntries = 16;

  // Get current trend index from sensor
  const currentTrendIndex = data[0x1a] || 0;

  for (let i = 0; i < numberOfTrendEntries; i++) {
    // Calculate actual index (circular buffer)
    const entryIndex = (currentTrendIndex - i + numberOfTrendEntries) % numberOfTrendEntries;
    const entryOffset = trendStartByte + entryIndex * trendEntrySize;

    // Extract glucose value from trend entry (first 2 bytes)
    const glucoseRaw = bytesToInt16(data[entryOffset], data[entryOffset + 1]);
    const glucose = rawToMgDl(glucoseRaw);

    // Skip invalid readings
    if (!isValidGlucose(glucose) || glucose === 0) {
      continue;
    }

    // Calculate timestamp (each entry is 15 minutes apart)
    const minutesAgo = i * 15;
    const timestamp = new Date(Date.now() - minutesAgo * 60 * 1000);

    historicalReadings.push({
      glucose,
      timestamp,
    });
  }

  // Sort readings by timestamp (oldest first)
  historicalReadings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return {
    currentGlucose,
    historicalReadings,
    sensorStartTime,
    sensorAge,
  };
};

/**
 * Mock data generator for testing without a physical sensor
 */
export const generateMockLibreData = (): LibreSensorData => {
  const now = Date.now();
  const currentGlucose = 120 + Math.floor(Math.random() * 40 - 20); // 100-140 mg/dL

  const historicalReadings: LibreReading[] = [];

  // Generate 8 hours of data (32 readings at 15-min intervals)
  for (let i = 0; i < 32; i++) {
    const minutesAgo = i * 15;
    const timestamp = new Date(now - minutesAgo * 60 * 1000);

    // Simulate realistic glucose variation
    const baseGlucose = 110;
    const variation = Math.sin(i / 5) * 30; // Sine wave variation
    const noise = Math.random() * 10 - 5; // Random noise
    const glucose = Math.round(baseGlucose + variation + noise);

    historicalReadings.push({
      glucose: Math.max(70, Math.min(180, glucose)), // Clamp to realistic range
      timestamp,
    });
  }

  // Sort by timestamp (oldest first)
  historicalReadings.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  return {
    currentGlucose,
    historicalReadings,
    sensorStartTime: new Date(now - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    sensorAge: 10080, // 7 days in minutes
  };
};

/**
 * Validate sensor data checksum (if available)
 * Note: FreeStyle Libre uses CRC-16 for data validation
 */
export const validateLibreChecksum = (data: number[]): boolean => {
  // Simplified validation - in production, implement full CRC-16-CCITT
  if (!data || data.length < 344) {
    return false;
  }

  // Basic validation: check if data contains non-zero values
  const nonZeroCount = data.filter((byte) => byte !== 0).length;
  return nonZeroCount > 100; // At least 100 non-zero bytes
};
