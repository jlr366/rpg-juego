import React, { useEffect, useRef, useState } from 'react'

import iconEC2     from '../assets/Architecture-Service-Icons_07312025/Arch_Compute/64/Arch_Amazon-EC2_64.png'
import iconLambda  from '../assets/Architecture-Service-Icons_07312025/Arch_Compute/64/Arch_AWS-Lambda_64.png'
import iconS3      from '../assets/Architecture-Service-Icons_07312025/Arch_Storage/64/Arch_Amazon-Simple-Storage-Service_64.png'
import iconCF      from '../assets/Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/64/Arch_Amazon-CloudFront_64.png'
import iconAPI     from '../assets/Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/64/Arch_Amazon-API-Gateway_64.png'
import iconRDS     from '../assets/Architecture-Service-Icons_07312025/Arch_Database/64/Arch_Amazon-RDS_64.png'
import iconDynamo  from '../assets/Architecture-Service-Icons_07312025/Arch_Database/64/Arch_Amazon-DynamoDB_64.png'
import iconVPC     from '../assets/Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/64/Arch_Amazon-Virtual-Private-Cloud_64.png'
import iconELB     from '../assets/Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/64/Arch_Elastic-Load-Balancing_64.png'
import iconIAM     from '../assets/Architecture-Service-Icons_07312025/Arch_Security-Identity-Compliance/64/Arch_AWS-Identity-and-Access-Management_64.png'
import iconRoute53 from '../assets/Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/64/Arch_Amazon-Route-53_64.png'
import iconFW      from '../assets/Architecture-Service-Icons_07312025/Arch_Security-Identity-Compliance/64/Arch_AWS-Network-Firewall_64.png'

export type ArchResult = 'win' | 'loss'

export interface ArchitectureGameEventConfig {
  key: string
  sceneKey: string
  title?: string
  levelId?: number
  winText?: string
  loseText?: string
}

// -- Node catalog ---------------------------------------------------------------
type NodeType =
  | 'ec2' | 'lambda' | 's3' | 'cloudfront' | 'apigateway'
  | 'rds'  | 'dynamodb' | 'vpc' | 'elb' | 'iam'
  | 'route53' | 'igw' | 'sg' | 'fw'

interface NodeDef { label: string; short: string; color: string; img?: string; badge?: string }

const DEFS: Record<NodeType, NodeDef> = {
  ec2:        { label: 'EC2 Instance',       short: 'EC2',      color: '#f97316', img: iconEC2    },
  lambda:     { label: 'AWS Lambda',         short: 'Lambda',   color: '#a855f7', img: iconLambda },
  s3:         { label: 'Amazon S3',          short: 'S3',       color: '#84cc16', img: iconS3     },
  cloudfront: { label: 'Amazon CloudFront',  short: 'CloudFront',color: '#8b5cf6', img: iconCF    },
  apigateway: { label: 'API Gateway',        short: 'API GW',   color: '#ec4899', img: iconAPI    },
  rds:        { label: 'Amazon RDS',         short: 'RDS',      color: '#3b82f6', img: iconRDS    },
  dynamodb:   { label: 'DynamoDB',           short: 'DynamoDB', color: '#06b6d4', img: iconDynamo },
  vpc:        { label: 'VPC',                short: 'VPC',      color: '#10b981', img: iconVPC    },
  elb:        { label: 'Elastic Load Balancing', short: 'ELB',  color: '#f59e0b', img: iconELB    },
  iam:        { label: 'IAM',                short: 'IAM',      color: '#ef4444', img: iconIAM    },
  route53:    { label: 'Amazon Route 53',    short: 'Route 53', color: '#64748b', img: iconRoute53 },
  igw:        { label: 'Internet Gateway',   short: 'IGW',      color: '#38bdf8', badge: 'IGW'    },
  sg:         { label: 'Security Group',     short: 'Sec Group',color: '#fb923c', badge: 'SG'     },
  fw:         { label: 'Network Firewall',   short: 'Firewall', color: '#dc2626', img: iconFW     },
}

// -- Level definitions - only the problem, no solution hints -------------------
interface LevelDef {
  title: string
  problem: string   // just the situation, no step instructions
  toolbox: NodeType[]
  requiredNodes: NodeType[]
  requiredConns: { from: NodeType; to: NodeType }[]
  scoreThreshold: number
}

