import React, { useCallback, useEffect, useRef, useState } from 'react'
import imgIconLambda from '../assets/Architecture-Service-Icons_07312025/Arch_Compute/64/Arch_AWS-Lambda_64.png'
import imgIconS3     from '../assets/Architecture-Service-Icons_07312025/Arch_Storage/64/Arch_Amazon-Simple-Storage-Service_64.png'
import imgIconEC2    from '../assets/Architecture-Service-Icons_07312025/Arch_Compute/64/Arch_Amazon-EC2_64.png'

// ── Config ─────────────────────────────────────────────────────────────────────
const CANVAS_W         = 580
const CANVAS_H         = 200
const GROUND_Y         = 162
const GRAVITY          = 0.45
const JUMP_FORCE       = -9
const GAME_SPEED_INIT  = 1.5
const SPEED_INC        = 0.0004
const MAX_LIVES        = 3
const INVINCIBLE_F     = 90   // frames of invincibility after hit
const SHIELD_F         = 150  // frames a shield lasts

// ── Types ──────────────────────────────────────────────────────────────────────
export type RunnerResult = 'win' | 'loss' | 'p1_wins' | 'p2_wins'

export interface RunnerEventConfig {
  key: string
  sceneKey: string
  title: string
  prompt?: string
  targetScore?: number
  rewardItemName?: string
  rewardItemType?: string
  rewardItemPower?: number
  winText?: string
  loseText?: string
}

interface RunnerGameProps {
  event: RunnerEventConfig
  onFinish: (result: RunnerResult, wageredItemId?: string) => void
  inventory?: Array<{ id: string; name: string; type: string; quantity?: number }>
}

type CollectibleType = 'lambda' | 's3' | 'ec2'

interface Collectible {
  x: number
  y: number
  type: CollectibleType
  collected: boolean
}

interface Obstacle {
  x: number
  type: number   // 0=ErrorCloud, 1=DowntimeCloud, 2=404Cloud
  lane: number   // 0=p1 lane, 1=p2 lane
}

interface BgCloud { x: number; y: number; w: number; spd: number }

interface Player {
  x: number; y: number; vy: number
  jumping: boolean; alive: boolean; score: number
  lives: number; invincible: number; shield: number
}

// ── Draw helpers ───────────────────────────────────────────────────────────────

function drawEngineer(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  frame: number, jumping: boolean,
  invincible: number, shield: number,
  isP2 = false,
) {
  if (invincible > 0 && Math.floor(frame / 4) % 2 === 0) return
  const s = 2

  // Shield aura
  if (shield > 0) {
    ctx.strokeStyle = 'rgba(74,222,128,0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(x + 7*s, y + 9*s, 12, 20, 0, 0, Math.PI * 2)
    ctx.stroke()
  }

  // Head (skin)
  ctx.fillStyle = '#fcd9b6'
  ctx.fillRect(x + 4*s, y + s, 5*s, 4*s)

  // Helmet
  ctx.fillStyle = isP2 ? '#dc2626' : '#1d4ed8'
  ctx.fillRect(x + 3*s, y, 7*s, 2*s)
  ctx.fillStyle = '#f97316'           // AWS orange accent on visor
  ctx.fillRect(x + 3*s, y + 2*s, s, s)
  ctx.fillRect(x + 9*s, y + 2*s, s, s)

  // Eyes
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(x + 5*s, y + 2*s, s, s)
  ctx.fillRect(x + 7*s, y + 2*s, s, s)

  // Body — AWS orange shirt
  ctx.fillStyle = '#f97316'
  ctx.fillRect(x + 3*s, y + 5*s, 7*s, 6*s)

  // Cloud logo on chest (white ☁ pixels)
  ctx.fillStyle = '#fff'
  ctx.fillRect(x + 5*s, y + 6*s, 3*s, s)
  ctx.fillRect(x + 4*s, y + 7*s, 5*s, s)
  ctx.fillRect(x + 5*s, y + 5*s, s, s)
  ctx.fillRect(x + 7*s, y + 5*s, s, s)

  // Laptop in right hand
  ctx.fillStyle = '#64748b'
  ctx.fillRect(x + 10*s, y + 6*s, 3*s, 2*s)
  ctx.fillStyle = '#22d3ee'
  ctx.fillRect(x + 10*s, y + 6*s, 3*s, s)

  // Legs
  ctx.fillStyle = '#1e293b'
  if (jumping) {
    ctx.fillRect(x + 4*s, y + 11*s, 2*s, 5*s)
    ctx.fillRect(x + 7*s, y + 11*s, 2*s, 5*s)
  } else {
    const f = Math.floor(frame / 4) % 4
    ctx.fillRect(x + 4*s, y + 11*s, 2*s, 4*s + (f < 2 ? 0 : s))
    ctx.fillRect(x + 7*s, y + 11*s, 2*s, 4*s + (f < 2 ? s : 0))
  }

  // Boots
  ctx.fillStyle = '#ea580c'
  if (!jumping) {
    const f = Math.floor(frame / 4) % 4
    ctx.fillRect(x + 3*s, y + 15*s + (f < 2 ? 0 : s), 3*s, 2*s)
    ctx.fillRect(x + 6*s, y + 15*s + (f < 2 ? s : 0), 3*s, 2*s)
  } else {
    ctx.fillRect(x + 3*s, y + 14*s, 3*s, 2*s)
    ctx.fillRect(x + 6*s, y + 14*s, 3*s, 2*s)
  }
}

