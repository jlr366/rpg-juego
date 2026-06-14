import React from 'react'
import { Item } from '../types'
import { useGame } from '../context/GameProvider'
import { ItemIcon } from './ItemIcon'
import { useItemImage } from '../hooks/useItemImage'

interface Props {
  item: Item
}

function rarityBorder(rarity = 'common') {
  const map: Record<string, string> = {
    common: 'border-slate-600/50',
    rare: 'border-cyan-500/60',
    epic: 'border-emerald-500/60',
    legendary: 'border-yellow-400/70',
  }
  return map[rarity] || map.common
}

function rarityBg(rarity = 'common') {
  const map: Record<string, string> = {
    common: 'bg-[#060e1a]/70',
    rare: 'bg-cyan-950/30',
    epic: 'bg-emerald-950/30',
    legendary: 'bg-yellow-950/30',
  }
  return map[rarity] || map.common
}

function rarityGlow(rarity = 'common') {
  const map: Record<string, string> = {
    common: '',
    rare: 'shadow-[0_0_8px_rgba(0,200,255,0.15)]',
    epic: 'shadow-[0_0_10px_rgba(0,255,136,0.18)]',
    legendary: 'shadow-[0_0_12px_rgba(250,204,21,0.22)]',
  }
  return map[rarity] || ''
}

function rarityLabel(rarity = 'common') {
  const map: Record<string, { text: string; cls: string }> = {
    common: { text: 'Común', cls: 'text-slate-400' },
    rare: { text: 'Raro', cls: 'text-cyan-300' },
    epic: { text: 'Épico', cls: 'text-emerald-300' },
    legendary: { text: 'Legendario', cls: 'text-yellow-300' },
  }
  return map[rarity] || map.common
}

const SLOT_LABELS: Record<string, string> = {
  head:   'Casco',
  chest:  'Pechera',
  legs:   'Botas',
  ring:   'Antebrazos',
  boots:  'Mochila',
  weapon: 'Brazos Robóticos',
}

export const ItemCard: React.FC<Props> = ({ item }) => {
  const { equipItem, dropItem } = useGame()
  const [isLoading, setIsLoading] = React.useState(false)
  const { pixelArtUrl, meshyUrl, loadingPixel, loadingMeshy } = useItemImage(item)
  const quantity = item.quantity || 1
  const rl = rarityLabel(item.rarity)

  const handleEquip = async () => {
    setIsLoading(true)
    try { await equipItem(item.id) } finally { setIsLoading(false) }
  }

  const handleDrop = async () => {
    setIsLoading(true)
    try { await dropItem(item.id) } finally { setIsLoading(false) }
  }

  // Show meshy thumbnail (3D render) if available, else pixel art, else icon
  const displayImage = meshyUrl || pixelArtUrl

  return (
    <div className={`rounded border ${rarityBorder(item.rarity)} ${rarityBg(item.rarity)} ${rarityGlow(item.rarity)} p-3 text-sm shadow-inner transition`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-2">
          <div className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded border ${rarityBorder(item.rarity)} bg-[#0a1628]/80 shadow-inner overflow-hidden`}>
            {displayImage ? (
              <img
                src={displayImage}
                alt={item.name}
                className="h-full w-full object-contain"
                style={{ imageRendering: pixelArtUrl && !meshyUrl ? 'pixelated' : 'auto' }}
              />
            ) : loadingPixel ? (
              <div className="h-5 w-5 rounded-full border-2 border-cyan-400/40 border-t-cyan-300 animate-spin" />
            ) : (
              <ItemIcon item={item} className="h-5 w-5" />
            )}
            {loadingMeshy && !meshyUrl && (
              <div className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-fuchsia-400 animate-pulse" title="Generando render 3D..." />
            )}
          </div>
          <div className="min-w-0">
            <p className="break-words font-bold leading-tight text-cyan-100">
              {item.name}
              {quantity > 1 && (
                <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-emerald-300">x{quantity}</span>
              )}
            </p>
            <p className={`text-[11px] font-semibold uppercase tracking-wide ${rl.cls}`}>{rl.text}</p>
          </div>
        </div>
        {(item.power || 0) > 0 && (
          <span className={`shrink-0 rounded border px-1.5 py-0.5 text-xs font-black ${item.slot === 'weapon' ? 'border-orange-500/40 bg-orange-950/40 text-orange-300' : 'border-cyan-500/30 bg-[#0d1f3c] text-cyan-300'}`}>
            {item.slot === 'weapon' ? '⚔' : '🛡'} +{item.power}
          </span>
        )}
      </div>

      {item.description && (
        <p className="mb-2 text-[11px] leading-relaxed text-cyan-200/50 italic">{item.description}</p>
      )}

      <div className="flex gap-2">
        {item.slot && (
          <button onClick={handleEquip} disabled={isLoading} className="flex-1 rounded border border-cyan-400/20 bg-gradient-to-b from-cyan-700 to-cyan-950 py-1.5 text-xs font-bold text-white shadow transition hover:brightness-110 disabled:opacity-50">
            {isLoading ? '...' : `⚡ Equipar (${SLOT_LABELS[item.slot] ?? item.slot})`}
          </button>
        )}
        <button onClick={handleDrop} disabled={isLoading} className="flex-1 rounded border border-red-400/20 bg-gradient-to-b from-red-700 to-red-950 py-1.5 text-xs font-bold text-white shadow transition hover:brightness-110 disabled:opacity-50">
          {isLoading ? '...' : '🗑️ Soltar'}
        </button>
      </div>
    </div>
  )
}
