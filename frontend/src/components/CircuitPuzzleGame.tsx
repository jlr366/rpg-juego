import React, { useEffect, useRef, useState } from 'react'

// Win / lose images — swap these paths once you drop your files into src/assets/imagenes/
import imgWin  from '../assets/imagenes/infiltracion.webp'
import imgLose from '../assets/imagenes/explosion_final.webp'

import iconEC2    from '../assets/Architecture-Service-Icons_07312025/Arch_Compute/64/Arch_Amazon-EC2_64.png'
import iconS3     from '../assets/Architecture-Service-Icons_07312025/Arch_Storage/64/Arch_Amazon-Simple-Storage-Service_64.png'
import iconVPC    from '../assets/Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/64/Arch_Amazon-Virtual-Private-Cloud_64.png'
import iconELB    from '../assets/Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/64/Arch_Elastic-Load-Balancing_64.png'
import iconCF     from '../assets/Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/64/Arch_Amazon-CloudFront_64.png'
import iconRDS    from '../assets/Architecture-Service-Icons_07312025/Arch_Database/64/Arch_Amazon-RDS_64.png'
import iconDyn    from '../assets/Architecture-Service-Icons_07312025/Arch_Database/64/Arch_Amazon-DynamoDB_64.png'
import iconFW     from '../assets/Architecture-Service-Icons_07312025/Arch_Security-Identity-Compliance/64/Arch_AWS-Network-Firewall_64.png'
import iconWAF    from '../assets/Architecture-Service-Icons_07312025/Arch_Security-Identity-Compliance/64/Arch_AWS-WAF_64.png'
import iconIAM    from '../assets/Architecture-Service-Icons_07312025/Arch_Security-Identity-Compliance/64/Arch_AWS-Identity-and-Access-Management_64.png'
import iconLambda from '../assets/Architecture-Service-Icons_07312025/Arch_Compute/64/Arch_AWS-Lambda_64.png'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CircuitPuzzleEventConfig {
  key: string
  sceneKey: string
  title?: string
  prompt?: string
  levelId?: number
  rewardItemName?: string
  rewardItemType?: string
  rewardItemPower?: number
  winText?: string
  loseText?: string
}

export type CircuitPuzzleResult = 'win' | 'loss'

