
import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase.js'
import { CalendarioActividades } from './ActividadesFinal.jsx'
import { subirImagenPublica, formatoBytes } from './utilsImagenes.js'

const fechaLocal = (fecha = new Date()) => {
  const y = fecha.getFullYear()
  const m = String(fecha.getMonth() + 1).padStart(2, '0')
  const d = String(fecha.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const fechaBonita = (valor) => {
  if (!valor) return '—'
  const parte = valor.includes('T') ? valor.split('T')[0] : valor
  const [y, m, d] = parte.split('-')
  return `${d}/${m}/${y}`
}

const numeroONull = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return null
  const n = Number(valor)
  return Number.isNaN(n) ? null : n
}

const iconoTipo = (tipo) => ({
  producto: '🧪',
  medicion_agua: '💧',
  cambio_agua: '🔄',
  mantenimiento: '🧽',
  medicacion: '💊',
  ciclado: '🔄',
  limpieza: '🧹',
  alimentacion: '🍽️',
  nota: '📝',
  otro: '📌',
}[tipo] || '📌')

const sumarDias = (texto, dias) => {
  const [y, m, d] = texto.split('-').map(Number)
  const fecha = new Date(y, m - 1, d)
  fecha.setDate(fecha.getDate() + dias)
  return fechaLocal(fecha)
}

const fechaDesdeTimestampLocal = (valor) => {
  if (!valor) return ''

  const fecha = new Date(valor)

  if (Number.isNaN(fecha.getTime())) {
    return String(valor).split('T')[0]
  }

  return fechaLocal(fecha)
}

const fechaHoraAISO = (fecha, hora = '09:00') => {
  return new Date(`${fecha}T${hora}:00`).toISOString()
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

const ocurrenciasRutina = (rutina, desde, hasta) => {
  if (!rutina?.activa || !rutina?.fecha_inicio) return []
  const inicio = rutina.fecha_inicio > desde ? rutina.fecha_inicio : desde
  const resultados = []
  const diasTotales = Math.max(0, diferenciaDias(inicio, hasta))

  for (let i = 0; i <= diasTotales; i += 1) {
    const fecha = sumarDias(inicio, i)
    if (fecha < rutina.fecha_inicio) continue
    if (rutina.fecha_fin && fecha > rutina.fecha_fin) continue

    const transcurridos = diferenciaDias(rutina.fecha_inicio, fecha)
    const [y, m, d] = fecha.split('-').map(Number)
    const obj = new Date(y, m - 1, d)
    let coincide = false

    if (rutina.frecuencia === 'diaria') {
      coincide = transcurridos % Math.max(1, Number(rutina.intervalo) || 1) === 0
    } else if (rutina.frecuencia === 'semanal') {
      const dias = rutina.dias_semana?.length ? rutina.dias_semana : [obj.getDay()]
      coincide = dias.includes(obj.getDay())
    } else if (rutina.frecuencia === 'mensual') {
      coincide = obj.getDate() === Number(rutina.dia_mes || 1)
    } else if (rutina.frecuencia === 'cada_x_dias') {
      coincide = transcurridos % Math.max(1, Number(rutina.intervalo) || 1) === 0
    }

    if (coincide) {
      resultados.push({
        id: `${rutina.id}-${fecha}`,
        rutina_id: rutina.id,
        fecha,
        titulo: rutina.titulo,
        tipo: rutina.tipo,
        hora: rutina.hora,
        rutina,
      })
    }
  }
  return resultados
}

function Encabezado({ titulo, descripcion, accion, onAccion }) {
  return (
    <div className="cabecera-modulo">
      <div>
        <h2>{titulo}</h2>
        <p>{descripcion}</p>
      </div>
      {accion && <button type="button" className="boton-principal" onClick={() => onAccion?.()}>{accion}</button>}
    </div>
  )
}

function Modal({ titulo, subtitulo, onCerrar, children }) {
  return (
    <div className="modal-overlay">
      <div className="modal-acuario">
        <div className="modal-cabecera">
          <div>
            <h2>{titulo}</h2>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button className="boton-cerrar-modal" onClick={onCerrar}>×</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ResumenInteligente({ acuario }) {
  const [datos, setDatos] = useState({
    ultima: null,
    vencidas: 0,
    proximas: [],
    stockBajo: 0,
  })

  useEffect(() => {
    if (!acuario?.id) return

    const cargar = async () => {
      const ahora = new Date().toISOString()
      const [agua, vencidas, tareas, asignaciones] = await Promise.all([
        supabase.from('parametros_agua').select('*').eq('acuario_id', acuario.id).order('fecha_medicion', { ascending: false }).limit(1),
        supabase.from('tareas_acuario').select('id', { count: 'exact', head: true }).eq('acuario_id', acuario.id).eq('estado', 'pendiente').lt('fecha_programada', ahora),
        supabase.from('tareas_acuario').select('*').eq('acuario_id', acuario.id).eq('estado', 'pendiente').gte('fecha_programada', ahora).order('fecha_programada').limit(3),
        supabase.from('productos_acuario').select('producto_id').eq('acuario_id', acuario.id).eq('estado', 'activo'),
      ])

      const ids = (asignaciones.data ?? []).map(x => x.producto_id)
      let stockBajo = 0
      if (ids.length) {
        const { data: productos } = await supabase
          .from('productos')
          .select('id,contenido_actual,stock_minimo')
          .in('id', ids)
        stockBajo = (productos ?? []).filter(p =>
          p.stock_minimo != null &&
          p.contenido_actual != null &&
          Number(p.contenido_actual) <= Number(p.stock_minimo)
        ).length
      }

      setDatos({
        ultima: agua.data?.[0] ?? null,
        vencidas: vencidas.count ?? 0,
        proximas: tareas.data ?? [],
        stockBajo,
      })
    }

    cargar()
  }, [acuario?.id])

  const estadoAgua = datos.ultima ? 'Con medición reciente' : 'Sin medición registrada'

  return (
    <section className="panel-inteligente">
      <div className="panel-inteligente-titulo">
        <div>
          <span>ESTADO GENERAL</span>
          <h3>{datos.vencidas === 0 ? '🟢 Todo bajo control' : '🟡 Requiere atención'}</h3>
        </div>
      </div>

      <div className="grid-inteligente">
        <div>
          <span>💧 Agua</span>
          <strong>{estadoAgua}</strong>
          {datos.ultima && <small>pH {datos.ultima.ph ?? '—'} · {datos.ultima.temperatura_c ?? '—'} °C</small>}
        </div>
        <div>
          <span>⏰ Vencidas</span>
          <strong>{datos.vencidas}</strong>
          <small>{datos.vencidas ? 'Hay actividades pendientes' : 'Sin pendientes anteriores'}</small>
        </div>
        <div>
          <span>📅 Próximas</span>
          <strong>{datos.proximas.length}</strong>
          <small>{datos.proximas[0]?.titulo || 'Sin próximas tareas'}</small>
        </div>
        <div>
          <span>🧪 Stock bajo</span>
          <strong>{datos.stockBajo}</strong>
          <small>{datos.stockBajo ? 'Revisar inventario' : 'Productos suficientes'}</small>
        </div>
      </div>
    </section>
  )
}

function ConfiguracionAcuario({ acuario, session, onMensaje, onAcuarioActualizado, modoOscuro, onCambiarModo }) {
  const [form, setForm] = useState({
    nombre: acuario.nombre || '',
    descripcion: acuario.descripcion || '',
    volumen_litros: acuario.volumen_litros ?? '',
    largo_cm: acuario.largo_cm ?? '',
    ancho_cm: acuario.ancho_cm ?? '',
    alto_cm: acuario.alto_cm ?? '',
    tipo: acuario.tipo || '',
    subtipo: acuario.subtipo || '',
    ubicacion: acuario.ubicacion || '',
    exposicion_solar: acuario.exposicion_solar || '',
    temperatura_objetivo: acuario.temperatura_objetivo ?? '',
    costo_inicial: acuario.costo_inicial ?? '',
  })
  const [foto, setFoto] = useState(null)
  const [preview, setPreview] = useState(acuario.foto_portada_url || '')
  const [guardando, setGuardando] = useState(false)
  const [mostrarOpcionales, setMostrarOpcionales] = useState(false)

  useEffect(() => {
    setPreview(acuario.foto_portada_url || '')
  }, [acuario.id, acuario.foto_portada_url])

  const seleccionarFoto = (e) => {
    const archivo = e.target.files?.[0] || null
    setFoto(archivo)
    if (archivo) {
      setPreview(URL.createObjectURL(archivo))
    }
  }

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)

    try {
      let portada = acuario.foto_portada_url || null

      if (foto) {
        const subida = await subirImagenPublica({
          archivo: foto,
          usuarioId: session.user.id,
          acuarioId: acuario.id,
          carpeta: 'portada',
          maxWidth: 1200,
          maxHeight: 900,
          quality: 0.72,
        })
        portada = subida.url
      }

      const cambios = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion.trim() || null,
        volumen_litros: numeroONull(form.volumen_litros),
        largo_cm: numeroONull(form.largo_cm),
        ancho_cm: numeroONull(form.ancho_cm),
        alto_cm: numeroONull(form.alto_cm),
        tipo: form.tipo || null,
        subtipo: form.subtipo || null,
        ubicacion: form.ubicacion || null,
        exposicion_solar: form.exposicion_solar || null,
        temperatura_objetivo: numeroONull(form.temperatura_objetivo),
        costo_inicial: numeroONull(form.costo_inicial),
        foto_portada_url: portada,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('acuarios')
        .update(cambios)
        .eq('id', acuario.id)
        .select()
        .single()

      if (error) throw error

      onAcuarioActualizado?.(data)
      onMensaje('✅ Información del acuario actualizada.')
      setFoto(null)
    } catch (error) {
      onMensaje(`Error: ${error.message}`)
    }

    setGuardando(false)
  }

  const archivar = async () => {
    const seraArchivar = acuario.estado !== 'archivado'
    const texto = seraArchivar
      ? '¿Archivar este acuario? No se borrará ningún historial.'
      : '¿Reactivar este acuario?'

    if (!window.confirm(texto)) return

    const { data, error } = await supabase
      .from('acuarios')
      .update({
        estado: seraArchivar ? 'archivado' : 'activo',
        archivado_en: seraArchivar ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', acuario.id)
      .select()
      .single()

    if (error) onMensaje(`Error: ${error.message}`)
    else {
      onAcuarioActualizado?.(data)
      onMensaje(seraArchivar ? '✅ Acuario archivado sin borrar su información.' : '✅ Acuario reactivado.')
    }
  }

  return (
    <div>
      <Encabezado
        titulo="Configuración del acuario"
        descripcion="Edita información, portada y estado sin perder el historial."
      />

      <div className="config-grid">
        <form className="panel-config" onSubmit={guardar}>
          <div className="config-seccion-cabecera">
            <span>1</span>
            <div><strong>Información principal</strong><small>Lo necesario para identificar y cuidar tu acuario.</small></div>
          </div>

          <div className="campo-formulario"><label>Nombre del acuario *</label><input value={form.nombre} onChange={e => setForm({...form, nombre:e.target.value})} required /></div>

          <div className="fila-formulario">
            <div className="campo-formulario">
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => setForm({...form, tipo:e.target.value})}>
                <option value="">Seleccionar</option>
                <option>Acuario</option>
                <option>Agua dulce</option>
                <option>Plantado</option>
                <option>Comunitario</option>
                <option>Estanque</option>
                <option>Gambario</option>
                <option>Cría</option>
                <option>Otro</option>
              </select>
            </div>
            <div className="campo-formulario"><label>Volumen (litros)</label><input type="number" min="0" step="0.1" inputMode="decimal" value={form.volumen_litros} onChange={e => setForm({...form, volumen_litros:e.target.value})} /></div>
          </div>

          <div className="campo-formulario config-temperatura">
            <label>Temperatura objetivo (°C)</label>
            <input type="number" min="0" step="0.1" inputMode="decimal" value={form.temperatura_objetivo} onChange={e => setForm({...form, temperatura_objetivo:e.target.value})} />
          </div>

          <button className="boton-detalles-opcionales" type="button" aria-expanded={mostrarOpcionales} onClick={() => setMostrarOpcionales(!mostrarOpcionales)}>
            <span>⚙️</span>
            <span><strong>Detalles opcionales</strong><small>Foto, medidas, ubicación, costo y descripción</small></span>
            <span>{mostrarOpcionales ? '⌃' : '⌄'}</span>
          </button>

          {mostrarOpcionales && <div className="detalles-opcionales config-opcionales">
            <div className="portada-editor">
              <div className="portada-preview">{preview ? <img src={preview} alt="Portada" /> : <div>🐠</div>}</div>
              <div><strong>Foto de portada</strong><p>NexoWeb la comprime antes de subirla.</p><input type="file" accept="image/*" onChange={seleccionarFoto} />{foto && <small>{foto.name} · {formatoBytes(foto.size)}</small>}</div>
            </div>
            <div className="campo-formulario"><label>Subtipo <small>(opcional)</small></label><input placeholder="Ej. tropical, low-tech..." value={form.subtipo} onChange={e => setForm({...form, subtipo:e.target.value})} /></div>
            <div className="fila-tres">
              <div className="campo-formulario"><label>Largo (cm)</label><input type="number" min="0" step="0.1" inputMode="decimal" value={form.largo_cm} onChange={e => setForm({...form, largo_cm:e.target.value})} /></div>
              <div className="campo-formulario"><label>Ancho (cm)</label><input type="number" min="0" step="0.1" inputMode="decimal" value={form.ancho_cm} onChange={e => setForm({...form, ancho_cm:e.target.value})} /></div>
              <div className="campo-formulario"><label>Alto (cm)</label><input type="number" min="0" step="0.1" inputMode="decimal" value={form.alto_cm} onChange={e => setForm({...form, alto_cm:e.target.value})} /></div>
            </div>
            <div className="fila-formulario">
              <div className="campo-formulario"><label>Ubicación</label><select value={form.ubicacion} onChange={e => setForm({...form, ubicacion:e.target.value})}><option value="">Sin definir</option><option>Interior</option><option>Exterior</option></select></div>
              <div className="campo-formulario"><label>Exposición solar</label><select value={form.exposicion_solar} onChange={e => setForm({...form, exposicion_solar:e.target.value})}><option value="">Sin definir</option><option>Sin sol directo</option><option>Sol indirecto</option><option>Sol parcial</option><option>Sol directo</option></select></div>
            </div>
            <div className="campo-formulario"><label>Costo inicial <small>(opcional)</small></label><input type="number" min="0" step="0.01" inputMode="decimal" value={form.costo_inicial} onChange={e => setForm({...form, costo_inicial:e.target.value})} /></div>
            <div className="campo-formulario"><label>Descripción <small>(opcional)</small></label><textarea rows="4" value={form.descripcion} onChange={e => setForm({...form, descripcion:e.target.value})} /></div>
          </div>}

          <div className="config-guardar"><button className="boton-principal" disabled={guardando}>{guardando ? 'Guardando cambios…' : 'Guardar cambios'}</button></div>
        </form>

        <aside className="panel-config panel-config-lateral">
          <h3>Apariencia</h3>
          <div className="ajuste-linea">
            <div><strong>Modo oscuro</strong><small>Útil para revisar el acuario por la noche.</small></div>
            <button className="boton-claro" onClick={onCambiarModo}>{modoOscuro ? 'Usar claro' : 'Usar oscuro'}</button>
          </div>

          <h3>Notificaciones</h3>
          <p>Activa los avisos de las actividades que tienen fecha. Con NexoWeb abierto recibirás sus recordatorios; el envío con la aplicación totalmente cerrada requiere Web Push.</p>
          <button
            className="boton-claro boton-ancho"
            type="button"
            onClick={async () => {
              if (!('Notification' in window)) {
                onMensaje('Este navegador no admite notificaciones web.')
                return
              }

              const permiso = await Notification.requestPermission()

              if (permiso === 'granted') {
                const registro = await navigator.serviceWorker?.ready
                registro?.showNotification?.('NexoWeb', {
                  body: '✅ Notificaciones activadas.',
                  icon: '/icons/nexoweb-192.png',
                  badge: '/icons/nexoweb-192.png',
                  data: { url: '/' },
                })
                onMensaje('✅ Permiso de notificaciones activado.')
              } else {
                onMensaje('No se concedió permiso para notificaciones.')
              }
            }}
          >
            🔔 Activar / probar notificaciones
          </button>

          <h3>Estado del acuario</h3>
          <p>Archivar conserva mediciones, habitantes, fotos, dosis y todo el historial.</p>
          <button className={acuario.estado === 'archivado' ? 'boton-principal boton-ancho' : 'boton-peligro-suave boton-ancho'} onClick={archivar}>
            {acuario.estado === 'archivado' ? 'Reactivar acuario' : 'Archivar acuario'}
          </button>
        </aside>
      </div>
    </div>
  )
}

function Rutinas({ acuario, onMensaje }) {
  const [rutinas, setRutinas] = useState([])
  const [productos, setProductos] = useState([])
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [rutinaEditando, setRutinaEditando] = useState(null)
  const [form, setForm] = useState({
    titulo: '',
    tipo: 'mantenimiento',
    descripcion: '',
    frecuencia: 'semanal',
    intervalo: '1',
    dias_semana: [6],
    dia_mes: '1',
    hora: '09:00',
    fecha_inicio: fechaLocal(),
    fecha_fin: '',
    producto_id: '',
    regla_dosificacion_id: '',
    aplicar_sobre: 'volumen_total',
    litros: '',
  })

  const cargar = async () => {
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase.from('rutinas_acuario').select('*').eq('acuario_id', acuario.id).order('created_at', { ascending: false }),
      supabase.from('productos').select('*,reglas_dosificacion(*)').order('nombre'),
    ])
    setRutinas(r ?? [])
    setProductos(p ?? [])
  }

  useEffect(() => { cargar() }, [acuario.id])

  const cambiarDia = (dia) => {
    setForm(prev => ({
      ...prev,
      dias_semana: prev.dias_semana.includes(dia)
        ? prev.dias_semana.filter(x => x !== dia)
        : [...prev.dias_semana, dia],
    }))
  }

  const producto = productos.find(p => p.id === form.producto_id)
  const reglas = producto?.reglas_dosificacion ?? []

  useEffect(() => {
    if (form.producto_id && reglas.length) {
      setForm(prev => ({...prev, regla_dosificacion_id: reglas.find(r => r.activa)?.id || reglas[0].id}))
    }
  }, [form.producto_id])

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)

    const frecuenciaNormalizada = form.frecuencia === 'quincenal'
      ? 'cada_x_dias'
      : form.frecuencia

    const datosRutina = {
      acuario_id: acuario.id,
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      descripcion: form.descripcion.trim() || null,
      frecuencia: frecuenciaNormalizada,
      intervalo: form.frecuencia === 'quincenal' ? 14 : Number(form.intervalo) || 1,
      dias_semana: form.frecuencia === 'semanal' ? form.dias_semana : null,
      dia_mes: form.frecuencia === 'mensual' ? Number(form.dia_mes) : null,
      hora: form.hora || null,
      fecha_inicio: form.fecha_inicio,
      fecha_fin: form.fecha_fin || null,
      producto_id: form.tipo === 'producto' ? form.producto_id || null : null,
      regla_dosificacion_id: form.tipo === 'producto' ? form.regla_dosificacion_id || null : null,
      aplicar_sobre: form.tipo === 'producto' ? form.aplicar_sobre : null,
      litros: form.tipo === 'producto' ? numeroONull(form.litros) : null,
      activa: true,
      updated_at: new Date().toISOString(),
    }

    const { error } = rutinaEditando
      ? await supabase.from('rutinas_acuario').update(datosRutina).eq('id', rutinaEditando.id)
      : await supabase.from('rutinas_acuario').insert([datosRutina])

    if (error) onMensaje(`Error: ${error.message}`)
    else {
      setModal(false)
      setRutinaEditando(null)
      await cargar()
      onMensaje(rutinaEditando ? '✅ Rutina actualizada.' : '✅ Rutina creada.')
    }
    setGuardando(false)
  }

  const alternar = async (rutina) => {
    const { error } = await supabase.from('rutinas_acuario').update({ activa: !rutina.activa, updated_at: new Date().toISOString() }).eq('id', rutina.id)
    if (error) onMensaje(`Error: ${error.message}`)
    else cargar()
  }

  const eliminar = async (rutina) => {
    if (!window.confirm(`¿Desactivar "${rutina.titulo}" y eliminar solamente sus ocurrencias futuras pendientes?`)) return

    const ahora = new Date().toISOString()
    const { error: errorTareas } = await supabase
      .from('tareas_acuario')
      .delete()
      .eq('rutina_id', rutina.id)
      .in('estado', ['pendiente', 'reprogramada'])
      .gte('fecha_programada', ahora)

    if (errorTareas) {
      onMensaje(`Error: ${errorTareas.message}`)
      return
    }

    const { error } = await supabase
      .from('rutinas_acuario')
      .update({ activa: false, updated_at: ahora })
      .eq('id', rutina.id)

    if (error) onMensaje(`Error: ${error.message}`)
    else {
      await cargar()
      onMensaje('✅ Rutina desactivada; el historial completado se conservó.')
    }
  }

  const editar = (rutina) => {
    setRutinaEditando(rutina)
    setForm({
      titulo: rutina.titulo ?? '',
      tipo: rutina.tipo ?? 'mantenimiento',
      descripcion: rutina.descripcion ?? '',
      frecuencia: rutina.frecuencia === 'cada_x_dias' && Number(rutina.intervalo) === 14
        ? 'quincenal'
        : rutina.frecuencia ?? 'semanal',
      intervalo: String(rutina.intervalo ?? 1),
      dias_semana: rutina.dias_semana ?? [6],
      dia_mes: String(rutina.dia_mes ?? 1),
      hora: rutina.hora?.slice(0, 5) ?? '09:00',
      fecha_inicio: rutina.fecha_inicio ?? fechaLocal(),
      fecha_fin: rutina.fecha_fin ?? '',
      producto_id: rutina.producto_id ?? '',
      regla_dosificacion_id: rutina.regla_dosificacion_id ?? '',
      aplicar_sobre: rutina.aplicar_sobre ?? 'volumen_total',
      litros: rutina.litros ?? '',
    })
    setModal(true)
  }

  const textoFrecuencia = (r) => {
    if (r.frecuencia === 'diaria') return `Cada ${r.intervalo} día(s)`
    if (r.frecuencia === 'cada_x_dias' && Number(r.intervalo) === 14) return 'Quincenal'
    if (r.frecuencia === 'cada_x_dias') return `Cada ${r.intervalo} día(s)`
    if (r.frecuencia === 'mensual') return `Día ${r.dia_mes} de cada mes`
    const nombres = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
    return `Semanal · ${(r.dias_semana ?? []).map(d => nombres[d]).join(', ')}`
  }

  return (
    <div>
      <Encabezado titulo="Rutinas" descripcion="Recordatorios recurrentes exclusivos de este acuario." accion="+ Rutina" onAccion={() => { setRutinaEditando(null); setModal(true) }} />

      {rutinas.length === 0 ? (
        <div className="panel-vacio"><div className="icono-vacio">🔁</div><h3>No hay rutinas</h3><p>Crea alimentación, cambios de agua, fertilización o revisiones recurrentes.</p></div>
      ) : (
        <div className="grid-entidades">
          {rutinas.map(r => (
            <article className="tarjeta-entidad" key={r.id}>
              <div className="entidad-cabecera">
                <div className="entidad-icono">{iconoTipo(r.tipo)}</div>
                <div className="entidad-titulo"><h3>{r.titulo}</h3><p>{textoFrecuencia(r)}</p></div>
                <span className={`estado-entidad ${r.activa ? 'activo' : ''}`}>{r.activa ? 'activa' : 'pausada'}</span>
              </div>
              <div className="entidad-datos">
                <div><span>Hora</span><strong>{r.hora?.slice(0,5) || '—'}</strong></div>
                <div><span>Inicio</span><strong>{fechaBonita(r.fecha_inicio)}</strong></div>
              </div>
              {r.descripcion && <p className="entidad-nota">{r.descripcion}</p>}
              <div className="acciones-entidad">
                <button className="boton-claro" onClick={() => editar(r)}>Editar</button>
                <button className="boton-claro" onClick={() => alternar(r)}>{r.activa ? 'Pausar' : 'Activar'}</button>
                <button className="boton-eliminar-entidad" onClick={() => eliminar(r)}>Eliminar futuras</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <Modal titulo={rutinaEditando ? 'Editar rutina' : 'Nueva rutina'} subtitulo="Programa actividades exclusivas de este acuario." onCerrar={() => { setModal(false); setRutinaEditando(null) }}>
          <form onSubmit={guardar}>
            <div className="campo-formulario"><label>Nombre *</label><input value={form.titulo} onChange={e => setForm({...form,titulo:e.target.value})} placeholder="Ej. Cambio de agua semanal" required /></div>
            <div className="campo-formulario">
              <label>Tipo</label>
              <select value={form.tipo} onChange={e => setForm({...form,tipo:e.target.value})}>
                <option value="mantenimiento">🧽 Mantenimiento</option>
                <option value="cambio_agua">🔄 Cambio de agua</option>
                <option value="alimentacion">🍽️ Alimentación</option>
                <option value="medicion_agua">💧 Medición de agua</option>
                <option value="producto">🧪 Producto</option>
                <option value="nota">📝 Recordatorio</option>
                <option value="otro">📌 Otro</option>
              </select>
            </div>

            {form.tipo === 'producto' && (
              <>
                <div className="campo-formulario"><label>Producto</label><select value={form.producto_id} onChange={e => setForm({...form,producto_id:e.target.value})}><option value="">Seleccionar</option>{productos.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></div>
                <div className="campo-formulario"><label>Regla de dosis</label><select value={form.regla_dosificacion_id} onChange={e => setForm({...form,regla_dosificacion_id:e.target.value})}>{reglas.map(r => <option key={r.id} value={r.id}>{r.nombre} · {r.dosis_cantidad} {r.dosis_unidad}/{r.volumen_referencia_litros} L</option>)}</select></div>
                <div className="fila-formulario">
                  <div className="campo-formulario"><label>Aplicar sobre</label><select value={form.aplicar_sobre} onChange={e => setForm({...form,aplicar_sobre:e.target.value})}><option value="volumen_total">Volumen total</option><option value="agua_nueva">Agua nueva</option><option value="personalizado">Personalizado</option></select></div>
                  {form.aplicar_sobre !== 'volumen_total' && <div className="campo-formulario"><label>Litros</label><input type="number" step="0.1" value={form.litros} onChange={e => setForm({...form,litros:e.target.value})} /></div>}
                </div>
              </>
            )}

            <div className="campo-formulario">
              <label>Frecuencia</label>
              <select value={form.frecuencia} onChange={e => setForm({...form,frecuencia:e.target.value})}>
                <option value="diaria">Diaria</option>
                <option value="semanal">Semanal</option>
                <option value="quincenal">Quincenal</option>
                <option value="mensual">Mensual</option>
                <option value="cada_x_dias">Cada X días</option>
              </select>
            </div>

            {(form.frecuencia === 'diaria' || form.frecuencia === 'cada_x_dias') && <div className="campo-formulario"><label>Cada cuántos días</label><input type="number" min="1" value={form.intervalo} onChange={e => setForm({...form,intervalo:e.target.value})} /></div>}

            {form.frecuencia === 'semanal' && (
              <div className="campo-formulario">
                <label>Días de la semana</label>
                <div className="selector-dias">
                  {['D','L','M','X','J','V','S'].map((nombre, dia) => <button type="button" key={dia} className={form.dias_semana.includes(dia) ? 'activo' : ''} onClick={() => cambiarDia(dia)}>{nombre}</button>)}
                </div>
              </div>
            )}

            {form.frecuencia === 'mensual' && <div className="campo-formulario"><label>Día del mes</label><input type="number" min="1" max="31" value={form.dia_mes} onChange={e => setForm({...form,dia_mes:e.target.value})} /></div>}

            <div className="fila-formulario">
              <div className="campo-formulario"><label>Hora</label><input type="time" value={form.hora} onChange={e => setForm({...form,hora:e.target.value})} /></div>
              <div className="campo-formulario"><label>Fecha inicio</label><input type="date" value={form.fecha_inicio} onChange={e => setForm({...form,fecha_inicio:e.target.value})} required /></div>
            </div>

            <div className="campo-formulario"><label>Fecha fin (opcional)</label><input type="date" value={form.fecha_fin} onChange={e => setForm({...form,fecha_fin:e.target.value})} /></div>
            <div className="campo-formulario"><label>Descripción</label><textarea rows="3" value={form.descripcion} onChange={e => setForm({...form,descripcion:e.target.value})} /></div>
            <div className="acciones-modal"><button type="button" className="boton-cancelar" disabled={guardando} onClick={() => { setModal(false); setRutinaEditando(null) }}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? 'Guardando...' : rutinaEditando ? 'Guardar cambios' : 'Crear rutina'}</button></div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Calendario({
  acuario,
  onMensaje,
  onTareasCambiadas,
}) {
  const [mes, setMes] = useState(() => {
    const f = new Date()
    return new Date(f.getFullYear(), f.getMonth(), 1)
  })

  const [rutinas, setRutinas] = useState([])
  const [tareas, setTareas] = useState([])
  const [ejecuciones, setEjecuciones] = useState([])
  const [productos, setProductos] = useState([])

  const [mostrarActividad, setMostrarActividad] =
    useState(false)

  const [guardandoActividad, setGuardandoActividad] =
    useState(false)

  const [form, setForm] = useState({
    titulo: '',
    tipo: 'cambio_agua',
    fecha: fechaLocal(),
    hora: '09:00',
    repeticion: 'una_vez',
    intervalo: '1',
    dias_semana: [],
    dia_mes: '1',
    fecha_fin: '',
    descripcion: '',
    porcentaje_cambio_agua: '',
    volumen_litros: '',
    producto_id: '',
    regla_dosificacion_id: '',
    aplicar_sobre: 'volumen_total',
  })

  const primerDia = new Date(
    mes.getFullYear(),
    mes.getMonth(),
    1
  )

  const ultimoDia = new Date(
    mes.getFullYear(),
    mes.getMonth() + 1,
    0
  )

  const inicioGrilla = new Date(
    mes.getFullYear(),
    mes.getMonth(),
    1 - primerDia.getDay()
  )

  const finGrilla = new Date(
    mes.getFullYear(),
    mes.getMonth() + 1,
    6 + (6 - ultimoDia.getDay())
  )

  const desde = fechaLocal(inicioGrilla)
  const hasta = fechaLocal(finGrilla)

  const cargar = async () => {
    const inicioISO = fechaHoraAISO(desde, '00:00')
    const finISO = fechaHoraAISO(
      sumarDias(hasta, 1),
      '00:00'
    )

    const [r, t, e, p] = await Promise.all([
      supabase
        .from('rutinas_acuario')
        .select('*')
        .eq('acuario_id', acuario.id)
        .eq('activa', true),

      supabase
        .from('tareas_acuario')
        .select('*')
        .eq('acuario_id', acuario.id)
        .gte('fecha_programada', inicioISO)
        .lt('fecha_programada', finISO)
        .order('fecha_programada'),

      supabase
        .from('rutina_ejecuciones')
        .select('*')
        .eq('acuario_id', acuario.id)
        .gte('fecha_programada', desde)
        .lte('fecha_programada', hasta),

      supabase
        .from('productos')
        .select(`
          *,
          reglas_dosificacion (*)
        `)
        .order('nombre'),
    ])

    setRutinas(r.data ?? [])
    setTareas(t.data ?? [])
    setEjecuciones(e.data ?? [])
    setProductos(p.data ?? [])
  }

  useEffect(() => {
    cargar()
  }, [
    acuario.id,
    mes.getMonth(),
    mes.getFullYear(),
  ])

  const eventosRutina = useMemo(
    () =>
      rutinas.flatMap((rutina) =>
        ocurrenciasRutina(rutina, desde, hasta)
      ),
    [rutinas, desde, hasta]
  )

  const eventos = useMemo(() => {
    const rutinaEvents = eventosRutina.map((evento) => {
      const tareaRelacionada = tareas.find(
        (tarea) =>
          tarea.rutina_id === evento.rutina_id &&
          tarea.fecha_rutina === evento.fecha
      )

      const completada =
        ejecuciones.some(
          (item) =>
            item.rutina_id === evento.rutina_id &&
            item.fecha_programada === evento.fecha
        ) ||
        tareaRelacionada?.estado === 'completada'

      return {
        ...evento,
        origen: 'rutina',
        completada,
        tarea: tareaRelacionada || null,
      }
    })

    const taskEvents = tareas
      .filter((tarea) => !tarea.rutina_id)
      .map((tarea) => ({
        id: tarea.id,
        origen: 'tarea',
        fecha: fechaDesdeTimestampLocal(
          tarea.fecha_programada
        ),
        titulo: tarea.titulo,
        tipo: tarea.tipo,
        completada: tarea.estado === 'completada',
        tarea,
      }))

    return [...rutinaEvents, ...taskEvents]
  }, [eventosRutina, tareas, ejecuciones])

  const abrirActividad = (fecha = fechaLocal()) => {
    const [anio, mesFecha, diaFecha] =
      fecha.split('-').map(Number)

    const fechaObj = new Date(
      anio,
      mesFecha - 1,
      diaFecha
    )

    setForm({
      titulo: '',
      tipo: 'cambio_agua',
      fecha,
      hora: '09:00',
      repeticion: 'una_vez',
      intervalo: '1',
      dias_semana: [fechaObj.getDay()],
      dia_mes: String(fechaObj.getDate()),
      fecha_fin: '',
      descripcion: '',
      porcentaje_cambio_agua: '',
      volumen_litros: '',
      producto_id: '',
      regla_dosificacion_id: '',
      aplicar_sobre: 'volumen_total',
    })

    setMostrarActividad(true)
  }

  const abrirActividadRapida = (tipo, titulo) => {
    abrirActividad(fechaLocal())

    setTimeout(() => {
      setForm((anterior) => ({
        ...anterior,
        tipo,
        titulo,
      }))
    }, 0)
  }

  const productoSeleccionado = productos.find(
    (producto) => producto.id === form.producto_id
  )

  const reglas =
    productoSeleccionado?.reglas_dosificacion ?? []

  const reglaSeleccionada = reglas.find(
    (regla) =>
      regla.id === form.regla_dosificacion_id
  )

  useEffect(() => {
    if (!form.producto_id) {
      setForm((anterior) => ({
        ...anterior,
        regla_dosificacion_id: '',
      }))
      return
    }

    const primera =
      reglas.find((regla) => regla.activa) ||
      reglas[0]

    if (primera?.id) {
      setForm((anterior) => ({
        ...anterior,
        regla_dosificacion_id: primera.id,
      }))
    }
  }, [form.producto_id])

  const dosisCalculada = useMemo(() => {
    if (!reglaSeleccionada) return null

    let litros = Number(form.volumen_litros)

    if (
      !litros &&
      form.aplicar_sobre === 'volumen_total'
    ) {
      litros = Number(acuario.volumen_litros)
    }

    if (
      !litros ||
      !reglaSeleccionada.volumen_referencia_litros
    ) {
      return null
    }

    return (
      Number(reglaSeleccionada.dosis_cantidad) /
      Number(
        reglaSeleccionada.volumen_referencia_litros
      ) *
      litros
    )
  }, [
    reglaSeleccionada,
    form.volumen_litros,
    form.aplicar_sobre,
    acuario.volumen_litros,
  ])

  const cambiarDia = (dia) => {
    setForm((anterior) => ({
      ...anterior,
      dias_semana: anterior.dias_semana.includes(dia)
        ? anterior.dias_semana.filter(
            (item) => item !== dia
          )
        : [...anterior.dias_semana, dia],
    }))
  }

  const guardarActividad = async (e) => {
    e.preventDefault()

    if (!form.titulo.trim()) {
      onMensaje('Ingresa un nombre para la actividad.')
      return
    }

    setGuardandoActividad(true)

    try {
      const descripcionPartes = []

      if (form.descripcion.trim()) {
        descripcionPartes.push(
          form.descripcion.trim()
        )
      }

      if (
        form.tipo === 'cambio_agua' &&
        form.porcentaje_cambio_agua
      ) {
        descripcionPartes.push(
          `Cambio de agua: ${form.porcentaje_cambio_agua}%`
        )
      }

      if (
        form.tipo === 'cambio_agua' &&
        form.volumen_litros
      ) {
        descripcionPartes.push(
          `Litros: ${form.volumen_litros} L`
        )
      }

      if (form.tipo === 'medicacion') {
        descripcionPartes.push(
          'Tratamiento / medicación'
        )
      }

      if (form.tipo === 'ciclado') {
        descripcionPartes.push(
          'Seguimiento de ciclado'
        )
      }

      const descripcion =
        descripcionPartes.filter(Boolean).join(' · ') ||
        null

      const esProducto = [
        'producto',
        'medicacion',
      ].includes(form.tipo)

      if (form.repeticion === 'una_vez') {
        const { error } = await supabase
          .from('tareas_acuario')
          .insert([
            {
              acuario_id: acuario.id,
              titulo: form.titulo.trim(),
              tipo: form.tipo,
              descripcion,
              fecha_programada: fechaHoraAISO(
                form.fecha,
                form.hora || '09:00'
              ),
              estado: 'pendiente',
              producto_id: esProducto
                ? form.producto_id || null
                : null,
              regla_dosificacion_id: esProducto
                ? form.regla_dosificacion_id || null
                : null,
              aplicar_sobre: esProducto
                ? form.aplicar_sobre || null
                : null,
              volumen_litros: numeroONull(
                form.volumen_litros
              ),
              dosis_calculada:
                dosisCalculada != null
                  ? Number(dosisCalculada.toFixed(3))
                  : null,
              unidad:
                reglaSeleccionada?.dosis_unidad || null,
            },
          ])

        if (error) throw error
      } else {
        const frecuencia =
          form.repeticion === 'cada_x_dias'
            ? 'cada_x_dias'
            : form.repeticion

        const { data: rutina, error } = await supabase
          .from('rutinas_acuario')
          .insert([
            {
              acuario_id: acuario.id,
              titulo: form.titulo.trim(),
              tipo: form.tipo,
              descripcion,
              frecuencia,
              intervalo: Number(form.intervalo) || 1,
              dias_semana:
                frecuencia === 'semanal'
                  ? form.dias_semana
                  : null,
              dia_mes:
                frecuencia === 'mensual'
                  ? Number(form.dia_mes)
                  : null,
              hora: form.hora || null,
              fecha_inicio: form.fecha,
              fecha_fin: form.fecha_fin || null,
              producto_id: esProducto
                ? form.producto_id || null
                : null,
              regla_dosificacion_id: esProducto
                ? form.regla_dosificacion_id || null
                : null,
              aplicar_sobre: esProducto
                ? form.aplicar_sobre || null
                : null,
              litros: numeroONull(form.volumen_litros),
              activa: true,
            },
          ])
          .select()
          .single()

        if (error) throw error

        if (
          rutina &&
          form.fecha === fechaLocal()
        ) {
          await supabase
            .from('tareas_acuario')
            .insert([
              {
                acuario_id: acuario.id,
                rutina_id: rutina.id,
                fecha_rutina: form.fecha,
                titulo: form.titulo.trim(),
                tipo: form.tipo,
                descripcion,
                fecha_programada: fechaHoraAISO(
                  form.fecha,
                  form.hora || '09:00'
                ),
                estado: 'pendiente',
                producto_id: esProducto
                  ? form.producto_id || null
                  : null,
                regla_dosificacion_id: esProducto
                  ? form.regla_dosificacion_id || null
                  : null,
                aplicar_sobre: esProducto
                  ? form.aplicar_sobre || null
                  : null,
                volumen_litros: numeroONull(
                  form.volumen_litros
                ),
                dosis_calculada:
                  dosisCalculada != null
                    ? Number(
                        dosisCalculada.toFixed(3)
                      )
                    : null,
                unidad:
                  reglaSeleccionada?.dosis_unidad ||
                  null,
              },
            ])
        }
      }

      setMostrarActividad(false)

      await cargar()
      await onTareasCambiadas?.()

      onMensaje(
        form.repeticion === 'una_vez'
          ? '✅ Actividad programada.'
          : '✅ Rutina programada.'
      )
    } catch (error) {
      onMensaje(`Error: ${error.message}`)
    } finally {
      setGuardandoActividad(false)
    }
  }

  const dias = []
  let cursor = new Date(inicioGrilla)

  while (cursor <= finGrilla) {
    dias.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }

  const nombreMes = mes.toLocaleDateString(
    'es-EC',
    {
      month: 'long',
      year: 'numeric',
    }
  )

  return (
    <div>
      <Encabezado
        titulo="Calendario"
        descripcion="Programa manualmente lo que quieras hacer en este acuario."
        accion="+ Actividad"
        onAccion={() => abrirActividad()}
      />

      <div className="calendario-acciones-rapidas">
        <button
          onClick={() =>
            abrirActividadRapida(
              'cambio_agua',
              'Cambio de agua'
            )
          }
        >
          <span>🔄</span>
          Cambio de agua
        </button>

        <button
          onClick={() =>
            abrirActividadRapida(
              'mantenimiento',
              'Mantenimiento'
            )
          }
        >
          <span>🧽</span>
          Mantenimiento
        </button>

        <button
          onClick={() =>
            abrirActividadRapida(
              'medicacion',
              'Medicación'
            )
          }
        >
          <span>💊</span>
          Medicación
        </button>

        <button
          onClick={() =>
            abrirActividadRapida(
              'ciclado',
              'Revisión de ciclado'
            )
          }
        >
          <span>🔄</span>
          Ciclado
        </button>
      </div>

      <div className="calendario-toolbar">
        <button
          className="boton-claro"
          onClick={() =>
            setMes(
              new Date(
                mes.getFullYear(),
                mes.getMonth() - 1,
                1
              )
            )
          }
        >
          ←
        </button>

        <strong>{nombreMes}</strong>

        <button
          className="boton-claro"
          onClick={() =>
            setMes(
              new Date(
                mes.getFullYear(),
                mes.getMonth() + 1,
                1
              )
            )
          }
        >
          →
        </button>
      </div>

      <div className="calendario-dias-cabecera">
        {[
          'Dom',
          'Lun',
          'Mar',
          'Mié',
          'Jue',
          'Vie',
          'Sáb',
        ].map((dia) => (
          <span key={dia}>{dia}</span>
        ))}
      </div>

      <div className="calendario-grid">
        {dias.map((dia) => {
          const texto = fechaLocal(dia)
          const delMes =
            dia.getMonth() === mes.getMonth()

          const delDia = eventos.filter(
            (evento) => evento.fecha === texto
          )

          return (
            <button
              type="button"
              className={`calendario-dia calendario-dia-clickable ${
                delMes ? '' : 'fuera'
              } ${
                texto === fechaLocal() ? 'hoy' : ''
              }`}
              key={texto}
              onClick={() => abrirActividad(texto)}
            >
              <strong>{dia.getDate()}</strong>

              <div className="eventos-dia">
                {delDia.slice(0, 4).map((evento) => (
                  <span
                    key={`${evento.origen}-${evento.id}`}
                    className={`evento-calendario ${
                      evento.completada
                        ? 'completada'
                        : ''
                    }`}
                    title={evento.titulo}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {iconoTipo(evento.tipo)}{' '}
                    {evento.titulo}
                  </span>
                ))}

                {delDia.length > 4 && (
                  <small>
                    +{delDia.length - 4} más
                  </small>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="calendario-ayuda">
        <span>💡</span>
        <div>
          <strong>Toca cualquier día</strong>
          <small>
            Puedes crear una actividad única o una rutina diaria,
            semanal, mensual o cada X días.
          </small>
        </div>
      </div>

      {mostrarActividad && (
        <Modal
          titulo="Programar actividad"
          subtitulo="Tú decides qué hacer, cuándo hacerlo y si se repite."
          onCerrar={() => setMostrarActividad(false)}
        >
          <form onSubmit={guardarActividad}>
            <div className="campo-formulario">
              <label>Actividad</label>

              <select
                value={form.tipo}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tipo: e.target.value,
                  })
                }
              >
                <option value="cambio_agua">
                  🔄 Cambio de agua
                </option>
                <option value="mantenimiento">
                  🧽 Mantenimiento
                </option>
                <option value="limpieza">
                  🧹 Limpieza
                </option>
                <option value="medicion_agua">
                  💧 Medición de agua
                </option>
                <option value="producto">
                  🧪 Producto / fertilizante
                </option>
                <option value="medicacion">
                  💊 Medicación / tratamiento
                </option>
                <option value="alimentacion">
                  🍽️ Alimentación
                </option>
                <option value="ciclado">
                  🔄 Ciclado / revisión
                </option>
                <option value="nota">
                  📝 Recordatorio
                </option>
                <option value="otro">
                  📌 Otro
                </option>
              </select>
            </div>

            <div className="campo-formulario">
              <label>Nombre</label>
              <input
                value={form.titulo}
                onChange={(e) =>
                  setForm({
                    ...form,
                    titulo: e.target.value,
                  })
                }
                placeholder="Ej. Cambio de agua 20%"
                required
              />
            </div>

            <div className="fila-formulario">
              <div className="campo-formulario">
                <label>Fecha</label>
                <input
                  type="date"
                  value={form.fecha}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fecha: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="campo-formulario">
                <label>Hora</label>
                <input
                  type="time"
                  value={form.hora}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      hora: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {form.tipo === 'cambio_agua' && (
              <div className="fila-formulario">
                <div className="campo-formulario">
                  <label>Porcentaje %</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={form.porcentaje_cambio_agua}
                    onChange={(e) => {
                      const valor = e.target.value
                      const porcentaje = Number(valor)

                      const litros =
                        acuario.volumen_litros &&
                        porcentaje
                          ? (
                              Number(acuario.volumen_litros) *
                              porcentaje /
                              100
                            ).toFixed(1)
                          : ''

                      setForm({
                        ...form,
                        porcentaje_cambio_agua: valor,
                        volumen_litros: litros,
                      })
                    }}
                  />
                </div>

                <div className="campo-formulario">
                  <label>Litros</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.volumen_litros}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        volumen_litros: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            )}

            {[
              'producto',
              'medicacion',
            ].includes(form.tipo) && (
              <>
                <div className="campo-formulario">
                  <label>Producto</label>

                  <select
                    value={form.producto_id}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        producto_id: e.target.value,
                      })
                    }
                  >
                    <option value="">
                      Sin producto asociado
                    </option>

                    {productos.map((producto) => (
                      <option
                        key={producto.id}
                        value={producto.id}
                      >
                        {producto.nombre}
                        {producto.marca
                          ? ` · ${producto.marca}`
                          : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {reglas.length > 0 && (
                  <div className="campo-formulario">
                    <label>Regla de dosis</label>

                    <select
                      value={form.regla_dosificacion_id}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          regla_dosificacion_id:
                            e.target.value,
                        })
                      }
                    >
                      {reglas.map((regla) => (
                        <option
                          key={regla.id}
                          value={regla.id}
                        >
                          {regla.nombre} ·{' '}
                          {regla.dosis_cantidad}{' '}
                          {regla.dosis_unidad} /{' '}
                          {regla.volumen_referencia_litros} L
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="fila-formulario">
                  <div className="campo-formulario">
                    <label>Aplicar sobre</label>

                    <select
                      value={form.aplicar_sobre}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          aplicar_sobre: e.target.value,
                        })
                      }
                    >
                      <option value="volumen_total">
                        Volumen total
                      </option>
                      <option value="agua_nueva">
                        Agua nueva
                      </option>
                      <option value="personalizado">
                        Litros personalizados
                      </option>
                    </select>
                  </div>

                  <div className="campo-formulario">
                    <label>Litros</label>
                    <input
                      type="number"
                      step="0.1"
                      value={form.volumen_litros}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          volumen_litros: e.target.value,
                        })
                      }
                      placeholder={
                        form.aplicar_sobre ===
                        'volumen_total'
                          ? `${acuario.volumen_litros || ''}`
                          : ''
                      }
                    />
                  </div>
                </div>

                {dosisCalculada != null && (
                  <div className="actividad-dosis-preview">
                    <span>Dosis aproximada</span>
                    <strong>
                      {dosisCalculada.toFixed(2)}{' '}
                      {reglaSeleccionada?.dosis_unidad}
                    </strong>
                  </div>
                )}
              </>
            )}

            <div className="campo-formulario">
              <label>Repetición</label>

              <select
                value={form.repeticion}
                onChange={(e) =>
                  setForm({
                    ...form,
                    repeticion: e.target.value,
                  })
                }
              >
                <option value="una_vez">
                  Solo esta vez
                </option>
                <option value="diaria">
                  Todos los días
                </option>
                <option value="semanal">
                  Semanal
                </option>
                <option value="cada_x_dias">
                  Cada X días
                </option>
                <option value="mensual">
                  Mensual
                </option>
              </select>
            </div>

            {[
              'diaria',
              'cada_x_dias',
            ].includes(form.repeticion) && (
              <div className="campo-formulario">
                <label>Cada cuántos días</label>
                <input
                  type="number"
                  min="1"
                  value={form.intervalo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      intervalo: e.target.value,
                    })
                  }
                />
              </div>
            )}

            {form.repeticion === 'semanal' && (
              <div className="campo-formulario">
                <label>Días de la semana</label>

                <div className="selector-dias">
                  {[
                    'D',
                    'L',
                    'M',
                    'X',
                    'J',
                    'V',
                    'S',
                  ].map((nombre, dia) => (
                    <button
                      type="button"
                      key={dia}
                      className={
                        form.dias_semana.includes(dia)
                          ? 'activo'
                          : ''
                      }
                      onClick={() => cambiarDia(dia)}
                    >
                      {nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {form.repeticion === 'mensual' && (
              <div className="campo-formulario">
                <label>Día del mes</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={form.dia_mes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      dia_mes: e.target.value,
                    })
                  }
                />
              </div>
            )}

            {form.repeticion !== 'una_vez' && (
              <div className="campo-formulario">
                <label>Fecha fin (opcional)</label>
                <input
                  type="date"
                  value={form.fecha_fin}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      fecha_fin: e.target.value,
                    })
                  }
                />
              </div>
            )}

            <div className="campo-formulario">
              <label>Notas</label>
              <textarea
                rows="3"
                value={form.descripcion}
                onChange={(e) =>
                  setForm({
                    ...form,
                    descripcion: e.target.value,
                  })
                }
                placeholder="Opcional"
              />
            </div>

            <div className="acciones-modal">
              <button
                type="button"
                className="boton-cancelar"
                onClick={() =>
                  setMostrarActividad(false)
                }
                disabled={guardandoActividad}
              >
                Cancelar
              </button>

              <button
                className="boton-principal"
                disabled={guardandoActividad}
              >
                {guardandoActividad
                  ? 'Guardando...'
                  : form.repeticion === 'una_vez'
                  ? 'Programar'
                  : 'Crear rutina'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// Se conserva temporalmente para compatibilidad con instalaciones antiguas;
// la interfaz activa utiliza CalendarioActividades de ActividadesFinal.jsx.
void Calendario

function Inventario({ acuario, onMensaje }) {
  const [items, setItems] = useState([])
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState({ contenido_inicial:'', contenido_actual:'', unidad_contenido:'ml', stock_minimo:'', costo:'', lugar_compra:'' })

  const cargar = async () => {
    const { data: asig } = await supabase.from('productos_acuario').select('producto_id,estado').eq('acuario_id', acuario.id).neq('estado','finalizado')
    const ids = (asig ?? []).map(x => x.producto_id)
    if (!ids.length) return setItems([])
    const { data } = await supabase.from('productos').select('*,reglas_dosificacion(*)').in('id', ids).order('nombre')
    setItems(data ?? [])
  }

  useEffect(() => { cargar() }, [acuario.id])

  const abrir = (producto) => {
    setModal(producto)
    setForm({
      contenido_inicial: producto.contenido_inicial ?? '',
      contenido_actual: producto.contenido_actual ?? '',
      unidad_contenido: producto.unidad_contenido || producto.unidad_dosis || 'ml',
      stock_minimo: producto.stock_minimo ?? '',
      costo: producto.costo ?? '',
      lugar_compra: producto.lugar_compra || '',
    })
  }

  const guardar = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('productos').update({
      contenido_inicial: numeroONull(form.contenido_inicial),
      contenido_actual: numeroONull(form.contenido_actual),
      unidad_contenido: form.unidad_contenido,
      stock_minimo: numeroONull(form.stock_minimo),
      costo: numeroONull(form.costo),
      lugar_compra: form.lugar_compra.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', modal.id)
    if (error) onMensaje(`Error: ${error.message}`)
    else {
      setModal(null)
      cargar()
      onMensaje('✅ Inventario actualizado.')
    }
  }

  return (
    <div>
      <Encabezado titulo="Inventario" descripcion="Controla cuánto queda de cada producto y cuándo debes reponerlo." />
      {items.length === 0 ? <div className="panel-vacio"><div className="icono-vacio">📦</div><h3>Sin productos activos</h3><p>Asigna productos al acuario para controlar su inventario.</p></div> :
      <div className="grid-entidades">
        {items.map(p => {
          const actual = numeroONull(p.contenido_actual)
          const inicial = numeroONull(p.contenido_inicial)
          const minimo = numeroONull(p.stock_minimo)
          const bajo = actual != null && minimo != null && actual <= minimo
          const porcentaje = inicial && actual != null ? Math.max(0, Math.min(100, actual / inicial * 100)) : null

          return (
            <article className={`tarjeta-entidad ${bajo ? 'stock-bajo' : ''}`} key={p.id}>
              <div className="entidad-cabecera">
                <div className="entidad-icono">🧪</div>
                <div className="entidad-titulo"><h3>{p.nombre}</h3><p>{p.marca || 'Sin marca'}</p></div>
                {bajo && <span className="estado-entidad alerta">STOCK BAJO</span>}
              </div>
              <div className="stock-grande">{actual != null ? `${actual} ${p.unidad_contenido || 'ml'}` : 'Sin configurar'}</div>
              {porcentaje != null && <div className="barra-stock"><span style={{width:`${porcentaje}%`}} /></div>}
              <div className="entidad-datos">
                <div><span>Inicial</span><strong>{inicial != null ? `${inicial} ${p.unidad_contenido || 'ml'}` : '—'}</strong></div>
                <div><span>Mínimo</span><strong>{minimo != null ? `${minimo} ${p.unidad_contenido || 'ml'}` : '—'}</strong></div>
              </div>
              <button className="boton-principal boton-ancho" onClick={() => abrir(p)}>Configurar stock</button>
            </article>
          )
        })}
      </div>}

      {modal && <Modal titulo={modal.nombre} subtitulo="Inventario del producto." onCerrar={() => setModal(null)}>
        <form onSubmit={guardar}>
          <div className="fila-formulario"><div className="campo-formulario"><label>Contenido inicial</label><input type="number" step="0.01" value={form.contenido_inicial} onChange={e=>setForm({...form,contenido_inicial:e.target.value})} /></div><div className="campo-formulario"><label>Contenido actual</label><input type="number" step="0.01" value={form.contenido_actual} onChange={e=>setForm({...form,contenido_actual:e.target.value})} /></div></div>
          <div className="fila-formulario"><div className="campo-formulario"><label>Unidad</label><select value={form.unidad_contenido} onChange={e=>setForm({...form,unidad_contenido:e.target.value})}><option>ml</option><option>g</option><option>gotas</option><option>unidades</option></select></div><div className="campo-formulario"><label>Avisar cuando queden</label><input type="number" step="0.01" value={form.stock_minimo} onChange={e=>setForm({...form,stock_minimo:e.target.value})} /></div></div>
          <div className="fila-formulario"><div className="campo-formulario"><label>Costo</label><input type="number" step="0.01" value={form.costo} onChange={e=>setForm({...form,costo:e.target.value})} /></div><div className="campo-formulario"><label>Lugar de compra</label><input value={form.lugar_compra} onChange={e=>setForm({...form,lugar_compra:e.target.value})} /></div></div>
          <div className="acciones-modal"><button type="button" className="boton-cancelar" onClick={()=>setModal(null)}>Cancelar</button><button className="boton-principal">Guardar</button></div>
        </form>
      </Modal>}
    </div>
  )
}

function Costos({ acuario, onMensaje }) {
  const [gastos, setGastos] = useState([])
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ fecha:fechaLocal(), categoria:'Producto', concepto:'', valor:'', observaciones:'' })

  const cargar = async () => {
    const { data, error } = await supabase.from('gastos_acuario').select('*').eq('acuario_id', acuario.id).order('fecha', { ascending:false })
    if (error) onMensaje(`Error: ${error.message}`)
    else setGastos(data ?? [])
  }
  useEffect(()=>{cargar()},[acuario.id])

  const guardar = async (e) => {
    e.preventDefault()
    const { error } = await supabase.from('gastos_acuario').insert([{
      acuario_id:acuario.id, fecha:form.fecha, categoria:form.categoria,
      concepto:form.concepto.trim(), valor:Number(form.valor)||0,
      observaciones:form.observaciones.trim()||null
    }])
    if (error) onMensaje(`Error: ${error.message}`)
    else {setModal(false); cargar(); onMensaje('✅ Gasto registrado.')}
  }

  const total = gastos.reduce((s,g)=>s+Number(g.valor||0), Number(acuario.costo_inicial||0))

  return (
    <div>
      <Encabezado titulo="Costos" descripcion="Control simple de lo invertido en este acuario." accion="+ Gasto" onAccion={()=>setModal(true)} />
      <div className="resumen-costos"><span>Total registrado</span><strong>${total.toFixed(2)}</strong><small>Incluye costo inicial del acuario.</small></div>
      <div className="lista-registros-genericos">
        {gastos.map(g=><article className="registro-generico" key={g.id}><div className="registro-icono">💵</div><div><span>{fechaBonita(g.fecha)} · {g.categoria}</span><strong>{g.concepto}</strong><p>${Number(g.valor).toFixed(2)}</p>{g.observaciones&&<small>{g.observaciones}</small>}</div></article>)}
      </div>

      {modal && <Modal titulo="Registrar gasto" onCerrar={()=>setModal(false)}>
        <form onSubmit={guardar}>
          <div className="fila-formulario"><div className="campo-formulario"><label>Fecha</label><input type="date" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})}/></div><div className="campo-formulario"><label>Categoría</label><select value={form.categoria} onChange={e=>setForm({...form,categoria:e.target.value})}><option>Producto</option><option>Habitante</option><option>Planta</option><option>Equipo</option><option>Mantenimiento</option><option>Otro</option></select></div></div>
          <div className="campo-formulario"><label>Concepto *</label><input value={form.concepto} onChange={e=>setForm({...form,concepto:e.target.value})} required /></div>
          <div className="campo-formulario"><label>Valor *</label><input type="number" min="0" step="0.01" value={form.valor} onChange={e=>setForm({...form,valor:e.target.value})} required /></div>
          <div className="campo-formulario"><label>Observaciones</label><textarea rows="3" value={form.observaciones} onChange={e=>setForm({...form,observaciones:e.target.value})}/></div>
          <div className="acciones-modal"><button type="button" className="boton-cancelar" onClick={()=>setModal(false)}>Cancelar</button><button className="boton-principal">Guardar</button></div>
        </form>
      </Modal>}
    </div>
  )
}

function Comparar({ session, onMensaje }) {
  const [acuarios, setAcuarios] = useState([])
  const [mediciones, setMediciones] = useState({})

  useEffect(() => {
    if (!session?.user?.id) return
    const cargar = async () => {
      const { data: lista, error } = await supabase.from('acuarios').select('*').eq('usuario_id', session.user.id).neq('estado','archivado').order('nombre')
      if (error) return onMensaje(`Error: ${error.message}`)
      setAcuarios(lista ?? [])
      const mapa = {}
      await Promise.all((lista ?? []).map(async a => {
        const { data } = await supabase.from('parametros_agua').select('*').eq('acuario_id', a.id).order('fecha_medicion',{ascending:false}).limit(1)
        mapa[a.id] = data?.[0] ?? null
      }))
      setMediciones(mapa)
    }
    cargar()
  }, [session?.user?.id])

  return (
    <div>
      <Encabezado titulo="Comparar acuarios" descripcion="Última medición y estado de todos tus acuarios en una sola vista." />
      <div className="tabla-scroll">
        <table className="tabla-comparar">
          <thead><tr><th>Acuario</th><th>Volumen</th><th>pH</th><th>Temp.</th><th>NH3/NH4</th><th>NO2</th><th>NO3</th><th>Medición</th></tr></thead>
          <tbody>
            {acuarios.map(a => {
              const m = mediciones[a.id]
              return <tr key={a.id}><td><strong>{a.nombre}</strong><small>{a.tipo||''}</small></td><td>{a.volumen_litros?`${a.volumen_litros} L`:'—'}</td><td>{m?.ph??'—'}</td><td>{m?.temperatura_c!=null?`${m.temperatura_c} °C`:'—'}</td><td>{m?.amonio_nh3??'—'}</td><td>{m?.nitrito_no2??'—'}</td><td>{m?.nitrato_no3??'—'}</td><td>{m?fechaBonita(m.fecha_medicion):'Sin datos'}</td></tr>
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Informes({ acuario, onMensaje }) {
  const [resumen, setResumen] = useState(null)
  const [url] = useState(window.location.href)

  const cargar = async () => {
    const [agua, habitantes, plantas, equipos, productos] = await Promise.all([
      supabase.from('parametros_agua').select('*').eq('acuario_id', acuario.id).order('fecha_medicion',{ascending:false}).limit(1),
      supabase.from('habitantes').select('cantidad').eq('acuario_id', acuario.id).neq('estado','baja'),
      supabase.from('plantas').select('cantidad').eq('acuario_id', acuario.id).neq('estado','baja'),
      supabase.from('equipos').select('id').eq('acuario_id', acuario.id).eq('estado','activo'),
      supabase.from('productos_acuario').select('id').eq('acuario_id', acuario.id).eq('estado','activo'),
    ])
    setResumen({
      agua: agua.data?.[0]??null,
      habitantes:(habitantes.data??[]).reduce((s,x)=>s+Number(x.cantidad||0),0),
      plantas:(plantas.data??[]).reduce((s,x)=>s+Number(x.cantidad||0),0),
      equipos:equipos.data?.length??0,
      productos:productos.data?.length??0,
    })
  }
  useEffect(()=>{cargar()},[acuario.id])

  const copiar = async () => {
    await navigator.clipboard.writeText(url)
    onMensaje('✅ Enlace copiado.')
  }

  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`

  return (
    <div>
      <Encabezado titulo="Informe y QR" descripcion="Resumen imprimible y acceso rápido al acuario." />
      <div className="informe-grid">
        <section className="informe-panel">
          {acuario.foto_portada_url && <img className="informe-portada" src={acuario.foto_portada_url} alt="" />}
          <h2>{acuario.nombre}</h2>
          <p>{acuario.tipo||'Acuario'} · {acuario.volumen_litros?`${acuario.volumen_litros} L`:'Volumen no definido'}</p>
          <div className="grid-inteligente">
            <div><span>🐟 Habitantes</span><strong>{resumen?.habitantes??0}</strong></div>
            <div><span>🌿 Plantas</span><strong>{resumen?.plantas??0}</strong></div>
            <div><span>⚙️ Equipos</span><strong>{resumen?.equipos??0}</strong></div>
            <div><span>🧪 Productos</span><strong>{resumen?.productos??0}</strong></div>
          </div>
          {resumen?.agua && <div className="informe-agua"><strong>Última medición</strong><span>pH {resumen.agua.ph??'—'} · Temp {resumen.agua.temperatura_c??'—'} °C · NO2 {resumen.agua.nitrito_no2??'—'} · NO3 {resumen.agua.nitrato_no3??'—'}</span></div>}
          <button className="boton-principal" onClick={()=>window.print()}>🖨 Imprimir / Guardar PDF</button>
        </section>
        <aside className="qr-panel">
          <h3>QR de acceso</h3>
          <img src={qr} alt="Código QR" />
          <small>El QR apunta a la URL actual de NexoWeb. Cuando publiques la aplicación, ábrela desde la URL definitiva antes de imprimirlo.</small>
          <button className="boton-claro boton-ancho" onClick={copiar}>Copiar enlace</button>
        </aside>
      </div>
    </div>
  )
}


function Salud({ acuario, onMensaje }) {
  const [habitantes, setHabitantes] = useState([])
  const [eventos, setEventos] = useState([])
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    habitante_id: '',
    tipo: 'Observación',
    estado: 'Observación',
    descripcion: '',
    tratamiento: '',
  })

  const cargar = async () => {
    const [h, e] = await Promise.all([
      supabase.from('habitantes').select('*').eq('acuario_id', acuario.id).order('nombre_comun'),
      supabase.from('salud_habitantes').select('*,habitantes(nombre_comun)').eq('acuario_id', acuario.id).order('fecha', { ascending: false }).limit(200),
    ])

    if (h.error) onMensaje(`Error: ${h.error.message}`)
    else setHabitantes(h.data ?? [])

    if (e.error) onMensaje(`Error: ${e.error.message}`)
    else setEventos(e.data ?? [])
  }

  useEffect(() => { cargar() }, [acuario.id])

  const abrir = (habitante = null) => {
    setForm({
      habitante_id: habitante?.id || habitantes[0]?.id || '',
      tipo: 'Observación',
      estado: habitante?.estado_salud || 'Observación',
      descripcion: '',
      tratamiento: '',
    })
    setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.habitante_id) return
    setGuardando(true)

    const { error } = await supabase.from('salud_habitantes').insert([{
      habitante_id: form.habitante_id,
      acuario_id: acuario.id,
      tipo: form.tipo,
      estado: form.estado || null,
      descripcion: form.descripcion.trim() || null,
      tratamiento: form.tratamiento.trim() || null,
    }])

    if (error) {
      onMensaje(`Error: ${error.message}`)
      setGuardando(false)
      return
    }

    await supabase.from('habitantes').update({
      estado_salud: form.estado || null,
      updated_at: new Date().toISOString(),
    }).eq('id', form.habitante_id)

    setModal(false)
    await cargar()
    onMensaje('✅ Seguimiento de salud registrado.')
    setGuardando(false)
  }

  const marcarBaja = async (habitante) => {
    const causa = window.prompt(`Causa de baja para ${habitante.nombre_comun}:`, '')
    if (causa === null) return

    const { error } = await supabase.from('habitantes').update({
      estado: 'baja',
      estado_salud: 'Baja',
      fecha_baja: fechaLocal(),
      causa_baja: causa.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', habitante.id)

    if (error) {
      onMensaje(`Error: ${error.message}`)
      return
    }

    await supabase.from('salud_habitantes').insert([{
      habitante_id: habitante.id,
      acuario_id: acuario.id,
      tipo: 'Baja',
      estado: 'Baja',
      descripcion: causa.trim() || null,
    }])

    await cargar()
    onMensaje('✅ Baja registrada sin eliminar el historial.')
  }

  const activos = habitantes.filter(h => h.estado !== 'baja')

  return (
    <div>
      <Encabezado titulo="Salud de habitantes" descripcion="Observaciones, tratamientos, cuarentena y bajas sin borrar el historial." accion="+ Registro" onAccion={() => abrir()} />

      <div className="grid-entidades">
        {habitantes.map(h => (
          <article className={`tarjeta-entidad ${h.estado === 'baja' ? 'entidad-baja' : ''}`} key={h.id}>
            <div className="entidad-cabecera">
              <div className="entidad-icono">🐟</div>
              <div className="entidad-titulo">
                <h3>{h.nombre_comun}</h3>
                <p>{h.nombre_cientifico || `${h.cantidad || 1} ejemplar(es)`}</p>
              </div>
              <span className={`estado-entidad ${h.estado_salud === 'Saludable' ? 'activo' : ''}`}>{h.estado_salud || 'Sin seguimiento'}</span>
            </div>
            {h.fecha_baja && <p className="entidad-nota">Baja: {fechaBonita(h.fecha_baja)}{h.causa_baja ? ` · ${h.causa_baja}` : ''}</p>}
            <div className="acciones-entidad">
              <button className="boton-claro" onClick={() => abrir(h)}>Registrar salud</button>
              {h.estado !== 'baja' && <button className="boton-eliminar-entidad" onClick={() => marcarBaja(h)}>Registrar baja</button>}
            </div>
          </article>
        ))}
      </div>

      <section className="seccion-listado">
        <div className="titulo-listado"><h3>Historial clínico / observaciones</h3><span>{eventos.length} registros</span></div>
        <div className="lista-registros-genericos">
          {eventos.map(ev => (
            <article className="registro-generico" key={ev.id}>
              <div className="registro-icono">{ev.tipo === 'Baja' ? '⚫' : ev.tipo === 'Tratamiento' ? '💊' : '🩺'}</div>
              <div>
                <span>{fechaBonita(ev.fecha)} · {ev.tipo}</span>
                <strong>{ev.habitantes?.nombre_comun || 'Habitante'} · {ev.estado || 'Sin estado'}</strong>
                {ev.descripcion && <p>{ev.descripcion}</p>}
                {ev.tratamiento && <small>Tratamiento: {ev.tratamiento}</small>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {modal && (
        <Modal titulo="Seguimiento de salud" onCerrar={() => setModal(false)}>
          <form onSubmit={guardar}>
            <div className="campo-formulario">
              <label>Habitante / especie</label>
              <select value={form.habitante_id} onChange={e => setForm({...form,habitante_id:e.target.value})} required>
                <option value="">Seleccionar</option>
                {activos.map(h => <option key={h.id} value={h.id}>{h.nombre_comun} · {h.cantidad || 1}</option>)}
              </select>
            </div>
            <div className="fila-formulario">
              <div className="campo-formulario"><label>Tipo</label><select value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}><option>Observación</option><option>Tratamiento</option><option>Cuarentena</option><option>Recuperación</option></select></div>
              <div className="campo-formulario"><label>Estado</label><select value={form.estado} onChange={e=>setForm({...form,estado:e.target.value})}><option>Saludable</option><option>Observación</option><option>En tratamiento</option><option>Cuarentena</option><option>Recuperación</option></select></div>
            </div>
            <div className="campo-formulario"><label>Descripción</label><textarea rows="4" value={form.descripcion} onChange={e=>setForm({...form,descripcion:e.target.value})} /></div>
            <div className="campo-formulario"><label>Tratamiento</label><textarea rows="3" value={form.tratamiento} onChange={e=>setForm({...form,tratamiento:e.target.value})} /></div>
            <div className="acciones-modal"><button type="button" className="boton-cancelar" onClick={()=>setModal(false)}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando?'Guardando...':'Guardar'}</button></div>
          </form>
        </Modal>
      )}
    </div>
  )
}

export default function GestionAvanzada({
  seccion,
  acuario,
  session,
  onMensaje,
  onAcuarioActualizado,
  modoOscuro,
  onCambiarModo,
  onTareasCambiadas,
  onAgregarActividad,
}) {
  if (!acuario) return null

  if (seccion === 'configuracion') return <ConfiguracionAcuario acuario={acuario} session={session} onMensaje={onMensaje} onAcuarioActualizado={onAcuarioActualizado} modoOscuro={modoOscuro} onCambiarModo={onCambiarModo} />
  if (seccion === 'salud') return <Salud acuario={acuario} onMensaje={onMensaje} />
  if (seccion === 'rutinas') return <Rutinas acuario={acuario} onMensaje={onMensaje} />
  if (seccion === 'calendario') return <CalendarioActividades acuario={acuario} onAgregarActividad={onAgregarActividad} onMensaje={onMensaje} onTareasCambiadas={onTareasCambiadas} />
  if (seccion === 'inventario') return <Inventario acuario={acuario} onMensaje={onMensaje} />
  if (seccion === 'costos') return <Costos acuario={acuario} onMensaje={onMensaje} />
  if (seccion === 'comparar') return <Comparar session={session} onMensaje={onMensaje} />
  if (seccion === 'informes') return <Informes acuario={acuario} onMensaje={onMensaje} />

  return null
}
