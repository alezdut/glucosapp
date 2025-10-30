# Chart Dimensions Guide

## 📏 Dimensiones Estandarizadas de Gráficos

Para mantener consistencia visual en toda la aplicación, se han definido dimensiones estandarizadas para los gráficos en el tema global.

## 🎨 Ubicación

**Archivo**: `apps/mobile/src/theme.ts`

```typescript
chartDimensions: {
  defaultWidth: 320,    // Ancho por defecto para gráficos
  defaultHeight: 220,   // Alto por defecto para gráficos
  compactHeight: 180,   // Alto compacto (para cards pequeñas)
  expandedHeight: 280,  // Alto expandido (para vista detallada)
}
```

## 📐 Uso

### En Componentes React Native

```typescript
import { theme } from "../theme";

// Usar dimensiones del tema
const chartWidth = theme.chartDimensions.defaultWidth;
const chartHeight = theme.chartDimensions.defaultHeight;
```

### En StyleSheet

```typescript
const styles = StyleSheet.create({
  chartContainer: {
    width: theme.chartDimensions.defaultWidth,
    height: theme.chartDimensions.defaultHeight,
  },
  compactChart: {
    width: theme.chartDimensions.defaultWidth,
    height: theme.chartDimensions.compactHeight,
  },
});
```

### Como Props por Defecto

```typescript
type ChartProps = {
  width?: number;
  height?: number;
};

const MyChart = ({
  width = theme.chartDimensions.defaultWidth,
  height = theme.chartDimensions.defaultHeight,
}: ChartProps) => {
  // ...
};
```

## 🎯 Casos de Uso

### `defaultWidth` y `defaultHeight`

- **Uso**: Gráficos estándar en pantallas de resumen
- **Ejemplo**: Gráfico de glucosa en NFCScanScreen
- **Dimensiones**: 320 × 220 px

### `compactHeight`

- **Uso**: Gráficos en cards o previews
- **Ejemplo**: Vista previa de tendencias en HomeScreen
- **Dimensiones**: 320 × 180 px

### `expandedHeight`

- **Uso**: Gráficos en pantallas de análisis detallado
- **Ejemplo**: Vista completa de historial en HistoryScreen
- **Dimensiones**: 320 × 280 px

## ✅ Beneficios

1. **Consistencia Visual**: Todos los gráficos tienen el mismo tamaño
2. **Mantenibilidad**: Un solo lugar para cambiar dimensiones
3. **Flexibilidad**: Fácil agregar nuevos tamaños (ej. `largeWidth`)
4. **Responsive**: Base sólida para adaptar a diferentes pantallas

## 🔄 Extensión

Para agregar nuevas dimensiones:

```typescript
chartDimensions: {
  defaultWidth: 320,
  defaultHeight: 220,
  compactHeight: 180,
  expandedHeight: 280,
  // ⬇️ Nuevas dimensiones
  largeWidth: 380,     // Para tablets
  miniHeight: 120,     // Para widgets
  fullWidth: "100%",   // Para gráficos de ancho completo
}
```

## 📦 Componentes que Usan Estas Dimensiones

- ✅ `GlucoseChart` - Usa `defaultWidth` y `defaultHeight`
- 🔄 `TrendChart` - (Futuro)
- 🔄 `StatisticsChart` - (Futuro)

## 🎨 Relación con Otros Valores del Tema

Las dimensiones de chart están diseñadas para complementar:

- **Spacing**: `theme.spacing.lg` para padding del contenedor
- **Border Radius**: `theme.borderRadius.lg` para cards de gráficos
- **Colors**: `theme.colors.primary` para líneas principales

---

**Última actualización**: 2025-10-29  
**Autor**: GlucosApp Team
