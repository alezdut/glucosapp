# Guía de Recuperación de Contraseña

## Funcionalidad Implementada

Se ha agregado un sistema completo de recuperación de contraseña con las siguientes características:

### ✅ Características

1. **Solicitud de restablecimiento**
   - Endpoint público para solicitar reset
   - Token único y seguro (crypto.randomBytes)
   - Expiración de 1 hora
   - No revela si el usuario existe (seguridad)

2. **Email en español**
   - Template HTML profesional y responsive
   - Botón destacado para restablecer
   - Link alternativo para copiar/pegar
   - Advertencias de seguridad
   - Instrucciones claras

3. **Restablecimiento seguro**
   - Validación de token
   - Verificación de expiración
   - Hash de nueva contraseña con bcrypt
   - Invalidación de todos los refresh tokens existentes
   - No permite reset para cuentas OAuth

## Endpoints

### 1. Solicitar Restablecimiento

```http
POST /v1/auth/forgot-password
Content-Type: application/json

{
  "email": "usuario@ejemplo.com"
}
```

**Respuesta:**

```json
{
  "message": "Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña."
}
```

**Notas de seguridad:**

- Siempre retorna el mismo mensaje, exista o no el usuario
- No permite reset para cuentas OAuth (Google)
- Genera token de 1 hora de validez

### 2. Restablecer Contraseña

```http
POST /v1/auth/reset-password
Content-Type: application/json

{
  "token": "abc123def456...",
  "newPassword": "NuevaContraseñaSegura123!"
}
```

**Respuesta exitosa:**

```json
{
  "message": "Contraseña restablecida exitosamente. Ahora puedes iniciar sesión."
}
```

**Errores posibles:**

- `400` - Token inválido o expirado
- `400` - Cuenta OAuth (no se puede restablecer)

## Flujo Completo

1. **Usuario olvida contraseña**
   - Va a la página de login
   - Click en "¿Olvidaste tu contraseña?"

2. **Solicita restablecimiento**
   - Frontend: `POST /v1/auth/forgot-password` con email
   - Backend: Genera token y envía email
   - Usuario recibe email con link

3. **Usuario hace click en link**
   - Link: `{FRONTEND_URL}/reset-password?token={TOKEN}`
   - Frontend muestra formulario de nueva contraseña

4. **Usuario ingresa nueva contraseña**
   - Frontend: `POST /v1/auth/reset-password` con token y newPassword
   - Backend: Valida token, actualiza contraseña, invalida sesiones
   - Usuario puede iniciar sesión con nueva contraseña

## Modelos de Base de Datos

### User (actualizado)

```prisma
model User {
  // ... campos existentes
  resetPasswordToken      String?        @unique
  resetPasswordExpiry     DateTime?
}
```

## Templates de Email

Los templates HTML están en: `src/modules/auth/templates/`

### verification-email.html

- Email de verificación de cuenta
- Textos en español
- Diseño moderno con gradientes
- Responsive

### reset-password.html

- Email de recuperación de contraseña
- Textos en español
- Avisos de seguridad destacados
- Responsive

### Personalización de Templates

Los templates usan placeholders que se reemplazan dinámicamente:

**verification-email.html:**

- `{{verificationUrl}}` - Link de verificación

**reset-password.html:**

- `{{resetUrl}}` - Link de restablecimiento

Para modificar los templates, edita los archivos HTML directamente. Los cambios se reflejarán automáticamente.

## Seguridad

### Mejores Prácticas Implementadas

1. **Tokens seguros**
   - Generados con `crypto.randomBytes(32)`
   - Únicos en base de datos
   - Expiración de 1 hora

2. **No revelar información**
   - Mismo mensaje para email existente o no
   - Previene enumeración de usuarios

3. **Invalidación de sesiones**
   - Al cambiar contraseña, se invalidan todos los refresh tokens
   - Fuerza re-login en todos los dispositivos

4. **Validación robusta**
   - Verifica existencia del usuario
   - Verifica expiración del token
   - Verifica que no sea cuenta OAuth
   - Valida longitud mínima de contraseña (8 caracteres)

5. **Logs de seguridad**
   - Registra intentos de envío de emails
   - Registra errores sin exponer información sensible

## Testing con Swagger

