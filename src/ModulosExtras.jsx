import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
import { subirImagenPublica } from './utilsImagenes.js'
import GestionDatos from './GestionDatos.jsx'

const hoy = () => {
  const f = new Date()
  const y = f.getFullYear()
  const m = String(f.getMonth() + 1).padStart(2, '0')
  const d = String(f.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const fechaBonita = (valor) => {
  if (!valor) return '—'
  const fecha = valor.includes('T') ? valor.split('T')[0] : valor
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

const numeroONull = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return null
  const n = Number(valor)
  return Number.isNaN(n) ? null : n
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

function Encabezado({ titulo, descripcion, boton, onBoton }) {
  return (
    <div className="cabecera-modulo">
      <div>
        <h2>{titulo}</h2>
        <p>{descripcion}</p>
      </div>
      {boton && <button type="button" className="boton-principal" onClick={() => onBoton?.()}>{boton}</button>}
    </div>
  )
}

const ESPECIES_SUGERIDAS = [
  'Guppy',
  'Ramirezi',
  'Corydora pygmaea',
  'Corydora panda',
  'Betta',
  'Neón tetra',
  'Cardenal',
  'Platy',
  'Molly',
  'Xipho',
  'Otocinclus',
  'Ancistrus',
  'Escalar',
  'Goldfish',
  'Gamba Neocaridina',
  'Gamba Caridina',
  'Caracol Neritina',
]

const iconoHabitante = (tipo = '') => {
  const valor = tipo.toLowerCase()
  if (valor.includes('gamba') || valor.includes('camar')) return '🦐'
  if (valor.includes('caracol')) return '🐌'
  if (valor.includes('anfibio')) return '🐸'
  if (valor.includes('tortuga')) return '🐢'
  return '🐟'
}

function Habitantes({ acuario, onMensaje }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [habitanteEditando, setHabitanteEditando] = useState(null)
  const [habitanteEliminar, setHabitanteEliminar] = useState(null)
  const [eliminandoId, setEliminandoId] = useState(null)
  const [form, setForm] = useState({
    nombre_comun: '',
    nombre_cientifico: '',
    tipo: 'Pez',
    cantidad: '1',
    sexo: '',
    fecha_ingreso: hoy(),
    estado: 'activo',
    temperatura_min_c: '',
    temperatura_max_c: '',
    observaciones: '',
  })

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('habitantes')
      .select('*')
      .eq('acuario_id', acuario.id)
      .order('created_at', { ascending: false })
    if (error) onMensaje(`Error: ${error.message}`)
    else setItems(data ?? [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [acuario.id])

  const abrir = (item = null) => {
    setHabitanteEditando(item)
    setForm({
      nombre_comun: item?.nombre_comun ?? '', nombre_cientifico: item?.nombre_cientifico ?? '', tipo: item?.tipo ?? 'Pez',
      cantidad: String(item?.cantidad ?? 1), sexo: item?.sexo ?? '', fecha_ingreso: item?.fecha_ingreso ?? hoy(),
      estado: item?.estado ?? 'activo', temperatura_min_c: item?.temperatura_min_c ?? '', temperatura_max_c: item?.temperatura_max_c ?? '', observaciones: item?.observaciones ?? '',
    })
    setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.nombre_comun.trim()) return
    if (form.temperatura_min_c !== '' && form.temperatura_max_c !== '' && Number(form.temperatura_min_c) > Number(form.temperatura_max_c)) {
      onMensaje('La temperatura mínima no puede ser mayor que la máxima.')
      return
    }
    setGuardando(true)
    const datos = {
      acuario_id: acuario.id,
      nombre_comun: form.nombre_comun.trim(),
      nombre_cientifico: form.nombre_cientifico.trim() || null,
      tipo: form.tipo || null,
      cantidad: Number(form.cantidad) || 1,
      sexo: form.sexo || null,
      fecha_ingreso: form.fecha_ingreso || null,
      estado: form.estado,
      temperatura_min_c: form.temperatura_min_c === '' ? null : Number(form.temperatura_min_c),
      temperatura_max_c: form.temperatura_max_c === '' ? null : Number(form.temperatura_max_c),
      observaciones: form.observaciones.trim() || null,
      updated_at: new Date().toISOString(),
    }
    let temperaturaPendiente = false
    let { error } = habitanteEditando
      ? await supabase.from('habitantes').update(datos).eq('id', habitanteEditando.id)
      : await supabase.from('habitantes').insert([datos])

    // Compatibilidad: permite guardar aunque Supabase todavía no haya
    // actualizado su caché de esquema después de ejecutar la migración.
    if (error && /temperatura_(min|max)_c|schema cache|column/i.test(error.message || '')) {
      temperaturaPendiente = true
      const datosCompatibles = { ...datos }
      delete datosCompatibles.temperatura_min_c
      delete datosCompatibles.temperatura_max_c
      const reintento = habitanteEditando
        ? await supabase.from('habitantes').update(datosCompatibles).eq('id', habitanteEditando.id)
        : await supabase.from('habitantes').insert([datosCompatibles])
      error = reintento.error
    }
    if (error) onMensaje(`❌ Error: ${error.message}`)
    else {
      setModal(false)
      setHabitanteEditando(null)
      await cargar()
      const objetivo = acuario.temperatura_objetivo == null ? null : Number(acuario.temperatura_objetivo)
      const incompatible = objetivo != null && ((form.temperatura_min_c !== '' && objetivo < Number(form.temperatura_min_c)) || (form.temperatura_max_c !== '' && objetivo > Number(form.temperatura_max_c)))
      onMensaje(`${habitanteEditando ? '✅ Habitante actualizado.' : '✅ Habitante registrado.'}${temperaturaPendiente ? ' ⚠️ Los datos principales se guardaron, pero Supabase aún no reconoce los campos de temperatura.' : incompatible ? ` ⚠️ La temperatura objetivo (${objetivo} °C) está fuera de su rango.` : ''}`)
    }
    setGuardando(false)
  }

  const eliminar = async () => {
    const item = habitanteEliminar
    if (!item?.id || eliminandoId) return
    setEliminandoId(item.id)
    const { error } = await supabase.from('habitantes').delete().eq('id', item.id)
    if (error) {
      onMensaje(`❌ No se pudo eliminar: ${error.message}`)
      setEliminandoId(null)
      return
    }

    await cargar()
    setHabitanteEliminar(null)
    setEliminandoId(null)
    onMensaje(`✅ ${item.nombre_comun} fue eliminado correctamente.`)
  }

  return (
    <div>
      <Encabezado titulo="Habitantes" descripcion="Peces, camarones, caracoles y otros habitantes." boton="+ Habitante" onBoton={abrir} />

      {cargando ? <div className="sin-datos-panel">Cargando...</div> :
       items.length === 0 ? <div className="panel-vacio"><div className="icono-vacio">🐟</div><h3>No hay habitantes registrados</h3></div> :
       <div className="grid-entidades">
        {items.map((item) => (
          <article className="tarjeta-entidad" key={item.id}>
            <div className="entidad-cabecera">
              <div className="entidad-icono" aria-hidden="true">{iconoHabitante(item.tipo)}</div>
              <div className="entidad-titulo">
                <h3>{item.nombre_comun}</h3>
                <p>{item.nombre_cientifico || item.tipo || 'Habitante'}</p>
              </div>
              <span className={`estado-entidad ${item.estado === 'activo' ? 'activo' : ''}`}>{item.estado}</span>
            </div>
            <div className="entidad-datos">
              <div><span>Cantidad</span><strong>{item.cantidad ?? 1}</strong></div>
              <div><span>Ingreso</span><strong>{fechaBonita(item.fecha_ingreso)}</strong></div>
              {(item.temperatura_min_c != null || item.temperatura_max_c != null) && <div><span>Temperatura</span><strong>{item.temperatura_min_c ?? '—'}–{item.temperatura_max_c ?? '—'} °C</strong></div>}
            </div>
            {item.observaciones && <p className="entidad-nota">{item.observaciones}</p>}
            <div className="acciones-entidad">
              <button className="boton-claro" onClick={() => abrir(item)}>Editar</button>
              <button className="boton-eliminar-entidad" onClick={() => setHabitanteEliminar(item)}>Eliminar</button>
            </div>
          </article>
        ))}
      </div>}

      {modal && (
        <Modal titulo={habitanteEditando ? 'Editar habitante' : 'Agregar habitante'} subtitulo="Registra la especie, variedad o grupo que vive en este acuario." onCerrar={() => { if (!guardando) { setModal(false); setHabitanteEditando(null) } }}>
          <form onSubmit={guardar}>
            <div className="campo-formulario campo-especie-habitante">
              <label>Especie o nombre común *</label>
              <input
                list="especies-habitantes"
                value={form.nombre_comun}
                onChange={(e) => setForm({ ...form, nombre_comun: e.target.value })}
                placeholder="Ej. Guppy, Ramirezi, Corydora pygmaea..."
                autoComplete="off"
                required
              />
              <datalist id="especies-habitantes">
                {ESPECIES_SUGERIDAS.map((especie) => <option value={especie} key={especie} />)}
              </datalist>
              <small>Puedes elegir una sugerencia o escribir cualquier otra especie.</small>
              <div className="sugerencias-especies" aria-label="Especies frecuentes">
                {ESPECIES_SUGERIDAS.slice(0, 8).map((especie) => (
                  <button type="button" key={especie} onClick={() => setForm({ ...form, nombre_comun: especie })}>
                    {especie}
                  </button>
                ))}
              </div>
            </div>
            <div className="campo-formulario"><label>Nombre científico <span>(opcional)</span></label><input value={form.nombre_cientifico} onChange={(e) => setForm({ ...form, nombre_cientifico: e.target.value })} placeholder="Ej. Corydoras pygmaeus" /></div>
            <div className="fila-formulario">
              <div className="campo-formulario"><label>Grupo</label><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option>Pez</option><option>Gamba / Camarón</option><option>Caracol</option><option>Anfibio</option><option>Tortuga</option><option>Otro</option></select></div>
              <div className="campo-formulario"><label>Cantidad</label><input type="number" min="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} /></div>
            </div>
            <div className="fila-formulario">
              <div className="campo-formulario"><label>Sexo</label><select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })}><option value="">Sin especificar</option><option>Macho</option><option>Hembra</option><option>Mixto</option></select></div>
              <div className="campo-formulario"><label>Fecha ingreso</label><input type="date" value={form.fecha_ingreso} onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })} /></div>
            </div>
            <div className="fila-formulario">
              <div className="campo-formulario"><label>Temperatura mínima °C <span>(opcional)</span></label><input type="number" step="0.1" inputMode="decimal" value={form.temperatura_min_c} onChange={(e) => setForm({ ...form, temperatura_min_c: e.target.value })} /></div>
              <div className="campo-formulario"><label>Temperatura máxima °C <span>(opcional)</span></label><input type="number" step="0.1" inputMode="decimal" value={form.temperatura_max_c} onChange={(e) => setForm({ ...form, temperatura_max_c: e.target.value })} /></div>
            </div>
            <small className="ayuda-temperatura">Solo se validará cuando definas uno o ambos límites.</small>
            <div className="campo-formulario"><label>Observaciones</label><textarea rows="3" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
            <div className="acciones-modal"><button type="button" className="boton-cancelar" disabled={guardando} onClick={() => { setModal(false); setHabitanteEditando(null) }}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? <><span className="spinner-mini" /> Guardando...</> : habitanteEditando ? 'Guardar cambios' : 'Guardar'}</button></div>
          </form>
        </Modal>
      )}

      {habitanteEliminar && (
        <div className="modal-overlay modal-confirmacion-overlay" onClick={() => !eliminandoId && setHabitanteEliminar(null)}>
          <div className="modal-confirmacion" onClick={(e) => e.stopPropagation()}>
            <div className="confirmacion-icono peligro">🗑️</div>
            <h2>¿Eliminar habitante?</h2>
            <p>
              Vas a eliminar <strong>{habitanteEliminar.nombre_comun}</strong> de este acuario.
            </p>
            <div className="confirmacion-aviso">
              Comprueba que seleccionaste el registro correcto antes de continuar.
            </div>
            <div className="confirmacion-acciones">
              <button className="boton-cancelar" disabled={Boolean(eliminandoId)} onClick={() => setHabitanteEliminar(null)}>
                Cancelar
              </button>
              <button className="boton-eliminar-confirmacion" disabled={Boolean(eliminandoId)} onClick={eliminar}>
                {eliminandoId ? <><span className="spinner-mini" /> Eliminando...</> : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Plantas({ acuario, onMensaje }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [plantaEditando, setPlantaEditando] = useState(null)
  const [form, setForm] = useState({
    nombre_comun: '', nombre_cientifico: '', cantidad: '1',
    ubicacion: '', requerimiento_luz: '', requerimiento_co2: '',
    fecha_plantado: hoy(), estado: 'activa', temperatura_min_c: '', temperatura_max_c: '', observaciones: '',
  })

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase.from('plantas').select('*').eq('acuario_id', acuario.id).order('created_at', { ascending: false })
    if (error) onMensaje(`Error: ${error.message}`)
    else setItems(data ?? [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [acuario.id])

  const abrir = (item = null) => {
    setPlantaEditando(item)
    setForm({ nombre_comun: item?.nombre_comun ?? '', nombre_cientifico: item?.nombre_cientifico ?? '', cantidad: String(item?.cantidad ?? 1), ubicacion: item?.ubicacion ?? '', requerimiento_luz: item?.requerimiento_luz ?? '', requerimiento_co2: item?.requerimiento_co2 ?? '', fecha_plantado: item?.fecha_plantado ?? hoy(), estado: item?.estado ?? 'activa', temperatura_min_c: item?.temperatura_min_c ?? '', temperatura_max_c: item?.temperatura_max_c ?? '', observaciones: item?.observaciones ?? '' })
    setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (form.temperatura_min_c !== '' && form.temperatura_max_c !== '' && Number(form.temperatura_min_c) > Number(form.temperatura_max_c)) {
      onMensaje('La temperatura mínima no puede ser mayor que la máxima.')
      return
    }
    setGuardando(true)
    const datos = {
      acuario_id: acuario.id,
      nombre_comun: form.nombre_comun.trim(),
      nombre_cientifico: form.nombre_cientifico.trim() || null,
      cantidad: Number(form.cantidad) || 1,
      ubicacion: form.ubicacion.trim() || null,
      requerimiento_luz: form.requerimiento_luz || null,
      requerimiento_co2: form.requerimiento_co2 || null,
      fecha_plantado: form.fecha_plantado || null,
      estado: form.estado,
      temperatura_min_c: form.temperatura_min_c === '' ? null : Number(form.temperatura_min_c),
      temperatura_max_c: form.temperatura_max_c === '' ? null : Number(form.temperatura_max_c),
      observaciones: form.observaciones.trim() || null,
      updated_at: new Date().toISOString(),
    }
    let temperaturaPendiente = false
    let { error } = plantaEditando
      ? await supabase.from('plantas').update(datos).eq('id', plantaEditando.id)
      : await supabase.from('plantas').insert([datos])
    if (error && /temperatura_(min|max)_c|schema cache|column/i.test(error.message || '')) {
      temperaturaPendiente = true
      const datosCompatibles = { ...datos }
      delete datosCompatibles.temperatura_min_c
      delete datosCompatibles.temperatura_max_c
      const reintento = plantaEditando
        ? await supabase.from('plantas').update(datosCompatibles).eq('id', plantaEditando.id)
        : await supabase.from('plantas').insert([datosCompatibles])
      error = reintento.error
    }
    if (error) onMensaje(`❌ Error: ${error.message}`)
    else {
      setModal(false); setPlantaEditando(null); await cargar()
      const objetivo = acuario.temperatura_objetivo == null ? null : Number(acuario.temperatura_objetivo)
      const incompatible = objetivo != null && ((form.temperatura_min_c !== '' && objetivo < Number(form.temperatura_min_c)) || (form.temperatura_max_c !== '' && objetivo > Number(form.temperatura_max_c)))
      onMensaje(`${plantaEditando ? '✅ Planta actualizada.' : '✅ Planta registrada.'}${temperaturaPendiente ? ' ⚠️ Los datos principales se guardaron, pero Supabase aún no reconoce los campos de temperatura.' : incompatible ? ` ⚠️ La temperatura objetivo (${objetivo} °C) está fuera de su rango.` : ''}`)
    }
    setGuardando(false)
  }

  const eliminar = async (item) => {
    if (!window.confirm(`¿Eliminar ${item.nombre_comun}?`)) return
    const { error } = await supabase.from('plantas').delete().eq('id', item.id)
    if (error) onMensaje(`Error: ${error.message}`)
    else cargar()
  }

  return (
    <div>
      <Encabezado titulo="Plantas" descripcion="Especies, cantidad, ubicación y requerimientos." boton="+ Planta" onBoton={abrir} />
      {cargando ? <div className="sin-datos-panel">Cargando...</div> :
       items.length === 0 ? <div className="panel-vacio"><div className="icono-vacio">🌿</div><h3>No hay plantas registradas</h3></div> :
       <div className="grid-entidades">
        {items.map((item) => (
          <article className="tarjeta-entidad" key={item.id}>
            <div className="entidad-cabecera">
              <div className="entidad-icono">🌿</div>
              <div className="entidad-titulo"><h3>{item.nombre_comun}</h3><p>{item.nombre_cientifico || 'Planta acuática'}</p></div>
              <span className={`estado-entidad ${item.estado === 'activa' ? 'activo' : ''}`}>{item.estado}</span>
            </div>
            <div className="entidad-datos">
              <div><span>Cantidad</span><strong>{item.cantidad ?? 1}</strong></div>
              <div><span>Ubicación</span><strong>{item.ubicacion || '—'}</strong></div>
              <div><span>Luz</span><strong>{item.requerimiento_luz || '—'}</strong></div>
              <div><span>CO₂</span><strong>{item.requerimiento_co2 || '—'}</strong></div>
              {(item.temperatura_min_c != null || item.temperatura_max_c != null) && <div><span>Temperatura</span><strong>{item.temperatura_min_c ?? '—'}–{item.temperatura_max_c ?? '—'} °C</strong></div>}
            </div>
            {item.observaciones && <p className="entidad-nota">{item.observaciones}</p>}
            <div className="acciones-entidad"><button className="boton-claro" onClick={() => abrir(item)}>Editar</button><button className="boton-eliminar-entidad" onClick={() => eliminar(item)}>Eliminar</button></div>
          </article>
        ))}
      </div>}

      {modal && <Modal titulo={plantaEditando ? 'Editar planta' : 'Agregar planta'} subtitulo="Registra una planta del acuario." onCerrar={() => { if (!guardando) { setModal(false); setPlantaEditando(null) } }}>
        <form onSubmit={guardar}>
          <div className="campo-formulario"><label>Nombre común *</label><input value={form.nombre_comun} onChange={(e) => setForm({ ...form, nombre_comun: e.target.value })} required /></div>
          <div className="campo-formulario"><label>Nombre científico</label><input value={form.nombre_cientifico} onChange={(e) => setForm({ ...form, nombre_cientifico: e.target.value })} /></div>
          <div className="fila-formulario">
            <div className="campo-formulario"><label>Cantidad</label><input type="number" min="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} /></div>
            <div className="campo-formulario"><label>Ubicación</label><input placeholder="Frontal, medio, fondo..." value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} /></div>
          </div>
          <div className="fila-formulario">
            <div className="campo-formulario"><label>Temperatura mínima °C <span>(opcional)</span></label><input type="number" step="0.1" inputMode="decimal" value={form.temperatura_min_c} onChange={(e) => setForm({ ...form, temperatura_min_c: e.target.value })} /></div>
            <div className="campo-formulario"><label>Temperatura máxima °C <span>(opcional)</span></label><input type="number" step="0.1" inputMode="decimal" value={form.temperatura_max_c} onChange={(e) => setForm({ ...form, temperatura_max_c: e.target.value })} /></div>
          </div>
          <small className="ayuda-temperatura">Si no defines el rango, no afectará ninguna función.</small>
          <div className="fila-formulario">
            <div className="campo-formulario"><label>Luz</label><select value={form.requerimiento_luz} onChange={(e) => setForm({ ...form, requerimiento_luz: e.target.value })}><option value="">Sin definir</option><option>Baja</option><option>Media</option><option>Alta</option></select></div>
            <div className="campo-formulario"><label>CO₂</label><select value={form.requerimiento_co2} onChange={(e) => setForm({ ...form, requerimiento_co2: e.target.value })}><option value="">Sin definir</option><option>No requiere</option><option>Opcional</option><option>Recomendado</option><option>Requiere</option></select></div>
          </div>
          <div className="campo-formulario"><label>Fecha de plantado</label><input type="date" value={form.fecha_plantado} onChange={(e) => setForm({ ...form, fecha_plantado: e.target.value })} /></div>
          <div className="campo-formulario"><label>Observaciones</label><textarea rows="3" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
          <div className="acciones-modal"><button type="button" className="boton-cancelar" disabled={guardando} onClick={() => { setModal(false); setPlantaEditando(null) }}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? <><span className="spinner-mini" /> Guardando...</> : plantaEditando ? 'Guardar cambios' : 'Guardar'}</button></div>
        </form>
      </Modal>}
    </div>
  )
}

function Alimentacion({ acuario, onMensaje, onHistorialCambiado }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({ alimento: '', cantidad: '', observaciones: '' })

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase.from('alimentaciones').select('*').eq('acuario_id', acuario.id).order('fecha', { ascending: false }).limit(100)
    if (error) onMensaje(`Error: ${error.message}`)
    else setItems(data ?? [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [acuario.id])

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    const { error } = await supabase.from('alimentaciones').insert([{
      acuario_id: acuario.id,
      alimento: form.alimento.trim(),
      cantidad: form.cantidad.trim() || null,
      observaciones: form.observaciones.trim() || null,
    }])
    if (error) onMensaje(`Error: ${error.message}`)
    else {
      setModal(false)
      setForm({ alimento: '', cantidad: '', observaciones: '' })
      await cargar()
      onHistorialCambiado?.()
      onMensaje('✅ Alimentación registrada.')
    }
    setGuardando(false)
  }

  return (
    <div>
      <Encabezado titulo="Alimentación" descripcion="Qué alimento diste, cuánto y cuándo." boton="+ Registrar" onBoton={() => setModal(true)} />
      {cargando ? <div className="sin-datos-panel">Cargando...</div> :
       items.length === 0 ? <div className="panel-vacio"><div className="icono-vacio">🍽️</div><h3>Sin alimentaciones registradas</h3></div> :
       <div className="lista-registros-genericos">
        {items.map((item) => (
          <article className="registro-generico" key={item.id}>
            <div className="registro-icono">🍽️</div>
            <div><span>{fechaBonita(item.fecha)}</span><strong>{item.alimento}</strong>{item.cantidad && <p>{item.cantidad}</p>}{item.observaciones && <small>{item.observaciones}</small>}</div>
          </article>
        ))}
      </div>}

      {modal && <Modal titulo="Registrar alimentación" subtitulo="Guarda lo que diste de comer." onCerrar={() => setModal(false)}>
        <form onSubmit={guardar}>
          <div className="campo-formulario"><label>Alimento *</label><input placeholder="Escamas, gránulos, artemia..." value={form.alimento} onChange={(e) => setForm({ ...form, alimento: e.target.value })} required /></div>
          <div className="campo-formulario"><label>Cantidad</label><input placeholder="Una pizca, 5 gránulos..." value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} /></div>
          <div className="campo-formulario"><label>Observaciones</label><textarea rows="3" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
          <div className="acciones-modal"><button type="button" className="boton-cancelar" onClick={() => setModal(false)}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? 'Guardando...' : 'Registrar'}</button></div>
        </form>
      </Modal>}
    </div>
  )
}