function drawCloudObstacle(ctx: CanvasRenderingContext2D, x: number, y: number, type: number) {
  const s = 2
  if (type === 0) {
    // ERROR 500 cloud — red/dark, tall
    ctx.fillStyle = '#7f1d1d'
    ctx.fillRect(x + s, y - 6*s, 7*s, 8*s)
    ctx.fillRect(x, y - 4*s, 9*s, 5*s)
    ctx.fillRect(x + 2*s, y - 8*s, 5*s, 3*s)
    ctx.fillStyle = '#dc2626'
    ctx.fillRect(x + 2*s, y - 7*s, 3*s, s)
    // "!" mark
    ctx.fillStyle = '#fca5a5'
    ctx.fillRect(x + 4*s, y - 6*s, s, 3*s)
    ctx.fillRect(x + 4*s, y - 2*s, s, s)
  } else if (type === 1) {
    // DOWNTIME cloud — dark gray, wide
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(x, y - 5*s, 11*s, 6*s)
    ctx.fillRect(x + 2*s, y - 7*s, 7*s, 3*s)
    ctx.fillRect(x + s, y - s, 9*s, 2*s)
    ctx.fillStyle = '#334155'
    ctx.fillRect(x + 2*s, y - 6*s, 5*s, s)
    // "X" mark
    ctx.fillStyle = '#94a3b8'
    ctx.fillRect(x + 4*s, y - 4*s, s, s)
    ctx.fillRect(x + 6*s, y - 4*s, s, s)
    ctx.fillRect(x + 5*s, y - 3*s, s, s)
    ctx.fillRect(x + 4*s, y - 2*s, s, s)
    ctx.fillRect(x + 6*s, y - 2*s, s, s)
  } else {
    // 404 cloud — orange/amber, medium
    ctx.fillStyle = '#7c2d12'
    ctx.fillRect(x + s, y - 5*s, 7*s, 6*s)
    ctx.fillRect(x, y - 3*s, 9*s, 4*s)
    ctx.fillRect(x + 2*s, y - 7*s, 5*s, 3*s)
    ctx.fillStyle = '#c2410c'
    ctx.fillRect(x + 2*s, y - 6*s, 3*s, s)
    // Lightning bolt (⚡)
    ctx.fillStyle = '#fed7aa'
    ctx.fillRect(x + 4*s, y - 5*s, 2*s, 2*s)
    ctx.fillRect(x + 3*s, y - 3*s, 2*s, s)
    ctx.fillRect(x + 2*s, y - 2*s, 3*s, s)
  }
}

// Loaded icon images — filled at runtime in the component
const iconImages: Record<CollectibleType, HTMLImageElement | null> = {
  lambda: null,
  s3: null,
  ec2: null,
}

function loadIcons() {
  if (iconImages.lambda) return  // already loaded
  const srcs: Record<CollectibleType, string> = {
    lambda: imgIconLambda,
    s3:     imgIconS3,
    ec2:    imgIconEC2,
  }
  ;(Object.keys(srcs) as CollectibleType[]).forEach(key => {
    const img = new Image()
    img.src = srcs[key]
    iconImages[key] = img
  })
}

