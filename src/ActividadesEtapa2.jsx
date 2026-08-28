import { useEffect, useMemo, useRef, useState } from 'react'
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
  fecha.setDate(fecha.getDate() + Number(dias || 0))
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
  if (valor === '' || valor === null || valor === undefined) {
    return null
  }

  const numero = Number(valor)
  return Number.isNaN(numero) ? null : numero
}

const valorONull = (valor) =>
  String(valor ?? '').trim() || null

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
  ['cambio_agua', '💧', 'Cambio de agua', 'Agua nueva, litros y acondicionador'],
  ['medicion_agua', '🧪', 'Medición', 'pH, NO2, NO3, temperatura y más'],
  ['mantenimiento', '🧽', 'Mantenimiento', 'Filtro, sifonado, cristales y poda'],
  ['medicacion', '💊', 'Medicación', 'Tratamiento, dosis y duración'],
  ['ciclado', '🔄', 'Ciclado', 'Inicio y parámetros a controlar'],
  ['alimentacion', '🍽️', 'Alimentación', 'Alimento y cantidad'],
  ['fertilizacion', '🌿', 'Fertilización', 'Producto y dosificación'],
  ['producto', '🧴', 'Agregar producto', 'Acondicionador, bacterias u otro'],
  ['limpieza', '🧹', 'Limpieza', 'Bomba, decoración o cristales'],
  ['otro', '➕', 'Otra actividad', 'Cualquier otra tarea'],
].map(([id, icono, nombre, detalle]) => ({
  id,
  icono,
  nombre,
  detalle,
}))

const rutinaOcurre = (rutina, fechaTexto) => {
  if (!rutina?.activa || !rutina?.fecha_inicio) return false
  if (fechaTexto < rutina.fecha_inicio) return false
  if (rutina.fecha_fin && fechaTexto > rutina.fecha_fin) return false

  const diferencia = diferenciaDias(
    rutina.fecha_inicio,
    fechaTexto
  )

  const [y, m, d] = fechaTexto
    .split('-')
    .map(Number)

  const fecha = new Date(y, m - 1, d)

  if (
    rutina.frecuencia === 'diaria' ||
    rutina.frecuencia === 'cada_x_dias'
  ) {
    return (
      diferencia %
        Math.max(1, Number(rutina.intervalo) || 1) ===
      0
    )
  }

  if (rutina.frecuencia === 'semanal') {
    return (rutina.dias_semana ?? []).includes(
      fecha.getDay()
    )
  }

  if (rutina.frecuencia === 'mensual') {
    return (
      fecha.getDate() ===
      Number(rutina.dia_mes || 1)
    )
  }

  return false
}

const formularioInicial = (fechaInicial = '') => ({
  titulo: '',
  fecha: fechaInicial || fechaLocal(),
  hora: '',
  estado: 'pendiente',
  observacion: '',
  recordatorio_minutos: '',
  repeticion: 'no_repetir',
  intervalo_dias: '1',
  fecha_fin_repeticion: '',

  // Cambio de agua
  modo_cambio: 'litros',
  litros_cambiados: '',
  porcentaje_cambio: '',
  producto_utilizado: '',
  acondicionador: '',
  temperatura_cambio: '',

  // Medición
  temperatura: '',
  ph: '',
  amonio_nh3: '',
  nitrito_no2: '',
  nitrato_no3: '',
  kh: '',
  gh: '',
  cloro: '',
  tds: '',
  otros_parametros: '',

  // Mantenimiento / limpieza
  limpieza_filtro: false,
  limpieza_vidrios: false,
  sifonado: false,
  limpieza_decoracion: false,
  limpieza_bomba: false,
  cambio_material_filtrante: false,
  poda_plantas: false,
  mantenimiento_otro: false,
  mantenimiento_otro_texto: '',

  // Productos / fertilización
  producto_id: '',
  regla_dosificacion_id: '',
  aplicar_sobre: 'volumen_total',
  litros_producto: '',
  dosis_manual: '',
  unidad_manual: 'ml',

  // Medicación
  medicamento: '',
  dosis_medicamento: '',
  unidad_medicamento: 'ml',
  duracion_dias: '1',
  intervalo_medicacion_dias: '1',

  // Ciclado
  fecha_fin_ciclado: '',
  parametros_ciclado: ['ph', 'no2', 'no3'],
  iniciar_ciclo: true,

  // Alimentación
  alimento: '',
  cantidad_alimento: '',
})

const CampoComun = ({
  form,
  setForm,
  manana,
  ocultarRepeticion = false,
}) => (
  <>
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
        required
      />
    </div>

    <div className="fecha-rapida-selector">
      <button
        type="button"
        className={
          form.fecha === fechaLocal()
            ? 'activo'
            : ''
        }
        onClick={() =>
          setForm({
            ...form,
            fecha: fechaLocal(),
          })
        }
      >
        Hoy
      </button>

      <button
        type="button"
        className={
          form.fecha === manana
            ? 'activo'
            : ''
        }
        onClick={() =>
          setForm({
            ...form,
            fecha: manana,
          })
        }
      >
        Mañana
      </button>

      <label>
        Elegir fecha
        <input
          type="date"
          value={form.fecha}
          onChange={(e) =>
            setForm({
              ...form,
              fecha: e.target.value,
            })
          }
        />
      </label>
    </div>

    <div className="fila-formulario">
      <div className="campo-formulario">
        <label>
          Hora <small>(opcional)</small>
        </label>
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

      <div className="campo-formulario">
        <label>Estado</label>
        <select
          value={form.estado}
          onChange={(e) =>
            setForm({
              ...form,
              estado: e.target.value,
            })
          }
        >
          <option value="pendiente">
            Pendiente
          </option>
          <option value="completada">
            Completada
          </option>
          <option value="omitida">
            Omitida
          </option>
        </select>
      </div>
    </div>

    <div className="campo-formulario">
      <label>Observación</label>
      <textarea
        rows="3"
        value={form.observacion}
        onChange={(e) =>
          setForm({
            ...form,
            observacion: e.target.value,
          })
        }
        placeholder="Opcional"
      />
    </div>

    <div className="campo-formulario">
      <label>Recordatorio</label>
      <select
        value={form.recordatorio_minutos}
        onChange={(e) =>
          setForm({
            ...form,
            recordatorio_minutos:
              e.target.value,
          })
        }
      >
        <option value="">
          Sin recordatorio
        </option>
        <option value="15">
          15 min antes
        </option>
        <option value="30">
          30 min antes
        </option>
        <option value="60">
          1 hora antes
        </option>
        <option value="1440">
          1 día antes
        </option>
      </select>
    </div>

    {!ocultarRepeticion && (
      <>
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
            <option value="no_repetir">
              No repetir
            </option>
            <option value="diaria">
              Diaria
            </option>
            <option value="semanal">
              Semanal
            </option>
            <option value="cada_2_semanas">
              Cada 2 semanas
            </option>
            <option value="cada_x_dias">
              Cada X días
            </option>
            <option value="mensual">
              Mensual
            </option>
          </select>
        </div>

        {form.repeticion === 'cada_x_dias' && (
          <div className="campo-formulario">
            <label>Cada cuántos días</label>
            <input
              type="number"
              min="1"
              value={form.intervalo_dias}
              onChange={(e) =>
                setForm({
                  ...form,
                  intervalo_dias:
                    e.target.value,
                })
              }
            />
          </div>
        )}

        {form.repeticion !== 'no_repetir' && (
          <div className="campo-formulario">
            <label>
              Repetir hasta{' '}
              <small>(opcional)</small>
            </label>
            <input
              type="date"
              value={form.fecha_fin_repeticion}
              onChange={(e) =>
                setForm({
                  ...form,
                  fecha_fin_repeticion:
                    e.target.value,
                })
              }
            />
          </div>
        )}
      </>
    )}
  </>
)