const LEVELS: LevelDef[] = [
  {
    title: 'Cuartel bajo ataque',
    problem:
      'El equipo de ataque necesita habilitar la capacidad de respuesta desde el cuartel. ' +
      'Tienes acceso a los siguientes servicios de AWS. Construye la arquitectura que permita la operacion.',
    toolbox: ['ec2', 'sg', 'igw'],
    requiredNodes: ['ec2', 'sg', 'igw'],
    requiredConns: [
      { from: 'ec2', to: 'sg'  },
      { from: 'sg',  to: 'igw' },
    ],
    scoreThreshold: 60,
  },
  {
    title: 'Sistema de inteligencia distribuida',
    problem:
      'La base de inteligencia requiere una plataforma escalable para procesar y almacenar ' +
      'datos de campo en tiempo real. Los servicios disponibles son los que ves a la izquierda.',
    toolbox: ['cloudfront', 'apigateway', 'lambda', 'dynamodb'],
    requiredNodes: ['cloudfront', 'apigateway', 'lambda', 'dynamodb'],
    requiredConns: [
      { from: 'cloudfront', to: 'apigateway' },
      { from: 'apigateway', to: 'lambda'     },
      { from: 'lambda',     to: 'dynamodb'   },
    ],
    scoreThreshold: 65,
  },
  {
    title: 'Infraestructura de alta disponibilidad',
    problem:
      'La mision no puede fallar. Se necesita una infraestructura tolerante a fallos, ' +
      'con gestion de trafico, proteccion perimetral, computo y persistencia de datos. ' +
      'Usa los servicios disponibles para levantar la operacion.',
    toolbox: ['route53', 'elb', 'fw', 'ec2', 'rds'],
    requiredNodes: ['route53', 'elb', 'fw', 'ec2', 'rds'],
    requiredConns: [
      { from: 'route53', to: 'elb' },
      { from: 'elb',     to: 'fw'  },
      { from: 'fw',      to: 'ec2' },
      { from: 'ec2',     to: 'rds' },
    ],
    scoreThreshold: 70,
  },
]

// -- Helpers --------------------------------------------------------------------
let _uid = 0
const uid = () => `n${++_uid}_${Math.random().toString(36).slice(2, 5)}`

function playWin() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    ;[523, 659, 784, 1047, 784, 1047].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.frequency.value = f; o.type = i < 4 ? 'square' : 'sine'
      const t = ctx.currentTime + i * 0.11
      g.gain.setValueAtTime(0.16, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.2)
      o.start(t); o.stop(t + 0.2)
    })
  } catch {}
}

// -- NodeIcon -------------------------------------------------------------------
const ICON = 42
const DIV_W = 58

function NodeIcon({ type, selected }: { type: NodeType; selected?: boolean }) {
  const d = DEFS[type]
  return (
    <div style={{ width: DIV_W, textAlign: 'center', userSelect: 'none' }}>
      <div style={{
        width: ICON, height: ICON, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: selected ? `${d.color}28` : `${d.color}14`,
        border: `2px solid ${selected ? '#f59e0b' : d.color}`,
        borderRadius: 8,
        boxShadow: selected ? '0 0 14px #f59e0b' : `0 0 6px ${d.color}44`,
        transition: 'all 0.15s',
      }}>
        {d.img
          ? <img src={d.img} alt={d.short} style={{ width: ICON - 10, height: ICON - 10, objectFit: 'contain' }} draggable={false} />
          : <span style={{ fontSize: 10, fontWeight: 900, color: d.color }}>{d.badge}</span>
        }
      </div>
      <div style={{ fontSize: 7, fontWeight: 700, color: '#cbd5e1', marginTop: 3, lineHeight: 1.2 }}>{d.label}</div>
    </div>
  )
}

