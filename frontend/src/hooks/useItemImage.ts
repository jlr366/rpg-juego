import { useState, useEffect } from 'react'
import { Item } from '../types'

const PX_PREFIX = 'pixelart_v1_'
const MY_PREFIX = 'meshy_v1_'

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_')
}

// PixelLab y Meshy.ai ya no estan disponibles (suscripciones canceladas).
// Este hook solo lee imagenes que hayan quedado cacheadas en localStorage
// de cuando esas APIs si funcionaban; ya no genera nuevas.
export async function prefetchItemImages(_items: Item[], _apiBaseUrl: string): Promise<void> {
  return
}

export function useItemImage(item: Item | null | undefined) {
  const [pixelArtUrl, setPixelArtUrl] = useState<string | null>(null)
  const [meshyUrl, setMeshyUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!item?.name) { setPixelArtUrl(null); setMeshyUrl(null); return }
    setPixelArtUrl(localStorage.getItem(PX_PREFIX + slug(item.name)))
    setMeshyUrl(localStorage.getItem(MY_PREFIX + slug(item.name)))
  }, [item?.name, item?.rarity])

  return { pixelArtUrl, meshyUrl, loadingPixel: false, loadingMeshy: false }
}
