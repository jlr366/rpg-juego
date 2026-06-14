import { useState, useEffect, useRef } from 'react'
import { Item } from '../types'
import { API_BASE_URL } from '../config'

const PX_PREFIX = 'pixelart_v1_'
const MY_PREFIX = 'meshy_v1_'
const MT_PREFIX = 'meshy_task_'

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '_')
}

function pixelPrompt(item: Item): string {
  const kind = item.type === 'weapon' ? 'futuristic firearm'
    : item.type === 'armor' ? 'sci-fi armor piece'
    : item.type === 'potion' || item.type === 'consumable' ? 'medical stimulant vial'
    : item.slot === 'ring' ? 'tactical wristguard'
    : 'sci-fi equipment'
  return `${item.name}, ${kind}, pixel art, dark bg, game icon, 16-bit`
}

function meshyPrompt(item: Item): string {
  const kind = item.type === 'weapon' ? 'futuristic sci-fi weapon'
    : item.type === 'armor' ? 'sci-fi armored piece'
    : 'sci-fi game equipment'
  return `${item.name}, ${kind}, detailed 3D game asset, epic quality`
}

function pollMeshy(
  taskId: string,
  cKey: string,
  setUrl: (u: string) => void,
  setLoading: (v: boolean) => void,
  signal: AbortSignal,
  tries = 0
) {
  if (tries > 36 || signal.aborted) { setLoading(false); return }
  setTimeout(async () => {
    if (signal.aborted) { setLoading(false); return }
    try {
      const r = await fetch(`${API_BASE_URL}/api/3d-preview/${taskId}`, { credentials: 'include', signal })
      const d = await r.json()
      if (d.status === 'SUCCEEDED' && d.thumbnail_url) {
        localStorage.setItem(cKey, d.thumbnail_url)
        setUrl(d.thumbnail_url)
        setLoading(false)
      } else if (d.status === 'FAILED') {
        setLoading(false)
      } else {
        pollMeshy(taskId, cKey, setUrl, setLoading, signal, tries + 1)
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setLoading(false)
    }
  }, 5000)
}

// Descarga en background los iconos del inventario del jugador sin bloquear la UI.
// Se llama una vez al cargar los items; cada request va separado 400ms para no saturar la API.
export async function prefetchItemImages(items: Item[], apiBaseUrl: string): Promise<void> {
  const uncached = items.filter(item => {
    if (!item?.name) return false
    return !localStorage.getItem(PX_PREFIX + slug(item.name))
  })
  for (let i = 0; i < uncached.length; i++) {
    const item = uncached[i]
    const pk = PX_PREFIX + slug(item.name)
    if (localStorage.getItem(pk)) continue
    try {
      const r = await fetch(`${apiBaseUrl}/api/generate-item-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ description: pixelPrompt(item) }),
      })
      const d = await r.json()
      const raw = d?.image?.base64 || d?.image?.url || (typeof d?.image === 'string' ? d.image : null)
      if (raw && raw.length >= 50) {
        const dataUrl = raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`
        localStorage.setItem(pk, dataUrl)
      }
    } catch {}
    if (i < uncached.length - 1) await new Promise(res => setTimeout(res, 400))
  }
}

export function useItemImage(item: Item | null | undefined) {
  const [pixelArtUrl, setPixelArtUrl] = useState<string | null>(null)
  const [meshyUrl, setMeshyUrl] = useState<string | null>(null)
  const [loadingPixel, setLoadingPixel] = useState(false)
  const [loadingMeshy, setLoadingMeshy] = useState(false)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!item?.name) { setPixelArtUrl(null); setMeshyUrl(null); return }

    const pk = PX_PREFIX + slug(item.name)
    const mk = MY_PREFIX + slug(item.name)
    const mtk = MT_PREFIX + slug(item.name)

    const cachedPx = localStorage.getItem(pk)
    const cachedMy = localStorage.getItem(mk)
    if (cachedPx) setPixelArtUrl(cachedPx)
    if (cachedMy) setMeshyUrl(cachedMy)

    abort.current?.abort()
    abort.current = new AbortController()
    const sig = abort.current.signal

    if (!cachedPx) {
      setLoadingPixel(true)
      fetch(`${API_BASE_URL}/api/generate-item-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        signal: sig,
        body: JSON.stringify({ description: pixelPrompt(item) }),
      })
        .then(r => r.json())
        .then(d => {
          // PixelLab pixflux: { image: { type: "base64", base64: "<raw base64>" } }
          const raw = d?.image?.base64 || d?.image?.url || (typeof d?.image === 'string' ? d.image : null)
          if (!raw || raw.length < 50) return
          const dataUrl = raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`
          localStorage.setItem(pk, dataUrl)
          setPixelArtUrl(dataUrl)
        })
        .catch(() => {})
        .finally(() => { if (!sig.aborted) setLoadingPixel(false) })
    }

    // Meshy only for epic/legendary
    if (!cachedMy && item.rarity === 'epic') {
      const pending = localStorage.getItem(mtk)
      if (pending) {
        setLoadingMeshy(true)
        pollMeshy(pending, mk, setMeshyUrl, setLoadingMeshy, sig)
      } else {
        setLoadingMeshy(true)
        fetch(`${API_BASE_URL}/api/generate-3d-preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          signal: sig,
          body: JSON.stringify({ prompt: meshyPrompt(item) }),
        })
          .then(r => r.json())
          .then(d => {
            const taskId = d?.result
            if (taskId) {
              localStorage.setItem(mtk, taskId)
              pollMeshy(taskId, mk, setMeshyUrl, setLoadingMeshy, sig)
            } else {
              setLoadingMeshy(false)
            }
          })
          .catch(() => setLoadingMeshy(false))
      }
    }

    return () => abort.current?.abort()
  }, [item?.name, item?.rarity])

  return { pixelArtUrl, meshyUrl, loadingPixel, loadingMeshy }
}
