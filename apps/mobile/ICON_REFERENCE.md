# Icon Reference Guide - GlucosApp

Esta guía documenta todos los iconos utilizados en la aplicación móvil de GlucosApp. Todos los iconos provienen de la biblioteca **Lucide React Native** para mantener consistencia y profesionalismo.

## 🎨 Biblioteca de Iconos

**Lucide React Native** - v0.544.0

- Consistente y moderna
- Más de 1000+ iconos
- Optimizada para React Native
- Documentación: https://lucide.dev

---

## 📱 Iconos por Sección

### Navegación Principal

| Icono           | Nombre         | Uso                           | Pantalla      |
| --------------- | -------------- | ----------------------------- | ------------- |
| `Home`          | Home           | Botón de navegación principal | Tab Navigator |
| `ClipboardList` | Clipboard List | Historial de registros        | Tab Navigator |
| `Edit`          | Edit           | Registrar nuevos datos        | Tab Navigator |
| `Stethoscope`   | Stethoscope    | Sección médico                | Tab Navigator |
| `User`          | User           | Perfil de usuario             | Tab Navigator |

### Tipos de Comida / Meal Types

| Icono      | Nombre   | Uso                     | Color   |
| ---------- | -------- | ----------------------- | ------- |
| `Coffee`   | Coffee   | Desayuno (BREAKFAST)    | Primary |
| `Sun`      | Sun      | Almuerzo (LUNCH)        | Primary |
| `Moon`     | Moon     | Cena (DINNER)           | Primary |
| `Apple`    | Apple    | Snack (SNACK)           | Primary |
| `Clock`    | Clock    | Corrección (CORRECTION) | Primary |
| `Activity` | Activity | Registro genérico       | Primary |

**Ubicación:** HistoryListItem.tsx, RegistrarScreen.tsx

### Indicadores de Datos

| Icono             | Nombre           | Uso                      | Color                 |
| ----------------- | ---------------- | ------------------------ | --------------------- |
| `Activity`        | Activity         | Glucosa/Actividad        | Primary               |
| `Droplet`         | Droplet          | Alternativa para glucosa | Primary               |
| `Beaker`          | Beaker           | Dosis de insulina        | Background (en cards) |
| `UtensilsCrossed` | Utensils Crossed | Comidas registradas      | Background (en cards) |
| `Syringe`         | Syringe          | Insulina/Inyección       | Primary               |

**Ubicación:** HomeScreen.tsx, HistoryListItem.tsx

### Acciones de Usuario

| Icono         | Nombre       | Uso                            | Color                   |
| ------------- | ------------ | ------------------------------ | ----------------------- |
| `Calculator`  | Calculator   | Calcular carbohidratos         | Primary                 |
| `Download`    | Download     | Exportar CSV                   | Primary                 |
| `Share2`      | Share 2      | Compartir archivo              | Primary                 |
| `Calendar`    | Calendar     | Selector de fecha              | Primary                 |
| `ChevronDown` | Chevron Down | Expandir contenido             | Text Secondary          |
| `ChevronUp`   | Chevron Up   | Colapsar contenido             | Text Secondary          |
| `Edit3`       | Edit 3       | Edición personalizada / manual | Primary / Warning       |
| `Check`       | Check        | Confirmar selección            | Background (on primary) |
| `X`           | X            | Cancelar / Cerrar              | Text                    |

**Ubicación:** RegistrarScreen.tsx, HistoryScreen.tsx, DateRangePicker.tsx, DateRangeCalendar.tsx

### Estados Vacíos / Empty States

| Icono      | Nombre    | Uso                        | Tamaño | Color          |
| ---------- | --------- | -------------------------- | ------ | -------------- |
| `FileText` | File Text | Sin registros en historial | 64px   | Text Secondary |

**Ubicación:** HistoryScreen.tsx

### Contexto / Context Factors

Iconos utilizados en la sección "Contexto Adicional" de RegistrarScreen:

| Icono         | Nombre      | Contexto                  | Color (Activo/Inactivo) |
| ------------- | ----------- | ------------------------- | ----------------------- |
| `Activity`    | Activity    | Ejercicio reciente (~4hs) | Background / Text       |
| `Wine`        | Wine        | Consumo de alcohol        | Background / Text       |
| `Thermometer` | Thermometer | Enfermedad                | Background / Text       |
| `Frown`       | Frown       | Estrés alto               | Background / Text       |
| `Droplets`    | Droplets    | Menstruación              | Background / Text       |
| `CookingPot`  | Cooking Pot | Comida alta en grasa      | Background / Text       |

**Ubicación:** RegistrarScreen.tsx (Context checkboxes)

### Identificador Visual / Branding

| Icono     | Nombre  | Uso            | Tamaño | Color   |
| --------- | ------- | -------------- | ------ | ------- |
| `Hexagon` | Hexagon | Logo de la app | 36px   | Primary |

**Ubicación:** HomeScreen.tsx

---

## 🎨 Paleta de Colores para Iconos

### Colores del Tema

```typescript
// Importar desde theme
import { theme } from "../theme";

// Colores disponibles
theme.colors.primary; // Azul primario
theme.colors.background; // Blanco/fondo
theme.colors.text; // Texto principal
theme.colors.textSecondary; // Texto secundario
theme.colors.success; // Verde (glucosa normal)
theme.colors.warning; // Amarillo/Naranja (alertas)
theme.colors.error; // Rojo (errores/glucosa baja)
```

