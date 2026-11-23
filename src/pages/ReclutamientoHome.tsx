import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { PROYECTOS } from '../data/constants';
import { generarPDFFichaTecnica } from '../utils/pdfFichaTecnica';
import {
  UserPlus,
  ClipboardCheck,
  Search,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Printer,
  Camera,
  ShieldCheck,
} from 'lucide-react';

export default function ReclutamientoHome() {
  const { currentUser } = useAuth();
  const nombreReclutador = currentUser?.nombre_completo || currentUser?.username || 'Reclutamiento';

  const [pestana, setPestana] = useState<'REGISTRAR' | 'VERIFICACION' | 'DIRECTORIO'>('REGISTRAR');
  const [listaProyectos, setListaProyectos] = useState<string[]>([]);
  const [aspirantes, setAspirantes] = useState<any[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  // Alerta preventiva de egresado previo
  const [alertaEgresadoPrevio, setAlertaEgresadoPrevio] = useState<any | null>(null);

  // Formulario Registrar Aspirante
  const [nacionalidad, setNacionalidad] = useState('V');
  const [cedula, setCedula] = useState('');
  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [sexo, setSexo] = useState('MASCULINO');
  const [estadoCivil, setEstadoCivil] = useState('SOLTERO/A');
  const [cargaFamiliar, setCargaFamiliar] = useState('0');
  const [rif, setRif] = useState('');

  // Datos Bancarios
  const [banco, setBanco] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('CORRIENTE');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [telefonoPagoMovil, setTelefonoPagoMovil] = useState('');

  // Ubicación y Emergencia
  const [estadoResidencia, setEstadoResidencia] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [parroquia, setParroquia] = useState('');
  const [direccionDomicilio, setDireccionDomicilio] = useState('');
  const [puntoReferencia, setPuntoReferencia] = useState('');
  const [telefonoCelular, setTelefonoCelular] = useState('');
  const [telefonoAlternativo, setTelefonoAlternativo] = useState('');
  const [correoElectronico, setCorreoElectronico] = useState('');
  const [emerg1Nombre, setEmerg1Nombre] = useState('');
  const [emerg1Parentesco, setEmerg1Parentesco] = useState('');
  const [emerg1Telefono, setEmerg1Telefono] = useState('');
  const [emerg2Nombre, setEmerg2Nombre] = useState('');
  const [emerg2Parentesco, setEmerg2Parentesco] = useState('');
  const [emerg2Telefono, setEmerg2Telefono] = useState('');

  // Formación y Seguridad
  const [nivelEstudios, setNivelEstudios] = useState('BACHILLERATO');
  const [tituloOficio, setTituloOficio] = useState('');
  const [experienciaSeguridad, setExperienciaSeguridad] = useState('SÍ');
  const [empresaAnterior, setEmpresaAnterior] = useState('');
  const [tiempoServicioAnterior, setTiempoServicioAnterior] = useState('');
  const [motivoRetiroAnterior, setMotivoRetiroAnterior] = useState('');
  const [cursosCertificaciones, setCursosCertificaciones] = useState('');
  const [licenciaConducir, setLicenciaConducir] = useState('NO POSEE');
  const [verificacionAntecedentes, setVerificacionAntecedentes] = useState('VERIFICADO SIN NOVEDAD');

  // Salud y Dotación
  const [grupoSanguineo, setGrupoSanguineo] = useState('O+');
  const [alergiasCondiciones, setAlergiasCondiciones] = useState('NINGUNA');
  const [medicamentosRegulares, setMedicamentosRegulares] = useState('NO');
  const [usaLentes, setUsaLentes] = useState('NO');
  const [tallaCamisa, setTallaCamisa] = useState('M');
  const [tallaPantalon, setTallaPantalon] = useState('32');
  const [tallaBotas, setTallaBotas] = useState('41');
  const [tallaGorra, setTallaGorra] = useState('ÚNICA');
  const [estatura, setEstatura] = useState('');
  const [peso, setPeso] = useState('');

  // Fotos
  const [fotoCedulaFile, setFotoCedulaFile] = useState<File | null>(null);
  const [fotoCarnetFile, setFotoCarnetFile] = useState<File | null>(null);
  const [guardandoRegistro, setGuardandoRegistro] = useState(false);

  // Modal Aprobar / Pre-asignar Proyecto
  const [aspiranteAprobando, setAspiranteAprobando] = useState<any | null>(null);
  const [proyectoAsignado, setProyectoAsignado] = useState('');
  const [cargoAsignado, setCargoAsignado] = useState('OFICIAL');
  const [turnoAsignado, setTurnoAsignado] = useState('MIXTO');
  const [grupoAsignado, setGrupoAsignado] = useState('A');
  const [procesandoDecision, setProcesandoDecision] = useState(false);

  // Modal Rechazar
  const [aspiranteRechazando, setAspiranteRechazando] = useState<any | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState('');

  // Buscador Directorio
  const [filtroDirectorio, setFiltroDirectorio] = useState('');
  useEffect(() => {
    const cargarProyectos = async () => {
      const setProy = new Set<string>(Array.isArray(PROYECTOS) ? PROYECTOS : []);
      const { data } = await supabase.from('projects').select('*');
      if (Array.isArray(data)) {
        data.forEach((p: any) => {
          const val = p?.nombre || p?.name || p?.proyecto;
          if (val) setProy.add(String(val).trim());
        });
      }
      const ordenados = Array.from(setProy).sort();
      setListaProyectos(ordenados);
      if (ordenados.length > 0) setProyectoAsignado(ordenados.at(0) || '');
    };
    cargarProyectos();
    consultarAspirantes();
  }, []);

  const consultarAspirantes = async () => {
    setCargando(true);
    try {
      const { data, error } = await supabase
        .from('aspirantes_reclutamiento')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      setAspirantes(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando aspirantes:', err);
    } finally {
      setCargando(false);
    }
  };

  const verificarHistorialEgresado = async (cedulaIngresada: string) => {
    const limpia = cedulaIngresada.replace(/\D/g, '');
    if (limpia.length < 6) {
      setAlertaEgresadoPrevio(null);
      return;
    }
    const { data } = await supabase
      .from('egresados_empresa')
      .select('*')
      .ilike('cedula', `%${limpia}%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (Array.isArray(data) && data.length > 0) {
      setAlertaEgresadoPrevio(data.at(0));
    } else {
      setAlertaEgresadoPrevio(null);
    }
  };

  const subirArchivoStorage = async (file: File | null, carpeta: string, cedulaStr: string) => {
    if (!file) return null;
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `${carpeta}/${cedulaStr}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from('fichas-reclutamiento')
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from('fichas-reclutamiento').getPublicUrl(path);
    return data?.publicUrl || null;
  };

  const registrarNuevoAspirante = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    const cedulaLimpia = cedula.replace(/\D/g, '');
    if (!cedulaLimpia || !nombres.trim() || !apellidos.trim()) {
      setMensaje({ tipo: 'error', texto: '⚠️ Debe completar Cédula, Nombres y Apellidos.' });
      return;
    }

    setGuardandoRegistro(true);
    try {
      const fotoCedulaUrl = await subirArchivoStorage(fotoCedulaFile, 'cedulas', cedulaLimpia);
      const fotoCarnetUrl = await subirArchivoStorage(fotoCarnetFile, 'carnets', cedulaLimpia);

      const { error } = await supabase.from('aspirantes_reclutamiento').insert([
        {
          nacionalidad,
          cedula: cedulaLimpia,
          nombres: nombres.trim().toUpperCase(),
          apellidos: apellidos.trim().toUpperCase(),
          fecha_nacimiento: fechaNacimiento,
          sexo,
          estado_civil: estadoCivil,
          carga_familiar: cargaFamiliar,
          rif: rif.trim().toUpperCase(),
          banco: banco.trim().toUpperCase(),
          tipo_cuenta: tipoCuenta,
          numero_cuenta: numeroCuenta.replace(/\D/g, ''),
          telefono_pago_movil: telefonoPagoMovil.replace(/\D/g, ''),
          estado_residencia: estadoResidencia.trim().toUpperCase(),
          municipio: municipio.trim().toUpperCase(),
          parroquia: parroquia.trim().toUpperCase(),
          direccion_domicilio: direccionDomicilio.trim(),
          punto_referencia: puntoReferencia.trim(),
          telefono_celular: telefonoCelular.replace(/\D/g, ''),
          telefono_alternativo: telefonoAlternativo.replace(/\D/g, ''),
          correo_electronico: correoElectronico.trim().toLowerCase(),
          contacto_emergencia_1_nombre: emerg1Nombre.trim().toUpperCase(),
          contacto_emergencia_1_parentesco: emerg1Parentesco.trim().toUpperCase(),
          contacto_emergencia_1_telefono: emerg1Telefono.replace(/\D/g, ''),
          contacto_emergencia_2_nombre: emerg2Nombre.trim().toUpperCase(),
          contacto_emergencia_2_parentesco: emerg2Parentesco.trim().toUpperCase(),
          contacto_emergencia_2_telefono: emerg2Telefono.replace(/\D/g, ''),
          nivel_estudios: nivelEstudios,
          titulo_oficio: tituloOficio.trim().toUpperCase(),
          experiencia_seguridad: experienciaSeguridad,
          empresa_anterior: empresaAnterior.trim().toUpperCase(),
          tiempo_servicio_anterior: tiempoServicioAnterior.trim().toUpperCase(),
          motivo_retiro_anterior: motivoRetiroAnterior.trim(),
          cursos_certificaciones: cursosCertificaciones.trim().toUpperCase(),
          licencia_conducir: licenciaConducir,
          verificacion_antecedentes: verificacionAntecedentes,
          grupo_sanguineo: grupoSanguineo,
          alergias_condiciones: alergiasCondiciones.trim().toUpperCase(),
          medicamentos_regulares: medicamentosRegulares.trim().toUpperCase(),
          usa_lentes: usaLentes,
          talla_camisa: tallaCamisa,
          talla_pantalon: tallaPantalon,
          talla_botas: tallaBotas,
          talla_gorra: tallaGorra,
          estatura: estatura.trim(),
          peso: peso.trim(),
          foto_cedula_url: fotoCedulaUrl,
          foto_carnet_url: fotoCarnetUrl,
          entrevista_presencial: 'PENDIENTE',
          evaluacion_psicotecnica: 'PENDIENTE',
          estatus_seleccion: 'EN PROCESO',
          registrado_por: nombreReclutador,
        },
      ]);

      if (error) throw error;

      setMensaje({
        tipo: 'exito',
        texto: `✅ Aspirante ${nombres.toUpperCase()} ${apellidos.toUpperCase()} (C.I. ${nacionalidad}-${cedulaLimpia}) registrado en Reclutamiento.`,
      });

      setCedula('');
      setNombres('');
      setApellidos('');
      setNumeroCuenta('');
      setFotoCedulaFile(null);
      setFotoCarnetFile(null);
      setAlertaEgresadoPrevio(null);
      setPestana('VERIFICACION');
      await consultarAspirantes();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error registrando aspirante: ' + (err?.message || 'Verifique conexión.'),
      });
    } finally {
      setGuardandoRegistro(false);
    }
  };
  const actualizarEtapaVerificacion = async (
    idAspirante: string,
    campo: 'entrevista_presencial' | 'evaluacion_psicotecnica',
    valor: 'POSITIVA' | 'NEGATIVA'
  ) => {
    const obs = window.prompt(
      `Observación para ${campo === 'entrevista_presencial' ? 'Entrevista Presencial' : 'Evaluación Psicotécnica'} (${valor}):`,
      valor === 'POSITIVA' ? 'Aprobado sin novedad' : ''
    );
    if (obs === null) return;

    const campoObs =
      campo === 'entrevista_presencial' ? 'entrevista_observacion' : 'psicotecnica_observacion';

    try {
      const { error } = await supabase
        .from('aspirantes_reclutamiento')
        .update({
          [campo]: valor,
          [campoObs]: obs.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', idAspirante);

      if (error) throw error;
      await consultarAspirantes();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: 'Error actualizando verificación: ' + (err?.message || 'Error.') });
    }
  };

  const confirmarAprobacionAspirante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aspiranteAprobando || !proyectoAsignado) return;

    setProcesandoDecision(true);
    try {
      const ahora = new Date().toISOString();
      const cedulaFormateada = `${aspiranteAprobando.nacionalidad || 'V'}-${aspiranteAprobando.cedula}`;

      const { error: errUpd } = await supabase
        .from('aspirantes_reclutamiento')
        .update({
          estatus_seleccion: 'PENDIENTE POR INGRESO',
          proyecto_asignado: proyectoAsignado,
          cargo_asignado: cargoAsignado,
          turno_asignado: turnoAsignado,
          grupo_asignado: turnoAsignado === 'DIURNO' || turnoAsignado === 'NOCTURNO' ? 'A' : grupoAsignado,
          aprobado_por: nombreReclutador,
          fecha_aprobacion: ahora,
          updated_at: ahora,
        })
        .eq('id', aspiranteAprobando.id);

      if (errUpd) throw errUpd;

      // Notificación inmediata a ANALISTA y CECOM
      await supabase.from('notifications').insert([
        {
          title: '🆕 Nuevo Aspirante Aprobado (Pendiente por Ingreso)',
          message: `Reclutamiento (${nombreReclutador}) aprobó a ${aspiranteAprobando.nombres} ${aspiranteAprobando.apellidos} (${cedulaFormateada}) para ${proyectoAsignado} • Cargo: ${cargoAsignado} • Horario: ${turnoAsignado}.`,
          type: 'nuevo_ingreso_reclutamiento',
          target_roles: ['analista', 'cecom', 'rrhh', 'directiva', 'administrador'],
          project_name: proyectoAsignado,
          is_read: false,
        },
      ]);

      setMensaje({
        tipo: 'exito',
        texto: `✅ ${aspiranteAprobando.nombres} ${aspiranteAprobando.apellidos} APROBADO en estatus PENDIENTE POR INGRESO para ${proyectoAsignado}. Notificación enviada a Analista y CECOM.`,
      });
      setAspiranteAprobando(null);
      await consultarAspirantes();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error aprobando aspirante: ' + (err?.message || 'Verifique conexión.'),
      });
    } finally {
      setProcesandoDecision(false);
    }
  };

  const confirmarRechazoAspirante = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aspiranteRechazando || !motivoRechazo.trim()) return;

    setProcesandoDecision(true);
    try {
      const { error } = await supabase
        .from('aspirantes_reclutamiento')
        .update({
          estatus_seleccion: 'RECHAZADO',
          motivo_rechazo: motivoRechazo.trim(),
          aprobado_por: nombreReclutador,
          updated_at: new Date().toISOString(),
        })
        .eq('id', aspiranteRechazando.id);

      if (error) throw error;

      setMensaje({
        tipo: 'exito',
        texto: `Aspirante ${aspiranteRechazando.nombres} ${aspiranteRechazando.apellidos} marcado como RECHAZADO.`,
      });
      setAspiranteRechazando(null);
      setMotivoRechazo('');
      await consultarAspirantes();
    } catch (err: any) {
      setMensaje({ tipo: 'error', texto: 'Error rechazando aspirante: ' + (err?.message || 'Error.') });
    } finally {
      setProcesandoDecision(false);
    }
  };
  const enProceso = aspirantes.filter((a) => a.estatus_seleccion === 'EN PROCESO');
  const directorioFiltrado = aspirantes.filter((a) => {
    const q = filtroDirectorio.trim().toLowerCase();
    if (!q) return true;
    return (
      String(a.cedula || '').toLowerCase().includes(q) ||
      String(a.nombres || '').toLowerCase().includes(q) ||
      String(a.apellidos || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border-l-4 border-violet-600 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-violet-600 uppercase tracking-wider">
            Módulo de Reclutamiento y Selección
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-0.5 flex items-center gap-2">
            <UserPlus className="text-violet-600" size={26} /> Gestión de Aspirantes y Ficha Técnica
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Registro integral, verificación de entrevista y psicotécnica, pre-asignación a proyecto y generación de Ficha Oficial.
          </p>
        </div>

        <div className="bg-violet-50 border border-violet-200 px-4 py-2 rounded-xl text-center">
          <div className="text-[11px] font-bold text-violet-700 uppercase">En Proceso</div>
          <div className="text-xl font-black text-violet-900">{enProceso.length}</div>
        </div>
      </div>

      {mensaje && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-start gap-2 ${
            mensaje.tipo === 'exito'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {mensaje.tipo === 'exito' ? (
            <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
          ) : (
            <XCircle size={18} className="shrink-0 mt-0.5" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
        <button
          type="button"
          onClick={() => setPestana('REGISTRAR')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            pestana === 'REGISTRAR' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <UserPlus size={18} /> REGISTRAR ASPIRANTES
        </button>

        <button
          type="button"
          onClick={() => setPestana('VERIFICACION')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            pestana === 'VERIFICACION' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <ClipboardCheck size={18} /> VERIFICACIÓN Y APROBACIÓN ({enProceso.length})
        </button>

        <button
          type="button"
          onClick={() => setPestana('DIRECTORIO')}
          className={`py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            pestana === 'DIRECTORIO' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Search size={18} /> DIRECTORIO Y FICHAS ({aspirantes.length})
        </button>
      </div>
      {pestana === 'REGISTRAR' && (
        <form onSubmit={registrarNuevoAspirante} className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
          <div className="space-y-4">
            <h2 className="text-sm font-black text-violet-800 uppercase border-b border-slate-100 pb-2">
              1. Identificación y Datos Personales
            </h2>

            {alertaEgresadoPrevio && (
              <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-400 text-amber-950 text-xs space-y-1">
                <div className="font-black flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle size={16} /> ALERTA: ESTA CÉDULA TIENE UN EGRESO REGISTRADO EN LA EMPRESA
                </div>
                <div>
                  Ex-Proyecto: <strong>{alertaEgresadoPrevio.proyecto_egreso}</strong> • Ingreso:{' '}
                  <strong>{alertaEgresadoPrevio.fecha_ingreso || 'N/A'}</strong> • Egreso:{' '}
                  <strong>{alertaEgresadoPrevio.fecha_egreso}</strong>
                </div>
                <div>
                  Motivo Egreso: <strong>{alertaEgresadoPrevio.motivo_egreso}</strong> • Estatus Reingreso:{' '}
                  <strong className={alertaEgresadoPrevio.elegible_reingreso === 'ELEGIBLE' ? 'text-emerald-700' : 'text-red-700'}>
                    {alertaEgresadoPrevio.elegible_reingreso}
                  </strong>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nacionalidad *</label>
                <select
                  value={nacionalidad}
                  onChange={(e) => setNacionalidad(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold"
                >
                  <option value="V">V</option>
                  <option value="E">E</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Cédula (Solo números) *</label>
                <input
                  type="text"
                  required
                  value={cedula}
                  onChange={(e) => {
                    setCedula(e.target.value);
                    verificarHistorialEgresado(e.target.value);
                  }}
                  placeholder="Ej: 20123456"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nombres *</label>
                <input
                  type="text"
                  required
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Apellidos *</label>
                <input
                  type="text"
                  required
                  value={apellidos}
                  onChange={(e) => setApellidos(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Fecha Nacimiento *</label>
                <input
                  type="date"
                  required
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Sexo</label>
                <select
                  value={sexo}
                  onChange={(e) => setSexo(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="MASCULINO">MASCULINO</option>
                  <option value="FEMENINO">FEMENINO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Estado Civil</label>
                <select
                  value={estadoCivil}
                  onChange={(e) => setEstadoCivil(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="SOLTERO/A">SOLTERO/A</option>
                  <option value="CASADO/A">CASADO/A</option>
                  <option value="CONCUBINATO">CONCUBINATO</option>
                  <option value="VIUDO/A">VIUDO/A</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Hijos / Carga</label>
                <input
                  type="number"
                  min="0"
                  value={cargaFamiliar}
                  onChange={(e) => setCargaFamiliar(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">RIF Personal</label>
                <input
                  type="text"
                  value={rif}
                  onChange={(e) => setRif(e.target.value)}
                  placeholder="V-20123456-0"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-black text-violet-800 uppercase border-b border-slate-100 pb-2">
              2. Datos Bancarios para Nómina (Obligatorio)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Banco *</label>
                <input
                  type="text"
                  required
                  value={banco}
                  onChange={(e) => setBanco(e.target.value)}
                  placeholder="Ej: BANESCO / VENEZUELA"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tipo de Cuenta</label>
                <select
                  value={tipoCuenta}
                  onChange={(e) => setTipoCuenta(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="CORRIENTE">CORRIENTE</option>
                  <option value="AHORRO">AHORRO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Número de Cuenta (20 dígitos) *</label>
                <input
                  type="text"
                  required
                  maxLength={20}
                  value={numeroCuenta}
                  onChange={(e) => setNumeroCuenta(e.target.value)}
                  placeholder="0134..."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tel. Pago Móvil</label>
                <input
                  type="text"
                  value={telefonoPagoMovil}
                  onChange={(e) => setTelefonoPagoMovil(e.target.value)}
                  placeholder="04141234567"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-sm font-black text-violet-800 uppercase border-b border-slate-100 pb-2">
              3. Ubicación Geográfica y Contactos de Emergencia
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Estado *</label>
                <input
                  type="text"
                  required
                  value={estadoResidencia}
                  onChange={(e) => setEstadoResidencia(e.target.value)}
                  placeholder="Ej: DISTRITO CAPITAL / MIRANDA"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Municipio *</label>
                <input
                  type="text"
                  required
                  value={municipio}
                  onChange={(e) => setMunicipio(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Parroquia</label>
                <input
                  type="text"
                  value={parroquia}
                  onChange={(e) => setParroquia(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Dirección Exacta de Domicilio *</label>
                <input
                  type="text"
                  required
                  value={direccionDomicilio}
                  onChange={(e) => setDireccionDomicilio(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Punto de Referencia *</label>
                <input
                  type="text"
                  required
                  value={puntoReferencia}
                  onChange={(e) => setPuntoReferencia(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Teléfono Celular *</label>
                <input
                  type="text"
                  required
                  value={telefonoCelular}
                  onChange={(e) => setTelefonoCelular(e.target.value)}
                  placeholder="04141234567"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Teléfono Alternativo</label>
                <input
                  type="text"
                  value={telefonoAlternativo}
                  onChange={(e) => setTelefonoAlternativo(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={correoElectronico}
                  onChange={(e) => setCorreoElectronico(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contacto Emergencia 1 (Nombre) *</label>
                <input
                  type="text"
                  required
                  value={emerg1Nombre}
                  onChange={(e) => setEmerg1Nombre(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Parentesco 1 *</label>
                <input
                  type="text"
                  required
                  value={emerg1Parentesco}
                  onChange={(e) => setEmerg1Parentesco(e.target.value)}
                  placeholder="Ej: MADRE / ESPOSA"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Teléfono Emergencia 1 *</label>
                <input
                  type="text"
                  required
                  value={emerg1Telefono}
                  onChange={(e) => setEmerg1Telefono(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Contacto Emergencia 2 (Opcional)</label>
                <input
                  type="text"
                  value={emerg2Nombre}
                  onChange={(e) => setEmerg2Nombre(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Parentesco 2</label>
                <input
                  type="text"
                  value={emerg2Parentesco}
                  onChange={(e) => setEmerg2Parentesco(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Teléfono Emergencia 2</label>
                <input
                  type="text"
                  value={emerg2Telefono}
                  onChange={(e) => setEmerg2Telefono(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-sm font-black text-violet-800 uppercase border-b border-slate-100 pb-2">
              4. Formación, Experiencia en Seguridad y Antecedentes
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Nivel de Estudios</label>
                <select
                  value={nivelEstudios}
                  onChange={(e) => setNivelEstudios(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="PRIMARIA">PRIMARIA</option>
                  <option value="BACHILLERATO">BACHILLERATO</option>
                  <option value="TÉCNICO">TÉCNICO / TSU</option>
                  <option value="UNIVERSITARIO">UNIVERSITARIO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Título u Oficio</label>
                <input
                  type="text"
                  value={tituloOficio}
                  onChange={(e) => setTituloOficio(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Exp. en Seguridad</label>
                <select
                  value={experienciaSeguridad}
                  onChange={(e) => setExperienciaSeguridad(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="SÍ">SÍ</option>
                  <option value="NO">NO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Licencia de Conducir</label>
                <select
                  value={licenciaConducir}
                  onChange={(e) => setLicenciaConducir(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="NO POSEE">NO POSEE</option>
                  <option value="2DA">2DA</option>
                  <option value="3RA">3RA</option>
                  <option value="4TA">4TA</option>
                  <option value="5TA">5TA</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Empresa / Institución Anterior</label>
                <input
                  type="text"
                  value={empresaAnterior}
                  onChange={(e) => setEmpresaAnterior(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Tiempo de Servicio</label>
                <input
                  type="text"
                  value={tiempoServicioAnterior}
                  onChange={(e) => setTiempoServicioAnterior(e.target.value)}
                  placeholder="Ej: 2 AÑOS"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Motivo de Retiro</label>
                <input
                  type="text"
                  value={motivoRetiroAnterior}
                  onChange={(e) => setMotivoRetiroAnterior(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Verif. Antecedentes</label>
                <select
                  value={verificacionAntecedentes}
                  onChange={(e) => setVerificacionAntecedentes(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold"
                >
                  <option value="VERIFICADO SIN NOVEDAD">VERIFICADO SIN NOVEDAD</option>
                  <option value="CON OBSERVACIÓN">CON OBSERVACIÓN</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                Cursos y Certificaciones Técnicas (Vigilancia, Primeros Auxilios, Incendios, etc.)
              </label>
              <input
                type="text"
                value={cursosCertificaciones}
                onChange={(e) => setCursosCertificaciones(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="space-y-4">
            <h2 className="text-sm font-black text-violet-800 uppercase border-b border-slate-100 pb-2">
              5. Salud Ocupacional y Dotación Técnica (Tallas y Medidas)
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Grupo Sanguíneo</label>
                <select
                  value={grupoSanguineo}
                  onChange={(e) => setGrupoSanguineo(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold"
                >
                  {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((gs) => (
                    <option key={gs} value={gs}>
                      {gs}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Talla Camisa *</label>
                <select
                  value={tallaCamisa}
                  onChange={(e) => setTallaCamisa(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold"
                >
                  {['SS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Talla Pantalón *</label>
                <select
                  value={tallaPantalon}
                  onChange={(e) => setTallaPantalon(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold"
                >
                  {['28', '30', '32', '34', '36', '38', '40', '42', '44+'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Talla Botas *</label>
                <select
                  value={tallaBotas}
                  onChange={(e) => setTallaBotas(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold"
                >
                  {['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'].map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Estatura (m) *</label>
                <input
                  type="text"
                  required
                  value={estatura}
                  onChange={(e) => setEstatura(e.target.value)}
                  placeholder="Ej: 1.75"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Peso (kg)</label>
                <input
                  type="text"
                  value={peso}
                  onChange={(e) => setPeso(e.target.value)}
                  placeholder="Ej: 78"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Alergias / Condiciones Médicas</label>
                <input
                  type="text"
                  value={alergiasCondiciones}
                  onChange={(e) => setAlergiasCondiciones(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Medicamentos Regulares</label>
                <input
                  type="text"
                  value={medicamentosRegulares}
                  onChange={(e) => setMedicamentosRegulares(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">Usa Lentes / Talla Gorra</label>
                <div className="flex gap-2">
                  <select
                    value={usaLentes}
                    onChange={(e) => setUsaLentes(e.target.value)}
                    className="w-1/2 border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="NO">Lentes: NO</option>
                    <option value="SÍ">Lentes: SÍ</option>
                  </select>
                  <input
                    type="text"
                    value={tallaGorra}
                    onChange={(e) => setTallaGorra(e.target.value)}
                    placeholder="Gorra"
                    className="w-1/2 border border-slate-300 rounded-xl px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <Camera size={15} className="text-violet-600" /> Foto de la Cédula de Identidad (Horizontal)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFotoCedulaFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-600"
                />
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1 flex items-center gap-1.5">
                  <Camera size={15} className="text-violet-600" /> Foto Tipo Carnet (Uniformado)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFotoCarnetFile(e.target.files?.[0] || null)}
                  className="text-xs text-slate-600"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={guardandoRegistro}
              className="px-7 py-3 rounded-xl text-sm font-black text-white bg-violet-600 hover:bg-violet-700 shadow-md cursor-pointer disabled:opacity-50"
            >
              {guardandoRegistro ? 'Guardando Ficha...' : 'Registrar Aspirante en Reclutamiento'}
            </button>
          </div>
        </form>
      )}
      {pestana === 'DIRECTORIO' && (
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              value={filtroDirectorio}
              onChange={(e) => setFiltroDirectorio(e.target.value)}
              placeholder="Buscar aspirante o personal por cédula o nombre..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl text-sm"
            />
          </div>

          <div className="divide-y divide-slate-100">
            {directorioFiltrado.map((asp) => (
              <div key={asp.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-800">
                      {asp.nombres} {asp.apellidos}
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      C.I. {asp.nacionalidad}-{asp.cedula}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase ${
                        asp.estatus_seleccion === 'PENDIENTE POR INGRESO'
                          ? 'bg-amber-100 text-amber-800'
                          : asp.estatus_seleccion === 'INGRESADO'
                          ? 'bg-emerald-100 text-emerald-800'
                          : asp.estatus_seleccion === 'RECHAZADO'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {asp.estatus_seleccion}
                    </span>
                  </div>
                  {asp.proyecto_asignado && (
                    <p className="text-xs text-slate-600 mt-0.5">
                      Pre-asignado: <strong>{asp.proyecto_asignado}</strong> • {asp.cargo_asignado} •{' '}
                      {asp.turno_asignado} (GRP {asp.grupo_asignado})
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => generarPDFFichaTecnica(asp, 'DESCARGAR')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Download size={13} /> Ficha PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => generarPDFFichaTecnica(asp, 'IMPRIMIR')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Printer size={13} /> Imprimir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {aspiranteAprobando && (
        <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={confirmarAprobacionAspirante}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="text-emerald-600" size={22} /> Aprobar Aspirante y Pre-Asignar
            </h3>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-200">
              Candidato: <strong>{aspiranteAprobando.nombres} {aspiranteAprobando.apellidos}</strong> (C.I.{' '}
              {aspiranteAprobando.nacionalidad}-{aspiranteAprobando.cedula})
              <br />
              Quedará en estatus <strong>PENDIENTE POR INGRESO</strong> hasta confirmarse en el proyecto, y se notificará de inmediato a <strong>Analista</strong> y <strong>CECOM</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Proyecto de Contratación *</label>
              <select
                required
                value={proyectoAsignado}
                onChange={(e) => setProyectoAsignado(e.target.value)}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold"
              >
                {listaProyectos.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cargo *</label>
                <select
                  value={cargoAsignado}
                  onChange={(e) => setCargoAsignado(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold"
                >
                  <option value="OFICIAL">OFICIAL</option>
                  <option value="J. GRUPO">J. GRUPO</option>
                  <option value="OPERADOR">OPERADOR</option>
                  <option value="J. OPERACIONES">J. OPERACIONES</option>
                  <option value="J. SALA">J. SALA</option>
                  <option value="LIDER">LIDER</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Horario *</label>
                <select
                  value={turnoAsignado}
                  onChange={(e) => setTurnoAsignado(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold"
                >
                  <option value="MIXTO">MIXTO</option>
                  <option value="24X24">24X24</option>
                  <option value="DIURNO">DIURNO</option>
                  <option value="NOCTURNO">NOCTURNO</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Grupo *</label>
                <select
                  value={grupoAsignado}
                  disabled={turnoAsignado === 'DIURNO' || turnoAsignado === 'NOCTURNO'}
                  onChange={(e) => setGrupoAsignado(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-2.5 py-2 text-xs font-bold disabled:opacity-50"
                >
                  <option value="A">GRP A</option>
                  <option value="B">GRP B</option>
                  <option value="C">GRP C</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAspiranteAprobando(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={procesandoDecision}
                className="px-5 py-2 rounded-xl text-xs font-black text-white bg-emerald-600 hover:bg-emerald-700 cursor-pointer"
              >
                {procesandoDecision ? 'Aprobando...' : 'Confirmar Aprobación'}
              </button>
            </div>
          </form>
        </div>
      )}

      {aspiranteRechazando && (
        <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-4">
          <form
            onSubmit={confirmarRechazoAspirante}
            className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
          >
            <h3 className="text-lg font-bold text-red-700">Rechazar Aspirante</h3>
            <p className="text-xs text-slate-600">
              Aspirante: <strong>{aspiranteRechazando.nombres} {aspiranteRechazando.apellidos}</strong>
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Motivo del Rechazo *</label>
              <textarea
                required
                rows={3}
                value={motivoRechazo}
                onChange={(e) => setMotivoRechazo(e.target.value)}
                className="w-full border border-red-300 rounded-xl px-3 py-2 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAspiranteRechazando(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={procesandoDecision}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 cursor-pointer"
              >
                Confirmar Rechazo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