const COLLECTIBLE_COLORS: Record<CollectibleType, { bg: string; glow: string; label: string }> = {
  lambda: { bg: '#4c1d95', glow: '#a78bfa', label: '+5 PTS' },
  s3:     { bg: '#14532d', glow: '#4ade80', label: 'ESCUDO' },
  ec2:    { bg: '#7c2d12', glow: '#fb923c', label: '+10 PTS' },
}

function drawCollectible(ctx: CanvasRenderingContext2D, item: Collectible, frame: number) {
  if (item.collected) return
  const SIZE  = 28
  const float = Math.round(Math.sin(frame * 0.09) * 3)
  const { x } = item
  const y = item.y + float
  const cfg = COLLECTIBLE_COLORS[item.type]
  const img = iconImages[item.type]

  // Glowing background badge
  ctx.fillStyle = cfg.bg
  ctx.beginPath()
  ctx.roundRect(x - 2, y - 2, SIZE + 4, SIZE + 4, 6)
  ctx.fill()

  // Glow ring
  ctx.strokeStyle = cfg.glow
  ctx.lineWidth   = 1.5
  ctx.shadowColor = cfg.glow
  ctx.shadowBlur  = 10
  ctx.beginPath()
  ctx.roundRect(x - 2, y - 2, SIZE + 4, SIZE + 4, 6)
  ctx.stroke()
  ctx.shadowBlur = 0

  // AWS icon image (if loaded) or fallback letter
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, x, y, SIZE, SIZE)
  } else {
    ctx.fillStyle = '#fff'
    ctx.font = `bold ${SIZE * 0.55}px monospace`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(item.type[0].toUpperCase(), x + SIZE / 2, y + SIZE / 2)
  }

  // Label below
  ctx.font = 'bold 7px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillStyle = cfg.glow
  ctx.shadowColor = cfg.glow
  ctx.shadowBlur = 4
  ctx.fillText(cfg.label, x + SIZE / 2, y + SIZE + 2)
  ctx.shadowBlur = 0
}

function drawBackground(ctx: CanvasRenderingContext2D, frame: number, bgClouds: BgCloud[], twoPlayer: boolean, groundP1: number, groundP2: number, speed: number) {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H)
  grad.addColorStop(0, '#0a0f1e')
  grad.addColorStop(1, '#0d1a2e')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

  // Data stream particles (vertical cyan lines scrolling)
  ctx.strokeStyle = 'rgba(34,211,238,0.06)'
  ctx.lineWidth = 1
  for (let i = 0; i < 20; i++) {
    const sx = ((i * 73 + frame * speed * 0.3) % CANVAS_W)
    const sy = (i * 31) % (CANVAS_H - 30)
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + 12); ctx.stroke()
  }

  // Background decorative clouds (friendly, gray)
  ctx.fillStyle = 'rgba(148,163,184,0.08)'
  bgClouds.forEach(c => {
    ctx.fillRect(c.x,       c.y,      c.w,       10)
    ctx.fillRect(c.x + 6,   c.y - 6,  c.w - 12,  8)
    ctx.fillRect(c.x + 12,  c.y - 12, c.w - 24,  8)
  })

  // Ground — circuit board style
  const ground1 = twoPlayer ? groundP1 + 38 : GROUND_Y
  if (twoPlayer) {
    // Lane separator
    ctx.strokeStyle = 'rgba(51,65,85,0.6)'
    ctx.setLineDash([4, 4]); ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(0, 95); ctx.lineTo(CANVAS_W, 95); ctx.stroke()
    ctx.setLineDash([])
  }

  // Ground base
  ctx.fillStyle = '#1e293b'
  ctx.fillRect(0, twoPlayer ? groundP1 + 38 : GROUND_Y, CANVAS_W, CANVAS_H)
  ctx.fillRect(0, twoPlayer ? groundP2 + 38 : GROUND_Y, CANVAS_W, CANVAS_H)

  // Circuit traces
  ctx.strokeStyle = 'rgba(34,197,94,0.25)'
  ctx.lineWidth = 1
  const traceOffset = (frame * speed * 0.5) % 40
  for (let i = 0; i < 18; i++) {
    const gx = i * 40 - traceOffset
    ctx.beginPath()
    ctx.moveTo(gx, twoPlayer ? groundP1 + 38 : GROUND_Y)
    ctx.lineTo(gx + 20, twoPlayer ? groundP1 + 38 : GROUND_Y)
    ctx.stroke()
    if (twoPlayer) {
      ctx.beginPath()
      ctx.moveTo(gx, groundP2 + 38)
      ctx.lineTo(gx + 20, groundP2 + 38)
      ctx.stroke()
    }
  }
  // Ground top line glow
  ctx.strokeStyle = 'rgba(34,197,94,0.4)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(0, twoPlayer ? groundP1 + 38 : GROUND_Y)
  ctx.lineTo(CANVAS_W, twoPlayer ? groundP1 + 38 : GROUND_Y)
  ctx.stroke()
  if (twoPlayer) {
    ctx.beginPath()
    ctx.moveTo(0, groundP2 + 38)
    ctx.lineTo(CANVAS_W, groundP2 + 38)
    ctx.stroke()
  }
}

