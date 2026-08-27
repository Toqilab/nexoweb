import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase.js'
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
      <button className="boton-principal" onClick={onBoton}>{boton}</button>
    </div>
  )
}

function Habitantes({ acuario, onMensaje }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    nombre_comun: '',
    nombre_cientifico: '',
    tipo: 'Pez',
    cantidad: '1',
    sexo: '',
    fecha_ingreso: hoy(),
    estado: 'activo',
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

  const abrir = () => {
    setForm({
      nombre_comun: '', nombre_cientifico: '', tipo: 'Pez',
      cantidad: '1', sexo: '', fecha_ingreso: hoy(),
      estado: 'activo', observaciones: '',
    })
    setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!form.nombre_comun.trim()) return
    setGuardando(true)
    const { error } = await supabase.from('habitantes').insert([{
      acuario_id: acuario.id,
      nombre_comun: form.nombre_comun.trim(),
      nombre_cientifico: form.nombre_cientifico.trim() || null,
      tipo: form.tipo || null,
      cantidad: Number(form.cantidad) || 1,
      sexo: form.sexo || null,
      fecha_ingreso: form.fecha_ingreso || null,
      estado: form.estado,
      observaciones: form.observaciones.trim() || null,
    }])
    if (error) onMensaje(`Error: ${error.message}`)
    else {
      setModal(false)
      await cargar()
      onMensaje('✅ Habitante registrado.')
    }
    setGuardando(false)
  }

  const eliminar = async (item) => {
    if (!window.confirm(`¿Eliminar ${item.nombre_comun}?`)) return
    const { error } = await supabase.from('habitantes').delete().eq('id', item.id)
    if (error) onMensaje(`Error: ${error.message}`)
    else cargar()
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
              <div className="entidad-icono">🐟</div>
              <div className="entidad-titulo">
                <h3>{item.nombre_comun}</h3>
                <p>{item.nombre_cientifico || item.tipo || 'Habitante'}</p>
              </div>
              <span className={`estado-entidad ${item.estado === 'activo' ? 'activo' : ''}`}>{item.estado}</span>
            </div>
            <div className="entidad-datos">
              <div><span>Cantidad</span><strong>{item.cantidad ?? 1}</strong></div>
              <div><span>Ingreso</span><strong>{fechaBonita(item.fecha_ingreso)}</strong></div>
            </div>
            {item.observaciones && <p className="entidad-nota">{item.observaciones}</p>}
            <button className="boton-eliminar-entidad" onClick={() => eliminar(item)}>Eliminar</button>
          </article>
        ))}
      </div>}

      {modal && (
        <Modal titulo="Agregar habitante" subtitulo="Registra una especie o grupo." onCerrar={() => setModal(false)}>
          <form onSubmit={guardar}>
            <div className="campo-formulario"><label>Nombre común *</label><input value={form.nombre_comun} onChange={(e) => setForm({ ...form, nombre_comun: e.target.value })} required /></div>
            <div className="campo-formulario"><label>Nombre científico</label><input value={form.nombre_cientifico} onChange={(e) => setForm({ ...form, nombre_cientifico: e.target.value })} /></div>
            <div className="fila-formulario">
              <div className="campo-formulario"><label>Tipo</label><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option>Pez</option><option>Camarón</option><option>Caracol</option><option>Otro</option></select></div>
              <div className="campo-formulario"><label>Cantidad</label><input type="number" min="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} /></div>
            </div>
            <div className="fila-formulario">
              <div className="campo-formulario"><label>Sexo</label><select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })}><option value="">Sin especificar</option><option>Macho</option><option>Hembra</option><option>Mixto</option></select></div>
              <div className="campo-formulario"><label>Fecha ingreso</label><input type="date" value={form.fecha_ingreso} onChange={(e) => setForm({ ...form, fecha_ingreso: e.target.value })} /></div>
            </div>
            <div className="campo-formulario"><label>Observaciones</label><textarea rows="3" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
            <div className="acciones-modal"><button type="button" className="boton-cancelar" onClick={() => setModal(false)}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button></div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function Plantas({ acuario, onMensaje }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [form, setForm] = useState({
    nombre_comun: '', nombre_cientifico: '', cantidad: '1',
    ubicacion: '', requerimiento_luz: '', requerimiento_co2: '',
    fecha_plantado: hoy(), estado: 'activa', observaciones: '',
  })

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase.from('plantas').select('*').eq('acuario_id', acuario.id).order('created_at', { ascending: false })
    if (error) onMensaje(`Error: ${error.message}`)
    else setItems(data ?? [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [acuario.id])

  const abrir = () => {
    setForm({ nombre_comun: '', nombre_cientifico: '', cantidad: '1', ubicacion: '', requerimiento_luz: '', requerimiento_co2: '', fecha_plantado: hoy(), estado: 'activa', observaciones: '' })
    setModal(true)
  }

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    const { error } = await supabase.from('plantas').insert([{
      acuario_id: acuario.id,
      nombre_comun: form.nombre_comun.trim(),
      nombre_cientifico: form.nombre_cientifico.trim() || null,
      cantidad: Number(form.cantidad) || 1,
      ubicacion: form.ubicacion.trim() || null,
      requerimiento_luz: form.requerimiento_luz || null,
      requerimiento_co2: form.requerimiento_co2 || null,
      fecha_plantado: form.fecha_plantado || null,
      estado: form.estado,
      observaciones: form.observaciones.trim() || null,
    }])
    if (error) onMensaje(`Error: ${error.message}`)
    else { setModal(false); await cargar(); onMensaje('✅ Planta registrada.') }
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
            </div>
            {item.observaciones && <p className="entidad-nota">{item.observaciones}</p>}
            <button className="boton-eliminar-entidad" onClick={() => eliminar(item)}>Eliminar</button>
          </article>
        ))}
      </div>}

      {modal && <Modal titulo="Agregar planta" subtitulo="Registra una planta del acuario." onCerrar={() => setModal(false)}>
        <form onSubmit={guardar}>
          <div className="campo-formulario"><label>Nombre común *</label><input value={form.nombre_comun} onChange={(e) => setForm({ ...form, nombre_comun: e.target.value })} required /></div>
          <div className="campo-formulario"><label>Nombre científico</label><input value={form.nombre_cientifico} onChange={(e) => setForm({ ...form, nombre_cientifico: e.target.value })} /></div>
          <div className="fila-formulario">
            <div className="campo-formulario"><label>Cantidad</label><input type="number" min="1" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} /></div>
            <div className="campo-formulario"><label>Ubicación</label><input placeholder="Frontal, medio, fondo..." value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} /></div>
          </div>
          <div className="fila-formulario">
            <div className="campo-formulario"><label>Luz</label><select value={form.requerimiento_luz} onChange={(e) => setForm({ ...form, requerimiento_luz: e.target.value })}><option value="">Sin definir</option><option>Baja</option><option>Media</option><option>Alta</option></select></div>
            <div className="campo-formulario"><label>CO₂</label><select value={form.requerimiento_co2} onChange={(e) => setForm({ ...form, requerimiento_co2: e.target.value })}><option value="">Sin definir</option><option>No requiere</option><option>Opcional</option><option>Recomendado</option><option>Requiere</option></select></div>
          </div>
          <div className="campo-formulario"><label>Fecha de plantado</label><input type="date" value={form.fecha_plantado} onChange={(e) => setForm({ ...form, fecha_plantado: e.target.value })} /></div>
          <div className="campo-formulario"><label>Observaciones</label><textarea rows="3" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
          <div className="acciones-modal"><button type="button" className="boton-cancelar" onClick={() => setModal(false)}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button></div>
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
  const [form, setForm] = useState({ nombre: '', tipo: '', marca: '', modelo: '', potencia_w: '', fecha_instalacion: hoy(), observaciones: '' })

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase.from('equipos').select('*').eq('acuario_id', acuario.id).order('created_at', { ascending: false })
    if (error) onMensaje(`Error: ${error.message}`)
    else setItems(data ?? [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [acuario.id])

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    const { error } = await supabase.from('equipos').insert([{
      acuario_id: acuario.id,
      nombre: form.nombre.trim(),
      tipo: form.tipo || null,
      marca: form.marca.trim() || null,
      modelo: form.modelo.trim() || null,
      potencia_w: numeroONull(form.potencia_w),
      fecha_instalacion: form.fecha_instalacion || null,
      estado: 'activo',
      observaciones: form.observaciones.trim() || null,
    }])
    if (error) onMensaje(`Error: ${error.message}`)
    else { setModal(false); await cargar(); onMensaje('✅ Equipo registrado.') }
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
      <Encabezado titulo="Equipos" descripcion="Filtro, bomba, calentador, aireador, CO₂ y otros." boton="+ Equipo" onBoton={() => setModal(true)} />
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
            <div className="acciones-entidad"><button className="boton-claro" onClick={() => estado(item)}>{item.estado === 'activo' ? 'Desactivar' : 'Activar'}</button><button className="boton-eliminar-entidad" onClick={() => eliminar(item)}>Eliminar</button></div>
          </article>
        ))}
      </div>}

      {modal && <Modal titulo="Agregar equipo" subtitulo="Registra el equipamiento del acuario." onCerrar={() => setModal(false)}>
        <form onSubmit={guardar}>
          <div className="campo-formulario"><label>Nombre *</label><input placeholder="Filtro principal" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required /></div>
          <div className="fila-formulario"><div className="campo-formulario"><label>Tipo</label><select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}><option value="">Seleccionar</option><option>Filtro</option><option>Bomba</option><option>Calentador</option><option>Aireador</option><option>CO2</option><option>Otro</option></select></div><div className="campo-formulario"><label>Potencia W</label><input type="number" step="0.1" value={form.potencia_w} onChange={(e) => setForm({ ...form, potencia_w: e.target.value })} /></div></div>
          <div className="fila-formulario"><div className="campo-formulario"><label>Marca</label><input value={form.marca} onChange={(e) => setForm({ ...form, marca: e.target.value })} /></div><div className="campo-formulario"><label>Modelo</label><input value={form.modelo} onChange={(e) => setForm({ ...form, modelo: e.target.value })} /></div></div>
          <div className="campo-formulario"><label>Fecha instalación</label><input type="date" value={form.fecha_instalacion} onChange={(e) => setForm({ ...form, fecha_instalacion: e.target.value })} /></div>
          <div className="campo-formulario"><label>Observaciones</label><textarea rows="3" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
          <div className="acciones-modal"><button type="button" className="boton-cancelar" onClick={() => setModal(false)}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button></div>
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
  const [form, setForm] = useState({ nombre: 'Luz principal', hora_encendido: '', hora_apagado: '', intensidad_porcentaje: '', color_luz: '', activa: true, observaciones: '' })

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase.from('iluminacion').select('*').eq('acuario_id', acuario.id).order('created_at', { ascending: false })
    if (error) onMensaje(`Error: ${error.message}`)
    else setItems(data ?? [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [acuario.id])

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    const { error } = await supabase.from('iluminacion').insert([{
      acuario_id: acuario.id,
      nombre: form.nombre.trim() || 'Luz principal',
      hora_encendido: form.hora_encendido || null,
      hora_apagado: form.hora_apagado || null,
      intensidad_porcentaje: numeroONull(form.intensidad_porcentaje),
      color_luz: form.color_luz.trim() || null,
      activa: form.activa,
      observaciones: form.observaciones.trim() || null,
    }])
    if (error) onMensaje(`Error: ${error.message}`)
    else { setModal(false); await cargar(); onMensaje('✅ Iluminación registrada.') }
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
      <Encabezado titulo="Iluminación" descripcion="Horarios, intensidad y modo de luz." boton="+ Horario" onBoton={() => setModal(true)} />
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
            <div className="acciones-entidad"><button className="boton-claro" onClick={() => alternar(item)}>{item.activa ? 'Desactivar' : 'Activar'}</button><button className="boton-eliminar-entidad" onClick={() => eliminar(item)}>Eliminar</button></div>
          </article>
        ))}
      </div>}

      {modal && <Modal titulo="Agregar iluminación" subtitulo="Configura un horario de luz." onCerrar={() => setModal(false)}>
        <form onSubmit={guardar}>
          <div className="campo-formulario"><label>Nombre</label><input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
          <div className="fila-formulario"><div className="campo-formulario"><label>Encendido</label><input type="time" value={form.hora_encendido} onChange={(e) => setForm({ ...form, hora_encendido: e.target.value })} /></div><div className="campo-formulario"><label>Apagado</label><input type="time" value={form.hora_apagado} onChange={(e) => setForm({ ...form, hora_apagado: e.target.value })} /></div></div>
          <div className="fila-formulario"><div className="campo-formulario"><label>Intensidad %</label><input type="number" min="0" max="100" value={form.intensidad_porcentaje} onChange={(e) => setForm({ ...form, intensidad_porcentaje: e.target.value })} /></div><div className="campo-formulario"><label>Color / modo</label><input value={form.color_luz} onChange={(e) => setForm({ ...form, color_luz: e.target.value })} /></div></div>
          <label className="check-simple"><input type="checkbox" checked={form.activa} onChange={(e) => setForm({ ...form, activa: e.target.checked })} /> Horario activo</label>
          <div className="campo-formulario"><label>Observaciones</label><textarea rows="3" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} /></div>
          <div className="acciones-modal"><button type="button" className="boton-cancelar" onClick={() => setModal(false)}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button></div>
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
  const [form, setForm] = useState({ titulo: '', contenido: '', importante: false })

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase.from('notas_acuario').select('*').eq('acuario_id', acuario.id).order('importante', { ascending: false }).order('created_at', { ascending: false })
    if (error) onMensaje(`Error: ${error.message}`)
    else setItems(data ?? [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [acuario.id])

  const guardar = async (e) => {
    e.preventDefault()
    setGuardando(true)
    const { error } = await supabase.from('notas_acuario').insert([{
      acuario_id: acuario.id,
      titulo: form.titulo.trim() || null,
      contenido: form.contenido.trim(),
      importante: form.importante,
    }])
    if (error) onMensaje(`Error: ${error.message}`)
    else {
      setModal(false)
      setForm({ titulo: '', contenido: '', importante: false })
      await cargar()
      onHistorialCambiado?.()
      onMensaje('✅ Nota guardada.')
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
      <Encabezado titulo="Notas" descripcion="Observaciones rápidas e información importante." boton="+ Nota" onBoton={() => setModal(true)} />
      {cargando ? <div className="sin-datos-panel">Cargando...</div> :
       items.length === 0 ? <div className="panel-vacio"><div className="icono-vacio">📝</div><h3>No hay notas</h3></div> :
       <div className="grid-notas">
        {items.map((item) => (
          <article className={`tarjeta-nota ${item.importante ? 'importante' : ''}`} key={item.id}>
            <div className="nota-cabecera"><span>{item.importante ? '⭐ IMPORTANTE' : fechaBonita(item.created_at)}</span><button onClick={() => importante(item)}>{item.importante ? '★' : '☆'}</button></div>
            {item.titulo && <h3>{item.titulo}</h3>}
            <p>{item.contenido}</p>
            <button className="boton-eliminar-entidad" onClick={() => eliminar(item)}>Eliminar</button>
          </article>
        ))}
      </div>}

      {modal && <Modal titulo="Nueva nota" subtitulo="Guarda una observación del acuario." onCerrar={() => setModal(false)}>
        <form onSubmit={guardar}>
          <div className="campo-formulario"><label>Título</label><input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></div>
          <div className="campo-formulario"><label>Contenido *</label><textarea rows="5" value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })} required /></div>
          <label className="check-simple"><input type="checkbox" checked={form.importante} onChange={(e) => setForm({ ...form, importante: e.target.checked })} /> Marcar como importante</label>
          <div className="acciones-modal"><button type="button" className="boton-cancelar" onClick={() => setModal(false)}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar nota'}</button></div>
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
  const [descripcion, setDescripcion] = useState('')
  const [modoCalidad, setModoCalidad] = useState('miniatura')

  const cargar = async () => {
    setCargando(true)
    const { data, error } = await supabase.from('fotos_acuario').select('*').eq('acuario_id', acuario.id).order('fecha', { ascending: false })
    if (error) onMensaje(`Error: ${error.message}`)
    else setItems(data ?? [])
    setCargando(false)
  }

  useEffect(() => { cargar() }, [acuario.id])

  const formatoBytes = (bytes) => {
    if (!bytes) return '0 KB'
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const comprimirImagen = async (file, modo) => {
    if (modo === 'original') return file

    const configuracion = modo === 'media'
      ? { maximo: 1920, calidad: 0.78 }
      : { maximo: 1280, calidad: 0.68 }

    const bitmap = await createImageBitmap(file)
    const escala = Math.min(1, configuracion.maximo / Math.max(bitmap.width, bitmap.height))
    const ancho = Math.max(1, Math.round(bitmap.width * escala))
    const alto = Math.max(1, Math.round(bitmap.height * escala))

    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto

    const contexto = canvas.getContext('2d')
    contexto.drawImage(bitmap, 0, 0, ancho, alto)
    bitmap.close?.()

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (resultado) => resultado ? resolve(resultado) : reject(new Error('No se pudo comprimir la imagen.')),
        'image/webp',
        configuracion.calidad
      )
    })

    const nombreBase = file.name.replace(/\.[^.]+$/, '') || 'foto'
    return new File([blob], `${nombreBase}.webp`, { type: 'image/webp' })
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!archivo) return onMensaje('Selecciona una imagen.')
    if (!archivo.type?.startsWith('image/')) return onMensaje('El archivo debe ser una imagen.')

    setGuardando(true)
    try {
      const archivoSubida = await comprimirImagen(archivo, modoCalidad)
      const extension = archivoSubida.name.split('.').pop()?.toLowerCase() || 'webp'
      const nombre = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`
      const ruta = `${session.user.id}/${acuario.id}/${nombre}`

      const { error: errorUpload } = await supabase.storage.from('fotos-acuario').upload(ruta, archivoSubida, {
        cacheControl: '3600',
        upsert: false,
        contentType: archivoSubida.type || undefined,
      })
      if (errorUpload) throw errorUpload

      const { data: pub } = supabase.storage.from('fotos-acuario').getPublicUrl(ruta)

      const detalleTamano = modoCalidad === 'original'
        ? `Original · ${formatoBytes(archivoSubida.size)}`
        : `${modoCalidad === 'media' ? 'Calidad media' : 'Miniatura'} · ${formatoBytes(archivoSubida.size)}`

      const descripcionFinal = [descripcion.trim(), detalleTamano].filter(Boolean).join(' · ')

      const { error: errorDb } = await supabase.from('fotos_acuario').insert([{
        acuario_id: acuario.id,
        url: pub.publicUrl,
        descripcion: descripcionFinal || null,
      }])
      if (errorDb) {
        await supabase.storage.from('fotos-acuario').remove([ruta])
        throw errorDb
      }

      setModal(false)
      setArchivo(null)
      setDescripcion('')
      setModoCalidad('miniatura')
      await cargar()
      onMensaje(`✅ Foto guardada. Se subió ${formatoBytes(archivoSubida.size)}; la original permanece en tu teléfono.`)
    } catch (error) {
      onMensaje(`Error: ${error.message}`)
    }
    setGuardando(false)
  }

  const eliminar = async (item) => {
    if (!window.confirm('¿Eliminar esta foto de NexoWeb? La foto original de tu teléfono no se borra.')) return
    try {
      const marcador = '/storage/v1/object/public/fotos-acuario/'
      if (item.url?.includes(marcador)) {
        const ruta = decodeURIComponent(item.url.split(marcador)[1])
        await supabase.storage.from('fotos-acuario').remove([ruta])
      }
      const { error } = await supabase.from('fotos_acuario').delete().eq('id', item.id)
      if (error) throw error
      cargar()
    } catch (error) {
      onMensaje(`Error: ${error.message}`)
    }
  }

  return (
    <div>
      <Encabezado titulo="Fotos" descripcion="La original queda en tu teléfono; NexoWeb guarda una copia ligera." boton="+ Foto" onBoton={() => setModal(true)} />
      <div className="aviso-fotos-locales">
        <strong>📱 Original en tu teléfono</strong>
        <span>Por defecto NexoWeb convierte la foto a WebP y sube una miniatura ligera para ahorrar espacio.</span>
      </div>

      {cargando ? <div className="sin-datos-panel">Cargando...</div> :
       items.length === 0 ? <div className="panel-vacio"><div className="icono-vacio">📷</div><h3>No hay fotos</h3><p>Sube la primera foto de este acuario.</p></div> :
       <div className="galeria-fotos">
        {items.map((item) => (
          <article className="foto-card" key={item.id}>
            <img src={item.url} alt={item.descripcion || 'Foto del acuario'} loading="lazy" />
            <div className="foto-info"><span>{fechaBonita(item.fecha)}</span>{item.descripcion && <p>{item.descripcion}</p>}<button className="boton-eliminar-entidad" onClick={() => eliminar(item)}>Eliminar de NexoWeb</button></div>
          </article>
        ))}
      </div>}

      {modal && <Modal titulo="Agregar foto" subtitulo="La foto original no se modifica ni se borra de tu teléfono." onCerrar={() => setModal(false)}>
        <form onSubmit={guardar}>
          <div className="campo-formulario"><label>Imagen *</label><input type="file" accept="image/*" onChange={(e) => setArchivo(e.target.files?.[0] || null)} required /></div>
          {archivo && <div className="archivo-seleccionado">📷 {archivo.name} · {formatoBytes(archivo.size)}</div>}
          <div className="campo-formulario">
            <label>Calidad que se guardará en NexoWeb</label>
            <select value={modoCalidad} onChange={(e) => setModoCalidad(e.target.value)}>
              <option value="miniatura">Solo miniatura — recomendado</option>
              <option value="media">Calidad media</option>
              <option value="original">Original — ocupa mucho más espacio</option>
            </select>
            <small className="ayuda-campo">La opción recomendada reduce la imagen antes de subirla. El original permanece en la galería del teléfono.</small>
          </div>
          <div className="campo-formulario"><label>Descripción</label><textarea rows="3" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Ej. Día 10 de ciclado..." /></div>
          <div className="acciones-modal"><button type="button" className="boton-cancelar" onClick={() => setModal(false)}>Cancelar</button><button className="boton-principal" disabled={guardando}>{guardando ? 'Procesando...' : 'Guardar foto'}</button></div>
        </form>
      </Modal>}
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
  if (seccion === 'ajustes') return <GestionDatos acuario={acuario} session={session} onMensaje={onMensaje} />

  return null
}
