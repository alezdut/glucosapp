# Guía de Material Design - Glucosapp Web

## Descripción General

Este proyecto utiliza **Material-UI (MUI) v7** como sistema de diseño principal para garantizar una interfaz de usuario consistente, accesible y profesional en toda la aplicación web.

## Dependencias

### Instaladas

```json
{
  "@mui/material": "^7.3.4",
  "@mui/icons-material": "^7.3.4",
  "@emotion/react": "^11.14.0",
  "@emotion/styled": "^11.14.1",
  "react-icons": "^5.5.0"
}
```

### Instalación

Si necesitas agregar MUI a un nuevo proyecto o workspace:

```bash
pnpm add @mui/material @emotion/react @emotion/styled @mui/icons-material
```

## Componentes Principales Utilizados

### 1. Formularios y Inputs

#### TextField

Reemplaza los `<input>` HTML estándar. Proporciona labels flotantes, validación visual y estados de error integrados.

```tsx
import { TextField } from "@mui/material";

<TextField
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  disabled={isLoading}
  placeholder="tu@email.com"
  fullWidth
  variant="outlined"
/>;
```

**Props importantes:**

- `label` - Etiqueta flotante
- `fullWidth` - Ocupa todo el ancho disponible
- `variant="outlined"` - Estilo con borde (recomendado)
- `helperText` - Texto de ayuda debajo del input
- `error` - Estado de error (booleano)
- `disabled` - Deshabilitar el campo

#### TextField con Password Toggle

```tsx
import { TextField, IconButton, InputAdornment } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

<TextField
  label="Contraseña"
  type={showPassword ? "text" : "password"}
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  required
  fullWidth
  variant="outlined"
  inputProps={{ minLength: 8 }}
  InputProps={{
    endAdornment: (
      <InputAdornment position="end">
        <IconButton
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
          onClick={() => setShowPassword(!showPassword)}
          edge="end"
        >
          {showPassword ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      </InputAdornment>
    ),
  }}
/>;
```

#### Componente PasswordField (Personalizado)

**⭐ RECOMENDADO**: Utiliza nuestro componente `PasswordField` reutilizable que incluye toggle de visibilidad y validación de fortaleza integrada.

**Ubicación**: `apps/web/src/components/PasswordField.tsx`  
**Utilidades**: `apps/web/src/utils/password-validation.ts`

```tsx
import { PasswordField } from "@/components/PasswordField";

// Campo de contraseña con indicador de fortaleza
<PasswordField
  label="Contraseña"
  value={password}
  onChange={setPassword}
  required
  disabled={isLoading}
  showStrengthIndicator
  helperText="Debe incluir mayúsculas, números y símbolos especiales"
  onStrengthChange={setPasswordStrength}
/>

// Campo de confirmación (sin indicador)
<PasswordField
  label="Confirmar Contraseña"
  value={confirmPassword}
  onChange={setConfirmPassword}
  required
  disabled={isLoading}
/>
```

**Props disponibles:**

- `label` - Etiqueta del campo (requerido)
- `value` - Valor actual (requerido)
- `onChange` - Handler para cambios: `(value: string) => void` (requerido)
- `disabled` - Deshabilitar el campo (opcional, default: false)
- `placeholder` - Texto placeholder (opcional, default: "••••••••")
- `required` - Campo requerido (opcional, default: false)
- `showStrengthIndicator` - Mostrar indicador de fortaleza (opcional, default: false)
- `helperText` - Texto de ayuda (opcional)
- `onStrengthChange` - Callback cuando cambia la fortaleza: `(strength: PasswordStrength) => void` (opcional)

**Validación de contraseñas:**

El componente utiliza `validatePassword()` de `@/utils/password-validation` que evalúa:

- ✅ **Fuerte (strong)**: 8+ caracteres + mayúsculas + números + símbolos especiales
- ⚠️ **Media (medium)**: 8+ caracteres + mayúsculas O números
- ❌ **Débil (weak)**: Menos de 8 caracteres o sin mayúsculas/números

**Uso consistente:**

- ✅ Usa `PasswordField` en formularios de registro y reseteo de contraseña
- ✅ Activa `showStrengthIndicator` en el campo principal, no en confirmación
- ✅ Valida que `passwordStrength === "strong"` antes de enviar el formulario

### 2. Botones

#### Button

