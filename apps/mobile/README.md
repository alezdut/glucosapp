# Glucosapp Mobile

Aplicación Expo/React Native para el perfil paciente dentro de Glucosapp.

## Cobertura funcional

- autenticación y onboarding;
- registro diario de información;
- historial y visualización personal;
- cálculo y seguimiento del tratamiento;
- comunicación y funciones asociadas a notificaciones/NFC.

## Configuración

Crear `apps/mobile/.env` a partir de `apps/mobile/.env.example`.

Variables esperadas:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_GOOGLE_CLIENT_ID`
- `EXPO_PUBLIC_EAS_PROJECT_ID`

Para dispositivos físicos, usar la IP local de la máquina en `EXPO_PUBLIC_API_BASE_URL`.

## Comandos

```bash
pnpm -C apps/mobile dev
pnpm -C apps/mobile android
pnpm -C apps/mobile ios
pnpm -C apps/mobile lint
pnpm -C apps/mobile typecheck
pnpm -C apps/mobile test
```

## Referencias

- [Setup general del repositorio](../../docs/SETUP.md)
- [Guion de demo](../../docs/DEMO_SCRIPT.md)
