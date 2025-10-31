# GlucoseChart - Componente Reutilizable

## 📊 Descripción

Se creó un componente reutilizable `GlucoseChart` para mostrar gráficos de glucosa en diferentes partes de la aplicación.

---

## ✨ Características

### Visualización

- ✅ Gráfico de área con gradiente
- ✅ Líneas curvas para mejor visualización
- ✅ Puntos de datos coloreados según rango objetivo
  - 🔵 Azul: dentro del rango objetivo
  - 🟡 Amarillo: fuera del rango objetivo
- ✅ Líneas de referencia para límites min/max del rango
- ✅ Eje X con etiquetas de tiempo (horas)
- ✅ Eje Y con valores en mg/dL

### Funcionalidad

- ✅ Completamente configurable mediante props
- ✅ Manejo automático de estado vacío
- ✅ Soporte opcional para rango objetivo
- ✅ Adaptable a diferentes contextos

---

## 📁 Archivos Creados/Modificados

### Nuevo Componente

**`apps/mobile/src/components/GlucoseChart.tsx`**

```typescript
export type GlucoseDataPoint = {
  glucose: number;
  timestamp: Date;
};

export type TargetRange = {
  min: number;
  max: number;
};

type GlucoseChartProps = {
  data: GlucoseDataPoint[];
  targetRange?: TargetRange;
  title?: string;
  height?: number;
  width?: number;
  showTargetRangeSubtitle?: boolean;
};
```

### Exportaciones

**`apps/mobile/src/components/index.ts`**

```typescript
export { GlucoseChart } from "./GlucoseChart";
export type { GlucoseDataPoint, TargetRange } from "./GlucoseChart";
```

### Refactorización

**`apps/mobile/src/screens/NFCScanScreen.tsx`**

- ❌ Eliminado: Imports de `LineChart` (ya no se usa directamente)
- ❌ Eliminado: Función `getChartData()` (movida al componente)
- ❌ Eliminado: JSX complejo del gráfico (55+ líneas)
- ❌ Eliminado: Estilos `chartContainer`, `chartTitle`, `chartSubtitle`, `axisText`
- ✅ Agregado: Import de `GlucoseChart`
- ✅ Agregado: Uso simple del componente (5 líneas)

---

## 🎯 Uso del Componente

### Ejemplo Básico

```tsx
import { GlucoseChart } from "../components";

<GlucoseChart data={sensorData.historicalReadings} title="Historial de Glucosa" />;
```

### Ejemplo con Rango Objetivo

```tsx
<GlucoseChart
  data={sensorData.historicalReadings}
  targetRange={{ min: 70, max: 140 }}
  title="Historial (últimas 8 horas)"
  showTargetRangeSubtitle
/>
```

### Ejemplo con Configuración Personalizada

```tsx
<GlucoseChart
  data={weeklyData}
  targetRange={{ min: 80, max: 120 }}
  title="Última Semana"
  height={300}
  width={380}
  showTargetRangeSubtitle={false}
/>
```

---

## 📋 Props del Componente

| Prop                      | Tipo                 | Requerido | Default                  | Descripción                  |
| ------------------------- | -------------------- | --------- | ------------------------ | ---------------------------- |
| `data`                    | `GlucoseDataPoint[]` | ✅ Sí     | -                        | Array de lecturas de glucosa |
| `targetRange`             | `TargetRange`        | ❌ No     | `undefined`              | Rango objetivo min/max       |
| `title`                   | `string`             | ❌ No     | `"Historial de Glucosa"` | Título del gráfico           |
| `height`                  | `number`             | ❌ No     | `220`                    | Altura en píxeles            |
| `width`                   | `number`             | ❌ No     | `320`                    | Ancho en píxeles             |
| `showTargetRangeSubtitle` | `boolean`            | ❌ No     | `true`                   | Mostrar subtítulo con rango  |

---

## 🔄 Comparación: Antes vs Después

### ❌ ANTES (en NFCScanScreen.tsx)

```tsx
// 55+ líneas de código JSX
{sensorData && sensorData.historicalReadings.length > 0 && (
  <View style={styles.chartContainer}>
    <Text style={styles.chartTitle}>Historial (últimas 8 horas)</Text>
    {targetRange && (
      <Text style={styles.chartSubtitle}>
        Rango objetivo: {targetRange.min} - {targetRange.max} mg/dL
      </Text>
    )}

    <LineChart
      data={getChartData()}
      height={220}
      width={320}
      spacing={10}
      initialSpacing={10}
      color={theme.colors.primary}
      thickness={3}
      startFillColor={theme.colors.primary + "40"}
      // ... 35+ props más ...
    />
  </View>
)}

// Función auxiliar
const getChartData = () => {
  if (!sensorData || !sensorData.historicalReadings.length) {
    return [];
  }

  return sensorData.historicalReadings.map((reading, index) => {
    const isOutOfRange = targetRange
      ? (reading.glucose < targetRange.min || reading.glucose > targetRange.max)
      : false;

    return {
      value: reading.glucose,
      label: index % 4 === 0 ? new Date(reading.timestamp).getHours().toString() : "",
      dataPointColor: isOutOfRange ? "#F59E0B" : theme.colors.primary,
    };
  });
};

// Estilos
chartContainer: { /* ... */ },
chartTitle: { /* ... */ },
chartSubtitle: { /* ... */ },
axisText: { /* ... */ },
```

### ✅ AHORA

