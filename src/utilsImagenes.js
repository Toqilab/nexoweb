import { supabase } from './lib/supabase.js'

export const formatoBytes = (bytes = 0) => {
  if (!bytes) return '0 KB'

  const unidades = ['B', 'KB', 'MB', 'GB']
  const indice = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    unidades.length - 1
  )

  const valor = bytes / Math.pow(1024, indice)

  return `${valor.toFixed(indice === 0 ? 0 : 1)} ${unidades[indice]}`
}

const extensionArchivo = (archivo) => {
  const porNombre = archivo?.name?.split('.').pop()?.toLowerCase()

  if (porNombre && porNombre.length <= 5) {
    return porNombre
  }

  const porTipo = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/heic': 'heic',
    'image/heif': 'heif',
  }

  return porTipo[archivo?.type] || 'jpg'
}

const cargarConImageElement = (archivo) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const imagen = new Image()

    imagen.onload = () => {
      URL.revokeObjectURL(url)
      resolve(imagen)
    }

    imagen.onerror = () => {
      URL.revokeObjectURL(url)
      reject(
        new Error(
          'El navegador no pudo decodificar la imagen seleccionada.'
        )
      )
    }

    imagen.src = url
  })

const dibujarEnCanvas = async (
  archivo,
  {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.72,
    type = 'image/webp',
  } = {}
) => {
  let fuente = null
  let widthOriginal = 0
  let heightOriginal = 0
  let cerrarFuente = null

  // Método 1: createImageBitmap (rápido cuando el navegador lo soporta)
  try {
    if ('createImageBitmap' in window) {
      const bitmap = await createImageBitmap(archivo)
      fuente = bitmap
      widthOriginal = bitmap.width
      heightOriginal = bitmap.height
      cerrarFuente = () => bitmap.close?.()
    }
  } catch (error) {
    console.warn(
      'createImageBitmap no pudo decodificar la foto. Se usará un método alternativo.',
      error
    )
  }

  // Método 2: HTMLImageElement. Más compatible con navegadores móviles.
  if (!fuente) {
    const imagen = await cargarConImageElement(archivo)
    fuente = imagen
    widthOriginal =
      imagen.naturalWidth ||
      imagen.width

    heightOriginal =
      imagen.naturalHeight ||
      imagen.height
  }

  if (!widthOriginal || !heightOriginal) {
    cerrarFuente?.()
    throw new Error('No se pudieron obtener las dimensiones de la imagen.')
  }

  const escala = Math.min(
    1,
    maxWidth / widthOriginal,
    maxHeight / heightOriginal
  )

  const width = Math.max(
    1,
    Math.round(widthOriginal * escala)
  )

  const height = Math.max(
    1,
    Math.round(heightOriginal * escala)
  )

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d', {
    alpha: false,
  })

  if (!ctx) {
    cerrarFuente?.()
    throw new Error('El navegador no pudo preparar el procesador de imagen.')
  }

  // Fondo blanco para PNG con transparencia.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(fuente, 0, 0, width, height)

  cerrarFuente?.()

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (resultado) => {
        if (resultado) {
          resolve(resultado)
        } else {
          reject(
            new Error(
              'El navegador no pudo convertir la imagen.'
            )
          )
        }
      },
      type,
      quality
    )
  })

  return new File(
    [blob],
    `${Date.now()}.webp`,
    {
      type: blob.type || type,
    }
  )
}

/**
 * Intenta optimizar una imagen.
 * Si el teléfono/navegador no puede decodificarla, devuelve el original
 * para que la carga no se bloquee.
 */
export const procesarImagenSeguro = async (
  archivo,
  {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.72,
    type = 'image/webp',
    usarOriginalSiFalla = true,
  } = {}
) => {
  if (!archivo) return null

  if (!archivo.type?.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen.')
  }

  try {
    const optimizada = await dibujarEnCanvas(
      archivo,
      {
        maxWidth,
        maxHeight,
        quality,
        type,
      }
    )

    return {
      archivo: optimizada,
      optimizada: true,
      mensaje: null,
    }
  } catch (error) {
    console.warn(
      'No fue posible optimizar la imagen. Se intentará usar el archivo original.',
      error
    )

    if (!usarOriginalSiFalla) {
      throw error
    }

    return {
      archivo,
      optimizada: false,
      mensaje:
        'La foto no pudo comprimirse en este dispositivo; se usó el archivo original.',
    }
  }
}

// Mantener compatibilidad con el resto del proyecto.
export const procesarImagen = async (
  archivo,
  opciones = {}
) => {
  const resultado = await procesarImagenSeguro(
    archivo,
    opciones
  )

  return resultado?.archivo || null
}

export const subirImagenPublica = async ({
  archivo,
  usuarioId,
  acuarioId,
  carpeta = 'fotos',
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.72,
  usarOriginalSiFalla = true,
}) => {
  if (
    !archivo ||
    !usuarioId ||
    !acuarioId
  ) {
    return null
  }

  const procesada = await procesarImagenSeguro(
    archivo,
    {
      maxWidth,
      maxHeight,
      quality,
      usarOriginalSiFalla,
    }
  )

  const archivoSubida = procesada.archivo

  const extension = procesada.optimizada
    ? 'webp'
    : extensionArchivo(archivoSubida)

  const nombre =
    `${Date.now()}-` +
    `${Math.random()
      .toString(36)
      .slice(2, 8)}.${extension}`

  const ruta =
    `${usuarioId}/` +
    `${acuarioId}/` +
    `${carpeta}/` +
    `${nombre}`

  const { error } =
    await supabase.storage
      .from('fotos-acuario')
      .upload(
        ruta,
        archivoSubida,
        {
          cacheControl: '3600',
          upsert: false,
          contentType:
            archivoSubida.type ||
            archivo.type ||
            'application/octet-stream',
        }
      )

  if (error) {
    throw error
  }

  const { data } =
    supabase.storage
      .from('fotos-acuario')
      .getPublicUrl(ruta)

  return {
    url: data.publicUrl,
    ruta,
    archivo: archivoSubida,
    optimizada: procesada.optimizada,
    mensaje: procesada.mensaje,
  }
}
