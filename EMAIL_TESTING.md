# 🧪 Prueba de EmailJS

Este documento te guiará para probar que el sistema de emails está funcionando correctamente.

## ✅ Verificación de Configuración

Antes de probar, verifica que el archivo `.env` tiene las credenciales correctas:

```env
VITE_EMAILJS_PUBLIC_KEY=NKQQHqS00hJph2BRA
VITE_EMAILJS_SERVICE_ID=service_hy09vui
VITE_EMAILJS_TEMPLATE_ID=template_82x9nz9
```

## 📧 Prueba 1: Email de Reporte Aprobado

### Pasos:

1. **Inicia sesión como Líder**
   - Email: `carlos@seguridad.com`
   - Crea un nuevo reporte con:
     - Proyecto: Cualquiera
     - Tipo de novedad: Cualquiera
     - Descripción: "Prueba de email"
     - Sube 2 fotos de evidencia
     - Envía el reporte

2. **Inicia sesión como Operaciones**
   - Email: `roberto@operaciones.com`
   - Ve a "Lista de Reportes"
   - Busca el reporte que acabas de crear
   - Haz clic en la casilla de verificación ☑️ para aprobarlo

3. **Verifica el email**
   - Revisa la bandeja de entrada del cliente asignado a ese proyecto
   - Deberías recibir un email con:
     - Asunto: "Nuevo Reporte Aprobado - [Nombre del Proyecto]"
     - Contenido: Detalles del reporte
     - Enlace al PDF del reporte

4. **Verifica la consola del navegador**
   - Abre DevTools (F12)
   - Ve a la pestaña "Console"
   - Deberías ver mensajes como:
     ```
     📧 Enviando email a [email]...
     ✅ Email enviado exitosamente
     ```

## 📧 Prueba 2: Email de Aprobación de Usuario

### Pasos:

1. **Registra un nuevo usuario**
   - Cierra sesión
   - Ve a "Registrarse"
   - Completa el formulario con un email real (puede ser el tuyo)
   - Selecciona cualquier rol
   - Envía el registro

2. **Inicia sesión como Directiva**
   - Email: `directiva@seguridad.com`
   - Ve a "Aprobaciones"
   - Busca el usuario que acabas de registrar
   - Haz clic en "Aprobar"

3. **Verifica el email**
   - Revisa la bandeja de entrada del email que usaste para registrarte
   - Deberías recibir un email de confirmación

## 🔍 Solución de Problemas

### El email no llega

1. **Verifica la consola del navegador**
   - Abre DevTools (F12)
   - Busca errores relacionados con EmailJS
   - Mensajes comunes:
     - "Invalid public key" → Revisa VITE_EMAILJS_PUBLIC_KEY
     - "Service not found" → Revisa VITE_EMAILJS_SERVICE_ID
     - "Template not found" → Revisa VITE_EMAILJS_TEMPLATE_ID

2. **Verifica el dashboard de EmailJS**
   - Ve a https://dashboard.emailjs.com/
   - Revisa la sección "Analytics" o "Logs"
   - Verifica si los emails se están enviando
   - Revisa si hay errores

3. **Verifica la carpeta de spam**
   - A veces los emails automáticos llegan a spam
   - Revisa la carpeta de spam/correo no deseado

4. **Verifica las variables de entorno**
   - Asegúrate de que el servidor de desarrollo se reinició después de actualizar `.env`
   - Las variables de entorno solo se cargan al iniciar el servidor

### Error: "Template variables not found"

Esto significa que el template en EmailJS no tiene las variables correctas.

**Variables requeridas en el template:**
- `{{to_email}}` - Email del destinatario
- `{{to_name}}` - Nombre del destinatario
- `{{report_title}}` - Título del reporte
- `{{report_project}}` - Nombre del proyecto
- `{{report_date}}` - Fecha del reporte
- `{{report_description}}` - Descripción del reporte
- `{{report_url}}` - URL del PDF (opcional)

**Solución:**
1. Ve a EmailJS → Email Templates
2. Edita el template `template_82x9nz9`
3. Asegúrate de que todas las variables estén en el contenido
4. Guarda los cambios

### Error: "Service not configured"

Esto significa que el servicio de email no está configurado correctamente.

**Solución:**
1. Ve a EmailJS → Email Services
2. Verifica que `service_hy09vui` esté activo
3. Verifica que esté conectado a tu cuenta de email
4. Envía un email de prueba desde el dashboard de EmailJS

## 📊 Estadísticas de EmailJS

Con el plan gratuito de EmailJS tienes:
- ✅ 200 emails por mes
- ✅ 2 templates
- ✅ 1 servicio de email

Para ver tus estadísticas:
1. Ve a https://dashboard.emailjs.com/
2. Revisa la sección "Analytics"
3. Verás cuántos emails has enviado este mes

## 🎯 Próximos Pasos

Una vez que confirmes que los emails funcionan:

1. **Personaliza los templates**
   - Cambia los colores para que coincidan con tu marca
   - Agrega tu logo
   - Modifica el texto según tus necesidades

2. **Agrega más templates**
   - Email de bienvenida para nuevos usuarios
   - Email de reporte rechazado
   - Email de recordatorio

3. **Configura dominios personalizados**
   - Usa tu propio dominio para los emails
   - Mejora la deliverability

## 📞 Soporte

Si tienes problemas:
1. Revisa la documentación de EmailJS: https://www.emailjs.com/docs/
2. Verifica los logs en el dashboard de EmailJS
3. Revisa la consola del navegador para errores específicos

---

**¡Listo!** Ahora tu sistema de notificaciones por email está completamente funcional. 🎉