function Equipos({ acuario, onMensaje }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [equipoEditando, setEquipoEditando] = useState(null)
  const [form, setForm] = useState({ nombre: '', tipo: '', marca: '', modelo: '', potencia_w: '', fecha_instalacion: hoy(), observaciones: '' })

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase.from('equipos').select('*').eq('acuario_id', acuario.id).order('created_at', { ascending: false })
    if (error) onMensaje(`Error: ${error.message}`)
    else setItems(data ?? [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [acuario.id])

  const abrir = (item = null) => {
    setEquipoEditando(item)
    setForm({
      nombre: item?.nombre ?? '', tipo: item?.tipo ?? '', marca: item?.marca ?? '',
      modelo: item?.modelo ?? '', potencia_w: item?.potencia_w ?? '',
      fecha_instalacion: item?.fecha_instalacion ?? hoy(), observaciones: item?.observaciones ?? '',
    })
    setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    const datos = {
      acuario_id: acuario.id,
      nombre: form.nombre.trim(),
      tipo: form.tipo || null,
      marca: form.marca.trim() || null,
      modelo: form.modelo.trim() || null,
      potencia_w: numeroONull(form.potencia_w),
      fecha_instalacion: form.fecha_instalacion || null,
      estado: equipoEditando?.estado ?? 'activo',
      observaciones: form.observaciones.trim() || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = equipoEditando
      ? await supabase.from('equipos').update(datos).eq('id', equipoEditando.id)
      : await supabase.from('equipos').insert([datos])
    if (error) onMensaje(`❌ Error: ${error.message}`)
    else { setModal(false); setEquipoEditando(null); await cargar(); onMensaje(equipoEditando ? '✅ Equipo actualizado.' : '✅ Equipo registrado.') }
    setGuardando(false)
  }

  const estado = async (item) => {
    const { error } = await supabase.from('equipos').update({ estado: item.estado === 'activo' ? 'inactivo' : 'activo', updated_at: new Date().toISOString() }).eq('id', item.id)
    if (error) onMensaje(`Error: ${error.message}`)
    else cargar()
  }

  const eliminar = async (item) => {
    if (!window.confirm(`¿Eliminar ${item.nombre}?`)) return
    const { error } = await supabase.from('equipos').delete().eq('id', item.id)
    if (error) onMensaje(`Error: ${error.message}`)
    else cargar()
  }

  return (
    <div>
      <Encabezado titulo="Equipos" descripcion="Filtro, bomba, calentador, aireador, CO₂ y otros." boton="+ Equipo" onBoton={() => abrir()} />
      {cargando ? <div className="sin-datos-panel">Cargando...</div> :
       items.length === 0 ? <div className="panel-vacio"><div className="icono-vacio">⚙️</div><h3>No hay equipos registrados</h3></div> :
       <div className="grid-entidades">
        {items.map((item) => (
          <article className="tarjeta-entidad" key={item.id}>
            <div className="entidad-cabecera">
              <div className="entidad-icono">⚙️</div>
              <div className="entidad-titulo"><h3>{item.nombre}</h3><p>{item.tipo || 'Equipo'}</p></div>
              <span className={`estado-entidad ${item.estado === 'activo' ? 'activo' : ''}`}>{item.estado}</span>
            </div>
            <div className="entidad-datos">
              <div><span>Marca</span><strong>{item.marca || '—'}</strong></div>
              <div><span>Modelo</span><strong>{item.modelo || '—'}</strong></div>
              <div><span>Potencia</span><strong>{item.potencia_w ? `${item.potencia_w} W` : '—'}</strong></div>
              <div><span>Instalación</span><strong>{fechaBonita(item.fecha_instalacion)}</strong></div>
            </div>
            <div className="acciones-entidad"><button className="boton-claro" onClick={() => abrir(item)}>Editar</button><button className="boton-claro" onClick={() => estado(item)}>{item.estado === 'activo' ? 'Desactivar' : 'Activar'}</button><button className="boton-eliminar-entidad" onClick={() => eliminar(item)}>Eliminar</button></div>
          </article>
        ))}
      </div>}

      {modal && <Modal titulo={equipoEditando ? 'Editar equipo' : 'Agregar equipo'} subtitulo="Registra el equipamiento del acuario." onCerrar={() => { if (!guardando) { setModal(false); setEquipoEditando(null) } }}>
        <form onSubmit={guardar}>
          <div className="campo-formulario"><label>Nombre *</label><input placeholder="Filtro principal" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></div>
          <div className="fila-formulario"><div className="campo-formulario"><label>Tipo</label><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option value="">Seleccionar</option><option>Filtro</option><option>Bomba</option><option>Calentador</option><option>Aireador</option><option>CO2</option><option>Otro</option></select></div><div className="campo-formulario"><label>Potencia W</label><input type="number" step="0.1" value={form.potencia_w} onChange={(e) => setForm({ ...form, potencia_w: e.target.value })} /></div></div>
          <div className="fila-formulario"><div className="campo-formulario"><label>Marca</label><input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></div><div className="campo-formulario"><label>Modelo</label><input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div></div>
          <div className="campo-formulario"><label>Fecha instalación</label><input type="date" value={form.fecha_instalacion} onChange={(e) => setForm({ ...form, fecha_instalacion: e.target.value })} /></div>
          <div className="campo-formulario"><label>Observaciones</label><textarea rows="3" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
          <div className="acciones-modal"><button type="button" className="boton-cancelar" disabled={guardando} onClick={() => { setModal(false); setEquipoEditando(null) }}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? <><span className="spinner-mini" /> Guardando...</> : equipoEditando ? 'Guardar cambios' : 'Guardar'}</button></div>
        </form>
      </Modal>}
    </div>
  )
}

function Iluminacion({ acuario, onMensaje }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [iluminacionEditando, setIluminacionEditando] = useState(null)
  const [form, setForm] = useState({ nombre: 'Luz principal', hora_encendido: '', hora_apagado: '', intensidad_porcentaje: '', color_luz: '', activa: true, observaciones: '' })

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase.from('iluminacion').select('*').eq('acuario_id', acuario.id).order('created_at', { ascending: false })
    if (error) onMensaje(`Error: ${error.message}`)
    else setItems(data ?? [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [acuario.id])

  const abrir = (item = null) => {
    setIluminacionEditando(item)
    setForm({
      nombre: item?.nombre ?? 'Luz principal', hora_encendido: item?.hora_encendido?.slice(0, 5) ?? '',
      hora_apagado: item?.hora_apagado?.slice(0, 5) ?? '', intensidad_porcentaje: item?.intensidad_porcentaje ?? '',
      color_luz: item?.color_luz ?? '', activa: item?.activa ?? true, observaciones: item?.observaciones ?? '',
    })
    setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    const datos = {
      acuario_id: acuario.id,
      nombre: form.nombre.trim() || 'Luz principal',
      hora_encendido: form.hora_encendido || null,
      hora_apagado: form.hora_apagado || null,
      intensidad_porcentaje: numeroONull(form.intensidad_porcentaje),
      color_luz: form.color_luz.trim() || null,
      activa: form.activa,
      observaciones: form.observaciones.trim() || null,
      updated_at: new Date().toISOString(),
    }
    const { error } = iluminacionEditando
      ? await supabase.from('iluminacion').update(datos).eq('id', iluminacionEditando.id)
      : await supabase.from('iluminacion').insert([datos])
    if (error) onMensaje(`❌ Error: ${error.message}`)
    else { setModal(false); setIluminacionEditando(null); await cargar(); onMensaje(iluminacionEditando ? '✅ Iluminación actualizada.' : '✅ Iluminación registrada.') }
    setGuardando(false)
  }

  const alternar = async (item) => {
    const { error } = await supabase.from('iluminacion').update({ activa: !item.activa, updated_at: new Date().toISOString() }).eq('id', item.id)
    if (error) onMensaje(`Error: ${error.message}`)
    else cargar()
  }

  const eliminar = async (item) => {
    if (!window.confirm(`¿Eliminar ${item.nombre || 'este horario'}?`)) return
    const { error } = await supabase.from('iluminacion').delete().eq('id', item.id)
    if (error) onMensaje(`Error: ${error.message}`)
    else cargar()
  }

  return (
    <div>
      <Encabezado titulo="Iluminación" descripcion="Horarios, intensidad y modo de luz." boton="+ Horario" onBoton={() => abrir()} />
      {cargando ? <div className="sin-datos-panel">Cargando...</div> :
       items.length === 0 ? <div className="panel-vacio"><div className="icono-vacio">💡</div><h3>No hay horarios registrados</h3></div> :
       <div className="grid-entidades">
        {items.map((item) => (
          <article className="tarjeta-entidad" key={item.id}>
            <div className="entidad-cabecera">
              <div className="entidad-icono">💡</div>
              <div className="entidad-titulo"><h3>{item.nombre || 'Iluminación'}</h3><p>{item.activa ? 'Horario activo' : 'Horario desactivado'}</p></div>
              <span className={`estado-entidad ${item.activa ? 'activo' : ''}`}>{item.activa ? 'activa' : 'inactiva'}</span>
            </div>
            <div className="entidad-datos">
              <div><span>Encendido</span><strong>{item.hora_encendido?.slice(0,5) || '—'}</strong></div>
              <div><span>Apagado</span><strong>{item.hora_apagado?.slice(0,5) || '—'}</strong></div>
              <div><span>Intensidad</span><strong>{item.intensidad_porcentaje != null ? `${item.intensidad_porcentaje}%` : '—'}</strong></div>
              <div><span>Color</span><strong>{item.color_luz || '—'}</strong></div>
            </div>
            <div className="acciones-entidad"><button className="boton-claro" onClick={() => abrir(item)}>Editar</button><button className="boton-claro" onClick={() => alternar(item)}>{item.activa ? 'Desactivar' : 'Activar'}</button><button className="boton-eliminar-entidad" onClick={() => eliminar(item)}>Eliminar</button></div>
          </article>
        ))}
      </div>}

      {modal && <Modal titulo={iluminacionEditando ? 'Editar iluminación' : 'Agregar iluminación'} subtitulo="Configura un horario de luz." onCerrar={() => { if (!guardando) { setModal(false); setIluminacionEditando(null) } }}>
        <form onSubmit={guardar}>
          <div className="campo-formulario"><label>Nombre</label><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
          <div className="fila-formulario"><div className="campo-formulario"><label>Encendido</label><input type="time" value={form.hora_encendido} onChange={(e) => setForm({ ...form, hora_encendido: e.target.value })} /></div><div className="campo-formulario"><label>Apagado</label><input type="time" value={form.hora_apagado} onChange={(e) => setForm({ ...form, hora_apagado: e.target.value })} /></div></div>
          <div className="fila-formulario"><div className="campo-formulario"><label>Intensidad %</label><input type="number" min="0" max="100" value={form.intensidad_porcentaje} onChange={(e) => setForm({ ...form, intensidad_porcentaje: e.target.value })} /></div><div className="campo-formulario"><label>Color / modo</label><input value={form.color_luz} onChange={(e) => setForm({ ...form, color_luz: e.target.value })} /></div></div>
          <label className="check-simple"><input type="checkbox" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} /> Horario activo</label>
          <div className="campo-formulario"><label>Observaciones</label><textarea rows="3" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
          <div className="acciones-modal"><button type="button" className="boton-cancelar" disabled={guardando} onClick={() => { setModal(false); setIluminacionEditando(null) }}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? <><span className="spinner-mini" /> Guardando...</> : iluminacionEditando ? 'Guardar cambios' : 'Guardar'}</button></div>
        </form>
      </Modal>}
    </div>
  )
}