interface Props {
  event: CircuitPuzzleEventConfig
  playerHealth: number
  playerMaxHealth: number
  onFinish: (result: CircuitPuzzleResult) => void
  onDamagePlayer: (damage: number) => void
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

type CompId = 'waf' | 'vpc' | 'sg' | 'ec2' | 's3' | 'elb' | 'rds' | 'dynamo' | 'fw' | 'cf' | 'iam' | 'lambda'
interface CompDef { label: string; color: string; img?: string; badge?: string }

const COMP_DEFS: Record<CompId, CompDef> = {
  waf:    { label: 'AWS WAF',          color: '#dc2626', img: iconWAF    },
  vpc:    { label: 'VPC',              color: '#10b981', img: iconVPC    },
  sg:     { label: 'Security Group',   color: '#f97316', badge: 'SG'    },
  ec2:    { label: 'EC2',              color: '#f97316', img: iconEC2    },
  s3:     { label: 'Amazon S3',        color: '#84cc16', img: iconS3     },
  elb:    { label: 'Load Balancer',    color: '#f59e0b', img: iconELB    },
  rds:    { label: 'Amazon RDS',       color: '#3b82f6', img: iconRDS    },
  dynamo: { label: 'DynamoDB',         color: '#06b6d4', img: iconDyn    },
  fw:     { label: 'Network Firewall', color: '#dc2626', img: iconFW     },
  cf:     { label: 'CloudFront',       color: '#8b5cf6', img: iconCF     },
  iam:    { label: 'IAM',              color: '#ef4444', img: iconIAM    },
  lambda: { label: 'Lambda',           color: '#a855f7', img: iconLambda },
}

// ─── Levels ───────────────────────────────────────────────────────────────────

interface SlotDef { id: string; answer: CompId; label: string; row: number; col: number; insideVpc?: boolean }
interface LevelDef { title: string; story: string; slots: SlotDef[]; toolbox: CompId[]; winTitle: string; loseTitle: string }

const LEVELS: LevelDef[] = [
  {
    title: 'Sistema de misiles en espera',
    story: 'Necesitas 4 componentes en este orden: una barrera que filtre tráfico web malicioso en el perímetro · un control de acceso interno a la red privada · un servidor que ejecute la carga de trabajo · un sistema de almacenamiento de objetos.',
    slots: [
      { id: 'waf',  answer: 'waf', label: 'Firewall Web',        row: 1, col: 1 },
      { id: 'sg',   answer: 'sg',  label: 'Grupo de seguridad',   row: 1, col: 2, insideVpc: true },
      { id: 'ec2',  answer: 'ec2', label: 'Servidor de cómputo',  row: 1, col: 3, insideVpc: true },
      { id: 's3',   answer: 's3',  label: 'Almacenamiento',       row: 1, col: 4, insideVpc: true },
    ],
    toolbox: ['waf', 'sg', 'ec2', 's3', 'elb', 'rds', 'lambda', 'cf'],
    winTitle: '⚡ ¡Misiles listos para lanzar!',
    loseTitle: '💥 ¡Sistema comprometido!',
  },
  {
    title: 'Red de inteligencia distribuida',
    story: 'Arquitectura de 5 slots: protección perimetral contra amenazas web · distribuidor de tráfico entre servidores · unidad de cómputo escalable · base de datos NoSQL para datos en tiempo real · almacenamiento de archivos estáticos.',
    slots: [
      { id: 'waf',    answer: 'waf',    label: 'Protección web',       row: 1, col: 1 },
      { id: 'elb',    answer: 'elb',    label: 'Balanceador',           row: 1, col: 2, insideVpc: true },
      { id: 'ec2',    answer: 'ec2',    label: 'Cómputo',               row: 1, col: 3, insideVpc: true },
      { id: 'dynamo', answer: 'dynamo', label: 'Base de datos',         row: 1, col: 4, insideVpc: true },
      { id: 's3',     answer: 's3',     label: 'Archivos intel.',        row: 1, col: 5, insideVpc: true },
    ],
    toolbox: ['waf', 'elb', 'ec2', 'dynamo', 's3', 'rds', 'lambda', 'cf', 'iam'],
    winTitle: '🛰️ ¡Red de inteligencia activa!',
    loseTitle: '💥 ¡Agentes comprometidos!',
  },
  {
    title: 'Cuartel de alta disponibilidad',
    story: 'Arquitectura defensiva de 5 capas: firewall de red en el borde de la VPC · filtro de aplicaciones web · balanceador que distribuye el tráfico entre instancias · servidor de cómputo principal · base de datos relacional con persistencia.',
    slots: [
      { id: 'fw',   answer: 'fw',   label: 'Network Firewall', row: 1, col: 1, insideVpc: true },
      { id: 'waf',  answer: 'waf',  label: 'WAF',              row: 1, col: 2, insideVpc: true },
      { id: 'elb',  answer: 'elb',  label: 'Load Balancer',    row: 1, col: 3, insideVpc: true },
      { id: 'ec2',  answer: 'ec2',  label: 'EC2',              row: 1, col: 4, insideVpc: true },
      { id: 'rds',  answer: 'rds',  label: 'Base de datos',    row: 1, col: 5, insideVpc: true },
    ],
    toolbox: ['fw', 'waf', 'elb', 'ec2', 'rds', 's3', 'dynamo', 'lambda', 'cf', 'iam'],
    winTitle: '🏰 ¡Cuartel protegido y operativo!',
    loseTitle: '💥 ¡Cuartel destruido!',
  },
]

// ─── CompCard ─────────────────────────────────────────────────────────────────

function CompCard({ id, used, dragging, onDragStart }: {
  id: CompId; used: boolean; dragging: boolean; onDragStart: (id: CompId) => void
}) {
  const def = COMP_DEFS[id]
  return (
    <div
      draggable={!used}
      onDragStart={() => { if (!used) onDragStart(id) }}
      className={`flex flex-col items-center gap-1 rounded-lg border p-2 transition-all select-none
        ${used
          ? 'opacity-20 cursor-not-allowed border-slate-700 bg-slate-900/20'
          : dragging
            ? 'opacity-50 scale-95 border-cyan-400/60 bg-cyan-900/30 cursor-grabbing'
            : 'cursor-grab border-slate-600/50 bg-slate-800/70 hover:border-cyan-400/60 hover:bg-slate-700/80 hover:scale-105 active:scale-95'
        }`}
      style={{ width: 76 }}
    >
      {def.img
        ? <img src={def.img} alt={def.label} className="h-10 w-10 object-contain" />
        : <div className="flex h-10 w-10 items-center justify-center rounded font-black text-xs text-white" style={{ background: def.color }}>{def.badge || def.label.slice(0, 2)}</div>
      }
      <span className="text-center text-[11px] font-semibold leading-tight text-slate-200">{def.label}</span>
    </div>
  )
}

// ─── Slot ─────────────────────────────────────────────────────────────────────

function SlotComp({ slot, placed, lit, pulsing, sparking, dragOver, onDrop, onDragOver, onDragLeave }: {
  slot: SlotDef; placed: CompId | null; lit: boolean; pulsing: boolean; sparking: boolean
  dragOver: boolean; onDrop: (id: string) => void
  onDragOver: (e: React.DragEvent, id: string) => void; onDragLeave: () => void
}) {
  const def = placed ? COMP_DEFS[placed] : null
  return (
    <div
      onDrop={e => { e.preventDefault(); onDrop(slot.id) }}
      onDragOver={e => onDragOver(e, slot.id)}
      onDragLeave={onDragLeave}
      className={`relative flex flex-col items-center justify-center gap-1 rounded-xl border-2 transition-all duration-300
        ${sparking
          ? 'border-red-400 bg-red-950/70 shadow-[0_0_24px_rgba(239,68,68,0.7)]'
          : placed && lit
            ? 'border-emerald-400 bg-emerald-950/60 shadow-[0_0_16px_rgba(52,211,153,0.6)]'
            : placed
              ? 'border-emerald-400/50 bg-emerald-950/30'
              : dragOver
                ? 'border-cyan-400 bg-cyan-950/50 scale-105 shadow-[0_0_12px_rgba(34,211,238,0.4)]'
                : 'border-dashed border-slate-500/50 bg-slate-900/40 hover:border-slate-400/70'
        }`}
      style={{ width: 92, height: 92 }}
    >
      {pulsing && !sparking && (
        <div className="absolute inset-0 rounded-xl animate-ping bg-emerald-400/20" />
      )}
      {sparking && (
        <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
          <span className="text-3xl" style={{ animation: 'spark 0.25s ease-in-out infinite' }}>⚡</span>
        </div>
      )}
      {def ? (
        <>
          {def.img
            ? <img src={def.img} alt={def.label}
                className={`h-11 w-11 object-contain transition-all
                  ${lit ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.9)]' : ''}
                  ${sparking ? 'opacity-30' : ''}`} />
            : <div className="flex h-11 w-11 items-center justify-center rounded-lg font-black text-sm text-white" style={{ background: def.color }}>{def.badge}</div>
          }
          <span className={`text-center text-[11px] font-bold leading-tight px-1 ${sparking ? 'text-red-300' : 'text-emerald-200'}`}>
            {def.label}
          </span>
        </>
      ) : (
        <div className="text-3xl font-bold text-slate-500 select-none">?</div>
      )}
    </div>
  )
}

// ─── Arrow ────────────────────────────────────────────────────────────────────

function Arrow({ lit, animated, delay = 0 }: { lit: boolean; animated: boolean; delay?: number }) {
  return (
    <div className="relative flex items-center" style={{ width: 32 }}>
      <div className={`h-0.5 w-full transition-all duration-500 ${lit ? 'bg-emerald-400' : 'bg-slate-600'}`} />
      {animated && (
        <div
          className="absolute h-2.5 w-2.5 rounded-full bg-emerald-300 shadow-[0_0_10px_rgba(52,211,153,1)]"
          style={{ animation: `slideRight 0.5s ease-in-out ${delay}s both`, left: 0 }}
        />
      )}
      <div className={`absolute right-0 border-y-[5px] border-y-transparent border-l-[7px] transition-all duration-500
        ${lit ? 'border-l-emerald-400' : 'border-l-slate-600'}`} />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export const CircuitPuzzleGame: React.FC<Props> = ({
  event, playerHealth, playerMaxHealth, onFinish, onDamagePlayer,
}) => {
  const levelId = event.levelId ?? 0
  const level   = LEVELS[Math.min(levelId, LEVELS.length - 1)]

  const [placed, setPlaced]         = useState<Record<string, CompId | null>>(() =>
    Object.fromEntries(level.slots.map(s => [s.id, null]))
  )
  const [dragging, setDragging]     = useState<CompId | null>(null)
  const [dragOver, setDragOver]     = useState<string | null>(null)
  const [failedRuns, setFailedRuns] = useState(0)
  const [localPHP, setLocalPHP]     = useState(playerHealth)
  const [lit, setLit]               = useState<Record<string, boolean>>({})
  const [phase, setPhase]           = useState<'playing' | 'lighting' | 'win' | 'loss'>('playing')
  const [executing, setExecuting]   = useState(false)
  const [wrongSlotIds, setWrongSlotIds] = useState<Set<string>>(new Set())
  const [lastMsg, setLastMsg]       = useState('')
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const maxWrong     = 3
  const filledCount  = level.slots.filter(s => placed[s.id] !== null).length
  const allFilled    = filledCount === level.slots.length

  const usedInPanel  = (id: CompId) => Object.values(placed).some(v => v === id)
  const vpcSlots     = level.slots.filter(s => s.insideVpc)
  const nonVpcSlots  = level.slots.filter(s => !s.insideVpc)

  const handleDragStart = (id: CompId) => setDragging(id)
  const handleDragOver  = (e: React.DragEvent, slotId: string) => { e.preventDefault(); setDragOver(slotId) }
  const handleDragLeave = () => setDragOver(null)

  // Free placement — no validation on drop
  const handleDrop = (slotId: string) => {
    setDragOver(null)
    if (!dragging || phase !== 'playing' || executing) return
    setPlaced(prev => ({ ...prev, [slotId]: dragging }))
    setDragging(null)
    setLastMsg('')
  }

  const startWinSequence = (finalPlaced: Record<string, CompId | null>) => {
    setPhase('lighting')
    level.slots.forEach((s, i) => {
      animTimerRef.current = setTimeout(() => setLit(prev => ({ ...prev, [s.id]: true })), i * 400)
    })
    animTimerRef.current = setTimeout(() => { setPhase('win'); onFinish('win') }, level.slots.length * 400 + 800)
  }

  const handleExecute = () => {
    if (phase !== 'playing' || executing || !allFilled) return

    const wrongList = level.slots.filter(s => placed[s.id] !== s.answer)

    if (wrongList.length === 0) {
      startWinSequence(placed)
      return
    }

    // Wrong — show sparks, deal damage, then clear wrong slots
    setExecuting(true)
    setWrongSlotIds(new Set(wrongList.map(s => s.id)))

    const halfDmg  = Math.max(1, Math.floor(localPHP * 0.5))
    const newHP    = Math.max(0, localPHP - halfDmg)
    setLocalPHP(newHP)
    onDamagePlayer(halfDmg)
    const newFailed = failedRuns + 1
    setFailedRuns(newFailed)

    setTimeout(() => {
      setExecuting(false)
      setWrongSlotIds(new Set())
      // Clear wrong slots so player can retry
      setPlaced(prev => {
        const next = { ...prev }
        wrongList.forEach(s => { next[s.id] = null })
        return next
      })
      const remain = maxWrong - newFailed
      if (newHP <= 0 || newFailed >= maxWrong) {
        setLastMsg('❌ Sistema colapsado. Sin intentos restantes.')
        setPhase('loss')
        onFinish('loss')
      } else {
        setLastMsg(`⚡ ${wrongList.length} componente(s) incorrecto(s). Perdiste ${halfDmg} HP. ${remain} intento(s) restante(s).`)
      }
    }, 1400)
  }

  useEffect(() => () => { if (animTimerRef.current) clearTimeout(animTimerRef.current) }, [])

  const anyAnimating = phase === 'lighting'

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-emerald-400/20 bg-[#060d0a]/95 p-4 shadow-[0_0_40px_rgba(16,185,129,0.1)]">

      <style>{`
        @keyframes slideRight {
          from { transform: translateX(0); opacity: 1; }
          to   { transform: translateX(30px); opacity: 0; }
        }
        @keyframes spark {
          0%,100% { opacity: 0; transform: scale(1) rotate(0deg); }
          20%  { opacity: 1; transform: scale(1.6) rotate(30deg); }
          50%  { opacity: 0.7; transform: scale(0.9) rotate(-20deg); }
          80%  { opacity: 1; transform: scale(1.3) rotate(15deg); }
        }
      `}</style>

      {/* Header */}
      <div className="text-center">
        <div className="text-base font-black uppercase tracking-widest text-emerald-300">
          🔌 {event.title || level.title}
        </div>
        <p className="mt-1 text-xs text-emerald-100/60">{event.prompt || level.story}</p>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: maxWrong }).map((_, i) => (
            <span key={i} className={`text-base ${i < (maxWrong - failedRuns) ? 'text-emerald-400' : 'text-slate-700'}`}>
              {i < (maxWrong - failedRuns) ? '🔋' : '🪫'}
            </span>
          ))}
          <span className="text-slate-400 font-medium">{maxWrong - failedRuns} intentos</span>
        </div>
        <div className="font-bold text-slate-300">{filledCount}/{level.slots.length} slots</div>
        <div className="flex items-center gap-1">
          <span>❤️</span>
          <span className="font-bold text-emerald-300">{localPHP}/{playerMaxHealth}</span>
        </div>
      </div>

      {/* HP bar */}
      <div className="h-2 overflow-hidden rounded-full bg-slate-900">
        <div className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 transition-all duration-500"
          style={{ width: `${(localPHP / Math.max(1, playerMaxHealth)) * 100}%` }} />
      </div>

      {/* Error / feedback message */}
      {lastMsg && phase === 'playing' && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/50 px-3 py-2 text-center text-sm font-bold text-rose-300">
          {lastMsg}
        </div>
      )}
      {phase === 'lighting' && (
        <div className="rounded-lg border border-emerald-500/40 bg-emerald-950/60 px-3 py-2 text-center text-sm font-bold text-emerald-300 animate-pulse">
          ⚡ Iniciando secuencia de activación...
        </div>
      )}

