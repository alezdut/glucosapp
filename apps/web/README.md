# Glucosapp Web

Aplicación Next.js para el perfil profesional dentro de Glucosapp.

## Cobertura funcional

- login y recuperación de acceso;
- dashboard profesional;
- seguimiento de pacientes;
- alertas, citas y comunicación;
- configuración de perfil y parámetros asociados.

## Configuración

Crear `apps/web/.env.local` a partir de `apps/web/.env.example`.

Variable requerida:

- `NEXT_PUBLIC_API_BASE_URL`

## Comandos

```bash
pnpm -C apps/web dev
pnpm -C apps/web lint
pnpm -C apps/web typecheck
pnpm -C apps/web test
pnpm -C apps/web build
```

## Referencias

- [Setup general del repositorio](../../docs/SETUP.md)
- [Guion de demo](../../docs/DEMO_SCRIPT.md)
