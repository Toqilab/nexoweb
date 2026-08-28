import { useMemo, useRef, useState, useEffect } from 'react'
import { supabase } from './lib/supabase.js'

const fechaLocal = (fecha = new Date()) => {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const sumarDias = (texto, dias) => {
  const [y, m, d] = texto.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  fecha.setDate(fecha.getDate() + dias)
  return fechaLocal(fecha)
}

const diferenciaDias = (inicio, fin) => {
  const [yi, mi, di] = inicio.split('-').map(Number)
  const [yf, mf, df] = fin.split('-').map(Number)
  const a = new Date(yi, mi - 1, di)
  const b = new Date(yf, mf - 1, df)
  a.setHours(0, 0, 0, 0)
  b.setHours(0, 0, 0, 0)
  return Math.floor((b - a) / 86400000)
}

const fechaHoraAISO = (fecha, hora = '09:00') =>
  new Date(`${fecha}T${hora || '09:00'}:00`).toISOString()

const numeroONull = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return null
  const n = Number(valor)
  return Number.isNaN(n) ? null : n
}

const tipoIcono = (tipo) => ({
  cambio_agua: '💧',
  medicion_agua: '🧪',
  mantenimiento: '🧽',
  medicacion: '💊',
  ciclado: '🔄',
  alimentacion: '🍽️',
  fertilizacion: '🌿',
  producto: '🧴',
  limpieza: '🧹',
  otro: '➕',
}[tipo] || '📌')

export const TIPOS_ACTIVIDAD = [
  ['cambio_agua', '💧', 'Cambio de agua'],
  ['medicion_agua', '🧪', 'Medición'],
  ['mantenimiento', '🧽', 'Mantenimiento'],
  ['medicacion', '💊', 'Medicación'],
  ['ciclado', '🔄', 'Ciclado'],
  ['alimentacion', '🍽️', 'Alimentación'],
  ['fertilizacion', '🌿', 'Fertilización'],
  ['producto', '🧴', 'Agregar producto'],
  ['limpieza', '🧹', 'Limpieza'],
  ['otro', '➕', 'Otra actividad'],
].map(([id, icono, nombre]) => ({ id, icono, nombre }))

const rutinaOcurre = (rutina, fechaTexto) => {
  if (!rutina?.activa || !rutina?.fecha_inicio) return false
  if (fechaTexto < rutina.fecha_inicio) return false
  if (rutina.fecha_fin && fechaTexto > rutina.fecha_fin) return false

  const diferencia = diferenciaDias(rutina.fecha_inicio, fechaTexto)
  const [y, m, d] = fechaTexto.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)

  if (rutina.frecuencia === 'diaria' || rutina.frecuencia === 'cada_x_dias') {
    return diferencia % Math.max(1, Number(rutina.intervalo) || 1) === 0
  }

  if (rutina.frecuencia === 'semanal') {
    return (rutina.dias_semana ?? []).includes(fecha.getDay())
  }

  if (rutina.frecuencia === 'mensual') {
    return fecha.getDate() === Number(rutina.dia_mes || 1)
  }

  return false
}