function Notas({ acuario, onMensaje, onHistorialCambiado }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [notaEditando, setNotaEditando] = useState(null)
  const [form, setForm] = useState({ titulo: '', contenido: '', importante: false })

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase.from('notas_acuario').select('*').eq('acuario_id', acuario.id).order('importante', { ascending: false }).order('created_at', { ascending: false })
    if (error) onMensaje(`Error: ${error.message}`)
    else setItems(data ?? [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [acuario.id])

  const abrir = (item = null) => {
    setNotaEditando(item)
    setForm({ titulo: item?.titulo ?? '', contenido: item?.contenido ?? '', importante: item?.importante ?? false })
    setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    const datos = {
      acuario_id: acuario.id,
      titulo: form.titulo.trim() || null,
      contenido: form.contenido.trim(),
      importante: form.importante,
      updated_at: new Date().toISOString(),
    }
    const { error } = notaEditando
      ? await supabase.from('notas_acuario').update(datos).eq('id', notaEditando.id)
      : await supabase.from('notas_acuario').insert([datos])
    if (error) onMensaje(`❌ Error: ${error.message}`)
    else {
      setModal(false)
      setNotaEditando(null)
      setForm({ titulo: '', contenido: '', importante: false })
      await cargar()
      onHistorialCambiado?.()
      onMensaje(notaEditando ? '✅ Nota actualizada.' : '✅ Nota guardada.')
    }
    setGuardando(false)
  }

  const importante = async (item) => {
    const { error } = await supabase.from('notas_acuario').update({ importante: !item.importante, updated_at: new Date().toISOString() }).eq('id', item.id)
    if (error) onMensaje(`Error: ${error.message}`)
    else cargar()
  }

  const eliminar = async (item) => {
    if (!window.confirm('¿Eliminar esta nota?')) return
    const { error } = await supabase.from('notas_acuario').delete().eq('id', item.id)
    if (error) onMensaje(`Error: ${error.message}`)
    else { await cargar(); onHistorialCambiado?.() }
  }

  return (
    <div>
      <Encabezado titulo="Notas" descripcion="Observaciones rápidas e información importante." boton="+ Nota" onBoton={() => abrir()} />
      {cargando ? <div className="sin-datos-panel">Cargando...</div> :
       items.length === 0 ? <div className="panel-vacio"><div className="icono-vacio">📝</div><h3>No hay notas</h3></div> :
       <div className="grid-notas">
        {items.map((item) => (
          <article className={`tarjeta-nota ${item.importante ? 'importante' : ''}`} key={item.id}>
            <div className="nota-cabecera"><span>{item.importante ? '⭐ IMPORTANTE' : fechaBonita(item.created_at)}</span><button onClick={() => importante(item)}>{item.importante ? '★' : '☆'}</button></div>
            {item.titulo && <h3>{item.titulo}</h3>}
            <p>{item.contenido}</p>
            <div className="acciones-entidad"><button className="boton-claro" onClick={() => abrir(item)}>Editar</button><button className="boton-eliminar-entidad" onClick={() => eliminar(item)}>Eliminar</button></div>
          </article>
        ))}
      </div>}

      {modal && <Modal titulo={notaEditando ? 'Editar nota' : 'Nueva nota'} subtitulo="Guarda una observación del acuario." onCerrar={() => { if (!guardando) { setModal(false); setNotaEditando(null) } }}>
        <form onSubmit={guardar}>
          <div className="campo-formulario"><label>Título</label><input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
          <div className="campo-formulario"><label>Contenido *</label><textarea rows="5" value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })} required /></div>
          <label className="check-simple"><input type="checkbox" checked={form.importante} onChange={(e) => setForm({ ...form, importante: e.target.checked })} /> Marcar como importante</label>
          <div className="acciones-modal"><button type="button" className="boton-cancelar" disabled={guardando} onClick={() => { setModal(false); setNotaEditando(null) }}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? <><span className="spinner-mini" /> Guardando...</> : notaEditando ? 'Guardar cambios' : 'Guardar nota'}</button></div>
        </form>
      </Modal>}
    </div>
  )
}

