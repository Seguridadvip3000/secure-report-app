@echo off
REM Script de limpieza completa para Windows
REM Ejecutar este script cuando aparezca el error:
REM "Cannot read properties of null (reading 'useRef')"

echo 🧹 Iniciando limpieza completa...

REM 1. Limpiar caché de Vite
echo 🗑️  Limpiando caché de Vite...
if exist node_modules\.vite rmdir /s /q node_modules\.vite
if exist .vite rmdir /s /q .vite

REM 2. Limpiar caché de npm
echo 🗑️  Limpiando caché de npm...
call npm cache clean --force

REM 3. Eliminar node_modules y reinstallar
echo 📦 Reinstalando dependencias...
if exist node_modules rmdir /s /q node_modules
call npm install

REM 4. Limpiar carpeta dist
echo 🗑️  Limpiando carpeta dist...
if exist dist rmdir /s /q dist

REM 5. Reiniciar el servidor
echo 🚀 Iniciando servidor de desarrollo...
call npm run dev

echo ✅ Limpieza completada!
echo.
echo 📋 Próximos pasos:
echo 1. Abre el navegador en http://localhost:3000
echo 2. Presiona Ctrl+Shift+R (hard refresh)
echo 3. Abre la consola (F12) y verifica que no haya errores
pause
