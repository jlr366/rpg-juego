import React, { useEffect, useState } from 'react'

// ── Types ───────────────────────────────────────────────────────────────────────
type NetElement = 'cidr' | 'sg' | 'nacl'

export interface NetworkCardEventConfig {
  key: string
  sceneKey: string
  title?: string
  prompt?: string
  rounds?: number
  rewardItemName?: string
  rewardItemType?: string
  rewardItemPower?: number
  winText?: string
  loseText?: string
}

export type NetworkCardResult = 'win' | 'loss' | 'draw'

// ── Game data ───────────────────────────────────────────────────────────────────
const ELEMENTS: Record<NetElement, { label: string; icon: string; color: string; border: string; glow: string; desc: string }> = {
  cidr: { label: '0.0.0.0/0',     icon: '🌐', color: '#1a0808', border: '#dc2626', glow: '#ef4444', desc: 'Todo el tráfico' },
  sg:   { label: 'Security Group', icon: '🛡️', color: '#080d1a', border: '#2563eb', glow: '#60a5fa', desc: 'Firewall de instancia' },
  nacl: { label: 'NACL',           icon: '🔒', color: '#0d0a1a', border: '#7c3aed', glow: '#a78bfa', desc: 'Control de subred' },
}

// cidr beats nacl, nacl beats sg, sg beats cidr
const BEATS: Record<NetElement, NetElement> = {
  cidr: 'nacl',
  nacl: 'sg',
  sg:   'cidr',
}

const ALL: NetElement[] = ['cidr', 'sg', 'nacl']

function resolveRound(player: NetElement, ai: NetElement): 'win' | 'loss' | 'draw' {
  if (player === ai) return 'draw'
  return BEATS[player] === ai ? 'win' : 'loss'
}

