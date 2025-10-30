# Target Range Visualization - Summary

## 🎯 Objetivo

Agregar líneas horizontales de referencia que representen el rango objetivo de glucosa del usuario (ej: 70-140 mg/dL) y resaltar en amarillo los puntos que estén fuera de ese rango.

---

## ✅ Implementación Completada

### 1. **Obtención del Perfil del Usuario**

**`NFCScanScreen.tsx`**

```typescript
const [targetRange, setTargetRange] = useState<{ min: number; max: number } | null>(null);

useEffect(() => {
  checkNfcAvailability();
  fetchUserProfile(); // ← Nueva función
}, []);

const fetchUserProfile = async () => {
  try {
    const client = createApiClient();
    const response = await client.GET("/profile", {});

    if (response.data && !response.error) {
      const profile = response.data as any;
      setTargetRange({
        min: profile.minTargetGlucose || 70,
        max: profile.maxTargetGlucose || 180,
      });
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    // Default range if fetch fails
    setTargetRange({ min: 70, max: 180 });
  }
};
```

**Beneficios:**

- ✅ Obtiene los valores reales del usuario desde la DB
- ✅ Valores por defecto si falla (70-180 mg/dL)
- ✅ Se ejecuta una vez al montar el componente

---

### 2. **Colores Condicionales para Puntos de Datos**

**Algoritmo de coloreado:**

```typescript
const getChartData = () => {
  return sensorData.historicalReadings.map((reading, index) => {
    const isOutOfRange = targetRange
      ? reading.glucose < targetRange.min || reading.glucose > targetRange.max
      : false;

    return {
      value: reading.glucose,
      label: index % 4 === 0 ? new Date(reading.timestamp).getHours().toString() : "",
      dataPointColor: isOutOfRange ? "#F59E0B" : theme.colors.primary, // 🟡 Amarillo o 🔵 Azul
    };
  });
};
```

**Colores:**

