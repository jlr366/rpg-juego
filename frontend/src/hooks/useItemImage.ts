import { Item } from '../types'

// PixelLab y Meshy.ai ya no estan disponibles (suscripciones canceladas) y no
// hay forma de generar imagenes por item. Antes este hook leia restos
// cacheados en localStorage por nombre de item, pero como varios items
// (ej. los 6 objetos del catalogo de equipamiento) comparten el mismo nombre
// en todo el juego, una imagen vieja cacheada para un nombre terminaba
// aplicandose a cualquier item con ese mismo nombre. Por eso ya no se lee
// ningun cache: siempre se usa el icono generico (ItemIcon).
export async function prefetchItemImages(_items: Item[], _apiBaseUrl: string): Promise<void> {
  return
}

export function useItemImage(_item: Item | null | undefined) {
  return { pixelArtUrl: null, meshyUrl: null, loadingPixel: false, loadingMeshy: false }
}