export function SelectorRegistroActividades({
  abierto,
  acuario,
  fechaInicial = '',
  onCerrar,
  onGuardado,
  onMensaje,
}) {
  const [tipo, setTipo] = useState('')
  const [pasoFormulario, setPasoFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const guardandoRef = useRef(false)

  const [form, setForm] = useState({
    titulo: '',
    fecha: fechaLocal(),
    hora: '',
    estado: 'pendiente',
    observacion: '',
    recordatorio_minutos: '',
    repeticion: 'no_repetir',
    intervalo_dias: '1',
  })

  useEffect(() => {
    if (!abierto) return
    setTipo('')
    setPasoFormulario(false)
    setForm({
      titulo: '',
      fecha: fechaInicial || fechaLocal(),
      hora: '',
      estado: 'pendiente',
      observacion: '',
      recordatorio_minutos: '',
      repeticion: 'no_repetir',
      intervalo_dias: '1',
    })
  }, [abierto, fechaInicial])

  if (!abierto) return null

  const seleccionar = (actividad) => {
    setTipo(actividad.id)
    setForm((prev) => ({
      ...prev,
      titulo: actividad.nombre,
      fecha: fechaInicial || prev.fecha || fechaLocal(),
    }))
    setPasoFormulario(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (guardandoRef.current || !acuario?.id) return
    if (!tipo || !form.titulo.trim()) return

    guardandoRef.current = true
    setGuardando(true)

    try {
      const hora = form.hora || '09:00'
      const fechaProgramada = fechaHoraAISO(form.fecha, hora)
      const completadaEn = form.estado === 'completada' ? new Date().toISOString() : null
      const omitidaEn = form.estado === 'omitida' ? new Date().toISOString() : null

      if (form.repeticion === 'no_repetir') {
        const { error } = await supabase.from('tareas_acuario').insert([{
          acuario_id: acuario.id,
          titulo: form.titulo.trim(),
          tipo,
          descripcion: form.observacion.trim() || null,
          fecha_programada: fechaProgramada,
          fecha_original: fechaProgramada,
          estado: form.estado,
          completada_en: completadaEn,
          omitida_en: omitidaEn,
          recordatorio_minutos: numeroONull(form.recordatorio_minutos),
          metadata: { origen: 'registro_manual_etapa1' },
        }])
        if (error) throw error
      } else {
        const [y, m, d] = form.fecha.split('-').map(Number)
        const base = new Date(y, m - 1, d)
        let frecuencia = form.repeticion
        let intervalo = Number(form.intervalo_dias) || 1

        if (form.repeticion === 'cada_2_semanas') {
          frecuencia = 'cada_x_dias'
          intervalo = 14
        }

        const { data: rutina, error } = await supabase
          .from('rutinas_acuario')
          .insert([{
            acuario_id: acuario.id,
            titulo: form.titulo.trim(),
            tipo,
            descripcion: form.observacion.trim() || null,
            frecuencia,
            intervalo,
            dias_semana: frecuencia === 'semanal' ? [base.getDay()] : null,
            dia_mes: frecuencia === 'mensual' ? base.getDate() : null,
            hora: form.hora || null,
            fecha_inicio: form.fecha,
            activa: true,
          }])
          .select()
          .single()
        if (error) throw error

        if (form.fecha === fechaLocal()) {
          const { error: taskError } = await supabase.from('tareas_acuario').insert([{
            acuario_id: acuario.id,
            rutina_id: rutina.id,
            fecha_rutina: form.fecha,
            titulo: form.titulo.trim(),
            tipo,
            descripcion: form.observacion.trim() || null,
            fecha_programada: fechaProgramada,
            fecha_original: fechaProgramada,
            estado: form.estado,
            completada_en: completadaEn,
            omitida_en: omitidaEn,
            recordatorio_minutos: numeroONull(form.recordatorio_minutos),
            metadata: { origen: 'registro_manual_etapa1' },
          }])
          if (taskError) throw taskError
        }
      }

      onMensaje?.('✅ Actividad guardada correctamente.')
      await onGuardado?.()
      onCerrar?.()
    } catch (error) {
      onMensaje?.(`❌ No se pudo guardar la actividad: ${error.message}`)
    } finally {
      guardandoRef.current = false
      setGuardando(false)
    }
  }

  const manana = sumarDias(fechaLocal(), 1)
  const actividad = TIPOS_ACTIVIDAD.find((item) => item.id === tipo)

  return (
    <div className="modal-overlay registro-sheet-overlay" onClick={() => !guardando && onCerrar?.()}>
      <div className="registro-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="registro-sheet-handle" />

        <div className="registro-sheet-cabecera">
          <div>
            <h2>{pasoFormulario ? actividad?.nombre : '¿Qué quieres registrar?'}</h2>
            <p>{pasoFormulario ? 'Programa o registra esta actividad.' : 'Selecciona una actividad.'}</p>
          </div>
          <button className="boton-cerrar-modal" disabled={guardando} onClick={() => onCerrar?.()}>×</button>
        </div>

        {!pasoFormulario ? (
          <div className="selector-actividades-grid">
            {TIPOS_ACTIVIDAD.map((item) => (
              <button key={item.id} onClick={() => seleccionar(item)}>
                <span>{item.icono}</span>
                <strong>{item.nombre}</strong>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={guardar}>
            <div className="campo-formulario">
              <label>Nombre</label>
              <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
            </div>

            <div className="fecha-rapida-selector">
              <button type="button" className={form.fecha === fechaLocal() ? 'activo' : ''} onClick={() => setForm({ ...form, fecha: fechaLocal() })}>Hoy</button>
              <button type="button" className={form.fecha === manana ? 'activo' : ''} onClick={() => setForm({ ...form, fecha: manana })}>Mañana</button>
              <label>
                Elegir fecha
                <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
              </label>
            </div>

            <div className="fila-formulario">
              <div className="campo-formulario">
                <label>Hora <small>(opcional)</small></label>
                <input type="time" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} />
              </div>
              <div className="campo-formulario">
                <label>Estado</label>
                <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                  <option value="pendiente">Pendiente</option>
                  <option value="completada">Completada</option>
                  <option value="omitida">Omitida</option>
                </select>
              </div>
            </div>

            <div className="campo-formulario">
              <label>Observación</label>
              <textarea rows="3" value={form.observacion} onChange={(e) => setForm({ ...form, observacion: e.target.value })} placeholder="Opcional" />
            </div>

            <div className="fila-formulario">
              <div className="campo-formulario">
                <label>Recordatorio</label>
                <select value={form.recordatorio_minutos} onChange={(e) => setForm({ ...form, recordatorio_minutos: e.target.value })}>
                  <option value="">Sin recordatorio</option>
                  <option value="15">15 min antes</option>
                  <option value="30">30 min antes</option>
                  <option value="60">1 hora antes</option>
                  <option value="1440">1 día antes</option>
                </select>
              </div>
              <div className="campo-formulario">
                <label>Repetición</label>
                <select value={form.repeticion} onChange={(e) => setForm({ ...form, repeticion: e.target.value })}>
                  <option value="no_repetir">No repetir</option>
                  <option value="diaria">Diaria</option>
                  <option value="semanal">Semanal</option>
                  <option value="cada_2_semanas">Cada 2 semanas</option>
                  <option value="cada_x_dias">Cada X días</option>
                  <option value="mensual">Mensual</option>
                </select>
              </div>
            </div>

            {form.repeticion === 'cada_x_dias' && (
              <div className="campo-formulario">
                <label>Cada cuántos días</label>
                <input type="number" min="1" value={form.intervalo_dias} onChange={(e) => setForm({ ...form, intervalo_dias: e.target.value })} />
              </div>
            )}

            <div className="acciones-modal">
              <button type="button" className="boton-cancelar" disabled={guardando} onClick={() => setPasoFormulario(false)}>Atrás</button>
              <button className="boton-principal" disabled={guardando}>{guardando ? 'Guardando...' : form.fecha > fechaLocal() ? 'Guardar y programar' : 'Guardar'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export function CalendarioActividades({ acuario, onAgregarActividad }) {
  const [mes, setMes] = useState(() => {
    const hoy = new Date()
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  })
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaLocal())
  const [tareas, setTareas] = useState([])
  const [rutinas, setRutinas] = useState([])

  const primerDia = new Date(mes.getFullYear(), mes.getMonth(), 1)
  const ultimoDia = new Date(mes.getFullYear(), mes.getMonth() + 1, 0)
  const inicioGrilla = new Date(mes.getFullYear(), mes.getMonth(), 1 - primerDia.getDay())
  const finGrilla = new Date(mes.getFullYear(), mes.getMonth() + 1, 6 + (6 - ultimoDia.getDay()))
  const desde = fechaLocal(inicioGrilla)
  const hasta = fechaLocal(finGrilla)

  const cargar = async () => {
    const inicioISO = fechaHoraAISO(desde, '00:00')
    const finISO = fechaHoraAISO(sumarDias(hasta, 1), '00:00')
    const [t, r] = await Promise.all([
      supabase.from('tareas_acuario').select('*').eq('acuario_id', acuario.id).gte('fecha_programada', inicioISO).lt('fecha_programada', finISO).order('fecha_programada'),
      supabase.from('rutinas_acuario').select('*').eq('acuario_id', acuario.id).eq('activa', true),
    ])
    setTareas(t.data ?? [])
    setRutinas(r.data ?? [])
  }

  useEffect(() => {
    cargar()
  }, [acuario.id, mes.getMonth(), mes.getFullYear()])

  const eventos = useMemo(() => {
    const manuales = tareas.map((tarea) => ({
      id: tarea.id,
      fecha: fechaLocal(new Date(tarea.fecha_programada)),
      tipo: tarea.tipo,
      titulo: tarea.titulo,
      estado: tarea.estado || 'pendiente',
      descripcion: tarea.descripcion,
      hora: tarea.fecha_programada,
      origen: 'tarea',
    }))

    const recurrentes = []
    let cursor = new Date(inicioGrilla)
    while (cursor <= finGrilla) {
      const fechaTexto = fechaLocal(cursor)
      for (const rutina of rutinas) {
        if (rutinaOcurre(rutina, fechaTexto)) {
          const yaMaterializada = tareas.some((t) => t.rutina_id === rutina.id && t.fecha_rutina === fechaTexto)
          if (!yaMaterializada) {
            recurrentes.push({
              id: `${rutina.id}-${fechaTexto}`,
              fecha: fechaTexto,
              tipo: rutina.tipo,
              titulo: rutina.titulo,
              estado: 'pendiente',
              descripcion: rutina.descripcion,
              hora: rutina.hora ? `${fechaTexto}T${rutina.hora}` : null,
              origen: 'rutina',
            })
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    return [...manuales, ...recurrentes]
  }, [tareas, rutinas, desde, hasta])

  const eventosDia = eventos
    .filter((evento) => evento.fecha === fechaSeleccionada)
    .sort((a, b) => String(a.hora || '').localeCompare(String(b.hora || '')))

  const dias = []
  let cursor = new Date(inicioGrilla)
  while (cursor <= finGrilla) {
    dias.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  const colorEvento = (evento) => {
    if (evento.estado === 'completada') return 'completada'
    if (['cambio_agua', 'medicion_agua'].includes(evento.tipo)) return 'azul'
    if (['mantenimiento', 'limpieza', 'fertilizacion'].includes(evento.tipo)) return 'verde'
    if (evento.tipo === 'medicacion') return 'rosa'
    return 'naranja'
  }

  const nombreMes = mes.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })
  const tituloDia = new Date(`${fechaSeleccionada}T12:00:00`).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div>
      <div className="cabecera-modulo">
        <div>
          <h2>Calendario</h2>
          <p>Consulta las actividades programadas y selecciona un día para verlas.</p>
        </div>
      </div>

      <div className="calendario-toolbar">
        <button className="boton-claro" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() - 1, 1))}>←</button>
        <strong>{nombreMes}</strong>
        <button className="boton-claro" onClick={() => setMes(new Date(mes.getFullYear(), mes.getMonth() + 1, 1))}>→</button>
      </div>

      <div className="calendario-dias-cabecera">
        {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((dia) => <span key={dia}>{dia}</span>)}
      </div>

      <div className="calendario-grid calendario-grid-etapa1">
        {dias.map((dia) => {
          const texto = fechaLocal(dia)
          const delDia = eventos.filter((e) => e.fecha === texto)
          return (
            <button
              type="button"
              className={`calendario-dia calendario-dia-compacto ${dia.getMonth() === mes.getMonth() ? '' : 'fuera'} ${texto === fechaLocal() ? 'hoy' : ''} ${texto === fechaSeleccionada ? 'seleccionado' : ''}`}
              key={texto}
              onClick={() => setFechaSeleccionada(texto)}
            >
              <strong>{dia.getDate()}</strong>
              {delDia.length > 0 && (
                <div className="indicadores-calendario">
                  {delDia.slice(0, 3).map((evento, i) => <span key={`${evento.id}-${i}`} className={colorEvento(evento)} />)}
                  {delDia.length > 3 && <small>+{delDia.length - 3}</small>}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <section className="detalle-dia-calendario">
        <div className="detalle-dia-cabecera">
          <div>
            <span>Día seleccionado</span>
            <h3>{tituloDia}</h3>
          </div>
          <strong>{eventosDia.length} {eventosDia.length === 1 ? 'actividad' : 'actividades'}</strong>
        </div>

        {eventosDia.length === 0 ? (
          <div className="estado-vacio-dia">
            <span>📭</span>
            <h4>No hay actividades para este día.</h4>
            <button className="boton-principal" onClick={() => onAgregarActividad?.(fechaSeleccionada)}>+ Agregar actividad</button>
          </div>
        ) : (
          <div className="lista-actividades-dia">
            {eventosDia.map((evento) => (
              <article className="actividad-dia-card" key={`${evento.origen}-${evento.id}`}>
                <div className="actividad-dia-hora">
                  {evento.hora ? new Date(evento.hora).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' }) : '—'}
                </div>
                <div className="actividad-dia-info">
                  <strong>{tipoIcono(evento.tipo)} {evento.titulo}</strong>
                  {evento.descripcion && <p>{evento.descripcion}</p>}
                  <span className={`badge-estado-actividad ${evento.estado}`}>{evento.estado}</span>
                </div>
                <button className="boton-claro">Ver</button>
              </article>
            ))}
            <button className="boton-agregar-dia" onClick={() => onAgregarActividad?.(fechaSeleccionada)}>+ Agregar actividad para este día</button>
          </div>
        )}
      </section>
    </div>
  )
}