Reemplaza `<button>` HTML. Proporciona variantes, tamaños y estados consistentes.

```tsx
import { Button } from "@mui/material";

<Button
  type="submit"
  variant="contained" // contained, outlined, text
  size="large" // small, medium, large
  disabled={isLoading}
  fullWidth
  sx={{ mt: 1, py: 1.5 }}
>
  {isLoading ? "Cargando..." : "Enviar"}
</Button>;
```

**Variantes:**

- `contained` - Botón sólido con color de fondo (primario para acciones principales)
- `outlined` - Botón con borde (secundario)
- `text` - Botón sin fondo (terciario)

### 3. Alertas y Mensajes

#### Alert

Reemplaza `<div className={styles.error}>`. Proporciona mensajes con severidad visual.

```tsx
import { Alert } from "@mui/material";

// Error
<Alert severity="error" sx={{ mb: 2 }}>
  {errorMessage}
</Alert>

// Éxito
<Alert severity="success" sx={{ mb: 2 }}>
  ¡Operación exitosa!
</Alert>

// Info
<Alert severity="info" sx={{ mb: 2 }}>
  Información importante
</Alert>

// Advertencia
<Alert severity="warning" sx={{ mb: 2 }}>
  Ten cuidado
</Alert>
```

### 4. Tipografía

#### Typography

Reemplaza `<h1>`, `<h2>`, `<p>`, etc. Proporciona escala tipográfica consistente.

```tsx
import { Typography } from "@mui/material";

<Typography
  variant="h4"
  component="h1"
  sx={{ mb: 3, textAlign: "center", fontWeight: 600 }}
>
  Título de la Página
</Typography>

<Typography variant="body1">
  Texto normal del cuerpo
</Typography>

<Typography variant="caption" sx={{ color: "#666" }}>
  Texto pequeño o ayuda
</Typography>
```

**Variantes comunes:**

- `h1` a `h6` - Títulos
- `body1`, `body2` - Texto del cuerpo
- `caption` - Texto pequeño
- `subtitle1`, `subtitle2` - Subtítulos

### 5. Layout

#### Box

Componente contenedor flexible, reemplaza `<div>` con capacidades de styling avanzadas.

```tsx
import { Box } from "@mui/material";

<Box
  component="form"
  onSubmit={handleSubmit}
  sx={{
    display: "flex",
    flexDirection: "column",
    gap: 2,
  }}
>
  {/* Contenido del formulario */}
</Box>;
```

### 6. Indicadores de Progreso

#### LinearProgress

Para barras de progreso (usado en indicador de fortaleza de contraseña).

```tsx
import { LinearProgress } from "@mui/material";

<LinearProgress
  variant="determinate"
  value={progressValue}
  sx={{
    height: 4,
    borderRadius: 2,
    backgroundColor: "#e0e0e0",
    "& .MuiLinearProgress-bar": {
      backgroundColor: color,
    },
  }}
/>;
```

#### CircularProgress

Para indicadores de carga.

```tsx
import { CircularProgress } from "@mui/material";

<Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
  <CircularProgress />
</Box>;
```

## Sistema de Iconos

### Material Icons (@mui/icons-material)

```tsx
import { Visibility, VisibilityOff, Email, Lock, Person, Check, Close } from "@mui/icons-material";

<Visibility />;
```

**Iconos comunes en el proyecto:**

- `Visibility` / `VisibilityOff` - Toggle de contraseña
- `Email` - Email
- `Lock` - Contraseña
- `Person` - Usuario

## Sistema de Spacing (sx prop)

MUI usa un sistema de spacing basado en múltiplos de 8px.

```tsx
sx={{
  m: 2,    // margin: 16px (2 * 8)
  mt: 1,   // margin-top: 8px
  mb: 3,   // margin-bottom: 24px
  p: 2,    // padding: 16px
  py: 1.5, // padding-top y padding-bottom: 12px
  gap: 2,  // gap: 16px (en flex/grid)
}}
```

**Valores comunes:**

- `0.5` = 4px
- `1` = 8px
- `1.5` = 12px
- `2` = 16px
- `3` = 24px
- `4` = 32px

## Paleta de Colores

### Colores del Theme (por defecto)

```tsx
// Primary (azul)
color: "#1976d2";

// Error (rojo)
color: "#d32f2f";

// Success (verde)
color: "#2e7d32";

// Warning (amarillo/naranja)
color: "#ed6c02";

// Info (azul claro)
color: "#0288d1";
```

