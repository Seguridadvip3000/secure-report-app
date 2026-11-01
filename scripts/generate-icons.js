#!/usr/bin/env node

/**
 * Script para descargar y generar íconos PWA
 * Ejecutar: node scripts/generate-icons.js
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const IMAGE_URL = 'https://image.qwenlm.ai/generated-images/baa20e03-cd2e-4ed8-aed2-43e6f332ca73/_result.png';

const sizes = [
  { size: 192, filename: 'icon-192.png' },
  { size: 512, filename: 'icon-512.png' }
];

console.log('🎨 Descargando ícono generado...');

const file = fs.createWriteStream(path.join(__dirname, '..', 'public', 'icon-original.png'));

https.get(IMAGE_URL, (response) => {
  response.pipe(file);
  
  file.on('finish', () => {
    file.close();
    console.log('✅ Imagen descargada: icon-original.png');
    console.log('');
    console.log('📝 Próximos pasos:');
    console.log('1. Abre icon-original.png en un editor de imágenes');
    console.log('2. Redimensiona a 192x192 y guarda como icon-192.png');
    console.log('3. Redimensiona a 512x512 y guarda como icon-512.png');
    console.log('4. Mueve ambos archivos a la carpeta public/');
    console.log('');
    console.log('💡 O usa una herramienta online como:');
    console.log('   https://www.iloveimg.com/resize-image');
    console.log('   https://resizeimage.net/');
  });
}).on('error', (err) => {
  console.error('❌ Error descargando imagen:', err.message);
  console.log('');
  console.log('📝 Alternativa: Descarga manualmente desde:');
  console.log(IMAGE_URL);
});