// -- Diagram zone backgrounds (SVG, decorative only) ---------------------------
function DiagramZones({ level }: { level: number }) {
  if (level === 0) return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
      {/* AWS Cloud */}
      <rect x="4%" y="3%" width="91%" height="92%" rx="8"
        fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.45" />
      <rect x="4%" y="3%" width="78" height="14" rx="2" fill="#f97316" opacity="0.15" />
      <text x="7%" y="8.5%" fill="#f97316" fontSize="9" fontWeight="800" fontFamily="monospace">AWS Cloud</text>

      {/* Region */}
      <rect x="8%" y="12%" width="82%" height="78%" rx="6"
        fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="5 3" opacity="0.35" />
      <text x="9.5%" y="16.5%" fill="#22d3ee" fontSize="8" fontFamily="monospace">Region</text>

      {/* VPC */}
      <rect x="11%" y="20%" width="72%" height="66%" rx="4"
        fill="rgba(16,185,129,0.04)" stroke="#10b981" strokeWidth="1" opacity="0.5" />
      <text x="12.5%" y="24.5%" fill="#10b981" fontSize="8" fontFamily="monospace">VPC</text>

      {/* Public Subnet */}
      <rect x="14%" y="28%" width="62%" height="50%" rx="3"
        fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" opacity="0.35" />
      <text x="15.5%" y="32.5%" fill="#3b82f6" fontSize="7" fontFamily="monospace">Public Subnet</text>
    </svg>
  )

  if (level === 1) return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
      {/* AWS Cloud */}
      <rect x="4%" y="3%" width="91%" height="92%" rx="8"
        fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.45" />
      <text x="7%" y="8.5%" fill="#f97316" fontSize="9" fontWeight="800" fontFamily="monospace">AWS Cloud</text>

      {/* CDN edge */}
      <rect x="8%" y="12%" width="82%" height="26%" rx="4"
        fill="rgba(139,92,246,0.05)" stroke="#8b5cf6" strokeWidth="1" strokeDasharray="5 3" opacity="0.45" />
      <text x="9.5%" y="16.5%" fill="#8b5cf6" fontSize="8" fontFamily="monospace">Edge / CDN</text>

      {/* Backend region */}
      <rect x="8%" y="42%" width="82%" height="50%" rx="4"
        fill="rgba(34,211,238,0.04)" stroke="#22d3ee" strokeWidth="1" strokeDasharray="5 3" opacity="0.4" />
      <text x="9.5%" y="46.5%" fill="#22d3ee" fontSize="8" fontFamily="monospace">Region - Backend</text>

      {/* Serverless zone */}
      <rect x="14%" y="52%" width="68%" height="33%" rx="3"
        fill="none" stroke="#a855f7" strokeWidth="1" strokeDasharray="4 2" opacity="0.3" />
      <text x="15.5%" y="56.5%" fill="#a855f7" fontSize="7" fontFamily="monospace">Serverless compute</text>
    </svg>
  )

  // level 2
  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ zIndex: 0 }}>
      {/* AWS Cloud */}
      <rect x="4%" y="3%" width="91%" height="92%" rx="8"
        fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="8 4" opacity="0.45" />
      <text x="7%" y="8.5%" fill="#f97316" fontSize="9" fontWeight="800" fontFamily="monospace">AWS Cloud</text>

      {/* Region */}
      <rect x="8%" y="12%" width="82%" height="78%" rx="6"
        fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="5 3" opacity="0.35" />
      <text x="9.5%" y="16.5%" fill="#22d3ee" fontSize="8" fontFamily="monospace">Region</text>

      {/* VPC */}
      <rect x="11%" y="20%" width="76%" height="65%" rx="4"
        fill="rgba(16,185,129,0.04)" stroke="#10b981" strokeWidth="1" opacity="0.5" />
      <text x="12.5%" y="24.5%" fill="#10b981" fontSize="8" fontFamily="monospace">VPC</text>

      {/* AZ-a */}
      <rect x="14%" y="28%" width="32%" height="50%" rx="3"
        fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" opacity="0.35" />
      <text x="15.5%" y="32.5%" fill="#3b82f6" fontSize="7" fontFamily="monospace">Availability Zone A</text>

      {/* AZ-b */}
      <rect x="51%" y="28%" width="32%" height="50%" rx="3"
        fill="none" stroke="#3b82f6" strokeWidth="1" strokeDasharray="4 2" opacity="0.35" />
      <text x="52.5%" y="32.5%" fill="#3b82f6" fontSize="7" fontFamily="monospace">Availability Zone B</text>
    </svg>
  )
}