### Uso de Colores por Contexto

| Contexto                | Color           | Ejemplo                  |
| ----------------------- | --------------- | ------------------------ |
| Iconos principales      | `primary`       | Navegación, acciones     |
| Iconos en cards activos | `background`    | Estadísticas principales |
| Iconos informativos     | `textSecondary` | Estados vacíos           |
| Iconos de alerta        | `warning`       | Ediciones manuales       |
| Iconos de error         | `error`         | Validaciones fallidas    |

---

## 📦 Tamaños Estándar

| Contexto                   | Tamaño (px) | Uso                     |
| -------------------------- | ----------- | ----------------------- |
| Navegación principal       | 24          | Tab bar icons           |
| Iconos de tarjetas (cards) | 32          | HomeScreen stats        |
| Iconos de listado          | 24          | HistoryListItem headers |
| Iconos de botones          | 18-20       | Action buttons          |
| Iconos de contexto         | 18          | Context checkboxes      |
| Estados vacíos             | 64          | Empty states            |
| Logo de app                | 36          | HomeScreen header       |
| Mini iconos                | 14-16       | Inline indicators       |

---

## 💡 Mejores Prácticas

### 1. Importación

```typescript
// ✅ Correcto - Importa solo lo que necesitas
import { Activity, Calculator, Download } from "lucide-react-native";

// ❌ Incorrecto - No importes todo
import * as LucideIcons from "lucide-react-native";
```

### 2. Uso Consistente

```typescript
// ✅ Correcto - Usa props consistentes
<Activity size={24} color={theme.colors.primary} />

// ❌ Incorrecto - Estilos inline mezclados
<Activity size={24} style={{ color: "#FF0000" }} />
```

### 3. Contenedores de Iconos

Para iconos grandes o destacados, usa contenedores:

```typescript
<View style={styles.iconContainer}>
  <Coffee size={24} color={theme.colors.primary} />
</View>

// Styles
iconContainer: {
  width: 40,
  height: 40,
  borderRadius: theme.borderRadius.md,
  backgroundColor: theme.colors.primary + "15",
  alignItems: "center",
  justifyContent: "center",
}
```

### 4. Iconos con Texto

Cuando combines iconos con texto:

```typescript
<View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
  <Download size={18} color={theme.colors.primary} />
  <Text style={styles.buttonText}>Exportar</Text>
</View>
```

---

## 🔄 Reemplazos de Emojis

### Tabla de Conversión

Emojis previamente usados y sus reemplazos con iconos:

| Emoji | Icono Lucide      | Contexto             |
| ----- | ----------------- | -------------------- |
| 🌅    | `Coffee`          | Desayuno             |
| ☀️    | `Sun`             | Almuerzo             |
| 🌙    | `Moon`            | Cena                 |
| 🍎    | `Apple`           | Snack                |
| ⏰    | `Clock`           | Corrección/Ayuno     |
| 🍽️    | `UtensilsCrossed` | Comida               |
| ✏️    | `Edit3`           | Editar               |
| 📊    | `Activity`        | Actividad/Registro   |
| 🏃‍♂️    | `Activity`        | Ejercicio            |
| 🍷    | `Wine`            | Alcohol              |
| 🤒    | `Thermometer`     | Enfermedad           |
| 😰    | `Frown`           | Estrés               |
| 🩸    | `Droplets`        | Menstruación         |
| 🥓    | `CookingPot`      | Comida alta en grasa |
| ✱     | `Hexagon`         | Logo de app          |

---

## 🆕 Agregar Nuevos Iconos

### Paso 1: Buscar el Icono

Visita https://lucide.dev y busca el icono que necesitas.

### Paso 2: Importar

```typescript
import { NewIconName } from "lucide-react-native";
```

### Paso 3: Usar con Tema

```typescript
<NewIconName
  size={24}
  color={theme.colors.primary}
  strokeWidth={2} // Opcional, default es 2
/>
```

### Paso 4: Documentar

Actualiza este documento con el nuevo icono para mantener la consistencia.

---

## 📋 Checklist de Implementación

Cuando agregues un nuevo icono a la app:

- [ ] Verificar que el icono existe en Lucide
- [ ] Importar solo el icono necesario
- [ ] Usar colores del tema (no hardcoded)
- [ ] Aplicar tamaño consistente según contexto
- [ ] Usar contenedor si es necesario
- [ ] Documentar en este archivo
- [ ] Verificar que se ve bien en iOS y Android
- [ ] Confirmar que el icono es semánticamente correcto

---

## 🎯 Razones para Usar Iconos sobre Emojis

1. **Consistencia**: Los emojis se ven diferentes en iOS vs Android
2. **Profesionalismo**: Los iconos SVG son más formales
3. **Control**: Podemos controlar color, tamaño, y stroke
4. **Rendimiento**: Optimizados para React Native
5. **Accesibilidad**: Mejor soporte para lectores de pantalla
6. **Personalización**: Podemos aplicar el tema de la app

---

**Última actualización:** Octubre 2025
**Versión de Lucide:** 0.544.0
**Mantenedor:** Equipo GlucosApp
