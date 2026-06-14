import React from 'react'
import { useAuth } from '../context/AuthProvider'
import { useGame } from '../context/GameProvider'
import { Item } from '../types'
import { ItemIcon } from './ItemIcon'

export const PotionBar: React.FC = () => {
  const { user } = useAuth()
  const { inventory, consumePotion, dropItem } = useGame()

  if (!user) return null

  const potions = (inventory || []).filter(
    (item: Item) => item.type === 'potion' || item.type === 'consumable'
  )
  const potionCount = potions.reduce((total, potion) => total + (potion.quantity || 1), 0)

  return (
    <div className="rounded-lg border border-cyan-900/60 bg-[#0a1628]/95 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(0,200,255,0.08)]">
      <div className="mb-3 rounded border border-cyan-800/50 bg-[#0d1f3c] px-3 py-2 text-center shadow-inner">
        <h3 className="text-lg font-black uppercase tracking-wide text-cyan-300">
          💉 Stims ({potionCount})
        </h3>
      </div>

      <div className="space-y-2">
        {potions.length === 0 ? (
          <p className="rounded border border-slate-700/40 bg-[#060e1a]/60 p-3 text-sm text-cyan-200/60 italic">
            Sin estimulantes disponibles.
          </p>
        ) : (
          potions.map((potion) => {
            const quantity = potion.quantity || 1
            const heal = potion.power || 20

            return (
              <div
                key={potion.id}
                className="rounded border border-emerald-800/50 bg-[#060e1a]/70 p-3 text-sm shadow-[0_0_8px_rgba(16,185,129,0.08)] transition"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="flex min-w-0 gap-2">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-emerald-800/50 bg-[#0a1628]/80 shadow-inner">
                      <ItemIcon item={potion} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="break-words font-bold leading-tight text-cyan-100">
                        {potion.name}
                        {quantity > 1 && (
                          <span className="ml-2 rounded bg-slate-800 px-1.5 py-0.5 text-[11px] text-emerald-300">
                            x{quantity}
                          </span>
                        )}
                      </p>
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-400/80">Estimulante</p>
                    </div>
                  </div>
                  <span className="shrink-0 rounded border border-emerald-500/30 bg-emerald-950/60 px-1.5 py-0.5 text-xs font-black text-emerald-300">
                    +{heal} HP
                  </span>
                </div>

                {potion.description && (
                  <p className="mb-2 text-[11px] leading-relaxed text-cyan-200/50 italic">{potion.description}</p>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => consumePotion(potion.id)}
                    className="flex-1 rounded border border-emerald-400/20 bg-gradient-to-b from-emerald-700 to-emerald-950 py-1.5 text-xs font-bold text-white shadow transition hover:brightness-110"
                  >
                    ⚡ Usar
                  </button>
                  <button
                    onClick={() => dropItem(potion.id)}
                    className="flex-1 rounded border border-red-400/20 bg-gradient-to-b from-red-700 to-red-950 py-1.5 text-xs font-bold text-white shadow transition hover:brightness-110"
                  >
                    🗑️ Botar
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
