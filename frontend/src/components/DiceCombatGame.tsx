import React, { useRef, useState } from 'react'

export interface DiceCombatEventConfig {
  key: string
  sceneKey: string
  title?: string
  prompt?: string
  enemyName?: string
  enemyHP?: number
  enemyAttack?: number
  weakWeapon?: string
  rewardItemName?: string
  rewardItemType?: string
  rewardItemPower?: number
  winText?: string
  loseText?: string
}

export type DiceCombatResult = 'win' | 'loss'

interface Props {
  event: DiceCombatEventConfig
  playerHealth: number
  playerMaxHealth: number
  onFinish: (result: DiceCombatResult) => void
  onDamagePlayer: (damage: number) => void
}

export const DiceCombatGame: React.FC<Props> = ({
  event, playerHealth, playerMaxHealth, onFinish, onDamagePlayer,
}) => {
  const enemyName    = event.enemyName   || 'Enemigo'
  const enemyMaxHP   = event.enemyHP     ?? 80
  const enemyAtk     = event.enemyAttack ?? 18

  const [enemyHP, setEnemyHP]       = useState(enemyMaxHP)
  const [localPHP, setLocalPHP]     = useState(playerHealth)
  const [phase, setPhase]           = useState<'playing' | 'win' | 'loss'>('playing')
  const [rolling, setRolling]       = useState(false)
  const [dice, setDice]             = useState<{ player: number; enemy: number } | null>(null)
  const [lastMsg, setLastMsg]       = useState('')
  const [lastResult, setLastResult] = useState<'hit' | 'miss' | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const dmgMin = Math.max(1, Math.floor(enemyAtk * 0.6))
  const dmgMax = Math.max(2, Math.ceil(enemyAtk * 1.2))

  const roll = () => {
    if (rolling || phase !== 'playing') return
    setRolling(true)
    const start = Date.now()
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setDice({ player: Math.ceil(Math.random() * 20), enemy: Math.ceil(Math.random() * 20) })
      if (Date.now() - start >= 1100) {
        clearInterval(timerRef.current!)
        timerRef.current = null
        const pRoll = Math.ceil(Math.random() * 20)
        const eRoll = Math.ceil(Math.random() * 20)
        setDice({ player: pRoll, enemy: eRoll })
        setTimeout(() => {
          setRolling(false)
          setDice(null)
          if (pRoll > eRoll) {
            const dmg = Math.floor(Math.random() * 15) + 5
            const newHP = Math.max(0, enemyHP - dmg)
            setEnemyHP(newHP)
            setLastResult('hit')
            setLastMsg(`🎲 Tú: ${pRoll} vs ${eRoll} — Infligiste ${dmg} de daño al enemigo.`)
            if (newHP <= 0) setTimeout(() => { setPhase('win'); onFinish('win') }, 600)
          } else {
            const dmg = dmgMin + Math.floor(Math.random() * (dmgMax - dmgMin + 1))
            const newPHP = Math.max(0, localPHP - dmg)
            setLocalPHP(newPHP)
            onDamagePlayer(dmg)
            setLastResult('miss')
            setLastMsg(`🎲 Tú: ${pRoll} vs ${eRoll} — Recibiste ${dmg} de daño.`)
            if (newPHP <= 0) setTimeout(() => { setPhase('loss'); onFinish('loss') }, 600)
          }
        }, 350)
      }
    }, 80)
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-amber-400/30 bg-[#1a0f00]/95 p-4 shadow-[0_0_40px_rgba(245,158,11,0.1)]">
      <div className="text-center">
        <div className="text-sm font-black uppercase tracking-widest text-amber-300">
          ⚔️ {event.title || `Combate — ${enemyName}`}
        </div>
        {event.prompt && (
          <p className="mt-1 text-[11px] text-amber-100/70">{event.prompt}</p>
        )}
      </div>

      {/* HP bars */}
      <div className="w-full space-y-1.5 text-[11px]">
        <div>
          <div className="mb-0.5 flex justify-between text-emerald-300">
            <span>Tu vida</span><span>{localPHP}/{playerMaxHealth}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-900">
            <div className="h-full bg-gradient-to-r from-red-700 via-red-500 to-rose-300 transition-all"
              style={{ width: `${(localPHP / Math.max(1, playerMaxHealth)) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-0.5 flex justify-between text-amber-300">
            <span>{enemyName}</span><span>{enemyHP}/{enemyMaxHP}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-900">
            <div className="h-full bg-gradient-to-r from-amber-700 via-orange-500 to-yellow-200 transition-all"
              style={{ width: `${(enemyHP / Math.max(1, enemyMaxHP)) * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Last message */}
      {lastMsg && (
        <div className={`w-full rounded border px-3 py-1.5 text-center text-xs font-bold ${
          lastResult === 'hit'
            ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300'
            : 'border-rose-500/50 bg-rose-950/60 text-rose-300'
        }`}>
          {lastMsg}
        </div>
      )}

      {/* Dice animation */}
      {rolling && dice && (
        <div className="flex items-center justify-center gap-6 py-2">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-emerald-400">Tu dado</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-emerald-400/70 bg-emerald-900/60 text-2xl font-black text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.4)]">
              {dice.player}
            </div>
          </div>
          <div className="text-lg font-black text-amber-300">VS</div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-rose-400">Dado enemigo</span>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-rose-400/70 bg-rose-900/60 text-2xl font-black text-rose-300 shadow-[0_0_12px_rgba(251,113,133,0.4)]">
              {dice.enemy}
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {phase === 'playing' && (
        <div className="flex flex-col gap-2">
          <button
            onClick={roll}
            disabled={rolling}
            className="w-full rounded border border-emerald-200/30 bg-gradient-to-b from-emerald-600 to-emerald-900 py-2.5 text-sm font-black uppercase text-white shadow hover:brightness-110 disabled:opacity-50"
          >
            {rolling ? '🎲 Lanzando...' : '🎲 Lanzar dados'}
          </button>
          <p className="text-center text-[10px] text-slate-400">
            Daño del {enemyName}: {dmgMin}–{dmgMax}. Supera su tirada para herirlo.
          </p>
        </div>
      )}

      {/* End screens */}
      {phase === 'win' && (
        <div className="rounded-lg border border-emerald-400/50 bg-emerald-950/80 px-4 py-3 text-center">
          <div className="text-base font-black text-emerald-300">🏆 ¡Victoria!</div>
          <p className="mt-1 text-xs text-emerald-100/80">{event.winText || `Derrotaste a ${enemyName}.`}</p>
        </div>
      )}
      {phase === 'loss' && (
        <div className="rounded-lg border border-rose-400/50 bg-rose-950/80 px-4 py-3 text-center">
          <div className="text-base font-black text-rose-300">💀 Derrotado</div>
          <p className="mt-1 text-xs text-rose-100/80">{event.loseText || `${enemyName} te venció.`}</p>
        </div>
      )}
    </div>
  )
}
