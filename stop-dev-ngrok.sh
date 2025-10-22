#!/bin/bash

# Stop ngrok and optionally restore .env files

echo "🛑 Deteniendo ngrok..."
echo ""

# Check if ngrok is running
if ! lsof -Pi :4040 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "ℹ️  Ngrok no está corriendo."
else
    # Kill ngrok
    pkill ngrok
    sleep 1
    
    if ! lsof -Pi :4040 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "✅ Ngrok detenido."
    else
        echo "⚠️  No se pudo detener ngrok automáticamente."
        echo "   Intenta manualmente: pkill -9 ngrok"
    fi
fi

echo ""
echo "¿Quieres restaurar las IPs locales en los archivos .env? (s/n)"
read -r response

if [[ "$response" == "s" ]]; then
    echo ""
    echo "🔄 Restaurando configuración local..."
    
    BACKEND_ENV="/Users/alejandrozdut/Documents/glucosapp/apps/backend/.env"
    MOBILE_ENV="/Users/alejandrozdut/Documents/glucosapp/apps/mobile/.env"
    
    # Restore backend .env from backup
    if [ -f "$BACKEND_ENV.backup" ]; then
        cp "$BACKEND_ENV.backup" "$BACKEND_ENV"
        echo "   ✓ Backend .env restaurado desde backup"
    else
        echo "   ⚠️  No se encontró backup de backend .env"
    fi
    
    # Restore mobile .env from backup
    if [ -f "$MOBILE_ENV.backup" ]; then
        cp "$MOBILE_ENV.backup" "$MOBILE_ENV"
        echo "   ✓ Mobile .env restaurado desde backup"
    else
        echo "   ⚠️  No se encontró backup de mobile .env"
    fi
    
    echo ""
    echo "✨ Configuración local restaurada."
    echo "   Recuerda reiniciar backend y app móvil."
else
    echo ""
    echo "ℹ️  Los archivos .env se mantuvieron sin cambios."
    echo "   Puedes restaurar manualmente desde los .backup si es necesario."
fi

echo ""
echo "✅ Listo!"
echo ""

