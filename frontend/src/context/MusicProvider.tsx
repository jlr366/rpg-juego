import React, { createContext, useState } from 'react'

interface MusicContextType {
  mute: boolean
  volume: number
  setScene: (scene: string) => void
  playCombatAlert: () => void
  toggleMute: () => void
  setVolume: (vol: number) => void
}

export const MusicContext = createContext<MusicContextType | undefined>(undefined)

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mute, setMuteState] = useState<boolean>(() => {
    try { return localStorage.getItem('rpg_music_mute') === 'true' } catch { return false }
  })
  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem('rpg_music_volume') ?? '')
      return isNaN(v) ? 0.5 : Math.min(1, Math.max(0, v))
    } catch { return 0.5 }
  })

  const toggleMute = () => setMuteState(prev => {
    const next = !prev
    try { localStorage.setItem('rpg_music_mute', String(next)) } catch {}
    return next
  })

  const setVolume = (vol: number) => {
    const clamped = Math.min(1, Math.max(0, vol))
    try { localStorage.setItem('rpg_music_volume', String(clamped)) } catch {}
    setVolumeState(clamped)
  }

  const setScene = (scene: string) => {
    console.log(`Scene set to: ${scene}`)
  }
  const playCombatAlert = () => {
    console.log('Combat alert sound')
  }

  return (
    <MusicContext.Provider value={{ mute, volume, setScene, playCombatAlert, toggleMute, setVolume }}>
      {children}
    </MusicContext.Provider>
  )
}

export const useMusic = () => {
  const context = React.useContext(MusicContext)
  if (!context) throw new Error('useMusic must be used within MusicProvider')
  return context
}