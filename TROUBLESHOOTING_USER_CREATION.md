# 🔧 Guía de Troubleshooting: Error al Crear Usuario en Supabase

## 🚨 Error: "Error al crear usuario en Supabase: Error desconocido"

Este error ocurre cuando el sistema intenta crear automáticamente un usuario de prueba en Supabase pero falla.

## 📋 Causas Comunes

### 1. **Usuario Ya Existe en Supabase**
El usuario ya fue creado anteriormente pero con un estado diferente (pendiente, rechazado, etc.)

**Solución:**
- El sistema ahora detecta automáticamente si el usuario existe
- Si existe, lo aprueba automáticamente
- No deberías ver este error si el usuario ya existe

### 2. **Políticas RLS (Row Level Security) Bloqueando**
Las políticas de seguridad de Supabase están bloqueando la inserción o actualización.

**Solución:**
Ejecuta este SQL en el SQL Editor de Supabase:

```sql
-- Permitir inserción de usuarios
CREATE POLICY "Permitir inserción de usuarios"
ON users FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Permitir lectura de usuarios
CREATE POLICY "Permitir lectura de usuarios"
ON users FOR SELECT
TO anon, authenticated
USING (true);

-- Permitir actualización de usuarios
CREATE POLICY "Permitir actualización de usuarios"
ON users FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);
```

### 3. **Credenciales de Supabase Incorrectas**
Las credenciales en el archivo `.env` no son correctas.

**Verificación:**
```bash
# Verifica que el archivo .env tenga:
VITE_SUPABASE_URL=https://sjwygpvnkrmfvfxuhkqp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4. **Tabla `users` No Existe**
La tabla no se ha creado en Supabase.

**Solución:**
Ejecuta el script `supabase-schema.sql` en el SQL Editor de Supabase.

### 5. **Problema de Conexión**
No hay conexión con Supabase.

**Verificación:**
1. Ve a `http://localhost:3000/diagnostic`
2. Haz clic en "Ejecutar Diagnósticos"
3. Verifica que todas las pruebas pasen

## 🔍 Cómo Diagnosticar el Problema

### Paso 1: Abrir la Consola del Navegador

1. Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux) o `Cmd+Option+I` (Mac)
2. Ve a la pestaña **Console**
3. Limpia la consola (ícono de prohibido 🚫)

### Paso 2: Intentar Iniciar Sesión

1. Ve a la página de login
2. Intenta iniciar sesión con `carlos@seguridad.com`
3. Observa los mensajes en la consola

### Paso 3: Analizar los Logs

Deberías ver mensajes como estos:

```
🔍 Intentando login con: {email: 'carlos@seguridad.com', ...}
📋 Usuarios cargados: 0
👤 Usuario encontrado en memoria: NO
⚠️ Usuario no existe en memoria. Verificando si es usuario de prueba...
✅ Es usuario de prueba: Carlos Martínez
🚀 Creando usuario en Supabase...
🔍 Verificando si el usuario ya existe en Supabase...
```

### Paso 4: Identificar el Error

Busca mensajes con ❌ o 📋 que indiquen el error específico:

#### Error: "duplicate key value violates unique constraint"
**Causa:** El usuario ya existe con el mismo email o teléfono.
**Solución:** El sistema ahora maneja esto automáticamente. Si persiste, recarga la página.

#### Error: "new row violates row-level security policy"
**Causa:** Las políticas RLS están bloqueando la inserción.
**Solución:** Ejecuta el SQL de políticas RLS (ver arriba).

#### Error: "relation does not exist"
**Causa:** La tabla `users` no existe.
**Solución:** Ejecuta `supabase-schema.sql`.

#### Error: "Invalid API key" o "JWT expired"
**Causa:** Credenciales de Supabase incorrectas.
**Solución:** Verifica el archivo `.env` y reinicia el servidor.

## 🛠️ Soluciones Paso a Paso

### Solución 1: Verificar que el Usuario Existe

Ejecuta este SQL en Supabase:

```sql
SELECT 
  id,
  name,
  email,
  phone,
  role,
  status,
  proyectos,
  created_at,
  approved_at
FROM users
WHERE email = 'carlos@seguridad.com';
```

**Si el usuario existe:**
- Verifica que el `status` sea 'aprobado'
- Si no está aprobado, ejecuta:

```sql
UPDATE users 
SET status = 'aprobado',
    approved_at = NOW(),
    approved_by = 'system'
WHERE email = 'carlos@seguridad.com';
```

**Si el usuario NO existe:**
- Ejecuta el script de inserción de usuarios de prueba

### Solución 2: Insertar Usuarios Manualmente

Ejecuta este SQL en Supabase:

