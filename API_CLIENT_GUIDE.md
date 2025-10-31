# API Client Usage Guide

## Overview

Este proyecto usa `openapi-fetch` (generado por `@glucosapp/api-client`) para las llamadas al backend. **NO es un cliente REST tradicional**, por lo que tiene una sintaxis diferente.

## ❌ ERROR COMÚN: Wrapper `body:`

### ❌ INCORRECTO (Causa error de validación)

```typescript
const response = await client.POST("/sensor-readings/batch", {
  body: {  // ❌ NO usar este wrapper
    readings: [...]
  }
});

// Error resultante:
// ["property body should not exist",
//  "readings must be an array"]
```

### ✅ CORRECTO

```typescript
const response = await client.POST("/sensor-readings/batch", {
  readings: [...]  // ✅ Datos directamente, sin wrapper
});
```

## Sintaxis del API Client

### POST Requests

```typescript
// ✅ Correcto
const response = await client.POST("/endpoint", {
  field1: value1,
  field2: value2,
  nestedField: {
    subfield: value,
  },
});
```

### GET Requests con Query Params

```typescript
// ✅ Correcto
const response = await client.GET("/endpoint", {
  params: {
    query: {
      filter: "value",
      page: 1,
    },
  },
});
```

### PUT/PATCH Requests

```typescript
// ✅ Correcto
const response = await client.PUT("/endpoint/{id}", {
  params: {
    path: { id: "123" },
  },
  field1: updatedValue,
  field2: anotherValue,
});
```

### DELETE Requests

```typescript
// ✅ Correcto
const response = await client.DELETE("/endpoint/{id}", {
  params: {
    path: { id: "123" },
  },
});
```

## Ejemplos del Proyecto

### 1. Batch Create Sensor Readings

```typescript
// ✅ CORRECTO
const response = await client.POST("/sensor-readings/batch", {
  readings: encryptedReadings.map(reading => ({
    glucoseEncrypted: reading.glucoseEncrypted,
    recordedAt: reading.timestamp.toISOString(),
    source: "LIBRE_NFC" as const,
    isHistorical: reading.isHistorical,
  })),
});

// ❌ INCORRECTO
const response = await client.POST("/sensor-readings/batch", {
  body: {  // ❌ NO
    readings: [...]
  }
});
```

### 2. Create Glucose Entry

```typescript
// ✅ CORRECTO
const response = await client.POST("/glucose-entries", {
  mgdl: 120,
  note: "Post-meal",
  recordedAt: new Date().toISOString()
});

// ❌ INCORRECTO
const response = await client.POST("/glucose-entries", {
  body: {  // ❌ NO
    mgdl: 120,
    ...
  }
});
```

### 3. Login

```typescript
// ✅ CORRECTO
const response = await client.POST("/auth/login", {
  email: "user@example.com",
  password: "password123",
});

// ❌ INCORRECTO
const response = await client.POST("/auth/login", {
  body: {
    // ❌ NO
    email: "user@example.com",
    password: "password123",
  },
});
```

### 4. Get Statistics

```typescript
// ✅ CORRECTO
const response = await client.GET("/statistics/summary", {});

// Si tuviera query params:
const response = await client.GET("/statistics/summary", {
  params: {
    query: {
      days: 30,
    },
  },
});
```

### 5. Export Readings

```typescript
// ✅ CORRECTO
const response = await client.GET("/sensor-readings/export", {
  params: {
    query: {
      format: "json",
      startDate: "2025-01-01",
      endDate: "2025-01-31",
    },
  },
});
```

## Por Qué Este Formato

El cliente `openapi-fetch` está **tipado desde el esquema OpenAPI/Swagger**. Los parámetros del segundo argumento corresponden **directamente al body del request HTTP**, no a un objeto con una propiedad `body`.

## Validación de Errores

Si ves este error:

```
["property body should not exist"]
```

Significa que estás usando el wrapper `body:` incorrectamente. **Elimínalo**.

## Response Handling

```typescript
const response = await client.POST("/endpoint", { data });

// Response tiene esta estructura:
{
  data?: T,      // Si fue exitoso
  error?: Error, // Si hubo error
  response: Response // Response HTTP raw
}

// ✅ Manejo correcto
if (response.error) {
  console.error("Error:", response.error);
  throw new Error("Failed to...");
}

// Usar response.data
const result = response.data;
```

## TypeScript Types

El cliente está completamente tipado:

```typescript
// TypeScript infiere los tipos del schema
const response = await client.POST("/auth/login", {
  email: "test@example.com", // ✅ TypeScript valida estos campos
  password: "pass123",
});

// response.data está tipado como AuthResponse
if (response.data) {
  const token = response.data.accessToken; // ✅ Autocompletado
}
```

## Debugging

Para ver el request real:

```typescript
const response = await client.POST("/endpoint", { data });
console.log("Response:", response);

// En caso de error, ver detalles:
if (response.error) {
  console.log("Error details:", JSON.stringify(response.error, null, 2));
}
```

## Checklist para Nuevas Llamadas API

- [ ] **NO** usar wrapper `body:`
- [ ] Datos van directamente en el segundo parámetro
- [ ] Query params van en `params.query`
- [ ] Path params van en `params.path`
- [ ] Verificar tipos con TypeScript (autocompletado)
- [ ] Manejar `response.error` y `response.data`

## Referencias

- Cliente generado: `packages/api-client/src/index.ts`
- Tipos: Inferidos desde el schema OpenAPI del backend
- Documentación: http://localhost:3000/api/docs (Swagger)
