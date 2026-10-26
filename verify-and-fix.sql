-- ============================================
-- SCRIPT DE VERIFICACIÓN Y CONFIGURACIÓN
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para verificar y configurar todo lo necesario
-- para que funcione la creación de reportes

-- ============================================
-- 1. VERIFICAR USUARIOS
-- ============================================
SELECT 
  '=== USUARIOS EN EL SISTEMA ===' as info;

SELECT 
  id,
  name,
  email,
  role,
  status,
  proyectos,
  created_at
FROM users
ORDER BY created_at DESC;

-- ============================================
-- 2. VERIFICAR POLÍTICAS RLS DE USERS
-- ============================================
SELECT 
  '=== POLÍTICAS RLS DE USERS ===' as info;

SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- Si no hay políticas o están incompletas, ejecutar:
-- (Descomenta las siguientes líneas si es necesario)

/*
-- Permitir lectura a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden leer usuarios"
ON users
FOR SELECT
TO authenticated
USING (true);

-- Permitir inserción (registro)
CREATE POLICY "Cualquiera puede registrarse"
ON users
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Permitir actualización a usuarios autenticados
CREATE POLICY "Usuarios autenticados pueden actualizar usuarios"
ON users
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);
*/

-- ============================================
-- 3. VERIFICAR POLÍTICAS RLS DE REPORTS
-- ============================================
SELECT 
  '=== POLÍTICAS RLS DE REPORTS ===' as info;

SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'reports';

-- Si no hay políticas, ejecutar:
CREATE POLICY "Usuarios autenticados pueden crear reportes"
ON reports
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden leer reportes"
ON reports
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Usuarios autenticados pueden actualizar reportes"
ON reports
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden eliminar reportes"
ON reports
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 4. VERIFICAR BUCKET DE STORAGE
-- ============================================
SELECT 
  '=== BUCKETS DE STORAGE ===' as info;

SELECT 
  id,
  name,
  public,
  created_at
FROM storage.buckets;

-- Si no existe el bucket 'reports', crearlo manualmente desde:
-- Supabase Dashboard > Storage > New Bucket > Name: reports > Public: true

-- ============================================
-- 5. VERIFICAR POLÍTICAS DE STORAGE
-- ============================================
SELECT 
  '=== POLÍTICAS DE STORAGE ===' as info;

SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
AND schemaname = 'storage';

-- Si no hay políticas para el bucket 'reports', ejecutar:
CREATE POLICY "Permitir lectura pública de evidencias"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'reports');

CREATE POLICY "Permitir inserción de evidencias"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports');

CREATE POLICY "Permitir actualización de evidencias"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'reports');

CREATE POLICY "Permitir eliminación de evidencias"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'reports');

-- ============================================
-- 6. VERIFICAR ESTRUCTURA DE TABLA REPORTS
-- ============================================
SELECT 
  '=== ESTRUCTURA DE TABLA REPORTS ===' as info;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'reports'
ORDER BY ordinal_position;

-- ============================================
-- 7. VERIFICAR ESTRUCTURA DE TABLA USERS
-- ============================================
SELECT 
  '=== ESTRUCTURA DE TABLA USERS ===' as info;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ============================================
-- 8. CONTAR REPORTES EXISTENTES
-- ============================================
SELECT 
  '=== ESTADÍSTICAS DE REPORTES ===' as info;

SELECT 
  COUNT(*) as total_reportes,
  COUNT(CASE WHEN status = 'pendiente' THEN 1 END) as pendientes,
  COUNT(CASE WHEN status = 'aprobado' THEN 1 END) as aprobados,
  COUNT(CASE WHEN status = 'rechazado' THEN 1 END) as rechazados
FROM reports;

-- ============================================
-- 9. VERIFICAR USUARIO ESPECÍFICO (CARLOS)
-- ============================================
SELECT 
  '=== VERIFICANDO USUARIO CARLOS MARTÍNEZ ===' as info;

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

-- ============================================
-- 10. CREAR USUARIO CARLOS SI NO EXISTE
-- ============================================
-- Si la consulta anterior no devuelve resultados, ejecutar:

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
  NULL
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 11. VERIFICAR QUE TODO ESTÉ CONFIGURADO
-- ============================================
SELECT 
  '=== RESUMEN DE VERIFICACIÓN ===' as info;

SELECT 
  'Usuarios en sistema' as check_item,
  COUNT(*) as count
FROM users
UNION ALL
SELECT 
  'Políticas RLS en reports',
  COUNT(*)
FROM pg_policies
WHERE tablename = 'reports'
UNION ALL
SELECT 
  'Políticas RLS en users',
  COUNT(*)
FROM pg_policies
WHERE tablename = 'users'
UNION ALL
SELECT 
  'Buckets de storage',
  COUNT(*)
FROM storage.buckets
UNION ALL
SELECT 
  'Reportes en sistema',
  COUNT(*)
FROM reports;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
SELECT 
  '=== VERIFICACIÓN COMPLETADA ===' as info,
  'Revisa los resultados arriba para identificar problemas' as message;