      {/* ── Main area: toolbox + circuit ── */}
      <div className="flex gap-4 items-start">

        {/* Left: toolbox */}
        <div className="flex-shrink-0">
          <div className="mb-2 text-center text-xs font-bold uppercase tracking-wide text-slate-400">COMPONENTES</div>
          <div className="grid grid-cols-2 gap-2">
            {level.toolbox.map(id => (
              <CompCard
                key={id}
                id={id}
                used={usedInPanel(id)}
                dragging={dragging === id}
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        </div>

        {/* Right: circuit — centered */}
        <div className="flex flex-1 flex-col items-center gap-4">

          {/* Circuit row */}
          <div className="flex flex-wrap items-center justify-center gap-0">

            {/* Internet node */}
            <div className="flex flex-col items-center gap-1 select-none mr-1" style={{ width: 60 }}>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-sky-500/70 bg-sky-950/60 text-2xl shadow-[0_0_12px_rgba(56,189,248,0.35)]">
                🌐
              </div>
              <span className="text-xs font-bold text-sky-400">Internet</span>
            </div>
            <Arrow lit={nonVpcSlots.length > 0 || phase === 'lighting'} animated={false} />

            {/* Non-VPC slots */}
            {nonVpcSlots.map((slot, idx) => (
              <React.Fragment key={slot.id}>
                <SlotComp
                  slot={slot}
                  placed={placed[slot.id]}
                  lit={!!lit[slot.id]}
                  pulsing={phase === 'lighting' && !!lit[slot.id]}
                  sparking={executing && wrongSlotIds.has(slot.id)}
                  dragOver={dragOver === slot.id}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                />
                <Arrow
                  lit={(!!placed[slot.id] && !wrongSlotIds.has(slot.id)) || phase === 'lighting'}
                  animated={phase === 'lighting' && !!lit[slot.id]}
                  delay={idx * 0.4}
                />
              </React.Fragment>
            ))}

            {/* VPC container */}
            {vpcSlots.length > 0 && (
              <div className={`relative flex items-center gap-0 rounded-2xl border-2 px-4 py-3 transition-all duration-700
                ${phase === 'win' || phase === 'lighting'
                  ? 'border-emerald-400/80 bg-emerald-950/20 shadow-[0_0_24px_rgba(52,211,153,0.3)]'
                  : 'border-emerald-600/40 bg-emerald-950/10'}`}>
                <div className="absolute -top-3.5 left-4 flex items-center gap-1 rounded-md bg-emerald-900/90 border border-emerald-600/50 px-2 py-0.5">
                  {COMP_DEFS.vpc.img && <img src={COMP_DEFS.vpc.img} className="h-4 w-4" />}
                  <span className="text-[11px] font-bold text-emerald-300">VPC</span>
                </div>
                {vpcSlots.map((slot, idx) => (
                  <React.Fragment key={slot.id}>
                    <SlotComp
                      slot={slot}
                      placed={placed[slot.id]}
                      lit={!!lit[slot.id]}
                      pulsing={phase === 'lighting' && !!lit[slot.id]}
                      sparking={executing && wrongSlotIds.has(slot.id)}
                      dragOver={dragOver === slot.id}
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                    />
                    {idx < vpcSlots.length - 1 && (
                      <Arrow
                        lit={(!!placed[slot.id] && !wrongSlotIds.has(slot.id)) || phase === 'lighting'}
                        animated={anyAnimating}
                        delay={(nonVpcSlots.length + idx + 1) * 0.4}
                      />
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>

          {/* Execute button */}
          {phase === 'playing' && (
            <button
              onClick={handleExecute}
              disabled={!allFilled || executing}
              className={`rounded-xl border px-8 py-2.5 font-black text-sm uppercase tracking-wide transition-all
                ${allFilled && !executing
                  ? 'border-emerald-400/60 bg-emerald-700/80 text-emerald-100 hover:bg-emerald-600 hover:shadow-[0_0_20px_rgba(52,211,153,0.5)] active:scale-95 cursor-pointer'
                  : 'border-slate-600/40 bg-slate-800/50 text-slate-500 cursor-not-allowed'
                }`}
            >
              {executing
                ? '⚡ Verificando...'
                : allFilled
                  ? '▶ Ejecutar circuito'
                  : `Llena los slots (${filledCount}/${level.slots.length})`
              }
            </button>
          )}

          <p className="text-xs text-slate-500 text-center">
            Arrastra componentes a los slots. Cuando estén todos llenos, ejecuta el circuito.
          </p>
        </div>
      </div>

      {/* Win screen */}
      {phase === 'win' && (
        <div className="w-full overflow-hidden rounded-xl border-2 border-emerald-400/60 shadow-[0_0_30px_rgba(52,211,153,0.3)]">
          <img src={imgWin} alt="Victoria" className="w-full object-cover" style={{ maxHeight: 280 }} />
          <div className="bg-emerald-950/95 px-5 pb-5 pt-3 text-center">
            <div className="text-xl font-black text-emerald-300">{level.winTitle}</div>
            <p className="mt-1 text-sm text-emerald-100/80">{event.winText || 'Arquitectura completada. El sistema está operativo.'}</p>
          </div>
        </div>
      )}

      {/* Loss screen */}
      {phase === 'loss' && (
        <div className="w-full overflow-hidden rounded-xl border-2 border-rose-400/60 shadow-[0_0_30px_rgba(244,63,94,0.3)]">
          <img src={imgLose} alt="Derrota" className="w-full object-cover" style={{ maxHeight: 280 }} />
          <div className="bg-rose-950/95 px-5 pb-5 pt-3 text-center">
            <div className="text-xl font-black text-rose-300">{level.loseTitle}</div>
            <p className="mt-1 text-sm text-rose-100/80">{event.loseText || 'El circuito falló. El sistema fue comprometido.'}</p>
          </div>
        </div>
      )}
    </div>
  )
}
