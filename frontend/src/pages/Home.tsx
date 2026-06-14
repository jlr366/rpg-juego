import React, { useState } from 'react'
import { useNavigate } from 'react-router'
import { ExplorationPanel } from '../components/ExplorationPanel'
import { StatsPanel } from '../components/StatsPanel'
import { EquipmentPanel } from '../components/EquipmentPanel'
import { Inventory } from '../components/Inventory'
import { PotionBar } from '../components/PotionBar'
import { MusicControl } from '../components/MusicControl'
import { MultiplayerChat } from '../components/MultiplayerChat'
import { useAuth } from '../context/AuthProvider'
import wallpaper from '../assets/mapa tecnologico.jpg'

function AdventureButtons() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [exiting, setExiting] = useState(false)

  const handleSaveAndExit = async () => {
    setExiting(true)
    // Dispara el guardado del progreso de aventura (igual que el botón Guardar)
    window.dispatchEvent(new Event('rpg-save-adventure'))
    // Pequeña pausa para que el guardado se procese antes de cerrar sesión
    await new Promise(resolve => setTimeout(resolve, 600))
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="rounded-lg border border-cyan-900/60 bg-[#0a1628]/95 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(0,200,255,0.08)]">
      <div className="mb-3 rounded border border-cyan-800/50 bg-[#0d1f3c] px-3 py-2 text-center shadow-inner">
        <h3 className="text-sm font-black uppercase tracking-wide text-cyan-300">🖥️ Sistema</h3>
      </div>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => window.dispatchEvent(new Event('rpg-reset-adventure'))}
          className="w-full rounded border border-red-500/20 bg-gradient-to-b from-red-700 to-red-950 px-3 py-2 text-sm font-black uppercase tracking-wide text-white shadow transition hover:brightness-110"
        >
          🔄 Reinicio Total
        </button>
        <button
          onClick={() => window.dispatchEvent(new Event('rpg-save-adventure'))}
          className="w-full rounded border border-emerald-500/20 bg-gradient-to-b from-emerald-700 to-emerald-950 px-3 py-2 text-sm font-black uppercase tracking-wide text-white shadow transition hover:brightness-110"
        >
          💾 Guardar Progreso
        </button>
        <div className="my-1 h-px bg-slate-700/40" />
        <button
          onClick={handleSaveAndExit}
          disabled={exiting}
          className="w-full rounded border border-cyan-500/20 bg-gradient-to-b from-slate-700 to-slate-900 px-3 py-2 text-sm font-black uppercase tracking-wide text-cyan-300 shadow transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {exiting ? '⏳ Guardando...' : '🚪 Guardar y Salir'}
        </button>
      </div>
    </div>
  )
}

export default function HomePage() {
  return (
    <div
      className="relative min-h-screen overflow-hidden bg-slate-950 text-white"
      style={{
        backgroundImage: `linear-gradient(rgba(2,6,23,0.50), rgba(2,6,23,0.68)), url(${wallpaper})`,
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      {/* Ambient overlays */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_8%,rgba(255,244,214,0.12),transparent_30%),linear-gradient(90deg,rgba(0,0,0,0.32),transparent_22%,transparent_78%,rgba(0,0,0,0.32))]" />
      {/* Top vignette */}
      <div className="pointer-events-none fixed inset-x-0 top-0 h-24 bg-gradient-to-b from-black/40 to-transparent" />
      {/* Bottom vignette */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent" />

      <MusicControl />

      <div className="relative z-10 mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-4 py-8 lg:grid-cols-[minmax(260px,1fr)_minmax(520px,2fr)_minmax(260px,1fr)]">
        {/* Left column: Stats, Inventory, Potions, Buttons */}
        <div className="lg:col-span-1 space-y-4">
          <StatsPanel />
          <Inventory />
          <PotionBar />
          <AdventureButtons />
        </div>

        {/* Center: Exploration */}
        <div className="lg:col-span-1">
          <ExplorationPanel />
        </div>

        {/* Right column: Equipment + Chat */}
        <div className="lg:col-span-1 space-y-4">
          <EquipmentPanel />
          <MultiplayerChat />
        </div>
      </div>
    </div>
  )
}
