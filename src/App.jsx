import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './lib/supabase.js'
import './App.css'
import ModulosExtras from './ModulosExtras.jsx'
import GestionAvanzada, { ResumenInteligente } from './GestionAvanzada.jsx'
import { subirImagenPublica, formatoBytes } from './utilsImagenes.js'

const NEXOWEB_VERSION = '1.2.0'

function App() {
  /* =========================================================
     SESIÓN
  ========================================================= */

  const [session, setSession] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [cargando, setCargando] = useState(true)
  const [iniciandoSesion, setIniciandoSesion] = useState(false)

  /* =========================================================
     ACUARIOS
  ========================================================= */

  const [acuarios, setAcuarios] = useState([])
  const [cargandoAcuarios, setCargandoAcuarios] = useState(false)

  const [acuarioSeleccionado, setAcuarioSeleccionado] = useState(null)
  const [seccionActiva, setSeccionActiva] = useState('resumen')
  const [menuMasAbierto, setMenuMasAbierto] = useState(false)
  const [mostrarMenuMasMovil, setMostrarMenuMasMovil] = useState(false)

  const [mostrarModalAcuario, setMostrarModalAcuario] = useState(false)
  const [guardandoAcuario, setGuardandoAcuario] = useState(false)
  const guardandoAcuarioRef = useRef(false)
  const [mensajeAcuario, setMensajeAcuario] = useState('')
  const [progresoCreacion, setProgresoCreacion] = useState('')
  const [menuTarjetaAcuario, setMenuTarjetaAcuario] = useState(null)
  const [eliminandoAcuarioId, setEliminandoAcuarioId] = useState(null)
  const [acuarioEliminarPendiente, setAcuarioEliminarPendiente] = useState(null)
  const [mostrarDetallesAcuario, setMostrarDetallesAcuario] = useState(false)
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null)
  const [appInstalada, setAppInstalada] = useState(
    window.matchMedia?.('(display-mode: standalone)')?.matches ||
    window.navigator.standalone === true
  )
  const [fotoPortadaArchivo, setFotoPortadaArchivo] = useState(null)
  const [fotoPortadaPreview, setFotoPortadaPreview] = useState('')
  const [modoOscuro, setModoOscuro] = useState(() => localStorage.getItem('nexoweb-tema') === 'oscuro')

  const [formAcuario, setFormAcuario] = useState({
    nombre: '',
    descripcion: '',
    volumen_litros: '',
    largo_cm: '',
    ancho_cm: '',
    alto_cm: '',
    tipo: '',
    subtipo: '',
    ubicacion: '',
    exposicion_solar: '',
    fecha_inicio: '',
    temperatura_objetivo: '',
    costo_inicial: '',
  })

  /* =========================================================
     CICLADO
  ========================================================= */

  const [cicloActual, setCicloActual] = useState(null)
  const [mostrarModalCiclado, setMostrarModalCiclado] = useState(false)
  const [guardandoCiclado, setGuardandoCiclado] = useState(false)

  const [formCiclado, setFormCiclado] = useState({
    tiene_ciclado: false,
    fecha_inicio: '',
    fecha_fin: '',
    descripcion: '',
  })

  /* =========================================================
     PLAN DE CICLADO
  ========================================================= */

  const [planCiclado, setPlanCiclado] = useState([])
  const [mostrarModalPlan, setMostrarModalPlan] = useState(false)
  const [mostrarModalActividad, setMostrarModalActividad] = useState(false)
  const [guardandoActividad, setGuardandoActividad] = useState(false)

  const [formActividad, setFormActividad] = useState({
    tipo: 'producto',
    titulo: '',
    producto_id: '',
    regla_dosificacion_id: '',
    dia_inicio: '1',
    tipo_repeticion: 'una_vez',
    intervalo_dias: '1',
    duracion_dias: '1',
    aplicar_sobre: 'volumen_total',
    litros_personalizados: '',
    hora_recordatorio: '09:00',
    descripcion: '',
  })

  /* =========================================================
     TAREAS
  ========================================================= */

  const [tareasHoy, setTareasHoy] = useState([])
  const [tareasVencidas, setTareasVencidas] = useState([])
  const [cargandoTareas, setCargandoTareas] = useState(false)

  /* =========================================================
     PRODUCTOS
  ========================================================= */

  const [productos, setProductos] = useState([])
  const [productosAcuario, setProductosAcuario] = useState([])
  const [cargandoProductos, setCargandoProductos] = useState(false)

  const [mostrarModalProducto, setMostrarModalProducto] = useState(false)
  const [guardandoProducto, setGuardandoProducto] = useState(false)

  const [formProducto, setFormProducto] = useState({
    nombre: '',
    marca: '',
    categoria: '',
    descripcion: '',
    unidad_dosis: 'ml',
    fecha_compra: '',
    fecha_apertura: '',
    fecha_vencimiento: '',
    regla_nombre: 'Dosis normal',
    dosis_cantidad: '',
    dosis_unidad: 'ml',
    volumen_referencia_litros: '',
    aplicar_sobre: 'volumen_total',
    instrucciones: '',
  })

  /* =========================================================
     DOSIFICACIÓN
  ========================================================= */

  const [mostrarCalculadora, setMostrarCalculadora] = useState(false)
  const [productoCalculo, setProductoCalculo] = useState(null)
  const [tareaEnAplicacion, setTareaEnAplicacion] = useState(null)
  const [guardandoDosis, setGuardandoDosis] = useState(false)

  const [formDosis, setFormDosis] = useState({
    tipo_volumen: 'volumen_total',
    litros: '',
    dosis_aplicada: '',
    motivo: 'Mantenimiento',
    observaciones: '',
  })


  /* =========================================================
     AGUA
  ========================================================= */

  const [medicionesAgua, setMedicionesAgua] = useState([])
  const [cargandoAgua, setCargandoAgua] = useState(false)
  const [mostrarModalAgua, setMostrarModalAgua] = useState(false)
  const [guardandoAgua, setGuardandoAgua] = useState(false)
  const [tareaAguaEnRegistro, setTareaAguaEnRegistro] = useState(null)

  const [formAgua, setFormAgua] = useState({
    temperatura_c: '',
    ph: '',
    amonio_nh3: '',
    nitrito_no2: '',
    nitrato_no3: '',
    gh: '',
    kh: '',
    tds: '',
    observaciones: '',
  })

  /* =========================================================
     MANTENIMIENTO
  ========================================================= */

  const [mantenimientos, setMantenimientos] = useState([])
  const [cargandoMantenimiento, setCargandoMantenimiento] = useState(false)
  const [mostrarModalMantenimiento, setMostrarModalMantenimiento] = useState(false)
  const [guardandoMantenimiento, setGuardandoMantenimiento] = useState(false)
  const [tareaMantenimientoEnRegistro, setTareaMantenimientoEnRegistro] = useState(null)

  const [formMantenimiento, setFormMantenimiento] = useState({
    tipo: 'Cambio de agua',
    porcentaje_cambio_agua: '',
    litros_cambiados: '',
    limpieza_filtro: false,
    limpieza_vidrios: false,
    sifonado: false,
    poda_plantas: false,
    observaciones: '',
  })

  /* =========================================================
     HISTORIAL GENERAL
  ========================================================= */

  const [historialGeneral, setHistorialGeneral] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  /* =========================================================
     REGISTRO RÁPIDO
  ========================================================= */

  const [mostrarRegistroRapido, setMostrarRegistroRapido] = useState(false)

  /* =========================================================
     INSTALACIÓN PWA
  ========================================================= */

  useEffect(() => {
    const capturarPrompt = (event) => {
      event.preventDefault()
      setDeferredInstallPrompt(event)
    }

    const instalada = () => {
      setDeferredInstallPrompt(null)
      setAppInstalada(true)
    }

    window.addEventListener('beforeinstallprompt', capturarPrompt)
    window.addEventListener('appinstalled', instalada)

    return () => {
      window.removeEventListener('beforeinstallprompt', capturarPrompt)
      window.removeEventListener('appinstalled', instalada)
    }
  }, [])

  const instalarNexoWeb = async () => {
    if (appInstalada) {
      setMensaje('✅ NexoWeb ya está instalada en este dispositivo.')
      return
    }

    if (!deferredInstallPrompt) {
      setMensaje(
        'ℹ️ En iPhone/iPad usa Compartir → Agregar a pantalla de inicio. ' +
        'En Android abre el menú del navegador y elige Instalar aplicación.'
      )
      return
    }

    try {
      await deferredInstallPrompt.prompt()
      const resultado = await deferredInstallPrompt.userChoice

      if (resultado.outcome === 'accepted') {
        setMensaje('✅ Instalación de NexoWeb iniciada.')
      }

      setDeferredInstallPrompt(null)
    } catch (error) {
      setMensaje(`❌ No se pudo iniciar la instalación: ${error.message}`)
    }
  }

  /* =========================================================
     APARIENCIA
  ========================================================= */

  useEffect(() => {
    document.documentElement.classList.toggle('nexoweb-oscuro', modoOscuro)
    localStorage.setItem('nexoweb-tema', modoOscuro ? 'oscuro' : 'claro')
  }, [modoOscuro])

  const cambiarModoOscuro = () => {
    setModoOscuro((actual) => !actual)
  }

  /* =========================================================
     SESIÓN
  ========================================================= */

  useEffect(() => {
    const cargarSesion = async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error(error)
        }

        setSession(data?.session ?? null)
      } catch (error) {
        console.error(error)
      } finally {
        setCargando(false)
      }
    }

    cargarSesion()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nuevaSesion) => {
      setSession(nuevaSesion)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (session?.user?.id) {
      cargarAcuarios()
      cargarProductos()
    } else {
      setAcuarios([])
      setProductos([])
      setAcuarioSeleccionado(null)
    }
  }, [session])

  useEffect(() => {
    if (acuarioSeleccionado?.id) {
      cargarDatosAcuario()
    } else {
      setCicloActual(null)
      setPlanCiclado([])
      setTareasHoy([])
      setTareasVencidas([])
      setProductosAcuario([])
    }
  }, [acuarioSeleccionado])

  /* =========================================================
     FECHAS
  ========================================================= */

  const fechaLocalISO = (fecha = new Date()) => {
    const anio = fecha.getFullYear()
    const mes = String(fecha.getMonth() + 1).padStart(2, '0')
    const dia = String(fecha.getDate()).padStart(2, '0')

    return `${anio}-${mes}-${dia}`
  }

  const fechaHoy = () => {
    return fechaLocalISO(new Date())
  }

  const sumarDiasFecha = (fechaTexto, dias) => {
    const [anio, mes, dia] = fechaTexto.split('-').map(Number)

    const fecha = new Date(anio, mes - 1, dia)
    fecha.setDate(fecha.getDate() + dias)

    return fechaLocalISO(fecha)
  }

  const fechaHoraAISO = (fechaTexto, horaTexto = '09:00') => {
    const [anio, mes, dia] = fechaTexto.split('-').map(Number)
    const [hora, minuto] = horaTexto.split(':').map(Number)

    const fecha = new Date(
      anio,
      mes - 1,
      dia,
      hora || 0,
      minuto || 0,
      0,
      0
    )

    return fecha.toISOString()
  }

  const formatearFecha = (fecha) => {
    if (!fecha) return '—'

    const parteFecha = fecha.includes('T')
      ? fecha.split('T')[0]
      : fecha

    const [anio, mes, dia] = parteFecha.split('-')

    return `${dia}/${mes}/${anio}`
  }

  const calcularDiasCiclado = (inicio, fin = null) => {
    if (!inicio) return 0

    const [anioInicio, mesInicio, diaInicio] = inicio
      .split('-')
      .map(Number)

    const fechaInicio = new Date(
      anioInicio,
      mesInicio - 1,
      diaInicio
    )

    let fechaFinal

    if (fin) {
      const [anioFin, mesFin, diaFin] = fin
        .split('-')
        .map(Number)

      fechaFinal = new Date(anioFin, mesFin - 1, diaFin)
    } else {
      fechaFinal = new Date()
      fechaFinal.setHours(0, 0, 0, 0)
    }

    fechaInicio.setHours(0, 0, 0, 0)

    const diferencia =
      fechaFinal.getTime() - fechaInicio.getTime()

    if (diferencia < 0) return 0

    return Math.floor(diferencia / 86400000) + 1
  }

  const numeroONull = (valor) => {
    if (
      valor === '' ||
      valor === null ||
      valor === undefined
    ) {
      return null
    }

    const numero = Number(valor)

    return Number.isNaN(numero) ? null : numero
  }

  /* =========================================================
     AUTENTICACIÓN
  ========================================================= */

  const iniciarSesion = async (e) => {
    e.preventDefault()

    if (iniciandoSesion) return

    setMensaje('')
    setIniciandoSesion(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (error) {
        setMensaje(`❌ No se pudo iniciar sesión: ${error.message}`)
      }
    } catch (error) {
      setMensaje(`❌ No se pudo iniciar sesión: ${error.message}`)
    } finally {
      setIniciandoSesion(false)
    }
  }

  const crearCuenta = async () => {
    setMensaje('')

    if (!email || !password) {
      setMensaje('Debes ingresar correo y contraseña.')
      return
    }

    if (password.length < 6) {
      setMensaje(
        'La contraseña debe tener al menos 6 caracteres.'
      )
      return
    }

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    if (data?.user) {
      setMensaje(
        '✅ Cuenta creada correctamente. Revisa tu correo si necesitas confirmar la cuenta.'
      )
    }
  }

  const cerrarSesion = async () => {
    await supabase.auth.signOut()
  }

  /* =========================================================
     CARGA GENERAL DEL ACUARIO
  ========================================================= */

  const cargarDatosAcuario = async () => {
    await Promise.all([
      cargarCicloAcuario(),
      cargarProductosAcuario(),
      cargarTareas(),
      cargarMedicionesAgua(),
      cargarMantenimientos(),
      cargarHistorialGeneral(),
    ])
  }

  /* =========================================================
     ACUARIOS
  ========================================================= */

  const cargarAcuarios = async () => {
    if (!session?.user?.id) return

    setCargandoAcuarios(true)

    const { data, error } = await supabase
      .from('acuarios')
      .select('*')
      .eq('usuario_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      setMensaje(`Error: ${error.message}`)
    } else {
      setAcuarios(data ?? [])
    }

    setCargandoAcuarios(false)
  }

  const abrirModalAcuario = () => {
    setFormAcuario({
      nombre: '',
      descripcion: '',
      volumen_litros: '',
      largo_cm: '',
      ancho_cm: '',
      alto_cm: '',
      tipo: 'Acuario',
      subtipo: '',
      ubicacion: 'Interior',
      exposicion_solar: '',
      fecha_inicio: fechaHoy(),
      temperatura_objetivo: '',
      costo_inicial: '',
    })

    setFotoPortadaArchivo(null)
    setFotoPortadaPreview('')
    setMensajeAcuario('')
    setProgresoCreacion('')
    setMostrarDetallesAcuario(false)
    guardandoAcuarioRef.current = false
    setMostrarModalAcuario(true)
  }

  const actualizarCampoAcuario = (e) => {
    const { name, value } = e.target

    setFormAcuario((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  const seleccionarFotoPortada = (e) => {
    const archivo = e.target.files?.[0] || null
    setFotoPortadaArchivo(archivo)

    if (fotoPortadaPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(fotoPortadaPreview)
    }

    setFotoPortadaPreview(
      archivo ? URL.createObjectURL(archivo) : ''
    )
  }

  const actualizarAcuarioLocal = (actualizado) => {
    if (!actualizado?.id) return

    setAcuarios((lista) =>
      lista.map((item) =>
        item.id === actualizado.id ? actualizado : item
      )
    )

    setAcuarioSeleccionado((actual) =>
      actual?.id === actualizado.id ? actualizado : actual
    )
  }

  const guardarAcuario = async (e) => {
    e.preventDefault()

    if (!session?.user?.id) return

    // Protección real contra doble clic / doble envío.
    if (guardandoAcuarioRef.current) return

    const nombreLimpio = formAcuario.nombre.trim()

    if (!nombreLimpio) {
      setMensajeAcuario('⚠️ Debes ingresar el nombre del acuario.')
      return
    }

    const existeMismoNombre = acuarios.some(
      (item) =>
        item.nombre?.trim().toLowerCase() ===
        nombreLimpio.toLowerCase()
    )

    if (existeMismoNombre) {
      const continuar = window.confirm(
        `Ya existe un acuario llamado "${nombreLimpio}".\n\n` +
        'Si estás creando uno diferente puedes continuar. ' +
        'Si fue un intento anterior, pulsa Cancelar.'
      )

      if (!continuar) {
        setMensajeAcuario(
          'ℹ️ Creación cancelada para evitar un posible duplicado.'
        )
        return
      }
    }

    guardandoAcuarioRef.current = true
    setGuardandoAcuario(true)
    setMensaje('')
    setMensajeAcuario('')
    setProgresoCreacion('guardando_datos')

    try {
      const { data: creado, error } = await supabase
        .from('acuarios')
        .insert([
          {
            usuario_id: session.user.id,
            nombre: nombreLimpio,
            descripcion: formAcuario.descripcion.trim() || null,
            volumen_litros: numeroONull(formAcuario.volumen_litros),
            largo_cm: numeroONull(formAcuario.largo_cm),
            ancho_cm: numeroONull(formAcuario.ancho_cm),
            alto_cm: numeroONull(formAcuario.alto_cm),
            tipo: formAcuario.tipo || null,
            subtipo: formAcuario.subtipo || null,
            ubicacion: formAcuario.ubicacion || null,
            exposicion_solar: formAcuario.exposicion_solar || null,
            fecha_inicio: formAcuario.fecha_inicio || null,
            temperatura_objetivo: numeroONull(
              formAcuario.temperatura_objetivo
            ),
            costo_inicial: numeroONull(formAcuario.costo_inicial),
            estado: 'activo',
          },
        ])
        .select()
        .single()

      if (error) throw error

      let acuarioFinal = creado

      if (fotoPortadaArchivo) {
        setProgresoCreacion('procesando_foto')

        const subida = await subirImagenPublica({
          archivo: fotoPortadaArchivo,
          usuarioId: session.user.id,
          acuarioId: creado.id,
          carpeta: 'portada',
          maxWidth: 1200,
          maxHeight: 900,
          quality: 0.72,
        })

        const { data: actualizado, error: errorPortada } =
          await supabase
            .from('acuarios')
            .update({
              foto_portada_url: subida.url,
              updated_at: new Date().toISOString(),
            })
            .eq('id', creado.id)
            .select()
            .single()

        if (errorPortada) throw errorPortada

        acuarioFinal = actualizado
      }

      setProgresoCreacion('finalizando')

      setAcuarios((anterior) => [
        acuarioFinal,
        ...anterior.filter(
          (item) => item.id !== acuarioFinal.id
        ),
      ])

      setFotoPortadaArchivo(null)
      setFotoPortadaPreview('')
      setMensajeAcuario('')

      // Pequeña pausa visual para que el usuario vea que terminó.
      await new Promise((resolve) => setTimeout(resolve, 350))

      setMostrarModalAcuario(false)
      setMensaje(
        `✅ "${acuarioFinal.nombre}" fue creado correctamente.`
      )

      setProgresoCreacion('')
    } catch (error) {
      console.error(error)

      setMensajeAcuario(
        `❌ No se pudo crear el acuario: ${error.message}`
      )

      setProgresoCreacion('error')
    } finally {
      guardandoAcuarioRef.current = false
      setGuardandoAcuario(false)
    }
  }

  const limpiarStorageAcuario = async (acuarioId) => {
    if (!session?.user?.id || !acuarioId) return

    const base = `${session.user.id}/${acuarioId}`

    try {
      // Fotos antiguas guardadas directamente en la carpeta del acuario.
      const { data: raiz } = await supabase.storage
        .from('fotos-acuario')
        .list(base, {
          limit: 1000,
        })

      const archivosRaiz = (raiz ?? [])
        .filter(
          (item) =>
            item.name &&
            item.id &&
            !['portada', 'fotos'].includes(item.name)
        )
        .map((item) => `${base}/${item.name}`)

      // Portadas nuevas.
      const { data: portadas } = await supabase.storage
        .from('fotos-acuario')
        .list(`${base}/portada`, {
          limit: 1000,
        })

      const archivosPortada = (portadas ?? [])
        .filter((item) => item.name && item.id)
        .map(
          (item) =>
            `${base}/portada/${item.name}`
        )

      // Fotografías que utilicen la nueva estructura /fotos.
      const { data: fotos } = await supabase.storage
        .from('fotos-acuario')
        .list(`${base}/fotos`, {
          limit: 1000,
        })

      const archivosFotos = (fotos ?? [])
        .filter((item) => item.name && item.id)
        .map(
          (item) =>
            `${base}/fotos/${item.name}`
        )

      const archivos = [
        ...archivosRaiz,
        ...archivosPortada,
        ...archivosFotos,
      ]

      if (archivos.length > 0) {
        await supabase.storage
          .from('fotos-acuario')
          .remove(archivos)
      }
    } catch (error) {
      // La eliminación del registro principal no debe quedar bloqueada
      // si Storage no tiene archivos o devuelve un error.
      console.warn(
        'No se pudieron limpiar todos los archivos de Storage:',
        error
      )
    }
  }

  const solicitarEliminarAcuario = (acuario) => {
    if (!acuario?.id || eliminandoAcuarioId) return
    setMenuTarjetaAcuario(null)
    setAcuarioEliminarPendiente(acuario)
  }

  const cancelarEliminarAcuario = () => {
    if (eliminandoAcuarioId) return
    setAcuarioEliminarPendiente(null)
  }

  const eliminarAcuarioDefinitivamente = async () => {
    const acuario = acuarioEliminarPendiente
    if (!acuario?.id || eliminandoAcuarioId) return

    setEliminandoAcuarioId(acuario.id)
    setMensaje('')

    try {
      await limpiarStorageAcuario(acuario.id)

      const { error } = await supabase
        .from('acuarios')
        .delete()
        .eq('id', acuario.id)
        .eq('usuario_id', session.user.id)

      if (error) throw error

      setAcuarios((lista) =>
        lista.filter((item) => item.id !== acuario.id)
      )

      setAcuarioEliminarPendiente(null)
      setMensaje(`✅ "${acuario.nombre}" fue eliminado correctamente.`)
    } catch (error) {
      setMensaje(`❌ No se pudo eliminar el acuario: ${error.message}`)
    } finally {
      setEliminandoAcuarioId(null)
    }
  }

  const archivarAcuarioDesdeLista = async (acuario) => {
    if (!acuario?.id) return

    setMenuTarjetaAcuario(null)

    const nuevoEstado =
      acuario.estado === 'archivado'
        ? 'activo'
        : 'archivado'

    const texto =
      nuevoEstado === 'archivado'
        ? `¿Archivar "${acuario.nombre}"? No se borrará su historial.`
        : `¿Reactivar "${acuario.nombre}"?`

    if (!window.confirm(texto)) return

    const { data, error } = await supabase
      .from('acuarios')
      .update({
        estado: nuevoEstado,
        archivado_en:
          nuevoEstado === 'archivado'
            ? new Date().toISOString()
            : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', acuario.id)
      .eq('usuario_id', session.user.id)
      .select()
      .single()

    if (error) {
      setMensaje(`❌ Error: ${error.message}`)
      return
    }

    actualizarAcuarioLocal(data)

    setMensaje(
      nuevoEstado === 'archivado'
        ? `✅ "${acuario.nombre}" fue archivado.`
        : `✅ "${acuario.nombre}" fue reactivado.`
    )
  }

  const abrirAcuario = (acuario) => {
    setAcuarioSeleccionado(acuario)
    setSeccionActiva('resumen')
    setMensaje('')
  }

  const volverMisAcuarios = () => {
    setAcuarioSeleccionado(null)
    setSeccionActiva('resumen')
    setMensaje('')
  }

  /* =========================================================
     CICLADO
  ========================================================= */

  const cargarCicloAcuario = async () => {
    if (!acuarioSeleccionado?.id) return

    const { data, error } = await supabase
      .from('ciclos_acuario')
      .select('*')
      .eq('acuario_id', acuarioSeleccionado.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (error) {
      console.error(error)
      return
    }

    const ciclo = data?.[0] ?? null

    setCicloActual(ciclo)

    if (ciclo?.id) {
      await cargarPlanCiclado(ciclo.id)
    } else {
      setPlanCiclado([])
    }
  }

  const abrirConfiguracionCiclado = () => {
    if (cicloActual) {
      setFormCiclado({
        tiene_ciclado: cicloActual.estado === 'activo',
        fecha_inicio: cicloActual.fecha_inicio || '',
        fecha_fin: cicloActual.fecha_fin || '',
        descripcion: cicloActual.descripcion || '',
      })
    } else {
      setFormCiclado({
        tiene_ciclado: false,
        fecha_inicio: fechaHoy(),
        fecha_fin: '',
        descripcion: '',
      })
    }

    setMostrarModalCiclado(true)
  }

  const guardarCiclado = async (e) => {
    e.preventDefault()

    if (!acuarioSeleccionado?.id) return

    setGuardandoCiclado(true)
    setMensaje('')

    try {
      if (formCiclado.tiene_ciclado) {
        if (!formCiclado.fecha_inicio) {
          setMensaje(
            'Debes indicar la fecha de inicio del ciclado.'
          )
          setGuardandoCiclado(false)
          return
        }

        const estado =
          formCiclado.fecha_fin
            ? 'finalizado'
            : 'activo'

        if (cicloActual?.id) {
          const { error } = await supabase
            .from('ciclos_acuario')
            .update({
              fecha_inicio: formCiclado.fecha_inicio,
              fecha_fin:
                formCiclado.fecha_fin || null,
              estado,
              descripcion:
                formCiclado.descripcion.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', cicloActual.id)

          if (error) throw error
        } else {
          const { error } = await supabase
            .from('ciclos_acuario')
            .insert([
              {
                acuario_id:
                  acuarioSeleccionado.id,
                nombre: 'Ciclado del acuario',
                tipo: 'ciclado',
                fecha_inicio:
                  formCiclado.fecha_inicio,
                fecha_fin:
                  formCiclado.fecha_fin || null,
                estado,
                descripcion:
                  formCiclado.descripcion.trim() ||
                  null,
              },
            ])

          if (error) throw error
        }

        await cargarCicloAcuario()
        await cargarTareas()

        setMostrarModalCiclado(false)

        setMensaje(
          estado === 'activo'
            ? '✅ Ciclado activado.'
            : '✅ Ciclado registrado como finalizado.'
        )
      } else {
        if (
          cicloActual?.id &&
          cicloActual.estado === 'activo'
        ) {
          const { error } = await supabase
            .from('ciclos_acuario')
            .update({
              fecha_fin:
                formCiclado.fecha_fin || fechaHoy(),
              estado: 'finalizado',
              updated_at: new Date().toISOString(),
            })
            .eq('id', cicloActual.id)

          if (error) throw error

          await cargarCicloAcuario()
        }

        setMostrarModalCiclado(false)
      }
    } catch (error) {
      setMensaje(`Error: ${error.message}`)
    }

    setGuardandoCiclado(false)
  }

  const finalizarCicladoHoy = async () => {
    if (!cicloActual?.id) return

    const { error } = await supabase
      .from('ciclos_acuario')
      .update({
        fecha_fin: fechaHoy(),
        estado: 'finalizado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', cicloActual.id)

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    await cargarCicloAcuario()

    setMostrarModalCiclado(false)
    setMensaje('✅ Ciclado finalizado.')
  }

  const diasCiclado = cicloActual
    ? calcularDiasCiclado(
        cicloActual.fecha_inicio,
        cicloActual.fecha_fin
      )
    : 0

  const cicladoActivo =
    cicloActual?.estado === 'activo' &&
    !cicloActual?.fecha_fin

  /* =========================================================
     PLAN CICLADO
  ========================================================= */

  const cargarPlanCiclado = async (cicloId = cicloActual?.id) => {
    if (!cicloId) {
      setPlanCiclado([])
      return
    }

    const { data, error } = await supabase
      .from('plan_ciclado_actividades')
      .select('*')
      .eq('ciclo_id', cicloId)
      .eq('activo', true)
      .order('dia_inicio', { ascending: true })

    if (error) {
      console.error(error)
    } else {
      setPlanCiclado(data ?? [])
    }
  }

  const abrirPlanCiclado = () => {
    if (!cicloActual?.id) {
      setMensaje(
        'Primero debes activar el ciclado del acuario.'
      )
      return
    }

    cargarPlanCiclado()
    setMostrarModalPlan(true)
  }

  const abrirNuevaActividad = () => {
    setFormActividad({
      tipo: 'producto',
      titulo: '',
      producto_id: '',
      regla_dosificacion_id: '',
      dia_inicio: '1',
      tipo_repeticion: 'una_vez',
      intervalo_dias: '1',
      duracion_dias: '1',
      aplicar_sobre: 'volumen_total',
      litros_personalizados: '',
      hora_recordatorio: '09:00',
      descripcion: '',
    })

    setMostrarModalActividad(true)
  }

  const productoSeleccionadoPlan = useMemo(() => {
    return productos.find(
      (producto) =>
        producto.id === formActividad.producto_id
    )
  }, [productos, formActividad.producto_id])

  const reglasProductoPlan =
    productoSeleccionadoPlan?.reglas_dosificacion ?? []

  useEffect(() => {
    if (
      formActividad.producto_id &&
      reglasProductoPlan.length > 0
    ) {
      const reglaActiva =
        reglasProductoPlan.find(
          (regla) => regla.activa
        ) ?? reglasProductoPlan[0]

      setFormActividad((anterior) => ({
        ...anterior,
        regla_dosificacion_id:
          reglaActiva.id,
        aplicar_sobre:
          reglaActiva.aplicar_sobre ||
          anterior.aplicar_sobre,
      }))
    }
  }, [formActividad.producto_id])

  const obtenerReglaPorId = (reglaId) => {
    for (const producto of productos) {
      const regla =
        producto.reglas_dosificacion?.find(
          (item) => item.id === reglaId
        )

      if (regla) return regla
    }

    return null
  }

  const calcularDosisPlan = (
    reglaId,
    aplicarSobre,
    litrosPersonalizados
  ) => {
    const regla = obtenerReglaPorId(reglaId)

    if (!regla) return null

    let litros = 0

    if (aplicarSobre === 'volumen_total') {
      litros =
        Number(
          acuarioSeleccionado?.volumen_litros
        ) || 0
    } else {
      litros =
        Number(litrosPersonalizados) || 0
    }

    if (!litros) return null

    const cantidad = Number(
      regla.dosis_cantidad
    )

    const referencia = Number(
      regla.volumen_referencia_litros
    )

    if (!cantidad || !referencia) {
      return null
    }

    return {
      litros,
      dosis:
        (cantidad / referencia) *
        litros,
      unidad:
        regla.dosis_unidad || 'ml',
    }
  }

  const generarDiasActividad = () => {
    const inicio =
      Number(formActividad.dia_inicio) || 1

    const duracion =
      Math.max(
        Number(formActividad.duracion_dias) || 1,
        1
      )

    const intervalo =
      Math.max(
        Number(formActividad.intervalo_dias) || 1,
        1
      )

    if (
      formActividad.tipo_repeticion ===
      'una_vez'
    ) {
      return [inicio]
    }

    if (
      formActividad.tipo_repeticion ===
      'diario'
    ) {
      return Array.from(
        { length: duracion },
        (_, indice) => inicio + indice
      )
    }

    const dias = []

    for (
      let desplazamiento = 0;
      desplazamiento < duracion;
      desplazamiento += intervalo
    ) {
      dias.push(inicio + desplazamiento)
    }

    return dias
  }

  const guardarActividadPlan = async (e) => {
    e.preventDefault()

    if (
      !cicloActual?.id ||
      !cicloActual.fecha_inicio
    ) {
      setMensaje(
        'No existe un ciclado activo configurado.'
      )
      return
    }

    if (
      formActividad.tipo === 'producto' &&
      !formActividad.producto_id
    ) {
      setMensaje('Selecciona un producto.')
      return
    }

    setGuardandoActividad(true)
    setMensaje('')

    try {
      let titulo = formActividad.titulo.trim()

      if (
        formActividad.tipo === 'producto'
      ) {
        titulo =
          productoSeleccionadoPlan?.nombre ||
          'Aplicar producto'
      }

      if (!titulo) {
        const nombres = {
          medicion_agua: 'Medir parámetros del agua',
          cambio_agua: 'Cambio de agua',
          alimentacion: 'Alimentación',
          mantenimiento: 'Mantenimiento',
          nota: 'Revisión',
          otro: 'Actividad',
        }

        titulo =
          nombres[formActividad.tipo] ||
          'Actividad'
      }

      const { data: actividadCreada, error } =
        await supabase
          .from('plan_ciclado_actividades')
          .insert([
            {
              ciclo_id: cicloActual.id,
              acuario_id:
                acuarioSeleccionado.id,
              tipo: formActividad.tipo,
              titulo,
              producto_id:
                formActividad.producto_id ||
                null,
              regla_dosificacion_id:
                formActividad
                  .regla_dosificacion_id ||
                null,
              dia_inicio: Number(
                formActividad.dia_inicio
              ),
              tipo_repeticion:
                formActividad.tipo_repeticion,
              intervalo_dias: Number(
                formActividad.intervalo_dias ||
                  1
              ),
              duracion_dias: Number(
                formActividad.duracion_dias ||
                  1
              ),
              aplicar_sobre:
                formActividad.aplicar_sobre,
              litros_personalizados:
                numeroONull(
                  formActividad
                    .litros_personalizados
                ),
              hora_recordatorio:
                formActividad.hora_recordatorio ||
                null,
              descripcion:
                formActividad.descripcion.trim() ||
                null,
              activo: true,
            },
          ])
          .select()
          .single()

      if (error) throw error

      const dias = generarDiasActividad()

      const calculo =
        formActividad.tipo === 'producto'
          ? calcularDosisPlan(
              formActividad.regla_dosificacion_id,
              formActividad.aplicar_sobre,
              formActividad.litros_personalizados
            )
          : null

      const tareas = dias.map((diaCiclado) => {
        const fechaActividad = sumarDiasFecha(
          cicloActual.fecha_inicio,
          diaCiclado - 1
        )

        return {
          acuario_id:
            acuarioSeleccionado.id,
          ciclo_id: cicloActual.id,
          plan_actividad_id:
            actividadCreada.id,
          producto_id:
            formActividad.producto_id ||
            null,
          regla_dosificacion_id:
            formActividad
              .regla_dosificacion_id ||
            null,

          titulo,
          tipo: formActividad.tipo,
          descripcion:
            formActividad.descripcion.trim() ||
            null,

          fecha_programada: fechaHoraAISO(
            fechaActividad,
            formActividad.hora_recordatorio ||
              '09:00'
          ),

          estado: 'pendiente',
          dia_ciclado: diaCiclado,
          aplicar_sobre:
            formActividad.aplicar_sobre,

          volumen_litros:
            calculo?.litros ?? null,

          dosis_calculada:
            calculo
              ? Number(
                  calculo.dosis.toFixed(3)
                )
              : null,

          unidad:
            calculo?.unidad ?? null,
        }
      })

      const { error: errorTareas } =
        await supabase
          .from('tareas_acuario')
          .insert(tareas)

      if (errorTareas) throw errorTareas

      await cargarPlanCiclado()
      await cargarTareas()

      setMostrarModalActividad(false)

      setMensaje(
        '✅ Actividad agregada al plan de ciclado.'
      )
    } catch (error) {
      console.error(error)

      setMensaje(`Error: ${error.message}`)
    }

    setGuardandoActividad(false)
  }

  const eliminarActividadPlan = async (
    actividad
  ) => {
    const confirmar = window.confirm(
      `¿Eliminar "${actividad.titulo}" del plan?`
    )

    if (!confirmar) return

    const { error: errorTareas } =
      await supabase
        .from('tareas_acuario')
        .delete()
        .eq(
          'plan_actividad_id',
          actividad.id
        )
        .eq('estado', 'pendiente')

    if (errorTareas) {
      setMensaje(
        `Error: ${errorTareas.message}`
      )
      return
    }

    const { error } = await supabase
      .from('plan_ciclado_actividades')
      .update({
        activo: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', actividad.id)

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    await cargarPlanCiclado()
    await cargarTareas()
  }

  /* =========================================================
     TAREAS
  ========================================================= */

  const cargarTareas = async () => {
    if (!acuarioSeleccionado?.id) return

    setCargandoTareas(true)

    const hoyTexto = fechaHoy()
    const mananaTexto =
      sumarDiasFecha(hoyTexto, 1)

    const inicioHoy = fechaHoraAISO(
      hoyTexto,
      '00:00'
    )

    const inicioManana = fechaHoraAISO(
      mananaTexto,
      '00:00'
    )

    const { data: hoy, error: errorHoy } =
      await supabase
        .from('tareas_acuario')
        .select('*')
        .eq(
          'acuario_id',
          acuarioSeleccionado.id
        )
        .gte(
          'fecha_programada',
          inicioHoy
        )
        .lt(
          'fecha_programada',
          inicioManana
        )
        .order(
          'fecha_programada',
          { ascending: true }
        )

    const { data: vencidas, error: errorVencidas } =
      await supabase
        .from('tareas_acuario')
        .select('*')
        .eq(
          'acuario_id',
          acuarioSeleccionado.id
        )
        .eq('estado', 'pendiente')
        .lt(
          'fecha_programada',
          inicioHoy
        )
        .order(
          'fecha_programada',
          { ascending: true }
        )

    if (!errorHoy) {
      setTareasHoy(hoy ?? [])
    }

    if (!errorVencidas) {
      setTareasVencidas(
        vencidas ?? []
      )
    }

    setCargandoTareas(false)
  }

  const completarTarea = async (tarea) => {
    const { error } = await supabase
      .from('tareas_acuario')
      .update({
        estado: 'completada',
        completada_en:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', tarea.id)

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    await cargarTareas()
  }

  const accionTarea = async (tarea) => {
    if (
      tarea.tipo === 'producto' &&
      tarea.producto_id
    ) {
      const producto = productos.find(
        (item) =>
          item.id === tarea.producto_id
      )

      if (!producto) {
        setMensaje(
          'No se encontró el producto.'
        )
        return
      }

      abrirCalculadora(
        producto,
        tarea
      )

      return
    }

    if (
      tarea.tipo === 'medicion_agua'
    ) {
      setSeccionActiva('agua')
      abrirRegistroAgua(tarea)
      return
    }

    if (
      tarea.tipo === 'cambio_agua' ||
      tarea.tipo === 'mantenimiento'
    ) {
      setSeccionActiva('mantenimiento')
      abrirMantenimiento(
        tarea.tipo === 'cambio_agua'
          ? 'Cambio de agua'
          : 'Mantenimiento general',
        tarea
      )
      return
    }

    await completarTarea(tarea)
  }

  /* =========================================================
     PRODUCTOS
  ========================================================= */

  const cargarProductos = async () => {
    if (!session?.user?.id) return

    setCargandoProductos(true)

    const { data, error } = await supabase
      .from('productos')
      .select(`
        *,
        reglas_dosificacion (*)
      `)
      .eq(
        'usuario_id',
        session.user.id
      )
      .order(
        'created_at',
        { ascending: false }
      )

    if (!error) {
      setProductos(data ?? [])
    }

    setCargandoProductos(false)
  }

  const cargarProductosAcuario = async () => {
    if (!acuarioSeleccionado?.id) return

    const { data, error } = await supabase
      .from('productos_acuario')
      .select('*')
      .eq(
        'acuario_id',
        acuarioSeleccionado.id
      )
      .order(
        'created_at',
        { ascending: false }
      )

    if (!error) {
      setProductosAcuario(data ?? [])
    }
  }

  const obtenerReglaPrincipal = (producto) => {
    if (
      !producto?.reglas_dosificacion?.length
    ) {
      return null
    }

    return (
      producto.reglas_dosificacion.find(
        (regla) => regla.activa
      ) ??
      producto.reglas_dosificacion[0]
    )
  }

  const obtenerAsignacionProducto = (
    productoId
  ) => {
    return productosAcuario.find(
      (registro) =>
        registro.producto_id ===
          productoId &&
        registro.estado !==
          'finalizado'
    )
  }

  const productoEstaAsignado = (
    productoId
  ) => {
    return Boolean(
      obtenerAsignacionProducto(productoId)
    )
  }

  const abrirModalProducto = () => {
    setFormProducto({
      nombre: '',
      marca: '',
      categoria: '',
      descripcion: '',
      unidad_dosis: 'ml',
      fecha_compra: '',
      fecha_apertura: '',
      fecha_vencimiento: '',
      regla_nombre: 'Dosis normal',
      dosis_cantidad: '',
      dosis_unidad: 'ml',
      volumen_referencia_litros: '',
      aplicar_sobre: 'volumen_total',
      instrucciones: '',
    })

    setMostrarModalProducto(true)
  }

  const actualizarCampoProducto = (e) => {
    const { name, value } = e.target

    setFormProducto((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  const guardarProducto = async (e) => {
    e.preventDefault()

    if (!session?.user?.id) return

    if (!formProducto.nombre.trim()) {
      setMensaje(
        'Debes ingresar el nombre del producto.'
      )
      return
    }

    setGuardandoProducto(true)

    const {
      data: productoCreado,
      error: errorProducto,
    } = await supabase
      .from('productos')
      .insert([
        {
          usuario_id:
            session.user.id,
          nombre:
            formProducto.nombre.trim(),
          marca:
            formProducto.marca.trim() ||
            null,
          categoria:
            formProducto.categoria ||
            null,
          descripcion:
            formProducto.descripcion.trim() ||
            null,
          unidad_dosis:
            formProducto.dosis_unidad,
          estado: 'activo',
          fecha_compra:
            formProducto.fecha_compra ||
            null,
          fecha_apertura:
            formProducto.fecha_apertura ||
            null,
          fecha_vencimiento:
            formProducto.fecha_vencimiento ||
            null,
        },
      ])
      .select()
      .single()

    if (errorProducto) {
      setMensaje(
        `Error: ${errorProducto.message}`
      )
      setGuardandoProducto(false)
      return
    }

    const { error: errorRegla } =
      await supabase
        .from('reglas_dosificacion')
        .insert([
          {
            producto_id:
              productoCreado.id,
            nombre:
              formProducto.regla_nombre ||
              'Dosis normal',
            dosis_cantidad: Number(
              formProducto.dosis_cantidad
            ),
            dosis_unidad:
              formProducto.dosis_unidad,
            volumen_referencia_litros:
              Number(
                formProducto
                  .volumen_referencia_litros
              ),
            aplicar_sobre:
              formProducto.aplicar_sobre,
            instrucciones:
              formProducto.instrucciones.trim() ||
              null,
            activa: true,
          },
        ])

    if (errorRegla) {
      setMensaje(
        `Error: ${errorRegla.message}`
      )
      setGuardandoProducto(false)
      return
    }

    await cargarProductos()

    setMostrarModalProducto(false)
    setGuardandoProducto(false)

    setMensaje(
      '✅ Producto guardado correctamente.'
    )
  }

  const usarProductoEnAcuario = async (
    producto
  ) => {
    const regla =
      obtenerReglaPrincipal(producto)

    const { error } = await supabase
      .from('productos_acuario')
      .insert([
        {
          acuario_id:
            acuarioSeleccionado.id,
          producto_id: producto.id,
          regla_dosificacion_id:
            regla?.id ?? null,
          estado: 'activo',
          fecha_inicio: fechaHoy(),
        },
      ])

    if (error) {
      setMensaje(`Error: ${error.message}`)
      return
    }

    await cargarProductosAcuario()
  }

  const cambiarEstadoProducto = async (
    asignacion,
    nuevoEstado
  ) => {
    const cambios = {
      estado: nuevoEstado,
      updated_at:
        new Date().toISOString(),
    }

    if (
      nuevoEstado === 'finalizado'
    ) {
      cambios.fecha_fin = fechaHoy()
    }

    const { error } = await supabase
      .from('productos_acuario')
      .update(cambios)
      .eq('id', asignacion.id)

    if (!error) {
      await cargarProductosAcuario()
    }
  }

  /* =========================================================
     DOSIFICACIÓN
  ========================================================= */

  const abrirCalculadora = (
    producto,
    tarea = null
  ) => {
    let regla = null

    if (tarea?.regla_dosificacion_id) {
      regla =
        producto.reglas_dosificacion?.find(
          (item) =>
            item.id ===
            tarea.regla_dosificacion_id
        )
    }

    if (!regla) {
      regla =
        obtenerReglaPrincipal(producto)
    }

    if (!regla) {
      setMensaje(
        'Este producto no tiene una dosis configurada.'
      )
      return
    }

    let litros =
      tarea?.volumen_litros ?? ''

    if (!litros) {
      if (
        regla.aplicar_sobre ===
        'volumen_total'
      ) {
        litros =
          Number(
            acuarioSeleccionado
              ?.volumen_litros
          ) || ''
      }
    }

    setTareaEnAplicacion(tarea)

    setProductoCalculo({
      producto,
      regla,
    })

    setFormDosis({
      tipo_volumen:
        tarea?.aplicar_sobre ||
        regla.aplicar_sobre ||
        'volumen_total',

      litros,

      dosis_aplicada:
        tarea?.dosis_calculada
          ? String(
              Number(
                tarea.dosis_calculada
              ).toFixed(2)
            )
          : '',

      motivo:
        cicladoActivo
          ? 'Ciclado'
          : 'Mantenimiento',

      observaciones: '',
    })

    setMostrarCalculadora(true)
  }

  const actualizarCampoDosis = (e) => {
    const { name, value } = e.target

    if (
      name === 'tipo_volumen'
    ) {
      setFormDosis((anterior) => ({
        ...anterior,
        tipo_volumen: value,

        litros:
          value === 'volumen_total'
            ? Number(
                acuarioSeleccionado
                  ?.volumen_litros
              ) || ''
            : '',
      }))

      return
    }

    setFormDosis((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  const dosisCalculada = useMemo(() => {
    if (!productoCalculo?.regla) {
      return 0
    }

    const litros =
      Number(formDosis.litros)

    const cantidad = Number(
      productoCalculo.regla
        .dosis_cantidad
    )

    const referencia = Number(
      productoCalculo.regla
        .volumen_referencia_litros
    )

    if (
      !litros ||
      !cantidad ||
      !referencia
    ) {
      return 0
    }

    return (
      (cantidad / referencia) *
      litros
    )
  }, [
    productoCalculo,
    formDosis.litros,
  ])

  useEffect(() => {
    if (
      mostrarCalculadora &&
      dosisCalculada > 0 &&
      !tareaEnAplicacion
    ) {
      setFormDosis((anterior) => ({
        ...anterior,
        dosis_aplicada:
          dosisCalculada.toFixed(2),
      }))
    }
  }, [
    dosisCalculada,
    mostrarCalculadora,
    tareaEnAplicacion,
  ])

  const registrarDosis = async (e) => {
    e.preventDefault()

    if (!productoCalculo?.producto) {
      return
    }

    setGuardandoDosis(true)

    const { error } = await supabase
      .from('dosis_aplicadas')
      .insert([
        {
          acuario_id:
            acuarioSeleccionado.id,

          producto_id:
            productoCalculo.producto.id,

          regla_dosificacion_id:
            productoCalculo.regla.id,

          motivo:
            formDosis.motivo,

          volumen_calculado_litros:
            Number(formDosis.litros),

          dosis_calculada:
            Number(
              dosisCalculada.toFixed(3)
            ),

          dosis_aplicada:
            Number(
              formDosis.dosis_aplicada
            ),

          unidad:
            productoCalculo.regla
              .dosis_unidad || 'ml',

          observaciones:
            formDosis.observaciones.trim() ||
            null,
        },
      ])

    if (error) {
      setMensaje(
        `Error: ${error.message}`
      )
      setGuardandoDosis(false)
      return
    }

    const contenidoActual = numeroONull(productoCalculo.producto.contenido_actual)
    const dosisUsada = numeroONull(formDosis.dosis_aplicada)

    if (
      contenidoActual != null &&
      dosisUsada != null &&
      ['ml', 'g', 'mg', 'gotas'].includes(productoCalculo.regla.dosis_unidad || 'ml')
    ) {
      const nuevoContenido = Math.max(0, contenidoActual - dosisUsada)

      await supabase
        .from('productos')
        .update({
          contenido_actual: Number(nuevoContenido.toFixed(3)),
          updated_at: new Date().toISOString(),
        })
        .eq('id', productoCalculo.producto.id)

      await cargarProductos()
    }

    if (tareaEnAplicacion?.id) {
      await supabase
        .from('tareas_acuario')
        .update({
          estado: 'completada',
          completada_en:
            new Date().toISOString(),
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          tareaEnAplicacion.id
        )
    }

    setMostrarCalculadora(false)
    setTareaEnAplicacion(null)

    await cargarTareas()

    setMensaje(
      '✅ Producto aplicado y registrado.'
    )

    setGuardandoDosis(false)
  }


  /* =========================================================
     AGUA
  ========================================================= */

  const abrirRegistroAgua = (tarea = null) => {
    setTareaAguaEnRegistro(tarea)

    setFormAgua({
      temperatura_c: '',
      ph: '',
      amonio_nh3: '',
      nitrito_no2: '',
      nitrato_no3: '',
      gh: '',
      kh: '',
      tds: '',
      observaciones: '',
    })

    setMostrarModalAgua(true)
    setMostrarRegistroRapido(false)
  }

  const cargarMedicionesAgua = async () => {
    if (!acuarioSeleccionado?.id) return

    setCargandoAgua(true)

    const { data, error } = await supabase
      .from('parametros_agua')
      .select('*')
      .eq('acuario_id', acuarioSeleccionado.id)
      .order('fecha_medicion', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error al cargar mediciones:', error)
    } else {
      setMedicionesAgua(data ?? [])
    }

    setCargandoAgua(false)
  }

  const actualizarCampoAgua = (e) => {
    const { name, value } = e.target

    setFormAgua((anterior) => ({
      ...anterior,
      [name]: value,
    }))
  }

  const guardarMedicionAgua = async (e) => {
    e.preventDefault()

    if (!acuarioSeleccionado?.id) return

    const hayDato = [
      formAgua.temperatura_c,
      formAgua.ph,
      formAgua.amonio_nh3,
      formAgua.nitrito_no2,
      formAgua.nitrato_no3,
      formAgua.gh,
      formAgua.kh,
      formAgua.tds,
    ].some((valor) => valor !== '')

    if (!hayDato) {
      setMensaje('Ingresa al menos un parámetro del agua.')
      return
    }

    setGuardandoAgua(true)
    setMensaje('')

    const { error } = await supabase
      .from('parametros_agua')
      .insert([
        {
          acuario_id: acuarioSeleccionado.id,
          fecha_medicion: new Date().toISOString(),
          temperatura_c: numeroONull(formAgua.temperatura_c),
          ph: numeroONull(formAgua.ph),
          amonio_nh3: numeroONull(formAgua.amonio_nh3),
          nitrito_no2: numeroONull(formAgua.nitrito_no2),
          nitrato_no3: numeroONull(formAgua.nitrato_no3),
          gh: numeroONull(formAgua.gh),
          kh: numeroONull(formAgua.kh),
          tds: numeroONull(formAgua.tds),
          observaciones: formAgua.observaciones.trim() || null,
        },
      ])

    if (error) {
      setMensaje(`Error: ${error.message}`)
      setGuardandoAgua(false)
      return
    }

    if (tareaAguaEnRegistro?.id) {
      await supabase
        .from('tareas_acuario')
        .update({
          estado: 'completada',
          completada_en: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', tareaAguaEnRegistro.id)
    }

    setMostrarModalAgua(false)
    setTareaAguaEnRegistro(null)

    await Promise.all([
      cargarMedicionesAgua(),
      cargarTareas(),
      cargarHistorialGeneral(),
    ])

    setMensaje('✅ Medición del agua registrada.')
    setGuardandoAgua(false)
  }

  const obtenerEstadoParametro = (campo, valor) => {
    if (valor === null || valor === undefined || valor === '') {
      return { clase: 'sin-dato', texto: 'Sin dato' }
    }

    const numero = Number(valor)

    // Alertas básicas de seguridad para compuestos que idealmente deben estar en 0.
    if (campo === 'amonio_nh3') {
      return numero > 0
        ? { clase: 'alerta', texto: 'Revisar' }
        : { clase: 'correcto', texto: 'Correcto' }
    }

    if (campo === 'nitrito_no2') {
      return numero > 0
        ? { clase: 'alerta', texto: 'Revisar' }
        : { clase: 'correcto', texto: 'Correcto' }
    }

    return { clase: 'registrado', texto: 'Registrado' }
  }

  const ultimaMedicion = medicionesAgua[0] ?? null

  const renderAgua = () => {
    const parametros = [
      { campo: 'temperatura_c', nombre: 'Temperatura', unidad: '°C', valor: ultimaMedicion?.temperatura_c },
      { campo: 'ph', nombre: 'pH', unidad: '', valor: ultimaMedicion?.ph },
      { campo: 'amonio_nh3', nombre: 'NH3/NH4', unidad: 'mg/L', valor: ultimaMedicion?.amonio_nh3 },
      { campo: 'nitrito_no2', nombre: 'NO2', unidad: 'mg/L', valor: ultimaMedicion?.nitrito_no2 },
      { campo: 'nitrato_no3', nombre: 'NO3', unidad: 'mg/L', valor: ultimaMedicion?.nitrato_no3 },
      { campo: 'gh', nombre: 'GH', unidad: '°dGH', valor: ultimaMedicion?.gh },
      { campo: 'kh', nombre: 'KH', unidad: '°dKH', valor: ultimaMedicion?.kh },
      { campo: 'tds', nombre: 'TDS', unidad: 'ppm', valor: ultimaMedicion?.tds },
    ]

    return (
      <div className="modulo-agua">
        <div className="cabecera-modulo">
          <div>
            <h2>Agua</h2>
            <p>Mediciones y evolución de los parámetros.</p>
          </div>

          <button
            className="boton-principal"
            onClick={() => abrirRegistroAgua()}
          >
            + Medición
          </button>
        </div>

        {ultimaMedicion ? (
          <>
            <div className="agua-ultima-cabecera">
              <div>
                <span>Última medición</span>
                <strong>{formatearFecha(ultimaMedicion.fecha_medicion)}</strong>
              </div>
              <span className="agua-hora">
                {new Date(ultimaMedicion.fecha_medicion).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div className="grid-parametros-agua">
              {parametros.map((parametro) => {
                const estado = obtenerEstadoParametro(
                  parametro.campo,
                  parametro.valor
                )

                return (
                  <div className="tarjeta-parametro" key={parametro.campo}>
                    <span>{parametro.nombre}</span>

                    <strong>
                      {parametro.valor ?? '—'}
                      {parametro.valor !== null &&
                      parametro.valor !== undefined &&
                      parametro.valor !== ''
                        ? ` ${parametro.unidad}`
                        : ''}
                    </strong>

                    <small className={`estado-parametro ${estado.clase}`}>
                      {estado.texto}
                    </small>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="panel-vacio">
            <div className="icono-vacio">💧</div>
            <h3>Aún no hay mediciones</h3>
            <p>Registra los parámetros que tengas disponibles.</p>
            <button
              className="boton-principal"
              onClick={() => abrirRegistroAgua()}
            >
              Registrar primera medición
            </button>
          </div>
        )}

        <div className="seccion-listado">
          <div className="titulo-listado">
            <h3>Historial de mediciones</h3>
            <span>{medicionesAgua.length} registros</span>
          </div>

          {cargandoAgua ? (
            <div className="sin-datos-panel">Cargando...</div>
          ) : medicionesAgua.length === 0 ? (
            <div className="sin-datos-panel">Sin registros.</div>
          ) : (
            <div className="lista-mediciones">
              {medicionesAgua.map((medicion) => (
                <article className="item-medicion" key={medicion.id}>
                  <div className="item-medicion-fecha">
                    <strong>{formatearFecha(medicion.fecha_medicion)}</strong>
                    <span>
                      {new Date(medicion.fecha_medicion).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="item-medicion-valores">
                    {medicion.temperatura_c !== null && (
                      <span>🌡 {medicion.temperatura_c} °C</span>
                    )}
                    {medicion.ph !== null && <span>pH {medicion.ph}</span>}
                    {medicion.amonio_nh3 !== null && (
                      <span>NH3 {medicion.amonio_nh3}</span>
                    )}
                    {medicion.nitrito_no2 !== null && (
                      <span>NO2 {medicion.nitrito_no2}</span>
                    )}
                    {medicion.nitrato_no3 !== null && (
                      <span>NO3 {medicion.nitrato_no3}</span>
                    )}
                    {medicion.gh !== null && <span>GH {medicion.gh}</span>}
                    {medicion.kh !== null && <span>KH {medicion.kh}</span>}
                    {medicion.tds !== null && <span>TDS {medicion.tds}</span>}
                  </div>

                  {medicion.observaciones && (
                    <p>{medicion.observaciones}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* =========================================================
     MANTENIMIENTO
  ========================================================= */

  const cargarMantenimientos = async () => {
    if (!acuarioSeleccionado?.id) return

    setCargandoMantenimiento(true)

    const { data, error } = await supabase
      .from('mantenimientos')
      .select('*')
      .eq('acuario_id', acuarioSeleccionado.id)
      .order('fecha', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error al cargar mantenimientos:', error)
    } else {
      setMantenimientos(data ?? [])
    }

    setCargandoMantenimiento(false)
  }

  const abrirMantenimiento = (tipo = 'Cambio de agua', tarea = null) => {
    setTareaMantenimientoEnRegistro(tarea)

    setFormMantenimiento({
      tipo,
      porcentaje_cambio_agua: '',
      litros_cambiados: '',
      limpieza_filtro: false,
      limpieza_vidrios: false,
      sifonado: false,
      poda_plantas: false,
      observaciones: '',
    })

    setMostrarModalMantenimiento(true)
    setMostrarRegistroRapido(false)
  }

  const actualizarMantenimiento = (e) => {
    const { name, value, type, checked } = e.target

    if (name === 'porcentaje_cambio_agua') {
      const porcentaje = Number(value)
      const volumen = Number(acuarioSeleccionado?.volumen_litros) || 0

      setFormMantenimiento((anterior) => ({
        ...anterior,
        porcentaje_cambio_agua: value,
        litros_cambiados:
          porcentaje > 0 && volumen > 0
            ? ((volumen * porcentaje) / 100).toFixed(2)
            : '',
      }))

      return
    }

    if (name === 'litros_cambiados') {
      const litros = Number(value)
      const volumen = Number(acuarioSeleccionado?.volumen_litros) || 0

      setFormMantenimiento((anterior) => ({
        ...anterior,
        litros_cambiados: value,
        porcentaje_cambio_agua:
          litros > 0 && volumen > 0
            ? ((litros / volumen) * 100).toFixed(1)
            : '',
      }))

      return
    }

    setFormMantenimiento((anterior) => ({
      ...anterior,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const guardarMantenimiento = async (e) => {
    e.preventDefault()

    if (!acuarioSeleccionado?.id) return

    setGuardandoMantenimiento(true)
    setMensaje('')

    const { error } = await supabase
      .from('mantenimientos')
      .insert([
        {
          acuario_id: acuarioSeleccionado.id,
          fecha: new Date().toISOString(),
          tipo: formMantenimiento.tipo,
          porcentaje_cambio_agua: numeroONull(
            formMantenimiento.porcentaje_cambio_agua
          ),
          litros_cambiados: numeroONull(formMantenimiento.litros_cambiados),
          limpieza_filtro: formMantenimiento.limpieza_filtro,
          limpieza_vidrios: formMantenimiento.limpieza_vidrios,
          sifonado: formMantenimiento.sifonado,
          poda_plantas: formMantenimiento.poda_plantas,
          observaciones: formMantenimiento.observaciones.trim() || null,
        },
      ])

    if (error) {
      setMensaje(`Error: ${error.message}`)
      setGuardandoMantenimiento(false)
      return
    }

    if (tareaMantenimientoEnRegistro?.id) {
      await supabase
        .from('tareas_acuario')
        .update({
          estado: 'completada',
          completada_en: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', tareaMantenimientoEnRegistro.id)
    }

    setMostrarModalMantenimiento(false)
    setTareaMantenimientoEnRegistro(null)

    await Promise.all([
      cargarMantenimientos(),
      cargarTareas(),
      cargarHistorialGeneral(),
    ])

    setMensaje('✅ Mantenimiento registrado.')
    setGuardandoMantenimiento(false)
  }

  const productosParaAguaNueva = productos
    .map((producto) => {
      const asignacion = obtenerAsignacionProducto(producto.id)
      const regla = obtenerReglaPrincipal(producto)

      if (
        !asignacion ||
        asignacion.estado !== 'activo' ||
        !regla ||
        regla.aplicar_sobre !== 'agua_nueva'
      ) {
        return null
      }

      const litros = Number(formMantenimiento.litros_cambiados) || 0
      const cantidad = Number(regla.dosis_cantidad)
      const referencia = Number(regla.volumen_referencia_litros)

      const dosis =
        litros > 0 && cantidad > 0 && referencia > 0
          ? (cantidad / referencia) * litros
          : 0

      return {
        producto,
        regla,
        dosis,
        litros,
      }
    })
    .filter(Boolean)

  const renderMantenimiento = () => {
    return (
      <div className="modulo-mantenimiento">
        <div className="cabecera-modulo">
          <div>
            <h2>Mantenimiento</h2>
            <p>Cambios de agua, filtro, sifonado y limpieza.</p>
          </div>

          <button
            className="boton-principal"
            onClick={() => abrirMantenimiento()}
          >
            + Registrar
          </button>
        </div>

        <div className="mantenimiento-acciones">
          <button onClick={() => abrirMantenimiento('Cambio de agua')}>
            <span>🔄</span>
            <strong>Cambio de agua</strong>
          </button>

          <button onClick={() => abrirMantenimiento('Mantenimiento general')}>
            <span>🧽</span>
            <strong>Mantenimiento</strong>
          </button>
        </div>

        <div className="seccion-listado">
          <div className="titulo-listado">
            <h3>Últimos mantenimientos</h3>
            <span>{mantenimientos.length} registros</span>
          </div>

          {cargandoMantenimiento ? (
            <div className="sin-datos-panel">Cargando...</div>
          ) : mantenimientos.length === 0 ? (
            <div className="sin-datos-panel">
              No existen mantenimientos registrados.
            </div>
          ) : (
            <div className="lista-mantenimientos">
              {mantenimientos.map((item) => (
                <article className="item-mantenimiento" key={item.id}>
                  <div className="historial-icono">🧽</div>

                  <div>
                    <span>{formatearFecha(item.fecha)}</span>
                    <strong>{item.tipo}</strong>

                    {item.litros_cambiados !== null && (
                      <p>
                        Cambio de agua: {item.litros_cambiados} L
                        {item.porcentaje_cambio_agua !== null
                          ? ` · ${item.porcentaje_cambio_agua}%`
                          : ''}
                      </p>
                    )}

                    <div className="chips-mantenimiento">
                      {item.limpieza_filtro && <span>Filtro</span>}
                      {item.limpieza_vidrios && <span>Vidrios</span>}
                      {item.sifonado && <span>Sifonado</span>}
                      {item.poda_plantas && <span>Poda</span>}
                    </div>

                    {item.observaciones && <p>{item.observaciones}</p>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* =========================================================
     HISTORIAL GENERAL
  ========================================================= */

  const cargarHistorialGeneral = async () => {
    if (!acuarioSeleccionado?.id) return

    setCargandoHistorial(true)

    const [aguaResp, mantenimientoResp, dosisResp] = await Promise.all([
      supabase
        .from('parametros_agua')
        .select('*')
        .eq('acuario_id', acuarioSeleccionado.id)
        .order('fecha_medicion', { ascending: false })
        .limit(100),

      supabase
        .from('mantenimientos')
        .select('*')
        .eq('acuario_id', acuarioSeleccionado.id)
        .order('fecha', { ascending: false })
        .limit(100),

      supabase
        .from('dosis_aplicadas')
        .select('*')
        .eq('acuario_id', acuarioSeleccionado.id)
        .order('fecha_aplicacion', { ascending: false })
        .limit(100),
    ])

    const nombresProductos = new Map(
      productos.map((producto) => [producto.id, producto.nombre])
    )

    const combinado = [
      ...(aguaResp.data ?? []).map((item) => ({
        id: `agua-${item.id}`,
        fecha: item.fecha_medicion,
        tipo: 'agua',
        icono: '💧',
        titulo: 'Medición de agua',
        detalle: [
          item.temperatura_c !== null ? `${item.temperatura_c} °C` : null,
          item.ph !== null ? `pH ${item.ph}` : null,
          item.amonio_nh3 !== null ? `NH3 ${item.amonio_nh3}` : null,
          item.nitrito_no2 !== null ? `NO2 ${item.nitrito_no2}` : null,
          item.nitrato_no3 !== null ? `NO3 ${item.nitrato_no3}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
        observaciones: item.observaciones,
      })),

      ...(mantenimientoResp.data ?? []).map((item) => ({
        id: `mantenimiento-${item.id}`,
        fecha: item.fecha,
        tipo: 'mantenimiento',
        icono: '🧽',
        titulo: item.tipo || 'Mantenimiento',
        detalle:
          item.litros_cambiados !== null
            ? `${item.litros_cambiados} L${
                item.porcentaje_cambio_agua !== null
                  ? ` · ${item.porcentaje_cambio_agua}%`
                  : ''
              }`
            : 'Mantenimiento registrado',
        observaciones: item.observaciones,
      })),

      ...(dosisResp.data ?? []).map((item) => ({
        id: `dosis-${item.id}`,
        fecha: item.fecha_aplicacion,
        tipo: 'producto',
        icono: '🧪',
        titulo: nombresProductos.get(item.producto_id) || 'Producto aplicado',
        detalle: `${item.dosis_aplicada ?? item.dosis_calculada ?? '—'} ${
          item.unidad || 'ml'
        }${
          item.volumen_calculado_litros
            ? ` · ${item.volumen_calculado_litros} L tratados`
            : ''
        }`,
        observaciones: item.observaciones,
      })),
    ]

    combinado.sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )

    setHistorialGeneral(combinado)
    setCargandoHistorial(false)
  }

  const renderHistorial = () => {
    return (
      <div className="modulo-historial">
        <div className="cabecera-modulo">
          <div>
            <h2>Historial</h2>
            <p>Todo lo realizado en este acuario.</p>
          </div>
        </div>

        {cargandoHistorial ? (
          <div className="sin-datos-panel">Cargando...</div>
        ) : historialGeneral.length === 0 ? (
          <div className="panel-vacio">
            <div className="icono-vacio">🕘</div>
            <h3>Aún no existe historial</h3>
            <p>
              Las mediciones, mantenimientos y productos aplicados aparecerán
              aquí.
            </p>
          </div>
        ) : (
          <div className="timeline-historial">
            {historialGeneral.map((item) => (
              <article className="timeline-item" key={item.id}>
                <div className="timeline-icono">{item.icono}</div>

                <div className="timeline-contenido">
                  <div className="timeline-fecha">
                    {formatearFecha(item.fecha)} ·{' '}
                    {new Date(item.fecha).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>

                  <strong>{item.titulo}</strong>

                  {item.detalle && <p>{item.detalle}</p>}
                  {item.observaciones && (
                    <small>{item.observaciones}</small>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* =========================================================
     REGISTRO RÁPIDO
  ========================================================= */

  const abrirRegistroRapido = () => {
    setMostrarRegistroRapido(true)
  }

  /* =========================================================
     ICONOS
  ========================================================= */

  const iconoTipoTarea = (tipo) => {
    const iconos = {
      producto: '🧪',
      medicion_agua: '💧',
      cambio_agua: '🔄',
      alimentacion: '🍽️',
      mantenimiento: '🧽',
      nota: '📝',
      otro: '📌',
    }

    return iconos[tipo] || '📌'
  }

  /* =========================================================
     PRODUCTOS
  ========================================================= */

  const renderProductos = () => {
    return (
      <div>
        <div className="cabecera-modulo">
          <div>
            <h2>Productos</h2>

            <p>
              Productos, dosis y tratamientos.
            </p>
          </div>

          <button
            className="boton-principal"
            onClick={
              abrirModalProducto
            }
          >
            + Producto
          </button>
        </div>

        {cargandoProductos ? (
          <div className="panel-vacio">
            Cargando...
          </div>
        ) : productos.length === 0 ? (
          <div className="panel-vacio">
            <div className="icono-vacio">
              🧪
            </div>

            <h3>
              No tienes productos
            </h3>

            <button
              className="boton-principal"
              onClick={
                abrirModalProducto
              }
            >
              Agregar producto
            </button>
          </div>
        ) : (
          <div className="lista-productos">
            {productos.map(
              (producto) => {
                const regla =
                  obtenerReglaPrincipal(
                    producto
                  )

                const asignacion =
                  obtenerAsignacionProducto(
                    producto.id
                  )

                return (
                  <article
                    className="tarjeta-producto"
                    key={producto.id}
                  >
                    <div className="producto-superior">
                      <div className="producto-icono">
                        🧪
                      </div>

                      <div className="producto-titulo">
                        <h3>
                          {producto.nombre}
                        </h3>

                        <p>
                          {producto.marca ||
                            'Sin marca'}
                        </p>
                      </div>

                      {asignacion && (
                        <span
                          className={`badge-producto ${asignacion.estado}`}
                        >
                          {
                            asignacion.estado
                          }
                        </span>
                      )}
                    </div>

                    <div className="producto-info">
                      <div>
                        <span>
                          Categoría
                        </span>

                        <strong>
                          {producto.categoria ||
                            '—'}
                        </strong>
                      </div>

                      <div>
                        <span>Dosis</span>

                        <strong>
                          {regla
                            ? `${regla.dosis_cantidad} ${regla.dosis_unidad} / ${regla.volumen_referencia_litros} L`
                            : '—'}
                        </strong>
                      </div>
                    </div>

                    <div className="acciones-producto">
                      {!productoEstaAsignado(
                        producto.id
                      ) ? (
                        <button
                          className="boton-claro"
                          onClick={() =>
                            usarProductoEnAcuario(
                              producto
                            )
                          }
                        >
                          Usar en este acuario
                        </button>
                      ) : (
                        <>
                          <button
                            className="boton-dosis"
                            onClick={() =>
                              abrirCalculadora(
                                producto
                              )
                            }
                          >
                            Calcular / aplicar
                          </button>

                          {asignacion.estado ===
                            'activo' && (
                            <button
                              className="boton-claro"
                              onClick={() =>
                                cambiarEstadoProducto(
                                  asignacion,
                                  'pausado'
                                )
                              }
                            >
                              Pausar
                            </button>
                          )}

                          {asignacion.estado ===
                            'pausado' && (
                            <button
                              className="boton-claro"
                              onClick={() =>
                                cambiarEstadoProducto(
                                  asignacion,
                                  'activo'
                                )
                              }
                            >
                              Reactivar
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                )
              }
            )}
          </div>
        )}
      </div>
    )
  }

  /* =========================================================
     INICIO
  ========================================================= */

  const renderTarea = (tarea, vencida = false) => {
    const completada =
      tarea.estado === 'completada'

    return (
      <div
        className={`tarea-hoy ${
          vencida
            ? 'tarea-vencida'
            : ''
        } ${
          completada
            ? 'tarea-completada'
            : ''
        }`}
        key={tarea.id}
      >
        <div className="tarea-icono">
          {completada
            ? '✅'
            : iconoTipoTarea(
                tarea.tipo
              )}
        </div>

        <div className="tarea-info">
          <span>
            {vencida
              ? 'VENCIDO'
              : completada
              ? 'COMPLETADO'
              : `DÍA ${
                  tarea.dia_ciclado ||
                  diasCiclado
                }`}
          </span>

          <strong>
            {tarea.titulo}
          </strong>

          {tarea.dosis_calculada && (
            <small>
              {Number(
                tarea.dosis_calculada
              ).toFixed(2)}{' '}
              {tarea.unidad}
              {tarea.volumen_litros
                ? ` · ${tarea.volumen_litros} L`
                : ''}
            </small>
          )}

          {tarea.descripcion && (
            <small>
              {tarea.descripcion}
            </small>
          )}
        </div>

        {!completada && (
          <button
            className="boton-tarea"
            onClick={() =>
              accionTarea(tarea)
            }
          >
            {tarea.tipo === 'producto'
              ? 'Aplicar'
              : tarea.tipo ===
                'medicion_agua'
              ? 'Registrar'
              : 'Hecho'}
          </button>
        )}
      </div>
    )
  }

  const renderResumen = () => {
    const productosActivos =
      productosAcuario.filter(
        (item) =>
          item.estado === 'activo'
      ).length

    return (
      <div>
        {cicladoActivo ? (
          <div className="banner-ciclado activo">
            <div className="banner-ciclado-icono">
              🟡
            </div>

            <div className="banner-ciclado-info">
              <span>
                CICLADO ACTIVO
              </span>

              <strong>
                Día {diasCiclado}
              </strong>

              <small>
                Desde{' '}
                {formatearFecha(
                  cicloActual.fecha_inicio
                )}
              </small>
            </div>

            <button
              onClick={
                abrirPlanCiclado
              }
            >
              Plan
            </button>
          </div>
        ) : cicloActual?.estado ===
          'finalizado' ? (
          <div className="banner-ciclado finalizado">
            <div className="banner-ciclado-icono">
              ✅
            </div>

            <div className="banner-ciclado-info">
              <span>
                CICLADO FINALIZADO
              </span>

              <strong>
                {diasCiclado} días
              </strong>

              <small>
                {formatearFecha(
                  cicloActual.fecha_inicio
                )}{' '}
                →{' '}
                {formatearFecha(
                  cicloActual.fecha_fin
                )}
              </small>
            </div>
          </div>
        ) : (
          <button
            className="activar-ciclado-card"
            onClick={
              abrirConfiguracionCiclado
            }
          >
            <div>🔄</div>

            <span>
              Configurar ciclado
            </span>

            <strong>
              Abrir
            </strong>
          </button>
        )}

        {cicladoActivo && (
          <div className="acciones-ciclado-rapidas">
            <button
              onClick={
                abrirPlanCiclado
              }
            >
              📋 Plan de ciclado
            </button>

            <button
              onClick={
                abrirConfiguracionCiclado
              }
            >
              ⚙ Configurar
            </button>
          </div>
        )}

        <ResumenInteligente acuario={acuarioSeleccionado} />

        <section className="seccion-hoy">
          <div className="titulo-hoy">
            <div>
              <h2>Para hoy</h2>

              <p>
                Lo que debes realizar en este acuario.
              </p>
            </div>

            {tareasHoy.length > 0 && (
              <span>
                {tareasHoy.filter(
                  (t) =>
                    t.estado === 'pendiente'
                ).length}{' '}
                pendientes
              </span>
            )}
          </div>

          {cargandoTareas ? (
            <div className="sin-datos-panel">
              Cargando...
            </div>
          ) : tareasHoy.length === 0 ? (
            <div className="sin-datos-panel">
              No tienes actividades programadas para hoy.
            </div>
          ) : (
            <div className="lista-tareas-hoy">
              {tareasHoy.map(
                (tarea) =>
                  renderTarea(tarea)
              )}
            </div>
          )}
        </section>

        {tareasVencidas.length > 0 && (
          <section className="seccion-vencidas">
            <div className="titulo-vencidas">
              ⚠️ Pendientes anteriores
            </div>

            <div className="lista-tareas-hoy">
              {tareasVencidas.map(
                (tarea) =>
                  renderTarea(
                    tarea,
                    true
                  )
              )}
            </div>
          </section>
        )}

        <div className="grid-resumen">
          <button
            className="tarjeta-resumen"
            onClick={() =>
              setSeccionActiva('agua')
            }
          >
            <span className="resumen-icono">
              💧
            </span>

            <div>
              <span className="resumen-label">
                Agua
              </span>

              <strong>
                Sin medición
              </strong>
            </div>
          </button>

          <div className="tarjeta-resumen">
            <span className="resumen-icono">
              🌡️
            </span>

            <div>
              <span className="resumen-label">
                Temperatura
              </span>

              <strong>
                {acuarioSeleccionado
                  .temperatura_objetivo
                  ? `${acuarioSeleccionado.temperatura_objetivo} °C`
                  : '—'}
              </strong>
            </div>
          </div>

          <button
            className="tarjeta-resumen"
            onClick={() =>
              setSeccionActiva(
                'productos'
              )
            }
          >
            <span className="resumen-icono">
              🧪
            </span>

            <div>
              <span className="resumen-label">
                Productos
              </span>

              <strong>
                {productosActivos} activos
              </strong>
            </div>
          </button>

          <button
            className="tarjeta-resumen"
            onClick={() =>
              setSeccionActiva(
                'mantenimiento'
              )
            }
          >
            <span className="resumen-icono">
              🧽
            </span>

            <div>
              <span className="resumen-label">
                Mantenimiento
              </span>

              <strong>
                Ver
              </strong>
            </div>
          </button>
        </div>
      </div>
    )
  }

  /* =========================================================
     SECCIONES
  ========================================================= */

  const seccionesPrincipales = [
    { id: 'resumen', nombre: 'Inicio', icono: '🏠' },
    { id: 'agua', nombre: 'Agua', icono: '💧' },
    { id: 'habitantes', nombre: 'Habitantes', icono: '🐟' },
    { id: 'mantenimiento', nombre: 'Mantenimiento', icono: '🧽' },
    { id: 'calendario', nombre: 'Calendario', icono: '📅' },
    { id: 'historial', nombre: 'Historial', icono: '🕘' },
  ]

  const seccionesMas = [
    {
      grupo: 'Vida del acuario',
      items: [
        { id: 'plantas', nombre: 'Plantas', icono: '🌿' },
        { id: 'salud', nombre: 'Salud', icono: '🩺' },
        { id: 'alimentacion', nombre: 'Alimentación', icono: '🍽️' },
        { id: 'notas', nombre: 'Notas', icono: '📝' },
        { id: 'fotos', nombre: 'Fotos', icono: '📷' },
      ],
    },
    {
      grupo: 'Productos y automatización',
      items: [
        { id: 'productos', nombre: 'Productos', icono: '🧪' },
        { id: 'rutinas', nombre: 'Rutinas', icono: '🔁' },
        { id: 'inventario', nombre: 'Inventario', icono: '📦' },
        { id: 'equipos', nombre: 'Equipos', icono: '⚙️' },
        { id: 'iluminacion', nombre: 'Iluminación', icono: '💡' },
      ],
    },
    {
      grupo: 'Herramientas',
      items: [
        { id: 'costos', nombre: 'Costos', icono: '💵' },
        { id: 'comparar', nombre: 'Comparar', icono: '⚖️' },
        { id: 'informes', nombre: 'Informe / QR', icono: '📄' },
      ],
    },
    {
      grupo: 'Configuración',
      items: [
        { id: 'configuracion', nombre: 'Acuario', icono: '🛠️' },
        { id: 'ajustes', nombre: 'Datos / Respaldo', icono: '💾' },
      ],
    },
  ]

  const secciones = [
    ...seccionesPrincipales,
    ...seccionesMas.flatMap((grupo) => grupo.items),
  ]

  const renderContenidoEscritorio = () => {
    if (
      seccionActiva === 'resumen'
    ) {
      return renderResumen()
    }

    if (
      seccionActiva === 'productos'
    ) {
      return renderProductos()
    }

    if (
      seccionActiva === 'agua'
    ) {
      return renderAgua()
    }

    if (
      seccionActiva === 'mantenimiento'
    ) {
      return renderMantenimiento()
    }

    if (
      seccionActiva === 'historial'
    ) {
      return renderHistorial()
    }

    if (
      ['salud', 'rutinas', 'calendario', 'inventario', 'costos', 'comparar', 'informes', 'configuracion']
        .includes(seccionActiva)
    ) {
      return (
        <GestionAvanzada
          seccion={seccionActiva}
          acuario={acuarioSeleccionado}
          session={session}
          onMensaje={setMensaje}
          onAcuarioActualizado={actualizarAcuarioLocal}
          modoOscuro={modoOscuro}
          onCambiarModo={cambiarModoOscuro}
        />
      )
    }

    if (
      ['habitantes', 'plantas', 'alimentacion', 'equipos', 'iluminacion', 'notas', 'fotos', 'ajustes']
        .includes(seccionActiva)
    ) {
      return (
        <ModulosExtras
          seccion={seccionActiva}
          acuario={acuarioSeleccionado}
          session={session}
          onMensaje={setMensaje}
          onHistorialCambiado={cargarHistorialGeneral}
        />
      )
    }

    const seccion = secciones.find(
      (item) =>
        item.id === seccionActiva
    )

    return (
      <div className="modulo-placeholder">
        <div className="modulo-icono-grande">
          {seccion?.icono}
        </div>

        <h2>{seccion?.nombre}</h2>

        <p>
          Este módulo será desarrollado en el siguiente bloque.
        </p>
      </div>
    )
  }

  const idsPosiblesDuplicados = useMemo(() => {
    const grupos = new Map()

    acuarios.forEach((acuario) => {
      const nombre = acuario.nombre?.trim().toLowerCase() || ''
      const volumen = String(acuario.volumen_litros ?? '')
      const tipo = acuario.tipo?.trim().toLowerCase() || ''
      const clave = `${nombre}|${volumen}|${tipo}`

      if (!grupos.has(clave)) {
        grupos.set(clave, [])
      }

      grupos.get(clave).push(acuario.id)
    })

    return new Set(
      [...grupos.values()]
        .filter((ids) => ids.length > 1)
        .flat()
    )
  }, [acuarios])

  /* =========================================================
     CARGANDO
  ========================================================= */

  if (cargando) {
    return (
      <div className="pantalla-carga">
        <h2>NexoWeb</h2>
        <p>Cargando...</p>
      </div>
    )
  }

  /* =========================================================
     LOGIN
  ========================================================= */

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="logo">
            🐠
          </div>

          <h1>NexoWeb</h1>

          <p className="subtitulo">
            Control y cuidado de tus acuarios.
          </p>

          <form
            onSubmit={
              iniciarSesion
            }
          >
            <label>
              Correo electrónico
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(
                  e.target.value
                )
              }
              disabled={iniciandoSesion}
              required
            />

            <label>
              Contraseña
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(
                  e.target.value
                )
              }
              disabled={iniciandoSesion}
              required
            />

            <button
              className="boton-principal boton-login"
              disabled={iniciandoSesion}
            >
              {iniciandoSesion ? (
                <>
                  <span className="spinner-mini" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          <button
            className="boton-secundario"
            onClick={crearCuenta}
            disabled={iniciandoSesion}
          >
            Crear cuenta
          </button>

          <div className="version-login">
            NexoWeb · v{NEXOWEB_VERSION}
          </div>

          {mensaje && (
            <div className="mensaje">
              {mensaje}
            </div>
          )}
        </div>
      </div>
    )
  }

  /* =========================================================
     ESCRITORIO DEL ACUARIO
  ========================================================= */

  if (acuarioSeleccionado) {
    return (
      <div className={`app ${modoOscuro ? "modo-oscuro" : ""}`}>
        <header className="topbar desktop-topbar">
          <div>
            <h1>NexoWeb</h1>
            <p>
              Gestión del acuario
            </p>
          </div>

          <button
            onClick={cerrarSesion}
          >
            Cerrar sesión
          </button>
        </header>

        <header className="movil-header-acuario">
          <button
            onClick={
              volverMisAcuarios
            }
          >
            ←
          </button>

          <div>
            <strong>
              {
                acuarioSeleccionado.nombre
              }
            </strong>

            <span>
              {acuarioSeleccionado
                .volumen_litros
                ? `${acuarioSeleccionado.volumen_litros} L`
                : ''}
            </span>
          </div>

          <button
            onClick={() =>
              setSeccionActiva('configuracion')
            }
          >
            ⚙
          </button>
        </header>

        <div className="escritorio-layout">
          <aside className="sidebar-acuario">
            <button
              className="volver-acuarios"
              onClick={
                volverMisAcuarios
              }
            >
              ← Mis acuarios
            </button>

            <div className="acuario-sidebar-info">
              <div className="acuario-sidebar-icono">
                🐠
              </div>

              <div>
                <h2>
                  {
                    acuarioSeleccionado.nombre
                  }
                </h2>

                <p>
                  {acuarioSeleccionado
                    .volumen_litros
                    ? `${acuarioSeleccionado.volumen_litros} L`
                    : ''}
                </p>
              </div>
            </div>

            <nav className="menu-acuario">
              {seccionesPrincipales.map(
                (seccion) => (
                  <button
                    key={seccion.id}
                    className={
                      seccionActiva === seccion.id
                        ? 'menu-acuario-item activo'
                        : 'menu-acuario-item'
                    }
                    onClick={() => {
                      setSeccionActiva(seccion.id)
                    }}
                  >
                    <span>{seccion.icono}</span>
                    {seccion.nombre}
                  </button>
                )
              )}

              <div className="menu-mas-separador" />

              <button
                className={`menu-acuario-item menu-mas-boton ${
                  seccionesMas
                    .flatMap((grupo) => grupo.items)
                    .some((item) => item.id === seccionActiva)
                    ? 'activo-secundario'
                    : ''
                }`}
                onClick={() =>
                  setMenuMasAbierto((abierto) => !abierto)
                }
              >
                <span>•••</span>
                <strong>Más</strong>
                <span className="menu-mas-flecha">
                  {menuMasAbierto ? '⌃' : '⌄'}
                </span>
              </button>

              {menuMasAbierto && (
                <div className="menu-mas-contenido">
                  {seccionesMas.map((grupo) => (
                    <div
                      className="menu-mas-grupo"
                      key={grupo.grupo}
                    >
                      <div className="menu-mas-titulo">
                        {grupo.grupo}
                      </div>

                      {grupo.items.map((seccion) => (
                        <button
                          key={seccion.id}
                          className={
                            seccionActiva === seccion.id
                              ? 'menu-acuario-item menu-secundario activo'
                              : 'menu-acuario-item menu-secundario'
                          }
                          onClick={() =>
                            setSeccionActiva(seccion.id)
                          }
                        >
                          <span>{seccion.icono}</span>
                          {seccion.nombre}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </nav>
          </aside>

          <main className="contenido-escritorio">
            <div className="cabecera-escritorio">
              <div>
                <span className="cabecera-etiqueta">
                  {acuarioSeleccionado.tipo ||
                    'Acuario'}
                </span>

                <h1>
                  {
                    acuarioSeleccionado.nombre
                  }
                </h1>

                <p>
                  {acuarioSeleccionado
                    .volumen_litros
                    ? `${acuarioSeleccionado.volumen_litros} L`
                    : ''}

                  {cicladoActivo
                    ? ` · Ciclado día ${diasCiclado}`
                    : ''}
                </p>
              </div>

              <button
                className="boton-configurar"
                onClick={() =>
                  setSeccionActiva('configuracion')
                }
              >
                ⚙ Configurar
              </button>
            </div>

            {mensaje && (
              <div className="mensaje">
                {mensaje}
              </div>
            )}

            {renderContenidoEscritorio()}
          </main>
        </div>

        <nav className="bottom-nav">
          <button
            className={
              seccionActiva === 'resumen'
                ? 'activo'
                : ''
            }
            onClick={() =>
              setSeccionActiva('resumen')
            }
          >
            <span>🏠</span>
            Inicio
          </button>

          <button
            className={
              seccionActiva === 'agua'
                ? 'activo'
                : ''
            }
            onClick={() =>
              setSeccionActiva('agua')
            }
          >
            <span>💧</span>
            Agua
          </button>

          <button
            className="bottom-agregar"
            onClick={abrirRegistroRapido}
          >
            <span>＋</span>
            Registrar
          </button>

          <button
            className={
              seccionActiva === 'calendario'
                ? 'activo'
                : ''
            }
            onClick={() =>
              setSeccionActiva('calendario')
            }
          >
            <span>📅</span>
            Calendario
          </button>

          <button
            className={
              seccionesMas
                .flatMap((grupo) => grupo.items)
                .some((item) => item.id === seccionActiva)
                ? 'activo'
                : ''
            }
            onClick={() =>
              setMostrarMenuMasMovil(true)
            }
          >
            <span>•••</span>
            Más
          </button>
        </nav>

        {mostrarMenuMasMovil && (
          <div
            className="modal-overlay modal-mas-movil-overlay"
            onClick={() =>
              setMostrarMenuMasMovil(false)
            }
          >
            <div
              className="modal-acuario modal-mas-movil"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-cabecera">
                <div>
                  <h2>Más</h2>
                  <p>
                    Herramientas y configuración del acuario.
                  </p>
                </div>

                <button
                  className="boton-cerrar-modal"
                  onClick={() =>
                    setMostrarMenuMasMovil(false)
                  }
                >
                  ×
                </button>
              </div>

              <div className="menu-mas-movil-lista">
                {!appInstalada && (
                  <button
                    className="instalar-desde-mas"
                    onClick={() => {
                      setMostrarMenuMasMovil(false)
                      instalarNexoWeb()
                    }}
                  >
                    <span>⬇️</span>
                    <div>
                      <strong>Instalar NexoWeb</strong>
                      <small>Agregar a la pantalla de inicio</small>
                    </div>
                  </button>
                )}

                {seccionesMas.map((grupo) => (
                  <section
                    className="menu-mas-movil-grupo"
                    key={grupo.grupo}
                  >
                    <h3>{grupo.grupo}</h3>

                    <div className="menu-mas-movil-grid">
                      {grupo.items.map((seccion) => (
                        <button
                          key={seccion.id}
                          className={
                            seccionActiva === seccion.id
                              ? 'activo'
                              : ''
                          }
                          onClick={() => {
                            setSeccionActiva(seccion.id)
                            setMostrarMenuMasMovil(false)
                          }}
                        >
                          <span>{seccion.icono}</span>
                          <strong>{seccion.nombre}</strong>
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            CICLADO
        ================================================= */}

        {mostrarModalCiclado && (
          <div className="modal-overlay">
            <div className="modal-acuario">
              <div className="modal-cabecera">
                <div>
                  <h2>Ciclado</h2>

                  <p>
                    Configuración general.
                  </p>
                </div>

                <button
                  className="boton-cerrar-modal"
                  onClick={() =>
                    setMostrarModalCiclado(
                      false
                    )
                  }
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={
                  guardarCiclado
                }
              >
                <div className="switch-ciclado-box">
                  <div>
                    <strong>
                      ¿Está en ciclado?
                    </strong>

                    <span>
                      Activa mientras el acuario
                      se encuentre ciclando.
                    </span>
                  </div>

                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={
                        formCiclado.tiene_ciclado
                      }
                      onChange={(e) =>
                        setFormCiclado(
                          (anterior) => ({
                            ...anterior,
                            tiene_ciclado:
                              e.target.checked,
                          })
                        )
                      }
                    />

                    <span className="slider" />
                  </label>
                </div>

                {formCiclado.tiene_ciclado && (
                  <>
                    <div className="campo-formulario">
                      <label>
                        Fecha de inicio
                      </label>

                      <input
                        type="date"
                        value={
                          formCiclado.fecha_inicio
                        }
                        onChange={(e) =>
                          setFormCiclado(
                            (anterior) => ({
                              ...anterior,
                              fecha_inicio:
                                e.target.value,
                            })
                          )
                        }
                        required
                      />
                    </div>

                    <div className="campo-formulario">
                      <label>
                        Fecha de finalización
                      </label>

                      <input
                        type="date"
                        min={
                          formCiclado.fecha_inicio
                        }
                        value={
                          formCiclado.fecha_fin
                        }
                        onChange={(e) =>
                          setFormCiclado(
                            (anterior) => ({
                              ...anterior,
                              fecha_fin:
                                e.target.value,
                            })
                          )
                        }
                      />
                    </div>

                    <div className="preview-ciclado">
                      <span>
                        {formCiclado.fecha_fin
                          ? 'Duración'
                          : 'Día actual'}
                      </span>

                      <strong>
                        {calcularDiasCiclado(
                          formCiclado.fecha_inicio,
                          formCiclado.fecha_fin ||
                            null
                        )}
                        {formCiclado.fecha_fin
                          ? ' días'
                          : ''}
                      </strong>
                    </div>

                    <div className="campo-formulario">
                      <label>
                        Observaciones
                      </label>

                      <textarea
                        rows="3"
                        value={
                          formCiclado.descripcion
                        }
                        onChange={(e) =>
                          setFormCiclado(
                            (anterior) => ({
                              ...anterior,
                              descripcion:
                                e.target.value,
                            })
                          )
                        }
                      />
                    </div>
                  </>
                )}

                {cicladoActivo && (
                  <button
                    type="button"
                    className="boton-plan-ciclado"
                    onClick={() => {
                      setMostrarModalCiclado(
                        false
                      )
                      abrirPlanCiclado()
                    }}
                  >
                    📋 Abrir plan diario de ciclado
                  </button>
                )}

                {cicladoActivo && (
                  <button
                    type="button"
                    className="boton-finalizar-ciclado"
                    onClick={
                      finalizarCicladoHoy
                    }
                  >
                    ✓ Finalizar ciclado hoy
                  </button>
                )}

                <div className="acciones-modal">
                  <button
                    type="button"
                    className="boton-cancelar"
                    onClick={() =>
                      setMostrarModalCiclado(
                        false
                      )
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    className="boton-principal"
                    disabled={
                      guardandoCiclado
                    }
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =================================================
            PLAN CICLADO
        ================================================= */}

        {mostrarModalPlan && (
          <div className="modal-overlay">
            <div className="modal-acuario modal-plan">
              <div className="modal-cabecera">
                <div>
                  <h2>
                    Plan de ciclado
                  </h2>

                  <p>
                    Día actual: {diasCiclado}
                  </p>
                </div>

                <button
                  className="boton-cerrar-modal"
                  onClick={() =>
                    setMostrarModalPlan(
                      false
                    )
                  }
                >
                  ×
                </button>
              </div>

              <button
                className="boton-principal boton-ancho"
                onClick={
                  abrirNuevaActividad
                }
              >
                + Agregar actividad
              </button>

              {planCiclado.length ===
              0 ? (
                <div className="panel-vacio plan-vacio">
                  <div className="icono-vacio">
                    📋
                  </div>

                  <h3>
                    Plan vacío
                  </h3>

                  <p>
                    Agrega los productos,
                    mediciones o actividades
                    que debes realizar durante
                    el ciclado.
                  </p>
                </div>
              ) : (
                <div className="lista-plan">
                  {planCiclado.map(
                    (actividad) => (
                      <div
                        className="actividad-plan"
                        key={
                          actividad.id
                        }
                      >
                        <div className="actividad-dia">
                          Día{' '}
                          {
                            actividad.dia_inicio
                          }
                        </div>

                        <div className="actividad-plan-icono">
                          {iconoTipoTarea(
                            actividad.tipo
                          )}
                        </div>

                        <div className="actividad-plan-info">
                          <strong>
                            {
                              actividad.titulo
                            }
                          </strong>

                          <span>
                            {actividad.tipo_repeticion ===
                            'una_vez'
                              ? 'Una vez'
                              : actividad.tipo_repeticion ===
                                'diario'
                              ? `Diario · ${actividad.duracion_dias} días`
                              : `Cada ${actividad.intervalo_dias} días · durante ${actividad.duracion_dias} días`}
                          </span>
                        </div>

                        <button
                          className="boton-eliminar-mini"
                          onClick={() =>
                            eliminarActividadPlan(
                              actividad
                            )
                          }
                        >
                          ×
                        </button>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =================================================
            NUEVA ACTIVIDAD
        ================================================= */}

        {mostrarModalActividad && (
          <div className="modal-overlay">
            <div className="modal-acuario">
              <div className="modal-cabecera">
                <div>
                  <h2>
                    Nueva actividad
                  </h2>

                  <p>
                    Programa qué hacer durante
                    el ciclado.
                  </p>
                </div>

                <button
                  className="boton-cerrar-modal"
                  onClick={() =>
                    setMostrarModalActividad(
                      false
                    )
                  }
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={
                  guardarActividadPlan
                }
              >
                <div className="campo-formulario">
                  <label>
                    Tipo de actividad
                  </label>

                  <select
                    value={
                      formActividad.tipo
                    }
                    onChange={(e) =>
                      setFormActividad(
                        (anterior) => ({
                          ...anterior,
                          tipo:
                            e.target.value,
                        })
                      )
                    }
                  >
                    <option value="producto">
                      🧪 Producto
                    </option>

                    <option value="medicion_agua">
                      💧 Medir agua
                    </option>

                    <option value="cambio_agua">
                      🔄 Cambio de agua
                    </option>

                    <option value="alimentacion">
                      🍽️ Alimentación
                    </option>

                    <option value="mantenimiento">
                      🧽 Mantenimiento
                    </option>

                    <option value="nota">
                      📝 Recordatorio
                    </option>

                    <option value="otro">
                      📌 Otro
                    </option>
                  </select>
                </div>

                {formActividad.tipo ===
                'producto' ? (
                  <>
                    <div className="campo-formulario">
                      <label>
                        Producto
                      </label>

                      <select
                        value={
                          formActividad.producto_id
                        }
                        onChange={(e) =>
                          setFormActividad(
                            (anterior) => ({
                              ...anterior,
                              producto_id:
                                e.target.value,
                            })
                          )
                        }
                        required
                      >
                        <option value="">
                          Seleccionar
                        </option>

                        {productos.map(
                          (producto) => (
                            <option
                              key={
                                producto.id
                              }
                              value={
                                producto.id
                              }
                            >
                              {
                                producto.nombre
                              }
                              {producto.marca
                                ? ` - ${producto.marca}`
                                : ''}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="campo-formulario">
                      <label>
                        Regla de dosis
                      </label>

                      <select
                        value={
                          formActividad.regla_dosificacion_id
                        }
                        onChange={(e) =>
                          setFormActividad(
                            (anterior) => ({
                              ...anterior,
                              regla_dosificacion_id:
                                e.target.value,
                            })
                          )
                        }
                        required
                      >
                        {reglasProductoPlan.map(
                          (regla) => (
                            <option
                              key={
                                regla.id
                              }
                              value={
                                regla.id
                              }
                            >
                              {
                                regla.nombre
                              }{' '}
                              —{' '}
                              {
                                regla.dosis_cantidad
                              }{' '}
                              {
                                regla.dosis_unidad
                              }{' '}
                              /{' '}
                              {
                                regla.volumen_referencia_litros
                              }{' '}
                              L
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="campo-formulario">
                      <label>
                        Calcular sobre
                      </label>

                      <select
                        value={
                          formActividad.aplicar_sobre
                        }
                        onChange={(e) =>
                          setFormActividad(
                            (anterior) => ({
                              ...anterior,
                              aplicar_sobre:
                                e.target.value,
                            })
                          )
                        }
                      >
                        <option value="volumen_total">
                          Todo el acuario
                        </option>

                        <option value="agua_nueva">
                          Agua nueva
                        </option>

                        <option value="personalizado">
                          Cantidad personalizada
                        </option>
                      </select>
                    </div>

                    {formActividad.aplicar_sobre !==
                      'volumen_total' && (
                      <div className="campo-formulario">
                        <label>
                          Litros a tratar
                        </label>

                        <input
                          type="number"
                          step="0.01"
                          value={
                            formActividad.litros_personalizados
                          }
                          onChange={(e) =>
                            setFormActividad(
                              (anterior) => ({
                                ...anterior,
                                litros_personalizados:
                                  e.target.value,
                              })
                            )
                          }
                          required
                        />
                      </div>
                    )}

                    {formActividad.regla_dosificacion_id && (
                      <div className="preview-dosis-plan">
                        {(() => {
                          const calculo =
                            calcularDosisPlan(
                              formActividad.regla_dosificacion_id,
                              formActividad.aplicar_sobre,
                              formActividad.litros_personalizados
                            )

                          if (!calculo) {
                            return (
                              <>
                                <span>
                                  Dosis
                                </span>

                                <strong>
                                  Indica los litros
                                </strong>
                              </>
                            )
                          }

                          return (
                            <>
                              <span>
                                Dosis por aplicación
                              </span>

                              <strong>
                                {calculo.dosis.toFixed(
                                  2
                                )}{' '}
                                {
                                  calculo.unidad
                                }
                              </strong>

                              <small>
                                Para{' '}
                                {
                                  calculo.litros
                                }{' '}
                                L
                              </small>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="campo-formulario">
                    <label>
                      Nombre de la actividad
                    </label>

                    <input
                      value={
                        formActividad.titulo
                      }
                      placeholder="Ej. Medir NO2 y NO3"
                      onChange={(e) =>
                        setFormActividad(
                          (anterior) => ({
                            ...anterior,
                            titulo:
                              e.target.value,
                          })
                        )
                      }
                    />
                  </div>
                )}

                <div className="separador-form">
                  Programación
                </div>

                <div className="campo-formulario">
                  <label>
                    Comenzar en el día
                  </label>

                  <input
                    type="number"
                    min="1"
                    value={
                      formActividad.dia_inicio
                    }
                    onChange={(e) =>
                      setFormActividad(
                        (anterior) => ({
                          ...anterior,
                          dia_inicio:
                            e.target.value,
                        })
                      )
                    }
                    required
                  />
                </div>

                <div className="campo-formulario">
                  <label>
                    Repetición
                  </label>

                  <select
                    value={
                      formActividad.tipo_repeticion
                    }
                    onChange={(e) =>
                      setFormActividad(
                        (anterior) => ({
                          ...anterior,
                          tipo_repeticion:
                            e.target.value,
                        })
                      )
                    }
                  >
                    <option value="una_vez">
                      Solo ese día
                    </option>

                    <option value="diario">
                      Todos los días
                    </option>

                    <option value="cada_x_dias">
                      Cada X días
                    </option>
                  </select>
                </div>

                {formActividad.tipo_repeticion !==
                  'una_vez' && (
                  <div className="fila-formulario">
                    {formActividad.tipo_repeticion ===
                      'cada_x_dias' && (
                      <div className="campo-formulario">
                        <label>
                          Cada cuántos días
                        </label>

                        <input
                          type="number"
                          min="1"
                          value={
                            formActividad.intervalo_dias
                          }
                          onChange={(e) =>
                            setFormActividad(
                              (anterior) => ({
                                ...anterior,
                                intervalo_dias:
                                  e.target.value,
                              })
                            )
                          }
                        />
                      </div>
                    )}

                    <div className="campo-formulario">
                      <label>
                        Durante cuántos días
                      </label>

                      <input
                        type="number"
                        min="1"
                        value={
                          formActividad.duracion_dias
                        }
                        onChange={(e) =>
                          setFormActividad(
                            (anterior) => ({
                              ...anterior,
                              duracion_dias:
                                e.target.value,
                            })
                          )
                        }
                      />
                    </div>
                  </div>
                )}

                <div className="campo-formulario">
                  <label>
                    Hora del recordatorio
                  </label>

                  <input
                    type="time"
                    value={
                      formActividad.hora_recordatorio
                    }
                    onChange={(e) =>
                      setFormActividad(
                        (anterior) => ({
                          ...anterior,
                          hora_recordatorio:
                            e.target.value,
                        })
                      )
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>
                    Observaciones
                  </label>

                  <textarea
                    rows="3"
                    value={
                      formActividad.descripcion
                    }
                    onChange={(e) =>
                      setFormActividad(
                        (anterior) => ({
                          ...anterior,
                          descripcion:
                            e.target.value,
                        })
                      )
                    }
                  />
                </div>

                <div className="acciones-modal">
                  <button
                    type="button"
                    className="boton-cancelar"
                    onClick={() =>
                      setMostrarModalActividad(
                        false
                      )
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    className="boton-principal"
                    disabled={
                      guardandoActividad
                    }
                  >
                    {guardandoActividad
                      ? 'Guardando...'
                      : 'Agregar al plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =================================================
            PRODUCTO
        ================================================= */}

        {mostrarModalProducto && (
          <div className="modal-overlay">
            <div className="modal-acuario">
              <div className="modal-cabecera">
                <h2>
                  Agregar producto
                </h2>

                <button
                  className="boton-cerrar-modal"
                  onClick={() =>
                    setMostrarModalProducto(
                      false
                    )
                  }
                >
                  ×
                </button>
              </div>

              <form
                onSubmit={
                  guardarProducto
                }
              >
                <div className="campo-formulario">
                  <label>
                    Nombre
                  </label>

                  <input
                    name="nombre"
                    value={
                      formProducto.nombre
                    }
                    onChange={
                      actualizarCampoProducto
                    }
                    required
                  />
                </div>

                <div className="fila-formulario">
                  <div className="campo-formulario">
                    <label>
                      Marca
                    </label>

                    <input
                      name="marca"
                      value={
                        formProducto.marca
                      }
                      onChange={
                        actualizarCampoProducto
                      }
                    />
                  </div>

                  <div className="campo-formulario">
                    <label>
                      Categoría
                    </label>

                    <select
                      name="categoria"
                      value={
                        formProducto.categoria
                      }
                      onChange={
                        actualizarCampoProducto
                      }
                    >
                      <option value="">
                        Seleccionar
                      </option>

                      <option value="Acondicionador">
                        Anticloro
                      </option>

                      <option value="Bacterias">
                        Bacterias
                      </option>

                      <option value="Fertilizante">
                        Fertilizante
                      </option>

                      <option value="Tratamiento">
                        Tratamiento
                      </option>

                      <option value="Minerales">
                        Minerales
                      </option>

                      <option value="Otro">
                        Otro
                      </option>
                    </select>
                  </div>
                </div>

                <div className="separador-form">
                  Dosificación
                </div>

                <div className="fila-dosis">
                  <div className="campo-formulario">
                    <label>
                      Cantidad
                    </label>

                    <input
                      type="number"
                      step="0.001"
                      name="dosis_cantidad"
                      value={
                        formProducto.dosis_cantidad
                      }
                      onChange={
                        actualizarCampoProducto
                      }
                      required
                    />
                  </div>

                  <div className="campo-formulario">
                    <label>
                      Unidad
                    </label>

                    <select
                      name="dosis_unidad"
                      value={
                        formProducto.dosis_unidad
                      }
                      onChange={
                        actualizarCampoProducto
                      }
                    >
                      <option value="ml">
                        ml
                      </option>

                      <option value="gotas">
                        gotas
                      </option>

                      <option value="g">
                        g
                      </option>

                      <option value="mg">
                        mg
                      </option>
                    </select>
                  </div>

                  <div className="campo-formulario">
                    <label>
                      Por litros
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      name="volumen_referencia_litros"
                      value={
                        formProducto.volumen_referencia_litros
                      }
                      onChange={
                        actualizarCampoProducto
                      }
                      required
                    />
                  </div>
                </div>

                <div className="campo-formulario">
                  <label>
                    Instrucciones
                  </label>

                  <textarea
                    rows="3"
                    name="instrucciones"
                    value={
                      formProducto.instrucciones
                    }
                    onChange={
                      actualizarCampoProducto
                    }
                  />
                </div>

                <div className="acciones-modal">
                  <button
                    type="button"
                    className="boton-cancelar"
                    onClick={() =>
                      setMostrarModalProducto(
                        false
                      )
                    }
                  >
                    Cancelar
                  </button>

                  <button
                    className="boton-principal"
                    disabled={
                      guardandoProducto
                    }
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =================================================
            DOSIS
        ================================================= */}

        {mostrarCalculadora &&
          productoCalculo && (
            <div className="modal-overlay">
              <div className="modal-acuario">
                <div className="modal-cabecera">
                  <div>
                    <h2>
                      {
                        productoCalculo
                          .producto.nombre
                      }
                    </h2>

                    <p>
                      Registrar aplicación.
                    </p>
                  </div>

                  <button
                    className="boton-cerrar-modal"
                    onClick={() => {
                      setMostrarCalculadora(
                        false
                      )
                      setTareaEnAplicacion(
                        null
                      )
                    }}
                  >
                    ×
                  </button>
                </div>

                <div className="regla-visible">
                  <span>
                    Dosis indicada
                  </span>

                  <strong>
                    {
                      productoCalculo.regla
                        .dosis_cantidad
                    }{' '}
                    {
                      productoCalculo.regla
                        .dosis_unidad
                    }{' '}
                    /{' '}
                    {
                      productoCalculo.regla
                        .volumen_referencia_litros
                    }{' '}
                    L
                  </strong>
                </div>

                <form
                  onSubmit={
                    registrarDosis
                  }
                >
                  <div className="campo-formulario">
                    <label>
                      Litros tratados
                    </label>

                    <input
                      type="number"
                      step="0.01"
                      name="litros"
                      value={
                        formDosis.litros
                      }
                      onChange={
                        actualizarCampoDosis
                      }
                      required
                    />
                  </div>

                  <div className="resultado-dosis">
                    <span>
                      Dosis calculada
                    </span>

                    <strong>
                      {dosisCalculada.toFixed(
                        2
                      )}{' '}
                      {
                        productoCalculo.regla
                          .dosis_unidad
                      }
                    </strong>
                  </div>

                  <div className="campo-formulario">
                    <label>
                      Dosis realmente aplicada
                    </label>

                    <input
                      type="number"
                      step="0.001"
                      name="dosis_aplicada"
                      value={
                        formDosis.dosis_aplicada
                      }
                      onChange={
                        actualizarCampoDosis
                      }
                      required
                    />
                  </div>

                  <div className="campo-formulario">
                    <label>
                      Observaciones
                    </label>

                    <textarea
                      name="observaciones"
                      rows="3"
                      value={
                        formDosis.observaciones
                      }
                      onChange={
                        actualizarCampoDosis
                      }
                    />
                  </div>

                  <div className="acciones-modal">
                    <button
                      type="button"
                      className="boton-cancelar"
                      onClick={() => {
                        setMostrarCalculadora(
                          false
                        )
                        setTareaEnAplicacion(
                          null
                        )
                      }}
                    >
                      Cancelar
                    </button>

                    <button
                      className="boton-principal"
                      disabled={
                        guardandoDosis
                      }
                    >
                      ✓ Registrar aplicación
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        {/* =================================================
            REGISTRO RÁPIDO
        ================================================= */}

        {mostrarRegistroRapido && (
          <div className="modal-overlay">
            <div className="modal-acuario modal-registro-rapido">
              <div className="modal-cabecera">
                <div>
                  <h2>¿Qué vas a registrar?</h2>
                  <p>Acciones rápidas para usar desde el celular.</p>
                </div>

                <button
                  className="boton-cerrar-modal"
                  onClick={() => setMostrarRegistroRapido(false)}
                >
                  ×
                </button>
              </div>

              <div className="grid-registro-rapido">
                <button
                  onClick={() => {
                    setSeccionActiva('agua')
                    abrirRegistroAgua()
                  }}
                >
                  <span>💧</span>
                  <strong>Medición de agua</strong>
                </button>

                <button
                  onClick={() => {
                    setSeccionActiva('mantenimiento')
                    abrirMantenimiento('Cambio de agua')
                  }}
                >
                  <span>🔄</span>
                  <strong>Cambio de agua</strong>
                </button>

                <button
                  onClick={() => {
                    setMostrarRegistroRapido(false)
                    setSeccionActiva('productos')
                  }}
                >
                  <span>🧪</span>
                  <strong>Producto / dosis</strong>
                </button>

                <button
                  onClick={() => {
                    setMostrarRegistroRapido(false)
                    abrirPlanCiclado()
                  }}
                  disabled={!cicladoActivo}
                >
                  <span>📋</span>
                  <strong>Plan de ciclado</strong>
                </button>

                <button
                  onClick={() => {
                    setMostrarRegistroRapido(false)
                    setSeccionActiva('alimentacion')
                  }}
                >
                  <span>🍽️</span>
                  <strong>Alimentación</strong>
                </button>

                <button
                  onClick={() => {
                    setMostrarRegistroRapido(false)
                    setSeccionActiva('notas')
                  }}
                >
                  <span>📝</span>
                  <strong>Nota</strong>
                </button>

                <button
                  onClick={() => {
                    setMostrarRegistroRapido(false)
                    setSeccionActiva('habitantes')
                  }}
                >
                  <span>🐟</span>
                  <strong>Habitante</strong>
                </button>

                <button
                  onClick={() => {
                    setMostrarRegistroRapido(false)
                    setSeccionActiva('plantas')
                  }}
                >
                  <span>🌿</span>
                  <strong>Planta</strong>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            MEDICIÓN DE AGUA
        ================================================= */}

        {mostrarModalAgua && (
          <div className="modal-overlay">
            <div className="modal-acuario">
              <div className="modal-cabecera">
                <div>
                  <h2>Medición del agua</h2>
                  <p>Completa únicamente los valores que hayas medido.</p>
                </div>

                <button
                  className="boton-cerrar-modal"
                  onClick={() => {
                    setMostrarModalAgua(false)
                    setTareaAguaEnRegistro(null)
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={guardarMedicionAgua}>
                <div className="grid-form-parametros">
                  <div className="campo-formulario">
                    <label>Temperatura °C</label>
                    <input
                      type="number"
                      step="0.1"
                      name="temperatura_c"
                      value={formAgua.temperatura_c}
                      onChange={actualizarCampoAgua}
                      inputMode="decimal"
                    />
                  </div>

                  <div className="campo-formulario">
                    <label>pH</label>
                    <input
                      type="number"
                      step="0.01"
                      name="ph"
                      value={formAgua.ph}
                      onChange={actualizarCampoAgua}
                      inputMode="decimal"
                    />
                  </div>

                  <div className="campo-formulario">
                    <label>NH3/NH4 mg/L</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      name="amonio_nh3"
                      value={formAgua.amonio_nh3}
                      onChange={actualizarCampoAgua}
                      inputMode="decimal"
                    />
                  </div>

                  <div className="campo-formulario">
                    <label>NO2 mg/L</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0"
                      name="nitrito_no2"
                      value={formAgua.nitrito_no2}
                      onChange={actualizarCampoAgua}
                      inputMode="decimal"
                    />
                  </div>

                  <div className="campo-formulario">
                    <label>NO3 mg/L</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      name="nitrato_no3"
                      value={formAgua.nitrato_no3}
                      onChange={actualizarCampoAgua}
                      inputMode="decimal"
                    />
                  </div>

                  <div className="campo-formulario">
                    <label>GH °dGH</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      name="gh"
                      value={formAgua.gh}
                      onChange={actualizarCampoAgua}
                      inputMode="decimal"
                    />
                  </div>

                  <div className="campo-formulario">
                    <label>KH °dKH</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      name="kh"
                      value={formAgua.kh}
                      onChange={actualizarCampoAgua}
                      inputMode="decimal"
                    />
                  </div>

                  <div className="campo-formulario">
                    <label>TDS ppm</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      name="tds"
                      value={formAgua.tds}
                      onChange={actualizarCampoAgua}
                      inputMode="numeric"
                    />
                  </div>
                </div>

                <div className="campo-formulario">
                  <label>Observaciones</label>
                  <textarea
                    rows="3"
                    name="observaciones"
                    value={formAgua.observaciones}
                    onChange={actualizarCampoAgua}
                    placeholder="Color del agua, comportamiento, algas, etc."
                  />
                </div>

                <div className="acciones-modal">
                  <button
                    type="button"
                    className="boton-cancelar"
                    onClick={() => {
                      setMostrarModalAgua(false)
                      setTareaAguaEnRegistro(null)
                    }}
                  >
                    Cancelar
                  </button>

                  <button
                    className="boton-principal"
                    disabled={guardandoAgua}
                  >
                    {guardandoAgua ? 'Guardando...' : 'Guardar medición'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* =================================================
            MANTENIMIENTO / CAMBIO DE AGUA
        ================================================= */}

        {mostrarModalMantenimiento && (
          <div className="modal-overlay">
            <div className="modal-acuario">
              <div className="modal-cabecera">
                <div>
                  <h2>{formMantenimiento.tipo}</h2>
                  <p>Registra lo que realizaste en el acuario.</p>
                </div>

                <button
                  className="boton-cerrar-modal"
                  onClick={() => {
                    setMostrarModalMantenimiento(false)
                    setTareaMantenimientoEnRegistro(null)
                  }}
                >
                  ×
                </button>
              </div>

              <form onSubmit={guardarMantenimiento}>
                <div className="campo-formulario">
                  <label>Tipo</label>
                  <select
                    name="tipo"
                    value={formMantenimiento.tipo}
                    onChange={actualizarMantenimiento}
                  >
                    <option value="Cambio de agua">Cambio de agua</option>
                    <option value="Mantenimiento general">
                      Mantenimiento general
                    </option>
                    <option value="Limpieza">Limpieza</option>
                    <option value="Poda">Poda</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="fila-formulario">
                  <div className="campo-formulario">
                    <label>Porcentaje cambiado</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      name="porcentaje_cambio_agua"
                      value={formMantenimiento.porcentaje_cambio_agua}
                      onChange={actualizarMantenimiento}
                      inputMode="decimal"
                    />
                  </div>

                  <div className="campo-formulario">
                    <label>Litros cambiados</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="litros_cambiados"
                      value={formMantenimiento.litros_cambiados}
                      onChange={actualizarMantenimiento}
                      inputMode="decimal"
                    />
                  </div>
                </div>

                {formMantenimiento.litros_cambiados && (
                  <div className="resumen-cambio-agua">
                    <span>Agua nueva</span>
                    <strong>{formMantenimiento.litros_cambiados} L</strong>
                    <small>
                      {formMantenimiento.porcentaje_cambio_agua
                        ? `${formMantenimiento.porcentaje_cambio_agua}% del acuario`
                        : ''}
                    </small>
                  </div>
                )}

                <div className="checks-mantenimiento">
                  <label>
                    <input
                      type="checkbox"
                      name="limpieza_filtro"
                      checked={formMantenimiento.limpieza_filtro}
                      onChange={actualizarMantenimiento}
                    />
                    Limpieza de filtro
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      name="limpieza_vidrios"
                      checked={formMantenimiento.limpieza_vidrios}
                      onChange={actualizarMantenimiento}
                    />
                    Limpieza de vidrios
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      name="sifonado"
                      checked={formMantenimiento.sifonado}
                      onChange={actualizarMantenimiento}
                    />
                    Sifonado
                  </label>

                  <label>
                    <input
                      type="checkbox"
                      name="poda_plantas"
                      checked={formMantenimiento.poda_plantas}
                      onChange={actualizarMantenimiento}
                    />
                    Poda de plantas
                  </label>
                </div>

                {productosParaAguaNueva.length > 0 &&
                  Number(formMantenimiento.litros_cambiados) > 0 && (
                    <div className="productos-cambio-agua">
                      <div className="productos-cambio-titulo">
                        <strong>Productos para el agua nueva</strong>
                        <span>Cálculo para {formMantenimiento.litros_cambiados} L</span>
                      </div>

                      {productosParaAguaNueva.map((item) => (
                        <div
                          className="producto-cambio-item"
                          key={item.producto.id}
                        >
                          <div>
                            <strong>{item.producto.nombre}</strong>
                            <span>
                              {item.regla.dosis_cantidad}{' '}
                              {item.regla.dosis_unidad} /{' '}
                              {item.regla.volumen_referencia_litros} L
                            </span>
                          </div>

                          <strong>
                            {item.dosis.toFixed(2)} {item.regla.dosis_unidad}
                          </strong>
                        </div>
                      ))}

                      <small>
                        Estas cantidades son cálculos según las reglas que tú
                        registraste para cada producto.
                      </small>
                    </div>
                  )}

                <div className="campo-formulario">
                  <label>Observaciones</label>
                  <textarea
                    rows="3"
                    name="observaciones"
                    value={formMantenimiento.observaciones}
                    onChange={actualizarMantenimiento}
                  />
                </div>

                <div className="acciones-modal">
                  <button
                    type="button"
                    className="boton-cancelar"
                    onClick={() => {
                      setMostrarModalMantenimiento(false)
                      setTareaMantenimientoEnRegistro(null)
                    }}
                  >
                    Cancelar
                  </button>

                  <button
                    className="boton-principal"
                    disabled={guardandoMantenimiento}
                  >
                    {guardandoMantenimiento ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    )
  }

  /* =========================================================
     MIS ACUARIOS
  ========================================================= */

  return (
    <div className={`app ${modoOscuro ? "modo-oscuro" : ""}`}>
      <header className="topbar">
        <div>
          <h1>NexoWeb</h1>
          <p>
            Mis acuarios · v{NEXOWEB_VERSION}
          </p>
        </div>

        <button
          onClick={cerrarSesion}
        >
          Cerrar sesión
        </button>
      </header>

      <main className="contenido">
        <div className="titulo-seccion">
          <div>
            <h2>Mis acuarios</h2>
            <p>
              {session.user.email}
            </p>
          </div>

          <div className="acciones-mis-acuarios">
            {!appInstalada && (
              <button
                className="boton-instalar-app"
                onClick={instalarNexoWeb}
              >
                <span>⬇️</span>
                Instalar NexoWeb
              </button>
            )}

            <button
              className="boton-principal"
              onClick={abrirModalAcuario}
            >
              + Crear acuario
            </button>
          </div>
        </div>

        {mensaje && (
          <div className="mensaje">
            {mensaje}
          </div>
        )}

        {cargandoAcuarios ? (
          <div className="estado-vacio">
            Cargando...
          </div>
        ) : (
          <div className="grid-acuarios">
            {acuarios.map(
              (acuario) => (
                <article
                  className="tarjeta-acuario"
                  key={acuario.id}
                >
                  {acuario.foto_portada_url && (
                    <div className="tarjeta-acuario-portada">
                      <img src={acuario.foto_portada_url} alt={`Portada de ${acuario.nombre}`} loading="lazy" />
                    </div>
                  )}

                  <div className="tarjeta-acuario-cabecera">
                    <div className="icono-acuario">
                      🐠
                    </div>

                    <div className="tarjeta-acuario-acciones">
                      {idsPosiblesDuplicados.has(acuario.id) && (
                        <span className="badge-duplicado">
                          Posible duplicado
                        </span>
                      )}

                      <span className="estado-acuario">
                        {acuario.estado ||
                          'activo'}
                      </span>

                      <div className="menu-tarjeta-wrap">
                        <button
                          type="button"
                          className="boton-menu-tarjeta"
                          aria-label={`Opciones de ${acuario.nombre}`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuTarjetaAcuario(
                              menuTarjetaAcuario === acuario.id
                                ? null
                                : acuario.id
                            )
                          }}
                        >
                          ⋮
                        </button>

                        {menuTarjetaAcuario === acuario.id && (
                          <div className="menu-tarjeta">
                            <button
                              type="button"
                              onClick={() => {
                                abrirAcuario(acuario)
                                setSeccionActiva('configuracion')
                                setMenuTarjetaAcuario(null)
                              }}
                            >
                              🛠️ Editar
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                archivarAcuarioDesdeLista(acuario)
                              }
                            >
                              {acuario.estado === 'archivado'
                                ? '♻️ Reactivar'
                                : '📦 Archivar'}
                            </button>

                            <button
                              type="button"
                              className="peligro"
                              disabled={
                                eliminandoAcuarioId === acuario.id
                              }
                              onClick={() =>
                                solicitarEliminarAcuario(acuario)
                              }
                            >
                              🗑️ Eliminar definitivamente
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <h3>
                    {acuario.nombre}
                  </h3>

                  <div className="datos-acuario">
                    <div>
                      <span>
                        Volumen
                      </span>

                      <strong>
                        {acuario.volumen_litros
                          ? `${acuario.volumen_litros} L`
                          : '—'}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Tipo
                      </span>

                      <strong>
                        {acuario.tipo ||
                          '—'}
                      </strong>
                    </div>
                  </div>

                  <button
                    className="boton-entrar-acuario"
                    disabled={
                      eliminandoAcuarioId === acuario.id
                    }
                    onClick={() =>
                      abrirAcuario(
                        acuario
                      )
                    }
                  >
                    {eliminandoAcuarioId === acuario.id
                      ? 'Eliminando...'
                      : 'Abrir acuario'}
                  </button>
                </article>
              )
            )}
          </div>
        )}
      </main>

      {acuarioEliminarPendiente && (
        <div
          className="modal-overlay modal-confirmacion-overlay"
          onClick={cancelarEliminarAcuario}
        >
          <div
            className="modal-confirmacion"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirmacion-icono peligro">🗑️</div>
            <h2>Eliminar acuario</h2>
            <p>
              ¿Seguro que quieres eliminar
              <strong> {acuarioEliminarPendiente.nombre}</strong>?
            </p>

            <div className="confirmacion-aviso">
              Se eliminarán sus mediciones, tareas, habitantes, fotos
              y demás registros relacionados. Esta acción no se puede deshacer.
            </div>

            <div className="confirmacion-acciones">
              <button
                className="boton-cancelar"
                disabled={Boolean(eliminandoAcuarioId)}
                onClick={cancelarEliminarAcuario}
              >
                Cancelar
              </button>

              <button
                className="boton-eliminar-confirmacion"
                disabled={Boolean(eliminandoAcuarioId)}
                onClick={eliminarAcuarioDefinitivamente}
              >
                {eliminandoAcuarioId ? (
                  <>
                    <span className="spinner-mini" />
                    Eliminando...
                  </>
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {mostrarModalAcuario && (
        <div className="modal-overlay">
          <div className="modal-acuario">
            <div className="modal-cabecera">
              <h2>
                Crear acuario
              </h2>

              <button
                className="boton-cerrar-modal"
                disabled={guardandoAcuario}
                onClick={() => {
                  if (!guardandoAcuario) {
                    setMostrarModalAcuario(false)
                    setMensajeAcuario('')
                    setProgresoCreacion('')
                  }
                }}
              >
                ×
              </button>
            </div>

            <form
              onSubmit={
                guardarAcuario
              }
              aria-busy={guardandoAcuario}
              className={
                guardandoAcuario
                  ? 'form-crear-acuario guardando'
                  : 'form-crear-acuario'
              }
            >
              {mensajeAcuario && (
                <div
                  className={`mensaje-modal ${
                    mensajeAcuario.startsWith('❌')
                      ? 'error'
                      : mensajeAcuario.startsWith('⚠️')
                      ? 'advertencia'
                      : 'info'
                  }`}
                >
                  {mensajeAcuario}
                </div>
              )}

              {guardandoAcuario && (
                <div className="progreso-creacion">
                  <div className="progreso-creacion-cabecera">
                    <span className="spinner-mini" />
                    <div>
                      <strong>Creando acuario...</strong>
                      <small>
                        No cierres esta ventana ni pulses Guardar otra vez.
                      </small>
                    </div>
                  </div>

                  <div className="pasos-creacion">
                    <div
                      className={
                        ['guardando_datos', 'procesando_foto', 'finalizando']
                          .includes(progresoCreacion)
                          ? 'paso activo'
                          : 'paso'
                      }
                    >
                      <span>
                        {['procesando_foto', 'finalizando'].includes(
                          progresoCreacion
                        )
                          ? '✓'
                          : '1'}
                      </span>
                      Datos
                    </div>

                    <div
                      className={
                        progresoCreacion === 'procesando_foto'
                          ? 'paso activo'
                          : progresoCreacion === 'finalizando'
                          ? 'paso completado'
                          : 'paso'
                      }
                    >
                      <span>
                        {progresoCreacion === 'finalizando'
                          ? '✓'
                          : '2'}
                      </span>
                      Foto
                    </div>

                    <div
                      className={
                        progresoCreacion === 'finalizando'
                          ? 'paso activo'
                          : 'paso'
                      }
                    >
                      <span>3</span>
                      Finalizar
                    </div>
                  </div>
                </div>
              )}
              <div className="asistente-creacion">
                <strong>¿Qué estás creando?</strong>
                <div className="tipos-creacion">
                  {[
                    ['Acuario', '🐠'],
                    ['Plantado', '🌿'],
                    ['Estanque', '🏞️'],
                    ['Gambario', '🦐'],
                    ['Cría', '🐟'],
                  ].map(([tipo, icono]) => (
                    <button
                      type="button"
                      key={tipo}
                      className={formAcuario.tipo === tipo ? 'activo' : ''}
                      onClick={() =>
                        setFormAcuario((anterior) => ({
                          ...anterior,
                          tipo,
                          ubicacion: tipo === 'Estanque' ? 'Exterior' : anterior.ubicacion || 'Interior',
                        }))
                      }
                    >
                      <span>{icono}</span>
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="portada-creacion">
                <div className="portada-creacion-preview">
                  {fotoPortadaPreview ? (
                    <img src={fotoPortadaPreview} alt="Vista previa" />
                  ) : (
                    <span>📷</span>
                  )}
                </div>

                <div>
                  <strong>Foto de portada</strong>
                  <p>Opcional. Se comprimirá antes de subirla.</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={seleccionarFotoPortada}
                  />
                  {fotoPortadaArchivo && (
                    <small>
                      {fotoPortadaArchivo.name} · {formatoBytes(fotoPortadaArchivo.size)}
                    </small>
                  )}
                </div>
              </div>

              <div className="campo-formulario">
                <label>
                  Nombre
                </label>

                <input
                  name="nombre"
                  value={
                    formAcuario.nombre
                  }
                  onChange={
                    actualizarCampoAcuario
                  }
                  required
                />
              </div>

              <div className="fila-formulario">
                <div className="campo-formulario">
                  <label>
                    Volumen
                  </label>

                  <input
                    type="number"
                    name="volumen_litros"
                    value={
                      formAcuario.volumen_litros
                    }
                    onChange={
                      actualizarCampoAcuario
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>
                    Tipo
                  </label>

                  <select
                    name="tipo"
                    value={
                      formAcuario.tipo
                    }
                    onChange={
                      actualizarCampoAcuario
                    }
                  >
                    <option value="">
                      Seleccionar
                    </option>

                    <option value="Agua dulce">
                      Agua dulce
                    </option>

                    <option value="Plantado">
                      Plantado
                    </option>

                    <option value="Comunitario">
                      Comunitario
                    </option>

                    <option value="Estanque">
                      Estanque
                    </option>

                    <option value="Acuario">
                      Acuario
                    </option>

                    <option value="Gambario">
                      Gambario
                    </option>

                    <option value="Cría">
                      Cría
                    </option>

                    <option value="Otro">
                      Otro
                    </option>
                  </select>
                </div>
              </div>

              <button
                type="button"
                className="boton-detalles-opcionales"
                onClick={() =>
                  setMostrarDetallesAcuario((actual) => !actual)
                }
                disabled={guardandoAcuario}
              >
                <span>⚙️</span>
                <div>
                  <strong>Más detalles</strong>
                  <small>
                    Medidas, ubicación, temperatura y otros datos opcionales
                  </small>
                </div>
                <span>{mostrarDetallesAcuario ? '⌃' : '⌄'}</span>
              </button>

              {mostrarDetallesAcuario && (
                <div className="detalles-opcionales">
              <div className="fila-formulario">
                <div className="campo-formulario">
                  <label>Subtipo</label>
                  <input
                    name="subtipo"
                    value={formAcuario.subtipo}
                    onChange={actualizarCampoAcuario}
                    placeholder="Ej. tropical, low-tech..."
                  />
                </div>

                <div className="campo-formulario">
                  <label>Ubicación</label>
                  <select
                    name="ubicacion"
                    value={formAcuario.ubicacion}
                    onChange={actualizarCampoAcuario}
                  >
                    <option value="">Sin definir</option>
                    <option value="Interior">Interior</option>
                    <option value="Exterior">Exterior</option>
                  </select>
                </div>
              </div>

              <div className="campo-formulario">
                <label>Exposición solar</label>
                <select
                  name="exposicion_solar"
                  value={formAcuario.exposicion_solar}
                  onChange={actualizarCampoAcuario}
                >
                  <option value="">Sin definir</option>
                  <option value="Sin sol directo">Sin sol directo</option>
                  <option value="Sol indirecto">Sol indirecto</option>
                  <option value="Sol parcial">Sol parcial</option>
                  <option value="Sol directo">Sol directo</option>
                </select>
              </div>

              <div className="fila-tres">
                <div className="campo-formulario">
                  <label>
                    Largo
                  </label>

                  <input
                    type="number"
                    name="largo_cm"
                    value={
                      formAcuario.largo_cm
                    }
                    onChange={
                      actualizarCampoAcuario
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>
                    Ancho
                  </label>

                  <input
                    type="number"
                    name="ancho_cm"
                    value={
                      formAcuario.ancho_cm
                    }
                    onChange={
                      actualizarCampoAcuario
                    }
                  />
                </div>

                <div className="campo-formulario">
                  <label>
                    Alto
                  </label>

                  <input
                    type="number"
                    name="alto_cm"
                    value={
                      formAcuario.alto_cm
                    }
                    onChange={
                      actualizarCampoAcuario
                    }
                  />
                </div>
              </div>

              <div className="campo-formulario">
                <label>
                  Temperatura objetivo
                </label>

                <input
                  type="number"
                  step="0.1"
                  name="temperatura_objetivo"
                  value={
                    formAcuario.temperatura_objetivo
                  }
                  onChange={
                    actualizarCampoAcuario
                  }
                />
              </div>

              <div className="campo-formulario">
                <label>Costo inicial (opcional)</label>
                <input
                  type="number"
                  step="0.01"
                  name="costo_inicial"
                  value={formAcuario.costo_inicial}
                  onChange={actualizarCampoAcuario}
                />
              </div>

                </div>
              )}

              <div className="campo-formulario">
                <label>
                  Descripción
                </label>

                <textarea
                  name="descripcion"
                  rows="3"
                  value={
                    formAcuario.descripcion
                  }
                  onChange={
                    actualizarCampoAcuario
                  }
                />
              </div>

              <div className="acciones-modal">
                <button
                  type="button"
                  className="boton-cancelar"
                  disabled={guardandoAcuario}
                  onClick={() => {
                    if (!guardandoAcuario) {
                      setMostrarModalAcuario(false)
                      setMensajeAcuario('')
                      setProgresoCreacion('')
                    }
                  }}
                >
                  Cancelar
                </button>

                <button
                  className="boton-principal boton-guardar-acuario"
                  disabled={guardandoAcuario}
                >
                  {guardandoAcuario ? (
                    <>
                      <span className="spinner-mini" />
                      Creando...
                    </>
                  ) : (
                    'Guardar'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App