### Colores Personalizados (fortaleza de contraseña)

```tsx
// Débil
color: "#ef4444"; // Rojo

// Media
color: "#eab308"; // Amarillo

// Fuerte
color: "#22c55e"; // Verde
```

## Páginas Implementadas con MUI

### ✅ Páginas Completamente Actualizadas

1. **Login** (`/login`)
   - TextField para email y contraseña
   - Toggle de visibilidad de contraseña
   - Alert para errores
   - Button para submit

2. **Register** (`/register`)
   - 4 TextFields (firstName, lastName, email, password, confirmPassword)
   - Toggle de visibilidad en ambas contraseñas
   - LinearProgress para indicador de fortaleza
   - Typography para mensajes de ayuda
   - Alert para errores/éxito

3. **Forgot Password** (`/forgot-password`)
   - TextField para email
   - Alert info para instrucciones
   - Alert success/error para estados

4. **Reset Password** (`/reset-password`)
   - 2 TextFields con toggle de visibilidad
   - Alert para estados
   - CircularProgress en suspense fallback

5. **Verify Email** (`/verify-email`)
   - Solo mensajes (ya usa estilos CSS)

### 🔄 Páginas que Pueden Mejorarse (Opcionales)

1. **Dashboard** (`/dashboard`)
   - Podría usar `Card` de MUI en lugar de div
   - Typography para títulos y contenido
   - Button para logout

2. **Home** (`/page.tsx`)
   - CircularProgress para loading state

## Patrones Comunes

### Formulario Completo con Validación

```tsx
import { TextField, Button, Box, Typography, Alert } from "@mui/material";

export default function FormPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Tu lógica aquí
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 400, mx: "auto", p: 3 }}>
      <Typography variant="h4" sx={{ mb: 3, textAlign: "center" }}>
        Título
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          fullWidth
          variant="outlined"
        />

        <Button type="submit" variant="contained" size="large" disabled={isLoading} fullWidth>
          {isLoading ? "Cargando..." : "Enviar"}
        </Button>
      </Box>
    </Box>
  );
}
```

## Mejores Prácticas

### 1. Consistencia

- **Siempre** usa `variant="outlined"` para TextField
- **Siempre** usa `variant="contained"` para botones primarios
- **Siempre** usa `fullWidth` en campos de formulario

### 2. Accesibilidad

- Usa `aria-label` en IconButtons
- Usa `component` prop en Typography para HTML semántico correcto
- Usa `required` en campos obligatorios

### 3. Responsividad

- Usa `fullWidth` en componentes de formulario
- Usa el sistema de spacing (sx) en lugar de CSS custom
- Aprovecha los breakpoints de MUI cuando sea necesario

### 4. Performance

- Importa solo los componentes que necesitas
- No importes todo MUI: `import { Button } from "@mui/material"`
- Los iconos ya están tree-shakeable por defecto

### 5. Styling

- Prefiere `sx` prop sobre `style` inline
- Usa el sistema de spacing de MUI (múltiplos de 8)
- Mantén colores consistentes con el theme

## Recursos Adicionales

- [Documentación oficial de MUI](https://mui.com/material-ui/getting-started/)
- [Componentes de MUI](https://mui.com/material-ui/all-components/)
- [Sistema de diseño de Material Design](https://m3.material.io/)
- [Iconos de Material Design](https://mui.com/material-ui/material-icons/)

## Ejemplo de Migración

### Antes (HTML + CSS)

```tsx
<div className={styles.formGroup}>
  <label htmlFor="email" className={styles.label}>
    Email
  </label>
  <input
    id="email"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    className={styles.input}
    required
  />
</div>
```

### Después (Material-UI)

```tsx
<TextField
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  fullWidth
  variant="outlined"
/>
```

## Notas Importantes

1. **No elimines** `auth-form.module.css` todavía - se usa para containers y cards
2. **Mantén** Next.js Link components para navegación (no uses Button con href)
3. **Prueba** siempre en diferentes tamaños de pantalla
4. **Verifica** que el build pase antes de hacer commit

## Actualizado

- **Fecha**: 16 de Octubre, 2025
- **Versión MUI**: 7.3.4
- **Páginas migradas**: 5/8
- **Estado**: ✅ Completado para autenticación
