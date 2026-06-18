import React, { useState } from 'react'

import imgAndroid       from '../assets/buscaminas/evil_android_exposed_brain.webp'
import imgDefeated      from '../assets/buscaminas/evil_android_defeated.webp'
import imgVictory       from '../assets/buscaminas/evil_android_scary_victory.webp'
import imgCerebro       from '../assets/buscaminas/cerebro.webp'
import imgCerebro1      from '../assets/buscaminas/cerebro1.webp'
import imgCerebro2      from '../assets/buscaminas/cerebro2.webp'
import imgCerebro3      from '../assets/buscaminas/cerebro3.webp'
import imgCerebro4      from '../assets/buscaminas/cerebro4.webp'

const BRAIN_IMGS = [imgCerebro, imgCerebro1, imgCerebro2, imgCerebro3, imgCerebro4]

export interface MinefieldEventConfig {
  key: string
  sceneKey: string
  title?: string
  prompt?: string
  enemyImageUrl?: string
  enemyHP?: number
  enemyAttack?: number
  brainCount?: number
  rewardItemName?: string
  rewardItemType?: string
  rewardItemSlot?: string
  rewardItemPower?: number
  winText?: string
  loseText?: string
}

export type MinefieldResult = 'win' | 'loss'

interface Props {
  event: MinefieldEventConfig
  playerAttack: number
  playerHealth: number
  playerMaxHealth: number
  onFinish: (result: MinefieldResult) => void
  onDamagePlayer: (damage: number) => void
}

type CellType = 'brain' | 'cursed_brain' | 'bomb'

interface Cell {
  type: CellType
  revealed: boolean
  brainImg: string
}

const GRID = 16
const COLS = 4

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildGrid(brainCount: number): Cell[] {
  const count = Math.min(brainCount, GRID - 1)
  const types: CellType[] = [
    'cursed_brain',
    ...Array<CellType>(Math.max(0, count - 1)).fill('brain'),
    ...Array<CellType>(Math.max(0, GRID - count)).fill('bomb'),
  ]
  return shuffle(types).map(type => ({
    type,
    revealed: false,
    brainImg: BRAIN_IMGS[Math.floor(Math.random() * BRAIN_IMGS.length)],
  }))
}

const BRAIN_MESSAGES = [
  '⚡ ¡Punto débil expuesto!',
  '🔥 ¡Núcleo dañado!',
  '💢 ¡Sistema crítico alcanzado!',
  '⚙️ ¡Circuito destruido!',
]
const BOMB_MESSAGES = [
  '💥 ¡Trampa activada!',
  '⚡ ¡Descarga eléctrica!',
  '🔴 ¡Señuelo detectado!',
  '💣 ¡Mina de seguridad!',
]

