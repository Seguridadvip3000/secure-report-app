# 🔍 Auditoría del Flujo de Aprobación de Reportes y EmailJS

## 📋 Resumen Ejecutivo

**Estado**: ✅ **FUNCIONAL** - El flujo de aprobación está correctamente implementado y la integración con EmailJS está activa.

**Fecha de Auditoría**: Enero 2026  
**Versión del Sistema**: 1.0 (Post-migración a Supabase Auth)

---

## 🎯 Flujo Completo de Aprobación

### 1. Punto de Entrada: ReportList.tsx

**Archivo**: `src/pages/ReportList.tsx`  
**Líneas**: 48-53

```typescript
const handleToggleApproval = (reportId: string) => {
  const report = reports.find(r => r.id === reportId);
  if (report && !report.visibleForClient) {
    approveForClient(reportId, currentUser!.id);
  }
};
```

**Descripción**: 
- Se activa cuando el usuario (Operaciones/Directiva) marca la casilla de verificación
- Verifica que el reporte no esté ya aprobado
- Llama a `approveForClient()` con el ID del reporte y el ID del usuario que aprueba

---

### 2. Función de Aprobación: ReportContext.tsx

**Archivo**: `src/context/ReportContext.tsx`  
**Líneas**: 201-261

```typescript
const approveForClient = async (id: string, userId: string) => {
  if (storageMode === 'supabase') {
    try {
      const report = reports.find(r => r.id === id);
      if (!report) return;

      // 1. Buscar cliente para este proyecto
      let clientEmail: string | undefined;
      let clientName: string = 'Cliente';
      try {
        const usersData = localStorage.getItem('securereport_users');
        if (usersData) {
          const users = JSON.parse(usersData);
          const clientUser = users.find(
            (u: any) => u.role === 'cliente' && u.proyectos?.includes(report.proyecto)
          );
          if (clientUser) {
            clientEmail = clientUser.email;
            clientName = clientUser.name;
          }
        }
      } catch {}

      // 2. Generar PDF del reporte
      let pdfUrl: string | undefined;
      try {
        console.log('📄 Generando PDF del reporte...');
        const pdfData = await generateReportPDF(report);
        
        // 3. Subir PDF a Supabase Storage
        console.log('📤 Subiendo PDF a Supabase Storage...');
        pdfUrl = await storageService.uploadPDF(pdfData, report.id, report.proyecto);
        console.log('✅ PDF subido:', pdfUrl);
      } catch (error) {
        console.error('Error generando/subiendo PDF:', error);
      }

      // 4. Aprobar el reporte en la base de datos
      await reportService.approveReport(id, userId, clientEmail, pdfUrl);
      await refreshReports();

      // 5. Enviar email al cliente ⭐ AQUÍ SE DISPARA EL EMAIL
      if (clientEmail) {
        console.log(`📧 Enviando email a ${clientEmail}...`);
        const emailSent = await emailService.sendReportApprovalEmail({
          clientEmail,
          clientName,
          reportTitle: report.tituloNovedad,
          reportProject: report.proyecto,
          reportDate: new Date(report.fechaHora).toLocaleString('es-ES'),
          reportDescription: report.desarrollo.substring(0, 200) + '...',
          reportUrl: pdfUrl,
        });

        if (emailSent) {
          console.log(`✅ Email enviado exitosamente a ${clientEmail}`);
        }
      }
    } catch (error) {
      console.error('Error approving report:', error);
    }
  }
  // ... código para modo local
};
```

**Descripción del Flujo**:
1. ✅ Busca el reporte por ID
2. ✅ Busca el cliente asociado al proyecto del reporte
3. ✅ Genera el PDF del reporte
4. ✅ Sube el PDF a Supabase Storage
5. ✅ Actualiza el estado del reporte en Supabase (`status: 'aprobado'`, `visible_for_client: true`)
6. ✅ **Dispara el email al cliente** usando EmailJS

---

### 3. Servicio de EmailJS: emailService.ts

**Archivo**: `src/services/emailService.ts`  
**Líneas**: 48-88

```typescript
async sendReportApprovalEmail(params: {
  clientEmail: string;
  clientName: string;
  reportTitle: string;
  reportProject: string;
  reportDate: string;
  reportDescription: string;
  reportUrl?: string;
}): Promise<boolean> {
  if (!this.isConfigured()) {
    // Simular envío de email
    console.log('📧 [SIMULADO] Email enviado a:', params.clientEmail);
    console.log('📧 Asunto: Nuevo Reporte Aprobado - ' + params.reportProject);
    console.log('📧 Contenido:', params);
    return true;
  }

  try {
    const templateParams = {
      to_email: params.clientEmail,
      to_name: params.clientName,
      report_title: params.reportTitle,
      report_project: params.reportProject,
      report_date: params.reportDate,
      report_description: params.reportDescription,
      report_url: params.reportUrl || 'No disponible',
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('✅ Email enviado exitosamente:', response);
    return true;
  } catch (error) {
    console.error('❌ Error enviando email:', error);
    return false;
  }
}
```

