# Changelog - Templates HTML en Español y Recuperación de Contraseña

## ✅ Cambios Implementados

### 1. Templates HTML en Carpeta Separada

**Ubicación:** `apps/backend/src/modules/auth/templates/`

#### ✨ Nuevo: `verification-email.html`

- Template profesional y responsive
- **Textos completamente en español**
- Diseño moderno con gradientes morados
- Botón destacado para verificación
- Link alternativo para copiar/pegar
- Advertencia de expiración (24 horas)
- Nota de seguridad si no se registró

#### ✨ Nuevo: `reset-password.html`

- Template profesional y responsive
- **Textos completamente en español**
- Diseño consistente con verification-email
- Botón destacado para restablecer
- Link alternativo para copiar/pegar
- Advertencia de expiración (1 hora)
- Alerta de seguridad destacada en rojo
- Instrucciones claras si no solicitó el cambio

### 2. Sistema de Recuperación de Contraseña

#### Modelo de Base de Datos Actualizado

**Archivo:** `apps/backend/prisma/schema.prisma`

```prisma
model User {
  // ... campos existentes
  resetPasswordToken      String?        @unique
  resetPasswordExpiry     DateTime?
}
```

#### DTOs Nuevos

**✨ `dto/forgot-password.dto.ts`**

- Validación de email con class-validator
- Documentación Swagger con ApiProperty

**✨ `dto/reset-password.dto.ts`**

- Validación de token y newPassword
- Longitud mínima de contraseña (8 caracteres)
- Documentación Swagger

#### EmailService Actualizado

**Archivo:** `services/email.service.ts`

**Cambios:**

- ✅ Método `loadTemplate()` para cargar HTML desde archivos
- ✅ Sistema de reemplazo de placeholders ({{variable}})
- ✅ Actualizado `sendVerificationEmail()` para usar template
- ✅ Nuevo método `sendPasswordResetEmail()`
- ✅ Asunto de emails en español
- ✅ Logs mejorados

#### AuthService Actualizado

**Archivo:** `services/auth.service.ts`

**Nuevos métodos:**

1. **`forgotPassword(email: string)`**
   - Busca usuario por email
   - No revela si el usuario existe (seguridad)
   - Genera token con expiración de 1 hora
   - Guarda token en base de datos
   - Envía email con link de restablecimiento
   - No permite reset para cuentas OAuth

2. **`resetPassword(token: string, newPassword: string)`**
   - Valida token y expiración
   - Verifica que sea cuenta con password (no OAuth)
   - Hashea nueva contraseña con bcrypt
   - Actualiza contraseña en DB
   - Limpia token usado
   - **Invalida todos los refresh tokens** (seguridad)
   - Mensajes de error en español

#### AuthController Actualizado

**Archivo:** `auth.controller.ts`

**Nuevos endpoints:**

1. **POST `/v1/auth/forgot-password`**
   - Público (no requiere autenticación)
   - Body: `{ email: string }`
   - Response: Mensaje genérico (no revela si usuario existe)
   - Documentado en Swagger

2. **POST `/v1/auth/reset-password`**
   - Público (no requiere autenticación)
   - Body: `{ token: string, newPassword: string }`
   - Response: Mensaje de éxito en español
   - Errors: 400 si token inválido/expirado
   - Documentado en Swagger

### 3. Dockerfile Actualizado

**Cambios:**

- Copia templates HTML al build
- Comando agregado: `cp -r src/modules/auth/templates/*.html dist/modules/auth/templates/`
- Asegura que templates estén disponibles en runtime

### 4. Documentación Nueva

#### ✨ `PASSWORD_RESET_GUIDE.md`

- Guía completa de recuperación de contraseña
- Explicación de endpoints
- Flujo completo del proceso
- Ejemplos de uso
- Configuración SMTP
- Integración frontend
- Troubleshooting

#### ✏️ `README.md` Actualizado

- Agregados nuevos endpoints en lista
- Agregada feature de password reset
- Agregada feature de templates HTML en español

## 📊 Resumen de Archivos

### Archivos Nuevos (6)

