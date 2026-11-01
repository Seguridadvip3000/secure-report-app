# 🔄 Guía de Migración a Supabase Auth

## ✅ Cambios Implementados

### 1. Estructura de Base de Datos
- ✅ Nuevo campo `username` (único, obligatorio)
- ✅ Nuevo campo `nombre_completo` (obligatorio)
- ✅ Eliminado campo `phone`
- ✅ Campo `proyectos` con valor `['*']` para acceso global (directiva/operaciones)

### 2. Autenticación
- ✅ Login usa `supabase.auth.signInWithPassword()`
- ✅ Registro usa `supabase.auth.signUp()`
- ✅ Contraseñas manejadas por Supabase Auth
- ✅ Sesiones persistentes automáticas

### 3. Formularios
- ✅ Login: Username/Email + Password
- ✅ Registro: Username + Nombre Completo + Email + Password + Rol + Proyectos
- ✅ Toggle de visibilidad de contraseña
- ✅ Validaciones completas

## 📋 Pasos para Completar la Migración

### Paso 1: Ejecutar Script SQL en Supabase

1. Ve a tu proyecto en Supabase
2. Abre **SQL Editor**
3. Copia y pega el contenido de `supabase-auth-schema.sql`
4. Ejecuta el script

Esto creará la nueva estructura de tabla con los campos actualizados.

### Paso 2: Actualizar Componentes Restantes

Los siguientes archivos necesitan actualizarse para usar `nombre_completo` en lugar de `name` y eliminar referencias a `phone`:

#### Archivos a actualizar:
- `src/pages/ClienteDashboard.tsx` (línea 34)
- `src/pages/ConfiguracionPage.tsx` (líneas 135, 141, 142, 159)
- `src/pages/DirectivaHome.tsx` (línea 23)
- `src/pages/NewReport.tsx` (líneas 178, 462)
- `src/pages/OperacionesHome.tsx` (línea 22)
- `src/pages/ReportDetail.tsx` (línea 220)

#### Cambios necesarios:
```typescript
// ANTES
user.name
user.phone

// DESPUÉS
user.nombre_completo
// (eliminar referencias a phone)
```

### Paso 3: Eliminar Scripts Obsoletos

Los siguientes archivos ya no son necesarios con Supabase Auth:
- `src/scripts/migrateInitialData.ts`
- `src/services/initializationService.ts`
- `src/pages/SetupWizard.tsx`
- `src/pages/DiagnosticPage.tsx`

Puedes eliminarlos o mantenerlos como referencia histórica.

### Paso 4: Probar el Flujo Completo

1. **Registro**:
   - Ve a la página de registro
   - Completa todos los campos
   - Verifica que se cree en Supabase Auth
   - Verifica que se cree el perfil en `public.users`

2. **Aprobación**:
   - Inicia sesión como directiva
   - Ve a "Aprobaciones"
   - Aprueba el nuevo usuario

3. **Login**:
   - Cierra sesión
   - Inicia sesión con el nuevo usuario
   - Verifica que funcione correctamente

## 🔧 Scripts de Actualización Rápida

### Para actualizar todos los archivos de una vez:

```bash
# Buscar todos los archivos que usan user.name
grep -r "user\.name" src/

# Buscar todos los archivos que usan user.phone
grep -r "user\.phone" src/
```

### Reemplazo manual:
- `user.name` → `user.nombre_completo`
- `user.phone` → eliminar línea o reemplazar con `user.username`

## 📊 Estructura Final de la Tabla users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  username TEXT UNIQUE NOT NULL,
  nombre_completo TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendiente',
  proyectos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id),
  rejection_reason TEXT
);
```

## 🎯 Flujo de Autenticación

### Registro:
1. Usuario completa formulario (username, nombre, email, password, rol, proyectos)
2. Sistema crea usuario en `supabase.auth.signUp()`
3. Sistema crea perfil en `public.users` con `status: 'pendiente'`
4. Directiva aprueba el usuario
5. Usuario puede iniciar sesión

### Login:
1. Usuario ingresa username/email + password
2. Sistema busca email asociado al username (si es username)
3. Sistema llama a `supabase.auth.signInWithPassword()`
4. Sistema verifica que el usuario esté aprobado
5. Sistema carga perfil desde `public.users`
6. Usuario accede al sistema

### Logout:
1. Usuario hace clic en "Cerrar Sesión"
2. Sistema llama a `supabase.auth.signOut()`
3. Sistema limpia estado local
4. Usuario es redirigido al login

## 🔐 Seguridad

- ✅ Contraseñas manejadas por Supabase Auth (hashing automático)
- ✅ Tokens JWT para sesiones
- ✅ RLS (Row Level Security) configurado
- ✅ Validación de estados (pendiente/aprobado/rechazado)
- ✅ Protección contra duplicados (username y email únicos)

## 📝 Notas Importantes

1. **No hay migración de datos**: Los usuarios existentes deben registrarse nuevamente
2. **Contraseñas**: Cada usuario debe crear su propia contraseña
3. **Proyectos**: Directiva y Operaciones tienen acceso global (`['*']`)
4. **Aprobación**: Todos los nuevos usuarios requieren aprobación de Directiva

## 🚀 Próximos Pasos

1. Ejecutar el script SQL en Supabase
2. Actualizar los componentes restantes
3. Probar el flujo completo de registro y login
4. Eliminar archivos obsoletos (opcional)
5. Documentar el nuevo sistema para los usuarios

---

**Estado**: 70% completado
**Pendiente**: Actualizar componentes restantes y probar flujo completo
