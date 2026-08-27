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

export const procesarImagen = async (
  archivo,
  {
    maxWidth = 1280,
    maxHeight = 1280,
    quality = 0.72,
    type = 'image/webp',
  } = {}
) => {
  if (!archivo) return null

  if (!archivo.type?.startsWith('image/')) {
    throw new Error('El archivo seleccionado no es una imagen.')
  }

  const bitmap = await createImageBitmap(archivo)

  const escala = Math.min(
    1,
    maxWidth / bitmap.width,
    maxHeight / bitmap.height
  )

  const width = Math.max(
    1,
    Math.round(bitmap.width * escala)
  )

  const height = Math.max(
    1,
    Math.round(bitmap.height * escala)
  )

  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d', {
    alpha: false,
  })

  ctx.drawImage(
    bitmap,
    0,
    0,
    width,
    height
  )

  bitmap.close?.()

  const blob = await new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (resultado) => {
          if (resultado) {
            resolve(resultado)
          } else {
            reject(
              new Error(
                'No se pudo procesar la imagen.'
              )
            )
          }
        },
        type,
        quality
      )
    }
  )

  return new File(
    [blob],
    `${Date.now()}.webp`,
    {
      type: blob.type,
    }
  )
}

export const subirImagenPublica = async ({
  archivo,
  usuarioId,
  acuarioId,
  carpeta = 'fotos',
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.72,
}) => {
  if (
    !archivo ||
    !usuarioId ||
    !acuarioId
  ) {
    return null
  }

  const optimizada = await procesarImagen(
    archivo,
    {
      maxWidth,
      maxHeight,
      quality,
    }
  )

  const nombre =
    `${Date.now()}-` +
    `${Math.random()
      .toString(36)
      .slice(2, 8)}.webp`

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
        optimizada,
        {
          cacheControl: '3600',
          upsert: false,
          contentType: 'image/webp',
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
    archivo: optimizada,
  }
}
