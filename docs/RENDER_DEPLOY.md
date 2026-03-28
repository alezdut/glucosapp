# Deploy en Render + Supabase

## Qué crea el blueprint

El archivo [`render.yaml`](/Users/alejandrozdut/Documents/glucosapp/render.yaml) define:

- `glucosapp-backend` como Web Service Node
- `glucosapp-web` como Web Service Node
- build desde la raíz del monorepo para que `apps/*` pueda usar `packages/*`
- `buildFilter` por servicio para evitar deploys innecesarios

## Variables obligatorias

### Backend

- `DATABASE_URL`: connection string de Supabase
- `ALLOWED_ORIGINS`: URL pública del frontend en Render y/o tu dominio, separadas por comas
- `FRONTEND_URL`: URL pública del frontend
- `ENCRYPTION_KEY`: string hexadecimal de 64 caracteres

Render genera automáticamente:

- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`

### Web

- `NEXT_PUBLIC_API_BASE_URL`: URL pública del backend, por ejemplo `https://tu-backend.onrender.com`

## Variables opcionales

Si vas a usar esas funciones, agregalas manualmente en el servicio backend:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `GOOGLE_MOBILE_CALLBACK_URL`
- `GEMINI_API_KEY`

## Orden recomendado

1. Crear la base en Supabase.
2. Pasarme `DATABASE_URL`.
3. Yo corro las migraciones de Prisma contra Supabase desde local.
4. Crear el Blueprint en Render usando [`render.yaml`](/Users/alejandrozdut/Documents/glucosapp/render.yaml).
5. Completar las variables secretas que Render pida al importar el blueprint.
6. Confirmar o ajustar las URLs públicas finales:
   - backend en `NEXT_PUBLIC_API_BASE_URL`
   - frontend en `FRONTEND_URL`
   - frontend en `ALLOWED_ORIGINS`

## Comando de migración que voy a usar cuando me pases la conexión

```bash
DATABASE_URL="postgresql://..." pnpm --filter backend exec prisma migrate deploy --schema prisma/schema.prisma
```