function drawHUD(ctx: CanvasRenderingContext2D, p1: Player, p2: Player | null, twoPlayer: boolean, frame: number, targetScore: number) {
  // P1 lives (hearts)
  ctx.font = 'bold 11px monospace'
  ctx.textAlign = 'left'
  for (let i = 0; i < MAX_LIVES; i++) {
    ctx.fillStyle = i < p1.lives ? '#ef4444' : '#374151'
    ctx.fillText('♥', 6 + i * 14, 14)
  }
  // P1 shield indicator
  if (p1.shield > 0) {
    ctx.fillStyle = '#4ade80'
    ctx.fillText('🛡', 6 + MAX_LIVES * 14 + 2, 14)
  }

  // Score and target (top right)
  const score = p1.score
  const hi = parseInt(localStorage.getItem('rpg-runner-highscore') || '0')
  ctx.fillStyle = '#ffd99a'
  ctx.font = 'bold 13px monospace'
  ctx.textAlign = 'right'
  if (targetScore < 999999) {
    ctx.fillText(`${score}/${targetScore}`, CANVAS_W - 6, 14)
  } else {
    ctx.fillText(`${score} pts`, CANVAS_W - 6, 14)
  }
  ctx.fillStyle = '#475569'
  ctx.font = '9px monospace'
  ctx.fillText(`HI ${Math.max(hi, score)}`, CANVAS_W - 6, 26)

  // P2 lives (two player mode)
  if (twoPlayer && p2) {
    ctx.textAlign = 'left'
    ctx.font = 'bold 11px monospace'
    for (let i = 0; i < MAX_LIVES; i++) {
      ctx.fillStyle = i < p2.lives ? '#ef4444' : '#374151'
      ctx.fillText('♥', 6 + i * 14, 108)
    }
    ctx.fillStyle = '#f87171'
    ctx.font = 'bold 9px monospace'
    ctx.fillText(`P2: ${p2.score} pts`, CANVAS_W - 60, 108)
  }

  // P1/P2 label
  ctx.fillStyle = '#60a5fa'
  ctx.font = '8px monospace'
  ctx.textAlign = 'left'
  ctx.fillText('P1 [SPACE]', 4, CANVAS_H - 4)
  if (twoPlayer) {
    ctx.fillStyle = '#f87171'
    ctx.fillText('P2 [W]', 4, 100)
  }
}

// ── Tutorial items legend ──────────────────────────────────────────────────────
const COLLECTIBLE_INFO = [
  { type: 'ec2'    as CollectibleType, color: '#fb923c', label: 'EC2',    desc: '+10 puntos al recoger' },
  { type: 'lambda' as CollectibleType, color: '#a78bfa', label: 'Lambda', desc: '+5 puntos & +1 Vida' },
  { type: 's3'     as CollectibleType, color: '#4ade80', label: 'S3',     desc: 'Escudo temporal (no da puntos)' },
]

