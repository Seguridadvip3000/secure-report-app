-- ============================================
-- SCRIPT PARA INSERTAR USUARIOS DE PRUEBA
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- para crear todos los usuarios de prueba automáticamente

-- 1. Directiva (Administrador)
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
ON CONFLICT (email) DO NOTHING;

-- 2. Operaciones
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
ON CONFLICT (email) DO NOTHING;

-- 3. Líder 1
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
ON CONFLICT (email) DO NOTHING;

-- 4. Líder 2
INSERT INTO users (name, email, phone, role, status, proyectos, created_at, approved_at, approved_by)
VALUES (
  'Luis Pérez',
  'luis@seguridad.com',
  '+58 414 234 5678',
  'lider',
  'aprobado',
  '{"CC VIZCAYA", "CC CONCRESA", "CENTRO PLAZA"}',
  NOW(),
  NOW(),
  'system'
)
ON CONFLICT (email) DO NOTHING;

-- 5. Cliente 1
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
ON CONFLICT (email) DO NOTHING;

-- 6. Cliente 2
INSERT INTO users (name, email, phone, role, status, proyectos, created_at, approved_at, approved_by)
VALUES (
  'Julia Mendoza',
  'julia@cliente.com',
  '+58 414 567 8901',
  'cliente',
  'aprobado',
  '{"CC VIZCAYA", "CC CONCRESA"}',
  NOW(),
  NOW(),
  'system'
)
ON CONFLICT (email) DO NOTHING;

-- 7. Cliente 3
INSERT INTO users (name, email, phone, role, status, proyectos, created_at, approved_at, approved_by)
VALUES (
  'María López',
  'maria@cliente.com',
  '+58 414 678 9012',
  'cliente',
  'aprobado',
  '{"HOTEL CCT"}',
  NOW(),
  NOW(),
  'system'
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- VERIFICAR QUE SE INSERTARON CORRECTAMENTE
-- ============================================
SELECT 
  name,
  email,
  role,
  status,
  proyectos,
  created_at
FROM users
ORDER BY created_at DESC;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Después de ejecutar este script deberías ver 7 usuarios
-- Todos con estado "aprobado"
