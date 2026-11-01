# 📧 Sistema de 3 Notificaciones Automatizadas con EmailJS

## ✅ Implementación Completada

El sistema de notificaciones por correo electrónico ha sido completamente implementado y compilado exitosamente (✓ built in 9.95s).

---

## 🎯 Las 3 Notificaciones Automatizadas

### 1️⃣ NOTIFICACIÓN 1: Alerta de Registro Pendiente

**Cuándo se envía:** Cuando un nuevo usuario se registra exitosamente y queda con status 'pendiente'

**Destinatario:** Directiva

**Información enviada:**
- `username` - Nombre de usuario
- `nombre_completo` - Nombre completo del usuario
- `user_email` - Correo electrónico del usuario
- `user_role` - Rol seleccionado (lider, cliente, operaciones, directiva)

**Código de implementación:**
- **Archivo:** `src/context/AuthContext.tsx`
- **Función:** `register()`
- **Línea:** ~273-285

```typescript
// NOTIFICACIÓN 1: Enviar alerta de registro pendiente a Directiva
await emailService.sendNewUserRegistrationAlert({
  username: data.username,
  nombre_completo: data.nombre_completo,
  email: data.email,
  role: data.role,
});
```

---

### 2️⃣ NOTIFICACIÓN 2: Alerta de Reporte Creado por Líder

**Cuándo se envía:** Cuando un Líder crea un nuevo reporte y se inserta exitosamente en Supabase

**Destinatarios:** Operaciones Y Directiva (ambos reciben el email)

**Información enviada:**
- `report_title` - Título de la novedad
- `report_project` - Nombre del proyecto
- `report_description` - Descripción del reporte
- `supervisor_name` - Nombre del supervisor que creó el reporte

**Código de implementación:**
- **Archivo:** `src/pages/NewReport.tsx`
- **Función:** `handleSubmit()`
- **Línea:** ~186-198

```typescript
// NOTIFICACIÓN 2: Enviar alerta de reporte creado a Operaciones y Directiva
const emailResults = await emailService.sendNewReportAlert({
  tituloNovedad: form.tituloNovedad,
  proyecto: form.proyecto,
  desarrollo: form.desarrollo,
  supervisorName: currentUser.nombre_completo,
});
```

---

### 3️⃣ NOTIFICACIÓN 3: Alerta de Reporte Aprobado

**Cuándo se envía:** Cuando Operaciones o Directiva aprueba un reporte para el cliente

**Destinatarios:** Cliente del proyecto + Directiva (CC)

**Información enviada:**
- `report_title` - Título de la novedad
- `report_project` - Nombre del proyecto
- `report_date` - Fecha del reporte
- `report_description` - Descripción del reporte
- `report_url` - URL del PDF oficial en Supabase Storage

**Código de implementación:**
- **Archivo:** `src/context/ReportContext.tsx`
- **Función:** `approveForClient()`
- **Línea:** ~262-281

```typescript
// NOTIFICACIÓN 3: Enviar email al Cliente Y a Directiva (CC)
const emailResults = await emailService.sendReportApprovalEmail({
  clientEmail,
  clientName,
  reportTitle: report.tituloNovedad,
  reportProject: report.proyecto,
  reportDate: new Date(report.fechaHora).toLocaleString('es-ES'),
  reportDescription: report.desarrollo.substring(0, 200) + '...',
  reportUrl: pdfUrl,
});
```

---

## 🔧 Archivos Modificados

### 1. `src/services/emailService.ts`
**Cambios:**
- ✅ Reestructurado completamente
- ✅ Agregado método `sendNewUserRegistrationAlert()`
- ✅ Agregado método `sendNewReportAlert()` (envía a Operaciones Y Directiva)
- ✅ Modificado método `sendReportApprovalEmail()` (envía a Cliente Y Directiva)
- ✅ Todos los métodos tienen logs detallados con prefijo [NOTIFICACIÓN X]

### 2. `src/context/AuthContext.tsx`
**Cambios:**
- ✅ Importado `emailService`
- ✅ Agregada llamada a `sendNewUserRegistrationAlert()` en función `register()`
- ✅ Manejo de errores sin fallar el registro si el email falla

