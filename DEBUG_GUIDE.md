# 🔧 Guía de Debugging: Error al Crear Reporte

## 📋 Problema
Al intentar crear un reporte como Carlos Martínez, aparece el error:
```
Error al crear el reporte. Por favor intente nuevamente.
```

## 🔍 Pasos para Diagnosticar

### 1. Abrir la Consola del Navegador
1. Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux) o `Cmd+Option+I` (Mac)
2. Ve a la pestaña **"Console"**
3. Limpia la consola (ícono de prohibido 🚫)

### 2. Intentar Crear un Reporte
1. Inicia sesión como `carlos@seguridad.com`
2. Ve a "Crear Reporte"
3. Llena el formulario con datos de prueba
4. Haz clic en "Enviar Reporte"

### 3. Revisar los Logs en la Consola

Deberías ver mensajes como estos:

```
🔍 handleSubmit llamado
👤 currentUser: { id: "...", name: "Carlos Martínez", ... }
🆔 currentUser.id: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
📧 currentUser.email: carlos@seguridad.com
📝 Llamando a addReport con: { ... }
📝 addReport llamado con: { ... }
🔍 Validando createdBy: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
🆔 Nuevo ID de reporte generado: yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy
📸 Subiendo evidencias a Supabase Storage...
📸 Cantidad de evidencias: 2
📤 Llamando a reportService.createReport...
📝 Intentando crear reporte en Supabase...
📋 Datos del reporte: { ... }
📤 Datos a insertar: { ... }
```

## 🚨 Errores Comunes y Soluciones

### Error 1: "createdBy no es un UUID válido"

**Síntoma en consola:**
```
❌ createdBy no es un UUID válido: system
```

**Causa:**
El usuario tiene un ID de localStorage en lugar de un UUID de Supabase.

**Solución:**
1. Cierra sesión
2. Limpia el localStorage:
   - Abre DevTools (F12)
   - Ve a **Application** > **Local Storage**
   - Elimina las claves `securereport_session` y `securereport_users`
3. Inicia sesión nuevamente con `carlos@seguridad.com`
4. Verifica en la consola que el ID sea un UUID válido (formato: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Error 2: "new row violates row-level security policy"

**Síntoma en consola:**
```
❌ Error de Supabase al crear reporte: {
  message: "new row violates row-level security policy for table \"reports\"",
  code: "42501",
  ...
}
```

**Causa:**
Las políticas RLS (Row Level Security) de Supabase están bloqueando la inserción.

**Solución:**
Ejecuta este SQL en el **SQL Editor** de Supabase:

```sql
-- ============================================
-- POLÍTICAS RLS PARA REPORTES
-- ============================================

-- Permitir que usuarios autenticados puedan crear reportes
CREATE POLICY "Usuarios autenticados pueden crear reportes"
ON reports
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir que usuarios autenticados puedan leer reportes
CREATE POLICY "Usuarios autenticados pueden leer reportes"
ON reports
FOR SELECT
TO authenticated
USING (true);

-- Permitir que usuarios autenticados puedan actualizar reportes
CREATE POLICY "Usuarios autenticados pueden actualizar reportes"
ON reports
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Permitir que usuarios autenticados puedan eliminar reportes
CREATE POLICY "Usuarios autenticados pueden eliminar reportes"
ON reports
FOR DELETE
TO authenticated
USING (true);
```

### Error 3: "foreign key constraint violation"

**Síntoma en consola:**
```
❌ Error de Supabase al crear reporte: {
  message: "insert or update on table \"reports\" violates foreign key constraint \"reports_created_by_fkey\"",
  code: "23503",
  ...
}
```

**Causa:**
El `created_by` no existe en la tabla `users`.

**Solución:**
1. Verifica que el usuario existe en Supabase:
```sql
SELECT id, name, email, role, status 
FROM users 
WHERE email = 'carlos@seguridad.com';
```

2. Si no existe, ejecuta el script `insert-test-users.sql`

3. Si existe pero tiene un ID diferente, cierra sesión e inicia sesión nuevamente para cargar el ID correcto

### Error 4: "Error subiendo evidencias"

**Síntoma en consola:**
```
❌ Error subiendo evidencias: {
  message: "The resource was not found",
  ...
}
```

**Causa:**
El bucket `reports` no existe en Supabase Storage.

**Solución:**
1. Ve a **Storage** en Supabase
2. Crea un bucket llamado `reports`
3. Activa **Public bucket**
4. Ejecuta las políticas de Storage (ver abajo)

**Políticas para Storage:**
```sql
-- Permitir lectura pública
CREATE POLICY "Permitir lectura pública de evidencias"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'reports');

-- Permitir inserción a usuarios autenticados
CREATE POLICY "Permitir inserción de evidencias"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports');

-- Permitir actualización a usuarios autenticados
CREATE POLICY "Permitir actualización de evidencias"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'reports');
```

## 📊 Verificar Estado de la Base de Datos

Ejecuta estas consultas en el **SQL Editor** de Supabase:

### 1. Verificar que el usuario existe
```sql
SELECT id, name, email, role, status 
FROM users 
WHERE email = 'carlos@seguridad.com';
```

**Resultado esperado:**
| id | name | email | role | status |
|----|------|-------|------|--------|
| xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | Carlos Martínez | carlos@seguridad.com | lider | aprobado |

### 2. Verificar políticas RLS de reports
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'reports';
```

**Resultado esperado:** Deberías ver al menos 4 políticas (INSERT, SELECT, UPDATE, DELETE)

### 3. Verificar bucket de Storage
```sql
SELECT id, name, public 
FROM storage.buckets 
WHERE name = 'reports';
```

**Resultado esperado:**
| id | name | public |
|----|------|--------|
| xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | reports | true |

## 🎯 Checklist de Verificación

- [ ] Abrir la consola del navegador (F12)
- [ ] Intentar crear un reporte
- [ ] Revisar los logs en la consola
- [ ] Identificar el error específico
- [ ] Aplicar la solución correspondiente
- [ ] Verificar que el usuario existe en Supabase
- [ ] Verificar que las políticas RLS están configuradas
- [ ] Verificar que el bucket de Storage existe
- [ ] Intentar crear el reporte nuevamente

## 📞 Si el Problema Persiste

1. Copia **TODOS** los mensajes de la consola (desde el primer log hasta el error)
2. Copia el resultado de las consultas SQL de verificación
3. Comparte esa información para análisis detallado

## 🔗 Enlaces Útiles

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [PostgreSQL Error Codes](https://www.postgresql.org/docs/current/errcodes-appendix.html)
