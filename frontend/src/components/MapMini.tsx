import React from 'react'
import mapImage from '../assets/mapa tecnologico.jpg'

export type ExplorationStep = 'camino' | 'bosque' | 'arbustos' | 'claroLobos'

export interface MapLocation {
  key: string
  name: string
  x: number
  y: number
  icon: string
}

interface MapMarker {
  x: number
  y: number
}

interface MapMiniProps {
  currentStep?: ExplorationStep
  marker?: MapMarker
  label?: string
  mediaUrl?: string
  mediaType?: string
  mapLocations?: MapLocation[]
  children?: React.ReactNode
}

function clampPercent(value: number, fallback: number) {
  if (!Number.isFinite(value)) return fallback
  return Math.min(100, Math.max(0, value))
}

const MapMini: React.FC<MapMiniProps> = ({
  marker,
  label,
  mediaUrl,
  mediaType,
  mapLocations = [],
  children,
}) => {
  const x = clampPercent(Number(marker?.x), 50)
  const y = clampPercent(Number(marker?.y), 50)
  const isVideo =
    mediaType === 'video' ||
    /^data:video\//i.test(mediaUrl || '') ||
    /\.(mp4|webm|ogg)(\?.*)?$/i.test(mediaUrl || '')
  const isImage =
    mediaType === 'image' ||
    /^data:image\//i.test(mediaUrl || '') ||
    /\.(png|jpe?g|gif|webp|bmp)(\?.*)?$/i.test(mediaUrl || '')

  // Find the location name that matches the current marker coords
  const currentLocation = mapLocations.find(
    loc => Math.abs(loc.x - x) < 1.5 && Math.abs(loc.y - y) < 1.5
  )
  const displayLabel = currentLocation?.name || label || 'Ubicación actual'

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest text-[#f7c878]">🗺 Mapa</span>
        <span className="rounded border border-[#8f5728]/50 bg-[#160b08]/60 px-2 py-0.5 text-[10px] text-[#ffe7bd]/70">
          {currentLocation ? `${currentLocation.icon} ` : '📍 '}{displayLabel}
        </span>
      </div>

      {/* Map container */}
      <div className="relative overflow-hidden rounded-lg border-2 border-[#6b371d] shadow-[0_6px_24px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(245,193,108,0.10)]">
        {children ? (
          children
        ) : mediaUrl && isVideo ? (
          <video
            src={mediaUrl}
            className="block aspect-video w-full object-cover"
            controls
            playsInline
          />
        ) : mediaUrl && isImage ? (
          <img
            src={mediaUrl}
            alt={label || 'Escena'}
            className="block aspect-video w-full select-none object-cover"
            draggable={false}
          />
        ) : (
          <img
            src={mapImage}
            alt="Mapa de aventura"
            className="block w-full select-none"
            draggable={false}
          />
        )}

        {/* All named location pins (only shown on the base map, not on scene media) */}
        {!children && !mediaUrl && mapLocations.map(loc => {
          const isActive = Math.abs(loc.x - x) < 1.5 && Math.abs(loc.y - y) < 1.5
          return (
            <div
              key={loc.key}
              className="absolute z-10 -translate-x-1/2 -translate-y-full"
              style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
              title={loc.name}
            >
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs shadow-md transition-transform ${
                    isActive
                      ? 'scale-125 border-[#ffd99a] bg-[#5a2b17] shadow-[0_0_8px_rgba(245,193,108,0.6)]'
                      : 'border-white/40 bg-[#2d160d]/80'
                  }`}
                >
                  {loc.icon}
                </div>
                {/* Label — only show for active or on hover via title */}
                {isActive && (
                  <div className="mt-0.5 max-w-[72px] truncate rounded border border-[#a96b32]/60 bg-[#2d160d]/90 px-1 py-0.5 text-center text-[9px] font-bold text-[#ffd99a] shadow">
                    {loc.name}
                  </div>
                )}
                <div className={`w-0.5 ${isActive ? 'h-2 bg-[#ffd99a]/70' : 'h-1.5 bg-white/30'}`} />
              </div>
            </div>
          )
        })}

        {/* Player position — red pulsing dot ALWAYS shown at current location */}
        {!children && (
          <div
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
            title={displayLabel}
            aria-label={displayLabel}
          >
            <span className="absolute inset-0 -m-2 animate-ping rounded-full bg-red-500/40" />
            <span className="relative flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/90 bg-red-600 shadow-[0_0_10px_rgba(239,68,68,0.8)] text-[10px] font-black text-white">
              ✦
            </span>
          </div>
        )}

        {/* Vignette */}
        {!children && (
          <div className="pointer-events-none absolute inset-0 rounded-lg shadow-[inset_0_0_40px_rgba(0,0,0,0.45)]" />
        )}
      </div>
    </div>
  )
}

export default MapMini
