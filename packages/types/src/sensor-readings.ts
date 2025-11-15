/**
 * Sensor Readings Types
 *
 * Shared types for CGM sensor data across mobile and backend
 */

/**
 * Reading source enum
 */
export enum ReadingSource {
  MANUAL = "MANUAL",
  LIBRE_NFC = "LIBRE_NFC",
  DEXCOM = "DEXCOM",
  OTHER_CGM = "OTHER_CGM",
}

/**
 * Export format enum
 */
export enum ExportFormat {
  JSON = "json",
  CSV = "csv",
}

/**
 * Single sensor reading
 */
export type SensorReading = {
  id: string;
  userId: string;
  glucoseEncrypted: string;
  recordedAt: string;
  source: ReadingSource;
  isHistorical: boolean;
  createdAt: string;
};

/**
 * Decrypted sensor reading (for display/export)
 */
export type DecryptedSensorReading = {
  id: string;
  userId: string;
  glucose: number; // mg/dL
  recordedAt: string;
  source: ReadingSource;
  isHistorical: boolean;
  createdAt: string;
};

/**
 * Create sensor reading request
 */
export type CreateSensorReadingRequest = {
  glucose: number; // mg/dL (unencrypted - backend will encrypt)
  recordedAt: string;
  source?: ReadingSource;
  isHistorical?: boolean;
};

/**
 * Batch create sensor readings request
 */
export type BatchReadingsRequest = {
  readings: CreateSensorReadingRequest[];
};

/**
 * Batch create response
 */
export type BatchReadingsResponse = {
  created: number;
  skipped: number;
  total: number;
  readings: SensorReading[];
};

/**
 * Export query parameters
 */
export type ExportReadingsQuery = {
  startDate?: string;
  endDate?: string;
  format?: ExportFormat;
};

/**
 * Export response (JSON format)
 */
export type ExportReadingsResponse = {
  exportDate: string;
  totalReadings: number;
  startDate?: string;
  endDate?: string;
  readings: Array<{
    timestamp: string;
    glucose_mgdl: number;
    source: ReadingSource;
    isHistorical: boolean;
  }>;
};

/**
 * Sensor reading statistics
 */
export type SensorReadingStatistics = {
  totalReadings: number;
  averageGlucose: number | null;
  minGlucose: number | null;
  maxGlucose: number | null;
};

/**
 * FreeStyle Libre sensor data (parsed from NFC)
 */
export type LibreSensorData = {
  currentGlucose: number; // mg/dL
  historicalReadings: Array<{
    glucose: number; // mg/dL
    timestamp: Date;
  }>;
  sensorStartTime?: Date;
  sensorAge?: number; // minutes
};