1. **Abrir Swagger**: http://localhost:3000/docs

2. **Probar forgot-password**:

   ```json
   POST /v1/auth/forgot-password
   {
     "email": "test@example.com"
   }
   ```

3. **Ver token en logs** (si SMTP no configurado):
   - Buscar en consola del servidor
   - Ejemplo: `Password reset email to test@example.com. Reset token: abc123...`

4. **Probar reset-password**:

   ```json
   POST /v1/auth/reset-password
   {
     "token": "abc123...",
     "newPassword": "NuevaPass123!"
   }
   ```

5. **Verificar que funcionó**:
   - Intentar login con contraseña antigua (debe fallar)
   - Intentar login con nueva contraseña (debe funcionar)

## Configuración de Email

Para que los emails se envíen realmente, configura SMTP en `.env`:

```env
# Gmail
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-email@gmail.com"
SMTP_PASS="tu-app-password"

# Outlook
SMTP_HOST="smtp-mail.outlook.com"
SMTP_PORT="587"
SMTP_USER="tu-email@outlook.com"
SMTP_PASS="tu-password"

# SendGrid
SMTP_HOST="smtp.sendgrid.net"
SMTP_PORT="587"
SMTP_USER="apikey"
SMTP_PASS="tu-sendgrid-api-key"
```

## Frontend Integration

### Página de "Olvidé mi contraseña"

```typescript
// forgot-password.tsx
const handleSubmit = async (email: string) => {
  const response = await fetch("/v1/auth/forgot-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  const data = await response.json();
  // Mostrar: data.message
};
```

### Página de "Restablecer contraseña"

```typescript
// reset-password.tsx
const token = new URLSearchParams(window.location.search).get("token");

const handleSubmit = async (newPassword: string) => {
  const response = await fetch("/v1/auth/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });

  if (response.ok) {
    const data = await response.json();
    // Mostrar: data.message
    // Redirigir a login
  } else {
    // Mostrar error
  }
};
```

## Migración de Base de Datos

Después de actualizar el código, ejecuta:

```bash
cd apps/backend
pnpm prisma:generate
pnpm prisma:migrate
```

Nombre de migración sugerido: `add_password_reset_fields`

Esto agregará los campos `resetPasswordToken` y `resetPasswordExpiry` a la tabla User.

## Límites y Consideraciones

### Implementado ✅

- Token único y seguro
- Expiración de 1 hora
- Emails en español
- Templates HTML responsive
- Invalidación de sesiones
- Protección contra enumeración

### Mejoras Futuras (Opcionales)

- Rate limiting (prevenir spam de emails)
- Historial de cambios de contraseña
- Notificación de cambio de contraseña exitoso
- Opción de "cerrar todas las sesiones excepto esta"
- 2FA antes de permitir reset
- Pregunta de seguridad adicional

## Troubleshooting

**Email no llega:**

- Verificar configuración SMTP en `.env`
- Revisar logs del servidor
- Verificar carpeta de spam

**Token expirado:**

- El token expira en 1 hora
- Solicitar nuevo token con forgot-password

**Cuenta OAuth:**

- Las cuentas que solo usan Google OAuth no tienen contraseña
- No se puede restablecer contraseña para estas cuentas
- Usuario debe seguir usando Google OAuth

**Error "Token inválido":**

- Token ya fue usado
- Token expiró
- Token no existe
- Solicitar nuevo token

## Resumen de Archivos Modificados/Creados

```
✨ Nuevos:
- src/modules/auth/templates/verification-email.html
- src/modules/auth/templates/reset-password.html
- src/modules/auth/dto/forgot-password.dto.ts
- src/modules/auth/dto/reset-password.dto.ts
- PASSWORD_RESET_GUIDE.md (este archivo)

✏️ Modificados:
- prisma/schema.prisma (campos resetPasswordToken, resetPasswordExpiry)
- src/modules/auth/services/email.service.ts (métodos de templates y reset)
- src/modules/auth/services/auth.service.ts (métodos forgotPassword, resetPassword)
- src/modules/auth/auth.controller.ts (endpoints forgot-password, reset-password)
- Dockerfile (copia templates al build)
```

¡El sistema de recuperación de contraseña está listo para usar! 🎉
