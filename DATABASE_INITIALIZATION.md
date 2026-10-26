# 🚀 Guía de Inicialización de Base de Datos

## ⚠️ Problema Solucionado

Si al intentar crear un reporte recibes el error:
```
Error al crear el reporte
```

Esto se debe a que **la base de datos de Supabase está vacía** y los usuarios de prueba no existen en la tabla `users` real, causando un error de clave foránea.

## ✅ Solución: Asistente de Configuración

He creado un **asistente automático** que detecta si la base de datos está vacía y te permite inicializarla con un solo clic.

### Opción 1: Acceso Automático

La aplicación detectará automáticamente si la base de datos está vacía y te redirigirá al asistente de configuración.

### Opción 2: Acceso Manual

Si ya estás en la aplicación y necesitas inicializar la base de datos:

1. **Ve a la página de login**
2. **Busca el enlace** al final del formulario:
   ```
   ¿Problemas para iniciar sesión? Inicializar base de datos
   ```
3. **Haz clic en el enlace**
4. **Serás redirigido** al asistente de configuración

### Opción 3: Acceso Directo por URL

Puedes acceder directamente al asistente visitando:
```
http://localhost:5173/setup
```

## 📋 ¿Qué Hace el Asistente?

El asistente de configuración:

1. ✅ **Verifica** si la base de datos está vacía
2. ✅ **Inserta automáticamente** los usuarios de prueba:
   - 👑 Directiva: `directiva@seguridad.com`
   - 📊 Operaciones: `roberto@operaciones.com`
   - 🛡️ Líder 1: `carlos@seguridad.com`
   - 🛡️ Líder 2: `luis@seguridad.com`
   - 👤 Cliente 1: `ana@cliente.com`
   - 👤 Cliente 2: `julia@cliente.com`
   - 👤 Cliente 3: `maria@cliente.com`

3. ✅ **Inserta reportes de ejemplo** con diferentes estados
4. ✅ **Configura todos los usuarios** como "aprobados"
5. ✅ **Te permite iniciar sesión** inmediatamente con cualquier usuario

## 🎯 Cómo Usar el Asistente

### Paso 1: Acceder al Asistente
- Ve a `/setup` o haz clic en el enlace en la página de login

### Paso 2: Verificar Estado
El asistente verificará automáticamente si la base de datos está vacía.

### Paso 3: Inicializar Datos
- Si la base de datos está vacía, verás un botón: **"Inicializar Base de Datos"**
- Haz clic en el botón
- Espera a que se complete el proceso (unos segundos)

### Paso 4: Iniciar Sesión
Una vez completada la inicialización:
- Verás un mensaje de éxito
- Se te mostrarán los botones de acceso rápido para cada usuario
- Haz clic en cualquier usuario para iniciar sesión inmediatamente

## 🔧 Solución de Problemas

### Error: "Failed to fetch" o "Network error"

**Causa:** Problemas de conexión con Supabase

**Solución:**
1. Verifica que las credenciales en `.env` sean correctas
2. Asegúrate de que el proyecto de Supabase esté activo
3. Verifica tu conexión a internet
4. Revisa la consola del navegador (F12) para más detalles

### Error: "relation does not exist"

**Causa:** Las tablas no se han creado en Supabase

**Solución:**
1. Ve a tu proyecto en Supabase
2. Abre el **SQL Editor**
3. Copia y ejecuta el contenido de `supabase-schema.sql`
4. Vuelve a intentar la inicialización

### Error: "duplicate key value violates unique constraint"

**Causa:** Ya existen datos en la base de datos

**Solución:**
- Esto es normal si ya inicializaste antes
- El asistente debería detectar esto automáticamente
- Si persiste, puedes continuar usando los usuarios existentes

### Los usuarios no aparecen después de inicializar

**Causa:** Problema de permisos en Supabase

**Solución:**
1. Ve a **Authentication** en Supabase
2. Verifica que las políticas RLS estén configuradas correctamente
3. Asegúrate de que la tabla `users` permita inserciones

## 📊 Datos que se Insertan

### Usuarios de Prueba (7 usuarios)

| Rol | Email | Teléfono | Proyectos |
|-----|-------|----------|-----------|
| 👑 Directiva | directiva@seguridad.com | +58 414 000 0000 | Todos |
| 📊 Operaciones | roberto@operaciones.com | +58 414 345 6789 | Todos |
| 🛡️ Líder | carlos@seguridad.com | +58 414 123 4567 | ESTACIONAMIENTO CCCT, COMERCIO CCCT, HOTEL CCT |
| 🛡️ Líder | luis@seguridad.com | +58 414 234 5678 | CC VIZCAYA, CC CONCRESA, CENTRO PLAZA |
| 👤 Cliente | ana@cliente.com | +58 414 456 7890 | ESTACIONAMIENTO CCCT, COMERCIO CCCT |
| 👤 Cliente | julia@cliente.com | +58 414 567 8901 | CC VIZCAYA, CC CONCRESA |
| 👤 Cliente | maria@cliente.com | +58 414 678 9012 | HOTEL CCT |

### Reportes de Ejemplo (5 reportes)

1. **Daño a las instalaciones** - ESTACIONAMIENTO CCCT (Aprobado)
2. **Sospechoso** - COMERCIO CCCT (Aprobado)
3. **Falla del sistema de seguridad** - CC VIZCAYA (Pendiente)
4. **OTRA:** - HOTEL CCT (Aprobado)
5. **Procedimiento Policial** - CC CONCRESA (Aprobado)

## 🔄 Reinicializar Base de Datos

Si necesitas reinicializar la base de datos (borrar todos los datos y empezar de nuevo):

### Opción 1: Desde Supabase
1. Ve a **Table Editor** en Supabase
2. Selecciona la tabla `reports`
3. Haz clic en **Delete all rows**
4. Repite con la tabla `users`
5. Vuelve a ejecutar el asistente

### Opción 2: SQL Directo
```sql
-- Advertencia: Esto borrará TODOS los datos
DELETE FROM reports;
DELETE FROM users;
```

Luego ejecuta el asistente nuevamente.

## 💡 Consejos

### Primera Vez
- Ejecuta el asistente inmediatamente después de configurar Supabase
- Verifica que todos los usuarios aparezcan en la tabla `users` de Supabase
- Prueba iniciar sesión con cada usuario para confirmar que funciona

### Desarrollo
- Puedes reinicializar tantas veces como necesites
- Los datos de prueba son útiles para testing
- Considera crear usuarios adicionales para pruebas específicas

### Producción
- **NO uses datos de prueba en producción**
- Crea usuarios reales a través del registro
- Elimina los reportes de ejemplo antes de lanzar

## 🎉 ¡Listo!

Una vez inicializada la base de datos:
- ✅ Podrás crear reportes sin errores
- ✅ Los reportes se vincularán correctamente a los usuarios
- ✅ Podrás probar todos los flujos de la aplicación
- ✅ Los emails de notificación funcionarán correctamente

## 📞 Soporte Adicional

Si continúas teniendo problemas:

1. **Revisa la consola del navegador** (F12) para ver errores específicos
2. **Verifica los logs de Supabase** en el dashboard
3. **Consulta la documentación** en `SUPABASE_SETUP.md`
4. **Revisa las políticas RLS** en Supabase

---

**Última actualización:** Enero 2026  
**Versión del asistente:** 1.0
