# Glucosapp Backend

Backend principal de Glucosapp, implementado con NestJS, Prisma y PostgreSQL.

## Responsabilidades

- autenticación con JWT y Google OAuth;
- gestión de pacientes y profesionales;
- registro de glucosa, comidas, dosis y lecturas de sensor;
- alertas, mensajería, reportes y estadísticas;
- documentación Swagger en `/docs`.

## Configuración mínima

Crear `apps/backend/.env` a partir de `apps/backend/.env.example`.

Variables obligatorias:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`

## Comandos

```bash
pnpm -C apps/backend prisma:generate
pnpm -C apps/backend prisma:migrate
pnpm -C apps/backend dev
pnpm -C apps/backend test
pnpm -C apps/backend build
```

## URLs esperadas

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`

## Referencias

- [Setup general del repositorio](../../docs/SETUP.md)
- [Arquitectura](../../docs/ARCHITECTURE.md)
