# 📧 Configuración de EmailJS para Notificaciones

EmailJS permite enviar emails directamente desde el frontend sin necesidad de un backend.

## 🎯 ¿Qué Lograrás?

- ✅ Emails reales a clientes cuando se aprueban reportes
- ✅ Notificaciones a Directiva cuando hay usuarios pendientes
- ✅ Confirmaciones de aprobación de usuarios
- ✅ Todo sin backend adicional

## 📋 Paso 1: Crear Cuenta en EmailJS

1. Ve a [https://www.emailjs.com/](https://www.emailjs.com/)
2. Haz clic en **"Sign Up"** (registro gratuito hasta 200 emails/mes)
3. Completa el registro con tu email

## 📧 Paso 2: Crear un Email Service

1. En el dashboard de EmailJS, ve a **"Email Services"**
2. Haz clic en **"Add New Service"**
3. Selecciona tu proveedor de email:
   - **Gmail** (recomendado)
   - Outlook
   - Yahoo
   - Otro
4. Conecta tu cuenta de email
5. Una vez conectado, copia el **Service ID** (ejemplo: `service_abc123`)

## 📝 Paso 3: Crear Templates de Email

Necesitas crear 3 templates diferentes:

### Template 1: Reporte Aprobado (para Clientes)

1. Ve a **"Email Templates"**
2. Haz clic en **"Create New Template"**
3. Configura así:

**Template Name:** `Reporte Aprobado`

**Subject:**
```
Nuevo Reporte Aprobado - {{report_project}}
```

**Content (HTML):**
```html
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #2563eb;">Nuevo Reporte de Seguridad Aprobado</h2>
  
  <p>Hola <strong>{{to_name}}</strong>,</p>
  
  <p>Se ha aprobado un nuevo reporte de seguridad para el proyecto <strong>{{report_project}}</strong>.</p>
  
  <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <h3 style="margin-top: 0; color: #1e293b;">Detalles del Reporte:</h3>
    <p><strong>Tipo:</strong> {{report_title}}</p>
    <p><strong>Fecha:</strong> {{report_date}}</p>
    <p><strong>Proyecto:</strong> {{report_project}}</p>
    <p><strong>Descripción:</strong><br>{{report_description}}</p>
  </div>
  
  {{#if report_url}}
  <p><a href="{{report_url}}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">Ver Reporte Completo (PDF)</a></p>
  {{/if}}
  
  <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
    Este es un mensaje automático del sistema SecureReport.<br>
    Por favor, no responda a este email.
  </p>
</body>
</html>
```

4. Guarda el template y copia el **Template ID** (ejemplo: `template_xyz789`)

### Template 2: Usuario Pendiente (para Directiva)

1. Crea otro template nuevo
2. **Template Name:** `Usuario Pendiente de Aprobación`

**Subject:**
```
Nuevo Usuario Pendiente de Aprobación
```

**Content (HTML):**
```html
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #f59e0b;">Nuevo Usuario Pendiente de Aprobación</h2>
  
  <p>Se ha registrado un nuevo usuario que requiere su aprobación:</p>
  
  <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Nombre:</strong> {{user_name}}</p>
    <p><strong>Email:</strong> {{user_email}}</p>
    <p><strong>Teléfono:</strong> {{user_phone}}</p>
    <p><strong>Rol:</strong> {{user_role}}</p>
  </div>
  
  <p>Por favor, ingrese al sistema para aprobar o rechazar este usuario.</p>
  
  <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
    Sistema SecureReport
  </p>
</body>
</html>
```

3. Guarda y copia el **Template ID** (ejemplo: `template_user_pending`)

### Template 3: Usuario Aprobado (para el nuevo usuario)

1. Crea otro template nuevo
2. **Template Name:** `Cuenta Aprobada`

**Subject:**
```
¡Tu cuenta ha sido aprobada!
```

**Content (HTML):**
```html
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #10b981;">¡Bienvenido a SecureReport!</h2>
  
  <p>Hola <strong>{{to_name}}</strong>,</p>
  
  <p>Tu cuenta ha sido aprobada exitosamente.</p>
  
  <div style="background-color: #d1fae5; padding: 15px; border-radius: 8px; margin: 20px 0;">
    <p><strong>Tu rol:</strong> {{user_role}}</p>
    <p>Ya puedes iniciar sesión en el sistema.</p>
  </div>
  
  <p>Si tienes alguna pregunta, contacta al administrador del sistema.</p>
  
  <p style="margin-top: 30px; color: #64748b; font-size: 12px;">
    Sistema SecureReport
  </p>
</body>
</html>
```

3. Guarda y copia el **Template ID** (ejemplo: `template_user_approved`)

## 🔑 Paso 4: Obtener Public Key

1. Ve a **"Account"** en el menú de EmailJS
2. Busca la sección **"API Keys"**
3. Copia el **Public Key** (es una cadena larga)

## 📝 Paso 5: Actualizar archivo .env

Abre el archivo `.env` en la raíz de tu proyecto y agrega:

```env
# EmailJS Configuration
VITE_EMAILJS_PUBLIC_KEY=tu_public_key_aqui
VITE_EMAILJS_SERVICE_ID=service_abc123
VITE_EMAILJS_TEMPLATE_ID=template_xyz789
```

**IMPORTANTE:**
- Reemplaza `tu_public_key_aqui` con tu Public Key
- Reemplaza `service_abc123` con tu Service ID
- Reemplaza `template_xyz789` con el Template ID del template de "Reporte Aprobado"

## ✅ Paso 6: Reiniciar la Aplicación

```bash
# Detener el servidor (Ctrl + C)
# Luego iniciar de nuevo
npm run dev
```

## 🧪 Paso 7: Probar el Sistema

1. Inicia sesión como **Operaciones** o **Directiva**
2. Ve a "Lista de Reportes"
3. Aprueba un reporte marcando la casilla ☑️
4. Revisa la consola del navegador (F12)
5. Deberías ver: `✅ Email enviado exitosamente a [email del cliente]`
6. Revisa el email del cliente para ver la notificación

## 📊 Límites del Plan Gratuito

EmailJS ofrece en su plan gratuito:
- ✅ 200 emails por mes
- ✅ 1 servicio de email
- ✅ 2 templates
- ✅ Suficiente para pruebas y uso básico

Si necesitas más, puedes upgrading a un plan pago ($10/mes por 1000 emails).

## 🔧 Solución de Problemas

### Error: "Invalid Public Key"
- Verifica que copiaste correctamente el Public Key
- Asegúrate de que no haya espacios antes o después

### Error: "Service not found"
- Verifica que el Service ID es correcto
- Asegúrate de que el servicio está activo en EmailJS

### Error: "Template not found"
- Verifica que el Template ID es correcto
- Asegúrate de que el template existe en EmailJS

### Los emails no llegan
- Revisa la carpeta de spam del destinatario
- Verifica que el email del destinatario es correcto
- Revisa la consola del navegador para ver errores específicos

## 🎯 Próximos Pasos

Una vez configurado EmailJS:
- ✅ Los clientes recibirán emails reales cuando se aprueben reportes
- ✅ Los PDFs se adjuntarán como enlaces en el email
- ✅ Todo el flujo de notificaciones funcionará automáticamente

¡Listo! Tu sistema de notificaciones por email está completo.
