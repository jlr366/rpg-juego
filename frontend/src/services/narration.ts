import { API_BASE_URL } from '../config'

let current: HTMLAudioElement | null = null

export async function narrate(text: string, muted = false): Promise<void> {
  if (muted || !text.trim()) return
  stopNarration()
  try {
    const res = await fetch(`${API_BASE_URL}/api/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text: text.replace(/[*_#]/g, '').slice(0, 2500) }),
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    current = new Audio(url)
    current.play().catch(() => {})
    current.onended = () => URL.revokeObjectURL(url)
  } catch {
    // narration is non-critical, fail silently
  }
}

export function stopNarration(): void {
  if (current) {
    current.pause()
    current = null
  }
}