// ── Flip card ───────────────────────────────────────────────────────────────────
function FlipCard({ element, flipped, label }: { element: NetElement; flipped: boolean; label: string }) {
  const cfg = ELEMENTS[element]
  return (
    <div style={{ perspective: 900, width: 140, height: 170 }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transition: 'transform 0.7s cubic-bezier(0.4,0,0.2,1)',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
      }}>
        {/* Back */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          borderRadius: 16, border: '2px solid #334155',
          background: 'linear-gradient(135deg, #0f172a 60%, #1e293b)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
          boxShadow: '0 0 24px rgba(99,102,241,0.25)',
        }}>
          <span style={{ fontSize: 52, filter: 'grayscale(0.3) brightness(0.7)' }}>🃏</span>
          <span style={{ fontSize: 12, color: '#64748b', fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</span>
        </div>
        {/* Front */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          borderRadius: 16, border: `2px solid ${cfg.border}`,
          background: cfg.color,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
          boxShadow: `0 0 28px ${cfg.glow}55`,
        }}>
          <span style={{ fontSize: 52 }}>{cfg.icon}</span>
          <span style={{ fontSize: 13, color: cfg.glow, fontWeight: 900, textAlign: 'center', padding: '0 8px', lineHeight: 1.3 }}>
            {cfg.label}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────────
interface Props {
  event: NetworkCardEventConfig
  onFinish: (result: NetworkCardResult) => void
}

export const NetworkCardGame: React.FC<Props> = ({ event, onFinish }) => {
  const totalRounds = Math.max(1, Math.min(5, Number(event.rounds) || 3))
  const winsNeeded  = Math.ceil(totalRounds / 2)

  const [phase, setPhase]           = useState<'select' | 'countdown' | 'reveal' | 'done'>('select')
  const [playerPick, setPlayerPick] = useState<NetElement | null>(null)
  const [aiPick, setAiPick]         = useState<NetElement | null>(null)
  const [countdown, setCountdown]   = useState(3)
  const [flipped, setFlipped]       = useState(false)
  const [roundResult, setRoundResult] = useState<'win' | 'loss' | 'draw' | null>(null)
  const [message, setMessage]       = useState('')
  const [playerWins, setPlayerWins] = useState(0)
  const [aiWins, setAiWins]         = useState(0)
  const [round, setRound]           = useState(1)

  // Countdown tick
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) {
      setFlipped(true)
      setPhase('reveal')
      return
    }
    const t = window.setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => window.clearTimeout(t)
  }, [phase, countdown])

  // Process result after flip
  useEffect(() => {
    if (phase !== 'reveal' || !playerPick || !aiPick) return
    const t = window.setTimeout(() => {
      const result = resolveRound(playerPick, aiPick)
      setRoundResult(result)
      const nPlayer = playerWins + (result === 'win' ? 1 : 0)
      const nAi     = aiWins    + (result === 'loss' ? 1 : 0)
      setPlayerWins(nPlayer)
      setAiWins(nAi)

      const pCfg = ELEMENTS[playerPick]
      const aCfg = ELEMENTS[aiPick]
      if (result === 'win') {
        setMessage(`✅ ${pCfg.icon} ${pCfg.label} vence a ${aCfg.icon} ${aCfg.label}`)
      } else if (result === 'loss') {
        setMessage(`❌ ${aCfg.icon} ${aCfg.label} vence a ${pCfg.icon} ${pCfg.label}`)
      } else {
        setMessage(`🤝 Empate — ambos eligieron ${pCfg.icon} ${pCfg.label}`)
      }

      const matchOver = nPlayer >= winsNeeded || nAi >= winsNeeded || round >= totalRounds
      if (matchOver) {
        setPhase('done')
        window.setTimeout(() => {
          if (nPlayer > nAi) onFinish('win')
          else if (nAi > nPlayer) onFinish('loss')
          else onFinish('draw')
        }, 2200)
      } else {
        // Next round after delay
        window.setTimeout(() => {
          setRound(r => r + 1)
          setPhase('select')
          setPlayerPick(null)
          setAiPick(null)
          setFlipped(false)
          setCountdown(3)
          setRoundResult(null)
          setMessage('')
        }, 2000)
      }
    }, 800)
    return () => window.clearTimeout(t)
  }, [phase, playerPick, aiPick]) // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (el: NetElement) => {
    if (phase !== 'select') return
    const ai = ALL[Math.floor(Math.random() * 3)]
    setPlayerPick(el)
    setAiPick(ai)
    setFlipped(false)
    setCountdown(3)
    setRoundResult(null)
    setMessage('')
    setPhase('countdown')
  }

  const finalWon  = playerWins > aiWins
  const finalLost = aiWins > playerWins

  return (
    <div className="flex flex-col gap-5 rounded-xl border border-indigo-400/30 bg-[#080c1a]/95 p-6 font-mono text-white shadow-[0_0_40px_rgba(99,102,241,0.12)]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-lg font-black uppercase tracking-widest text-indigo-300">
          🃏 {event.title || 'Duelo de Red AWS'}
        </span>
        <span className="text-sm text-slate-400">
          Ronda {round}/{totalRounds} &nbsp;·&nbsp; 🏆 {playerWins} — {aiWins} 🤖
        </span>
      </div>

      {event.prompt && (
        <p className="text-center text-sm text-slate-400">{event.prompt}</p>
      )}

      {/* Reference table */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        {ALL.map(el => {
          const cfg  = ELEMENTS[el]
          const loses = ALL.find(x => BEATS[x] === el)!
          return (
            <div key={el} className="rounded-lg border px-3 py-2 text-center" style={{ borderColor: cfg.border + '55', background: cfg.color + 'cc' }}>
              <div className="text-sm font-black" style={{ color: cfg.glow }}>{cfg.icon} {cfg.label}</div>
              <div className="mt-1 text-slate-400">
                vence a {ELEMENTS[BEATS[el]].icon} {ELEMENTS[BEATS[el]].label}
              </div>
              <div className="text-slate-600">
                pierde con {ELEMENTS[loses].icon} {ELEMENTS[loses].label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Select phase */}
      {phase === 'select' && (
        <div className="flex flex-col gap-3">
          <p className="text-center text-sm font-bold text-indigo-300">Elige tu carta:</p>
          <div className="grid grid-cols-3 gap-4">
            {ALL.map(el => {
              const cfg = ELEMENTS[el]
              return (
                <button
                  key={el}
                  onClick={() => pick(el)}
                  className="flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-150 hover:scale-105 hover:brightness-110 active:scale-95"
                  style={{ borderColor: cfg.border, background: cfg.color, boxShadow: `0 0 22px ${cfg.glow}30` }}
                >
                  <span className="text-5xl">{cfg.icon}</span>
                  <span className="text-sm font-black leading-tight" style={{ color: cfg.glow }}>{cfg.label}</span>
                  <span className="text-xs text-slate-500">{cfg.desc}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Countdown + Reveal */}
      {(phase === 'countdown' || phase === 'reveal' || phase === 'done') && playerPick && aiPick && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center gap-10">
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-black uppercase tracking-widest text-blue-400">TÚ</span>
              <FlipCard element={playerPick} flipped={flipped} label="tu carta" />
            </div>

            <div className="flex flex-col items-center gap-2">
              {phase === 'countdown' && (
                <span
                  key={countdown}
                  className="text-6xl font-black text-yellow-300"
                  style={{ textShadow: '0 0 24px rgba(253,224,71,0.9)', animation: 'none' }}
                >
                  {countdown === 0 ? '¡YA!' : countdown}
                </span>
              )}
              {(phase === 'reveal' || phase === 'done') && !roundResult && (
                <span className="text-3xl font-black text-slate-500">VS</span>
              )}
              {roundResult && (
                <span className={`text-3xl font-black ${
                  roundResult === 'win'  ? 'text-emerald-400' :
                  roundResult === 'loss' ? 'text-rose-400' :
                  'text-yellow-400'
                }`}>
                  {roundResult === 'win' ? '✅' : roundResult === 'loss' ? '❌' : '🤝'}
                </span>
              )}
            </div>

            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-black uppercase tracking-widest text-rose-400">RIVAL</span>
              <FlipCard element={aiPick} flipped={flipped} label="rival" />
            </div>
          </div>

          {/* Round message */}
          <div className={`rounded-lg border px-4 py-3 text-center text-sm font-bold transition-all ${
            roundResult === 'win'  ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300' :
            roundResult === 'loss' ? 'border-rose-500/50    bg-rose-950/60    text-rose-300'    :
            roundResult === 'draw' ? 'border-yellow-500/50  bg-yellow-950/60  text-yellow-300'  :
            'border-indigo-500/40  bg-indigo-950/50  text-indigo-300'
          }`}>
            {phase === 'countdown'
              ? `Voltear en ${countdown}...`
              : message || 'Revelando resultado...'}
          </div>
        </div>
      )}

      {/* Final result */}
      {phase === 'done' && (
        <div className={`rounded-xl border p-5 text-center ${
          finalWon  ? 'border-emerald-400/50 bg-emerald-950/80' :
          finalLost ? 'border-rose-400/50    bg-rose-950/80'    :
                      'border-yellow-400/50  bg-yellow-950/80'
        }`}>
          <div className={`text-xl font-black ${
            finalWon  ? 'text-emerald-300' :
            finalLost ? 'text-rose-300'    :
                        'text-yellow-300'
          }`}>
            {finalWon ? '🏆 ¡Victoria!' : finalLost ? '💀 Derrota' : '🤝 Empate'}
          </div>
          <p className="mt-2 text-sm text-slate-400">
            {finalWon
              ? event.winText  || '¡Dominaste la seguridad de red!'
              : finalLost
              ? event.loseText || 'La red AWS te superó esta vez.'
              : 'Partida igualada — nadie domina la red.'}
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {playerWins} victorias tuyas — {aiWins} del rival
          </p>
        </div>
      )}
    </div>
  )
}