// -- Placed node / connection types ---------------------------------------------
interface Placed { id: string; type: NodeType; x: number; y: number }
interface Conn   { id: string; a: string; b: string }

// -- Main component -------------------------------------------------------------
export function ArchitectureGame({
  event,
  onFinish,
}: {
  event: ArchitectureGameEventConfig
  onFinish: (result: ArchResult, score: number) => void
}) {
  const lvl   = Math.max(0, Math.min(LEVELS.length - 1, event.levelId ?? 0))
  const LEVEL = LEVELS[lvl]
  const HH    = ICON / 2 + 4   // half-height of icon center

  const [phase,    setPhase]    = useState<'intro' | 'play' | 'done'>('intro')
  const [won,      setWon]      = useState(false)
  const [score,    setScore]    = useState(0)
  const [nodes,    setNodes]    = useState<Placed[]>([])
  const [conns,    setConns]    = useState<Conn[]>([])
  const [srcId,    setSrcId]    = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [wrongs,   setWrongs]   = useState(0)

  const [ghost, setGhost]         = useState<{ type: NodeType; x: number; y: number } | null>(null)
  const ghostTypeRef              = useRef<NodeType | null>(null)
  const movingRef                 = useRef<{ id: string; ox: number; oy: number } | null>(null)
  const canvasRef                 = useRef<HTMLDivElement>(null)
  const startRef                  = useRef(0)

  // -- Global mouse events ----------------------------------------------------
  useEffect(() => {
    if (phase !== 'play') return
    const onMove = (e: MouseEvent) => {
      if (ghostTypeRef.current) {
        setGhost(g => g ? { ...g, x: e.clientX, y: e.clientY } : { type: ghostTypeRef.current!, x: e.clientX, y: e.clientY })
      }
      if (movingRef.current) {
        const cv = canvasRef.current; if (!cv) return
        const r  = cv.getBoundingClientRect()
        const nx = e.clientX - r.left - movingRef.current.ox
        const ny = e.clientY - r.top  - movingRef.current.oy
        setNodes(prev => prev.map(n =>
          n.id === movingRef.current!.id
            ? { ...n, x: Math.max(0, Math.min(r.width - DIV_W, nx)), y: Math.max(0, Math.min(r.height - ICON - 18, ny)) }
            : n
        ))
      }
    }
    const onUp = (e: MouseEvent) => {
      if (ghostTypeRef.current) {
        const cv = canvasRef.current
        if (cv) {
          const r = cv.getBoundingClientRect()
          const x = e.clientX - r.left - DIV_W / 2
          const y = e.clientY - r.top  - ICON  / 2
          if (x >= 0 && y >= 0 && x < r.width - DIV_W && y < r.height - ICON - 10) {
            const t = ghostTypeRef.current
            setNodes(prev => [...prev, { id: uid(), type: t, x, y }])
          }
        }
        ghostTypeRef.current = null
        setGhost(null)
      }
      if (movingRef.current) movingRef.current = null
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [phase])

  // -- Actions ----------------------------------------------------------------
  const startPlay = () => {
    setPhase('play'); setNodes([]); setConns([])
    setSrcId(null); setWrongs(0); setFeedback(null)
    startRef.current = Date.now()
  }

  const dragFromBox = (type: NodeType, e: React.MouseEvent) => {
    e.preventDefault()
    ghostTypeRef.current = type
    setGhost({ type, x: e.clientX, y: e.clientY })
  }

  const clickNode = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (movingRef.current) return
    if (srcId === null) { setSrcId(id); return }
    if (srcId === id)   { setSrcId(null); return }
    const dup = conns.some(c => (c.a === srcId && c.b === id) || (c.a === id && c.b === srcId))
    if (!dup) setConns(prev => [...prev, { id: uid(), a: srcId, b: id }])
    setSrcId(null)
  }

  const startMove = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault()
    const cv = canvasRef.current; if (!cv) return
    const r  = cv.getBoundingClientRect()
    const n  = nodes.find(x => x.id === id); if (!n) return
    movingRef.current = { id, ox: e.clientX - r.left - n.x, oy: e.clientY - r.top - n.y }
  }

  const deleteNode = (id: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    setNodes(prev => prev.filter(n => n.id !== id))
    setConns(prev => prev.filter(c => c.a !== id && c.b !== id))
    if (srcId === id) setSrcId(null)
  }

  const deleteConn = (id: string) => setConns(prev => prev.filter(c => c.id !== id))

  const showFeedback = (msg: string) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(null), 3000)
  }

  const validate = () => {
    const nodesOk = LEVEL.requiredNodes.every(t => nodes.some(n => n.type === t))
    const connsOk = LEVEL.requiredConns.every(req =>
      conns.some(c => {
        const a = nodes.find(n => n.id === c.a)
        const b = nodes.find(n => n.id === c.b)
        return a?.type === req.from && b?.type === req.to
      })
    )
    if (!nodesOk || !connsOk) {
      showFeedback('Arquitectura incorrecta. Revisa la configuracion.')
      setWrongs(w => w + 1)
      return
    }
    const secs = Math.max(1, (Date.now() - startRef.current) / 1000)
    const s    = Math.max(10, Math.min(100, Math.max(0, 100 - Math.floor(secs / 6) * 5) - wrongs * 15))
    setScore(s); setWon(true); setPhase('done')
    playWin(); onFinish('win', s)
  }

  const linePts = (c: Conn) => {
    const a = nodes.find(n => n.id === c.a)
    const b = nodes.find(n => n.id === c.b)
    if (!a || !b) return null
    const x1 = a.x + DIV_W / 2, y1 = a.y + HH
    const x2 = b.x + DIV_W / 2, y2 = b.y + HH
    const dx = x2 - x1, dy = y2 - y1, dist = Math.sqrt(dx*dx + dy*dy) || 1
    const r  = ICON / 2 + 5
    return { x1: x1 + dx/dist*r, y1: y1 + dy/dist*r, x2: x2 - dx/dist*r, y2: y2 - dy/dist*r, mx: (x1+x2)/2, my: (y1+y2)/2 }
  }

  // -- Render -----------------------------------------------------------------
  return (
    <div className="aspect-video w-full select-none bg-[#07101f] font-mono text-white">
      <div className="flex h-full flex-col rounded border border-slate-700/50 bg-[#0b1629]">

        {/* Header */}
        <div className="flex shrink-0 items-center gap-2 border-b border-slate-700/40 bg-[#060d1c] px-3 py-1">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-orange-500">
            <span style={{ fontSize: 8, fontWeight: 900, color: '#fff' }}>aws</span>
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-orange-400">Arquitecto de Soluciones AWS</span>
          <span className="text-slate-600">|</span>
          <span className="text-[9px] font-semibold text-slate-400">{LEVEL.title}</span>
        </div>

        {/* -- INTRO -- */}
        {phase === 'intro' && (
          <div className="flex flex-1 items-center justify-center gap-8 px-8 py-4">

            {/* Problem brief + instructions */}
            <div className="max-w-sm">
              <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-orange-400">Situacion</p>
              <p className="mb-4 text-[11px] leading-relaxed text-slate-200">{LEVEL.problem}</p>

              {/* How to play */}
              <div className="mb-5 rounded border border-cyan-700/40 bg-[#060f1e]/80 px-3 py-2.5">
                <p className="mb-2 text-[8px] font-black uppercase tracking-widest text-cyan-400">📋 Cómo jugar</p>
                <ol className="space-y-1.5">
                  <li className="flex items-start gap-1.5 text-[10px] text-slate-300">
                    <span className="shrink-0 font-black text-amber-400">1.</span>
                    Arrastra los servicios desde el panel izquierdo al lienzo.
                  </li>
                  <li className="flex items-start gap-1.5 text-[10px] text-slate-300">
                    <span className="shrink-0 font-black text-amber-400">2.</span>
                    <span><strong className="text-cyan-300">Haz clic en el primero</strong> para seleccionarlo — se iluminará en amarillo.</span>
                  </li>
                  <li className="flex items-start gap-1.5 text-[10px] text-slate-300">
                    <span className="shrink-0 font-black text-amber-400">3.</span>
                    <span><strong className="text-cyan-300">Haz clic en el segundo</strong> para unirlos con una flecha de conexión.</span>
                  </li>
                  <li className="flex items-start gap-1.5 text-[10px] text-slate-400">
                    <span className="shrink-0 font-black text-slate-500">4.</span>
                    Clic derecho en un servicio para eliminarlo · clic en ✕ para borrar una conexión.
                  </li>
                  <li className="flex items-start gap-1.5 text-[10px] text-slate-400">
                    <span className="shrink-0 font-black text-slate-500">5.</span>
                    Cuando la arquitectura esté lista presiona <strong className="text-emerald-300">Verificar</strong>.
                  </li>
                </ol>
              </div>

              <button
                onClick={startPlay}
                className="rounded border border-orange-500/60 bg-gradient-to-b from-orange-600 to-orange-900 px-6 py-2 text-xs font-black uppercase text-white shadow-lg hover:brightness-110"
              >
                Comenzar
              </button>
            </div>

            {/* Divider */}
            <div className="h-32 w-px bg-slate-700/50" />

            {/* Available services */}
            <div>
              <p className="mb-3 text-[8px] font-black uppercase tracking-widest text-slate-400">Servicios disponibles</p>
              <div className="flex flex-wrap gap-3">
                {LEVEL.toolbox.map(type => (
                  <div key={type} className="flex flex-col items-center gap-1">
                    <div style={{
                      width: 44, height: 44,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: `${DEFS[type].color}18`,
                      border: `1.5px solid ${DEFS[type].color}`,
                      borderRadius: 8,
                    }}>
                      {DEFS[type].img
                        ? <img src={DEFS[type].img} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                        : <span style={{ fontSize: 10, fontWeight: 900, color: DEFS[type].color }}>{DEFS[type].badge}</span>
                      }
                    </div>
                    <span style={{ fontSize: 7, color: DEFS[type].color, fontWeight: 700 }}>{DEFS[type].short}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* -- PLAY -- */}
        {phase === 'play' && (
          <div className="flex min-h-0 flex-1">

            {/* Toolbox */}
            <div className="flex w-[68px] shrink-0 flex-col items-center gap-2 border-r border-slate-700/30 bg-[#060d1c] px-1 py-3">
              <p className="mb-1 text-[6.5px] font-black uppercase tracking-widest text-slate-500">Servicios</p>
              {LEVEL.toolbox.map(type => (
                <div
                  key={type}
                  className="cursor-grab rounded p-0.5 transition hover:bg-slate-700/30 active:cursor-grabbing"
                  onMouseDown={e => dragFromBox(type, e)}
                >
                  <NodeIcon type={type} />
                </div>
              ))}
            </div>

            {/* Canvas */}
            <div
              ref={canvasRef}
              className="relative min-h-0 flex-1 overflow-hidden bg-[#0b1a30]"
              style={{ cursor: srcId ? 'crosshair' : 'default' }}
              onClick={() => srcId && setSrcId(null)}
            >
              {/* Diagram zone backgrounds */}
              <DiagramZones level={lvl} />

              {/* Subtle dot grid */}
              <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]" style={{ zIndex: 0 }}>
                <defs>
                  <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" fill="#94a3b8" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#dots)" />
              </svg>

              {/* Connection lines SVG */}
              <svg className="absolute inset-0 h-full w-full" style={{ zIndex: 1, pointerEvents: 'none' }}>
                <defs>
                  <marker id="ag-arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                    <polygon points="0 0, 8 3, 0 6" fill="#94a3b8" />
                  </marker>
                </defs>
                {conns.map(c => {
                  const p = linePts(c); if (!p) return null
                  return (
                    <g key={c.id}>
                      <line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
                        stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5 3"
                        markerEnd="url(#ag-arr)" />
                      <circle cx={p.mx} cy={p.my} r={7}
                        fill="rgba(239,68,68,0.12)" stroke="rgba(239,68,68,0.35)" strokeWidth="1"
                        style={{ pointerEvents: 'all', cursor: 'pointer' }}
                        onClick={e => { e.stopPropagation(); deleteConn(c.id) }} />
                      <text x={p.mx} y={p.my + 3.5} textAnchor="middle" fontSize="9" fill="#ef4444"
                        fontWeight="900" style={{ pointerEvents: 'none' }}>&#x2715;</text>
                    </g>
                  )
                })}
              </svg>

              {/* Placed nodes */}
              {nodes.map(n => (
                <div key={n.id}
                  style={{ position: 'absolute', left: n.x, top: n.y, zIndex: 2, cursor: srcId && srcId !== n.id ? 'pointer' : 'grab' }}
                  onClick={e => clickNode(n.id, e)}
                  onMouseDown={e => { if (!srcId) startMove(n.id, e) }}
                  onContextMenu={e => deleteNode(n.id, e)}
                >
                  <NodeIcon type={n.type} selected={srcId === n.id} />
                </div>
              ))}

              {/* Empty hint */}
              {nodes.length === 0 && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ zIndex: 0 }}>
                  <p className="text-[10px] text-slate-700">Arrastra los servicios aqui</p>
                </div>
              )}

              {/* Persistent connection guide — shown when nodes exist and not currently connecting */}
              {!srcId && nodes.length > 0 && (
                <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-cyan-700/40 bg-[#060d1c]/85 px-3 py-1" style={{ zIndex: 5 }}>
                  <span className="text-[9px] text-cyan-400/80">
                    <span className="font-black text-amber-400">①</span> Clic en el <strong className="text-white">primer servicio</strong> para seleccionarlo
                    <span className="mx-1.5 text-slate-600">→</span>
                    <span className="font-black text-amber-400">②</span> Clic en el <strong className="text-white">segundo</strong> para unirlos
                  </span>
                </div>
              )}

              {/* Active connecting hint */}
              {srcId && (
                <div className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded border border-amber-500/60 bg-amber-950/90 px-3 py-1 shadow-[0_0_12px_rgba(245,158,11,0.3)]" style={{ zIndex: 5 }}>
                  <span className="text-[9px] font-bold text-amber-300">
                    ⚡ Servicio seleccionado — haz clic en otro para conectarlos
                  </span>
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded border border-rose-500/40 bg-rose-950/90 px-3 py-1 text-[9px] font-bold text-rose-300 shadow-lg" style={{ zIndex: 10 }}>
                  {feedback}
                </div>
              )}

              {/* Verify button - floating bottom-right */}
              <div className="absolute bottom-2 right-2 flex flex-col items-end gap-1" style={{ zIndex: 10 }}>
                <button
                  onClick={validate}
                  className="rounded border border-emerald-400/50 bg-gradient-to-b from-emerald-600 to-emerald-900 px-4 py-1.5 text-[10px] font-black uppercase text-white shadow-lg hover:brightness-110"
                >
                  Verificar arquitectura
                </button>
                <p className="text-[6.5px] text-slate-600">Clic derecho en nodo para eliminar</p>
              </div>
            </div>
          </div>
        )}

        {/* -- DONE -- */}
        {phase === 'done' && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4">
            {won ? (
              <>
                <div style={{ fontSize: 48 }}>&#x1F3C6;</div>
                <h2 className="text-lg font-black uppercase tracking-wide text-emerald-300">Arquitectura validada</h2>
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <div className="text-3xl font-black text-amber-400">{score}</div>
                    <div className="text-[9px] text-slate-500">puntos</div>
                  </div>
                  {score >= LEVEL.scoreThreshold && (
                    <div className="rounded border border-yellow-400/50 bg-yellow-900/20 px-3 py-2 text-[11px] font-black text-yellow-300">
                      &#x2728; Item especial desbloqueado
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 48 }}>&#x1F4A5;</div>
                <h2 className="text-lg font-black text-rose-300">Arquitectura fallida</h2>
              </>
            )}
            <button
              onClick={startPlay}
              className="rounded border border-slate-500/50 bg-gradient-to-b from-slate-600 to-slate-900 px-5 py-1.5 text-xs font-black uppercase text-white hover:brightness-110"
            >
              Intentar de nuevo
            </button>
          </div>
        )}

      </div>

      {/* Ghost drag */}
      {ghost && (
        <div style={{ position: 'fixed', left: ghost.x - DIV_W/2, top: ghost.y - ICON/2, pointerEvents: 'none', zIndex: 9999, opacity: 0.85 }}>
          <NodeIcon type={ghost.type} />
        </div>
      )}
    </div>
  )
}
