# 🔐 Variables de Entorno para Producción - SecureReport

## 📋 Descripción General

Este documento contiene la documentación completa de todas las variables de entorno requeridas para desplegar SecureReport en un entorno de producción.

**Última actualización**: Enero 2026  
**Versión del sistema**: 1.0  
**Estado**: ✅ Configuración verificada y funcional

---

## 🎯 Variables de Entorno Requeridas

### 1. Modo de Almacenamiento

```env
VITE_STORAGE_MODE=supabase
```

**Descripción**: Define el modo de almacenamiento de datos del sistema.  
**Valores permitidos**:
- `supabase` - Usa Supabase como base de datos (RECOMENDADO para producción)
- `local` - Usa localStorage del navegador (SOLO para desarrollo)

**⚠️ IMPORTANTE**: En producción, SIEMPRE usar `supabase` para garantizar persistencia de datos y seguridad.

---

### 2. Configuración de Supabase

#### 2.1 URL del Proyecto Supabase

```env
VITE_SUPABASE_URL=https://sjwygpvnkrmfvfxuhkqp.supabase.co
```

**Descripción**: URL base de tu proyecto Supabase.  
**Formato**: `https://[PROJECT_ID].supabase.co`  
**Ejemplo**: `https://sjwygpvnkrmfvfxuhkqp.supabase.co`