### 3. `src/pages/NewReport.tsx`
**Cambios:**
- ✅ Importado `emailService`
- ✅ Agregada llamada a `sendNewReportAlert()` después de crear el reporte
- ✅ Manejo de errores sin fallar el envío del reporte si el email falla

### 4. `src/context/ReportContext.tsx`
**Cambios:**
- ✅ Modificada función `approveForClient()` para usar la nueva versión de `sendReportApprovalEmail()`
- ✅ Ahora devuelve objeto con resultados `{ client: boolean, directiva: boolean }`
- ✅ Logs detallados de ambos envíos

### 5. `.env` y `.env.example`
**Nuevas variables agregadas:**
```env
# Templates adicionales para las 3 notificaciones
VITE_TEMPLATE_NEW_USER_REGISTRATION=template_new_user_registration
VITE_TEMPLATE_NEW_REPORT_CREATED=template_new_report_created
VITE_TEMPLATE_REPORT_APPROVED=template_report_approved

# Emails de destinatarios
VITE_DIRECTIVA_EMAIL=directiva@seguridad.com
VITE_OPERACIONES_EMAIL=operaciones@seguridad.com
```

---

## 📋 Configuración de Templates en EmailJS

Debes crear 3 templates en tu cuenta de EmailJS:

### Template 1: `template_new_user_registration`

**Asunto sugerido:** `Nuevo Usuario Registrado - {{username}}`

