# Guion de demo para defensa

## Objetivo

Mostrar que Glucosapp cubre un circuito clínico-tecnológico coherente, desde autenticación hasta seguimiento y apoyo a la toma de decisiones.

## Preparación

- Confirmar que `backend` y `web` estén corriendo.
- Confirmar que `mobile` esté conectado al mismo backend.
- Tener al menos un usuario profesional y un usuario paciente de prueba.
- Tener datos demo cargados o un flujo preparado para registrar información en vivo.

## Recorrido sugerido

### 1. Autenticación

- Ingresar en web con usuario profesional.
- Mostrar protección de rutas y acceso al dashboard.
- Ingresar o restaurar sesión en mobile con usuario paciente.

### 2. Visualización clínica

- Mostrar dashboard web con resumen de pacientes, alertas y métricas.
- Mostrar en mobile la pantalla principal o historial del paciente.

### 3. Flujo funcional de alto valor en web

- Navegar a pacientes, alertas, citas o comunicación.
- Ejecutar una acción concreta: revisar alertas, ver evolución o abrir conversación.

### 4. Flujo funcional de alto valor en mobile

- Registrar glucosa o navegar al flujo de cálculo.
- Mostrar cómo la app soporta seguimiento diario del paciente.

### 5. Soporte a la decisión y trazabilidad

- Señalar el cálculo de insulina y el módulo algorítmico compartido.
- Mostrar reportes, estadísticas o historial como evidencia de seguimiento longitudinal.

## Mensajes clave para el jurado

- Monorepo con lógica compartida y contratos tipados.
- Backend con módulos de dominio y tests unitarios amplios.
- Frontends con validación automatizada en flujos críticos.
- Configuración reproducible mediante `.env.example`, README y guía de setup.
