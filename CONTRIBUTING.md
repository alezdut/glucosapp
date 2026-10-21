# Contribuir a Glucosapp

Glucosapp es software experimental sin validación clínica. No use datos personales de salud en issues, PR, pruebas ni capturas.

## Desarrollo

Use Node 20.19.5, pnpm 9.12.2 y PostgreSQL 16 o posterior. Siga [SETUP](docs/SETUP.md), ejecute `pnpm demo:setup` y trabaje con datos sintéticos.

La rama estable es `master`; las propuestas parten de `develop`. Cree una rama descriptiva y abra un PR hacia `develop`. Las releases se integran a `master` después de revisar código y CI; luego se sincroniza `develop`.

Antes de un PR ejecute:

```sh
pnpm install --frozen-lockfile
pnpm -C apps/backend prisma:generate
pnpm --filter './packages/**' build
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm test:release
pnpm -C apps/backend test:integration
pnpm build
pnpm demo:smoke
```

Describa el problema, el comportamiento resultante y las verificaciones. Añada pruebas de regresión para cambios de comportamiento, incluidas autorización y configuración; no reduzca umbrales ni oculte errores para pasar CI. Use commits convencionales (`fix:`, `feat:`, `docs:`, `test:`, `chore:`).

## Cambios clínicos

Un cambio en cálculo de insulina, límites o interpretación clínica requiere casos de prueba, explicación de fuentes y revisión especializada de un profesional competente antes de integrarse. Un test aprobado no equivale a validación clínica. No introduzca cambios clínicos en PR de documentación o infraestructura.

## Licencias

Al contribuir confirma que tiene derecho a aportar el trabajo y acepta AGPL-3.0-only para código nuevo del proyecto. Mantenga MIT y avisos originales en el componente MDI y cualquier material de terceros; documente su procedencia. No se exige ceder copyright ni firmar un CLA.

Reporte vulnerabilidades de forma privada siguiendo [SECURITY](SECURITY.md).
