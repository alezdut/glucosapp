# FreeStyle Libre NFC Integration Guide

## Overview

The Glucosapp mobile app integrates with FreeStyle Libre 1 continuous glucose monitors (CGM) via NFC technology. This allows users to scan their sensor, retrieve current and historical glucose readings, and store them securely in the cloud.

## Features

- **NFC Sensor Scanning**: Scan FreeStyle Libre 1 sensors using your smartphone's NFC capability
- **Real-time Glucose Display**: View current glucose level immediately after scanning
- **Historical Data**: Access up to 8 hours of historical glucose readings from the sensor
- **Visual Charts**: View glucose trends with interactive line charts
- **Secure Storage**: All data is encrypted both in transit and at rest
- **Export Options**: Export your data in JSON or CSV format for sharing with healthcare providers

## Supported Devices

### iOS

- iPhone 7 and newer (iOS 13+)
- NFC capability is built-in
- No additional hardware required

### Android (Future Support)

- Android devices with NFC capability
- Android 5.0 (Lollipop) and newer
- NFC must be enabled in system settings

## Supported Sensors

Currently supported:

- **FreeStyle Libre 1** (Abbott)

Future support planned:

- FreeStyle Libre 2
- FreeStyle Libre 3
- Dexcom G6/G7
- Other CGM systems

## How to Use

### 1. Enable NFC (iOS)

NFC is enabled by default on iOS devices. No configuration needed.

### 2. Navigate to NFC Scan Screen

1. Open Glucosapp
2. From the home screen, tap **"Escanear Sensor"** button
3. The NFC scan screen will open

### 3. Scan Your Sensor

1. Tap the large circular **scan button**
2. Hold the **top of your phone** near your FreeStyle Libre sensor
3. Keep your phone steady for 2-3 seconds
4. Wait for the scanning animation to complete

**Tips for successful scanning:**

- Remove any phone cases that might interfere with NFC
- Position the top edge of your phone directly over the sensor
- Hold still until scanning completes
- If scanning fails, try adjusting the angle or position

### 4. View Your Data

After a successful scan:

- **Current glucose** value is displayed prominently
- **Historical chart** shows the last 8 hours of readings
- Each point on the chart represents a 15-minute interval

### 5. Save Your Readings

1. Review the displayed data
2. Tap **"Guardar Lecturas"** button
3. Wait for confirmation message
4. Your data is now securely stored in the cloud

### 6. Export Your Data

To share your glucose data:

**JSON Export:**

1. Tap **"Exportar JSON"** button
2. Choose where to share (email, cloud storage, etc.)
3. File format: `glucosapp_readings_YYYY-MM-DD.json`

**CSV Export:**

1. Tap **"Exportar CSV"** button
2. Choose where to share
3. File format: `glucosapp_readings_YYYY-MM-DD.csv`
4. Opens in Excel, Google Sheets, or any spreadsheet app

## Data Privacy & Security

### Encryption

- **Client-side encryption**: Glucose values are encrypted on your device before transmission
- **Transport security**: All data transmitted over HTTPS with JWT authentication
- **Server-side encryption**: Additional encryption layer at rest in the database
- **Key management**: Encryption keys stored in iOS Keychain (secure hardware)

### Privacy

- No sensor serial numbers are stored
- No personally identifiable sensor information is retained
- All data is isolated to your user account
- You control your data and can export or delete it at any time

### HIPAA/GDPR Compliance

- Data minimization: Only essential glucose values and timestamps are stored
- Right to access: Export your data anytime
- Right to deletion: Contact support to delete your account and all data
- Encryption at rest and in transit
- Audit logging (planned for future release)

## Troubleshooting

### "NFC no disponible"

- Your device doesn't support NFC
- Solution: Use manual glucose entry feature instead

### "No se detectó ningún sensor"

- Phone not positioned correctly over sensor
- Solution: Adjust position and try again
- Try removing phone case
- Ensure sensor is active (not expired)

### "Datos incompletos del sensor"

- Sensor communication interrupted
- Solution: Hold phone steady and rescan
- Ensure sensor is functioning properly
- Try cleaning the sensor surface gently

### "Error al guardar lecturas"

- Network connectivity issue
- Solution: Check internet connection
- Try again when connection is stable
- Data remains on device until successfully uploaded

### Chart Not Displaying

- Insufficient historical data
- Solution: Sensor may be newly applied
- Wait 15-30 minutes and rescan
- Chart requires at least 2 data points

## Development Mode

For testing without a physical sensor:

1. Set app to development mode (`__DEV__` flag)
2. Attempt to scan (will fail)
3. Alert will appear with option to use mock data
4. Tap **"Usar datos simulados"**
5. App generates realistic sample glucose data

**Note**: Mock data is for testing only and should not be used for medical decisions.

## Technical Details

### NFC Protocol

- **Technology**: ISO15693 (13.56 MHz)
- **Read distance**: ~1-3 cm
- **Data transfer**: Read-only (no writes to sensor)
- **Memory blocks**: Reads blocks 0-43 (344 bytes)

### Data Structure

FreeStyle Libre 1 memory layout:

- **Bytes 0x28-0x29**: Current glucose value (raw, little-endian)
- **Bytes 0x100-0x15F**: Trend data (16 entries × 6 bytes)
- **Byte 0x1A**: Current trend index (circular buffer pointer)
- **Bytes 0x16F-0x170**: Sensor age in minutes

### Conversion

- Raw glucose values are in 0.1 mg/dL units
- Formula: `glucose_mgdl = raw_value / 10`
- Valid range: 20-500 mg/dL

### Historical Data

- **Storage**: 16 trend entries (circular buffer)
- **Interval**: 15 minutes per entry
- **Coverage**: Up to 4 hours (16 × 15 min = 240 min)
- **Note**: Documentation mentions 8-hour history, which may require reading additional memory locations

## API Endpoints

The mobile app communicates with these backend endpoints:

```
POST /v1/sensor-readings
POST /v1/sensor-readings/batch
GET  /v1/sensor-readings/export
GET  /v1/sensor-readings/statistics
```

All endpoints require JWT authentication.

## Support

For issues or questions:

- **In-app support**: Settings > Help & Support
- **Email**: support@glucosapp.com
- **Documentation**: https://docs.glucosapp.com

## Disclaimer

This app is designed to help you track your glucose levels but should not replace professional medical advice, diagnosis, or treatment. Always consult with your healthcare provider before making any medical decisions based on the data from this app.

FreeStyle Libre is a trademark of Abbott Diabetes Care. This app is not affiliated with or endorsed by Abbott.