export function SelectorRegistroActividades({
  abierto,
  acuario,
  fechaInicial = '',
  onCerrar,
  onGuardado,
  onMensaje,
}) {
  const [tipo, setTipo] = useState('')
  const [pasoFormulario, setPasoFormulario] =
    useState(false)

  const [guardando, setGuardando] =
    useState(false)

  const guardandoRef = useRef(false)

  const [productos, setProductos] =
    useState([])

  const [form, setForm] = useState(
    formularioInicial(fechaInicial)
  )

  useEffect(() => {
    if (!abierto) return

    setTipo('')
    setPasoFormulario(false)
    setForm(
      formularioInicial(
        fechaInicial || fechaLocal()
      )
    )

    const cargarProductos = async () => {
      const { data } = await supabase
        .from('productos')
        .select(`
          *,
          reglas_dosificacion (*)
        `)
        .order('nombre')

      setProductos(data ?? [])
    }

    cargarProductos()
  }, [abierto, fechaInicial])

  if (!abierto) return null

  const actividad = TIPOS_ACTIVIDAD.find(
    (item) => item.id === tipo
  )

  const manana = sumarDias(
    fechaLocal(),
    1
  )

  const seleccionar = (actividadSeleccionada) => {
    setTipo(
      actividadSeleccionada.id
    )

    const nuevo = formularioInicial(
      fechaInicial || fechaLocal()
    )

    nuevo.titulo =
      actividadSeleccionada.nombre

    if (
      actividadSeleccionada.id ===
      'ciclado'
    ) {
      nuevo.fecha_fin_ciclado =
        sumarDias(
          nuevo.fecha,
          30
        )
    }

    setForm(nuevo)
    setPasoFormulario(true)
  }

  const productoSeleccionado =
    productos.find(
      (producto) =>
        producto.id ===
        form.producto_id
    )

  const reglasProducto =
    productoSeleccionado
      ?.reglas_dosificacion ??
    []

  const reglaSeleccionada =
    reglasProducto.find(
      (regla) =>
        regla.id ===
        form.regla_dosificacion_id
    )

  useEffect(() => {
    if (!form.producto_id) return

    const primera =
      reglasProducto.find(
        (regla) => regla.activa
      ) ||
      reglasProducto[0]

    if (
      primera?.id &&
      !form.regla_dosificacion_id
    ) {
      setForm((anterior) => ({
        ...anterior,
        regla_dosificacion_id:
          primera.id,
      }))
    }
  }, [form.producto_id])

  const litrosObjetivoProducto = useMemo(() => {
    if (
      form.aplicar_sobre ===
      'volumen_total'
    ) {
      return (
        numeroONull(
          form.litros_producto
        ) ??
        numeroONull(
          acuario?.volumen_litros
        )
      )
    }

    return numeroONull(
      form.litros_producto
    )
  }, [
    form.aplicar_sobre,
    form.litros_producto,
    acuario?.volumen_litros,
  ])

  const dosisCalculada = useMemo(() => {
    if (
      !reglaSeleccionada ||
      !litrosObjetivoProducto
    ) {
      return null
    }

    const referencia =
      Number(
        reglaSeleccionada
          .volumen_referencia_litros
      )

    if (!referencia) return null

    return (
      Number(
        reglaSeleccionada
          .dosis_cantidad
      ) /
      referencia *
      Number(
        litrosObjetivoProducto
      )
    )
  }, [
    reglaSeleccionada,
    litrosObjetivoProducto,
  ])

  const calcularCambioDesdePorcentaje = (
    porcentaje
  ) => {
    const volumen =
      Number(
        acuario?.volumen_litros
      )

    if (
      !volumen ||
      !Number(porcentaje)
    ) {
      return ''
    }

    return (
      volumen *
      Number(porcentaje) /
      100
    ).toFixed(1)
  }

  const calcularPorcentajeDesdeLitros = (
    litros
  ) => {
    const volumen =
      Number(
        acuario?.volumen_litros
      )

    if (
      !volumen ||
      !Number(litros)
    ) {
      return ''
    }

    return (
      Number(litros) /
      volumen *
      100
    ).toFixed(1)
  }

  const toggleMantenimiento = (campo) => {
    setForm((anterior) => ({
      ...anterior,
      [campo]: !anterior[campo],
    }))
  }

  const toggleParametroCiclado = (parametro) => {
    setForm((anterior) => ({
      ...anterior,
      parametros_ciclado:
        anterior.parametros_ciclado.includes(
          parametro
        )
          ? anterior.parametros_ciclado.filter(
              (item) =>
                item !== parametro
            )
          : [
              ...anterior.parametros_ciclado,
              parametro,
            ],
    }))
  }

  const metadataEspecifica = () => {
    if (tipo === 'cambio_agua') {
      return {
        litros_cambiados:
          numeroONull(
            form.litros_cambiados
          ),
        porcentaje_cambio:
          numeroONull(
            form.porcentaje_cambio
          ),
        producto_utilizado:
          valorONull(
            form.producto_utilizado
          ),
        acondicionador:
          valorONull(
            form.acondicionador
          ),
        temperatura_c:
          numeroONull(
            form.temperatura_cambio
          ),
      }
    }

    if (tipo === 'medicion_agua') {
      return {
        parametros: {
          temperatura_c:
            numeroONull(
              form.temperatura
            ),
          ph:
            numeroONull(form.ph),
          amonio_nh3:
            numeroONull(
              form.amonio_nh3
            ),
          nitrito_no2:
            numeroONull(
              form.nitrito_no2
            ),
          nitrato_no3:
            numeroONull(
              form.nitrato_no3
            ),
          kh:
            numeroONull(form.kh),
          gh:
            numeroONull(form.gh),
          cloro:
            numeroONull(form.cloro),
          tds:
            numeroONull(form.tds),
          otros:
            valorONull(
              form.otros_parametros
            ),
        },
      }
    }

    if (
      tipo === 'mantenimiento' ||
      tipo === 'limpieza'
    ) {
      return {
        limpieza_filtro:
          form.limpieza_filtro,
        limpieza_vidrios:
          form.limpieza_vidrios,
        sifonado:
          form.sifonado,
        limpieza_decoracion:
          form.limpieza_decoracion,
        limpieza_bomba:
          form.limpieza_bomba,
        cambio_material_filtrante:
          form.cambio_material_filtrante,
        poda_plantas:
          form.poda_plantas,
        otro:
          form.mantenimiento_otro,
        otro_texto:
          valorONull(
            form.mantenimiento_otro_texto
          ),
      }
    }

    if (tipo === 'medicacion') {
      const duracion =
        Math.max(
          1,
          Number(
            form.duracion_dias
          ) || 1
        )

      const intervalo =
        Math.max(
          1,
          Number(
            form.intervalo_medicacion_dias
          ) || 1
        )

      const total =
        Math.floor(
          (duracion - 1) /
          intervalo
        ) + 1

      return {
        medicamento:
          valorONull(
            form.medicamento
          ) ||
          productoSeleccionado?.nombre ||
          null,
        producto_id:
          form.producto_id ||
          null,
        dosis:
          numeroONull(
            form.dosis_medicamento
          ),
        unidad:
          form.unidad_medicamento ||
          'ml',
        duracion_dias:
          duracion,
        intervalo_dias:
          intervalo,
        total_dosis:
          total,
      }
    }

    if (tipo === 'ciclado') {
      return {
        fecha_inicio:
          form.fecha,
        fecha_fin_estimada:
          form.fecha_fin_ciclado ||
          null,
        parametros_control:
          form.parametros_ciclado,
        iniciar_ciclo:
          form.iniciar_ciclo,
      }
    }

    if (tipo === 'alimentacion') {
      return {
        alimento:
          valorONull(
            form.alimento
          ),
        cantidad:
          valorONull(
            form.cantidad_alimento
          ),
      }
    }

    if (
      tipo === 'producto' ||
      tipo === 'fertilizacion'
    ) {
      return {
        producto_id:
          form.producto_id ||
          null,
        producto_nombre:
          productoSeleccionado?.nombre ||
          null,
        regla_dosificacion_id:
          form.regla_dosificacion_id ||
          null,
        aplicar_sobre:
          form.aplicar_sobre,
        volumen_litros:
          litrosObjetivoProducto,
        dosis_calculada:
          dosisCalculada != null
            ? Number(
                dosisCalculada.toFixed(3)
              )
            : null,
        dosis_manual:
          numeroONull(
            form.dosis_manual
          ),
        unidad:
          reglaSeleccionada
            ?.dosis_unidad ||
          form.unidad_manual ||
          'ml',
      }
    }

    return {}
  }

  const registrarRealizacion = async ({
    tareaId,
    tratamientoId = null,
    numeroDosis = null,
    totalDosis = null,
  }) => {
    if (
      form.estado !== 'completada'
    ) {
      return
    }

    const fechaReal =
      fechaHoraAISO(
        form.fecha,
        form.hora ||
          new Date()
            .toTimeString()
            .slice(0, 5)
      )

    if (tipo === 'cambio_agua') {
      const { error } = await supabase
        .from('mantenimientos')
        .insert([
          {
            acuario_id:
              acuario.id,
            fecha:
              fechaReal,
            tipo:
              'Cambio de agua',
            porcentaje_cambio_agua:
              numeroONull(
                form.porcentaje_cambio
              ),
            litros_cambiados:
              numeroONull(
                form.litros_cambiados
              ),
            producto_utilizado:
              valorONull(
                form.producto_utilizado
              ),
            acondicionador:
              valorONull(
                form.acondicionador
              ),
            temperatura_c:
              numeroONull(
                form.temperatura_cambio
              ),
            observaciones:
              valorONull(
                form.observacion
              ),
          },
        ])

      if (error) throw error
    }

    if (tipo === 'medicion_agua') {
      const otros = {}

      if (
        valorONull(
          form.otros_parametros
        )
      ) {
        otros.descripcion =
          form.otros_parametros.trim()
      }

      const { error } = await supabase
        .from('parametros_agua')
        .insert([
          {
            acuario_id:
              acuario.id,
            fecha_medicion:
              fechaReal,
            temperatura_c:
              numeroONull(
                form.temperatura
              ),
            ph:
              numeroONull(
                form.ph
              ),
            amonio_nh3:
              numeroONull(
                form.amonio_nh3
              ),
            nitrito_no2:
              numeroONull(
                form.nitrito_no2
              ),
            nitrato_no3:
              numeroONull(
                form.nitrato_no3
              ),
            kh:
              numeroONull(
                form.kh
              ),
            gh:
              numeroONull(
                form.gh
              ),
            cloro:
              numeroONull(
                form.cloro
              ),
            tds:
              numeroONull(
                form.tds
              ),
            otros,
            observaciones:
              valorONull(
                form.observacion
              ),
          },
        ])

      if (error) throw error
    }

    if (
      tipo === 'mantenimiento' ||
      tipo === 'limpieza'
    ) {
      const { error } = await supabase
        .from('mantenimientos')
        .insert([
          {
            acuario_id:
              acuario.id,
            fecha:
              fechaReal,
            tipo:
              tipo === 'limpieza'
                ? 'Limpieza'
                : 'Mantenimiento',
            limpieza_filtro:
              form.limpieza_filtro,
            limpieza_vidrios:
              form.limpieza_vidrios,
            sifonado:
              form.sifonado,
            poda_plantas:
              form.poda_plantas,
            limpieza_decoracion:
              form.limpieza_decoracion,
            limpieza_bomba:
              form.limpieza_bomba,
            cambio_material_filtrante:
              form.cambio_material_filtrante,
            observaciones:
              [
                form.observacion,
                form.mantenimiento_otro
                  ? form.mantenimiento_otro_texto
                  : '',
              ]
                .filter(Boolean)
                .join(' · ') ||
              null,
          },
        ])

      if (error) throw error
    }

    if (tipo === 'alimentacion') {
      const { error } = await supabase
        .from('alimentaciones')
        .insert([
          {
            acuario_id:
              acuario.id,
            fecha:
              fechaReal,
            alimento:
              valorONull(
                form.alimento
              ) ||
              'Alimentación',
            cantidad:
              valorONull(
                form.cantidad_alimento
              ),
            observaciones:
              valorONull(
                form.observacion
              ),
          },
        ])

      if (error) throw error
    }

    if (
      ['producto', 'fertilizacion', 'medicacion']
        .includes(tipo) &&
      form.producto_id
    ) {
      const dosis =
        tipo === 'medicacion'
          ? numeroONull(
              form.dosis_medicamento
            )
          : numeroONull(
              form.dosis_manual
            ) ??
            dosisCalculada

      if (dosis != null) {
        const { error } = await supabase
          .from('dosis_aplicadas')
          .insert([
            {
              acuario_id:
                acuario.id,
              producto_id:
                form.producto_id,
              regla_dosificacion_id:
                form.regla_dosificacion_id ||
                null,
              fecha_aplicacion:
                fechaReal,
              motivo:
                tipo === 'medicacion'
                  ? 'Medicación'
                  : tipo === 'fertilizacion'
                  ? 'Fertilización'
                  : 'Producto',
              volumen_calculado_litros:
                litrosObjetivoProducto,
              dosis_calculada:
                dosisCalculada != null
                  ? Number(
                      dosisCalculada.toFixed(3)
                    )
                  : null,
              dosis_aplicada:
                Number(dosis),
              unidad:
                tipo === 'medicacion'
                  ? form.unidad_medicamento
                  : reglaSeleccionada
                      ?.dosis_unidad ||
                    form.unidad_manual ||
                    'ml',
              observaciones:
                valorONull(
                  form.observacion
                ),
            },
          ])

        if (error) throw error
      }
    }

    if (
      tipo === 'ciclado' &&
      form.iniciar_ciclo
    ) {
      const { data: cicloActivo } =
        await supabase
          .from('ciclos_acuario')
          .select('id')
          .eq(
            'acuario_id',
            acuario.id
          )
          .eq(
            'estado',
            'activo'
          )
          .maybeSingle()

      if (!cicloActivo?.id) {
        const { error } =
          await supabase
            .from('ciclos_acuario')
            .insert([
              {
                acuario_id:
                  acuario.id,
                nombre:
                  'Ciclado',
                tipo:
                  'ciclado',
                fecha_inicio:
                  form.fecha,
                fecha_fin:
                  null,
                estado:
                  'activo',
                descripcion:
                  valorONull(
                    form.observacion
                  ),
              },
            ])

        if (error) throw error
      }
    }

    if (tareaId) {
      await supabase
        .from('tareas_acuario')
        .update({
          completada_en:
            fechaReal,
          tratamiento_id:
            tratamientoId,
          numero_dosis:
            numeroDosis,
          total_dosis:
            totalDosis,
          updated_at:
            new Date().toISOString(),
        })
        .eq('id', tareaId)
    }
  }

  const guardar = async (e) => {
    e.preventDefault()

    if (
      guardandoRef.current ||
      !acuario?.id ||
      !tipo ||
      !form.titulo.trim()
    ) {
      return
    }

    guardandoRef.current = true
    setGuardando(true)

    try {
      const hora =
        form.hora ||
        '09:00'

      const fechaProgramada =
        fechaHoraAISO(
          form.fecha,
          hora
        )

      const completadaEn =
        form.estado ===
        'completada'
          ? fechaHoraAISO(
              form.fecha,
              form.hora ||
                new Date()
                  .toTimeString()
                  .slice(0, 5)
            )
          : null

      const omitidaEn =
        form.estado ===
        'omitida'
          ? new Date().toISOString()
          : null

      const metadata = {
        origen:
          'registro_manual_etapa2',
        ...metadataEspecifica(),
      }

      // ----------------------------------------------------
      // MEDICACIÓN MULTIDÍA
      // ----------------------------------------------------
      if (tipo === 'medicacion') {
        const duracion =
          Math.max(
            1,
            Number(
              form.duracion_dias
            ) || 1
          )

        const intervalo =
          Math.max(
            1,
            Number(
              form.intervalo_medicacion_dias
            ) || 1
          )

        const totalDosis =
          Math.floor(
            (duracion - 1) /
            intervalo
          ) + 1

        const fechaFin =
          sumarDias(
            form.fecha,
            duracion - 1
          )

        const {
          data: tratamiento,
          error: errorTratamiento,
        } = await supabase
          .from(
            'tratamientos_acuario'
          )
          .insert([
            {
              acuario_id:
                acuario.id,
              producto_id:
                form.producto_id ||
                null,
              nombre:
                valorONull(
                  form.medicamento
                ) ||
                productoSeleccionado
                  ?.nombre ||
                form.titulo.trim(),
              dosis:
                numeroONull(
                  form.dosis_medicamento
                ),
              unidad:
                form.unidad_medicamento ||
                'ml',
              fecha_inicio:
                form.fecha,
              hora:
                form.hora ||
                null,
              duracion_dias:
                duracion,
              intervalo_dias:
                intervalo,
              total_dosis:
                totalDosis,
              estado:
                duracion > 1
                  ? 'activo'
                  : form.estado,
              observaciones:
                valorONull(
                  form.observacion
                ),
            },
          ])
          .select()
          .single()

        if (errorTratamiento) {
          throw errorTratamiento
        }

        if (duracion > 1) {
          const {
            data: rutina,
            error: errorRutina,
          } = await supabase
            .from(
              'rutinas_acuario'
            )
            .insert([
              {
                acuario_id:
                  acuario.id,
                titulo:
                  form.titulo.trim(),
                tipo:
                  'medicacion',
                descripcion:
                  valorONull(
                    form.observacion
                  ),
                frecuencia:
                  'cada_x_dias',
                intervalo,
                hora:
                  form.hora ||
                  null,
                fecha_inicio:
                  form.fecha,
                fecha_fin:
                  fechaFin,
                producto_id:
                  form.producto_id ||
                  null,
                regla_dosificacion_id:
                  form.regla_dosificacion_id ||
                  null,
                aplicar_sobre:
                  form.aplicar_sobre ||
                  null,
                litros:
                  numeroONull(
                    form.litros_producto
                  ),
                recordatorio_minutos:
                  numeroONull(
                    form.recordatorio_minutos
                  ),
                metadata: {
                  ...metadata,
                  tratamiento_id:
                    tratamiento.id,
                  total_dosis:
                    totalDosis,
                  duracion_dias:
                    duracion,
                  intervalo_dias:
                    intervalo,
                },
                activa: true,
              },
            ])
            .select()
            .single()

          if (errorRutina) {
            throw errorRutina
          }

          if (
            form.fecha ===
            fechaLocal()
          ) {
            const {
              data: tarea,
              error: errorTarea,
            } = await supabase
              .from(
                'tareas_acuario'
              )
              .insert([
                {
                  acuario_id:
                    acuario.id,
                  rutina_id:
                    rutina.id,
                  fecha_rutina:
                    form.fecha,
                  tratamiento_id:
                    tratamiento.id,
                  numero_dosis: 1,
                  total_dosis:
                    totalDosis,
                  titulo:
                    `${form.titulo.trim()} · Dosis 1 de ${totalDosis}`,
                  tipo:
                    'medicacion',
                  descripcion:
                    valorONull(
                      form.observacion
                    ),
                  fecha_programada:
                    fechaProgramada,
                  fecha_original:
                    fechaProgramada,
                  estado:
                    form.estado,
                  completada_en:
                    completadaEn,
                  omitida_en:
                    omitidaEn,
                  recordatorio_minutos:
                    numeroONull(
                      form.recordatorio_minutos
                    ),
                  producto_id:
                    form.producto_id ||
                    null,
                  metadata,
                },
              ])
              .select()
              .single()

            if (errorTarea) {
              throw errorTarea
            }

            await registrarRealizacion({
              tareaId:
                tarea.id,
              tratamientoId:
                tratamiento.id,
              numeroDosis: 1,
              totalDosis,
            })
          }
        } else {
          const {
            data: tarea,
            error: errorTarea,
          } = await supabase
            .from(
              'tareas_acuario'
            )
            .insert([
              {
                acuario_id:
                  acuario.id,
                tratamiento_id:
                  tratamiento.id,
                numero_dosis: 1,
                total_dosis: 1,
                titulo:
                  form.titulo.trim(),
                tipo:
                  'medicacion',
                descripcion:
                  valorONull(
                    form.observacion
                  ),
                fecha_programada:
                  fechaProgramada,
                fecha_original:
                  fechaProgramada,
                estado:
                  form.estado,
                completada_en:
                  completadaEn,
                omitida_en:
                  omitidaEn,
                recordatorio_minutos:
                  numeroONull(
                    form.recordatorio_minutos
                  ),
                producto_id:
                  form.producto_id ||
                  null,
                metadata,
              },
            ])
            .select()
            .single()

          if (errorTarea) {
            throw errorTarea
          }

          await registrarRealizacion({
            tareaId:
              tarea.id,
            tratamientoId:
              tratamiento.id,
            numeroDosis: 1,
            totalDosis: 1,
          })
        }

        onMensaje?.(
          duracion > 1
            ? `✅ Tratamiento programado: ${totalDosis} dosis.`
            : '✅ Medicación guardada.'
        )

        await onGuardado?.()
        onCerrar?.()
        return
      }

      // ----------------------------------------------------
      // ACTIVIDADES NORMALES
      // ----------------------------------------------------
      if (
        form.repeticion ===
        'no_repetir'
      ) {
        const {
          data: tarea,
          error,
        } = await supabase
          .from(
            'tareas_acuario'
          )
          .insert([
            {
              acuario_id:
                acuario.id,
              titulo:
                form.titulo.trim(),
              tipo,
              descripcion:
                valorONull(
                  form.observacion
                ),
              fecha_programada:
                fechaProgramada,
              fecha_original:
                fechaProgramada,
              estado:
                form.estado,
              completada_en:
                completadaEn,
              omitida_en:
                omitidaEn,
              recordatorio_minutos:
                numeroONull(
                  form.recordatorio_minutos
                ),
              producto_id:
                ['producto', 'fertilizacion']
                  .includes(tipo)
                  ? form.producto_id ||
                    null
                  : null,
              regla_dosificacion_id:
                ['producto', 'fertilizacion']
                  .includes(tipo)
                  ? form.regla_dosificacion_id ||
                    null
                  : null,
              aplicar_sobre:
                ['producto', 'fertilizacion']
                  .includes(tipo)
                  ? form.aplicar_sobre ||
                    null
                  : null,
              volumen_litros:
                ['producto', 'fertilizacion']
                  .includes(tipo)
                  ? litrosObjetivoProducto
                  : tipo ===
                    'cambio_agua'
                  ? numeroONull(
                      form.litros_cambiados
                    )
                  : null,
              dosis_calculada:
                dosisCalculada != null
                  ? Number(
                      dosisCalculada.toFixed(
                        3
                      )
                    )
                  : null,
              unidad:
                reglaSeleccionada
                  ?.dosis_unidad ||
                form.unidad_manual ||
                null,
              metadata,
            },
          ])
          .select()
          .single()

        if (error) {
          throw error
        }

        await registrarRealizacion({
          tareaId:
            tarea.id,
        })
      } else {
        const [y, m, d] =
          form.fecha
            .split('-')
            .map(Number)

        const base =
          new Date(
            y,
            m - 1,
            d
          )

        let frecuencia =
          form.repeticion

        let intervalo =
          Number(
            form.intervalo_dias
          ) || 1

        if (
          form.repeticion ===
          'cada_2_semanas'
        ) {
          frecuencia =
            'cada_x_dias'
          intervalo = 14
        }

        const {
          data: rutina,
          error,
        } = await supabase
          .from(
            'rutinas_acuario'
          )
          .insert([
            {
              acuario_id:
                acuario.id,
              titulo:
                form.titulo.trim(),
              tipo,
              descripcion:
                valorONull(
                  form.observacion
                ),
              frecuencia,
              intervalo,
              dias_semana:
                frecuencia ===
                'semanal'
                  ? [
                      base.getDay(),
                    ]
                  : null,
              dia_mes:
                frecuencia ===
                'mensual'
                  ? base.getDate()
                  : null,
              hora:
                form.hora ||
                null,
              fecha_inicio:
                form.fecha,
              fecha_fin:
                form.fecha_fin_repeticion ||
                null,
              producto_id:
                ['producto', 'fertilizacion']
                  .includes(tipo)
                  ? form.producto_id ||
                    null
                  : null,
              regla_dosificacion_id:
                ['producto', 'fertilizacion']
                  .includes(tipo)
                  ? form.regla_dosificacion_id ||
                    null
                  : null,
              aplicar_sobre:
                ['producto', 'fertilizacion']
                  .includes(tipo)
                  ? form.aplicar_sobre ||
                    null
                  : null,
              litros:
                ['producto', 'fertilizacion']
                  .includes(tipo)
                  ? litrosObjetivoProducto
                  : tipo ===
                    'cambio_agua'
                  ? numeroONull(
                      form.litros_cambiados
                    )
                  : null,
              recordatorio_minutos:
                numeroONull(
                  form.recordatorio_minutos
                ),
              metadata,
              activa: true,
            },
          ])
          .select()
          .single()

        if (error) {
          throw error
        }

        if (
          form.fecha ===
          fechaLocal()
        ) {
          const {
            data: tarea,
            error: taskError,
          } = await supabase
            .from(
              'tareas_acuario'
            )
            .insert([
              {
                acuario_id:
                  acuario.id,
                rutina_id:
                  rutina.id,
                fecha_rutina:
                  form.fecha,
                titulo:
                  form.titulo.trim(),
                tipo,
                descripcion:
                  valorONull(
                    form.observacion
                  ),
                fecha_programada:
                  fechaProgramada,
                fecha_original:
                  fechaProgramada,
                estado:
                  form.estado,
                completada_en:
                  completadaEn,
                omitida_en:
                  omitidaEn,
                recordatorio_minutos:
                  numeroONull(
                    form.recordatorio_minutos
                  ),
                producto_id:
                  ['producto', 'fertilizacion']
                    .includes(tipo)
                    ? form.producto_id ||
                      null
                    : null,
                regla_dosificacion_id:
                  ['producto', 'fertilizacion']
                    .includes(tipo)
                    ? form.regla_dosificacion_id ||
                      null
                    : null,
                aplicar_sobre:
                  ['producto', 'fertilizacion']
                    .includes(tipo)
                    ? form.aplicar_sobre ||
                      null
                    : null,
                volumen_litros:
                  ['producto', 'fertilizacion']
                    .includes(tipo)
                    ? litrosObjetivoProducto
                    : tipo ===
                      'cambio_agua'
                    ? numeroONull(
                        form.litros_cambiados
                      )
                    : null,
                dosis_calculada:
                  dosisCalculada != null
                    ? Number(
                        dosisCalculada.toFixed(
                          3
                        )
                      )
                    : null,
                unidad:
                  reglaSeleccionada
                    ?.dosis_unidad ||
                  form.unidad_manual ||
                  null,
                metadata,
              },
            ])
            .select()
            .single()

          if (taskError) {
            throw taskError
          }

          await registrarRealizacion({
            tareaId:
              tarea.id,
          })
        }
      }

      onMensaje?.(
        form.estado === 'completada'
          ? '✅ Actividad registrada y completada.'
          : form.fecha > fechaLocal()
          ? '✅ Actividad programada correctamente.'
          : '✅ Actividad guardada correctamente.'
      )

      await onGuardado?.()
      onCerrar?.()
    } catch (error) {
      onMensaje?.(
        `❌ No se pudo guardar la actividad: ${error.message}`
      )
    } finally {
      guardandoRef.current = false
      setGuardando(false)
    }
  }

  const renderCambioAgua = () => (
    <section className="actividad-seccion">
      <div className="actividad-seccion-titulo">
        <span>💧</span>
        <div>
          <strong>Datos del cambio</strong>
          <small>
            Puedes ingresar litros o porcentaje.
          </small>
        </div>
      </div>

      <div className="selector-segmentado">
        <button
          type="button"
          className={
            form.modo_cambio === 'litros'
              ? 'activo'
              : ''
          }
          onClick={() =>
            setForm({
              ...form,
              modo_cambio: 'litros',
            })
          }
        >
          Litros
        </button>

        <button
          type="button"
          className={
            form.modo_cambio === 'porcentaje'
              ? 'activo'
              : ''
          }
          onClick={() =>
            setForm({
              ...form,
              modo_cambio:
                'porcentaje',
            })
          }
        >
          Porcentaje
        </button>
      </div>

      <div className="fila-formulario">
        <div className="campo-formulario">
          <label>Litros cambiados</label>
          <input
            type="number"
            min="0"
            step="0.1"
            value={
              form.litros_cambiados
            }
            onChange={(e) => {
              const litros =
                e.target.value

              setForm({
                ...form,
                litros_cambiados:
                  litros,
                porcentaje_cambio:
                  calcularPorcentajeDesdeLitros(
                    litros
                  ),
              })
            }}
          />
        </div>

        <div className="campo-formulario">
          <label>Porcentaje %</label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            value={
              form.porcentaje_cambio
            }
            onChange={(e) => {
              const porcentaje =
                e.target.value

              setForm({
                ...form,
                porcentaje_cambio:
                  porcentaje,
                litros_cambiados:
                  calcularCambioDesdePorcentaje(
                    porcentaje
                  ),
              })
            }}
          />
        </div>
      </div>

      {acuario?.volumen_litros && (
        <div className="actividad-calculo-info">
          Volumen del acuario:{' '}
          <strong>
            {acuario.volumen_litros} L
          </strong>
        </div>
      )}

      <div className="fila-formulario">
        <div className="campo-formulario">
          <label>
            Producto utilizado
          </label>
          <input
            value={
              form.producto_utilizado
            }
            onChange={(e) =>
              setForm({
                ...form,
                producto_utilizado:
                  e.target.value,
              })
            }
            placeholder="Opcional"
          />
        </div>

        <div className="campo-formulario">
          <label>Acondicionador</label>
          <input
            value={
              form.acondicionador
            }
            onChange={(e) =>
              setForm({
                ...form,
                acondicionador:
                  e.target.value,
              })
            }
            placeholder="Opcional"
          />
        </div>
      </div>

      <div className="campo-formulario">
        <label>
          Temperatura del agua
          <small> (opcional)</small>
        </label>
        <input
          type="number"
          step="0.1"
          value={
            form.temperatura_cambio
          }
          onChange={(e) =>
            setForm({
              ...form,
              temperatura_cambio:
                e.target.value,
            })
          }
        />
      </div>
    </section>
  )

  const renderMedicion = () => (
    <section className="actividad-seccion">
      <div className="actividad-seccion-titulo">
        <span>🧪</span>
        <div>
          <strong>Parámetros medidos</strong>
          <small>
            Completa solamente lo que hayas medido.
          </small>
        </div>
      </div>

      <div className="parametros-actividad-grid">
        {[
          ['temperatura', 'Temperatura', '°C'],
          ['ph', 'pH', ''],
          ['amonio_nh3', 'NH3 / NH4', 'mg/L'],
          ['nitrito_no2', 'NO2', 'mg/L'],
          ['nitrato_no3', 'NO3', 'mg/L'],
          ['kh', 'KH', '°dH'],
          ['gh', 'GH', '°dH'],
          ['cloro', 'Cloro', 'mg/L'],
          ['tds', 'TDS', 'ppm'],
        ].map(
          ([campo, etiqueta, unidad]) => (
            <label
              className="parametro-actividad"
              key={campo}
            >
              <span>{etiqueta}</span>
              <div>
                <input
                  type="number"
                  step="0.01"
                  value={form[campo]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      [campo]:
                        e.target.value,
                    })
                  }
                />
                {unidad && (
                  <small>{unidad}</small>
                )}
              </div>
            </label>
          )
        )}
      </div>

      <div className="campo-formulario">
        <label>Otros parámetros</label>
        <input
          value={
            form.otros_parametros
          }
          onChange={(e) =>
            setForm({
              ...form,
              otros_parametros:
                e.target.value,
            })
          }
          placeholder="Ej. PO4 0.5 mg/L"
        />
      </div>
    </section>
  )

  const renderMantenimiento = () => {
    const opciones = [
      [
        'limpieza_filtro',
        '🧽',
        'Limpieza de filtro',
      ],
      [
        'limpieza_vidrios',
        '✨',
        'Cristales',
      ],
      ['sifonado', '🌀', 'Sifonado'],
      [
        'limpieza_decoracion',
        '🪨',
        'Decoración',
      ],
      [
        'limpieza_bomba',
        '⚙️',
        'Bomba',
      ],
      [
        'cambio_material_filtrante',
        '🧺',
        'Material filtrante',
      ],
      [
        'poda_plantas',
        '✂️',
        'Poda de plantas',
      ],
      [
        'mantenimiento_otro',
        '➕',
        'Otro',
      ],
    ]

    return (
      <section className="actividad-seccion">
        <div className="actividad-seccion-titulo">
          <span>
            {tipo === 'limpieza'
              ? '🧹'
              : '🧽'}
          </span>

          <div>
            <strong>
              ¿Qué realizaste?
            </strong>
            <small>
              Puedes seleccionar varias opciones.
            </small>
          </div>
        </div>

        <div className="check-actividad-grid">
          {opciones.map(
            ([campo, icono, nombre]) => (
              <button
                type="button"
                key={campo}
                className={
                  form[campo]
                    ? 'activo'
                    : ''
                }
                onClick={() =>
                  toggleMantenimiento(
                    campo
                  )
                }
              >
                <span>{icono}</span>
                <strong>{nombre}</strong>
                <i>
                  {form[campo]
                    ? '✓'
                    : ''}
                </i>
              </button>
            )
          )}
        </div>

        {form.mantenimiento_otro && (
          <div className="campo-formulario">
            <label>Otro</label>
            <input
              value={
                form.mantenimiento_otro_texto
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  mantenimiento_otro_texto:
                    e.target.value,
                })
              }
            />
          </div>
        )}
      </section>
    )
  }

  const renderProducto = () => (
    <section className="actividad-seccion">
      <div className="actividad-seccion-titulo">
        <span>
          {tipo === 'fertilizacion'
            ? '🌿'
            : '🧴'}
        </span>
        <div>
          <strong>
            Producto y dosis
          </strong>
          <small>
            Usa una regla registrada o escribe la dosis real.
          </small>
        </div>
      </div>

      <div className="campo-formulario">
        <label>Producto</label>
        <select
          value={form.producto_id}
          onChange={(e) =>
            setForm({
              ...form,
              producto_id:
                e.target.value,
              regla_dosificacion_id:
                '',
            })
          }
        >
          <option value="">
            Seleccionar
          </option>
          {productos.map(
            (producto) => (
              <option
                key={producto.id}
                value={producto.id}
              >
                {producto.nombre}
                {producto.marca
                  ? ` · ${producto.marca}`
                  : ''}
              </option>
            )
          )}
        </select>
      </div>

      {reglasProducto.length > 0 && (
        <div className="campo-formulario">
          <label>
            Regla de dosificación
          </label>
          <select
            value={
              form.regla_dosificacion_id
            }
            onChange={(e) =>
              setForm({
                ...form,
                regla_dosificacion_id:
                  e.target.value,
              })
            }
          >
            <option value="">
              Sin regla
            </option>
            {reglasProducto.map(
              (regla) => (
                <option
                  key={regla.id}
                  value={regla.id}
                >
                  {regla.nombre} ·{' '}
                  {regla.dosis_cantidad}{' '}
                  {regla.dosis_unidad}{' '}
                  /{' '}
                  {regla.volumen_referencia_litros}{' '}
                  L
                </option>
              )
            )}
          </select>
        </div>
      )}

      <div className="fila-formulario">
        <div className="campo-formulario">
          <label>Aplicar sobre</label>
          <select
            value={
              form.aplicar_sobre
            }
            onChange={(e) =>
              setForm({
                ...form,
                aplicar_sobre:
                  e.target.value,
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
            value={
              form.litros_producto
            }
            onChange={(e) =>
              setForm({
                ...form,
                litros_producto:
                  e.target.value,
              })
            }
            placeholder={
              form.aplicar_sobre ===
              'volumen_total'
                ? String(
                    acuario?.volumen_litros ??
                      ''
                  )
                : ''
            }
          />
        </div>
      </div>

      {dosisCalculada != null && (
        <div className="dosis-preview-etapa2">
          <span>
            Dosis calculada
          </span>
          <strong>
            {dosisCalculada.toFixed(
              2
            )}{' '}
            {reglaSeleccionada
              ?.dosis_unidad ||
              form.unidad_manual}
          </strong>
        </div>
      )}

      <div className="fila-formulario">
        <div className="campo-formulario">
          <label>
            Dosis realmente aplicada
          </label>
          <input
            type="number"
            step="0.01"
            value={
              form.dosis_manual
            }
            onChange={(e) =>
              setForm({
                ...form,
                dosis_manual:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="campo-formulario">
          <label>Unidad</label>
          <select
            value={
              form.unidad_manual
            }
            onChange={(e) =>
              setForm({
                ...form,
                unidad_manual:
                  e.target.value,
              })
            }
          >
            <option value="ml">
              ml
            </option>
            <option value="g">
              g
            </option>
            <option value="mg">
              mg
            </option>
            <option value="gotas">
              gotas
            </option>
          </select>
        </div>
      </div>
    </section>
  )

  const renderMedicacion = () => (
    <section className="actividad-seccion">
      <div className="actividad-seccion-titulo">
        <span>💊</span>
        <div>
          <strong>Tratamiento</strong>
          <small>
            NexoWeb guardará una regla y mostrará las dosis en el calendario.
          </small>
        </div>
      </div>

      <div className="campo-formulario">
        <label>Medicamento</label>
        <input
          value={
            form.medicamento
          }
          onChange={(e) =>
            setForm({
              ...form,
              medicamento:
                e.target.value,
            })
          }
          placeholder="Nombre del medicamento"
        />
      </div>

      <div className="campo-formulario">
        <label>
          Producto registrado
          <small> (opcional)</small>
        </label>
        <select
          value={form.producto_id}
          onChange={(e) =>
            setForm({
              ...form,
              producto_id:
                e.target.value,
            })
          }
        >
          <option value="">
            Sin producto asociado
          </option>
          {productos.map(
            (producto) => (
              <option
                key={producto.id}
                value={producto.id}
              >
                {producto.nombre}
              </option>
            )
          )}
        </select>
      </div>

      <div className="fila-formulario">
        <div className="campo-formulario">
          <label>Dosis</label>
          <input
            type="number"
            step="0.01"
            value={
              form.dosis_medicamento
            }
            onChange={(e) =>
              setForm({
                ...form,
                dosis_medicamento:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="campo-formulario">
          <label>Unidad</label>
          <select
            value={
              form.unidad_medicamento
            }
            onChange={(e) =>
              setForm({
                ...form,
                unidad_medicamento:
                  e.target.value,
              })
            }
          >
            <option value="ml">
              ml
            </option>
            <option value="mg">
              mg
            </option>
            <option value="g">
              g
            </option>
            <option value="gotas">
              gotas
            </option>
            <option value="tableta">
              tableta
            </option>
          </select>
        </div>
      </div>

      <div className="fila-formulario">
        <div className="campo-formulario">
          <label>
            Duración (días)
          </label>
          <input
            type="number"
            min="1"
            value={
              form.duracion_dias
            }
            onChange={(e) =>
              setForm({
                ...form,
                duracion_dias:
                  e.target.value,
              })
            }
          />
        </div>

        <div className="campo-formulario">
          <label>
            Aplicar cada
          </label>
          <div className="input-con-sufijo">
            <input
              type="number"
              min="1"
              value={
                form.intervalo_medicacion_dias
              }
              onChange={(e) =>
                setForm({
                  ...form,
                  intervalo_medicacion_dias:
                    e.target.value,
                })
              }
            />
            <span>días</span>
          </div>
        </div>
      </div>

      <div className="tratamiento-resumen">
        <span>
          Programación estimada
        </span>
        <strong>
          {Math.floor(
            (
              Math.max(
                1,
                Number(
                  form.duracion_dias
                ) || 1
              ) - 1
            ) /
            Math.max(
              1,
              Number(
                form.intervalo_medicacion_dias
              ) || 1
            )
          ) + 1}{' '}
          dosis
        </strong>
      </div>
    </section>
  )

  const renderCiclado = () => (
    <section className="actividad-seccion">
      <div className="actividad-seccion-titulo">
        <span>🔄</span>
        <div>
          <strong>
            Seguimiento del ciclado
          </strong>
          <small>
            Puedes iniciar un ciclo y definir qué parámetros quieres controlar.
          </small>
        </div>
      </div>

      <div className="campo-formulario">
        <label>
          Fecha estimada de finalización
        </label>
        <input
          type="date"
          value={
            form.fecha_fin_ciclado
          }
          onChange={(e) =>
            setForm({
              ...form,
              fecha_fin_ciclado:
                e.target.value,
            })
          }
        />
      </div>

      <label className="check-linea-etapa2">
        <input
          type="checkbox"
          checked={
            form.iniciar_ciclo
          }
          onChange={(e) =>
            setForm({
              ...form,
              iniciar_ciclo:
                e.target.checked,
            })
          }
        />
        <span>
          Iniciar / registrar el ciclo en este acuario
        </span>
      </label>

      <div className="campo-formulario">
        <label>
          Parámetros a controlar
        </label>

        <div className="chips-parametros">
          {[
            ['temperatura', 'Temp'],
            ['ph', 'pH'],
            ['nh3', 'NH3/NH4'],
            ['no2', 'NO2'],
            ['no3', 'NO3'],
            ['kh', 'KH'],
            ['gh', 'GH'],
          ].map(
            ([id, nombre]) => (
              <button
                type="button"
                key={id}
                className={
                  form.parametros_ciclado.includes(
                    id
                  )
                    ? 'activo'
                    : ''
                }
                onClick={() =>
                  toggleParametroCiclado(
                    id
                  )
                }
              >
                {nombre}
              </button>
            )
          )}
        </div>
      </div>
    </section>
  )

  const renderAlimentacion = () => (
    <section className="actividad-seccion">
      <div className="actividad-seccion-titulo">
        <span>🍽️</span>
        <div>
          <strong>Alimentación</strong>
          <small>
            Registra alimento y cantidad.
          </small>
        </div>
      </div>

      <div className="fila-formulario">
        <div className="campo-formulario">
          <label>Alimento</label>
          <input
            value={form.alimento}
            onChange={(e) =>
              setForm({
                ...form,
                alimento:
                  e.target.value,
              })
            }
            placeholder="Ej. pellets"
          />
        </div>

        <div className="campo-formulario">
          <label>Cantidad</label>
          <input
            value={
              form.cantidad_alimento
            }
            onChange={(e) =>
              setForm({
                ...form,
                cantidad_alimento:
                  e.target.value,
              })
            }
            placeholder="Ej. 1 pizca"
          />
        </div>
      </div>
    </section>
  )

  const renderEspecifico = () => {
    if (tipo === 'cambio_agua') {
      return renderCambioAgua()
    }

    if (tipo === 'medicion_agua') {
      return renderMedicion()
    }

    if (
      tipo === 'mantenimiento' ||
      tipo === 'limpieza'
    ) {
      return renderMantenimiento()
    }

    if (
      tipo === 'producto' ||
      tipo === 'fertilizacion'
    ) {
      return renderProducto()
    }

    if (tipo === 'medicacion') {
      return renderMedicacion()
    }

    if (tipo === 'ciclado') {
      return renderCiclado()
    }

    if (tipo === 'alimentacion') {
      return renderAlimentacion()
    }

    return null
  }

  return (
    <div
      className="modal-overlay registro-sheet-overlay"
      onClick={() =>
        !guardando &&
        onCerrar?.()
      }
    >
      <div
        className="registro-sheet registro-sheet-etapa2"
        onClick={(e) =>
          e.stopPropagation()
        }
      >
        <div className="registro-sheet-handle" />

        <div className="registro-sheet-cabecera">
          <div>
            <h2>
              {pasoFormulario
                ? actividad?.nombre
                : '¿Qué quieres registrar?'}
            </h2>
            <p>
              {pasoFormulario
                ? actividad?.detalle
                : 'Selecciona una actividad.'}
            </p>
          </div>

          <button
            className="boton-cerrar-modal"
            disabled={guardando}
            onClick={() =>
              onCerrar?.()
            }
          >
            ×
          </button>
        </div>

        {!pasoFormulario ? (
          <div className="selector-actividades-grid selector-actividades-etapa2">
            {TIPOS_ACTIVIDAD.map(
              (item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    seleccionar(item)
                  }
                >
                  <span>
                    {item.icono}
                  </span>

                  <div>
                    <strong>
                      {item.nombre}
                    </strong>
                    <small>
                      {item.detalle}
                    </small>
                  </div>
                </button>
              )
            )}
          </div>
        ) : (
          <form
            className="form-actividad-etapa2"
            onSubmit={guardar}
          >
            <CampoComun
              form={form}
              setForm={setForm}
              manana={manana}
              ocultarRepeticion={
                tipo === 'medicacion'
              }
            />

            {renderEspecifico()}

            <div className="acciones-modal acciones-modal-sticky">
              <button
                type="button"
                className="boton-cancelar"
                disabled={guardando}
                onClick={() =>
                  setPasoFormulario(
                    false
                  )
                }
              >
                Atrás
              </button>

              <button
                className="boton-principal"
                disabled={guardando}
              >
                {guardando
                  ? 'Guardando...'
                  : form.fecha >
                    fechaLocal()
                  ? 'Guardar y programar'
                  : form.estado ===
                    'completada'
                  ? 'Registrar como realizada'
                  : 'Guardar'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export function CalendarioActividades({
  acuario,
  onAgregarActividad,
}) {
  const [mes, setMes] = useState(() => {
    const hoy = new Date()

    return new Date(
      hoy.getFullYear(),
      hoy.getMonth(),
      1
    )
  })

  const [
    fechaSeleccionada,
    setFechaSeleccionada,
  ] = useState(
    fechaLocal()
  )

  const [tareas, setTareas] =
    useState([])

  const [rutinas, setRutinas] =
    useState([])

  const [eventoDetalle, setEventoDetalle] =
    useState(null)

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

  const desde =
    fechaLocal(inicioGrilla)

  const hasta =
    fechaLocal(finGrilla)

  const cargar = async () => {
    const inicioISO =
      fechaHoraAISO(
        desde,
        '00:00'
      )

    const finISO =
      fechaHoraAISO(
        sumarDias(
          hasta,
          1
        ),
        '00:00'
      )

    const [t, r] =
      await Promise.all([
        supabase
          .from(
            'tareas_acuario'
          )
          .select('*')
          .eq(
            'acuario_id',
            acuario.id
          )
          .gte(
            'fecha_programada',
            inicioISO
          )
          .lt(
            'fecha_programada',
            finISO
          )
          .order(
            'fecha_programada'
          ),

        supabase
          .from(
            'rutinas_acuario'
          )
          .select('*')
          .eq(
            'acuario_id',
            acuario.id
          )
          .eq(
            'activa',
            true
          ),
      ])

    setTareas(t.data ?? [])
    setRutinas(r.data ?? [])
  }

  useEffect(() => {
    cargar()
  }, [
    acuario.id,
    mes.getMonth(),
    mes.getFullYear(),
  ])

  const eventos = useMemo(() => {
    const manuales =
      tareas.map(
        (tarea) => ({
          id: tarea.id,
          fecha:
            fechaLocal(
              new Date(
                tarea.fecha_programada
              )
            ),
          tipo: tarea.tipo,
          titulo: tarea.titulo,
          estado:
            tarea.estado ||
            'pendiente',
          descripcion:
            tarea.descripcion,
          hora:
            tarea.fecha_programada,
          origen: 'tarea',
          metadata:
            tarea.metadata ||
            {},
          tarea,
        })
      )

    const recurrentes = []
    let cursor =
      new Date(
        inicioGrilla
      )

    while (
      cursor <=
      finGrilla
    ) {
      const fechaTexto =
        fechaLocal(cursor)

      for (
        const rutina
        of rutinas
      ) {
        if (
          rutinaOcurre(
            rutina,
            fechaTexto
          )
        ) {
          const yaMaterializada =
            tareas.some(
              (tarea) =>
                tarea.rutina_id ===
                  rutina.id &&
                tarea.fecha_rutina ===
                  fechaTexto
            )

          if (
            !yaMaterializada
          ) {
            let titulo =
              rutina.titulo

            const metadata =
              rutina.metadata ||
              {}

            if (
              rutina.tipo ===
                'medicacion' &&
              metadata.total_dosis
            ) {
              const numero =
                Math.floor(
                  diferenciaDias(
                    rutina.fecha_inicio,
                    fechaTexto
                  ) /
                  Math.max(
                    1,
                    Number(
                      rutina.intervalo
                    ) || 1
                  )
                ) + 1

              titulo =
                `${rutina.titulo} · ` +
                `Dosis ${numero} de ${metadata.total_dosis}`
            }

            recurrentes.push({
              id:
                `${rutina.id}-${fechaTexto}`,
              fecha:
                fechaTexto,
              tipo:
                rutina.tipo,
              titulo,
              estado:
                'pendiente',
              descripcion:
                rutina.descripcion,
              hora:
                rutina.hora
                  ? `${fechaTexto}T${rutina.hora}`
                  : null,
              origen:
                'rutina',
              metadata,
              rutina,
            })
          }
        }
      }

      cursor.setDate(
        cursor.getDate() + 1
      )
    }

    return [
      ...manuales,
      ...recurrentes,
    ]
  }, [
    tareas,
    rutinas,
    desde,
    hasta,
  ])

  const eventosDia =
    eventos
      .filter(
        (evento) =>
          evento.fecha ===
          fechaSeleccionada
      )
      .sort(
        (a, b) =>
          String(
            a.hora || ''
          ).localeCompare(
            String(
              b.hora || ''
            )
          )
      )

  const dias = []
  let cursor =
    new Date(
      inicioGrilla
    )

  while (
    cursor <=
    finGrilla
  ) {
    dias.push(
      new Date(cursor)
    )

    cursor.setDate(
      cursor.getDate() + 1
    )
  }

  const colorEvento = (evento) => {
    if (
      evento.estado ===
      'completada'
    ) {
      return 'completada'
    }

    if (
      [
        'cambio_agua',
        'medicion_agua',
      ].includes(
        evento.tipo
      )
    ) {
      return 'azul'
    }

    if (
      [
        'mantenimiento',
        'limpieza',
        'fertilizacion',
      ].includes(
        evento.tipo
      )
    ) {
      return 'verde'
    }

    if (
      evento.tipo ===
      'medicacion'
    ) {
      return 'rosa'
    }

    return 'naranja'
  }

  const nombreMes =
    mes.toLocaleDateString(
      'es-EC',
      {
        month: 'long',
        year: 'numeric',
      }
    )

  const tituloDia =
    new Date(
      `${fechaSeleccionada}T12:00:00`
    ).toLocaleDateString(
      'es-EC',
      {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }
    )

  return (
    <div>
      <div className="cabecera-modulo">
        <div>
          <h2>Calendario</h2>
          <p>
            Consulta las actividades programadas y selecciona un día para verlas.
          </p>
        </div>
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

        <strong>
          {nombreMes}
        </strong>

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
          <span key={dia}>
            {dia}
          </span>
        ))}
      </div>

      <div className="calendario-grid calendario-grid-etapa1">
        {dias.map((dia) => {
          const texto =
            fechaLocal(dia)

          const delDia =
            eventos.filter(
              (evento) =>
                evento.fecha ===
                texto
            )

          return (
            <button
              type="button"
              className={
                `calendario-dia calendario-dia-compacto ` +
                `${
                  dia.getMonth() ===
                  mes.getMonth()
                    ? ''
                    : 'fuera'
                } ` +
                `${
                  texto === fechaLocal()
                    ? 'hoy'
                    : ''
                } ` +
                `${
                  texto ===
                  fechaSeleccionada
                    ? 'seleccionado'
                    : ''
                }`
              }
              key={texto}
              onClick={() =>
                setFechaSeleccionada(
                  texto
                )
              }
            >
              <strong>
                {dia.getDate()}
              </strong>

              {delDia.length > 0 && (
                <div className="indicadores-calendario">
                  {delDia
                    .slice(0, 3)
                    .map(
                      (
                        evento,
                        indice
                      ) => (
                        <span
                          key={`${evento.id}-${indice}`}
                          className={
                            colorEvento(
                              evento
                            )
                          }
                        />
                      )
                    )}

                  {delDia.length > 3 && (
                    <small>
                      +
                      {delDia.length -
                        3}
                    </small>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      <section className="detalle-dia-calendario">
        <div className="detalle-dia-cabecera">
          <div>
            <span>
              Día seleccionado
            </span>
            <h3>
              {tituloDia}
            </h3>
          </div>

          <strong>
            {eventosDia.length}{' '}
            {eventosDia.length === 1
              ? 'actividad'
              : 'actividades'}
          </strong>
        </div>

        {eventosDia.length === 0 ? (
          <div className="estado-vacio-dia">
            <span>📭</span>

            <h4>
              No hay actividades para este día.
            </h4>

            <button
              className="boton-principal"
              onClick={() =>
                onAgregarActividad?.(
                  fechaSeleccionada
                )
              }
            >
              + Agregar actividad
            </button>
          </div>
        ) : (
          <div className="lista-actividades-dia">
            {eventosDia.map(
              (evento) => (
                <article
                  className="actividad-dia-card"
                  key={`${evento.origen}-${evento.id}`}
                >
                  <div className="actividad-dia-hora">
                    {evento.hora
                      ? new Date(
                          evento.hora
                        ).toLocaleTimeString(
                          'es-EC',
                          {
                            hour:
                              '2-digit',
                            minute:
                              '2-digit',
                          }
                        )
                      : '—'}
                  </div>

                  <div className="actividad-dia-info">
                    <strong>
                      {tipoIcono(
                        evento.tipo
                      )}{' '}
                      {evento.titulo}
                    </strong>

                    {evento.descripcion && (
                      <p>
                        {evento.descripcion}
                      </p>
                    )}

                    <span
                      className={`badge-estado-actividad ${evento.estado}`}
                    >
                      {evento.estado}
                    </span>
                  </div>

                  <button
                    className="boton-claro"
                    onClick={() =>
                      setEventoDetalle(
                        evento
                      )
                    }
                  >
                    Ver
                  </button>
                </article>
              )
            )}

            <button
              className="boton-agregar-dia"
              onClick={() =>
                onAgregarActividad?.(
                  fechaSeleccionada
                )
              }
            >
              + Agregar actividad para este día
            </button>
          </div>
        )}
      </section>

      {eventoDetalle && (
        <div
          className="modal-overlay"
          onClick={() =>
            setEventoDetalle(null)
          }
        >
          <div
            className="modal-actividad-detalle"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            <div className="confirmacion-icono">
              {tipoIcono(
                eventoDetalle.tipo
              )}
            </div>

            <h2>
              {eventoDetalle.titulo}
            </h2>

            <div className="detalle-actividad-datos">
              <div>
                <span>Fecha</span>
                <strong>
                  {eventoDetalle.fecha}
                </strong>
              </div>

              <div>
                <span>Estado</span>
                <strong>
                  {eventoDetalle.estado}
                </strong>
              </div>

              {eventoDetalle.descripcion && (
                <div className="detalle-ancho">
                  <span>
                    Observación
                  </span>
                  <strong>
                    {
                      eventoDetalle.descripcion
                    }
                  </strong>
                </div>
              )}

              {eventoDetalle.metadata
                ?.litros_cambiados !=
                null && (
                <div>
                  <span>Litros</span>
                  <strong>
                    {
                      eventoDetalle
                        .metadata
                        .litros_cambiados
                    }{' '}
                    L
                  </strong>
                </div>
              )}

              {eventoDetalle.metadata
                ?.dosis != null && (
                <div>
                  <span>Dosis</span>
                  <strong>
                    {
                      eventoDetalle
                        .metadata.dosis
                    }{' '}
                    {
                      eventoDetalle
                        .metadata.unidad
                    }
                  </strong>
                </div>
              )}
            </div>

            <button
              className="boton-principal boton-ancho"
              onClick={() =>
                setEventoDetalle(null)
              }
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
