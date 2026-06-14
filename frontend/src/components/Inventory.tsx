import React from 'react'
import { useGame } from '../context/GameProvider'
import { ItemCard } from './ItemCard'

export const Inventory: React.FC = () => {
  const { inventory } = useGame()
  const items = (inventory || []).filter(
    item => item.type !== 'potion' && item.type !== 'consumable'
  )
  const itemCount = items.reduce((total, item) => total + (item.quantity || 1), 0)

  return (
    <div className="rounded-lg border border-cyan-900/60 bg-[#0a1628]/95 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(0,200,255,0.08)]">
      <div className="mb-4 rounded border border-cyan-800/50 bg-[#0d1f3c] px-3 py-2 text-center shadow-inner">
        <h2 className="text-lg font-black uppercase tracking-wide text-cyan-300">🎒 Inventario ({itemCount}/5)</h2>
      </div>

      {items.length === 0 ? (
        <p className="rounded border border-slate-700/40 bg-[#060e1a]/60 p-3 text-sm text-cyan-200/60 italic">Inventario vacío. Capacidad: 5 items, máx 2 iguales.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
