#!/bin/bash

# Script de limpieza completa para resolver errores de caché/HMR
# Ejecutar este script cuando aparezca el error:
# "Cannot read properties of null (reading 'useRef')"

echo "🧹 Iniciando limpieza completa..."

# 1. Detener cualquier proceso de Node.js
echo "📴 Deteniendo procesos de Node.js..."
pkill -f "node.*vite" || true
pkill -f "npm.*dev" || true

# 2. Limpiar caché de Vite
echo "🗑️  Limpiando caché de Vite..."
rm -rf node_modules/.vite
rm -rf .vite

# 3. Limpiar caché de npm
echo "🗑️  Limpiando caché de npm..."
npm cache clean --force

# 4. Eliminar node_modules y reinstallar
echo "📦 Reinstalando dependencias..."
rm -rf node_modules
npm install

# 5. Limpiar carpeta dist
echo "🗑️  Limpiando carpeta dist..."
rm -rf dist

# 6. Reiniciar el servidor
echo "🚀 Iniciando servidor de desarrollo..."
npm run dev

echo "✅ Limpieza completada!"
echo ""
echo "📋 Próximos pasos:"
echo "1. Abre el navegador en http://localhost:3000"
echo "2. Presiona Ctrl+Shift+R (hard refresh)"
echo "3. Abre la consola (F12) y verifica que no haya errores"
