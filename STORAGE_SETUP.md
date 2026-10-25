# 📦 Configuración de Supabase Storage

Supabase Storage permite almacenar archivos (imágenes y PDFs) en la nube.

## 🎯 ¿Qué Lograrás?

- ✅ Las evidencias fotográficas se guardan en la nube (no se pierden)
- ✅ Los PDFs generados se almacenan permanentemente
- ✅ Acceso rápido a las imágenes desde cualquier dispositivo
- ✅ Compresión automática de imágenes para optimizar espacio

## 📋 Paso 1: Crear el Bucket de Storage

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. En el menú lateral, haz clic en **"Storage"** (ícono de carpeta)
3. Haz clic en **"New bucket"**
4. Configura así:
   - **Name:** `reports`
   - **Public bucket:** ✅ Activado (importante para que las imágenes sean accesibles)
   - **File size limit:** `50MB` (o el límite que prefieras)
   - **Allowed MIME types:** Deja vacío para permitir todos los tipos
5. Haz clic en **"Create bucket"**

## 🔒 Paso 2: Configurar Políticas de Seguridad

Para que los usuarios puedan subir y ver archivos, necesitas crear políticas:

1. En el bucket `reports`, haz clic en **"Policies"**
2. Haz clic en **"New Policy"** → **"For full customization"**

### Política 1: Permitir SELECT (ver archivos)

```sql
CREATE POLICY "Permitir ver archivos públicos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'reports');
```

### Política 2: Permitir INSERT (subir archivos)

```sql
CREATE POLICY "Permitir subir archivos a usuarios autenticados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'reports');
```

### Política 3: Permitir DELETE (eliminar archivos)

```sql
CREATE POLICY "Permitir eliminar archivos a usuarios autenticados"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'reports');
```

**Nota:** Ejecuta cada política en el **SQL Editor** de Supabase.

## 📸 Paso 3: Verificar la Configuración

1. Ve a **Storage** en Supabase
2. Haz clic en el bucket `reports`
3. Deberías ver las carpetas:
   - `evidencias/` (para fotos)
   - `pdfs/` (para documentos PDF)

## 🚀 Paso 4: Probar la Subida de Archivos

1. Inicia la aplicación: `npm run dev`
2. Inicia sesión como **Líder** (`carlos@seguridad.com`)
3. Crea un nuevo reporte:
   - Selecciona un proyecto
   - Sube 2 fotos de evidencia
   - Completa todos los campos
   - Envía el reporte
4. Ve a Supabase → Storage → `reports` → `evidencias/`
5. Deberías ver las imágenes subidas con nombres como:
   ```
   [report-id]/[timestamp]_0.jpg
   [report-id]/[timestamp]_1.jpg
   ```

## 📊 Paso 5: Probar la Generación de PDF

1. Inicia sesión como **Operaciones** (`roberto@operaciones.com`)
2. Ve a "Lista de Reportes"
3. Marca la casilla ☑️ de un reporte para aprobarlo
4. Ve a Supabase → Storage → `reports` → `pdfs/`
5. Deberías ver el PDF generado:
   ```
   [report-id]/[timestamp]_[project-name].pdf
   ```

## 💾 Espacio de Almacenamiento

### Plan Gratuito de Supabase:
- ✅ 1 GB de almacenamiento
- ✅ 2 GB de transferencia mensual
- ✅ Suficiente para ~1000 reportes con imágenes

### Si Necesitas Más Espacio:
- **Pro Plan:** $25/mes por 100 GB
- **Team Plan:** $599/mes por 1 TB

## 🗜️ Compresión de Imágenes

El sistema comprime automáticamente las imágenes antes de subirlas:

- **Tamaño máximo:** 1 MB por imagen
- **Resolución máxima:** 1920px (ancho o alto)
- **Calidad:** 80% (balance entre calidad y tamaño)
- **Formato:** JPEG (mejor compresión)

Esto significa que incluso si subes una foto de 10 MB, se comprimirá a ~1 MB antes de subirla.

## 🔍 Estructura de Archivos

```
reports/
├── evidencias/
│   ├── [report-id-1]/
│   │   ├── [timestamp]_0.jpg
│   │   └── [timestamp]_1.jpg
│   └── [report-id-2]/
│       ├── [timestamp]_0.jpg
│       └── [timestamp]_1.jpg
└── pdfs/
    ├── [report-id-1]/
    │   └── [timestamp]_[project-name].pdf
    └── [report-id-2]/
        └── [timestamp]_[project-name].pdf
```

## 🎯 URLs Públicas

Las imágenes y PDFs tendrán URLs como:

```
https://[project-id].supabase.co/storage/v1/object/public/reports/evidencias/[report-id]/[timestamp]_0.jpg
```

Estas URLs se guardan en la base de datos y se muestran en la aplicación.

## 🔧 Solución de Problemas

### Error: "Bucket not found"
- Verifica que creaste el bucket `reports`
- Asegúrate de que el nombre sea exactamente `reports` (minúsculas)

### Error: "Permission denied"
- Verifica que las políticas de seguridad estén configuradas
- Asegúrate de que el bucket sea público

### Las imágenes no se muestran
- Verifica que las URLs en la base de datos sean correctas
- Revisa la consola del navegador para ver errores específicos
- Asegúrate de que el bucket sea público

### Error al subir PDFs
- Verifica que el bucket permita archivos PDF
- Revisa el tamaño del PDF (máximo recomendado: 10 MB)

## 📈 Monitoreo

En Supabase puedes ver:
- **Storage** → Estadísticas de uso
- **Logs** → Errores de subida
- **Database** → URLs guardadas en la tabla `reports`

## 🎉 ¡Listo!

Tu sistema de almacenamiento en la nube está completamente configurado:

✅ Imágenes comprimidas y subidas automáticamente
✅ PDFs generados y almacenados en la nube
✅ URLs públicas accesibles desde cualquier dispositivo
✅ Espacio optimizado con compresión inteligente
✅ Políticas de seguridad configuradas

Las evidencias fotográficas y los PDFs ahora persisten permanentemente en la nube.
