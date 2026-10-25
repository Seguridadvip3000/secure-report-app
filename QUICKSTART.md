# 🚀 Guía Rápida de Inicio

## Opción 1: Modo Local (Rápido - Sin configuración)

Si solo quieres probar la aplicación rápidamente:

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar la aplicación
npm run dev

# 3. Abrir en navegador
# http://localhost:5173
```

**Usuarios de prueba:**
- Directiva: `directiva@seguridad.com`
- Operaciones: `roberto@operaciones.com`
- Líder: `carlos@seguridad.com`
- Cliente: `ana@cliente.com`

⚠️ **Nota**: Los datos se guardan en localStorage del navegador. Si limpias el caché, perderás los datos.

---

## Opción 2: Modo Supabase (Recomendado para Producción)

### Paso 1: Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Inicia sesión o crea una cuenta
3. Haz clic en **New Project**
4. Completa los datos del proyecto
5. Espera a que se cree (toma ~2 minutos)

### Paso 2: Crear las tablas

1. En tu proyecto de Supabase, ve a **SQL Editor** (menú lateral)
2. Haz clic en **New Query**
3. Copia TODO el contenido del archivo `supabase-schema.sql`
4. Pégalo en el editor
5. Haz clic en **Run** (botón verde abajo a la derecha)
6. Deberías ver: "Success. No rows returned"

### Paso 3: Crear bucket de almacenamiento

1. Ve a **Storage** (menú lateral)
2. Haz clic en **New bucket**
3. Nombre: `reports`
4. Activa: **Public bucket**
5. Haz clic en **Create bucket**

### Paso 4: Obtener credenciales

1. Ve a **Settings** (ícono de engranaje) > **API**
2. Copia estos valores:
   - **Project URL**: `https://xxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOi...` (cadena larga)

### Paso 5: Crear archivo .env

1. En la raíz del proyecto, crea un archivo llamado `.env`
2. Agrega este contenido (reemplaza con tus valores):

```env
VITE_STORAGE_MODE=supabase
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...tu_key_completa_aqui...
```

⚠️ **IMPORTANTE**: 
- NO pongas espacios antes o después de `=`
- NO pongas comillas alrededor de los valores
- El archivo `.env` NO debe subirse a Git (ya está en .gitignore)

### Paso 6: Ejecutar la aplicación

```bash
# Instalar dependencias (si no lo has hecho)
npm install

# Ejecutar en modo desarrollo
npm run dev

# Abrir en navegador
# http://localhost:5173
```

### Paso 7: Verificar configuración

1. Abre la aplicación
2. Intenta iniciar sesión con:
   - Email: `directiva@seguridad.com`
   - Teléfono: `+58 414 000 0000`
3. Si funciona, ¡todo está configurado correctamente!

---

## 🔍 Verificar que Supabase está funcionando

### En el navegador:
1. Abre la consola (F12)
2. Ve a la pestaña **Network**
3. Realiza una acción (login, crear reporte, etc.)
4. Deberías ver peticiones a `https://tu-proyecto.supabase.co/rest/v1/...`

### En Supabase:
1. Ve a **Table Editor**
2. Haz clic en la tabla `users`
3. Deberías ver el usuario directiva inicial
4. Registra un nuevo usuario y verifica que aparezca aquí

---

## ❌ Solución de Problemas

### Error: "relation does not exist"
**Solución**: Ejecuta el script `supabase-schema.sql` completo en el SQL Editor

### Error: "Invalid API key"
**Solución**: 
- Verifica que copiaste correctamente la URL y la key en `.env`
- Asegúrate de que no haya espacios extra
- Reinicia el servidor (`npm run dev`)

### Error: "new row violates row-level security policy"
**Solución**: 
- Verifica que las políticas RLS se crearon correctamente
- Revisa el SQL Editor para ver si hay errores

### Las imágenes no se suben
**Solución**:
- Verifica que creaste el bucket `reports`
- Asegúrate de que el bucket sea público
- Revisa la consola del navegador para ver el error específico

### No puedo iniciar sesión
**Solución**:
- Verifica que el usuario directiva existe en la tabla `users`
- Si no existe, ejecuta esta consulta en SQL Editor:

```sql
INSERT INTO users (name, email, phone, role, status, created_at, approved_at)
VALUES (
  'María Rodríguez',
  'directiva@seguridad.com',
  '+58 414 000 0000',
  'directiva',
  'aprobado',
  NOW(),
  NOW()
);
```

---

## 📊 Monitoreo

### Ver datos en Supabase:
- **Table Editor**: Para ver/editar datos directamente
- **Logs**: Para ver errores y peticiones
- **Authentication**: Para gestionar usuarios (si usas Auth)

### Ver datos en localStorage (modo local):
- Abre la consola del navegador (F12)
- Ve a **Application** > **Local Storage**
- Haz clic en tu dominio
- Verás las claves `securereport_users` y `securereport_reports`

---

## 🎯 Siguientes Pasos

Una vez que todo funcione:

1. **Prueba todos los flujos**:
   - Registra nuevos usuarios
   - Aprueba usuarios como directiva
   - Crea reportes como líder
   - Aprueba reportes como operaciones
   - Verifica que el cliente los vea

2. **Personaliza**:
   - Cambia los proyectos en `src/data/constants.ts`
   - Modifica los tipos de novedades
   - Ajusta los colores en `tailwind.config.js`

3. **Despliega**:
   - Usa Vercel, Netlify o similar
   - Configura las variables de entorno en la plataforma
   - ¡Listo para producción!

---

## 📞 Ayuda Adicional

- Documentación de Supabase: https://supabase.com/docs
- Documentación de Vite: https://vitejs.dev
- Documentación de React: https://react.dev

¿Problemas? Revisa la consola del navegador y los logs de Supabase para más detalles.
