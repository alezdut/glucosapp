# Instalación reproducible de v0.1.0

## Requisitos

Node 20.19.5 y pnpm 9.12.2; PostgreSQL 16 o posterior. La instalación rápida usa Docker Compose v2 para una base local dedicada. Esta release se instala en una **base nueva**; no migra datos de versiones previas.

```sh
corepack enable
corepack prepare pnpm@9.12.2 --activate
pnpm install --frozen-lockfile
pnpm demo:setup
```

El comando prepara paquetes compartidos, Prisma, las migraciones y los registros ficticios. Genera `apps/backend/.env`, `apps/web/.env.local` y `apps/mobile/.env` solo si faltan. Nunca sobrescribe secretos existentes. Si la configuración del backend apunta a otra base o contiene valores incompletos, se detiene: use un checkout nuevo para la demo o configure explícitamente una base local llamada `glucosapp_demo`.

Con Docker, PostgreSQL escucha solo en 127.0.0.1:55432 y usa un volumen del proyecto `glucosapp-demo`. Para detenerlo sin eliminar datos:

```sh
docker compose -p glucosapp-demo -f docker-compose.demo.yml stop
```

## PostgreSQL ya instalado

Cree una base vacía llamada `glucosapp_demo` con su administrador habitual. Use una URL local y credenciales propias; el comando no crea ni reinicia bases remotas:

```sh
DEMO_DATABASE_URL='postgresql://usuario:clave@127.0.0.1:5432/glucosapp_demo' pnpm demo:setup
```

Repita la misma variable al volver a ejecutar el setup o el smoke test. Para los datos ficticios se exige `DEMO_MODE=true`, un entorno distinto de producción y una base local con ese nombre. La configuración generada incluye esa marca. `demo:populate` y `demo:reset` comprueban las mismas restricciones antes de escribir.

## Ejecutar

```sh
pnpm dev
```

Backend: http://localhost:3000/v1/health. Swagger: http://localhost:3000/docs. Web: http://localhost:3001. Los paquetes compartidos ya fueron compilados por el setup.

En otra terminal:

```sh
pnpm dev:mobile
```

Para usar un dispositivo físico, cambie `EXPO_PUBLIC_API_BASE_URL` en el archivo de entorno móvil por la IP LAN del backend y reinicie Metro. iOS Simulator puede usar localhost; Android Emulator normalmente usa 10.0.2.2. No cambie la URL de la base de datos del backend.

Expo requiere un entorno compatible con SDK 54. NFC y otros módulos nativos necesitan una development build, Xcode/Android Studio y hardware apropiado; no se garantiza que funcionen en Expo Go ni en navegador. La demo principal utiliza registros manuales y datos sintéticos.

Para una build nativa iOS desde macOS:

```sh
cd apps/mobile/ios
pod install
cd ..
pnpm exec expo run:ios --device
```

El hook de CocoaPods incluye compatibilidad de fmt 11.0.2 con Apple clang 21+, conservando la validación de formatos. Requiere Xcode y sus runtimes de simulador instalados.

## Funciones opcionales

| Función                                                            | Dependencia externa                       | Demo principal                                  |
| ------------------------------------------------------------------ | ----------------------------------------- | ----------------------------------------------- |
| Acceso email/contraseña y usuarios precargados                     | Ninguna                                   | Disponible                                      |
| Gráficos, alertas, citas, chat conectado y reportes PDF/CSV sin IA | Backend y base locales                    | Disponible                                      |
| Acceso Google                                                      | Credenciales OAuth                        | Opcional                                        |
| Emails de recuperación/verificación                                | SMTP o Resend                             | Opcional; las cuentas demo ya están verificadas |
| Notificaciones push                                                | Expo/EAS y dispositivo                    | Opcional                                        |
| Resumen por IA y análisis de imágenes                              | Claves o servicio de análisis configurado | Opcional, fuera del recorrido principal         |
| Lectura NFC de sensores                                            | Hardware y build nativa                   | Opcional                                        |
| Búsqueda de alimentos                                              | Internet/OpenFoodFacts                    | Opcional; use entrada manual                    |

Las variables `NEXT_PUBLIC_*` y `EXPO_PUBLIC_*` son públicas. JWT, claves de cifrado, credenciales de base y claves de proveedores pertenecen exclusivamente al backend. Nunca publique archivos `.env`.

## Verificar

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm test:release
pnpm -C apps/backend test:integration
pnpm build
pnpm demo:smoke
```

El smoke test vuelve a ejecutar el setup dos veces, comprueba que no duplique registros y levanta temporalmente la API en 3400. Usa exclusivamente datos ficticios y verifica autenticación, perfil, permisos, cifrado, mensajería y reportes. Reserve ese puerto o configure `DEMO_SMOKE_PORT`.

## Limitaciones

No hay validación clínica, garantía, hosting público ni publicación en tiendas. Las migraciones consolidadas están destinadas a bases nuevas. La mensajería requiere conexión; outbox y reintentos del PR 35 no forman parte de v0.1.0. Las cuentas compartidas y claves de Docker son solo para la demo local.