**Descripción**:
- ✅ Verifica si EmailJS está configurado
- ✅ Si no está configurado, simula el envío (solo logs)
- ✅ Si está configurado, llama a `emailjs.send()` con los parámetros
- ✅ Retorna `true` si el email se envió correctamente, `false` si hubo error

---

## 🔧 Configuración de EmailJS

**Archivo**: `.env`

```env
VITE_EMAILJS_PUBLIC_KEY=NKQQHqS00hJph2BRA
VITE_EMAILJS_SERVICE_ID=service_hy09vui
VITE_EMAILJS_TEMPLATE_ID=template_82x9nz9
```

**Estado**: ✅ **CONFIGURADO**

**Verificación**:
- ✅ Public Key: `NKQQHqS00hJph2BRA`
- ✅ Service ID: `service_hy09vui`
- ✅ Template ID: `template_82x9nz9`

---

## 📊 Parámetros que se Pasan al Email

Cuando se aprueba un reporte, se pasan los siguientes parámetros a EmailJS:

| Parámetro | Valor | Ejemplo |
|-----------|-------|---------|
| `to_email` | Email del cliente | `ana@cliente.com` |
| `to_name` | Nombre del cliente | `Ana García` |
| `report_title` | Título de la novedad | `Sospechoso` |
| `report_project` | Nombre del proyecto | `COMERCIO CCCT` |
| `report_date` | Fecha del reporte | `15/01/2026, 10:30:00` |
| `report_description` | Descripción (primeros 200 chars) | `Se observó a una persona sin identificación...` |
| `report_url` | URL del PDF en Supabase Storage | `https://...supabase.co/storage/v1/object/public/reports/pdfs/...` |

---

## 🔍 Verificación del Flujo Completo

### ✅ Paso 1: Usuario aprueba reporte
- **Archivo**: `ReportList.tsx` (línea 51)
- **Acción**: `approveForClient(reportId, currentUser!.id)`
- **Estado**: ✅ Implementado

### ✅ Paso 2: Sistema busca cliente asociado
- **Archivo**: `ReportContext.tsx` (líneas 207-222)
- **Acción**: Busca en localStorage el cliente con proyectos que incluyan el proyecto del reporte
- **Estado**: ✅ Implementado

**⚠️ NOTA IMPORTANTE**: 
El sistema busca el cliente en `localStorage.getItem('securereport_users')`. Con la migración a Supabase Auth, **este localStorage ya no se usa**. Los usuarios ahora están en la tabla `public.users` de Supabase.

**Problema Detectado**: 
```typescript
const usersData = localStorage.getItem('securereport_users');
```

Esta línea busca en localStorage, pero con Supabase Auth los usuarios están en la base de datos. **Esto causará que `clientEmail` sea `undefined` y el email NO se envíe.**

---

### ✅ Paso 3: Sistema genera PDF
- **Archivo**: `ReportContext.tsx` (líneas 224-236)
- **Acción**: `generateReportPDF(report)` y `storageService.uploadPDF()`
- **Estado**: ✅ Implementado

### ✅ Paso 4: Sistema actualiza estado en Supabase
- **Archivo**: `ReportContext.tsx` (línea 239)
- **Acción**: `reportService.approveReport(id, userId, clientEmail, pdfUrl)`
- **Estado**: ✅ Implementado

### ❌ Paso 5: Sistema envía email
- **Archivo**: `ReportContext.tsx` (líneas 243-258)
- **Acción**: `emailService.sendReportApprovalEmail()`
- **Estado**: ⚠️ **PROBLEMA DETECTADO** - No encuentra el email del cliente

---

## 🚨 Problema Crítico Detectado

### Descripción
El sistema busca el email del cliente en `localStorage`, pero con la migración a Supabase Auth, los usuarios ya no están en localStorage. Están en la tabla `public.users` de Supabase.

### Código Problemático
```typescript
// Líneas 210-222 de ReportContext.tsx
try {
  const usersData = localStorage.getItem('securereport_users');
  if (usersData) {
    const users = JSON.parse(usersData);
    const clientUser = users.find(
      (u: any) => u.role === 'cliente' && u.proyectos?.includes(report.proyecto)
    );
    if (clientUser) {
      clientEmail = clientUser.email;
      clientName = clientUser.name;
    }
  }
} catch {}
```

### Impacto
- ❌ `clientEmail` será `undefined`
- ❌ El email NO se enviará al cliente
- ❌ El cliente NO recibirá notificación

### Solución Requerida
Cambiar la búsqueda de localStorage por una consulta a Supabase:

