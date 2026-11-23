import { jsPDF } from 'jspdf';

const cargarImagenBase64 = (url: string): Promise<string | null> => {
  return new Promise((resolve) => {
    if (!url) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
};

export async function generarPDFFichaTecnica(
  ficha: any,
  modo: 'DESCARGAR' | 'IMPRIMIR' = 'DESCARGAR'
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  const logoBase64 = await cargarImagenBase64('/logo-vip3000.jpg');
  const fotoCarnetBase64 = await cargarImagenBase64(ficha.foto_carnet_url || '');
  const fotoCedulaBase64 = await cargarImagenBase64(ficha.foto_cedula_url || '');

  // Encabezado corporativo
  doc.setFillColor(15, 23, 42);
  doc.rect(margin, 10, pageWidth - margin * 2, 24, 'F');

  if (logoBase64) {
    doc.addImage(logoBase64, 'JPEG', margin + 3, 12.5, 19, 19);
  }

  const xTit = logoBase64 ? margin + 26 : margin + 5;
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('FICHA TÉCNICA DE PERSONAL — SEGURIDAD VIP 3000 C.A.', xTit, 20);

  doc.setFontSize(8.5);
  doc.setTextColor(147, 197, 253);
  doc.text(
    `ESTATUS: ${String(ficha.estatus_seleccion || 'EN PROCESO').toUpperCase()}   •   C.I. ${ficha.nacionalidad || 'V'}-${ficha.cedula}`,
    xTit,
    27.5
  );

  let y = 39;

  const dibujarSeccion = (titulo: string) => {
    doc.setFillColor(30, 64, 175);
    doc.rect(margin, y, pageWidth - margin * 2, 6.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(titulo, margin + 3, y + 4.5);
    y += 9;
  };

  const dibujarCampo = (label: string, valor: any, x: number, yPos: number, anchoMax = 85) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`${label}:`, x, yPos);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    const valTexto = String(valor || 'N/A');
    const lineas = doc.splitTextToSize(valTexto, anchoMax);
    doc.text(lineas.at(0) || 'N/A', x + doc.getTextWidth(`${label}: `) + 1, yPos);
  };
  dibujarSeccion('1. DATOS DE IDENTIFICACIÓN Y PERFIL PERSONAL');

  // Recuadro Foto Carnet a la derecha
  if (fotoCarnetBase64) {
    doc.setDrawColor(203, 213, 225);
    doc.rect(pageWidth - margin - 30, y, 28, 34);
    doc.addImage(fotoCarnetBase64, 'JPEG', pageWidth - margin - 29.5, y + 0.5, 27, 33);
  }

  dibujarCampo('Nombres y Apellidos', `${ficha.nombres || ''} ${ficha.apellidos || ''}`, margin + 2, y + 3, 110);
  dibujarCampo('Cédula', `${ficha.nacionalidad || 'V'}-${ficha.cedula || ''}`, margin + 2, y + 8.5, 50);
  dibujarCampo('RIF', ficha.rif, margin + 75, y + 8.5, 55);
  dibujarCampo('Fecha Nacimiento', ficha.fecha_nacimiento, margin + 2, y + 14, 45);
  dibujarCampo('Sexo', ficha.sexo, margin + 75, y + 14, 30);
  dibujarCampo('Estado Civil', ficha.estado_civil, margin + 2, y + 19.5, 45);
  dibujarCampo('Carga Familiar', ficha.carga_familiar, margin + 75, y + 19.5, 45);
  dibujarCampo('Teléfono Celular', ficha.telefono_celular, margin + 2, y + 25, 45);
  dibujarCampo('Tel. Alternativo', ficha.telefono_alternativo, margin + 75, y + 25, 45);
  dibujarCampo('Correo Electrónico', ficha.correo_electronico, margin + 2, y + 30.5, 115);

  y += 37;
  dibujarSeccion('2. UBICACIÓN GEOGRÁFICA Y CONTACTOS DE EMERGENCIA');
  dibujarCampo('Estado / Municipio', `${ficha.estado_residencia || ''} / ${ficha.municipio || ''}`, margin + 2, y + 3, 85);
  dibujarCampo('Parroquia', ficha.parroquia, margin + 105, y + 3, 75);
  dibujarCampo('Dirección Exacta', ficha.direccion_domicilio, margin + 2, y + 8.5, 165);
  dibujarCampo('Punto de Referencia', ficha.punto_referencia, margin + 2, y + 14, 165);
  dibujarCampo(
    'Emergencia 1',
    `${ficha.contacto_emergencia_1_nombre || ''} (${ficha.contacto_emergencia_1_parentesco || ''}) - Tel: ${ficha.contacto_emergencia_1_telefono || ''}`,
    margin + 2,
    y + 19.5,
    165
  );
  dibujarCampo(
    'Emergencia 2',
    `${ficha.contacto_emergencia_2_nombre || 'N/A'} (${ficha.contacto_emergencia_2_parentesco || ''}) - Tel: ${ficha.contacto_emergencia_2_telefono || ''}`,
    margin + 2,
    y + 25,
    165
  );

  y += 30;
  dibujarSeccion('3. DATOS BANCARIOS PARA NÓMINA');
  dibujarCampo('Banco', ficha.banco, margin + 2, y + 3, 75);
  dibujarCampo('Tipo de Cuenta', ficha.tipo_cuenta, margin + 105, y + 3, 60);
  dibujarCampo('Número de Cuenta', ficha.numero_cuenta, margin + 2, y + 8.5, 85);
  dibujarCampo('Pago Móvil', ficha.telefono_pago_movil, margin + 105, y + 8.5, 65);

  y += 14;
  dibujarSeccion('4. FORMACIÓN, EXPERIENCIA EN SEGURIDAD Y ANTECEDENTES');
  dibujarCampo('Nivel de Estudios', ficha.nivel_estudios, margin + 2, y + 3, 65);
  dibujarCampo('Título u Oficio', ficha.titulo_oficio, margin + 105, y + 3, 75);
  dibujarCampo('Exp. Seguridad', ficha.experiencia_seguridad, margin + 2, y + 8.5, 45);
  dibujarCampo('Empresa Anterior', ficha.empresa_anterior, margin + 75, y + 8.5, 55);
  dibujarCampo('Tiempo Servicio', ficha.tiempo_servicio_anterior, margin + 145, y + 8.5, 40);
  dibujarCampo('Cursos / Certif.', ficha.cursos_certificaciones, margin + 2, y + 14, 165);
  dibujarCampo('Licencia Conducir', ficha.licencia_conducir, margin + 2, y + 19.5, 65);
  dibujarCampo('Antecedentes', ficha.verificacion_antecedentes, margin + 105, y + 19.5, 75);

  y += 25;
  dibujarSeccion('5. SALUD OCUPACIONAL Y DOTACIÓN (TALLAS)');
  dibujarCampo('Grupo Sanguíneo', ficha.grupo_sanguineo, margin + 2, y + 3, 35);
  dibujarCampo('Usa Lentes', ficha.usa_lentes, margin + 65, y + 3, 30);
  dibujarCampo('Estatura / Peso', `${ficha.estatura || 'N/A'} m / ${ficha.peso || 'N/A'} kg`, margin + 115, y + 3, 65);
  dibujarCampo(
    'Dotación',
    `Camisa: ${ficha.talla_camisa || 'N/A'}  |  Pantalón: ${ficha.talla_pantalon || 'N/A'}  |  Botas: ${ficha.talla_botas || 'N/A'}  |  Gorra: ${ficha.talla_gorra || 'N/A'}`,
    margin + 2,
    y + 8.5,
    175
  );
  dibujarCampo('Alergias / Salud', ficha.alergias_condiciones, margin + 2, y + 14, 165);
  dibujarCampo('Medicamentos', ficha.medicamentos_regulares, margin + 2, y + 19.5, 165);

  y += 25;
  dibujarSeccion('6. PROCESO DE SELECCIÓN Y PRE-ASIGNACIÓN OPERATIVA');
  dibujarCampo(
    'Entrevista Presencial',
    `${ficha.entrevista_presencial || 'PENDIENTE'} ${ficha.entrevista_observacion ? `(${ficha.entrevista_observacion})` : ''}`,
    margin + 2,
    y + 3,
    165
  );
  dibujarCampo(
    'Eval. Psicotécnica',
    `${ficha.evaluacion_psicotecnica || 'PENDIENTE'} ${ficha.psicotecnica_observacion ? `(${ficha.psicotecnica_observacion})` : ''}`,
    margin + 2,
    y + 8.5,
    165
  );
  dibujarCampo('Proyecto Asignado', ficha.proyecto_asignado || 'SIN ASIGNAR', margin + 2, y + 14, 80);
  dibujarCampo(
    'Cargo / Horario / Grp',
    `${ficha.cargo_asignado || 'N/A'} • ${ficha.turno_asignado || 'N/A'} • GRP ${ficha.grupo_asignado || 'N/A'}`,
    margin + 100,
    y + 14,
    80
  );

  if (fotoCedulaBase64 && y + 48 < 268) {
    y += 19;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('COPIA DE CÉDULA DE IDENTIDAD:', margin + 2, y + 3);
    doc.addImage(fotoCedulaBase64, 'JPEG', margin + 2, y + 5, 62, 38);
  }

  const nombreArchivo = `Ficha_Tecnica_${ficha.cedula}_${String(ficha.apellidos || '').replace(/\s+/g, '_')}.pdf`;
  if (modo === 'IMPRIMIR') {
    doc.autoPrint();
    window.open(doc.output('bloburl'), '_blank');
  } else {
    doc.save(nombreArchivo);
  }
}