function Fotos({ acuario, session, onMensaje }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [archivo, setArchivo] = useState(null)
  const [preview, setPreview] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [modoCalidad, setModoCalidad] = useState('miniatura')
  const [fotoEditando, setFotoEditando] = useState(null)
  const [descripcionEdicion, setDescripcionEdicion] = useState('')
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)

  const cargar = async () => {
    setCargando(true)

    const { data, error } = await supabase
      .from('fotos_acuario')
      .select('*')
      .eq('acuario_id', acuario.id)
      .order('fecha', { ascending: false })

    if (error) onMensaje(`Error: ${error.message}`)
    else setItems(data ?? [])

    setCargando(false)
  }

  useEffect(() => {
    cargar()
  }, [acuario.id])

  const seleccionarArchivo = (nuevoArchivo) => {
    if (!nuevoArchivo) return

    if (!nuevoArchivo.type?.startsWith('image/')) {
      onMensaje('Selecciona una imagen válida.')
      return
    }

    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview)
    }

    setArchivo(nuevoArchivo)
    setPreview(URL.createObjectURL(nuevoArchivo))
  }

  const abrirModal = () => {
    setArchivo(null)
    setPreview('')
    setDescripcion('')
    setModoCalidad('miniatura')
    setModal(true)
  }

  const cerrarModal = () => {
    if (guardando) return

    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview)
    }

    setArchivo(null)
    setPreview('')
    setDescripcion('')
    setModal(false)
  }

  const guardar = async (e) => {
    e.preventDefault()

    if (!archivo) {
      onMensaje('Selecciona o toma una foto.')
      return
    }

    setGuardando(true)

    try {
      const config =
        modoCalidad === 'original'
          ? {
              maxWidth: 10000,
              maxHeight: 10000,
              quality: 1,
            }
          : modoCalidad === 'media'
          ? {
              maxWidth: 1600,
              maxHeight: 1600,
              quality: 0.78,
            }
          : {
              maxWidth: 900,
              maxHeight: 900,
              quality: 0.62,
            }

      let subida = null

      if (modoCalidad === 'original') {
        // Incluso en "Original" se usa el helper porque sabe
        // conservar el archivo original cuando no puede decodificarlo.
        subida = await subirImagenPublica({
          archivo,
          usuarioId: session.user.id,
          acuarioId: acuario.id,
          carpeta: 'fotos',
          maxWidth: config.maxWidth,
          maxHeight: config.maxHeight,
          quality: config.quality,
          usarOriginalSiFalla: true,
        })
      } else {
        subida = await subirImagenPublica({
          archivo,
          usuarioId: session.user.id,
          acuarioId: acuario.id,
          carpeta: 'fotos',
          maxWidth: config.maxWidth,
          maxHeight: config.maxHeight,
          quality: config.quality,
          usarOriginalSiFalla: true,
        })
      }

      if (!subida?.url) {
        throw new Error(
          'No se obtuvo la dirección de la fotografía.'
        )
      }

      const { error: errorDb } = await supabase
        .from('fotos_acuario')
        .insert([
          {
            acuario_id: acuario.id,
            url: subida.url,
            descripcion:
              descripcion.trim() || null,
          },
        ])

      if (errorDb) throw errorDb

      if (preview?.startsWith('blob:')) {
        URL.revokeObjectURL(preview)
      }

      setArchivo(null)
      setPreview('')
      setDescripcion('')
      setModal(false)

      await cargar()

      onMensaje(
        subida.optimizada
          ? '✅ Foto guardada.'
          : '✅ Foto guardada. El teléfono no pudo comprimirla y se utilizó el archivo original.'
      )
    } catch (error) {
      onMensaje(
        `❌ No se pudo guardar la foto: ${error.message}`
      )
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (item) => {
    if (
      !window.confirm(
        '¿Eliminar esta foto del historial?'
      )
    ) {
      return
    }

    try {
      const marcador =
        '/storage/v1/object/public/fotos-acuario/'

      if (item.url?.includes(marcador)) {
        const ruta = decodeURIComponent(
          item.url.split(marcador)[1]
        )

        await supabase.storage
          .from('fotos-acuario')
          .remove([ruta])
      }

      const { error } = await supabase
        .from('fotos_acuario')
        .delete()
        .eq('id', item.id)

      if (error) throw error

      await cargar()
      onMensaje('✅ Foto eliminada.')
    } catch (error) {
      onMensaje(`Error: ${error.message}`)
    }
  }

  const guardarDescripcion = async (e) => {
    e.preventDefault()
    if (!fotoEditando?.id) return
    setGuardandoEdicion(true)

    const { error } = await supabase
      .from('fotos_acuario')
      .update({ descripcion: descripcionEdicion.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', fotoEditando.id)

    if (error) {
      onMensaje(`❌ No se pudo actualizar la descripción: ${error.message}`)
    } else {
      await cargar()
      setFotoEditando(null)
      setDescripcionEdicion('')
      onMensaje('✅ Descripción de la foto actualizada.')
    }
    setGuardandoEdicion(false)
  }

  return (
    <div>
      <Encabezado
        titulo="Fotos"
        descripcion="Evolución visual del acuario."
        boton="+ Foto"
        onBoton={abrirModal}
      />

      {cargando ? (
        <div className="sin-datos-panel">
          Cargando...
        </div>
      ) : items.length === 0 ? (
        <div className="panel-vacio">
          <div className="icono-vacio">📷</div>
          <h3>Aún no hay fotos</h3>
          <p>
            Toma una foto o elige una de tu galería.
          </p>
          <button
            className="boton-principal"
            onClick={abrirModal}
          >
            Agregar primera foto
          </button>
        </div>
      ) : (
        <div className="galeria-fotos">
          {items.map((item) => (
            <article
              className="foto-card"
              key={item.id}
            >
              <img
                src={item.url}
                alt={
                  item.descripcion ||
                  'Foto del acuario'
                }
                loading="lazy"
              />

              <div className="foto-info">
                <span>
                  {fechaBonita(item.fecha)}
                </span>

                {item.descripcion && (
                  <p>{item.descripcion}</p>
                )}

                <div className="acciones-entidad">
                  <button className="boton-claro" onClick={() => { setFotoEditando(item); setDescripcionEdicion(item.descripcion ?? '') }}>
                    Editar descripción
                  </button>
                  <button className="boton-eliminar-entidad" onClick={() => eliminar(item)}>
                    Eliminar
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {modal && (
        <Modal
          titulo="Agregar foto"
          subtitulo="La original permanece en tu teléfono; NexoWeb guarda una copia para verla desde cualquier dispositivo."
          onCerrar={cerrarModal}
        >
          <form onSubmit={guardar}>
            {!archivo ? (
              <div className="selector-foto-movil">
                <label className="accion-foto-grande">
                  <span>📷</span>
                  <strong>Tomar foto</strong>
                  <small>
                    Usar la cámara del teléfono
                  </small>

                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) =>
                      seleccionarArchivo(
                        e.target.files?.[0] ||
                        null
                      )
                    }
                  />
                </label>

                <label className="accion-foto-grande">
                  <span>🖼️</span>
                  <strong>
                    Elegir de galería
                  </strong>
                  <small>
                    Seleccionar una foto existente
                  </small>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) =>
                      seleccionarArchivo(
                        e.target.files?.[0] ||
                        null
                      )
                    }
                  />
                </label>
              </div>
            ) : (
              <div className="preview-foto-seleccionada">
                <img
                  src={preview}
                  alt="Vista previa"
                />

                <div>
                  <strong>
                    Foto seleccionada
                  </strong>
                  <small>{archivo.name}</small>

                  <button
                    type="button"
                    className="boton-claro"
                    disabled={guardando}
                    onClick={() => {
                      if (
                        preview?.startsWith(
                          'blob:'
                        )
                      ) {
                        URL.revokeObjectURL(
                          preview
                        )
                      }

                      setArchivo(null)
                      setPreview('')
                    }}
                  >
                    Cambiar foto
                  </button>
                </div>
              </div>
            )}

            <div className="campo-formulario">
              <label>
                Calidad de copia en NexoWeb
              </label>

              <div className="calidad-foto-opciones">
                {[
                  [
                    'miniatura',
                    'Ligera',
                    'Recomendada',
                  ],
                  [
                    'media',
                    'Media',
                    'Más detalle',
                  ],
                  [
                    'original',
                    'Original',
                    'Usa más espacio',
                  ],
                ].map(
                  ([
                    valor,
                    titulo,
                    detalle,
                  ]) => (
                    <button
                      key={valor}
                      type="button"
                      className={
                        modoCalidad ===
                        valor
                          ? 'activo'
                          : ''
                      }
                      onClick={() =>
                        setModoCalidad(
                          valor
                        )
                      }
                    >
                      <strong>
                        {titulo}
                      </strong>
                      <small>
                        {detalle}
                      </small>
                    </button>
                  )
                )}
              </div>
            </div>

            <div className="campo-formulario">
              <label>
                Descripción
              </label>

              <textarea
                rows="3"
                value={descripcion}
                onChange={(e) =>
                  setDescripcion(
                    e.target.value
                  )
                }
                placeholder="Ej. Día 10 de ciclado"
              />
            </div>

            <div className="acciones-modal">
              <button
                type="button"
                className="boton-cancelar"
                onClick={cerrarModal}
                disabled={guardando}
              >
                Cancelar
              </button>

              <button
                className="boton-principal"
                disabled={
                  guardando ||
                  !archivo
                }
              >
                {guardando
                  ? 'Guardando...'
                  : 'Guardar foto'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {fotoEditando && (
        <Modal titulo="Editar descripción" subtitulo="La fotografía original no será reemplazada." onCerrar={() => { if (!guardandoEdicion) setFotoEditando(null) }}>
          <form onSubmit={guardarDescripcion}>
            <img className="foto-edicion-preview" src={fotoEditando.url} alt={fotoEditando.descripcion || 'Foto del acuario'} />
            <div className="campo-formulario">
              <label>Descripción</label>
              <textarea rows="4" value={descripcionEdicion} onChange={(e) => setDescripcionEdicion(e.target.value)} placeholder="Describe lo que se observa en esta foto..." />
            </div>
            <div className="acciones-modal">
              <button type="button" className="boton-cancelar" disabled={guardandoEdicion} onClick={() => setFotoEditando(null)}>Cancelar</button>
              <button className="boton-principal" disabled={guardandoEdicion}>{guardandoEdicion ? <><span className="spinner-mini" /> Guardando...</> : 'Guardar cambios'}</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Colaboracion({ acuario, session, onMensaje }) {
  const [miembros, setMiembros] = useState([])
  const [mensajes, setMensajes] = useState([])
  const [email, setEmail] = useState('')
  const [rol, setRol] = useState('lector')
  const [texto, setTexto] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [basePreparada, setBasePreparada] = useState(true)
  const esPropietario = acuario.usuario_id === session?.user?.id

  const cargar = async () => {
    setCargando(true)
    await supabase.rpc('limpiar_mensajes_vencidos')
    const [respuestaMiembros, respuestaMensajes] = await Promise.all([
      supabase.from('acuario_miembros').select('*').eq('acuario_id', acuario.id).order('created_at'),
      supabase.from('mensajes_acuario').select('*').eq('acuario_id', acuario.id).gt('expires_at', new Date().toISOString()).order('created_at', { ascending: true }).limit(100),
    ])
    const faltaMigracion = [respuestaMiembros.error, respuestaMensajes.error].some((error) =>
      error && /schema cache|could not find the table|relation .* does not exist/i.test(error.message || '')
    )
    setBasePreparada(!faltaMigracion)
    if (!faltaMigracion) {
      if (respuestaMiembros.error) onMensaje(`Error de miembros: ${respuestaMiembros.error.message}`)
      else setMiembros(respuestaMiembros.data ?? [])
      if (respuestaMensajes.error) onMensaje(`Error de mensajes: ${respuestaMensajes.error.message}`)
      else setMensajes(respuestaMensajes.data ?? [])
    }
    setCargando(false)
  }

  useEffect(() => { cargar() }, [acuario.id])

  const invitar = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setGuardando(true)
    const { error } = await supabase.rpc('invitar_miembro_acuario', {
      p_acuario_id: acuario.id,
      p_email: email.trim().toLowerCase(),
      p_rol: rol,
    })
    if (error) onMensaje(`No se pudo compartir: ${error.message}`)
    else {
      setEmail('')
      await cargar()
      onMensaje('✅ Cuenta vinculada al acuario.')
    }
    setGuardando(false)
  }

  const quitar = async (miembro) => {
    if (!window.confirm(`¿Quitar el acceso de ${miembro.email}?`)) return
    const { error } = await supabase.from('acuario_miembros').delete().eq('id', miembro.id)
    if (error) onMensaje(`Error: ${error.message}`)
    else { await cargar(); onMensaje('✅ Acceso retirado.') }
  }

  const enviar = async (e) => {
    e.preventDefault()
    const contenido = texto.trim()
    if (!contenido) return
    setGuardando(true)
    const { error } = await supabase.from('mensajes_acuario').insert([{
      acuario_id: acuario.id,
      usuario_id: session.user.id,
      autor_email: session.user.email,
      contenido,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    }])
    if (error) onMensaje(`No se pudo enviar: ${error.message}`)
    else { setTexto(''); await cargar() }
    setGuardando(false)
  }

  return (
    <div>
      <Encabezado titulo="Compartir y mensajes" descripcion="Vincula cuentas y coordina el cuidado del acuario." />

      {!basePreparada && <div className="aviso-configuracion-colaboracion">
        <strong>⚙️ Falta preparar Supabase</strong>
        <p>Ejecuta el archivo <code>supabase_colaboracion.sql</code> en el SQL Editor. Después vuelve a abrir esta pantalla.</p>
        <button type="button" className="boton-claro" onClick={cargar}>Comprobar nuevamente</button>
      </div>}

      {basePreparada && <div className="colaboracion-grid">
        <section className="panel-config">
          <h3>👥 Acceso compartido</h3>
          <p className="texto-secundario">El dueño conserva el control. La otra persona debe crear primero una cuenta en NexoWeb.</p>
          <article className="miembro-card propietario"><div><strong>{session?.user?.email}</strong><small>{esPropietario ? 'Propietario de este acuario' : `Tu acceso: ${acuario.rol_acceso || 'compartido'}`}</small></div></article>

          {miembros.map((miembro) => (
            <article className="miembro-card" key={miembro.id}>
              <div><strong>{miembro.email}</strong><small>{miembro.rol === 'editor' ? 'Puede ver y registrar información' : 'Solo puede consultar'}</small></div>
              {esPropietario && <button type="button" className="boton-eliminar-entidad" onClick={() => quitar(miembro)}>Quitar</button>}
            </article>
          ))}

          {esPropietario && <form className="invitar-form" onSubmit={invitar}>
            <div className="campo-formulario"><label>Correo de la cuenta</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="persona@correo.com" required /></div>
            <div className="campo-formulario"><label>Permiso</label><select value={rol} onChange={(e) => setRol(e.target.value)}><option value="lector">Solo lectura</option><option value="editor">Colaborador</option></select></div>
            <button className="boton-principal" disabled={guardando}>{guardando ? 'Vinculando…' : 'Vincular cuenta'}</button>
          </form>}
        </section>

        <section className="panel-config chat-acuario">
          <div className="chat-cabecera"><div><h3>💬 Mensajes temporales</h3><p>Se eliminan automáticamente después de 7 días. Las Notas permanecen guardadas.</p></div><button type="button" className="boton-claro" onClick={cargar}>Actualizar</button></div>
          <div className="chat-lista">
            {cargando ? <p>Cargando…</p> : mensajes.length === 0 ? <div className="chat-vacio">No hay mensajes recientes.</div> : mensajes.map((mensaje) => (
              <article className={`chat-mensaje ${mensaje.usuario_id === session?.user?.id ? 'propio' : ''}`} key={mensaje.id}>
                <strong>{mensaje.autor_email === session?.user?.email ? 'Tú' : mensaje.autor_email}</strong>
                <p>{mensaje.contenido}</p>
                <small>{new Date(mensaje.created_at).toLocaleString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</small>
              </article>
            ))}
          </div>
          <form className="chat-form" onSubmit={enviar}>
            <textarea maxLength="300" rows="2" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Escribe una indicación breve…" />
            <button className="boton-principal" disabled={guardando || !texto.trim()}>Enviar</button>
          </form>
          <small className="chat-limite">{texto.length}/300 · caduca en 7 días</small>
        </section>
      </div>}
    </div>
  )
}

export default function ModulosExtras({ seccion, acuario, session, onMensaje, onHistorialCambiado }) {
  if (!acuario) return null

  if (seccion === 'habitantes') return <Habitantes acuario={acuario} onMensaje={onMensaje} />
  if (seccion === 'plantas') return <Plantas acuario={acuario} onMensaje={onMensaje} />
  if (seccion === 'alimentacion') return <Alimentacion acuario={acuario} onMensaje={onMensaje} onHistorialCambiado={onHistorialCambiado} />
  if (seccion === 'equipos') return <Equipos acuario={acuario} onMensaje={onMensaje} />
  if (seccion === 'iluminacion') return <Iluminacion acuario={acuario} onMensaje={onMensaje} />
  if (seccion === 'notas') return <Notas acuario={acuario} onMensaje={onMensaje} onHistorialCambiado={onHistorialCambiado} />
  if (seccion === 'fotos') return <Fotos acuario={acuario} session={session} onMensaje={onMensaje} />
  if (seccion === 'colaboracion') return <Colaboracion acuario={acuario} session={session} onMensaje={onMensaje} />
  if (seccion === 'ajustes') return <GestionDatos acuario={acuario} session={session} onMensaje={onMensaje} />

  return null
}
