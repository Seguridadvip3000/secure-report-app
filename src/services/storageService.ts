import { supabase } from '../lib/supabase';
import imageCompression from 'browser-image-compression';

/**
 * Servicio mejorado para manejar archivos en Supabase Storage
 * Incluye compresión de imágenes y gestión de PDFs
 */
export const storageService = {
  /**
   * Comprimir imagen antes de subirla
   */
  async compressImage(file: File): Promise<File> {
    const options = {
      maxSizeMB: 1, // Máximo 1MB
      maxWidthOrHeight: 1920, // Máximo 1920px
      useWebWorker: true,
      fileType: 'image/jpeg',
      initialQuality: 0.8,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      console.log(`✅ Imagen comprimida: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`);
      return compressedFile;
    } catch (error) {
      console.error('Error comprimiendo imagen:', error);
      return file; // Si falla, usar la original
    }
  },

  /**
   * Subir una imagen al storage de Supabase
   * @returns URL pública de la imagen
   */
  async uploadImage(file: File, reportId: string, index: number): Promise<string> {
    try {
      // 1. Comprimir la imagen
      const compressedFile = await this.compressImage(file);

      // 2. Generar nombre único
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const fileName = `${reportId}/${timestamp}_${index}.${fileExt}`;
      const filePath = `evidencias/${fileName}`;

      // 3. Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, compressedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: compressedFile.type,
        });

      if (uploadError) {
        console.error('Error subiendo imagen:', uploadError);
        throw uploadError;
      }

      // 4. Obtener URL pública
      const { data } = supabase.storage
        .from('reports')
        .getPublicUrl(filePath);

      console.log(`✅ Imagen subida: ${data.publicUrl}`);
      return data.publicUrl;
    } catch (error) {
      console.error('Error en uploadImage:', error);
      throw error;
    }
  },

  /**
   * Subir múltiples imágenes
   * @returns Array de URLs públicas
   */
  async uploadMultipleImages(files: File[], reportId: string): Promise<string[]> {
    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const url = await this.uploadImage(files[i], reportId, i);
      urls.push(url);
    }

    return urls;
  },

  /**
   * Subir un PDF al storage de Supabase
   * @returns URL pública del PDF
   */
  async uploadPDF(pdfData: string, reportId: string, projectName: string): Promise<string> {
    try {
      // 1. Convertir data URL a Blob
      const response = await fetch(pdfData);
      const blob = await response.blob();

      // 2. Generar nombre del archivo
      const timestamp = Date.now();
      const safeProjectName = projectName.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `${reportId}/${timestamp}_${safeProjectName}.pdf`;
      const filePath = `pdfs/${fileName}`;

      // 3. Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf',
        });

      if (uploadError) {
        console.error('Error subiendo PDF:', uploadError);
        throw uploadError;
      }

      // 4. Obtener URL pública
      const { data } = supabase.storage
        .from('reports')
        .getPublicUrl(filePath);

      console.log(`✅ PDF subido: ${data.publicUrl}`);
      return data.publicUrl;
    } catch (error) {
      console.error('Error en uploadPDF:', error);
      throw error;
    }
  },

  /**
   * Eliminar un archivo del storage
   */
  async deleteFile(filePath: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from('reports')
        .remove([filePath]);

      if (error) {
        console.error('Error eliminando archivo:', error);
        throw error;
      }

      console.log(`✅ Archivo eliminado: ${filePath}`);
    } catch (error) {
      console.error('Error en deleteFile:', error);
      throw error;
    }
  },

  /**
   * Convertir base64 a File object
   */
  base64ToFile(base64String: string, filename: string): File {
    const arr = base64String.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new File([u8arr], filename, { type: mime });
  },

  /**
   * Subir imágenes desde base64 (para compatibilidad con código existente)
   */
  async uploadImagesFromBase64(base64Images: string[], reportId: string): Promise<string[]> {
    const urls: string[] = [];

    for (let i = 0; i < base64Images.length; i++) {
      const file = this.base64ToFile(base64Images[i], `evidence_${i}.jpg`);
      const url = await this.uploadImage(file, reportId, i);
      urls.push(url);
    }

    return urls;
  },
};
