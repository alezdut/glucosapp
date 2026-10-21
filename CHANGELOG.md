# Changelog

## 0.1.0

Primera release open source experimental de Glucosapp.

- Plataforma web, móvil y API para seguimiento de glucosa, alertas, citas, comunicación y reportes.
- Integración del historial de master y develop y del PR 34: configuración de entornos separada por plataforma y edición del perfil.
- Licencia AGPL-3.0-only, conservación de MIT para MDI y avisos de OpenAPS, guía de contribución y política de seguridad.
- Acceso móvil con email y contraseña mediante el endpoint existente; Google permanece opcional.
- Preparación local de demo con datos sintéticos, profesional y diez pacientes asociados; configuración conservada al repetir.
- Verificaciones de instalación, migraciones, permisos y demo en CI.

### Limitaciones

Software experimental no validado clínicamente. La release requiere una base nueva; no proporciona actualización de instalaciones anteriores. El PR 35 (outbox y reintentos de mensajería) queda fuera. La demo no incluye servicios externos, hosting público, distribución npm ni publicación en tiendas.
