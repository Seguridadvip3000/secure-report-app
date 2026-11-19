import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import {
  CheckCircle2,
  AlertCircle,
  Save,
  UserPlus,
  Calendar,
  Clock,
  Users,
  ArrowRightLeft,
} from 'lucide-react';

interface OficialPlantilla {
  id: string;
  proyecto: string;
  cedula: string;
  nombres: string;
  apellidos: string;
  grupo: 'A' | 'B' | 'C';
  turno?: 'MIXTO' | 'DIURNO' | 'NOCTURNO';
}

interface RegistroFila {
  cedula: string;
  nombre_completo: string;
  grupo: 'A' | 'B' | 'C';
  estatus:
    | 'PRESENTE'
    | 'APOYO PRESTADO'
    | 'FALTA INJUSTIFICADA'
    | 'REPOSO MEDICO'
    | 'PERMISO'
    | 'DESCANSO';
  proyecto_apoyo: string;
  observacion: string;
}

interface Props {
  proyectoSeleccionado: string;
  plantillaActiva: OficialPlantilla[];
  listaProyectosGlobales: string[];
  nombreRegistrador: string;
}

export default function PaseAsistenciaDiariaPanel({
  proyectoSeleccionado,
  plantillaActiva,
  listaProyectosGlobales,
  nombreRegistrador,
}: Props) {
  const hoyLocal = new Date().toLocaleDateString('en-CA');

  const [fecha, setFecha] = useState<string>(hoyLocal);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<'A' | 'B' | 'C'>('A');
  const [turno, setTurno] = useState<'MIXTO' | 'DIURNO' | 'NOCTURNO'>('MIXTO');

  const [filas, setFilas] = useState<Record<string, RegistroFila>>({});
  const [apoyosRecibidosHoy, setApoyosRecibidosHoy] = useState<any[]>([]);
  const [mostrarFormApoyoRecibido, setMostrarFormApoyoRecibido] = useState(false);
  const [cedulaApoyo, setCedulaApoyo] = useState('');
  const [nombreApoyo, setNombreApoyo] = useState('');
  const [origenApoyo, setOrigenApoyo] = useState('');
  const [obsApoyo, setObsApoyo] = useState('');

  const [cargando, setCargando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'exito' | 'error'; texto: string } | null>(null);

  const oficialesDelGrupo = plantillaActiva.filter((o) => o.grupo === grupoSeleccionado);
  const otrosProyectos = listaProyectosGlobales.filter((p) => p !== proyectoSeleccionado);
  const cargarAsistenciaExistente = async () => {
    setCargando(true);
    setMensaje(null);
    try {
      const { data, error } = await supabase
        .from('asistencias_diarias_oficiales')
        .select('*')
        .eq('proyecto', proyectoSeleccionado)
        .eq('fecha', fecha)
        .eq('turno', turno);

      if (error) throw error;

      const mapaExistente: Record<string, any> = {};
      const recibidos: any[] = [];

      (data || []).forEach((reg: any) => {
        if (reg.estatus === 'APOYO RECIBIDO') {
          recibidos.push(reg);
        } else {
          mapaExistente[reg.cedula.toUpperCase()] = reg;
        }
      });

      const nuevasFilas: Record<string, RegistroFila> = {};
      oficialesDelGrupo.forEach((of) => {
        const ced = of.cedula.toUpperCase();
        const prev = mapaExistente[ced];
        nuevasFilas[ced] = {
          cedula: ced,
          nombre_completo: `${of.apellidos}, ${of.nombres}`,
          grupo: of.grupo,
          estatus: prev?.estatus || 'PRESENTE',
          proyecto_apoyo: prev?.proyecto_apoyo || '',
          observacion: prev?.observacion || '',
        };
      });

      setFilas(nuevasFilas);
      setApoyosRecibidosHoy(recibidos);
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error cargando asistencia del día: ' + (err?.message || 'Verifique conexión.'),
      });
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarAsistenciaExistente();
  }, [proyectoSeleccionado, fecha, turno, grupoSeleccionado, plantillaActiva.length]);

  const actualizarFila = (cedula: string, campo: keyof RegistroFila, valor: string) => {
    setFilas((prev) => ({
      ...prev,
      [cedula]: {
        ...prev[cedula],
        [campo]: valor,
        ...(campo === 'estatus' && valor !== 'APOYO PRESTADO' ? { proyecto_apoyo: '' } : {}),
      },
    }));
  };

  const guardarPaseAsistencia = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    const listaFilas = Object.values(filas);
    if (listaFilas.length === 0) {
      setMensaje({
        tipo: 'error',
        texto: `No hay oficiales activos en el Grupo ${grupoSeleccionado} para pasar asistencia.`,
      });
      return;
    }

    const apoyoSinProyecto = listaFilas.find(
      (f) => f.estatus === 'APOYO PRESTADO' && !f.proyecto_apoyo.trim()
    );
    if (apoyoSinProyecto) {
      setMensaje({
        tipo: 'error',
        texto: `⚠️ Seleccione el proyecto destino donde prestó apoyo ${apoyoSinProyecto.nombre_completo}.`,
      });
      return;
    }

    setGuardando(true);
    try {
      const payload = listaFilas.map((f) => ({
        fecha,
        proyecto: proyectoSeleccionado,
        proyecto_apoyo: f.estatus === 'APOYO PRESTADO' ? f.proyecto_apoyo.trim() : null,
        cedula: f.cedula,
        nombre_completo: f.nombre_completo,
        grupo: f.grupo,
        turno,
        estatus: f.estatus,
        observacion: f.observacion.trim() || null,
        registrado_por: nombreRegistrador,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('asistencias_diarias_oficiales')
        .upsert(payload, { onConflict: 'fecha,proyecto,cedula,turno' });

      if (error) throw error;

      setMensaje({
        tipo: 'exito',
        texto: `✅ Asistencia del Grupo ${grupoSeleccionado} (Turno ${turno} - ${fecha}) guardada con éxito (${listaFilas.length} oficiales).`,
      });
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error al guardar asistencia: ' + (err?.message || 'Verifique conexión.'),
      });
    } finally {
      setGuardando(false);
    }
  };
  const registrarApoyoRecibido = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);

    const cedLimpia = cedulaApoyo.trim().toUpperCase();
    const nomLimpio = nombreApoyo.trim().toUpperCase();

    if (!cedLimpia || !nomLimpio || !origenApoyo.trim()) {
      setMensaje({
        tipo: 'error',
        texto: 'Complete Cédula, Nombre Completo y Proyecto de Origen del apoyo recibido.',
      });
      return;
    }

    setGuardando(true);
    try {
      const { error } = await supabase.from('asistencias_diarias_oficiales').upsert(
        [
          {
            fecha,
            proyecto: proyectoSeleccionado,
            proyecto_apoyo: origenApoyo.trim(),
            cedula: cedLimpia,
            nombre_completo: nomLimpio,
            grupo: grupoSeleccionado,
            turno,
            estatus: 'APOYO RECIBIDO',
            observacion: obsApoyo.trim() || `Apoyo recibido desde ${origenApoyo.trim()}`,
            registrado_por: nombreRegistrador,
            updated_at: new Date().toISOString(),
          },
        ],
        { onConflict: 'fecha,proyecto,cedula,turno' }
      );

      if (error) throw error;

      setCedulaApoyo('');
      setNombreApoyo('');
      setOrigenApoyo('');
      setObsApoyo('');
      setMostrarFormApoyoRecibido(false);
      setMensaje({
        tipo: 'exito',
        texto: `✅ Apoyo recibido de ${nomLimpio} (${cedLimpia}) en turno ${turno} registrado en ${proyectoSeleccionado}.`,
      });
      await cargarAsistenciaExistente();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: 'Error registrando apoyo recibido: ' + (err?.message || 'Error.'),
      });
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-5">
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
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
            <Calendar size={14} /> Fecha de Guardia
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
            <Users size={14} /> Grupo en Guardia
          </label>
          <select
            value={grupoSeleccionado}
            onChange={(e) => setGrupoSeleccionado(e.target.value as 'A' | 'B' | 'C')}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-blue-700 bg-blue-50/40"
          >
            <option value="A">GRUPO A ({plantillaActiva.filter((p) => p.grupo === 'A').length})</option>
            <option value="B">GRUPO B ({plantillaActiva.filter((p) => p.grupo === 'B').length})</option>
            <option value="C">GRUPO C ({plantillaActiva.filter((p) => p.grupo === 'C').length})</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
            <Clock size={14} /> Turno Correspondiente *
          </label>
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value as 'MIXTO' | 'DIURNO' | 'NOCTURNO')}
            className="w-full border border-slate-300 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-800 bg-slate-50"
          >
            <option value="MIXTO">MIXTO</option>
            <option value="DIURNO">DIURNO</option>
            <option value="NOCTURNO">NOCTURNO</option>
          </select>
        </div>
      </div>
      <form onSubmit={guardarPaseAsistencia} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-800">
              Pase de Lista — Grupo {grupoSeleccionado} (Turno {turno})
            </h3>
            <p className="text-xs text-slate-500">
              Marque el estatus de cada oficial o indique si fue enviado a prestar apoyo en otro servicio.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarFormApoyoRecibido(!mostrarFormApoyoRecibido)}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1.5 cursor-pointer self-start"
          >
            <UserPlus size={15} /> + Registrar Apoyo Recibido
          </button>
        </div>

        {cargando ? (
          <p className="text-center text-slate-500 py-8 text-sm">Cargando lista del grupo...</p>
        ) : oficialesDelGrupo.length === 0 ? (
          <p className="text-center text-slate-500 py-8 text-sm">
            No hay oficiales activos asignados al <strong>Grupo {grupoSeleccionado}</strong> en{' '}
            <strong>{proyectoSeleccionado}</strong>.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {oficialesDelGrupo.map((of) => {
              const ced = of.cedula.toUpperCase();
              const fila = filas[ced] || {
                cedula: ced,
                nombre_completo: `${of.apellidos}, ${of.nombres}`,
                grupo: of.grupo,
                estatus: 'PRESENTE',
                proyecto_apoyo: '',
                observacion: '',
              };

              return (
                <div key={of.id} className="py-3.5 space-y-2.5">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <span className="font-bold text-sm text-slate-800">
                        {of.apellidos}, {of.nombres}
                      </span>
                      <span className="ml-2 text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        C.I. {ced}
                      </span>
                      {of.turno && (
                        <span className="ml-2 text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          {of.turno}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={fila.estatus}
                        onChange={(e) => actualizarFila(ced, 'estatus', e.target.value)}
                        className={`border rounded-xl px-3 py-2 text-xs font-bold ${
                          fila.estatus === 'PRESENTE'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                            : fila.estatus === 'APOYO PRESTADO'
                            ? 'bg-amber-50 border-amber-300 text-amber-800'
                            : fila.estatus === 'FALTA INJUSTIFICADA'
                            ? 'bg-red-50 border-red-300 text-red-800'
                            : 'bg-slate-50 border-slate-300 text-slate-700'
                        }`}
                      >
                        <option value="PRESENTE">✅ PRESENTE</option>
                        <option value="APOYO PRESTADO">🔄 APOYO PRESTADO EN OTRO SERVICIO</option>
                        <option value="FALTA INJUSTIFICADA">❌ FALTA INJUSTIFICADA</option>
                        <option value="REPOSO MEDICO">🏥 REPOSO MÉDICO</option>
                        <option value="PERMISO">📋 PERMISO AUTORIZADO</option>
                        <option value="DESCANSO">🛌 LIBRE / DESCANSO</option>
                      </select>
                    </div>
                  </div>

                  {fila.estatus === 'APOYO PRESTADO' && (
                    <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200">
                      <label className="block text-xs font-bold text-amber-900 uppercase mb-1 flex items-center gap-1">
                        <ArrowRightLeft size={13} /> Proyecto Destino donde prestó apoyo *
                      </label>
                      <select
                        required
                        value={fila.proyecto_apoyo}
                        onChange={(e) => actualizarFila(ced, 'proyecto_apoyo', e.target.value)}
                        className="w-full border border-amber-300 rounded-lg px-3 py-2 text-xs font-semibold bg-white"
                      >
                        <option value="">-- Seleccione el Proyecto Destino --</option>
                        {otrosProyectos.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <input
                    type="text"
                    value={fila.observacion}
                    onChange={(e) => actualizarFila(ced, 'observacion', e.target.value)}
                    placeholder="Observación opcional (ej. hora de llegada, detalle de novedad)..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600"
                  />
                </div>
              );
            })}
          </div>
        )}

        {oficialesDelGrupo.length > 0 && (
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={guardando}
              className="px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save size={18} />
              {guardando ? 'Guardando Asistencia...' : `Guardar Asistencia Grupo ${grupoSeleccionado} (${turno})`}
            </button>
          </div>
        )}
      </form>

      {mostrarFormApoyoRecibido && (
        <form
          onSubmit={registrarApoyoRecibido}
          className="bg-indigo-50/70 p-5 rounded-2xl border border-indigo-200 space-y-4"
        >
          <h4 className="text-sm font-bold text-indigo-900 uppercase">
            Registrar Oficial Recibido en Apoyo desde Otro Proyecto (Turno {turno})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              required
              value={cedulaApoyo}
              onChange={(e) => setCedulaApoyo(e.target.value)}
              placeholder="Cédula (Ej: V-18123456)"
              className="border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white"
            />
            <input
              type="text"
              required
              value={nombreApoyo}
              onChange={(e) => setNombreApoyo(e.target.value)}
              placeholder="Apellidos y Nombres"
              className="border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white"
            />
            <select
              required
              value={origenApoyo}
              onChange={(e) => setOrigenApoyo(e.target.value)}
              className="border border-indigo-200 rounded-xl px-3 py-2 text-sm bg-white font-semibold"
            >
              <option value="">-- Proyecto de Origen --</option>
              {otrosProyectos.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setMostrarFormApoyoRecibido(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
            >
              Guardar Apoyo Recibido
            </button>
          </div>
        </form>
      )}

      {apoyosRecibidosHoy.length > 0 && (
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 space-y-2">
          <h4 className="text-xs font-bold text-indigo-800 uppercase">
            Oficiales Recibidos en Apoyo ({fecha} • Turno {turno})
          </h4>
          <div className="divide-y divide-slate-100">
            {apoyosRecibidosHoy.map((ap) => (
              <div key={ap.id} className="py-2 text-xs flex justify-between items-center">
                <span>
                  <strong>{ap.nombre_completo}</strong> (C.I. {ap.cedula}) — Origen:{' '}
                  <strong>{ap.proyecto_apoyo}</strong>
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                  APOYO RECIBIDO ({ap.turno})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
