# Arquitectura de Glucosapp

Glucosapp está organizado como un monorepo con `pnpm workspaces` y `Turborepo`. La aplicación se divide en tres superficies principales y un conjunto de paquetes compartidos.

## Componentes principales

- `apps/backend`: API REST en NestJS con Prisma y PostgreSQL. Centraliza autenticación, cálculo clínico, mensajería, alertas, reportes y estadísticas.
- `apps/web`: aplicación Next.js para profesionales de salud. Expone login, dashboard, seguimiento de pacientes, alertas, comunicación y configuración.
- `apps/mobile`: aplicación Expo/React Native para pacientes. Cubre onboarding, carga de datos, historial, cálculo, comunicación y funciones asociadas al sensor NFC.

## Paquetes compartidos

- `packages/api-client`: cliente HTTP reutilizable para `web` y `mobile`.
- `packages/auth-utils`: helpers de expiración y validación de tokens.
- `packages/mdi-insulin-algorithm`: lógica de cálculo de dosis y validaciones clínicas.
- `packages/theme`: tema visual compartido.
- `packages/types`: contratos de tipos compartidos entre frontend y backend.
- `packages/utils`: utilidades transversales.
- `packages/env` y `packages/config`: validación/configuración compartida del workspace.

## Flujo de datos

1. El usuario se autentica desde `web` o `mobile`.
2. El frontend consume la API `backend` mediante `@glucosapp/api-client`.
3. El backend resuelve reglas de negocio, persiste en PostgreSQL y usa Prisma para acceso a datos.
4. Los módulos clínicos y de soporte reutilizan tipos y utilidades compartidas.
5. Alertas, reportes y mensajería se exponen a través de endpoints REST y, cuando aplica, canales en tiempo real.

## Flujos críticos que sustentan la tesis

- Autenticación y manejo de sesión.
- Registro y consulta de glucosa.
- Cálculo de dosis de insulina.
- Gestión de alertas clínicas.
- Comunicación paciente-profesional.
- Generación de reportes y visualización de estadísticas.

## Criterio de evaluación técnica

Para la defensa, el repositorio debe demostrar:

- instalación reproducible;
- separación clara entre capas;
- contratos compartidos consistentes;
- pipeline de calidad verificable;
- evidencia automatizada en backend y flujos críticos de frontend.
