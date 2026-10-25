# SecureReport - Sistema de Gestión de Novedades

Sistema completo para gestión de reportes de novedades de seguridad con múltiples roles de usuario.

## 🎯 Características

- **4 roles de usuario**: Directiva, Operaciones, Líder, Cliente
- **Sistema de aprobación**: Los reportes deben ser aprobados antes de ser visibles para clientes
- **Evidencias fotográficas**: Soporte para múltiples fotos por reporte
- **Ubicación GPS**: Captura automática de coordenadas
- **Generación de PDF**: Reportes en formato PDF descargables
- **Notificaciones por email**: Simuladas (listas para integrar con servicio real)
- **44 proyectos**: Soporte para múltiples ubicaciones
- **17 tipos de novedades**: Categorización completa de incidentes

## 🚀 Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Supabase (Opcional pero recomendado)

#### Opción A: Usar Supabase (Producción)

1. Crea una cuenta en [Supabase](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y ejecuta el script en `supabase-schema.sql`
4. Copia tus credenciales de **Settings > API**
5. Crea un archivo `.env` en la raíz:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
VITE_STORAGE_MODE=supabase
```

6. Crea un bucket de almacenamiento llamado `reports` (público)

#### Opción B: Usar localStorage (Desarrollo)

Si no quieres configurar Supabase aún, el sistema funcionará con localStorage automáticamente.

### 3. Ejecutar la aplicación

```bash
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173) en tu navegador.

## 👥 Usuarios de Prueba

### Directiva (Administrador)
- **Email**: `directiva@seguridad.com`
- **Teléfono**: `+58 414 000 0000`
- **Acceso**: Todo (aprobar usuarios, ver todos los reportes, configuración)

### Operaciones
- **Email**: `roberto@operaciones.com`
- **Teléfono**: `+58 414 345 6789`
- **Acceso**: Crear reportes, ver todos los reportes, aprobar reportes para clientes

### Líder
- **Email**: `carlos@seguridad.com`
- **Teléfono**: `+58 414 123 4567`
- **Acceso**: Solo crear reportes

### Cliente
- **Email**: `ana@cliente.com`
- **Teléfono**: `+58 414 456 7890`
- **Acceso**: Solo ver reportes aprobados de sus proyectos

## 📋 Flujo de Trabajo

### 1. Registro de Usuarios
- Los usuarios se registran con: rol, nombre, teléfono, email
- Líderes y Clientes también seleccionan proyectos asignados
- La Directiva debe aprobar cada registro

### 2. Creación de Reportes (Líder/Operaciones/Directiva)
- Fecha y hora: automática
- Proyecto: selección de 44 opciones
- Título de novedad: selección de 17 tipos
- Desarrollo: texto libre
- Evidencias: mínimo 2 fotos (cámara o galería)
- Ubicación GPS: automática al enviar
- Quien reporta: automático del usuario logueado

### 3. Aprobación de Reportes (Operaciones/Directiva)
- Ven todos los reportes en tiempo real
- Marcan casilla de verificación para aprobar
- Al aprobar, el reporte se hace visible para el cliente
- Se envía notificación por email (simulada)

### 4. Visualización de Clientes
- Solo ven reportes aprobados de sus proyectos asignados
- Pueden descargar PDF de cada reporte
- Ven toda la información incluyendo evidencias y GPS

### 5. Panel de Configuración (Solo Directiva)
- Protegido con clave: `SeguridadVip3OOO`
- Gestión de usuarios (ver, eliminar)
- Gestión de reportes (ver, eliminar)

## 🗄️ Estructura de Base de Datos

### Tabla `users`
```sql
- id (UUID)
- name (TEXT)
- email (TEXT, UNIQUE)
- phone (TEXT, UNIQUE)
- role (TEXT: lider, cliente, operaciones, directiva)
- status (TEXT: pendiente, aprobado, rechazado)
- proyectos (TEXT[])
- created_at (TIMESTAMPTZ)
- approved_at (TIMESTAMPTZ)
- approved_by (UUID)
- rejection_reason (TEXT)
```

### Tabla `reports`
```sql
- id (UUID)
- fecha_hora (TIMESTAMPTZ)
- proyecto (TEXT)
- titulo_novedad (TEXT)
- desarrollo (TEXT)
- evidencias (TEXT[])
- ubicacion_gps (JSONB)
- quien_reporta (TEXT)
- created_by (UUID)
- status (TEXT: pendiente, en_proceso, resuelto, aprobado, rechazado)
- created_at (TIMESTAMPTZ)
- notes (TEXT)
- approved_by_operaciones (UUID)
- approved_at_operaciones (TIMESTAMPTZ)
- visible_for_client (BOOLEAN)
- pdf_url (TEXT)
- email_enviado_a (TEXT)
- email_enviado_at (TIMESTAMPTZ)
```

## 🔧 Configuración Avanzada

### Variables de Entorno

```env
# Modo de almacenamiento
VITE_STORAGE_MODE=supabase  # o 'local'

# Supabase (si usas Supabase)
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key

# Email (para notificaciones reales - futuro)
VITE_EMAIL_SERVICE_API_KEY=tu_api_key
```

### Modos de Almacenamiento

- **local**: Usa localStorage (desarrollo rápido, datos en navegador)
- **supabase**: Usa Supabase (producción, datos en nube)

El sistema detecta automáticamente si Supabase está configurado y lo usa. Si no, usa localStorage.

## 📱 Proyectos Soportados

44 proyectos configurados incluyendo:
- Centros comerciales (CCCT, Centro Plaza, etc.)
- Hoteles (Hotel CCT, Hotel Cascada, etc.)
- Residencias (Resid. La Hacienda, etc.)
- Galpones industriales
- Entidades bancarias
- Y más...

## 🎨 Tipos de Novedades

17 tipos configurados:
- Hurto, Robo, Sospechoso
- Procedimiento Policial
- Daño a instalaciones/terceros
- Emergencias médicas
- Fallas de sistemas
- Fugas de fluidos
- Conato de incendio
- Y más...

## 🚀 Próximas Mejoras

- [ ] Integración con servicio de email real (SendGrid, AWS SES)
- [ ] Notificaciones push en tiempo real
- [ ] Dashboard con estadísticas y gráficos
- [ ] Exportación de reportes a Excel/CSV
- [ ] Sistema de comentarios en reportes
- [ ] Búsqueda avanzada con filtros
- [ ] Tema oscuro/claro
- [ ] Aplicación móvil nativa

## 📄 Documentación Adicional

- [Configuración de Supabase](SUPABASE_SETUP.md) - Guía detallada de configuración
- [Esquema SQL](supabase-schema.sql) - Script para crear tablas

## 🛠️ Tecnologías

- **Frontend**: React 18 + TypeScript + Vite
- **Estilos**: Tailwind CSS
- **Routing**: React Router v6
- **Iconos**: Lucide React
- **PDF**: jsPDF
- **Fechas**: date-fns
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **IDs**: UUID

## 📝 Licencia

Este proyecto es privado y confidencial.

## 🆘 Soporte

Para problemas o preguntas:
1. Revisa [SUPABASE_SETUP.md](SUPABASE_SETUP.md)
2. Consulta la consola del navegador (F12) para errores
3. Verifica los logs en el dashboard de Supabase

---

**Desarrollado para gestión profesional de novedades de seguridad**