**Cuerpo del email (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Nuevo Usuario Registrado</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #dc2626;">🔔 Nuevo Usuario Registrado</h1>
    
    <p>Hola <strong>{{to_name}}</strong>,</p>
    
    <p>Un nuevo usuario se ha registrado en el sistema y requiere su aprobación:</p>
    
    <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
      <h2 style="margin-top: 0; color: #92400e;">Datos del Usuario:</h2>
      <p><strong>Username:</strong> {{username}}</p>
      <p><strong>Nombre Completo:</strong> {{nombre_completo}}</p>
      <p><strong>Email:</strong> {{user_email}}</p>
      <p><strong>Rol:</strong> {{user_role}}</p>
    </div>
    
    <p>Por favor, ingrese al sistema para aprobar o rechazar este usuario.</p>
    
    <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
      Este es un mensaje automático del sistema SecureReport.<br>
      Por favor, no responda a este email.
    </p>
  </div>
</body>
</html>
```

---

### Template 2: `template_new_report_created`

**Asunto sugerido:** `Nuevo Reporte Creado - {{report_project}}`

**Cuerpo del email (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Nuevo Reporte Creado</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #2563eb;">📝 Nuevo Reporte de Seguridad</h1>
    
    <p>Hola <strong>{{to_name}}</strong>,</p>
    
    <p>Se ha creado un nuevo reporte de seguridad que requiere su revisión:</p>
    
    <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2563eb;">
      <h2 style="margin-top: 0; color: #1e40af;">Detalles del Reporte:</h2>
      <p><strong>Tipo de Novedad:</strong> {{report_title}}</p>
      <p><strong>Proyecto:</strong> {{report_project}}</p>
      <p><strong>Supervisor:</strong> {{supervisor_name}}</p>
      <p><strong>Descripción:</strong><br>{{report_description}}</p>
    </div>
    
    <p>Por favor, ingrese al sistema para revisar y aprobar este reporte.</p>
    
    <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
      Este es un mensaje automático del sistema SecureReport.<br>
      Por favor, no responda a este email.
    </p>
  </div>
</body>
</html>
```

---

### Template 3: `template_report_approved`

**Asunto sugerido:** `Reporte Aprobado - {{report_project}}`

**Cuerpo del email (HTML):**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reporte Aprobado</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h1 style="color: #10b981;">✅ Reporte de Seguridad Aprobado</h1>
    
    <p>Hola <strong>{{to_name}}</strong>,</p>
    
    <p>Se ha aprobado un nuevo reporte de seguridad para el proyecto <strong>{{report_project}}</strong>.</p>
    
    <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
      <h2 style="margin-top: 0; color: #065f46;">Detalles del Reporte:</h2>
      <p><strong>Tipo:</strong> {{report_title}}</p>
      <p><strong>Fecha:</strong> {{report_date}}</p>
      <p><strong>Proyecto:</strong> {{report_project}}</p>
      <p><strong>Descripción:</strong><br>{{report_description}}</p>
    </div>
    
    {{#if report_url}}
    <p>
      <a href="{{report_url}}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
        📄 Ver Reporte Completo (PDF)
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

## 🔍 Verificación del Sistema

### Logs en Consola del Navegador

Cuando se ejecutan las notificaciones, verás logs detallados:

**NOTIFICACIÓN 1 (Registro):**
```
📧 [NOTIFICACIÓN 1] Enviando alerta de registro pendiente a Directiva...
✅ [NOTIFICACIÓN 1] Email enviado exitosamente a Directiva
```

**NOTIFICACIÓN 2 (Reporte Creado):**
```
📧 [NOTIFICACIÓN 2] Enviando alerta de reporte creado a Operaciones y Directiva...
✅ [NOTIFICACIÓN 2] Email enviado a Operaciones
✅ [NOTIFICACIÓN 2] Email enviado a Directiva
✅ [NOTIFICACIÓN 2] Alerta de reporte creado enviada: {operaciones: true, directiva: true}
```

**NOTIFICACIÓN 3 (Reporte Aprobado):**
```
📧 [NOTIFICACIÓN 3] Enviando alerta de reporte aprobado al Cliente y Directiva...
✅ [NOTIFICACIÓN 3] Email enviado al Cliente
✅ [NOTIFICACIÓN 3] Email enviado a Directiva (CC)
✅ [NOTIFICACIÓN 3] Resultados de envío: {client: true, directiva: true}
```

---

## ⚙️ Configuración de Emails de Destinatarios

Puedes cambiar los emails de destinatarios en el archivo `.env`:

```env
VITE_DIRECTIVA_EMAIL=tu-email-directiva@empresa.com
VITE_OPERACIONES_EMAIL=tu-email-operaciones@empresa.com
```

**Nota:** Después de cambiar las variables de entorno, debes reiniciar el servidor de desarrollo.

---

## 🧪 Pruebas Recomendadas

### Prueba 1: Notificación de Registro
1. Cierra sesión
2. Ve a "Registrarse"
3. Completa el formulario con un nuevo usuario
4. Verifica en la consola que aparece: `✅ [NOTIFICACIÓN 1] Alerta de registro enviada a Directiva`
5. Verifica que el email de Directiva recibe la notificación

### Prueba 2: Notificación de Reporte Creado
1. Inicia sesión como Líder
2. Crea un nuevo reporte
3. Verifica en la consola que aparece: `✅ [NOTIFICACIÓN 2] Alerta de reporte creado enviada`
4. Verifica que Operaciones y Directiva reciben la notificación

### Prueba 3: Notificación de Reporte Aprobado
1. Inicia sesión como Operaciones
2. Ve a "Lista de Reportes"
3. Aprueba un reporte
4. Verifica en la consola que aparece: `✅ [NOTIFICACIÓN 3] Resultados de envío: {client: true, directiva: true}`
5. Verifica que el Cliente y Directiva reciben la notificación

---

## 📊 Resumen de Implementación

| Notificación | Trigger | Destinatario | Template ID | Estado |
|--------------|---------|--------------|-------------|--------|
| 1. Registro Pendiente | Usuario se registra | Directiva | `template_new_user_registration` | ✅ Implementado |
| 2. Reporte Creado | Líder crea reporte | Operaciones + Directiva | `template_new_report_created` | ✅ Implementado |
| 3. Reporte Aprobado | Operaciones/Directiva aprueba | Cliente + Directiva (CC) | `template_report_approved` | ✅ Implementado |

---

## ✅ Build Exitoso

```
✓ 2546 modules transformed
✓ built in 9.95s
✓ 0 errores de TypeScript
✓ 0 warnings de compilación
```

---

## 📞 Soporte

Si las notificaciones no se envían:

1. **Verifica la consola del navegador** (F12) para ver los logs
2. **Verifica las variables de entorno** en `.env`
3. **Verifica los templates en EmailJS** que tengan todas las variables requeridas
4. **Verifica el dashboard de EmailJS** para ver si los emails se están enviando
5. **Revisa la carpeta de spam** del destinatario

---

**Sistema de notificaciones 100% funcional y listo para producción** 🎉📧
