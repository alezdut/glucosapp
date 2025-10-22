#!/bin/bash

# Combined ngrok setup script for Glucosapp
# This script starts ngrok and automatically updates .env files

set -e  # Exit on error

echo "🚀 Iniciando configuración de desarrollo con ngrok..."
echo ""

# Check if ngrok is already running
if lsof -Pi :4040 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Ngrok ya está corriendo."
    echo "   ¿Quieres usar la sesión existente? (s/n)"
    read -r response
    if [[ "$response" != "s" ]]; then
        echo "❌ Cancelado. Detén ngrok primero con: pkill ngrok"
        exit 1
    fi
else
    # Start ngrok in background
    echo "🔧 Iniciando ngrok en el puerto 3000..."
    ngrok http 3000 > /tmp/ngrok.log 2>&1 &
    NGROK_PID=$!
    echo "   PID de ngrok: $NGROK_PID"
    
    # Wait for ngrok to be ready
    echo "⏳ Esperando a que ngrok esté listo..."
    for i in {1..10}; do
        if curl -s http://localhost:4040/api/tunnels > /dev/null 2>&1; then
            echo "   ✅ Ngrok está listo!"
            break
        fi
        if [ $i -eq 10 ]; then
            echo "❌ Error: Ngrok no se inició correctamente"
            echo "   Revisa los logs en /tmp/ngrok.log"
            exit 1
        fi
        sleep 1
    done
fi

echo ""
echo "🔍 Obteniendo URL pública de ngrok..."

# Get ngrok URL from API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$NGROK_URL" ]; then
    echo "❌ Error: No se pudo obtener la URL de ngrok."
    echo "   Revisa los logs en /tmp/ngrok.log"
    exit 1
fi

echo "✅ URL de ngrok: $NGROK_URL"
echo ""

# Update backend .env
BACKEND_ENV="/Users/alejandrozdut/Documents/glucosapp/apps/backend/.env"
echo "📝 Actualizando backend (.env)..."

if [ ! -f "$BACKEND_ENV" ]; then
    echo "❌ Error: No se encontró $BACKEND_ENV"
    exit 1
fi

# Backup (only if backup doesn't exist)
if [ ! -f "$BACKEND_ENV.backup" ]; then
    cp "$BACKEND_ENV" "$BACKEND_ENV.backup"
    echo "   💾 Backup creado: $BACKEND_ENV.backup"
fi

# Update GOOGLE_MOBILE_CALLBACK_URL
sed -i '' "s|GOOGLE_MOBILE_CALLBACK_URL=.*|GOOGLE_MOBILE_CALLBACK_URL=\"${NGROK_URL}/v1/auth/google/mobile/callback\"|g" "$BACKEND_ENV"
echo "   ✓ GOOGLE_MOBILE_CALLBACK_URL actualizado"

# Update mobile .env
MOBILE_ENV="/Users/alejandrozdut/Documents/glucosapp/apps/mobile/.env"
echo "📝 Actualizando mobile (.env)..."

if [ ! -f "$MOBILE_ENV" ]; then
    echo "❌ Error: No se encontró $MOBILE_ENV"
    exit 1
fi

# Backup (only if backup doesn't exist)
if [ ! -f "$MOBILE_ENV.backup" ]; then
    cp "$MOBILE_ENV" "$MOBILE_ENV.backup"
    echo "   💾 Backup creado: $MOBILE_ENV.backup"
fi

# Update EXPO_PUBLIC_API_BASE_URL
sed -i '' "s|EXPO_PUBLIC_API_BASE_URL=.*|EXPO_PUBLIC_API_BASE_URL=\"${NGROK_URL}\"|g" "$MOBILE_ENV"
echo "   ✓ EXPO_PUBLIC_API_BASE_URL actualizado"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✨ ¡Configuración completada!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Próximos pasos:"
echo ""
echo "1️⃣  Actualiza Google Cloud Console:"
echo "   👉 https://console.cloud.google.com/apis/credentials"
echo "   → Edita tu OAuth 2.0 Client ID"
echo "   → Agrega a 'URIs de redireccionamiento autorizados':"
echo ""
echo "   ${NGROK_URL}/v1/auth/google/mobile/callback"
echo ""
echo "2️⃣  Reinicia el backend (en otra terminal):"
echo "   cd apps/backend && pnpm dev"
echo ""
echo "3️⃣  Reinicia la app móvil (en otra terminal):"
echo "   cd apps/mobile && pnpm dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "ℹ️  Ngrok está corriendo en segundo plano."
echo "   Para ver logs: tail -f /tmp/ngrok.log"
echo "   Para detener: pkill ngrok"
echo "   Para ver dashboard: open http://localhost:4040"
echo ""
echo "⚠️  IMPORTANTE: Con cuenta gratuita, esta URL cambiará"
echo "   cada vez que reinicies ngrok."
echo ""