// ── Main Component ─────────────────────────────────────────────────────────────
export const RunnerGame: React.FC<RunnerGameProps> = ({ event, onFinish, inventory = [] }) => {
  // Preload collectible icons on first render
  useEffect(() => { loadIcons() }, [])

  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'tutorial' | 'select' | 'playing' | 'ended'>('tutorial')
  const [result, setResult]               = useState('')
  const [wageredItemId, setWageredItemId] = useState('')

  const makePlayer = (x: number, y: number): Player => ({
    x, y, vy: 0, jumping: false, alive: true, score: 0,
    lives: MAX_LIVES, invincible: 0, shield: 0,
  })

  const gameRef = useRef({
    p1: makePlayer(40, 0),
    p2: makePlayer(40, 0),
    frame: 0,
    speed: GAME_SPEED_INIT,
    obstacles: [] as Obstacle[],
    collectibles: [] as Collectible[],
    bgClouds: Array.from({ length: 6 }, (_, i) => ({
      x: i * 120, y: 20 + (i % 3) * 20, w: 60 + (i % 3) * 20, spd: 0.3 + i * 0.05,
    })) as BgCloud[],
    running: false,
    twoPlayer: false,
    targetScore: event.targetScore || 999999,
  })

  const startGame = useCallback((twoPlayer: boolean) => {
    const g = gameRef.current
    const groundP1 = twoPlayer ? GROUND_Y - 55 : GROUND_Y - 40
    const groundP2 = GROUND_Y - 40
    g.p1 = makePlayer(40, groundP1)
    g.p2 = makePlayer(40, groundP2)
    g.frame = 0; g.speed = GAME_SPEED_INIT
    g.obstacles = []; g.collectibles = []
    g.running = true; g.twoPlayer = twoPlayer
    setPhase('playing'); setResult('')
  }, [])

  // ── Input ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    const onKey = (e: KeyboardEvent) => {
      const g = gameRef.current
      if ((e.code === 'Space' || e.code === 'ArrowUp') && !g.p1.jumping && g.p1.alive) {
        e.preventDefault(); g.p1.vy = JUMP_FORCE; g.p1.jumping = true
      }
      if (e.code === 'KeyW' && g.twoPlayer && !g.p2.jumping && g.p2.alive) {
        e.preventDefault(); g.p2.vy = JUMP_FORCE; g.p2.jumping = true
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase])

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animId: number
    const g = gameRef.current

    const groundP1 = g.twoPlayer ? GROUND_Y - 55 : GROUND_Y - 40
    const groundP2 = GROUND_Y - 40
    const laneY1   = g.twoPlayer ? 80 : GROUND_Y
    const laneY2   = GROUND_Y

    const loop = () => {
      if (!g.running) return
      g.frame++
      g.speed += SPEED_INC

      // ── Update background clouds ──
      g.bgClouds.forEach(c => {
        c.x -= c.spd
        if (c.x + c.w < 0) c.x = CANVAS_W + 20
      })

      // ── Physics ──
      const updatePlayer = (p: Player, ground: number) => {
        if (!p.alive) return
        p.vy += GRAVITY; p.y += p.vy
        if (p.y >= ground) { p.y = ground; p.vy = 0; p.jumping = false }
        if (p.invincible > 0) p.invincible--
        if (p.shield > 0) p.shield--
      }
      updatePlayer(g.p1, groundP1)
      if (g.twoPlayer) updatePlayer(g.p2, groundP2)

      // ── Spawn obstacles ──
      const last = g.obstacles[g.obstacles.length - 1]
      if (!last || last.x < CANVAS_W - 180 - Math.random() * 120) {
        if (Math.random() < 0.022) {
          const type = Math.floor(Math.random() * 3)
          if (g.twoPlayer) {
            g.obstacles.push({ x: CANVAS_W + 10, type, lane: 0 })
            if (Math.random() < 0.6) g.obstacles.push({ x: CANVAS_W + 10 + Math.random() * 50, type: Math.floor(Math.random() * 3), lane: 1 })
          } else {
            g.obstacles.push({ x: CANVAS_W + 10, type, lane: 0 })
          }
        }
      }
      g.obstacles.forEach(o => { o.x -= g.speed })
      g.obstacles = g.obstacles.filter(o => o.x > -30)

      // ── Spawn collectibles ──
      if (Math.random() < 0.004) {
        const types: CollectibleType[] = ['lambda', 's3', 'ec2']
        const type = types[Math.floor(Math.random() * types.length)]
        const laneY = g.twoPlayer && Math.random() < 0.5 ? groundP2 - 46 : groundP1 - 46
        g.collectibles.push({ x: CANVAS_W + 10, y: laneY, type, collected: false })
      }
      g.collectibles.forEach(c => { c.x -= g.speed * 0.9 })
      g.collectibles = g.collectibles.filter(c => c.x > -20 && !c.collected)

      // ── Collectible pickup ──
      const checkCollect = (p: Player) => {
        if (!p.alive) return
        g.collectibles.forEach(c => {
          if (c.collected) return
          if (Math.abs(p.x + 14 - c.x - 14) < 22 && Math.abs(p.y + 16 - c.y - 14) < 28) {
            c.collected = true
            if (c.type === 'lambda') { p.lives = Math.min(MAX_LIVES, p.lives + 1); p.score += 5 }
            else if (c.type === 's3') { p.shield = SHIELD_F }
            else if (c.type === 'ec2') { p.score += 10 }
          }
        })
      }
      checkCollect(g.p1)
      if (g.twoPlayer) checkCollect(g.p2)

      // ── Collision with obstacles ──
      const checkHit = (p: Player, laneY: number, playerLane: number) => {
        if (!p.alive || p.invincible > 0 || p.shield > 0) return
        const pBox = { x: p.x + 8, y: p.y + 4, w: 14, h: 32 }
        for (const o of g.obstacles) {
          if (o.lane !== playerLane) continue
          const oBox = { x: o.x, y: laneY - 18, w: 18, h: 18 }
          if (pBox.x < oBox.x + oBox.w && pBox.x + pBox.w > oBox.x && pBox.y + pBox.h > oBox.y) {
            p.lives--
            p.invincible = INVINCIBLE_F
            if (p.lives <= 0) p.alive = false
            break
          }
        }
      }
      checkHit(g.p1, laneY1, 0)
      if (g.twoPlayer) checkHit(g.p2, laneY2, 1)

      // ── Win/lose ──
      const p1Score = g.p1.score
      const p2Score = g.p2.score

      if (!g.twoPlayer) {
        // Win: reached target score
        if (p1Score >= g.targetScore) {
          g.running = false
          if (p1Score > parseInt(localStorage.getItem('rpg-runner-highscore') || '0'))
            localStorage.setItem('rpg-runner-highscore', String(p1Score))
          setResult(`¡Victoria! — ${p1Score} pts`)
          setPhase('ended')
          onFinish('win', wageredItemId || undefined)
          return
        }
        // Lose: ran out of lives
        if (!g.p1.alive) {
          g.running = false
          if (p1Score > parseInt(localStorage.getItem('rpg-runner-highscore') || '0'))
            localStorage.setItem('rpg-runner-highscore', String(p1Score))
          setResult(`Game Over — ${p1Score} pts`)
          setPhase('ended')
          onFinish('loss', wageredItemId || undefined)
          return
        }
      } else {
        if (!g.p1.alive && !g.p2.alive) {
          g.running = false; setResult('Ambos cayeron'); setPhase('ended'); onFinish('loss', wageredItemId || undefined); return
        }
        if (!g.p1.alive) {
          g.running = false; setResult(`P2 gana — ${p2Score} pts`); setPhase('ended'); onFinish('p2_wins', wageredItemId || undefined); return
        }
        if (!g.p2.alive) {
          g.running = false; setResult(`P1 gana — ${p1Score} pts`); setPhase('ended'); onFinish('p1_wins', wageredItemId || undefined); return
        }
      }

      // ── Draw ──
      drawBackground(ctx, g.frame, g.bgClouds, g.twoPlayer, groundP1, groundP2, g.speed)

      // Collectibles
      g.collectibles.forEach(c => drawCollectible(ctx, c, g.frame))

      // Obstacles
      g.obstacles.forEach(o => {
        const oy = o.lane === 0 ? laneY1 - 2 : laneY2 - 2
        drawCloudObstacle(ctx, o.x, oy, o.type)
      })

      // Players
      if (g.p1.alive) drawEngineer(ctx, g.p1.x, g.p1.y, g.frame, g.p1.jumping, g.p1.invincible, g.p1.shield, false)
      if (g.twoPlayer && g.p2.alive) drawEngineer(ctx, g.p2.x, g.p2.y, g.frame, g.p2.jumping, g.p2.invincible, g.p2.shield, true)

      // HUD
      drawHUD(ctx, g.p1, g.twoPlayer ? g.p2 : null, g.twoPlayer, g.frame, g.targetScore)

      animId = requestAnimationFrame(loop)
    }

    animId = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animId)
  }, [phase, onFinish, wageredItemId])

  // Touch jump
  const handleTouch = () => {
    if (phase !== 'playing') return
    const g = gameRef.current
    if (!g.p1.jumping && g.p1.alive) { g.p1.vy = JUMP_FORCE; g.p1.jumping = true }
  }

  // ── Tutorial screen ────────────────────────────────────────────────────────
  if (phase === 'tutorial') {
    return (
      <div className="aspect-video w-full bg-[#060c1a] p-3 font-mono text-white">
        <div className="flex h-full flex-col rounded border-2 border-orange-500/40 bg-[#0a1428] p-3">
          <div className="mb-2 text-center text-[11px] font-black uppercase tracking-widest text-orange-400">
            ☁ AWS Cloud Runner — Guía rápida
          </div>
          <div className="grid flex-1 grid-cols-2 gap-2 text-[10px]">
            {/* Obstacles */}
            <div className="rounded border border-red-500/30 bg-[#1a0808] p-2">
              <div className="mb-1 font-black text-red-400 uppercase">⚠ Obstáculos — ¡Evítalos!</div>
              <div className="space-y-1 text-slate-300">
                <div className="flex items-center gap-1">
                  <span className="w-16 rounded bg-red-900/60 px-1 text-center text-red-300">Error 500</span>
                  <span>Nube de fallo crítico</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-16 rounded bg-slate-700/60 px-1 text-center text-slate-300">Downtime</span>
                  <span>Nube de caída del sistema</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-16 rounded bg-orange-900/60 px-1 text-center text-orange-300">404</span>
                  <span>Nube de recurso no encontrado</span>
                </div>
              </div>
            </div>
            {/* Collectibles */}
            <div className="rounded border border-cyan-500/30 bg-[#081828] p-2">
              <div className="mb-1 font-black text-cyan-400 uppercase">⚡ Coleccionables AWS</div>
              <div className="space-y-1 text-slate-300">
                {COLLECTIBLE_INFO.map(info => (
                  <div key={info.type} className="flex items-center gap-2">
                    <span className="w-12 rounded px-1 text-center font-bold" style={{ backgroundColor: info.color + '33', color: info.color }}>
                      {info.label}
                    </span>
                    <span>{info.desc}</span>
                  </div>
                ))}
              </div>
            </div>
            {/* Lives */}
            <div className="rounded border border-pink-500/30 bg-[#150d14] p-2">
              <div className="mb-1 font-black text-pink-400 uppercase">❤ Vidas & Puntos</div>
              <div className="text-slate-300">
                <div>Comienzas con <span className="text-pink-300 font-bold">3 vidas</span></div>
                <div>Golpe → parpadeo temporal</div>
                <div><span className="text-orange-300 font-bold">EC2</span> → +10 puntos</div>
                <div><span className="text-purple-300 font-bold">Lambda</span> → +5 pts & +1 vida</div>
                <div className="text-pink-500">0 vidas = Game Over</div>
              </div>
            </div>
            {/* Controls */}
            <div className="rounded border border-blue-500/30 bg-[#080d18] p-2">
              <div className="mb-1 font-black text-blue-400 uppercase">🎮 Controles</div>
              <div className="text-slate-300 space-y-0.5">
                <div><span className="text-blue-300 font-bold">P1:</span> Espacio / ↑ / Toque</div>
                <div><span className="text-red-300 font-bold">P2:</span> Tecla W</div>
                <div className="text-slate-500">El personaje es un Cloud Engineer AWS con casco y laptop</div>
              </div>
            </div>
          </div>
          <button
            onClick={() => setPhase('select')}
            className="mt-2 w-full rounded border border-orange-400/40 bg-gradient-to-b from-orange-600 to-orange-900 py-1.5 text-[11px] font-black uppercase text-white hover:brightness-110"
          >
            ¡Entendido! → Seleccionar Modo
          </button>
        </div>
      </div>
    )
  }

  // ── Mode select ────────────────────────────────────────────────────────────
  if (phase === 'select') {
    return (
      <div className="aspect-video w-full bg-[#060c1a] p-4 font-mono text-white">
        <div className="flex h-full flex-col items-center justify-center rounded border-2 border-orange-500/40 bg-[#0a1428] p-4 gap-3">
          <div className="text-[13px] font-black uppercase tracking-widest text-orange-400">
            ☁ {event.title || 'AWS Cloud Runner'}
          </div>
          {event.prompt && (
            <p className="max-w-xs text-center text-[10px] text-slate-400">{event.prompt}</p>
          )}
          <p className="text-center text-xs text-cyan-300">
            Esquiva las nubes de error · Recoge servicios AWS · Sobrevive con 3 vidas
          </p>
          {event.targetScore && (
            <p className="text-center text-xs font-black text-yellow-300">
              🎯 Meta: {event.targetScore} pts — EC2 vale 10 pts · Lambda vale 5 pts
            </p>
          )}

          {/* Wager */}
          <div className="w-full max-w-xs rounded border border-orange-800/40 bg-[#0d1830] p-2">
            <div className="mb-1 text-[9px] font-black uppercase text-orange-400">Apuesta (opcional)</div>
            <select
              value={wageredItemId}
              onChange={e => setWageredItemId(e.target.value)}
              className="w-full rounded border border-orange-800/40 bg-[#060c1a] px-2 py-1 text-[10px] text-white"
            >
              <option value="">Sin apuesta</option>
              {inventory.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}{(item.quantity || 1) > 1 ? ` x${item.quantity}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => startGame(false)}
              className="rounded border border-sky-500/40 bg-gradient-to-b from-sky-700 to-sky-950 px-5 py-2 text-xs font-black uppercase text-white hover:brightness-110"
            >
              👤 1 Jugador
            </button>
            <button
              onClick={() => startGame(true)}
              className="rounded border border-rose-500/40 bg-gradient-to-b from-rose-700 to-rose-950 px-5 py-2 text-xs font-black uppercase text-white hover:brightness-110"
            >
              👥 2 Jugadores
            </button>
          </div>
          <button onClick={() => setPhase('tutorial')} className="text-[9px] text-slate-600 hover:text-slate-400 underline">
            Ver guía de nuevo
          </button>
        </div>
      </div>
    )
  }

  // ── End screen ─────────────────────────────────────────────────────────────
  if (phase === 'ended') {
    const hi = parseInt(localStorage.getItem('rpg-runner-highscore') || '0')
    const won = result.startsWith('¡Victoria!') || result.includes('P1 gana')
    return (
      <div className="aspect-video w-full bg-[#060c1a] p-4 font-mono text-white">
        <div className="flex h-full flex-col items-center justify-center rounded border-2 border-rose-500/40 bg-[#0a1428] p-4 gap-3">
          <div className={`text-xl font-black ${won ? 'text-emerald-300' : 'text-rose-300'}`}>
            {won ? '🏆 ¡Meta alcanzada!' : '☁ ¡Error en producción!'}
          </div>
          <p className="text-lg font-black text-orange-300">{result}</p>
          <p className="text-xs text-slate-500">🏆 Récord: {hi} pts</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPhase('select')}
              className="rounded border border-orange-500/40 bg-gradient-to-b from-orange-700 to-orange-950 px-4 py-2 text-xs font-black uppercase text-white hover:brightness-110"
            >
              🔄 Reintentar
            </button>
            <button
              onClick={() => setPhase('tutorial')}
              className="rounded border border-slate-600/40 bg-slate-800 px-3 py-2 text-xs text-slate-300 hover:brightness-110"
            >
              Ver guía
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Playing ────────────────────────────────────────────────────────────────
  return (
    <div
      className="aspect-video w-full bg-[#060c1a]"
      onClick={handleTouch}
      onTouchStart={e => { e.preventDefault(); handleTouch() }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="block h-full w-full"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  )
}