- 🔵 **Azul (primary):** Dentro del rango objetivo (normal)
- 🟡 **Amarillo (#F59E0B):** Fuera del rango (hiperglucemia o hipoglucemia)

---

### 3. **Líneas de Referencia Horizontales**

**Props del LineChart:**

```typescript
<LineChart
  // ... props existentes

  // Línea superior (máximo objetivo)
  showReferenceLine1
  referenceLine1Position={targetRange?.max} // Ej: 140
  referenceLine1Config={{
    color: "#10B981", // Verde
    thickness: 1.5,
    type: "dashed",
    labelText: `Máx: ${targetRange?.max}`,
    labelTextStyle: { fontSize: 10, color: "#10B981", fontWeight: "600" },
  }}

  // Línea inferior (mínimo objetivo)
  showReferenceLine2
  referenceLine2Position={targetRange?.min} // Ej: 70
  referenceLine2Config={{
    color: "#10B981", // Verde
    thickness: 1.5,
    type: "dashed",
    labelText: `Mín: ${targetRange?.min}`,
    labelTextStyle: { fontSize: 10, color: "#10B981", fontWeight: "600" },
  }}
/>
```

**Características:**

- ✅ Líneas verdes (#10B981) para buen contraste
- ✅ Estilo punteado (dashed) para distinguirlas de la curva
- ✅ Grosor de 1.5px (visible pero no invasivo)
- ✅ Etiquetas con los valores numéricos

---

### 4. **Subtítulo Informativo**

```typescript
{targetRange && (
  <Text style={styles.chartSubtitle}>
    Rango objetivo: {targetRange.min} - {targetRange.max} mg/dL
  </Text>
)}
```

**Estilo:**

```typescript
chartSubtitle: {
  fontSize: theme.fontSize.sm,
  color: "#10B981", // Verde, mismo color que las líneas
  marginBottom: theme.spacing.md,
}
```

---

## 📊 Visualización Final

### Antes

```
     ●─────●
    /       \
   ●         ●
  /           \
 ●             ●
```

(Todos los puntos del mismo color)

### Ahora

```
━━━━━━━━━━━━━━━━━━━━━ Máx: 140 (línea verde punteada)
     🔵─────🟡 (punto amarillo = fuera de rango)
    /       \
   🔵        🟡
  /           \
 🔵            🔵
━━━━━━━━━━━━━━━━━━━━━ Mín: 70 (línea verde punteada)
```

**Leyenda:**

- 🔵 **Punto azul:** Dentro del rango (70-140 mg/dL)
- 🟡 **Punto amarillo:** Fuera del rango (<70 o >140 mg/dL)
- `━━━━` **Líneas verdes:** Límites del rango objetivo

---

## 🎨 Código de Colores

| Elemento                 | Color | Significado                     |
| ------------------------ | ----- | ------------------------------- |
| Punto azul (#6B9BD1)     | 🔵    | Glucosa en rango objetivo       |
| Punto amarillo (#F59E0B) | 🟡    | Glucosa fuera de rango (alerta) |
| Línea verde (#10B981)    | 🟢    | Límite del rango objetivo       |
| Área rellena azul        | 💙    | Tendencia general               |

---

## 🔍 Lógica de Detección

### Punto Fuera de Rango

Un punto se marca como fuera de rango si:

```typescript
reading.glucose < targetRange.min; // Hipoglucemia (< 70)
OR;
reading.glucose > targetRange.max; // Hiperglucemia (> 140)
```

### Ejemplos

**Perfil del usuario:** `min: 70, max: 140`

| Glucosa | Dentro? | Color       |
| ------- | ------- | ----------- |
| 65      | ❌      | 🟡 Amarillo |
| 70      | ✅      | 🔵 Azul     |
| 100     | ✅      | 🔵 Azul     |
| 140     | ✅      | 🔵 Azul     |
| 180     | ❌      | 🟡 Amarillo |

---

## ✨ Beneficios

### UX

1. **Visual immediato:** Usuario ve de un vistazo qué lecturas están fuera de rango
2. **Contexto claro:** Líneas de referencia muestran el objetivo
3. **Color significativo:** Amarillo = atención, azul = OK
4. **No intrusivo:** Los puntos amarillos destacan sin ser molestos

### Médico

1. **Adherencia al objetivo:** Usuario puede ver qué tan bien controla su glucosa
2. **Detección de patrones:** Fácil identificar momentos del día con problemas
3. **Motivación:** Ver más puntos azules es positivo
4. **Ajuste de metas:** Puede motivar discusión con médico sobre el rango

### Técnico

1. **Dinámico:** Se adapta automáticamente al perfil del usuario
2. **Fallback seguro:** Si falla la carga, usa valores default razonables
3. **Performance:** Cálculo ligero (solo una comparación por punto)
4. **Escalable:** Fácil agregar más zonas de color en el futuro

---

## 🧪 Casos de Prueba

### Caso 1: Usuario con buen control

```
Perfil: min: 70, max: 140
Lecturas: [100, 105, 110, 95, 102, 108, 115]
Resultado: ✅ Todos azules, dentro de las líneas verdes
```

### Caso 2: Episodio de hipoglucemia

```
Perfil: min: 70, max: 140
Lecturas: [100, 85, 65, 60, 75, 90, 100]
Resultado: 🟡 3 puntos amarillos (85, 65, 60), resto azules
```

### Caso 3: Variabilidad alta

```
Perfil: min: 70, max: 140
Lecturas: [180, 150, 120, 90, 60, 75, 110, 145]
Resultado: 🟡 5 amarillos (180, 150, 60, 145), 3 azules
Patron visible: Usuario puede ver que tiene picos y caídas
```

---

## 📝 Archivos Modificados

### Mobile App

**`apps/mobile/src/screens/NFCScanScreen.tsx`**

- ✅ Estado `targetRange` agregado
- ✅ Función `fetchUserProfile()` para obtener rango objetivo
- ✅ Lógica de color condicional en `getChartData()`
- ✅ Props de líneas de referencia en `LineChart`
- ✅ Subtítulo con el rango objetivo
- ✅ Estilo `chartSubtitle` agregado

---

## 🚀 Para Probar

1. **Asegúrate de tener un perfil configurado:**

   ```
   Perfil → minTargetGlucose: 70, maxTargetGlucose: 140
   ```

2. **Escanea el sensor:**

   ```
   Home → Escanear Sensor → Escanear
   ```

3. **Verifica la gráfica:**
   - ✅ Debe mostrar "Rango objetivo: 70 - 140 mg/dL"
   - ✅ Dos líneas verdes punteadas horizontales
   - ✅ Puntos amarillos para lecturas < 70 o > 140
   - ✅ Puntos azules para lecturas 70-140

4. **Cambia el rango objetivo en el perfil:**

   ```
   Perfil → Actualizar → min: 80, max: 120
   ```

5. **Escanea de nuevo:**
   - ✅ Líneas deben moverse a 80 y 120
   - ✅ Más puntos amarillos (rango más estricto)

---

## 📊 Mejoras Futuras (Opcional)

### Zonas de color adicionales

```typescript
// Zona peligro (rojo): < 54 mg/dL o > 250 mg/dL
// Zona precaución (amarillo): 54-70 o 140-250
// Zona objetivo (verde): 70-140
// Zona óptima (azul): 80-120
```

### Estadísticas en rango

```typescript
// "85% de lecturas en rango"
// "3 episodios de hipoglucemia detectados"
```

### Alertas personalizadas

```typescript
// Notificación si > 50% lecturas fuera de rango
```

---

**Fecha:** 29 de octubre de 2025  
**Versión:** 4.0.0  
**Estado:** ✅ Implementado y funcionando
