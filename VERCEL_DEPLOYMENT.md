# 🚀 Despliegue en Vercel - Guía Completa

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener:
- ✅ Cuenta de GitHub (https://github.com)
- ✅ Cuenta de Vercel (https://vercel.com) - puedes usar tu cuenta de GitHub
- ✅ Git instalado en tu computadora (https://git-scm.com/downloads)
- ✅ Node.js instalado (https://nodejs.org)
- ✅ Proyecto descargado en tu computadora

---

## 🎯 Fase 1: Preparar el Proyecto Local

### Paso 1: Descargar el Proyecto

Si estás en StackBlitz o similar:
1. Busca el botón **"Download"** o **"Export"**
2. Selecciona **"Download as ZIP"**
3. Guarda el archivo ZIP en tu computadora
4. Descomprime el ZIP en una carpeta (ej: `C:\Proyectos\SecureReport`)

### Paso 2: Verificar .gitignore

Abre el archivo `.gitignore` en la raíz del proyecto y asegúrate de que contenga:

```gitignore
# Dependencies
node_modules/

# Build output
dist/

# Environment variables (CRÍTICO - NUNCA subir secretos)
.env
.env.local
.env.production

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Vite cache
.vite/

# Temp files
banner-temp.png
```

### Paso 3: Verificar package.json

Asegúrate de que el archivo `package.json` tenga los scripts correctos:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

---

## 🔧 Fase 2: Inicializar Git Localmente

### Paso 4: Abrir Terminal

Abre una terminal en la carpeta del proyecto:

**Windows:**
```bash
# Opción 1: Click derecho en la carpeta → "Git Bash Here"
# Opción 2: Abrir CMD o PowerShell y navegar:
cd C:\Proyectos\SecureReport
```

**Mac/Linux:**
```bash
cd /ruta/a/tu/proyecto/SecureReport
```

### Paso 5: Inicializar Repositorio Git

```bash
# Inicializar Git
git init

# Agregar todos los archivos
git add .

# Verificar qué archivos se van a subir
git status

# Hacer el primer commit
git commit -m "Initial commit: SecureReport - Sistema de Gestión de Novedades"

# Renombrar rama principal a 'main'
git branch -M main
```

### Paso 6: Verificar el Commit

```bash
# Ver el historial de commits
git log --oneline

# Deberías ver algo como:
# abc1234 Initial commit: SecureReport - Sistema de Gestión de Novedades
```

---

## 🐙 Fase 3: Crear Repositorio en GitHub

### Paso 7: Crear Repositorio en GitHub

1. Ve a https://github.com/new
2. Completa el formulario:
   - **Repository name**: `secure-report` (o el nombre que prefieras)
   - **Description**: `Sistema de Gestión de Novedades de Seguridad - SecureReport`
   - **Public/Private**: Elige según tu preferencia
   - ❌ **NO marques** "Initialize this repository with a README"
   - ❌ **NO marques** "Add .gitignore"
   - ❌ **NO marques** "Choose a license"
3. Haz clic en **"Create repository"**

### Paso 8: Conectar Repositorio Local con GitHub

GitHub te mostrará comandos. Copia y ejecuta estos en tu terminal:

```bash
# Agregar el repositorio remoto (REEMPLAZA con tu URL de GitHub)
git remote add origin https://github.com/TU_USUARIO/secure-report.git

# Verificar que se agregó correctamente
git remote -v

# Subir el código a GitHub
git push -u origin main
```

### Paso 9: Verificar en GitHub

1. Recarga la página de tu repositorio en GitHub
2. Deberías ver todos los archivos del proyecto
3. Verifica que el archivo `.env` **NO esté presente** (debe estar en .gitignore)

---

## ▲ Fase 4: Desplegar en Vercel

### Paso 10: Importar Proyecto en Vercel

1. Ve a https://vercel.com/new
2. Si no has iniciado sesión, hazlo con tu cuenta de GitHub
3. Verás la lista de tus repositorios de GitHub
4. Busca **`secure-report`** y haz clic en **"Import"**

### Paso 11: Configurar el Proyecto en Vercel

Vercel detectará automáticamente que es un proyecto Vite. Configura así:

**Framework Preset:**
- Selecciona: **Vite**

**Root Directory:**
- Deja como está: `./`

**Build Command:**
- Vercel lo detecta automáticamente: `npm run build`

**Output Directory:**
- Vercel lo detecta automáticamente: `dist`

**Install Command:**
- Deja como está: `npm install`

### Paso 12: Configurar Variables de Entorno

**¡ESTO ES CRÍTICO!** Antes de hacer clic en "Deploy", configura las variables:

1. Despliega la sección **"Environment Variables"**
2. Agrega las siguientes variables:

#### Variable 1: Modo de Almacenamiento
- **Name**: `VITE_STORAGE_MODE`
- **Value**: `supabase`
- **Environment**: ✅ Production ✅ Preview ✅ Development

#### Variable 2: URL de Supabase
- **Name**: `VITE_SUPABASE_URL`
- **Value**: `https://sjwyqpvnkrmfvfxuhkqp.supabase.co`
- **Environment**: ✅ Production ✅ Preview ✅ Development

#### Variable 3: Clave Anónima de Supabase
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: (la clave completa que tienes en tu `.env` local)
- **Environment**: ✅ Production ✅ Preview ✅ Development

3. Haz clic en **"Deploy"**

### Paso 13: Esperar el Despliegue

Vercel realizará los siguientes pasos automáticamente:
1. Clonar tu repositorio
2. Instalar dependencias (`npm install`)
3. Construir el proyecto (`npm run build`)
4. Desplegar en la red global de Vercel

Esto tomará aproximadamente **2-5 minutos**.

### Paso 14: Verificar el Despliegue

Cuando termine, Vercel te mostrará:
- ✅ **Deployment Status**: Ready
- ✅ **URL de producción**: `https://secure-report-xxxxx.vercel.app`
- ✅ **URL de preview**: (para branches de desarrollo)

Haz clic en la URL de producción para verificar que la app funciona.

---

## 🔐 Fase 5: Verificación Post-Despliegue

### Paso 15: Probar la Aplicación

Abre la URL de producción y verifica:

1. ✅ **Página de Login**: Se carga correctamente
2. ✅ **Registro**: Puedes registrar un nuevo usuario
3. ✅ **Login**: Puedes iniciar sesión con usuarios existentes
4. ✅ **Dashboard**: Cada rol ve su panel correcto
5. ✅ **Crear Reporte**: El formulario funciona
6. ✅ **GPS**: Se obtiene la ubicación (o usa la por defecto)
7. ✅ **Fotos**: Puedes subir evidencias
8. ✅ **PDF**: Se genera correctamente con el banner SVG
9. ✅ **Notificaciones Push**: Se solicitan permisos
10. ✅ **PWA**: Puedes instalar la app en el teléfono

### Paso 16: Verificar Conexión con Supabase

1. Abre la consola del navegador (F12)
2. Ve a la pestaña **Network**
3. Realiza una acción (login, crear reporte)
4. Verifica que haya peticiones a `https://sjwyqpvnkrmfvfxuhkqp.supabase.co`
5. Todas deben retornar status **200** o **201**

---

## 📱 Fase 6: Instalar como PWA en el Teléfono

### En Android (Chrome):

1. Abre la URL de producción en Chrome
2. Toca el menú ⋮ (tres puntos arriba a la derecha)
3. Selecciona **"Instalar aplicación"** o **"Agregar a pantalla principal"**
4. Confirma la instalación
5. ✅ La app aparecerá en tu pantalla de inicio

### En iPhone (Safari):

1. Abre la URL de producción en Safari
2. Toca el botón **Compartir** (cuadrado con flecha ↑)
3. Selecciona **"Agregar a pantalla principal"**
4. Toca **"Agregar"**
5. ✅ La app aparecerá en tu pantalla de inicio

---

## 🔄 Fase 7: Actualizaciones Futuras

Cuando hagas cambios en el código:

### Paso 18: Subir Cambios a GitHub

```bash
# Ver qué archivos cambiaste
git status

# Agregar los cambios
git add .

# Hacer commit
git commit -m "Descripción de los cambios"

# Subir a GitHub
git push
```

### Paso 19: Despliegue Automático en Vercel

**¡Vercel despliega automáticamente!**

Cuando hagas `git push`:
1. Vercel detecta los cambios
2. Reconstruye el proyecto automáticamente
3. Despliega la nueva versión
4. Te notifica por email cuando termine

**No necesitas hacer nada en Vercel manualmente.**

---

## 🛠️ Solución de Problemas

### Problema 1: "git: command not found"

**Solución:**
- Instala Git desde: https://git-scm.com/downloads
- Reinicia la terminal
- Intenta nuevamente

### Problema 2: "Permission denied (publickey)"

**Solución:**
```bash
# Configura tu usuario de Git
git config --global user.name "Tu Nombre"
git config --global user.email "tu@email.com"

# Si usas SSH, genera una nueva clave:
ssh-keygen -t ed25519 -C "tu@email.com"
# Agrega la clave a tu cuenta de GitHub
```

### Problema 3: "fatal: remote origin already exists"

**Solución:**
```bash
# Elimina el remote existente
git remote remove origin

# Vuelve a agregarlo
git remote add origin https://github.com/TU_USUARIO/secure-report.git
```

### Problema 4: Vercel no despliega - Error de Build

**Causas comunes:**
- Variables de entorno faltantes
- Dependencias no instaladas
- Errores de TypeScript

**Solución:**
1. Revisa los logs de Vercel
2. Verifica que todas las variables de entorno estén configuradas
3. Prueba el build localmente: `npm run build`
4. Corrige los errores y sube nuevamente

### Problema 5: La app funciona pero no se conecta a Supabase

**Causa:** Variables de entorno incorrectas o faltantes

**Solución:**
1. Ve a Vercel → Tu proyecto → Settings → Environment Variables
2. Verifica que las 3 variables estén configuradas:
   - `VITE_STORAGE_MODE`
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Asegúrate de que estén marcadas para **Production**
4. Redeploy: Vercel → Deployments → Último deployment → ⋮ → Redeploy

### Problema 6: El archivo .env se subió a GitHub

**¡ALERTA DE SEGURIDAD!**

**Solución inmediata:**
```bash
# Eliminar el archivo del repositorio (pero mantenerlo local)
git rm --cached .env

# Hacer commit
git commit -m "Remove .env from tracking"

# Subir a GitHub
git push
```

**Luego:**
1. Cambia inmediatamente las credenciales de Supabase
2. Genera una nueva anon key en Supabase
3. Actualiza las variables en Vercel

---

## 📊 Checklist Final de Despliegue

### Antes de Desplegar:
- [ ] Proyecto descargado y descomprimido
- [ ] `.gitignore` configurado correctamente
- [ ] `.env` NO está en el repositorio
- [ ] `package.json` tiene los scripts correctos
- [ ] Build local funciona: `npm run build`

### Git y GitHub:
- [ ] `git init` ejecutado
- [ ] `git add .` ejecutado
- [ ] `git commit` ejecutado
- [ ] Repositorio creado en GitHub
- [ ] `git remote add origin` ejecutado
- [ ] `git push` ejecutado
- [ ] Archivos visibles en GitHub

### Vercel:
- [ ] Proyecto importado en Vercel
- [ ] Framework preset: Vite
- [ ] Variable `VITE_STORAGE_MODE` configurada
- [ ] Variable `VITE_SUPABASE_URL` configurada
- [ ] Variable `VITE_SUPABASE_ANON_KEY` configurada
- [ ] Deployment exitoso
- [ ] URL de producción accesible

### Verificación:
- [ ] Login funciona
- [ ] Registro funciona
- [ ] Crear reportes funciona
- [ ] Aprobar reportes funciona
- [ ] PDFs se generan correctamente
- [ ] Notificaciones push funcionan
- [ ] PWA se puede instalar
- [ ] Conexión con Supabase verificada

---

## 🎉 ¡Despliegue Completado!

Tu aplicación SecureReport ahora está:
- ✅ **En producción** en Vercel
- ✅ **Accesible** desde cualquier dispositivo
- ✅ **Conectada** a Supabase
- ✅ **Optimizada** para rendimiento
- ✅ **Lista** para usar en el teléfono como PWA

---

## 📞 Soporte Adicional

### Documentación de Vercel:
- https://vercel.com/docs

### Documentación de GitHub:
- https://docs.github.com

### Documentación de Git:
- https://git-scm.com/doc

### Si necesitas ayuda:
1. Revisa los logs de Vercel
2. Verifica la consola del navegador (F12)
3. Consulta la documentación oficial
4. Revisa esta guía nuevamente

---

**¡Tu aplicación está lista para el mundo!** 🚀🌍

**Última actualización:** Enero 2026  
**Versión de la guía:** 1.0
