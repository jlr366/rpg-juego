import React from 'react'
import { Activity, Shield, Sword, Zap } from 'lucide-react'
import { useGame } from '../context/GameProvider'

export const StatsPanel: React.FC = () => {
  const { characterName, health, maxHealth, equipment, inventory } = useGame()
  const safeMaxHealth = Math.max(1, maxHealth)
  const healthPercent = Math.max(0, Math.min(100, (health / safeMaxHealth) * 100))

  const eq = equipment || {}
  // Attack: only weapon slot (Brazos Robóticos)
  const force = eq.weapon?.power || 0
  // Defense: all armor slots — matches combat damage reduction formula floor(armorPower/2)
  const armorPower =
    (eq.head?.power   || 0) +
    (eq.chest?.power  || 0) +
    (eq.legs?.power   || 0) +
    (eq.ring?.power   || 0) +
    (eq.boots?.power  || 0)
  const defense = Math.floor(armorPower / 2)
  const potionCount = (inventory || []).reduce((total, item) => {
    if (item.type !== 'potion' && item.type !== 'consumable') return total
    return total + (item.quantity || 1)
  }, 0)
  const inventoryCount = (inventory || []).reduce(
    (total, item) => total + (item.quantity || 1),
    0
  )
  const totalPower = force + defense

  const healthFill =
    healthPercent > 60
      ? 'from-emerald-600 via-emerald-400 to-cyan-300'
      : healthPercent > 30
        ? 'from-amber-600 via-orange-400 to-yellow-300'
        : 'from-red-700 via-red-500 to-rose-400'

  const hudBars = [
    { label: 'Vida', value: `${health}/${maxHealth}`, percent: healthPercent, icon: Activity, fill: healthFill, track: 'bg-slate-800/70', textColor: 'text-emerald-300' },
    { label: 'Ataque', value: force, percent: Math.min(100, force * 8), icon: Sword, fill: 'from-red-600 via-orange-400 to-amber-300', track: 'bg-slate-800/70', textColor: 'text-orange-300' },
    { label: 'Defensa', value: defense, percent: Math.min(100, defense * 8), icon: Shield, fill: 'from-blue-700 via-cyan-400 to-teal-300', track: 'bg-slate-800/70', textColor: 'text-cyan-300' },
    { label: 'Poder', value: totalPower, percent: Math.min(100, totalPower * 5), icon: Zap, fill: 'from-violet-700 via-fuchsia-400 to-pink-300', track: 'bg-slate-800/70', textColor: 'text-fuchsia-300' },
  ]

  return (
    <div className="rounded-lg border border-cyan-900/60 bg-[#0a1628]/95 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(0,200,255,0.08)]">
      {/* Character name */}
      <div className="mb-4 rounded border border-cyan-800/50 bg-[#0d1f3c] px-3 py-2 text-center shadow-inner">
        <h2 className="text-lg font-black uppercase tracking-wide text-cyan-300">
          ⚡ {characterName}
        </h2>
      </div>

      {/* Stat bars */}
      <div className="space-y-3">
        {hudBars.map(bar => {
          const Icon = bar.icon
          return (
            <div key={bar.label} className="rounded border border-slate-700/40 bg-[#060e1a]/70 p-2 shadow-inner">
              <div className={`mb-1 flex items-center justify-between gap-2 text-xs font-bold uppercase ${bar.textColor}`}>
                <span className="inline-flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5" />
                  {bar.label}
                </span>
                <span className="font-black">{bar.value}</span>
              </div>
              <div className={`h-5 overflow-hidden rounded-full border border-slate-700/60 ${bar.track}`}>
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${bar.fill} shadow-[inset_0_2px_2px_rgba(255,255,255,0.2)] transition-all duration-500`}
                  style={{ width: `${bar.percent}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Quick stats row */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded border border-slate-700/40 bg-[#060e1a] p-2 shadow-inner">
          <div className="text-[10px] font-black uppercase tracking-wide text-cyan-400">💉 Stims</div>
          <div className="text-xl font-black text-white">{potionCount}</div>
        </div>
        <div className="rounded border border-slate-700/40 bg-[#060e1a] p-2 shadow-inner">
          <div className="text-[10px] font-black uppercase tracking-wide text-cyan-400">🎒 Carga</div>
          <div className="text-xl font-black text-white">{inventoryCount}</div>
        </div>
        <div className="rounded border border-slate-700/40 bg-[#060e1a] p-2 shadow-inner">
          <div className="text-[10px] font-black uppercase tracking-wide text-cyan-400">📦 Stash</div>
          <div className="text-xl font-black text-white">0</div>
        </div>
      </div>
    </div>
  )
}
