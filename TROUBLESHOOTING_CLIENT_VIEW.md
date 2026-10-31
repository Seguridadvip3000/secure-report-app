# 🔧 Troubleshooting: Cliente no ve reportes aprobados

## 🐛 Problema

El panel del cliente muestra "No hay reportes aprobados" aunque el contador indica que hay reportes verificados.

## 🔍 Diagnóstico

### Paso 1: Abrir la Consola del Navegador

1. Presiona `F12` o `Ctrl+Shift+I`
2. Ve a la pestaña **Console**
3. Limpia la consola (🚫)

### Paso 2: Iniciar Sesión como Cliente

1. Inicia sesión con `ana@cliente.com`
2. Observa los mensajes en la consola

### Paso 3: Analizar los Logs

Deberías ver mensajes como estos:

```
🔄 [ClienteDashboard] Componente montado, recargando reportes...
🔄 [ReportContext] Cargando reportes desde Supabase...
🔍 [reportService] Obteniendo todos los reportes desde Supabase...
✅ [reportService] Reportes obtenidos: X
📊 [reportService] Reportes aprobados/visibles: Y
  - "Título del reporte" | status: aprobado | visible: true | proyecto: ESTACIONAMIENTO CCCT
📄 [ReportContext] Reporte mapeado: "Título" - status: aprobado, visibleForClient: true, proyecto: ESTACIONAMIENTO CCCT
✅ [ReportContext] Total de reportes mapeados: X
🔍 [ClienteDashboard] Filtrando reportes...
📊 Total de reportes cargados: X
👤 Usuario actual: Ana García
📁 Proyectos del cliente: ["ESTACIONAMIENTO CCCT", "COMERCIO CCCT"]
📄 Reporte "Título" - visibleForClient: true, status: aprobado
📄 Reporte "Título" - proyecto: ESTACIONAMIENTO CCCT, coincide: true
✅ Reportes filtrados para el cliente: Y
✅ [ClienteDashboard] Reportes recargados exitosamente
```

## 🎯 Posibles Causas y Soluciones

### Causa 1: El reporte no tiene `visibleForClient = true`

**Síntoma en consola:**
```
📄 Reporte "Título" - visibleForClient: false, status: aprobado
```

**Solución:**
El reporte necesita ser aprobado por Operaciones o Directiva. Ve a la vista de Operaciones y marca la casilla de verificación del reporte.

### Causa 2: El reporte no tiene `status = 'aprobado'`

**Síntoma en consola:**
```
📄 Reporte "Título" - visibleForClient: true, status: pendiente
```

**Solución:**
El reporte necesita ser aprobado. Ve a la vista de Operaciones y aprueba el reporte.

### Causa 3: El proyecto del reporte no coincide con los proyectos del cliente

**Síntoma en consola:**
```
👤 Usuario actual: Ana García
📁 Proyectos del cliente: ["ESTACIONAMIENTO CCCT", "COMERCIO CCCT"]
📄 Reporte "Título" - proyecto: CC VIZCAYA, coincide: false
```

**Solución:**
El cliente no tiene asignado el proyecto del reporte. Necesitas:

1. **Opción A:** Asignar el proyecto al cliente en Supabase:
```sql
UPDATE users 
SET proyectos = array_append(proyectos, 'CC VIZCAYA')
WHERE email = 'ana@cliente.com';
```

2. **Opción B:** Crear el reporte en un proyecto que el cliente tenga asignado.

### Causa 4: Los reportes no se están cargando desde Supabase

**Síntoma en consola:**
```
❌ [ReportContext] Error cargando reportes desde Supabase: ...
```

**Solución:**
1. Verifica que las credenciales de Supabase sean correctas en `.env`
2. Verifica que la tabla `reports` exista en Supabase
3. Verifica las políticas RLS de la tabla `reports`

### Causa 5: El cliente no tiene proyectos asignados

**Síntoma en consola:**
```
👤 Usuario actual: Ana García
📁 Proyectos del cliente: []
📄 Reporte "Título" - cliente sin proyectos asignados, mostrando todos
```

**Solución:**
Asigna proyectos al cliente en Supabase:
```sql
UPDATE users 
SET proyectos = '{"ESTACIONAMIENTO CCCT", "COMERCIO CCCT"}'
WHERE email = 'ana@cliente.com';
```

## 🛠️ Solución Rápida: Verificar en Supabase

Ejecuta este SQL en Supabase para verificar el estado de los reportes:

```sql
-- Ver todos los reportes aprobados
SELECT 
  id,
  titulo_novedad,
  proyecto,
  status,
  visible_for_client,
  approved_by_operaciones,
  approved_at_operaciones,
  pdf_url,
  created_at
FROM reports
WHERE status = 'aprobado' OR visible_for_client = true
ORDER BY created_at DESC;
```

## 🛠️ Solución Rápida: Verificar Proyectos del Cliente

```sql
-- Ver proyectos asignados al cliente
SELECT 
  id,
  name,
  email,
  role,
  proyectos,
  status
FROM users
WHERE role = 'cliente';
```

## 🛠️ Solución Rápida: Forzar Aprobación de Reporte

Si un reporte tiene `visible_for_client = false` pero debería estar visible:

```sql
UPDATE reports
SET 
  visible_for_client = true,
  status = 'aprobado',
  approved_at_operaciones = NOW()
WHERE id = 'ID_DEL_REPORTE';
```

## 🔄 Recarga Manual

El ClienteDashboard ahora tiene un botón de **Recargar** en la esquina superior derecha. Úsalo para forzar una recarga de los reportes desde Supabase.

## 📊 Verificación Completa

Después de aplicar las soluciones, verifica:

1. ✅ El contador "Reportes Verificados" muestra el número correcto
2. ✅ La lista de reportes muestra los reportes aprobados
3. ✅ Los reportes mostrados coinciden con los proyectos del cliente
4. ✅ No hay errores en la consola del navegador

## 🎯 Flujo Esperado

1. **Líder** crea un reporte → status: `pendiente`, visibleForClient: `false`
2. **Operaciones** aprueba el reporte → status: `aprobado`, visibleForClient: `true`
3. **Cliente** ve el reporte en su panel (si coincide con sus proyectos)

## 📞 Si el Problema Persiste

Comparte la siguiente información:

1. **Logs completos de la consola** (F12 → Console)
2. **Resultado de la consulta SQL** de verificación de reportes
3. **Resultado de la consulta SQL** de verificación de proyectos del cliente
4. **Captura de pantalla** del panel del cliente

---

**Última actualización:** Enero 2026  
**Versión:** 1.0