```sql
-- Carlos Martínez (Líder)
INSERT INTO users (name, email, phone, role, status, proyectos, created_at, approved_at, approved_by)
VALUES (
  'Carlos Martínez',
  'carlos@seguridad.com',
  '+58 414 123 4567',
  'lider',
  'aprobado',
  '{"ESTACIONAMIENTO CCCT", "COMERCIO CCCT", "HOTEL CCT"}',
  NOW(),
  NOW(),
  'system'
)
ON CONFLICT (email) DO UPDATE 
SET status = 'aprobado',
    approved_at = NOW(),
    approved_by = 'system';

-- Roberto Sánchez (Operaciones)
INSERT INTO users (name, email, phone, role, status, proyectos, created_at, approved_at, approved_by)
VALUES (
  'Roberto Sánchez',
  'roberto@operaciones.com',
  '+58 414 345 6789',
  'operaciones',
  'aprobado',
  '{}',
  NOW(),
  NOW(),
  'system'
)
ON CONFLICT (email) DO UPDATE 
SET status = 'aprobado',
    approved_at = NOW(),
    approved_by = 'system';

-- Ana García (Cliente)
INSERT INTO users (name, email, phone, role, status, proyectos, created_at, approved_at, approved_by)
VALUES (
  'Ana García',
  'ana@cliente.com',
  '+58 414 456 7890',
  'cliente',
  'aprobado',
  '{"ESTACIONAMIENTO CCCT", "COMERCIO CCCT"}',
  NOW(),
  NOW(),
  'system'
)
ON CONFLICT (email) DO UPDATE 
SET status = 'aprobado',
    approved_at = NOW(),
    approved_by = 'system';

-- María Rodríguez (Directiva)
INSERT INTO users (name, email, phone, role, status, proyectos, created_at, approved_at, approved_by)
VALUES (
  'María Rodríguez',
  'directiva@seguridad.com',
  '+58 414 000 0000',
  'directiva',
  'aprobado',
  '{}',
  NOW(),
  NOW(),
  'system'
)
ON CONFLICT (email) DO UPDATE 
SET status = 'aprobado',
    approved_at = NOW(),
    approved_by = 'system';
```

### Solución 3: Verificar Políticas RLS

Ejecuta este SQL para ver las políticas actuales:

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
WHERE tablename = 'users';
```

Si no ves políticas o están muy restrictivas, ejecuta:

```sql
-- Habilitar RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT
CREATE POLICY "Permitir lectura de usuarios"
ON users FOR SELECT
TO anon, authenticated
USING (true);

-- Política para permitir INSERT
CREATE POLICY "Permitir inserción de usuarios"
ON users FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Política para permitir UPDATE
CREATE POLICY "Permitir actualización de usuarios"
ON users FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Política para permitir DELETE
CREATE POLICY "Permitir eliminación de usuarios"
ON users FOR DELETE
TO authenticated
USING (true);
```

### Solución 4: Verificar Conexión a Supabase

1. Ve a `http://localhost:3000/diagnostic`
2. Haz clic en "Ejecutar Diagnósticos"
3. Verifica que todas las pruebas pasen:
   - ✅ Conexión a Supabase
   - ✅ Tabla users
   - ✅ Tabla reports
   - ✅ Usuarios en base de datos
   - ✅ Insertar usuario de prueba

Si alguna prueba falla, sigue las instrucciones en pantalla.

### Solución 5: Limpiar Caché y Reiniciar

```bash
# Detener el servidor (Ctrl + C)

# Limpiar caché
rm -rf node_modules/.vite

# Reiniciar
npm run dev

# Hard refresh en el navegador (Ctrl + Shift + R)
```

## 📊 Verificación Final

Después de aplicar las soluciones, verifica:

1. ✅ Puedes iniciar sesión con `carlos@seguridad.com`
2. ✅ El usuario aparece en la tabla `users` de Supabase con estado 'aprobado'
3. ✅ No hay errores en la consola del navegador
4. ✅ Puedes crear reportes sin errores

## 🎯 Flujo Esperado

Cuando inicies sesión con un usuario de prueba:

1. El sistema busca el usuario en la lista cargada
2. Si no existe, verifica si es un usuario de prueba conocido
3. Verifica si ya existe en Supabase
4. Si existe, lo aprueba automáticamente
5. Si no existe, lo crea y lo aprueba
6. Recarga la lista de usuarios
7. Inicia sesión exitosamente

## 📞 Si el Problema Persiste

Si después de seguir todos los pasos el error persiste:

1. **Copia TODOS los mensajes de la consola** (F12 → Console)
2. **Ejecuta el script de verificación** en Supabase:
   ```sql
   SELECT * FROM users WHERE email = 'carlos@seguridad.com';
   ```
3. **Comparte la siguiente información:**
   - Mensajes completos de la consola
   - Resultado de la consulta SQL
   - Captura de pantalla del error
   - Versión de Node: `node --version`
   - Versión de npm: `npm --version`

## 🔗 Recursos Adicionales

- [Documentación de Supabase RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [Códigos de error de PostgreSQL](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [Guía de troubleshooting de Supabase](https://supabase.com/docs/guides/troubleshooting)

---

**Última actualización:** Enero 2026  
**Versión:** 1.0