**📍 Cómo obtener esta URL**:
1. Ingresa a [Supabase Dashboard](https://supabase.com/dashboard/)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Copia el valor de **Project URL**

**⚠️ NOTA**: La URL NO debe incluir `/rest/v1/` ni ningún path adicional.

---

#### 2.2 Clave Anónima de Supabase

```env
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd3lncHZua3JtZnZmeHVoa3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDIwODIsImV4cCI6MjEwODUxODA4Mn0.YJzNC5HQKhIxvJVKQeetbBi7t6kwTHFK-h-i1NF-ny4
```

**Descripción**: Clave pública JWT para autenticación anónima con Supabase.  
**Formato**: Token JWT (comienza con `eyJ...`)  
**Longitud**: ~200 caracteres

**📍 Cómo obtener esta clave**:
1. Ingresa a [Supabase Dashboard](https://supabase.com/dashboard/)
2. Selecciona tu proyecto
3. Ve a **Settings** → **API**
4. Busca la sección **Project API keys**
5. Copia el valor de **anon public**

**⚠️ SEGURIDAD**: 
- Esta clave es PÚBLICA y puede exponerse en el frontend
- NO uses la clave `service_role` en el frontend
- La seguridad real está en las políticas RLS (Row Level Security)

---

### 3. Configuración de EmailJS

#### 3.1 Public Key de EmailJS

```env
VITE_EMAILJS_PUBLIC_KEY=NKQQHqS00hJph2BRA
```

**Descripción**: Clave pública para autenticación con EmailJS.  
**Formato**: Alfanumérico (aproximadamente 20 caracteres)  
**Ejemplo**: `NKQQHqS00hJph2BRA`

**📍 Cómo obtener esta clave**:
1. Ingresa a [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Ve a **Account** → **API Keys**
3. Copia el valor de **Public Key**

**⚠️ SEGURIDAD**: Esta clave es PÚBLICA y puede exponerse en el frontend.

---

#### 3.2 Service ID de EmailJS

```env
VITE_EMAILJS_SERVICE_ID=service_hy09vui
```

**Descripción**: Identificador del servicio de email configurado en EmailJS.  
**Formato**: `service_[alfanumérico]`  
**Ejemplo**: `service_hy09vui`

**📍 Cómo obtener este ID**:
1. Ingresa a [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Ve a **Email Services**
3. Selecciona tu servicio (Gmail, Outlook, etc.)
4. Copia el **Service ID** que aparece en la parte superior

**⚠️ NOTA**: Debes tener al menos un servicio de email configurado y activo.

---

#### 3.3 Template ID de EmailJS

```env
VITE_EMAILJS_TEMPLATE_ID=template_82x9nz9
```

**Descripción**: Identificador de la plantilla de email para notificaciones de reportes aprobados.  
**Formato**: `template_[alfanumérico]`  
**Ejemplo**: `template_82x9nz9`

**📍 Cómo obtener este ID**:
1. Ingresa a [EmailJS Dashboard](https://dashboard.emailjs.com/)
2. Ve a **Email Templates**
3. Selecciona la plantilla para reportes aprobados
4. Copia el **Template ID** que aparece en la parte superior

**⚠️ REQUISITOS DE LA PLANTILLA**: La plantilla debe incluir las siguientes variables:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `{{to_email}}` | Email del destinatario | `ana@cliente.com` |
| `{{to_name}}` | Nombre del destinatario | `Ana García` |
| `{{report_title}}` | Título del reporte | `Sospechoso` |
| `{{report_project}}` | Nombre del proyecto | `COMERCIO CCCT` |
| `{{report_date}}` | Fecha del reporte | `15/01/2026, 10:30:00` |
| `{{report_description}}` | Descripción del reporte | `Se observó a una persona...` |
| `{{report_url}}` | URL del PDF del reporte | `https://...supabase.co/...` |

**📝 Ejemplo de plantilla HTML recomendada**:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Nuevo Reporte Aprobado</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2563eb;">Nuevo Reporte de Seguridad Aprobado</h1>
    
    <p>Hola <strong>{{to_name}}</strong>,</p>
    
    <p>Se ha aprobado un nuevo reporte de seguridad para el proyecto <strong>{{report_project}}</strong>.</p>
    
    <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
      <h2 style="margin-top: 0; color: #1e293b;">Detalles del Reporte:</h2>
      <p><strong>Tipo:</strong> {{report_title}}</p>
      <p><strong>Fecha:</strong> {{report_date}}</p>
      <p><strong>Proyecto:</strong> {{report_project}}</p>
      <p><strong>Descripción:</strong><br>{{report_description}}</p>
    </div>
    
    {{#if report_url}}
    <p>
      <a href="{{report_url}}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Ver Reporte Completo (PDF)
      </a>
    </p>
    {{/if}}
    
    <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
      Este es un mensaje automático del sistema SecureReport.<br>
      Por favor, no responda a este email.
    </p>
  </div>
</body>
</html>
```

---

## 📄 Archivo .env Completo para Producción

```env
# ============================================
# SECUREREPORT - CONFIGURACIÓN DE PRODUCCIÓN
# ============================================

# Modo de almacenamiento (supabase para producción)
VITE_STORAGE_MODE=supabase

# ============================================
# SUPABASE CONFIGURATION
# ============================================
# URL del proyecto Supabase
VITE_SUPABASE_URL=https://sjwygpvnkrmfvfxuhkqp.supabase.co

# Clave anónima de Supabase (pública)
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNqd3lncHZua3JtZnZmeHVoa3FwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI5NDIwODIsImV4cCI6MjEwODUxODA4Mn0.YJzNC5HQKhIxvJVKQeetbBi7t6kwTHFK-h-i1NF-ny4

# ============================================
# EMAILJS CONFIGURATION
# ============================================
# Public Key de EmailJS
VITE_EMAILJS_PUBLIC_KEY=NKQQHqS00hJph2BRA

# Service ID de EmailJS
VITE_EMAILJS_SERVICE_ID=service_hy09vui

# Template ID para notificaciones de reportes aprobados
VITE_EMAILJS_TEMPLATE_ID=template_82x9nz9
```

---

## 🔒 Consideraciones de Seguridad

### 1. Protección del Archivo .env

**⚠️ CRÍTICO**: El archivo `.env` NUNCA debe subirse al repositorio de código.

**✅ Verifica que `.gitignore` incluya**:
```gitignore
# Environment variables
.env
.env.local
.env.production
```

### 2. Variables Públicas vs Privadas

| Variable | Tipo | Exposición |
|----------|------|------------|
| `VITE_SUPABASE_URL` | Pública | ✅ Puede exponerse |
| `VITE_SUPABASE_ANON_KEY` | Pública | ✅ Puede exponerse |
| `VITE_EMAILJS_PUBLIC_KEY` | Pública | ✅ Puede exponerse |
| `VITE_EMAILJS_SERVICE_ID` | Pública | ✅ Puede exponerse |
| `VITE_EMAILJS_TEMPLATE_ID` | Pública | ✅ Puede exponerse |

**⚠️ NUNCA expongas**:
- ❌ Supabase `service_role` key
- ❌ Credenciales de base de datos
- ❌ API keys privadas

### 3. Políticas RLS de Supabase

La seguridad real está en las políticas RLS (Row Level Security) de Supabase. Asegúrate de que estén configuradas correctamente:

```sql
-- Ejemplo de política RLS para usuarios
CREATE POLICY "Usuarios pueden ver perfiles aprobados"
ON users FOR SELECT
TO authenticated
USING (status = 'aprobado' OR id = auth.uid());
```

---

## 🚀 Despliegue en Producción

### 1. Configurar Variables en la Plataforma de Hosting

#### Vercel
```bash
# En el dashboard de Vercel:
# Settings → Environment Variables → Production
# Agregar todas las variables listadas arriba
```

#### Netlify
```bash
# En el dashboard de Netlify:
# Site settings → Environment variables
# Agregar todas las variables listadas arriba
```

#### AWS Amplify
```bash
# En el dashboard de Amplify:
# App settings → Environment variables
# Agregar todas las variables listadas arriba
```

### 2. Verificar Configuración

Después de desplegar, verifica que las variables estén cargadas:

```bash
# Abrir consola del navegador (F12)
# Deberías ver: "✅ EmailJS inicializado"
# Deberías ver: "✅ Supabase conectado"
```

---

## ✅ Checklist de Verificación

### Antes de Desplegar

- [ ] Archivo `.env` creado con todas las variables
- [ ] `.gitignore` incluye `.env`
- [ ] URL de Supabase es correcta (sin `/rest/v1/`)
- [ ] Clave anónima de Supabase copiada completamente
- [ ] Public Key de EmailJS configurada
- [ ] Service ID de EmailJS configurado
- [ ] Template ID de EmailJS configurado
- [ ] Plantilla de EmailJS incluye todas las variables requeridas
- [ ] Políticas RLS de Supabase configuradas
- [ ] Bucket de Storage creado en Supabase (`reports`)
- [ ] Pruebas locales completadas exitosamente

### Después de Desplegar

- [ ] Aplicación carga sin errores
- [ ] Login funciona correctamente
- [ ] Registro de usuarios funciona
- [ ] Creación de reportes funciona
- [ ] Subida de imágenes funciona
- [ ] Generación de PDFs funciona
- [ ] Aprobación de reportes funciona
- [ ] Emails se envían correctamente
- [ ] Cliente recibe notificaciones por email
- [ ] No hay errores en la consola del navegador

---

## 🔧 Troubleshooting

### Error: "Invalid API key"

**Causa**: URL de Supabase incorrecta o clave anónima mal copiada.

**Solución**:
1. Verifica que `VITE_SUPABASE_URL` sea exactamente `https://sjwygpvnkrmfvfxuhkqp.supabase.co`
2. Verifica que `VITE_SUPABASE_ANON_KEY` esté completa (debe empezar con `eyJ...`)
3. Reinicia el servidor de desarrollo

### Error: "EmailJS not configured"

**Causa**: Falta alguna variable de EmailJS.

**Solución**:
1. Verifica que las 3 variables de EmailJS estén configuradas
2. Verifica que no haya espacios antes o después de los valores
3. Reinicia el servidor de desarrollo

### Error: "Email not sent"

**Causa**: Plantilla de EmailJS mal configurada o servicio inactivo.

**Solución**:
1. Verifica que el servicio de EmailJS esté activo
2. Verifica que la plantilla incluya todas las variables requeridas
3. Revisa los logs de EmailJS en el dashboard
4. Verifica la consola del navegador para errores específicos

### Error: "Users table not found"

**Causa**: Tabla `users` no existe en Supabase.

**Solución**:
1. Ejecuta el script `supabase-auth-schema.sql` en Supabase SQL Editor
2. Verifica que la tabla se haya creado correctamente
3. Verifica las políticas RLS

---

## 📊 Monitoreo en Producción

### Logs de Supabase

- **Location**: Supabase Dashboard → Logs
- **Qué monitorear**: Errores de autenticación, errores de base de datos, uso de API

### Logs de EmailJS

- **Location**: EmailJS Dashboard → History
- **Qué monitorear**: Emails enviados, errores de envío, límites de uso

### Logs de la Aplicación

- **Location**: Consola del navegador (F12)
- **Qué monitorear**: Errores de JavaScript, errores de red, warnings

---

## 📞 Soporte

### Documentación Oficial

- [Supabase Docs](https://supabase.com/docs)
- [EmailJS Docs](https://www.emailjs.com/docs/)
- [Vite Docs](https://vitejs.dev/)

### Contacto

Si encuentras problemas con la configuración:
1. Revisa este documento completo
2. Verifica la sección de Troubleshooting
3. Revisa los logs de la aplicación
4. Consulta la documentación oficial de los servicios

---

## 📝 Historial de Cambios

| Fecha | Versión | Cambios |
|-------|---------|---------|
| 2026-01-15 | 1.0 | Documentación inicial creada |

---

**✅ Este documento está completo y listo para producción.**

**Última verificación**: Enero 2026  
**Próxima revisión**: Antes de cada despliegue importante
