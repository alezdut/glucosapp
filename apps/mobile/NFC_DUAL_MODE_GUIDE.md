# NFC Dual Mode Guide - Expo Go + Development Build

## Overview

La aplicación móvil de Glucosapp ahora soporta **dos modos de operación** para la funcionalidad de escaneo NFC:

1. **Modo Expo Go** (Simulación) - Para desarrollo rápido sin hardware NFC
2. **Modo Development Build** (NFC Real) - Para pruebas con sensores FreeStyle Libre reales

## ¿Por qué dos modos?

`react-native-nfc-manager` requiere código nativo que no está disponible en Expo Go. Para permitir desarrollo rápido Y funcionalidad completa, la app detecta automáticamente el entorno y se adapta.

## Modo 1: Expo Go (Simulación)

### Cuándo usar

- Desarrollo rápido de UI/UX
- Testing de flujos sin hardware NFC
- Demostración de funcionalidades
- Desarrollo sin iPhone físico

### Cómo funciona

1. La app detecta que `react-native-nfc-manager` no está disponible
2. Automáticamente usa `generateMockLibreData()`
3. Genera datos realistas de prueba:
   - Glucosa actual: 100-140 mg/dL
   - 32 lecturas históricas (8 horas)
   - Variación tipo onda sinusoidal + ruido

### Iniciar en modo Expo Go

```bash
cd apps/mobile

# Opción 1: Metro bundler
pnpm dev
# Escanea QR code con Expo Go app

# Opción 2: Web
pnpm web
```

### Características

- ✅ Toda la UI funciona
- ✅ Gráficas se renderizan correctamente
- ✅ Guardar datos al backend funciona
- ✅ Exportar JSON/CSV funciona
- ❌ No lee sensores reales
- ⚡ Hot reload instantáneo

## Modo 2: Development Build (NFC Real)

### Cuándo usar

- Testing con sensores FreeStyle Libre reales
- Validación de protocolo NFC
- Pruebas de rendimiento real
- Preparación para producción

### Cómo funciona

1. La app detecta que `react-native-nfc-manager` está disponible
2. Verifica que el dispositivo soporte NFC
3. Permite escaneo real de sensores
4. Fallback a mock si falla el escaneo

### Compilar Development Build

```bash
cd apps/mobile

# Compilar e instalar en iPhone conectado
npx expo run:ios --device

# O para simulador (sin NFC pero con código nativo)
npx expo run:ios
```

**Nota:** Primera compilación toma 5-10 minutos. Compilaciones posteriores son más rápidas.

### Requisitos

- iPhone 7 o superior (con NFC)
- iOS 13+
- Xcode instalado
- Certificado de desarrollo iOS
- Sensor FreeStyle Libre 1 (para testing real)

### Características

- ✅ Lee sensores NFC reales
- ✅ Protocolo ISO15693
- ✅ Fallback a mock si falla
- ✅ Toda la funcionalidad completa
- ⚡ Hot reload funciona (después de build inicial)

## Detección Automática

El código detecta automáticamente el modo:

```typescript
// En NFCScanScreen.tsx

// Importación condicional
let NfcManager: any = null;
try {
  NfcManager = require("react-native-nfc-manager");
} catch (error) {
  // NFC no disponible - usará mocks
}

// Detección en runtime
const [isNfcAvailable, setIsNfcAvailable] = useState(false);

useEffect(() => {
  checkNfcAvailability();
}, []);

const checkNfcAvailability = async () => {
  if (!NfcManager) {
    setIsNfcAvailable(false);
    return;
  }

  const supported = await NfcManager.isSupported();
  setIsNfcAvailable(supported);
};
```

## UI Differences

### En Expo Go (Mock Mode)

```
┌────────────────────────────┐
│     [Scan Button]          │
│                            │
│ Modo simulación: Toca      │
│ para generar datos         │
│                            │
│ 📱 NFC no disponible       │
│    (Expo Go)               │
└────────────────────────────┘
```

Al escanear:

```
Alert: "Modo Simulación"
Usando datos de prueba.
Glucosa actual: 125 mg/dL

Para usar NFC real, instala
un development build con:
npx expo run:ios --device
```

### En Development Build (NFC Real)

```
┌────────────────────────────┐
│     [Scan Button]          │
│                            │
│ Toca el botón y acerca     │
│ tu sensor FreeStyle Libre  │
└────────────────────────────┘
```

Al escanear:

```
Alert: "Escaneo exitoso"
Glucosa actual: 125 mg/dL
```

Si falla:

