import React from 'react'
import { Item } from '../types'
import { useGame } from '../context/GameProvider'
import { ItemIcon } from './ItemIcon'
import { useItemImage } from '../hooks/useItemImage'

interface EquipmentSlotProps {
  slot: string
  label: string
  item: Item | null
}

function rarityBorder(rarity = 'common') {
  const map: Record<string, string> = {
    common: 'border-slate-600/40',
    rare: 'border-cyan-500/50',
    epic: 'border-emerald-500/50',
    legendary: 'border-yellow-400/60',
  }
  return map[rarity] || map.common
}

function rarityGlow(rarity = 'common') {
  const map: Record<string, string> = {
    common: '',
    rare: 'shadow-[0_0_6px_rgba(0,200,255,0.15)]',
    epic: 'shadow-[0_0_8px_rgba(0,255,136,0.2)]',
    legendary: 'shadow-[0_0_10px_rgba(250,204,21,0.25)]',
  }
  return map[rarity] || ''
}

export const EquipmentSlot: React.FC<EquipmentSlotProps> = ({ slot, label, item }) => {
  const { unequipSlot } = useGame()
  const { pixelArtUrl, meshyUrl, loadingPixel } = useItemImage(item)
  const border = item ? rarityBorder(item.rarity) : 'border-slate-700/30'
  const glow = item ? rarityGlow(item.rarity) : ''
  const displayImage = meshyUrl || pixelArtUrl

  return (
    <div className={`flex h-28 w-full flex-col justify-between rounded-lg border ${border} ${glow} bg-[#060e1a]/70 px-2.5 py-2 shadow-inner transition`}>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-cyan-400/80">
          {item && displayImage ? (
            <img
              src={displayImage}
              alt={item.name}
              className="h-3.5 w-3.5 object-contain"
              style={{ imageRendering: pixelArtUrl && !meshyUrl ? 'pixelated' : 'auto' }}
            />
          ) : loadingPixel && item ? (
            <div className="h-3.5 w-3.5 rounded-full border border-cyan-400/40 border-t-cyan-300 animate-spin" />
          ) : (
            <ItemIcon item={item} slot={slot} className="h-3.5 w-3.5" />
          )}
          <span className="truncate">{label}</span>
        </div>
        <div className="text-xs font-semibold leading-snug break-words">
          {item ? (
            <span className="text-cyan-100">
              {item.name}
              {typeof item.power === 'number' && item.power > 0 && (
                <span className="ml-1 text-[11px] text-emerald-300">+{item.power}</span>
              )}
            </span>
          ) : (
            <span className="text-slate-500 italic">Vacío</span>
          )}
        </div>
        {/* Pixel art thumbnail in slot */}
        {item && displayImage && (
          <div className="flex justify-center">
            <img
              src={displayImage}
              alt={item.name}
              className="h-8 w-8 object-contain opacity-80"
              style={{ imageRendering: pixelArtUrl && !meshyUrl ? 'pixelated' : 'auto' }}
            />
          </div>
        )}
      </div>
      {item && (
        <button
          className="mt-1 inline-flex w-full items-center justify-center gap-1 rounded border border-red-400/20 bg-gradient-to-b from-red-700 to-red-950 px-2 py-1 text-[11px] font-bold text-white shadow transition hover:brightness-110"
          onClick={() => unequipSlot(slot)}
        >
          Quitar
        </button>
      )}
    </div>
  )
}
