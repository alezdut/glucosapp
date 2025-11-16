# Coverage Gap Analysis

## Estado Actual

- **Statements**: 20.37% (requerido: 80%) ❌
- **Branches**: 11.42% (requerido: 75%) ❌
- **Lines**: 20.71% (requerido: 80%) ❌
- **Functions**: 17.75% (requerido: 80%) ❌

## Módulos con Tests ✅

1. **auth/services** - 95.74% coverage
   - ✅ auth.service.ts
   - ✅ token.service.ts
   - ✅ email.service.ts

2. **common/services** - 95.38% coverage
   - ✅ encryption.service.ts
   - ✅ doctor-utils.service.ts

3. **glucose-entries** - 43.47% coverage
   - ✅ glucose-entries.service.ts (100%)
   - ❌ glucose-entries.controller.ts (0%)

4. **profile** - 45.71% coverage
   - ✅ profile.service.ts (100%)
   - ❌ profile.controller.ts (0%)

5. **auth/strategies** - 29.21% coverage
   - ✅ jwt.strategy.ts
   - ✅ local.strategy.ts
   - ❌ google.strategy.ts
   - ❌ google-mobile.strategy.ts
   - ❌ refresh-token.strategy.ts

## Módulos Sin Tests (Prioridad Alta) 🔴

### Servicios Críticos (más líneas de código)

1. **doctor-patient.service.ts** (1110 líneas) - 🔴 CRÍTICO
   - Gestión de relaciones doctor-paciente
   - Búsqueda y filtrado de pacientes
   - Actualización de perfiles de pacientes

2. **dashboard.service.ts** (561 líneas) - 🔴 CRÍTICO
   - Estadísticas del dashboard
   - Evolución de glucosa
   - Estadísticas de insulina y comidas

3. **statistics.service.ts** (391 líneas) - 🔴 CRÍTICO
   - Cálculo de estadísticas
   - Análisis de datos de glucosa
   - Métricas de insulina

4. **sensor-readings.service.ts** (357 líneas) - 🔴 CRÍTICO
   - Gestión de lecturas de sensores
   - Procesamiento de datos CGM

5. **alerts.service.ts** (275 líneas) - 🟡 IMPORTANTE
   - Gestión de alertas
   - Notificaciones de glucosa

6. **appointments.service.ts** (200 líneas) - 🟡 IMPORTANTE
   - Gestión de citas
   - Programación de citas

7. **insulin-calculation.service.ts** (187 líneas) - 🟡 IMPORTANTE
   - Cálculo de dosis de insulina
   - Lógica de MDI

8. **log-entries.service.ts** (186 líneas) - 🟡 IMPORTANTE
   - Gestión de entradas de log
   - Registro de eventos

9. **meals.service.ts** (73 líneas) - 🟢 MEDIO
   - Gestión de comidas
   - Búsqueda de alimentos

10. **food-search.service.ts** (64 líneas) - 🟢 MEDIO
    - Búsqueda de alimentos
    - Integración con APIs externas

## Controladores Sin Tests

1. **auth.controller.ts** (245 líneas) - 🔴 CRÍTICO
   - Endpoints de autenticación
   - Login, registro, refresh, etc.

2. **doctor-patient.controller.ts** (219 líneas) - 🔴 CRÍTICO
   - Endpoints de gestión doctor-paciente

3. **dashboard.controller.ts** (158 líneas) - 🔴 CRÍTICO
   - Endpoints del dashboard

4. **sensor-readings.controller.ts** (116 líneas) - 🟡 IMPORTANTE
5. **appointments.controller.ts** (92 líneas) - 🟡 IMPORTANTE
6. **alerts.controller.ts** (90 líneas) - 🟡 IMPORTANTE
7. **statistics.controller.ts** (75 líneas) - 🟡 IMPORTANTE
8. **meals.controller.ts** (65 líneas) - 🟢 MEDIO
9. **insulin-calculation.controller.ts** (54 líneas) - 🟢 MEDIO
10. **log-entries.controller.ts** (42 líneas) - 🟢 MEDIO
11. **glucose-entries.controller.ts** (30 líneas) - 🟢 MEDIO
12. **profile.controller.ts** (71 líneas) - 🟢 MEDIO
13. **insulin-doses.controller.ts** (30 líneas) - 🟢 MEDIO
14. **food-search.controller.ts** (28 líneas) - 🟢 MEDIO

## Guards Sin Tests

1. **jwt-auth.guard.ts** - 🔴 CRÍTICO
2. **local-auth.guard.ts** - 🔴 CRÍTICO
3. **refresh-token.guard.ts** - 🟡 IMPORTANTE
4. **google-auth.guard.ts** - 🟡 IMPORTANTE
5. **google-mobile-auth.guard.ts** - 🟡 IMPORTANTE

## Estrategia Recomendada para Alcanzar 80% Coverage

### Fase 1: Servicios Críticos (Impacto Alto)

1. ✅ doctor-patient.service.ts
2. ✅ dashboard.service.ts
3. ✅ statistics.service.ts
4. ✅ sensor-readings.service.ts

**Impacto estimado**: +15-20% coverage

### Fase 2: Controladores Críticos (Impacto Medio-Alto)

1. ✅ auth.controller.ts
2. ✅ doctor-patient.controller.ts
3. ✅ dashboard.controller.ts

**Impacto estimado**: +10-15% coverage

### Fase 3: Servicios Importantes (Impacto Medio)

1. ✅ alerts.service.ts
2. ✅ appointments.service.ts
3. ✅ insulin-calculation.service.ts
4. ✅ log-entries.service.ts

**Impacto estimado**: +8-12% coverage

### Fase 4: Guards y Strategies (Impacto Medio)

1. ✅ jwt-auth.guard.ts
2. ✅ local-auth.guard.ts
3. ✅ refresh-token.guard.ts
4. ✅ google.strategy.ts
5. ✅ google-mobile.strategy.ts
6. ✅ refresh-token.strategy.ts

**Impacto estimado**: +5-8% coverage

### Fase 5: Controladores Restantes (Impacto Bajo-Medio)

1. ✅ sensor-readings.controller.ts
2. ✅ appointments.controller.ts
3. ✅ alerts.controller.ts
4. ✅ statistics.controller.ts
5. ✅ meals.controller.ts
6. ✅ insulin-calculation.controller.ts
7. ✅ log-entries.controller.ts
8. ✅ glucose-entries.controller.ts
9. ✅ profile.controller.ts
10. ✅ insulin-doses.controller.ts
11. ✅ food-search.controller.ts

**Impacto estimado**: +10-15% coverage

### Fase 6: Servicios Menores (Impacto Bajo)

1. ✅ meals.service.ts
2. ✅ food-search.service.ts

**Impacto estimado**: +2-3% coverage

## Estimación Total

Con las Fases 1-4, deberíamos alcanzar aproximadamente:

- **Statements**: ~60-65%
- **Branches**: ~55-60%
- **Lines**: ~60-65%
- **Functions**: ~60-65%

Con todas las fases (1-6), deberíamos alcanzar:

- **Statements**: ~80-85% ✅
- **Branches**: ~75-80% ✅
- **Lines**: ~80-85% ✅
- **Functions**: ~80-85% ✅

## Notas

- Los controladores generalmente tienen menos lógica de negocio, por lo que su impacto en coverage es menor
- Los servicios son más críticos porque contienen la lógica de negocio
- Los guards y strategies son importantes para seguridad pero tienen menos líneas de código
- Se recomienda empezar por los servicios más grandes (doctor-patient, dashboard, statistics)
