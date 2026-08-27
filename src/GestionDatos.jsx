import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabase.js'

const MB = 1024 * 1024

const fechaArchivo = () => {
  const f = new Date()
  const y = f.getFullYear()
  const m = String(f.getMonth() + 1).padStart(2, '0')
  const d = String(f.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatoBytes = (bytes) => {
  if (!bytes) return '0 KB'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < MB) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / MB).toFixed(2)} MB`
}

const descargarBlob = (blob, nombre) => {
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombre
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1500)
}

const escaparCsv = (valor) => {
  if (valor === null || valor === undefined) return ''
  const texto = typeof valor === 'object' ? JSON.stringify(valor) : String(valor)
  return `"${texto.replaceAll('"', '""')}"`
}

const convertirCsv = (filas) => {
  if (!filas?.length) return ''
  const columnas = Array.from(new Set(filas.flatMap((fila) => Object.keys(fila))))
  const cabecera = columnas.map(escaparCsv).join(',')
  const cuerpo = filas.map((fila) => columnas.map((columna) => escaparCsv(fila[columna])).join(',')).join('\n')
  return `${cabecera}\n${cuerpo}`
}

export default function GestionDatos({ session, acuario, onMensaje }) {
  const [cargando, setCargando] = useState(false)
  const [resumen, setResumen] = useState({
    bytesDatos: 0,
    bytesFotos: 0,
    registros: 0,
    fotos: 0,
    ultimaRevision: null,
  })
  const [diasArchivado, setDiasArchivado] = useState('180')
  const [tareasArchivables, setTareasArchivables] = useState([])
  const [archivoPreparado, setArchivoPreparado] = useState(false)
  const [ultimoBackup, setUltimoBackup] = useState(null)

  const cargarTablas = async () => {
    if (!session?.user?.id) throw new Error('No hay sesión activa.')

    const { data: acuarios, error: errorAcuarios } = await supabase
      .from('acuarios')
      .select('*')
      .eq('usuario_id', session.user.id)
      .order('created_at', { ascending: true })

    if (errorAcuarios) throw errorAcuarios

    const idsAcuarios = (acuarios ?? []).map((item) => item.id)

    const consultaPorAcuarios = async (tabla, orden = null) => {
      if (idsAcuarios.length === 0) return []
      let consulta = supabase.from(tabla).select('*').in('acuario_id', idsAcuarios)
      if (orden) consulta = consulta.order(orden, { ascending: true })
      const { data, error } = await consulta
      if (error) throw error
      return data ?? []
    }

    const { data: productos, error: errorProductos } = await supabase
      .from('productos')
      .select('*, reglas_dosificacion(*)')
      .eq('usuario_id', session.user.id)
      .order('created_at', { ascending: true })
    if (errorProductos) throw errorProductos

    const [
      parametros_agua,
      habitantes,
      plantas,
      mantenimientos,
      alimentaciones,
      equipos,
      iluminacion,
      notas_acuario,
      fotos_acuario,
      productos_acuario,
      dosis_aplicadas,
      ciclos_acuario,
      tareas_acuario,
      plan_ciclado_actividades,
    ] = await Promise.all([
      consultaPorAcuarios('parametros_agua', 'fecha_medicion'),
      consultaPorAcuarios('habitantes', 'created_at'),
      consultaPorAcuarios('plantas', 'created_at'),
      consultaPorAcuarios('mantenimientos', 'fecha'),
      consultaPorAcuarios('alimentaciones', 'fecha'),
      consultaPorAcuarios('equipos', 'created_at'),
      consultaPorAcuarios('iluminacion', 'created_at'),
      consultaPorAcuarios('notas_acuario', 'created_at'),
      consultaPorAcuarios('fotos_acuario', 'fecha'),
      consultaPorAcuarios('productos_acuario', 'created_at'),
      consultaPorAcuarios('dosis_aplicadas', 'fecha_aplicacion'),
      consultaPorAcuarios('ciclos_acuario', 'created_at'),
      consultaPorAcuarios('tareas_acuario', 'created_at'),
      consultaPorAcuarios('plan_ciclado_actividades', 'created_at'),
    ])

    return {
      metadata: {
        aplicacion: 'NexoWeb',
        usuario_id: session.user.id,
        exportado_en: new Date().toISOString(),
        version_respaldo: 1,
        nota_fotos: 'El respaldo contiene metadatos y URLs de las copias ligeras. Las fotos originales permanecen en el teléfono.',
      },
      acuarios: acuarios ?? [],
      productos: productos ?? [],
      parametros_agua,
      habitantes,
      plantas,
      mantenimientos,
      alimentaciones,
      equipos,
      iluminacion,
      notas_acuario,
      fotos_acuario,
      productos_acuario,
      dosis_aplicadas,
      ciclos_acuario,
      tareas_acuario,
      plan_ciclado_actividades,
    }
  }

  const contarRegistros = (backup) => Object.entries(backup)
    .filter(([clave, valor]) => clave !== 'metadata' && Array.isArray(valor))
    .reduce((total, [, valor]) => total + valor.length, 0)

  const calcularFotosStorage = async (acuarios) => {
    if (!session?.user?.id) return { bytes: 0, cantidad: 0 }

    let bytes = 0
    let cantidad = 0

    for (const item of acuarios ?? []) {
      const { data, error } = await supabase.storage
        .from('fotos-acuario')
        .list(`${session.user.id}/${item.id}`, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' },
        })

      if (error) continue

      for (const archivo of data ?? []) {
        const tamano = Number(archivo?.metadata?.size ?? 0)
        bytes += Number.isFinite(tamano) ? tamano : 0
        cantidad += 1
      }
    }

    return { bytes, cantidad }
  }

  const revisarUso = async () => {
    setCargando(true)
    try {
      const backup = await cargarTablas()
      const json = JSON.stringify(backup)
      const bytesDatos = new Blob([json]).size
      const fotos = await calcularFotosStorage(backup.acuarios)

      setResumen({
        bytesDatos,
        bytesFotos: fotos.bytes,
        registros: contarRegistros(backup),
        fotos: fotos.cantidad,
        ultimaRevision: new Date(),
      })
    } catch (error) {
      onMensaje(`Error: ${error.message}`)
    }
    setCargando(false)
  }

  useEffect(() => {
    revisarUso()
  }, [session?.user?.id])

  const porcentajeReferencia = useMemo(() => {
    return Math.min(100, (resumen.bytesDatos / (500 * MB)) * 100)
  }, [resumen.bytesDatos])

  const estadoEspacio = useMemo(() => {
    if (porcentajeReferencia >= 85) return { texto: 'Crítico', clase: 'critico', icono: '🔴' }
    if (porcentajeReferencia >= 70) return { texto: 'Revisar', clase: 'advertencia', icono: '🟡' }
    return { texto: 'Normal', clase: 'normal', icono: '🟢' }
  }, [porcentajeReferencia])

  const exportarRespaldoCompleto = async () => {
    setCargando(true)
    try {
      const backup = await cargarTablas()
      const contenido = JSON.stringify(backup, null, 2)
      descargarBlob(new Blob([contenido], { type: 'application/json;charset=utf-8' }), `NexoWeb_respaldo_${fechaArchivo()}.json`)
      const ahora = new Date()
      setUltimoBackup(ahora)
      localStorage.setItem('nexoweb_ultimo_backup', ahora.toISOString())
      onMensaje('✅ Respaldo completo generado. Guárdalo en OneDrive o en tu PC.')
    } catch (error) {
      onMensaje(`Error: ${error.message}`)
    }
    setCargando(false)
  }

  useEffect(() => {
    const valor = localStorage.getItem('nexoweb_ultimo_backup')
    if (valor) setUltimoBackup(new Date(valor))
  }, [])

  const exportarCsv = async (tipo) => {
    setCargando(true)
    try {
      const backup = await cargarTablas()
      const mapas = {
        parametros: { filas: backup.parametros_agua, nombre: 'mediciones_agua' },
        mantenimientos: { filas: backup.mantenimientos, nombre: 'mantenimientos' },
        dosis: { filas: backup.dosis_aplicadas, nombre: 'dosis_aplicadas' },
      }
      const seleccionado = mapas[tipo]
      const csv = convertirCsv(seleccionado.filas)
      if (!csv) {
        onMensaje('No existen registros para exportar.')
      } else {
        descargarBlob(new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' }), `NexoWeb_${seleccionado.nombre}_${fechaArchivo()}.csv`)
        onMensaje('✅ Archivo CSV generado.')
      }
    } catch (error) {
      onMensaje(`Error: ${error.message}`)
    }
    setCargando(false)
  }

  const prepararArchivado = async () => {
    setCargando(true)
    setArchivoPreparado(false)
    setTareasArchivables([])

    try {
      const { data: acuariosUsuario, error: errorAcuarios } = await supabase
        .from('acuarios')
        .select('id,nombre')
        .eq('usuario_id', session.user.id)
      if (errorAcuarios) throw errorAcuarios

      const ids = (acuariosUsuario ?? []).map((item) => item.id)
      if (!ids.length) {
        onMensaje('No hay acuarios para revisar.')
        setCargando(false)
        return
      }

      const limite = new Date()
      limite.setDate(limite.getDate() - Number(diasArchivado || 180))

      const { data, error } = await supabase
        .from('tareas_acuario')
        .select('*')
        .in('acuario_id', ids)
        .eq('estado', 'completada')
        .lt('completada_en', limite.toISOString())
        .order('completada_en', { ascending: true })

      if (error) throw error
      const tareas = data ?? []

      if (!tareas.length) {
        onMensaje('✅ No hay tareas completadas antiguas que necesiten archivarse.')
        setCargando(false)
        return
      }

      const archivo = {
        metadata: {
          aplicacion: 'NexoWeb',
          tipo: 'archivo_tareas_completadas',
          exportado_en: new Date().toISOString(),
          antiguedad_dias: Number(diasArchivado),
          cantidad: tareas.length,
        },
        tareas,
      }

      descargarBlob(
        new Blob([JSON.stringify(archivo, null, 2)], { type: 'application/json;charset=utf-8' }),
        `NexoWeb_tareas_archivadas_${fechaArchivo()}.json`
      )

      setTareasArchivables(tareas)
      setArchivoPreparado(true)
      onMensaje(`✅ Se descargó un archivo con ${tareas.length} tareas. Verifica que esté guardado antes de liberar espacio.`)
    } catch (error) {
      onMensaje(`Error: ${error.message}`)
    }

    setCargando(false)
  }

  const confirmarLiberacion = async () => {
    if (!archivoPreparado || tareasArchivables.length === 0) return

    const confirmar = window.confirm(
      `Se eliminarán ${tareasArchivables.length} tareas COMPLETADAS antiguas de Supabase.\n\n` +
      'Hazlo únicamente si comprobaste que el archivo de respaldo se descargó correctamente.\n\n' +
      'No se eliminarán mediciones, dosis, mantenimientos, habitantes, plantas, notas ni tareas pendientes.'
    )
    if (!confirmar) return

    setCargando(true)
    try {
      const ids = tareasArchivables.map((item) => item.id)
      const tamanoLote = 100

      for (let i = 0; i < ids.length; i += tamanoLote) {
        const lote = ids.slice(i, i + tamanoLote)
        const { error } = await supabase.from('tareas_acuario').delete().in('id', lote)
        if (error) throw error
      }

      onMensaje(`✅ Se liberó espacio eliminando ${ids.length} tareas completadas ya respaldadas.`)
      setTareasArchivables([])
      setArchivoPreparado(false)
      await revisarUso()
    } catch (error) {
      onMensaje(`Error: ${error.message}`)
    }
    setCargando(false)
  }

  return (
    <div>
      <div className="cabecera-modulo">
        <div>
          <h2>Ajustes y almacenamiento</h2>
          <p>Respaldo, exportación y liberación segura de espacio.</p>
        </div>
        <button className="boton-principal" onClick={revisarUso} disabled={cargando}>
          {cargando ? 'Revisando...' : '↻ Revisar uso'}
        </button>
      </div>

      <div className="storage-grid">
        <article className="storage-card storage-principal">
          <div className="storage-card-top">
            <div>
              <span>Datos de NexoWeb</span>
              <strong>{formatoBytes(resumen.bytesDatos)}</strong>
            </div>
            <span className={`storage-estado ${estadoEspacio.clase}`}>{estadoEspacio.icono} {estadoEspacio.texto}</span>
          </div>
          <div className="storage-barra"><div style={{ width: `${Math.max(1, porcentajeReferencia)}%` }} /></div>
          <small>Estimación del tamaño lógico exportable. La referencia de 500 MB no es una medición exacta del tamaño físico de PostgreSQL.</small>
        </article>

        <article className="storage-card">
          <span>Registros</span>
          <strong>{resumen.registros.toLocaleString()}</strong>
          <small>Todos los registros incluidos en un respaldo.</small>
        </article>

        <article className="storage-card">
          <span>Fotos ligeras</span>
          <strong>{formatoBytes(resumen.bytesFotos)}</strong>
          <small>{resumen.fotos} archivos en Supabase Storage.</small>
        </article>
      </div>

      <section className="ajustes-seccion">
        <div className="ajustes-titulo">
          <div>
            <h3>💾 Respaldo completo</h3>
            <p>Descarga toda tu información antes de hacer limpieza o cambios importantes.</p>
          </div>
          <span>{ultimoBackup ? `Último: ${ultimoBackup.toLocaleString()}` : 'Sin respaldo registrado en este dispositivo'}</span>
        </div>

        <div className="acciones-ajustes">
          <button className="boton-principal" onClick={exportarRespaldoCompleto} disabled={cargando}>Descargar respaldo JSON</button>
          <button className="boton-claro" onClick={() => exportarCsv('parametros')} disabled={cargando}>Mediciones CSV</button>
          <button className="boton-claro" onClick={() => exportarCsv('mantenimientos')} disabled={cargando}>Mantenimientos CSV</button>
          <button className="boton-claro" onClick={() => exportarCsv('dosis')} disabled={cargando}>Dosis CSV</button>
        </div>

        <div className="aviso-respaldo">
          <strong>Recomendación</strong>
          <span>Guarda el archivo JSON en OneDrive y otra copia en tu PC. Este archivo no contiene las fotos originales del teléfono.</span>
        </div>
      </section>

      <section className="ajustes-seccion">
        <div className="ajustes-titulo">
          <div>
            <h3>🧹 Archivar tareas completadas</h3>
            <p>Es la limpieza más segura porque las aplicaciones reales de productos, mediciones y mantenimientos permanecen en sus tablas históricas.</p>
          </div>
        </div>

        <div className="archivado-controles">
          <div className="campo-formulario">
            <label>Archivar tareas completadas con más de</label>
            <select value={diasArchivado} onChange={(e) => { setDiasArchivado(e.target.value); setArchivoPreparado(false); setTareasArchivables([]) }}>
              <option value="90">90 días</option>
              <option value="180">180 días — recomendado</option>
              <option value="365">1 año</option>
              <option value="730">2 años</option>
            </select>
          </div>

          <button className="boton-claro" onClick={prepararArchivado} disabled={cargando}>1. Preparar y descargar archivo</button>
        </div>

        {archivoPreparado && tareasArchivables.length > 0 && (
          <div className="confirmacion-archivo">
            <div>
              <strong>✅ Respaldo preparado</strong>
              <span>{tareasArchivables.length} tareas completadas están listas para eliminarse.</span>
            </div>
            <button className="boton-liberar" onClick={confirmarLiberacion} disabled={cargando}>2. Confirmé el respaldo · Liberar espacio</button>
          </div>
        )}

        <div className="proteccion-datos">
          <strong>NexoWeb NO eliminará automáticamente:</strong>
          <span>💧 mediciones · 🧪 dosis · 🧽 mantenimientos · 🐟 habitantes · 🌿 plantas · 📝 notas · ⏳ tareas pendientes</span>
        </div>
      </section>

      <section className="ajustes-seccion">
        <h3>📷 Política de fotos</h3>
        <div className="politica-fotos">
          <div><strong>Teléfono</strong><span>Conserva la fotografía original.</span></div>
          <div><strong>NexoWeb</strong><span>Sube por defecto una copia WebP ligera.</span></div>
          <div><strong>Supabase</strong><span>Guarda la miniatura y los datos relacionados con el acuario.</span></div>
        </div>
      </section>

      <div className="nota-tecnica-almacenamiento">
        <strong>ℹ️ Importante</strong>
        <p>El valor mostrado para la base de datos es una estimación de tus datos exportables desde el navegador. No modifica ni elimina información por sí solo. La limpieza siempre requiere una descarga previa y tu confirmación.</p>
      </div>
    </div>
  )
}
