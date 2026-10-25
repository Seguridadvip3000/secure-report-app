-- ============================================
-- INSTRUCCIONES PARA CREAR TABLAS EN SUPABASE
-- ============================================
-- 1. Ve a tu proyecto en Supabase (https://supabase.com)
-- 2. Ve a SQL Editor
-- 3. Copia y pega todo este script
-- 4. Ejecuta el script

-- ============================================
-- TABLA DE USUARIOS
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('lider', 'cliente', 'operaciones', 'directiva')),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
  proyectos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT
);

-- ============================================
-- TABLA DE REPORTES
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_hora TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  proyecto TEXT NOT NULL,
  titulo_novedad TEXT NOT NULL,
  desarrollo TEXT NOT NULL,
  evidencias TEXT[] DEFAULT '{}',
  ubicacion_gps JSONB NOT NULL DEFAULT '{"lat": 0, "lng": 0}',
  quien_reporta TEXT NOT NULL,
  created_by UUID REFERENCES users(id) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'resuelto', 'aprobado', 'rechazado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT,
  approved_by_operaciones UUID REFERENCES users(id),
  approved_at_operaciones TIMESTAMPTZ,
  visible_for_client BOOLEAN DEFAULT FALSE,
  pdf_url TEXT,
  email_enviado_a TEXT,
  email_enviado_at TIMESTAMPTZ
);

-- ============================================
-- ÍNDICES PARA MEJOR RENDIMIENTO
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_proyecto ON reports(proyecto);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_reports_visible_for_client ON reports(visible_for_client);

-- ============================================
-- HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS DE SEGURIDAD PARA USERS
-- ============================================

-- Todos los usuarios aprobados pueden leer usuarios
CREATE POLICY "Los usuarios aprobados pueden ver otros usuarios"
ON users FOR SELECT
TO authenticated
USING (status = 'aprobado');

-- Los usuarios pueden insertarse a sí mismos (registro)
CREATE POLICY "Cualquiera puede registrarse"
ON users FOR INSERT
TO anon
WITH CHECK (true);

-- Los usuarios pueden actualizar su propio perfil
CREATE POLICY "Usuarios pueden actualizar su perfil"
ON users FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text);

-- Solo directiva puede aprobar/rechazar usuarios
CREATE POLICY "Solo directiva puede aprobar usuarios"
ON users FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text 
    AND role = 'directiva'
  )
);

-- ============================================
-- POLÍTICAS DE SEGURIDAD PARA REPORTS
-- ============================================

-- Todos los usuarios aprobados pueden ver reportes
CREATE POLICY "Usuarios aprobados pueden ver reportes"
ON reports FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text 
    AND status = 'aprobado'
  )
);

-- Líder, operaciones y directiva pueden crear reportes
CREATE POLICY "Líder, operaciones y directiva pueden crear reportes"
ON reports FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text 
    AND role IN ('lider', 'operaciones', 'directiva')
    AND status = 'aprobado'
  )
);

-- Operaciones y directiva pueden aprobar reportes
CREATE POLICY "Operaciones y directiva pueden aprobar reportes"
ON reports FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid()::text 
    AND role IN ('operaciones', 'directiva')
    AND status = 'aprobado'
  )
);

-- ============================================
-- INSERTAR USUARIO DIRECTIVA INICIAL
-- ============================================
-- Este es el usuario administrador inicial
-- IMPORTANTE: Cambia el email y teléfono por los tuyos
INSERT INTO users (name, email, phone, role, status, proyectos, created_at, approved_at)
VALUES (
  'María Rodríguez',
  'directiva@seguridad.com',
  '+58 414 000 0000',
  'directiva',
  'aprobado',
  '{}',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- FUNCIÓN PARA OBTENER EL ROL DEL USUARIO
-- ============================================
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM users 
    WHERE id = auth.uid()::text 
    AND status = 'aprobado'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FIN DEL SCRIPT
-- ============================================
-- Después de ejecutar este script:
-- 1. Copia tu URL del proyecto y la anon key
-- 2. Crea un archivo .env en la raíz del proyecto
-- 3. Agrega:
--    VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
--    VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
