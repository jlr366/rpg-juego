import React, { useCallback, useEffect, useRef, useState } from 'react'

export type SnakeResult = 'win' | 'loss'

export interface TechSnakeEventConfig {
  key: string
  sceneKey: string
  title?: string
  prompt?: string
  targetScore?: number
  rewardItemName?: string
  rewardItemType?: string
  rewardItemSlot?: string
  rewardItemPower?: number
  winText?: string
  loseText?: string
}

const GRID = 18
const COLS = 32
const ROWS = 18
const W    = COLS * GRID   // 576
const H    = ROWS * GRID   // 324

const DATA_NODES = [
  { label: 'EC2',     color: '#f97316' },
  { label: 'S3',      color: '#84cc16' },
  { label: 'Lambda',  color: '#a855f7' },
  { label: 'RDS',     color: '#3b82f6' },
  { label: 'Dynamo',  color: '#06b6d4' },
  { label: 'Bedrock', color: '#ec4899' },
  { label: 'Fargate', color: '#fbbf24' },
  { label: 'SQS',     color: '#34d399' },
]

type Point = { x: number; y: number }

interface GameState {
  snake: Point[]
  dir: Point
  nextDir: Point
  food: Point & { nodeIdx: number }
  score: number
  running: boolean
  finished: boolean
}