```
Alert: "Error al escanear"
No se pudo leer el sensor.
¿Deseas usar datos simulados
para probar la funcionalidad?

[Cancelar] [Usar datos simulados]
```

## Flujo de Desarrollo Recomendado

### Fase 1: UI/UX Development (Expo Go)

```bash
# Desarrollo rápido
cd apps/mobile
pnpm dev

# Itera UI sin necesidad de compilación
# Hot reload instantáneo
# Usa datos mock para testing
```

### Fase 2: Testing NFC Real (Development Build)

```bash
# Compilar una vez
npx expo run:ios --device

# Después, puedes usar:
pnpm dev

# La app ya instalada se conecta automáticamente
# Puedes probar NFC real
# Hot reload sigue funcionando
```

### Fase 3: Pre-Production Testing

```bash
# Build de producción
eas build --platform ios

# O build local
npx expo run:ios --configuration Release
```

## Comparación de Modos

| Feature          | Expo Go        | Development Build          |
| ---------------- | -------------- | -------------------------- |
| Instalación      | Scan QR        | Compilar app               |
| Tiempo de setup  | 10 segundos    | 5-10 minutos (primera vez) |
| Hot reload       | ✅ Instantáneo | ✅ Rápido                  |
| NFC real         | ❌             | ✅                         |
| Datos mock       | ✅             | ✅ (fallback)              |
| UI testing       | ✅             | ✅                         |
| Backend testing  | ✅             | ✅                         |
| Sensores físicos | ❌             | ✅                         |
| Requiere iPhone  | ❌             | ✅                         |

## Comandos Útiles

### Expo Go

```bash
# Iniciar
cd apps/mobile && pnpm dev

# Limpiar cache
pnpm dev --clear

# Solo Metro bundler
pnpm start
```

### Development Build

```bash
# Compilar para dispositivo
npx expo run:ios --device

# Compilar para simulador
npx expo run:ios

# Limpiar y recompilar
rm -rf ios .expo && npx expo prebuild --clean && npx expo run:ios

# Después de compilar, solo:
pnpm dev
```

### Limpiar todo

```bash
cd apps/mobile

# Limpiar cache de Expo
rm -rf .expo

# Limpiar node_modules
rm -rf node_modules && pnpm install

# Limpiar iOS (si existe)
rm -rf ios

# Limpiar CocoaPods
cd ios && pod cache clean --all && rm -rf Pods Podfile.lock
```

## Troubleshooting

### "NFC Manager not available"

**En Expo Go:** Normal, usará mocks automáticamente.
**En Development Build:** Error - recompila con `npx expo run:ios --device`

### "No development build installed"

Necesitas compilar primero:

```bash
npx expo run:ios --device
```

### Pods installation failed

```bash
cd apps/mobile/ios
pod cache clean --all
rm -rf Pods Podfile.lock
cd ..
npx expo prebuild --clean
npx expo run:ios --device
```

### Metro bundler no conecta

```bash
# Limpiar cache
pnpm dev --clear

# O matar procesos
killall node
pnpm dev
```

## Best Practices

### Durante Desarrollo

1. **Usa Expo Go** para iterar UI/UX rápidamente
2. **Usa mocks** para validar flujos sin hardware
3. **Prueba backend** con datos mock primero
4. **Compila development build** cuando necesites NFC real

### Antes de Release

1. ✅ Testear con datos mock (edge cases)
2. ✅ Testear con sensores reales (varios estados)
3. ✅ Probar fallback mock si falla NFC
4. ✅ Verificar permisos iOS correctos
5. ✅ Testing en múltiples modelos iPhone

### En Producción

- NFC estará disponible (app compilada)
- Mocks solo como fallback si falla escaneo
- Usuarios verán UI de "NFC Real" siempre
- Logs distinguen entre mock y real data

## Logs para Debugging

La app genera logs diferentes según el modo:

```typescript
// Modo Mock
console.log("NFC Manager not available - will use mock data");
console.log("Using mock data in Expo Go mode");

// Modo Real
console.log("NFC scan successful");
console.log("Failed to scan sensor, offering mock data");
```

Usa React Native Debugger o Flipper para ver los logs.

## Resumen

- **Expo Go**: Desarrollo rápido, mocks automáticos
- **Development Build**: NFC real, requiere compilación
- **Detección automática**: Sin configuración manual
- **Fallback inteligente**: Siempre hay datos para probar
- **Hot reload**: Funciona en ambos modos

¡Desarrolla rápido, prueba con sensores reales cuando estés listo!
