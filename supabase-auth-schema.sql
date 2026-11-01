-- ============================================
-- NUEVA ESTRUCTURA DE TABLA USERS
-- ============================================
-- Ejecutar este script en Supabase SQL Editor

-- 1. Eliminar tabla anterior (si existe)
DROP TABLE IF EXISTS users CASCADE;

-- 2. Crear nueva tabla con estructura actualizada
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  nombre_completo TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('lider', 'cliente', 'operaciones', 'directiva')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
  proyectos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT
);

-- 3. Crear índices para mejor rendimiento
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);

-- 4. Habilitar Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 5. Crear políticas RLS
-- Permitir que usuarios autenticados lean sus propios datos y datos aprobados
CREATE POLICY "Usuarios pueden ver perfiles aprobados"
ON users FOR SELECT
TO authenticated
USING (status = 'aprobado' OR id = auth.uid());

-- Permitir que usuarios se inserten a sí mismos durante el registro
CREATE POLICY "Usuarios pueden crear su propio perfil"
ON users FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Permitir que la directiva actualice usuarios
CREATE POLICY "Directiva puede actualizar usuarios"
ON users FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'directiva'
    AND status = 'aprobado'
  )
);

-- Permitir que la directiva elimine usuarios
CREATE POLICY "Directiva puede eliminar usuarios"
ON users FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() 
    AND role = 'directiva'
    AND status = 'aprobado'
  )
);

-- 6. Función para manejar nuevos registros de autenticación
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- El perfil se crea manualmente durante el registro en la aplicación
  -- Esta función es solo un placeholder para futuras extensiones
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger para nuevos usuarios de Auth (opcional)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- La tabla está lista para usar con el nuevo sistema de autenticación