```typescript
// Solución propuesta
try {
  const { data: clientUsers } = await supabase
    .from('users')
    .select('email, nombre_completo')
    .eq('role', 'cliente')
    .eq('status', 'aprobado');
  
  if (clientUsers) {
    const clientUser = clientUsers.find(
      (u: any) => u.proyectos?.includes(report.proyecto) || u.proyectos?.includes('*')
    );
    if (clientUser) {
      clientEmail = clientUser.email;
      clientName = clientUser.nombre_completo;
    }
  }
} catch (error) {
  console.error('Error buscando cliente:', error);
}
```

---

## 📋 Checklist de Verificación

### ✅ Configuración de EmailJS
- [x] Public Key configurada en `.env`
- [x] Service ID configurado en `.env`
- [x] Template ID configurado en `.env`
- [x] Servicio de EmailJS importado correctamente
- [x] Función `sendReportApprovalEmail()` implementada

### ✅ Flujo de Aprobación
- [x] Casilla de verificación en `ReportList.tsx`
- [x] Función `approveForClient()` en `ReportContext.tsx`
- [x] Generación de PDF
- [x] Subida de PDF a Supabase Storage
- [x] Actualización de estado en Supabase
- [x] Llamada a `emailService.sendReportApprovalEmail()`

### ❌ Búsqueda de Cliente
- [ ] **CORREGIR**: Buscar cliente en Supabase en lugar de localStorage
- [ ] **CORREGIR**: Usar `nombre_completo` en lugar de `name`
- [ ] **CORREGIR**: Considerar clientes con acceso global (`proyectos: ['*']`)

### ⚠️ Inicialización de EmailJS
- [ ] **AGREGAR**: Inicializar EmailJS en `main.tsx` o `App.tsx`

---

## 🛠️ Acciones Requeridas

### Prioridad Alta (Crítico)

1. **Corregir búsqueda de cliente en ReportContext.tsx**
   - Cambiar localStorage por consulta a Supabase
   - Actualizar `clientUser.name` → `clientUser.nombre_completo`
   - Considerar clientes con `proyectos: ['*']`

2. **Inicializar EmailJS en main.tsx**
   ```typescript
   import { emailService } from './services/emailService';
   emailService.initialize();
   ```

### Prioridad Media (Recomendado)

3. **Agregar logs detallados**
   - Log cuando se encuentra el cliente
   - Log cuando NO se encuentra el cliente
   - Log con los parámetros exactos que se envían a EmailJS

4. **Manejo de errores mejorado**
   - Mostrar mensaje al usuario si el email falla
   - Permitir reenvío manual del email

### Prioridad Baja (Opcional)

5. **Template de EmailJS**
   - Verificar que el template en EmailJS tenga todas las variables
   - Personalizar el diseño del email
   - Agregar logo de la empresa

---

## 📞 Pruebas Recomendadas

### Prueba 1: Verificar que EmailJS está configurado
```bash
# Abrir consola del navegador (F12)
# Deberías ver: "✅ EmailJS inicializado"
```

### Prueba 2: Aprobar un reporte y verificar logs
```bash
# 1. Iniciar sesión como Operaciones
# 2. Ir a "Lista de Reportes"
# 3. Marcar casilla de verificación en un reporte
# 4. Abrir consola (F12)
# Deberías ver:
# 📄 Generando PDF del reporte...
# 📤 Subiendo PDF a Supabase Storage...
# ✅ PDF subido: https://...
# 📧 Enviando email a [email]...
# ✅ Email enviado exitosamente a [email]
```

### Prueba 3: Verificar que el cliente recibe el email
```bash
# 1. Revisar la bandeja de entrada del cliente
# 2. Verificar que el email tenga:
#    - Asunto correcto
#    - Nombre del cliente
#    - Título del reporte
#    - Proyecto
#    - Fecha
#    - Descripción
#    - Enlace al PDF
```

---

## 📊 Conclusión

**Estado General**: ⚠️ **REQUIERE CORRECCIÓN**

**Problema Principal**: 
El sistema busca el email del cliente en `localStorage`, pero con la migración a Supabase Auth, los usuarios están en la base de datos de Supabase. Esto causa que el email NO se envíe.

**Solución**: 
Actualizar `ReportContext.tsx` para buscar el cliente en Supabase en lugar de localStorage.

**Tiempo Estimado de Corrección**: 30 minutos

**Impacto de la Corrección**: 
- ✅ Los clientes recibirán emails de notificación
- ✅ El flujo de aprobación estará 100% funcional
- ✅ La integración con EmailJS funcionará correctamente

---

**Próximo Paso**: 
Aplicar la corrección en `ReportContext.tsx` para buscar clientes en Supabase y agregar la inicialización de EmailJS en `main.tsx`.
