# Configuración de Supabase para SecureReport

## 📋 Paso 1: Crear las tablas en Supabase

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. En el menú lateral, haz clic en **SQL Editor**
3. Haz clic en **New Query**
4. Copia todo el contenido del archivo `supabase-schema.sql`
5. Pégalo en el editor SQL
6. Haz clic en **Run** (o presiona Ctrl+Enter)

Esto creará:
- Tabla `users` para gestionar usuarios
- Tabla `reports` para gestionar reportes
- Índices para mejor rendimiento
- Políticas de seguridad (RLS)
- Usuario directiva inicial

## 🔑 Paso 2: Obtener las credenciales

1. En el menú lateral, haz clic en **Settings** (ícono de engranaje)
2. Haz clic en **API**
3. Copia los siguientes valores:
   - **Project URL** (ejemplo: `https://abcdefghijk.supabase.co`)
   - **anon public key** (una cadena larga que empieza con `eyJ...`)

## 📝 Paso 3: Crear el archivo .env

1. En la raíz del proyecto, crea un archivo llamado `.env`
2. Agrega el siguiente contenido:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**IMPORTANTE**: Reemplaza los valores con los de tu proyecto.

## 🗄️ Paso 4: Crear bucket de almacenamiento (para imágenes)

1. En el menú lateral, haz clic en **Storage**
2. Haz clic en **New bucket**
3. Nombre: `reports`
4. Marca la opción **Public bucket**
5. Haz clic en **Create bucket**

Esto permitirá almacenar las fotos de evidencia de los reportes.

## ✅ Paso 5: Verificar la configuración

1. Asegúrate de que el archivo `.env` esté en la raíz del proyecto
2. Reinicia el servidor de desarrollo: `npm run dev`
3. Abre la aplicación en tu navegador
4. Deberías poder iniciar sesión con:
   - Email: `directiva@seguridad.com`
   - Teléfono: `+58 414 000 0000`

## 🔒 Consideraciones de Seguridad

### Autenticación
Actualmente el sistema usa un sistema de autenticación personalizado basado en email/teléfono. Para producción, considera:
- Habilitar **Authentication** de Supabase
- Usar **Auth Helpers** para manejar sesiones
- Implementar recuperación de contraseña

### Row Level Security (RLS)
Las políticas RLS ya están configuradas en el script SQL. Estas políticas:
- Permiten que usuarios aprobados vean datos
- Solo permiten a directiva aprobar usuarios
- Solo permiten a operaciones/directiva aprobar reportes

### Variables de Entorno
NUNCA subas el archivo `.env` a GitHub. El archivo `.gitignore` ya está configurado para ignorarlo.

## 🚀 Siguientes Pasos

Una vez configurado Supabase:

1. **Migrar datos**: Si tienes datos en localStorage, necesitas migrarlos a Supabase
2. **Probar flujos**: Registra nuevos usuarios, crea reportes, aprueba reportes
3. **Monitorear**: Usa el dashboard de Supabase para ver logs y métricas

## 🆘 Solución de Problemas

### Error: "relation does not exist"
- Asegúrate de haber ejecutado el script SQL completo
- Verifica que las tablas `users` y `reports` existan

### Error: "new row violates row-level security policy"
- Verifica que las políticas RLS estén configuradas correctamente
- Asegúrate de que el usuario esté aprobado

### Error: "Invalid API key"
- Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` sean correctos
- Asegúrate de no tener espacios extra en el archivo `.env`

### Las imágenes no se suben
- Verifica que el bucket `reports` exista
- Asegúrate de que el bucket sea público
- Revisa la consola del navegador para ver errores específicos

## 📞 Soporte

Si tienes problemas:
1. Revisa la documentación de [Supabase](https://supabase.com/docs)
2. Consulta los logs en el dashboard de Supabase
3. Verifica la consola del navegador (F12) para errores de JavaScript
