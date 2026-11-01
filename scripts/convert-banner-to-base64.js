#!/usr/bin/env node

/**
 * Script para descargar el banner y convertirlo a Base64
 * Ejecutar: node scripts/convert-banner-to-base64.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const IMAGE_URL = 'https://image.qwenlm.ai/generated-images/4c1698d3-cf18-4052-be31-499102c03cba/_result.png';
const OUTPUT_PATH = path.join(__dirname, '..', 'src', 'utils', 'pdfGenerator.ts');

console.log('🎨 Descargando banner de Seguridad Vip 3000...');

const file = fs.createWriteStream(path.join(__dirname, '..', 'banner-temp.png'));

https.get(IMAGE_URL, (response) => {
  if (response.statusCode !== 200) {
    console.error('❌ Error al descargar la imagen:', response.statusCode);
    process.exit(1);
  }

  response.pipe(file);
  
  file.on('finish', () => {
    file.close();
    console.log('✅ Imagen descargada: banner-temp.png');
    
    // Convertir a Base64
    const imageBuffer = fs.readFileSync(path.join(__dirname, '..', 'banner-temp.png'));
    const base64String = imageBuffer.toString('base64');
    const base64DataUrl = `image/png;base64,${base64String}`;
    
    console.log('✅ Imagen convertida a Base64');
    console.log(`📏 Tamaño del Base64: ${(base64String.length / 1024).toFixed(2)} KB`);
    
    // Leer el archivo pdfGenerator.ts
    let pdfGeneratorContent = fs.readFileSync(OUTPUT_PATH, 'utf8');
    
    // Reemplazar la constante BANNER_BASE64
    const regex = /const BANNER_BASE64 = '[^']*';/;
    const newConstant = `const BANNER_BASE64 = '${base64DataUrl}';`;
    
    if (regex.test(pdfGeneratorContent)) {
      pdfGeneratorContent = pdfGeneratorContent.replace(regex, newConstant);
      fs.writeFileSync(OUTPUT_PATH, pdfGeneratorContent, 'utf8');
      console.log('✅ Archivo pdfGenerator.ts actualizado correctamente');
    } else {
      console.error('❌ No se encontró la constante BANNER_BASE64 en el archivo');
      process.exit(1);
    }
    
    // Eliminar archivo temporal
    fs.unlinkSync(path.join(__dirname, '..', 'banner-temp.png'));
    console.log('✅ Archivo temporal eliminado');
    
    console.log('\n🎉 ¡Proceso completado exitosamente!');
    console.log('📄 El banner ahora está embebido en el PDF de forma autónoma');
  });
}).on('error', (err) => {
  console.error('❌ Error descargando imagen:', err.message);
  fs.unlinkSync(path.join(__dirname, '..', 'banner-temp.png'));
  process.exit(1);
});