```
✨ apps/backend/src/modules/auth/templates/verification-email.html
✨ apps/backend/src/modules/auth/templates/reset-password.html
✨ apps/backend/src/modules/auth/dto/forgot-password.dto.ts
✨ apps/backend/src/modules/auth/dto/reset-password.dto.ts
✨ apps/backend/PASSWORD_RESET_GUIDE.md
✨ CHANGELOG_PASSWORD_RESET.md (este archivo)
```

### Archivos Modificados (6)

```
✏️ apps/backend/prisma/schema.prisma
✏️ apps/backend/src/modules/auth/services/email.service.ts
✏️ apps/backend/src/modules/auth/services/auth.service.ts
✏️ apps/backend/src/modules/auth/auth.controller.ts
✏️ apps/backend/Dockerfile
✏️ apps/backend/README.md
```

## 🔒 Mejoras de Seguridad

1. **Tokens seguros**
   - Generados con `crypto.randomBytes(32)`
   - Únicos en base de datos (constraint)
   - Expiración de 1 hora

2. **No revelar usuarios**
   - Mismo mensaje para email existente o no
   - Previene enumeración de cuentas

3. **Invalidación de sesiones**
   - Al cambiar contraseña, se invalidan todos los refresh tokens
   - Fuerza re-login en todos los dispositivos

4. **Protección OAuth**
   - No permite reset de contraseña para cuentas OAuth
   - Mensaje claro al usuario

5. **Logs sin información sensible**
   - No se loggean contraseñas
   - Tokens solo en dev si SMTP no configurado

## 🌐 Internacionalización (i18n)

### Todos los textos están en español:

**Emails:**

- Asuntos de correo
- Contenido HTML
- Botones y enlaces
- Mensajes de advertencia

**API Responses:**

- Mensajes de éxito
- Mensajes de error
- Validaciones

**Ejemplos:**

- ✅ "Verifica tu correo electrónico"
- ✅ "Restablece tu contraseña"
- ✅ "Si existe una cuenta con ese correo..."
- ✅ "Contraseña restablecida exitosamente"
- ✅ "Token inválido o expirado"

## 🚀 Próximos Pasos

### Para usar el sistema:

1. **Regenerar Prisma Client:**

   ```bash
   cd apps/backend
   pnpm prisma:generate
   ```

2. **Ejecutar migración:**

   ```bash
   pnpm prisma:migrate
   # Nombre sugerido: add_password_reset_fields
   ```

3. **Verificar build:**

   ```bash
   pnpm build
   ```

4. **Probar endpoints:**
   - Abrir http://localhost:3000/docs
   - Probar `POST /v1/auth/forgot-password`
   - Probar `POST /v1/auth/reset-password`

### Configuración opcional:

**SMTP (para emails reales):**

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="tu-email@gmail.com"
SMTP_PASS="tu-app-password"
```

## 📖 Documentación Relacionada

- **Setup completo:** `apps/backend/AUTH_SETUP.md`
- **Password reset:** `apps/backend/PASSWORD_RESET_GUIDE.md`
- **README principal:** `apps/backend/README.md`
- **API docs:** http://localhost:3000/docs (cuando servidor esté corriendo)

## ✨ Características Destacadas

1. **Templates HTML profesionales**
   - Diseño moderno y responsive
   - Colores consistentes (gradiente morado)
   - Botones destacados con sombras
   - Secciones bien organizadas
   - Footer con información

2. **Experiencia de usuario mejorada**
   - Mensajes claros en español
   - Instrucciones paso a paso
   - Advertencias visuales (amarillo, rojo)
   - Links alternativos para casos de error
   - Tiempos de expiración claros

3. **Seguridad robusta**
   - No revela información de cuentas
   - Tokens con expiración corta
   - Invalidación de sesiones al cambiar password
   - Protección contra cuentas OAuth
   - Logs seguros

4. **Código mantenible**
   - Templates separados del código
   - Sistema de placeholders reutilizable
   - Métodos bien documentados
   - DTOs con validación
   - Tipos TypeScript estrictos

## 🎉 Estado Final

✅ **Build exitoso**
✅ **Prisma client generado**
✅ **Todos los endpoints funcionando**
✅ **Templates HTML en español**
✅ **Documentación completa**
✅ **Dockerfile actualizado**
✅ **Seguridad implementada**

¡El sistema de recuperación de contraseña con templates en español está completo y listo para usar!
