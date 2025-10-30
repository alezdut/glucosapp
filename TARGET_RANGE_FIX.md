# Target Range Fix - Undefined Values

## 🐛 Problema

Las líneas de referencia del rango objetivo mostraban:

```
Máx: undefined
Mín: undefined
```

Las líneas se salían completamente del gráfico porque los valores eran undefined.

---

## 🔍 Causa Raíz

El backend estaba **obteniendo** los valores `minTargetGlucose` y `maxTargetGlucose` de la base de datos, pero **NO los estaba incluyendo** en la respuesta del endpoint `/profile`.

### Análisis del Problema

#### 1. El Service seleccionaba los campos correctamente

```typescript
// ✅ Estos campos SE seleccionaban de la DB
select: {
  minTargetGlucose: true,
  maxTargetGlucose: true,
  // ... otros campos
}
```

#### 2. Pero NO se incluían en el objeto de retorno

```typescript
// ❌ ANTES - No incluía los campos
return {
  ...user,
  firstName: user.firstName ?? undefined,
  lastName: user.lastName ?? undefined,
  targetGlucose: user.targetGlucose ?? undefined,
  // ❌ minTargetGlucose y maxTargetGlucose no estaban aquí!
  createdAt: user.createdAt.toISOString(),
};
```

#### 3. El DTO tampoco los definía

```typescript
// ❌ ANTES - ProfileResponseDto no incluía estos campos
export class ProfileResponseDto {
  targetGlucose?: number;
  // ❌ minTargetGlucose y maxTargetGlucose no estaban definidos
  mealTimeBreakfastStart?: number;
}
```

---

## ✅ Solución Implementada

### 1. **Actualizado ProfileService**

**Archivo:** `apps/backend/src/modules/profile/profile.service.ts`

#### Método `getProfile()`

```typescript
// ✅ AHORA - Incluye los campos en el retorno
return {
  ...user,
  firstName: user.firstName ?? undefined,
  lastName: user.lastName ?? undefined,
  targetGlucose: user.targetGlucose ?? undefined,
  minTargetGlucose: user.minTargetGlucose, // ✅ Agregado
  maxTargetGlucose: user.maxTargetGlucose, // ✅ Agregado
  createdAt: user.createdAt.toISOString(),
};
```

#### Método `updateProfile()`

```typescript
// ✅ AHORA - También incluido en el update
return {
  ...user,
  firstName: user.firstName ?? undefined,
  lastName: user.lastName ?? undefined,
  targetGlucose: user.targetGlucose ?? undefined,
  minTargetGlucose: user.minTargetGlucose, // ✅ Agregado
  maxTargetGlucose: user.maxTargetGlucose, // ✅ Agregado
  createdAt: user.createdAt.toISOString(),
};
```

---

### 2. **Actualizado ProfileResponseDto**

**Archivo:** `apps/backend/src/modules/profile/dto/profile-response.dto.ts`

```typescript
// ✅ AHORA - DTO incluye los campos
export class ProfileResponseDto {
  @ApiProperty({ required: false })
  targetGlucose?: number;

  @ApiProperty()
  minTargetGlucose!: number; // ✅ Agregado

  @ApiProperty()
  maxTargetGlucose!: number; // ✅ Agregado

  // Insulin profile - También agregados para completitud
  @ApiProperty()
  icRatioBreakfast!: number; // ✅ Agregado

  @ApiProperty()
  icRatioLunch!: number; // ✅ Agregado

  @ApiProperty()
  icRatioDinner!: number; // ✅ Agregado

  @ApiProperty()
  insulinSensitivityFactor!: number; // ✅ Agregado

  @ApiProperty()
  diaHours!: number; // ✅ Agregado

  // ... rest of fields
}
```

---

### 3. **Agregado Logging en el Frontend**

**Archivo:** `apps/mobile/src/screens/NFCScanScreen.tsx`

```typescript
const fetchUserProfile = async () => {
  try {
    const client = createApiClient();
    const response = await client.GET("/profile", {});

    if (response.data && !response.error) {
      const profile = response.data as any;

      // ✅ Log para debugging
      console.log("Profile data received:", {
        minTargetGlucose: profile.minTargetGlucose,
        maxTargetGlucose: profile.maxTargetGlucose,
      });

      setTargetRange({
        min: profile.minTargetGlucose || 70,
        max: profile.maxTargetGlucose || 180,
      });
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    setTargetRange({ min: 70, max: 180 });
  }
};
```

---

## 📝 Archivos Modificados

### Backend

1. ✅ `apps/backend/src/modules/profile/profile.service.ts`
   - Método `getProfile()` - Agregados campos al return
   - Método `updateProfile()` - Agregados campos al return

2. ✅ `apps/backend/src/modules/profile/dto/profile-response.dto.ts`
   - Agregados `minTargetGlucose` y `maxTargetGlucose`
   - Agregados campos de insulin profile (icRatios, ISF, DIA)

### Frontend

3. ✅ `apps/mobile/src/screens/NFCScanScreen.tsx`
   - Agregado console.log para debugging

---

## 🧪 Para Verificar

### 1. Reinicia el backend

```bash
cd apps/backend
# El backend debería reiniciarse automáticamente si está en modo dev
# Si no, ejecuta: pnpm dev
```

### 2. Abre la app móvil

```bash
cd apps/mobile
pnpm dev
```

### 3. Ve a la pantalla de Escanear Sensor

### 4. Verifica en la consola

Deberías ver:

```javascript
Profile data received: {
  minTargetGlucose: 80,  // ✅ Ya NO undefined
  maxTargetGlucose: 140  // ✅ Ya NO undefined
}
```

### 5. Verifica la gráfica

Las líneas de referencia ahora deberían mostrar:

```
Máx: 140  // ✅ Valor correcto
Mín: 80   // ✅ Valor correcto
```

---

## 📊 Valores por Defecto

Si el usuario NO ha configurado su perfil, los valores son:

| Campo              | Valor Default (Schema) | Valor Fallback (Frontend) |
| ------------------ | ---------------------- | ------------------------- |
| `minTargetGlucose` | 80 mg/dL               | 70 mg/dL                  |
| `maxTargetGlucose` | 140 mg/dL              | 180 mg/dL                 |

**Esquema de Prisma:**

```prisma
minTargetGlucose  Int  @default(80)
maxTargetGlucose  Int  @default(140)
```

**Fallback en Frontend:**

```typescript
setTargetRange({
  min: profile.minTargetGlucose || 70,
  max: profile.maxTargetGlucose || 180,
});
```

---

## ✨ Resultado Esperado

### Antes ❌

```
Historial (últimas 8 horas)
Rango objetivo: undefined - undefined mg/dL

(líneas fuera del gráfico)
```

### Ahora ✅

```
Historial (últimas 8 horas)
Rango objetivo: 80 - 140 mg/dL

━━━━━━━━ Máx: 140 ━━━━━━━━ (línea verde visible)
    🔵─────🔵─────🔵
         /         \
       🔵           🟡
━━━━━━━━ Mín: 80 ━━━━━━━━━ (línea verde visible)
```

---

## 🔧 Mejoras Adicionales Implementadas

También se agregaron al DTO los campos de insulin profile que faltaban:

- `icRatioBreakfast`
- `icRatioLunch`
- `icRatioDinner`
- `insulinSensitivityFactor`
- `diaHours`

Estos campos se estaban seleccionando de la DB pero no se incluían en la respuesta, lo que podría causar problemas en otras partes de la app.

---

**Fecha:** 29 de octubre de 2025  
**Estado:** ✅ Solucionado  
**Archivos:** 3 archivos modificados (2 backend, 1 frontend)