function makeInitialState(): GameState {
  return {
    snake: [{ x: 14, y: 8 }, { x: 13, y: 8 }, { x: 12, y: 8 }],
    dir:     { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food:    { x: 21, y: 8, nodeIdx: 0 },
    score:   0,
    running: false,
    finished: false,
  }
}

export function TechSnakeGame({
  event,
  onFinish,
}: {
  event: TechSnakeEventConfig
  onFinish: (result: SnakeResult) => void
}) {
  const TARGET = event.targetScore ?? 100

  const onFinishRef = useRef(onFinish)
  useEffect(() => { onFinishRef.current = onFinish }, [onFinish])

  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const gameRef     = useRef<GameState>(makeInitialState())
  const speedRef    = useRef(130)
  const rafRef      = useRef<number | null>(null)
  const lastTickRef = useRef(0)

  const [score,   setScore]   = useState(0)
  const [started, setStarted] = useState(false)
  const [dead,    setDead]    = useState(false)
  const [won,     setWon]     = useState(false)

  // ── Place food avoiding snake ──────────────────────────────────────────────
  const placeFood = useCallback(() => {
    const g = gameRef.current
    let p: Point
    do { p = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) } }
    while (g.snake.some(s => s.x === p.x && s.y === p.y))
    g.food = { ...p, nodeIdx: Math.floor(Math.random() * DATA_NODES.length) }
  }, [])

  // ── Draw ───────────────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const g   = gameRef.current

    // Background
    ctx.fillStyle = '#060c1a'
    ctx.fillRect(0, 0, W, H)

    // Grid lines
    ctx.strokeStyle = 'rgba(34,211,238,0.04)'
    ctx.lineWidth = 0.5
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * GRID, 0); ctx.lineTo(x * GRID, H); ctx.stroke() }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * GRID); ctx.lineTo(W, y * GRID); ctx.stroke() }

    // Food node
    const node = DATA_NODES[g.food.nodeIdx]
    const fx   = g.food.x * GRID + 1
    const fy   = g.food.y * GRID + 1
    const fs   = GRID - 2
    ctx.fillStyle   = node.color
    ctx.shadowColor = node.color
    ctx.shadowBlur  = 12
    ctx.fillRect(fx, fy, fs, fs)
    ctx.shadowBlur = 0
    ctx.fillStyle  = '#fff'
    ctx.font       = `bold 7px 'Courier New', monospace`
    ctx.textAlign  = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(node.label.slice(0, 6), g.food.x * GRID + GRID / 2, g.food.y * GRID + GRID / 2)

    // Snake (data pipeline)
    g.snake.forEach((seg, i) => {
      const ratio = 1 - i / (g.snake.length + 1)
      if (i === 0) {
        ctx.fillStyle   = '#22d3ee'
        ctx.shadowColor = '#22d3ee'
        ctx.shadowBlur  = 10
      } else {
        ctx.fillStyle  = `rgba(6,182,212,${0.25 + ratio * 0.55})`
        ctx.shadowBlur = 0
      }
      ctx.fillRect(seg.x * GRID + 1, seg.y * GRID + 1, GRID - 2, GRID - 2)
      if (i === 0) {
        ctx.shadowBlur = 0
        // Direction-aware eyes
        const ex = seg.x * GRID + (g.dir.x === 1 ? GRID - 5 : g.dir.x === -1 ? 2 : 3)
        const ey = seg.y * GRID + (g.dir.y === 1 ? GRID - 5 : g.dir.y === -1 ? 2 : 3)
        ctx.fillStyle = '#0f172a'
        ctx.fillRect(ex,     ey, 3, 3)
        ctx.fillRect(ex + (g.dir.y !== 0 ? 5 : 0), ey + (g.dir.x !== 0 ? 5 : 0), 3, 3)
      }
    })
    ctx.shadowBlur = 0
  }, [])

  // ── Game step ──────────────────────────────────────────────────────────────
  const stepRef = useRef<() => void>(() => {})

  const step = useCallback(() => {
    const g = gameRef.current
    if (!g.running) return

    g.dir = { ...g.nextDir }
    const head: Point = { x: g.snake[0].x + g.dir.x, y: g.snake[0].y + g.dir.y }

    // Wall
    if (head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS) {
      g.running = false; g.finished = true
      setDead(true); onFinishRef.current('loss'); return
    }
    // Self
    if (g.snake.slice(3).some(p => p.x === head.x && p.y === head.y)) {
      g.running = false; g.finished = true
      setDead(true); onFinishRef.current('loss'); return
    }

    g.snake.unshift(head)

    if (head.x === g.food.x && head.y === g.food.y) {
      g.score += 10
      setScore(g.score)
      placeFood()
      if (speedRef.current > 55) speedRef.current -= 3
      if (g.score >= TARGET) {
        g.running = false; g.finished = true
        setWon(true); onFinishRef.current('win'); return
      }
    } else {
      g.snake.pop()
    }

    draw()
  }, [draw, placeFood, TARGET])

  useEffect(() => { stepRef.current = step }, [step])

  // ── rAF loop ───────────────────────────────────────────────────────────────
  const loop = useCallback((ts: number) => {
    if (!gameRef.current.running) return
    if (ts - lastTickRef.current >= speedRef.current) {
      lastTickRef.current = ts
      stepRef.current()
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [])

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const g = gameRef.current
      if (!g.running) return
      const d = g.dir
      if (e.key === 'ArrowLeft'  && d.x !== 1)  { g.nextDir = { x: -1, y: 0 }; e.preventDefault() }
      if (e.key === 'ArrowRight' && d.x !== -1) { g.nextDir = { x: 1,  y: 0 }; e.preventDefault() }
      if (e.key === 'ArrowUp'    && d.y !== 1)  { g.nextDir = { x: 0,  y: -1 }; e.preventDefault() }
      if (e.key === 'ArrowDown'  && d.y !== -1) { g.nextDir = { x: 0,  y: 1 }; e.preventDefault() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Touch swipe ────────────────────────────────────────────────────────────
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return
    const dx = e.changedTouches[0].clientX - touchStart.current.x
    const dy = e.changedTouches[0].clientY - touchStart.current.y
    const g  = gameRef.current
    if (!g.running) return
    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 20  && g.dir.x !== -1) g.nextDir = { x: 1,  y: 0 }
      if (dx < -20 && g.dir.x !== 1)  g.nextDir = { x: -1, y: 0 }
    } else {
      if (dy > 20  && g.dir.y !== -1) g.nextDir = { x: 0,  y: 1 }
      if (dy < -20 && g.dir.y !== 1)  g.nextDir = { x: 0,  y: -1 }
    }
    touchStart.current = null
  }

  // ── Start / restart ────────────────────────────────────────────────────────
  const startGame = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    const g = makeInitialState()
    g.running = true
    gameRef.current = g
    speedRef.current  = 130
    lastTickRef.current = 0
    setScore(0); setDead(false); setWon(false); setStarted(true)
    placeFood()
    draw()
    rafRef.current = requestAnimationFrame(loop)
  }, [draw, placeFood, loop])

  // Initial draw + cleanup
  useEffect(() => {
    draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [draw])

  return (
    <div className="aspect-video w-full bg-[#060c1a] p-3 font-mono text-white">
      <div className="flex h-full flex-col rounded border-2 border-cyan-600/40 bg-[#0a1428] p-2 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08)]">

        {/* Header */}
        <div className="mb-1 flex flex-wrap items-center justify-between gap-1 text-[11px] font-black uppercase tracking-wide">
          <span className="text-cyan-300">🌐 NETWORK FLOW</span>
          <span className="text-emerald-400">Paquetes: {score} / {TARGET}</span>
          {dead && <span className="animate-pulse text-rose-400">CONEXIÓN PERDIDA</span>}
          {won  && <span className="animate-pulse text-emerald-300">RED DOMINADA ✓</span>}
        </div>

        {/* Canvas area */}
        <div
          className="relative flex-1 overflow-hidden rounded border border-cyan-900/30"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ imageRendering: 'pixelated', display: 'block', width: '100%', height: '100%' }}
          />

          {/* Overlay when not started */}
          {!started && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded bg-black/75">
              <p className="text-xs font-bold text-cyan-300">{event.prompt || 'Dirige el paquete de datos por la red'}</p>
              <p className="text-[10px] text-cyan-600">Flechas / Swipe · Recoge nodos AWS · Objetivo: {TARGET} pts</p>
              <button
                onClick={startGame}
                className="rounded border border-cyan-400/50 bg-gradient-to-b from-cyan-600 to-cyan-900 px-4 py-1.5 text-xs font-black uppercase text-white hover:brightness-110"
              >
                Iniciar Conexión
              </button>
            </div>
          )}

          {/* Game over overlay */}
          {started && (dead || won) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded bg-black/70">
              <p className={`text-sm font-black ${won ? 'text-emerald-300' : 'text-rose-400'}`}>
                {won ? '🏆 ¡Red dominada!' : '💀 Conexión perdida'}
              </p>
              <button
                onClick={startGame}
                className="rounded border border-cyan-500/50 bg-gradient-to-b from-cyan-700 to-slate-900 px-3 py-1 text-xs font-bold uppercase text-cyan-200 hover:brightness-110"
              >
                Reconectar
              </button>
            </div>
          )}
        </div>

        {/* Node legend */}
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[8px]">
          {DATA_NODES.map(n => (
            <span key={n.label} style={{ color: n.color }}>▪ {n.label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
