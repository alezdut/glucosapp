# Configuración de ngrok para desarrollo móvil

Este documento explica cómo usar ngrok para desarrollo móvil, evitando problemas con Google OAuth cuando cambias de red WiFi.

## ¿Por qué usar ngrok?

Google OAuth requiere que las URLs de callback estén registradas específicamente. Cuando usas IPs privadas (como `192.168.0.250`), cada vez que cambias de red WiFi, necesitas:

1. Actualizar tu IP en los archivos `.env`
2. Actualizar Google Cloud Console con la nueva IP

Con ngrok, obtienes una URL pública que funciona desde cualquier red.

## Setup inicial (solo una vez)

### 1. Verifica que ngrok esté instalado

```bash
which ngrok
```

Si no está instalado:

```bash
brew install ngrok
```

### 2. (Opcional) Crea una cuenta gratuita en ngrok

Visita https://ngrok.com y crea una cuenta gratuita. Esto te permite:

- Sesiones más largas
- URLs personalizadas (con plan de pago)

Luego autentica:

```bash
ngrok config add-authtoken TU_TOKEN_AQUI
```

## Uso diario (Simplificado) 🚀

### 1. Inicia todo con un solo comando

En el directorio del proyecto:

```bash
./start-dev-ngrok.sh
```

Este script automáticamente:

- ✅ Inicia ngrok en segundo plano
- ✅ Obtiene la URL pública
- ✅ Actualiza `apps/backend/.env`
- ✅ Actualiza `apps/mobile/.env`
- ✅ Hace backup de los archivos originales
- ✅ Te muestra la URL para Google Cloud Console

### 2. Actualiza Google Cloud Console

El script te mostrará la URL que debes agregar. Ve a:

👉 https://console.cloud.google.com/apis/credentials

1. Busca tu **OAuth 2.0 Client ID**: `769246936589-8hue03g3n8m4jcf70fpk5ibkik08u4n2`
2. Haz clic en editar ✏️
3. En **"URIs de redireccionamiento autorizados"**, agrega:
   ```
   https://TU-URL-NGROK.ngrok-free.app/v1/auth/google/mobile/callback
   ```
4. Guarda los cambios

### 3. Reinicia el backend (en otra terminal)

```bash
cd apps/backend
pnpm dev
```

### 4. Reinicia la app móvil (en otra terminal)

```bash
cd apps/mobile
pnpm dev
```

### 5. Cuando termines de desarrollar

```bash
./stop-dev-ngrok.sh
```

Este script:

- Detiene ngrok
- Te pregunta si quieres restaurar las IPs locales en los `.env`

## Notas importantes

### ⚠️ URL cambia cada vez (cuenta gratuita)

Con la cuenta gratuita de ngrok, cada vez que reinicias ngrok, obtienes una URL diferente. Esto significa que necesitarás:

1. Ejecutar `./update-ngrok-url.sh`
2. Actualizar Google Cloud Console con la nueva URL
3. Reiniciar backend y app móvil

### 💡 Solución permanente

Para una URL fija que no cambie:

- **Opción 1**: Usa ngrok con plan de pago (~$8/mes) para obtener un dominio estático
- **Opción 2**: Despliega el backend en un servidor (Heroku, Railway, Vercel, etc.)

### 🔧 Troubleshooting

**"No se pudo obtener la URL de ngrok"**

- Asegúrate de que `./start-ngrok.sh` esté corriendo en otra terminal
- Espera unos segundos después de iniciar ngrok antes de ejecutar el script de actualización

**"Address already in use"**

- Ya hay otro proceso usando el puerto 3000
- Encuentra y mata el proceso: `lsof -ti:3000 | xargs kill -9`

**La app móvil no puede conectar**

- Verifica que el backend esté corriendo
- Verifica que la URL en `apps/mobile/.env` sea correcta
- Abre la URL de ngrok en un navegador para confirmar que funciona

## Archivos modificados

Los siguientes archivos se modifican automáticamente:

- `apps/backend/.env` → `GOOGLE_MOBILE_CALLBACK_URL`
- `apps/mobile/.env` → `EXPO_PUBLIC_API_BASE_URL`

Los backups se guardan como `.env.backup` en caso de que necesites revertir.

## Revertir a IP local

Si quieres volver a usar tu IP local en vez de ngrok:

```bash
# Restaurar backups
cp apps/backend/.env.backup apps/backend/.env
cp apps/mobile/.env.backup apps/mobile/.env

# O editar manualmente:
# Backend: GOOGLE_MOBILE_CALLBACK_URL="http://192.168.0.250:3000/v1/auth/google/mobile/callback"
# Mobile: EXPO_PUBLIC_API_BASE_URL="http://192.168.0.250:3000"
```