export const MinefieldGame: React.FC<Props> = ({
  event, playerAttack, playerHealth, playerMaxHealth, onFinish, onDamagePlayer,
}) => {
  const brainCount  = event.brainCount ?? 6
  const enemyMaxHP  = event.enemyHP     ?? 60
  const enemyAtk    = event.enemyAttack ?? 15

  const [cells, setCells]           = useState<Cell[]>(() => buildGrid(brainCount))
  const [enemyHP, setEnemyHP]       = useState(enemyMaxHP)
  const [localPHP, setLocalPHP]     = useState(playerHealth)
  const [phase, setPhase]           = useState<'playing' | 'win' | 'loss'>('playing')
  const [lastMsg, setLastMsg]       = useState('')
  const [lastResult, setLastResult] = useState<'brain' | 'cursed' | 'bomb' | null>(null)

  const enemyImage = event.enemyImageUrl || imgAndroid

  const handleCell = (index: number) => {
    if (phase !== 'playing') return
    const cell = cells[index]
    if (cell.revealed) return

    const newCells = cells.map((c, i) => i === index ? { ...c, revealed: true } : c)
    setCells(newCells)

    if (cell.type === 'brain') {
      const dmg = Math.max(5, playerAttack + Math.floor(Math.random() * 8))
      const newHP = Math.max(0, enemyHP - dmg)
      setEnemyHP(newHP)
      setLastResult('brain')
      const msg = BRAIN_MESSAGES[Math.floor(Math.random() * BRAIN_MESSAGES.length)]
      setLastMsg(`${msg} Infligiste ${dmg} de daño.`)
      if (newHP <= 0) {
        setTimeout(() => { setPhase('win'); onFinish('win') }, 900)
      }
    } else if (cell.type === 'cursed_brain') {
      const halfDmg = Math.max(1, Math.floor(localPHP * 0.5))
      const newPHP = Math.max(0, localPHP - halfDmg)
      setLocalPHP(newPHP)
      onDamagePlayer(halfDmg)
      setLastResult('cursed')
      setLastMsg(`☠️ ¡Cerebro trampa! Perdiste la mitad de tu vida (${halfDmg} daño).`)
      if (newPHP <= 0) {
        setTimeout(() => { setPhase('loss'); onFinish('loss') }, 900)
      }
    } else {
      const dmg = Math.max(3, Math.floor(enemyAtk * (0.6 + Math.random() * 0.8)))
      const newPHP = Math.max(0, localPHP - dmg)
      setLocalPHP(newPHP)
      onDamagePlayer(dmg)
      setLastResult('bomb')
      const msg = BOMB_MESSAGES[Math.floor(Math.random() * BOMB_MESSAGES.length)]
      setLastMsg(`${msg} Recibiste ${dmg} de daño.`)
      if (newPHP <= 0) {
        setTimeout(() => { setPhase('loss'); onFinish('loss') }, 900)
      }
    }
  }

  const col = (i: number) => i % COLS
  const row = (i: number) => Math.floor(i / COLS)

  const bgPos = (i: number) =>
    `${(col(i) / 3) * 100}% ${(row(i) / 3) * 100}%`

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-400/30 bg-[#120808]/95 p-4 shadow-[0_0_40px_rgba(220,38,38,0.15)]">

      {/* Win/loss full-screen images */}
      {phase === 'win' && (
        <div className="w-full overflow-hidden rounded-xl border-2 border-emerald-400/60 bg-emerald-950/90 shadow-[0_0_30px_rgba(52,211,153,0.25)]">
          <img src={imgDefeated} alt="Androide derrotado" className="w-full object-contain" style={{ maxHeight: 260 }} />
          <div className="px-4 pb-4 pt-2 text-center">
            <div className="text-lg font-black text-emerald-300">⚡ ¡Androide destruido!</div>
            <p className="mt-1 text-sm text-emerald-100/80">{event.winText || 'Has encontrado todos los puntos débiles. Victoria.'}</p>
          </div>
        </div>
      )}
      {phase === 'loss' && (
        <div className="w-full overflow-hidden rounded-xl border-2 border-rose-400/60 bg-rose-950/90 shadow-[0_0_30px_rgba(244,63,94,0.25)]">
          <img src={imgVictory} alt="Androide victorioso" className="w-full object-contain" style={{ maxHeight: 260 }} />
          <div className="px-4 pb-4 pt-2 text-center">
            <div className="text-lg font-black text-rose-300">💀 Derrotado</div>
            <p className="mt-1 text-sm text-rose-100/80">{event.loseText || 'Las trampas del androide acabaron contigo.'}</p>
          </div>
        </div>
      )}

      {phase === 'playing' && (
        <>
          <div className="text-center">
            <div className="text-sm font-black uppercase tracking-widest text-rose-300">
              {event.title || 'Combate Minesweeper'}
            </div>
            {event.prompt && (
              <p className="mt-1 text-[11px] text-rose-100/70">{event.prompt}</p>
            )}
          </div>

          {/* HP bars */}
          <div className="w-full space-y-1.5 text-[11px]">
            <div>
              <div className="mb-0.5 flex justify-between text-emerald-300">
                <span>Tu vida</span><span>{localPHP}/{playerMaxHealth}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-900">
                <div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-all"
                  style={{ width: `${(localPHP / Math.max(1, playerMaxHealth)) * 100}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-0.5 flex justify-between text-rose-300">
                <span>{event.title || 'Androide'}</span><span>{enemyHP}/{enemyMaxHP}</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-slate-900">
                <div className="h-full bg-gradient-to-r from-rose-700 to-orange-400 transition-all"
                  style={{ width: `${(enemyHP / Math.max(1, enemyMaxHP)) * 100}%` }} />
              </div>
            </div>
          </div>

          {/* Message */}
          {lastMsg && (
            <div className={`w-full rounded border px-3 py-1.5 text-center text-xs font-bold transition-all ${
              lastResult === 'brain'
                ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300'
                : lastResult === 'cursed'
                  ? 'border-purple-500/50 bg-purple-950/60 text-purple-300 animate-pulse'
                  : 'border-rose-500/50 bg-rose-950/60 text-rose-300'
            }`}>
              {lastMsg}
            </div>
          )}

          {/* 4×4 grid */}
          <div
            className="grid gap-1"
            style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)`, width: '100%', maxWidth: 260 }}
          >
            {cells.map((cell, i) => (
              <button
                key={i}
                onClick={() => handleCell(i)}
                disabled={cell.revealed || phase !== 'playing'}
                className={`relative overflow-hidden rounded border transition-all ${
                  cell.revealed
                    ? cell.type === 'brain'
                      ? 'border-emerald-400/60 bg-emerald-900/40'
                      : cell.type === 'cursed_brain'
                        ? 'border-purple-400/60 bg-purple-900/40'
                        : 'border-rose-400/60 bg-rose-900/40'
                    : 'border-slate-500/40 bg-slate-800 hover:border-cyan-400/60 hover:bg-slate-700 active:scale-95'
                }`}
                style={{ aspectRatio: '1/1' }}
              >
                {/* unrevealed: enemy image slice */}
                {!cell.revealed && (
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${enemyImage})`,
                      backgroundSize: '400% 400%',
                      backgroundPosition: bgPos(i),
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                )}
                {/* revealed brain or cursed brain: show brain image */}
                {cell.revealed && (cell.type === 'brain' || cell.type === 'cursed_brain') && (
                  <>
                    <img
                      src={cell.brainImg}
                      alt="cerebro"
                      className="absolute inset-0 h-full w-full object-cover"
                      style={{ opacity: cell.type === 'cursed_brain' ? 0.7 : 0.9 }}
                    />
                    {cell.type === 'cursed_brain' && (
                      <div className="absolute inset-0 flex items-center justify-center text-lg select-none">
                        ☠️
                      </div>
                    )}
                  </>
                )}
                {/* revealed bomb */}
                {cell.revealed && cell.type === 'bomb' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-rose-900/60 text-lg">
                    💥
                  </div>
                )}
                {/* unrevealed: subtle ? hint */}
                {!cell.revealed && (
                  <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/40 select-none">
                    ?
                  </div>
                )}
              </button>
            ))}
          </div>

          <p className="text-center text-[10px] text-slate-400">
            Toca las celdas para encontrar los puntos débiles. ¡Cuidado con los cerebros trampa (☠️) y las minas!
          </p>
        </>
      )}
    </div>
  )
}
