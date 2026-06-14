import React from 'react'
import { LoginForm } from '../components/LoginForm'
import wallpaper from '../assets/mapa tecnologico.jpg'

export default function LoginPage() {
  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{
        backgroundImage: `linear-gradient(rgba(5,10,25,0.80), rgba(5,10,25,0.90)), url(${wallpaper})`,
        backgroundAttachment: 'fixed',
        backgroundPosition: 'center',
        backgroundSize: 'cover',
      }}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,200,255,0.08),transparent_60%)]" />

      <div className="relative z-10 flex flex-col items-center gap-6 px-4 py-12 w-full max-w-md">
        {/* Title */}
        <div className="text-center">
          <div className="mb-2 text-5xl drop-shadow-[0_2px_8px_rgba(0,200,255,0.4)]">⚡</div>
          <h1 className="text-4xl font-black uppercase tracking-widest text-cyan-300 drop-shadow-[0_2px_12px_rgba(0,200,255,0.3)]">
            NEXUS RPG
          </h1>
          <p className="mt-1 text-sm text-cyan-500/70 tracking-wide">Mundo post-apocalíptico digital</p>
        </div>

        {/* Divider */}
        <div className="flex w-full items-center gap-3">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-800/50 to-transparent" />
          <span className="text-cyan-600/60 text-xs">◆</span>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-800/50 to-transparent" />
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
