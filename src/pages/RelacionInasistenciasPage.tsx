  const rolActual = (currentUser?.role || '').toLowerCase();
  const puedeEditarTodo = ['directiva', 'administrador', 'admin'].includes(rolActual);
  const [modoEdicionTotal, setModoEdicionTotal] = useState<boolean>(false);
  const [modalExportarFormato, setModalExportarFormato] = useState<'EXCEL' | 'PDF' | null>(null);

  const actualizarCeldaDia = (
    quincena: '1RA' | '2DA',
    indexFila: number,
    campo: 'plazaDiurna' | 'plazaNocturna' | 'asistDiurna' | 'asistNocturna',
    nuevoValor: number
  ) => {
    const setter = quincena === '1RA' ? setFilas1ra : setFilas2da;
    setter((prev) =>
      prev.map((fila, idx) => {
        if (idx !== indexFila) return fila;
        const actualizada = { ...fila, [campo]: nuevoValor };
        actualizada.faltasDiurnas = actualizada.plazaDiurna - actualizada.asistDiurna;
        actualizada.faltasNocturnas = actualizada.plazaNocturna - actualizada.asistNocturna;
        actualizada.totalFaltas = actualizada.faltasDiurnas + actualizada.faltasNocturnas;
        return actualizada;
      })
    );
  };

  const exportarExcelInasistencias = async (alcance: '1RA' | '2DA' | 'MES') => {
    setModalExportarFormato(null);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(proyecto.slice(0, 28) || 'INASISTENCIAS', {
      views: [{ showGridLines: true }],
    });

    ws.columns = [
      { width: 10 },
      { width: 15 },
      { width: 15 },
      { width: 16 },
      { width: 17 },
      { width: 15 },
      { width: 16 },
      { width: 15 },
    ];

    try {
      const respLogo = await fetch('/logo-vip3000.jpg');
      if (respLogo.ok) {
        const arrayBuf = await respLogo.arrayBuffer();
        const imageId = wb.addImage({
          buffer: arrayBuf,
          extension: 'jpeg',
        });
        ws.addImage(imageId, {
          tl: { col: 0.2, row: 0.2 },
          ext: { width: 85, height: 75 },
        });
      }
    } catch {}

    ws.getRow(1).height = 24;
    ws.getRow(2).height = 22;
    ws.getRow(3).height = 22;
    ws.getRow(4).height = 14;

    ws.mergeCells('C1:H1');
    ws.getCell('C1').value = 'SEGURIDAD VIP 3000 C.A. — RIF: J-29491549-3';
    ws.getCell('C1').font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getCell('C1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    ws.getCell('C1').alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('C2:H2');
    ws.getCell('C2').value = 'RELACIÓN DE INASISTENCIAS (FALTAS ADMINISTRATIVAS)';
    ws.getCell('C2').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF93C5FD' } };
    ws.getCell('C2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    ws.getCell('C2').alignment = { vertical: 'middle', horizontal: 'center' };

    const etiquetaAlcance =
      alcance === '1RA' ? '1RA QUINCENA' : alcance === '2DA' ? '2DA QUINCENA' : 'MES COMPLETO';

    ws.mergeCells('C3:H3');
    ws.getCell('C3').value = `PROYECTO: ${proyecto.toUpperCase()}   |   ${etiquetaAlcance} — ${NOMBRES_MESES[mes - 1]} ${anio}`;
    ws.getCell('C3').font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF1E293B' } };
    ws.getCell('C3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    ws.getCell('C3').alignment = { vertical: 'middle', horizontal: 'center' };

    const bordeFino: Partial<ExcelJS.Borders> = {
      top: { style: 'thin', color: { argb: 'FF94A3B8' } },
      left: { style: 'thin', color: { argb: 'FF94A3B8' } },
      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
      right: { style: 'thin', color: { argb: 'FF94A3B8' } },
    };

    const escribirBloqueQuincena = (tituloQuincena: string, filas: FilaDiaInasistencia[]) => {
      const rBanner = ws.addRow([`${tituloQuincena} QUINCENA ${NOMBRES_MESES[mes - 1]} ${anio}`]);
      const idxBanner = rBanner.number;
      ws.mergeCells(`A${idxBanner}:H${idxBanner}`);
      rBanner.height = 22;
      const cellBanner = ws.getCell(`A${idxBanner}`);
      cellBanner.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cellBanner.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
      cellBanner.alignment = { vertical: 'middle', horizontal: 'center' };

      const rH1 = ws.addRow(['Día', 'PLAZA', '', 'ASISTENTES', '', 'Faltas', '', 'TOTAL']);
      const rH2 = ws.addRow(['', 'Diurnas', 'Nocturna', 'Diurna', 'Nocturna', 'Diurnas', 'Nocturnas', '']);
      const n1 = rH1.number;
      const n2 = rH2.number;

      ws.mergeCells(`A${n1}:A${n2}`);
      ws.mergeCells(`B${n1}:C${n1}`);
      ws.mergeCells(`D${n1}:E${n1}`);
      ws.mergeCells(`F${n1}:G${n1}`);
      ws.mergeCells(`H${n1}:H${n2}`);

      [rH1, rH2].forEach((row) => {
        row.height = 20;
        row.eachCell((cell) => {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFCBD5E1' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = bordeFino;
        });
      });

      filas.forEach((f) => {
        const r = ws.addRow([
          f.dia,
          f.plazaDiurna,
          f.plazaNocturna,
          f.asistDiurna,
          f.asistNocturna,
          f.faltasDiurnas,
          f.faltasNocturnas,
          f.totalFaltas,
        ]);
        r.height = 18;
        r.eachCell((cell, colNum) => {
          cell.font = { name: 'Calibri', size: 10, bold: colNum === 1 || colNum === 8 };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = bordeFino;
          if (colNum >= 6 && Number(cell.value || 0) > 0) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEE2E2' } };
            cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF991B1B' } };
          }
        });
      });

      const sumaTotal = filas.reduce((acc, x) => acc + x.totalFaltas, 0);
      const rTot = ws.addRow(['', '', '', '', '', '', `TOTAL ${tituloQuincena}:`, sumaTotal]);
      rTot.height = 21;
      rTot.eachCell((cell, colNum) => {
        cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
        cell.alignment = { vertical: 'middle', horizontal: colNum === 7 ? 'right' : 'center' };
        if (colNum >= 7) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          cell.border = bordeFino;
        }
      });

      ws.addRow([]);
    };

    if (alcance === '1RA' || alcance === 'MES') escribirBloqueQuincena('1RA', filas1ra);
    if (alcance === '2DA' || alcance === 'MES') escribirBloqueQuincena('2DA', filas2da);

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Relacion_Inasistencias_${proyecto.replace(/\s+/g, '_')}_${alcance}_${NOMBRES_MESES[mes - 1]}_${anio}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const exportarPDFInasistencias = async (alcance: '1RA' | '2DA' | 'MES') => {
    setModalExportarFormato(null);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const logo = await cargarLogoBase64();

    const etiquetaAlcance =
      alcance === '1RA' ? '1RA QUINCENA' : alcance === '2DA' ? '2DA QUINCENA' : 'MES COMPLETO';

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 216, 25, 'F');
    if (logo) {
      try {
        doc.addImage(logo, 'JPEG', 12, 3.5, 18, 18);
      } catch {}
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('SEGURIDAD VIP 3000 C.A. — RELACIÓN DE INASISTENCIAS', 35, 11);
    doc.setFontSize(9.5);
    doc.setTextColor(147, 197, 253);
    doc.text(`Proyecto: ${proyecto}  |  ${etiquetaAlcance} — ${NOMBRES_MESES[mes - 1]} ${anio}`, 35, 18);

    let y = 32;
    const dibujarTablaQuincena = (titulo: string, filas: FilaDiaInasistencia[]) => {
      if (y > 220) {
        doc.addPage();
        y = 18;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${titulo} ${NOMBRES_MESES[mes - 1]} ${anio}`, 14, y);
      y += 4;

      doc.setFillColor(226, 232, 240);
      doc.rect(14, y, 188, 6, 'F');
      doc.setFontSize(7.5);
      doc.text('Día', 18, y + 4);
      doc.text('PLAZA Diur.', 42, y + 4, { align: 'right' });
      doc.text('PLAZA Noct.', 68, y + 4, { align: 'right' });
      doc.text('ASIST. Diur.', 95, y + 4, { align: 'right' });
      doc.text('ASIST. Noct.', 122, y + 4, { align: 'right' });
      doc.text('Faltas Diur.', 148, y + 4, { align: 'right' });
      doc.text('Faltas Noct.', 175, y + 4, { align: 'right' });
      doc.text('TOTAL', 199, y + 4, { align: 'right' });
      y += 8;

      doc.setFont('helvetica', 'normal');
      filas.forEach((f) => {
        doc.text(String(f.dia), 18, y);
        doc.text(String(f.plazaDiurna), 42, y, { align: 'right' });
        doc.text(String(f.plazaNocturna), 68, y, { align: 'right' });
        doc.text(String(f.asistDiurna), 95, y, { align: 'right' });
        doc.text(String(f.asistNocturna), 122, y, { align: 'right' });
        doc.text(String(f.faltasDiurnas), 148, y, { align: 'right' });
        doc.text(String(f.faltasNocturnas), 175, y, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(String(f.totalFaltas), 199, y, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        y += 4.3;
      });

      const totQ = filas.reduce((a, b) => a + b.totalFaltas, 0);
      doc.setFont('helvetica', 'bold');
      doc.line(14, y - 2, 202, y - 2);
      doc.text(`TOTAL FALTAS ${titulo}:`, 150, y + 2, { align: 'right' });
      doc.text(String(totQ), 199, y + 2, { align: 'right' });
      y += 9;
    };

    if (alcance === '1RA' || alcance === 'MES') dibujarTablaQuincena('1RA QUINCENA', filas1ra);
    if (alcance === '2DA' || alcance === 'MES') dibujarTablaQuincena('2DA QUINCENA', filas2da);

    doc.save(`Relacion_Inasistencias_${proyecto.replace(/\s+/g, '_')}_${alcance}_${NOMBRES_MESES[mes - 1]}_${anio}.pdf`);
  };

  const renderTablaQuincena = (titulo: '1RA' | '2DA', filas: FilaDiaInasistencia[]) => {
    const totalQ = filas.reduce((acc, x) => acc + x.totalFaltas, 0);
    return (
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 overflow-x-auto space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase">
              {titulo} {NOMBRES_MESES[mes - 1]} {anio} — {proyecto}
            </h3>
            <p className="text-[11px] text-slate-500">
              Diurno incluye Líder QR + Diurnos • Nocturno incluye Nocturnos + Mixtos + 24X24.
            </p>
          </div>
          <span className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-black">
            TOTAL FALTAS: {totalQ}
          </span>
        </div>

        <table className="w-full text-xs text-center border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
              <th className="p-2 border">Día</th>
              <th className="p-2 border bg-blue-50">PLAZA Diurnas</th>
              <th className="p-2 border bg-indigo-50">PLAZA Nocturna</th>
              <th className="p-2 border bg-emerald-50">ASIST. Diurna</th>
              <th className="p-2 border bg-teal-50">ASIST. Nocturna</th>
              <th className="p-2 border bg-amber-50">Faltas Diurnas</th>
              <th className="p-2 border bg-orange-50">Faltas Nocturnas</th>
              <th className="p-2 border bg-slate-200 font-black">TOTAL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filas.map((f, idx) => (
              <tr key={f.dia} className="hover:bg-slate-50">
                <td className="p-1.5 border font-bold">{f.dia}</td>
                <td className="p-1 border">
                  {puedeEditarTodo && modoEdicionTotal ? (
                    <input
                      type="number"
                      value={f.plazaDiurna}
                      onChange={(e) => actualizarCeldaDia(titulo, idx, 'plazaDiurna', Number(e.target.value))}
                      className="w-12 text-center border border-blue-400 rounded py-0.5 font-bold bg-blue-50"
                    />
                  ) : (
                    f.plazaDiurna
                  )}
                </td>
                <td className="p-1 border">
                  {puedeEditarTodo && modoEdicionTotal ? (
                    <input
                      type="number"
                      value={f.plazaNocturna}
                      onChange={(e) => actualizarCeldaDia(titulo, idx, 'plazaNocturna', Number(e.target.value))}
                      className="w-12 text-center border border-indigo-400 rounded py-0.5 font-bold bg-indigo-50"
                    />
                  ) : (
                    f.plazaNocturna
                  )}
                </td>
                <td className="p-1 border font-semibold text-emerald-800">
                  {puedeEditarTodo && modoEdicionTotal ? (
                    <input
                      type="number"
                      value={f.asistDiurna}
                      onChange={(e) => actualizarCeldaDia(titulo, idx, 'asistDiurna', Number(e.target.value))}
                      className="w-12 text-center border border-emerald-400 rounded py-0.5 font-bold bg-emerald-50"
                    />
                  ) : (
                    f.asistDiurna
                  )}
                </td>
                <td className="p-1 border font-semibold text-teal-800">
                  {puedeEditarTodo && modoEdicionTotal ? (
                    <input
                      type="number"
                      value={f.asistNocturna}
                      onChange={(e) => actualizarCeldaDia(titulo, idx, 'asistNocturna', Number(e.target.value))}
                      className="w-12 text-center border border-teal-400 rounded py-0.5 font-bold bg-teal-50"
                    />
                  ) : (
                    f.asistNocturna
                  )}
                </td>
                <td className={`p-1.5 border font-bold ${f.faltasDiurnas > 0 ? 'text-red-600 bg-red-50' : ''}`}>
                  {f.faltasDiurnas}
                </td>
                <td className={`p-1.5 border font-bold ${f.faltasNocturnas > 0 ? 'text-red-600 bg-red-50' : ''}`}>
                  {f.faltasNocturnas}
                </td>
                <td className={`p-1.5 border font-black ${f.totalFaltas > 0 ? 'text-red-700 bg-red-100' : 'bg-slate-50'}`}>
                  {f.totalFaltas}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-amber-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
            Control Administrativo de Faltas — Operaciones, Directiva y Administración
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <ClipboardList className="text-amber-600" size={26} /> Relación de Inasistencias por Proyecto
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Refleja los días cerrados por la analista comparando plazas contratadas vs. asistencia real (Diurna con Líder QR y Nocturna/Mixta).
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {puedeEditarTodo && (
            <button
              type="button"
              onClick={() => setModoEdicionTotal(!modoEdicionTotal)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer ${
                modoEdicionTotal
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-900 border border-amber-300 hover:bg-amber-100'
              }`}
            >
              {modoEdicionTotal ? '✅ Finalizar Edición' : '✏️ Editar Celdas (Directiva)'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setModalExportarFormato('EXCEL')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet size={16} /> Exportar Excel
          </button>
          <button
            type="button"
            onClick={() => setModalExportarFormato('PDF')}
            className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
          >
            <FileText size={16} /> Exportar PDF
          </button>
        </div>
      </div>

      {mensaje && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold">
          {mensaje}
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2">
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
            <Building2 size={13} /> Proyecto
          </label>
          <select
            value={proyecto}
            onChange={(e) => setProyecto(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          >
            {listaProyectos.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Mes</label>
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          >
            {NOMBRES_MESES.map((m, idx) => (
              <option key={m} value={idx + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Año</label>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            className="w-full border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Plazas Diurnas</label>
          <input
            type="number"
            value={plazaDiurnaConfig}
            onChange={(e) => setPlazaDiurnaConfig(Number(e.target.value))}
            className="w-full border border-blue-300 bg-blue-50/50 rounded-xl px-3 py-2 text-xs font-black"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-indigo-800 uppercase mb-1">Plazas Noct./Mixtas</label>
          <div className="flex gap-1.5">
            <input
              type="number"
              value={plazaNocturnaConfig}
              onChange={(e) => setPlazaNocturnaConfig(Number(e.target.value))}
              className="w-full border border-indigo-300 bg-indigo-50/50 rounded-xl px-3 py-2 text-xs font-black"
            />
            <button
              type="button"
              onClick={guardarConfigPlazas}
              disabled={guardandoPlazas}
              title="Guardar Plazas Contratadas"
              className="px-3 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shrink-0"
            >
              <Save size={15} />
            </button>
          </div>
        </div>
      </div>

      {cargando ? (
        <p className="text-center text-slate-500 py-8 text-sm">Calculando relación de inasistencias...</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {renderTablaQuincena('1RA', filas1ra)}
          {renderTablaQuincena('2DA', filas2da)}
        </div>
      )}

      {modalExportarFormato && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-800">
              Exportar Relación en {modalExportarFormato}
            </h3>
            <p className="text-xs text-slate-600">
              Seleccione qué período de <strong>{proyecto}</strong> ({NOMBRES_MESES[mes - 1]} {anio}) desea descargar:
            </p>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() =>
                  modalExportarFormato === 'EXCEL'
                    ? exportarExcelInasistencias('1RA')
                    : exportarPDFInasistencias('1RA')
                }
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
              >
                1RA Quincena (Días 01 al 15)
              </button>
              <button
                type="button"
                onClick={() =>
                  modalExportarFormato === 'EXCEL'
                    ? exportarExcelInasistencias('2DA')
                    : exportarPDFInasistencias('2DA')
                }
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer"
              >
                2DA Quincena (Días 16 al Fin de Mes)
              </button>
              <button
                type="button"
                onClick={() =>
                  modalExportarFormato === 'EXCEL'
                    ? exportarExcelInasistencias('MES')
                    : exportarPDFInasistencias('MES')
                }
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"
              >
                Todo el Mes (1RA y 2DA Quincena)
              </button>
            </div>
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setModalExportarFormato(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