```tsx
// 5 líneas de código JSX
{
  sensorData && sensorData.historicalReadings.length > 0 && (
    <GlucoseChart
      data={sensorData.historicalReadings}
      targetRange={targetRange || undefined}
      title="Historial (últimas 8 horas)"
      showTargetRangeSubtitle
    />
  );
}

// ✅ Sin función auxiliar necesaria
// ✅ Sin estilos adicionales
```

---

## 🎨 Características de Diseño

### Colores

- **Línea principal**: Color primario del tema
- **Gradiente**: Degradado del color primario (40% → 10% opacidad)
- **Puntos en rango**: Color primario (`theme.colors.primary`)
- **Puntos fuera de rango**: Amarillo (`#F59E0B`)
- **Líneas de referencia**: Verde (`#10B981`)

### Espaciado y Tamaño

- **Padding**: `theme.spacing.lg`
- **Border radius**: `theme.borderRadius.lg`
- **Shadow**: Sombra sutil (opacity 0.1)

### Tipografía

- **Título**: `theme.fontSize.lg`, peso 600
- **Subtítulo**: `theme.fontSize.sm`, verde
- **Etiquetas de ejes**: `theme.fontSize.xs`, color secundario

---

## 📦 Dónde se Puede Usar

Este componente ahora se puede utilizar en:

1. ✅ **NFCScanScreen** (implementado)
   - Muestra historial de últimas 8 horas del sensor

2. 🎯 **HistoryScreen** (futuro)
   - Gráfico de tendencias por día/semana/mes
   - Comparativas de períodos

3. 🎯 **HomeScreen** (futuro)
   - Widget de resumen rápido
   - Tendencia de últimas 24 horas

4. 🎯 **InsightsScreen** (futuro)
   - Análisis de patrones
   - Gráficos comparativos

---

## 🧪 Estado Vacío

El componente maneja automáticamente el caso cuando no hay datos:

```tsx
// Si data.length === 0
<View style={styles.container}>
  <Text style={styles.title}>{title}</Text>
  <View style={styles.emptyState}>
    <Text style={styles.emptyText}>No hay datos disponibles</Text>
  </View>
</View>
```

---

## 🔧 Lógica Interna

### Transformación de Datos

El componente convierte internamente los datos de:

```typescript
// Input
GlucoseDataPoint[] = [
  { glucose: 120, timestamp: Date },
  { glucose: 95, timestamp: Date },
  // ...
]

// Output (para LineChart)
ChartData[] = [
  { value: 120, label: "14", dataPointColor: "#3B82F6" },
  { value: 95, label: "", dataPointColor: "#3B82F6" },
  // ...
]
```

### Lógica de Color de Puntos

```typescript
const isOutOfRange = targetRange
  ? reading.glucose < targetRange.min || reading.glucose > targetRange.max
  : false;

const dataPointColor = isOutOfRange ? "#F59E0B" : theme.colors.primary;
```

### Líneas de Referencia (Condicionales)

- Solo se muestran si `targetRange` está definido
- Línea 1: Máximo del rango
- Línea 2: Mínimo del rango
- Estilo: líneas punteadas verdes con etiquetas

---

## 📈 Beneficios de la Refactorización

1. ✅ **Reusabilidad**
   - Un solo componente para múltiples pantallas
   - Configuración consistente en toda la app

2. ✅ **Mantenibilidad**
   - Cambios en el gráfico se hacen en un solo lugar
   - Lógica centralizada

3. ✅ **Limpieza de Código**
   - NFCScanScreen redujo ~80 líneas
   - Separación de responsabilidades

4. ✅ **Testing**
   - Componente se puede testear de forma aislada
   - Props claramente definidas

5. ✅ **DX (Developer Experience)**
   - API simple y clara
   - TypeScript con tipos exportados
   - Documentación inline (JSDoc)

---

## 🚀 Próximos Pasos

### Mejoras Futuras

- [ ] Soporte para diferentes unidades (mmol/L)
- [ ] Tooltips al tocar puntos de datos
- [ ] Zoom y pan
- [ ] Exportar gráfico como imagen
- [ ] Temas claros/oscuros
- [ ] Animaciones de entrada

### Nuevos Usos

- [ ] Implementar en HistoryScreen
- [ ] Implementar en HomeScreen
- [ ] Crear variante para comparaciones (múltiples líneas)
- [ ] Crear variante para distribución (histograma)

---

## 📝 TypeScript

### Tipos Exportados

```typescript
// Punto de dato individual
export type GlucoseDataPoint = {
  glucose: number; // Valor en mg/dL
  timestamp: Date; // Fecha y hora
};

// Rango objetivo del usuario
export type TargetRange = {
  min: number; // Mínimo objetivo (ej: 70)
  max: number; // Máximo objetivo (ej: 140)
};
```

### Importación

```typescript
// Componente
import { GlucoseChart } from "../components";

// Tipos
import type { GlucoseDataPoint, TargetRange } from "../components";
```

---

## ✅ Testing

Para probar el componente:

```tsx
// Test con datos
const mockData: GlucoseDataPoint[] = [
  { glucose: 110, timestamp: new Date("2025-10-29T10:00:00") },
  { glucose: 95, timestamp: new Date("2025-10-29T10:05:00") },
  { glucose: 150, timestamp: new Date("2025-10-29T10:10:00") },
];

const mockRange: TargetRange = {
  min: 70,
  max: 140,
};

<GlucoseChart data={mockData} targetRange={mockRange} />;
```

---

**Fecha:** 29 de octubre de 2025  
**Estado:** ✅ Implementado  
**Archivos:** 3 archivos (1 nuevo, 2 modificados)  
**Reducción de código:** ~80 líneas en NFCScanScreen.tsx
