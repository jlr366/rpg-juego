import React, { useEffect, useRef, useState } from 'react'
import { useGame } from '../context/GameProvider'
import { EquipmentSlot } from './EquipmentSlot'

// -- Base & special states -------------------------------------------------------
import imgBase          from '../assets/personaje/operador_comienzo.png'
import imgMuertoSuelo   from '../assets/personaje/operador_dentro.png'
import imgCritico       from '../assets/personaje/operador_completo_dorado.png'
import imgLuzDorada     from '../assets/personaje/operador_completo_dorado.png'
import imgLuzAzul       from '../assets/personaje/operador_completo.png'
import imgSaltoVictoria from '../assets/personaje/salto_epico.png'
import imgVolando       from '../assets/personaje/operador_completo.png'
import imgCompleto      from '../assets/personaje/operador_completo.png'

// -- Single-piece images --------------------------------------------------------
import img_antebrazos from '../assets/personaje/operador_antebrazos.png'
import img_botas      from '../assets/personaje/operador_botas.png'
import img_brazos     from '../assets/personaje/operador_brazos.png'
import img_casco      from '../assets/personaje/operador_casco.png'
import img_mochila    from '../assets/personaje/operador_mochila.png'
import img_pechera    from '../assets/personaje/operador_pechera.png'

// -- 2-piece combinations -------------------------------------------------------
import img_antebrazos_botas   from '../assets/personaje/operador_antebrazos_botas.png'
import img_antebrazos_brazos  from '../assets/personaje/operador_antebrazos_brazos.png'
import img_antebrazos_casco   from '../assets/personaje/operador_casco_antebrasos.png'
import img_antebrazos_mochila from '../assets/personaje/operador_antebrazos_mochila.png'
import img_antebrazos_pechera from '../assets/personaje/operador_pechera_antebrazos.webp'
import img_botas_brazos       from '../assets/personaje/operador_botas_brazos.png'
import img_botas_casco        from '../assets/personaje/operador_casco_botas.png'
import img_botas_mochila      from '../assets/personaje/operador_mochila_botas.png'
import img_botas_pechera      from '../assets/personaje/operador_pechera_botas.webp'
import img_brazos_casco       from '../assets/personaje/operador_casco_brazos.png'
import img_brazos_mochila     from '../assets/personaje/operador_mochila_brazos.png'
import img_brazos_pechera     from '../assets/personaje/operador_pechera_brazos.png'
import img_casco_mochila      from '../assets/personaje/operador_casco_mochila.png'
import img_casco_pechera      from '../assets/personaje/operador_casco_pechera.png'
import img_mochila_pechera    from '../assets/personaje/operador_pechera_mochila.png'

// -- 3-piece combinations -------------------------------------------------------
import img_antebrazos_botas_mochila   from '../assets/personaje/operador_antebrazos_botas_mochila.png'
import img_antebrazos_brazos_pechera  from '../assets/personaje/operador_pechera_brazos_antebrazos.png'
import img_antebrazos_botas_brazos    from '../assets/personaje/operador_antebrazos_botas_brazos.png'
import img_antebrazos_botas_casco     from '../assets/personaje/operador_casco_antebrazos_botas.png'
import img_antebrazos_botas_pechera   from '../assets/personaje/operador_pechera_antebrazos_botas.png'
import img_antebrazos_brazos_casco    from '../assets/personaje/operador_casco_antebrazos_brazos.png'
import img_antebrazos_brazos_mochila  from '../assets/personaje/operador_antebrazos_mochila_brazos.png'
import img_antebrazos_casco_mochila   from '../assets/personaje/operador_casco_antebrazos_mochila.png'
import img_antebrazos_casco_pechera   from '../assets/personaje/operador_casco_pechera_antebrazos.png'
import img_antebrazos_mochila_pechera from '../assets/personaje/operador_pechera_mochila_antebrazos.png'
import img_botas_brazos_casco         from '../assets/personaje/operador_casco_brazos_botas.png'
import img_botas_brazos_mochila       from '../assets/personaje/operador_botas_mochila_brazos.png'
import img_botas_brazos_pechera       from '../assets/personaje/operador_pechera_botas_brazos.png'
import img_botas_casco_mochila        from '../assets/personaje/operador_casco_botas_mochila.png'
import img_botas_casco_pechera        from '../assets/personaje/operador_casco_pechera_botas.png'
import img_botas_mochila_pechera      from '../assets/personaje/operador_pechera_mochila_botas.webp'
import img_brazos_casco_mochila       from '../assets/personaje/operador_casco_mochila_brazos.png'
import img_brazos_casco_pechera       from '../assets/personaje/operador_casco_pechera_brazos.png'
import img_brazos_mochila_pechera     from '../assets/personaje/operador_pechera_mochila_brazos.png'
import img_casco_mochila_pechera      from '../assets/personaje/operador_mochila_casco_pechera.png'

// -- 4-piece combinations -------------------------------------------------------
import img_antebrazos_botas_brazos_casco      from '../assets/personaje/operador_casco_brazos_antebrazos_botas.png'
import img_botas_brazos_casco_mochila         from '../assets/personaje/operador_casco_brazos_antebrazos_botas_mochila.png'
import img_antebrazos_botas_brazos_mochila   from '../assets/personaje/operador_antebrazos_mochila_brazos_botas.png'
import img_antebrazos_botas_brazos_pechera   from '../assets/personaje/operador_pechera_antebrazos_brazos_botas.png'
import img_antebrazos_botas_casco_mochila    from '../assets/personaje/operador_casco_antebrazos_mochila_botas_.png'
import img_antebrazos_botas_casco_pechera    from '../assets/personaje/operador_casco_pechera_botas_antebrazos.png'
import img_antebrazos_botas_mochila_pechera  from '../assets/personaje/operador_pechera_mochila_antebrazos_botas.png'
import img_antebrazos_brazos_casco_mochila   from '../assets/personaje/operador_casco_antebrazos_mochila_brazos.png'
import img_antebrazos_brazos_casco_pechera   from '../assets/personaje/operador_casco_pechera_antebrazos_brazos.png'
import img_antebrazos_brazos_mochila_pechera from '../assets/personaje/operador_antebrazos_mochila_pechera_brazos.png'
import img_antebrazos_casco_mochila_pechera  from '../assets/personaje/operador_casco_pechera_antebrazos_mochila.png'
import img_botas_brazos_casco_pechera        from '../assets/personaje/operador_casco_pechera_botas_brazos.png'
import img_botas_brazos_mochila_pechera      from '../assets/personaje/operador_pechera_botas_brazos_mochila.png'
import img_botas_casco_mochila_pechera       from '../assets/personaje/operador_mochila_casco_botas_pechera.png'
import img_brazos_casco_mochila_pechera      from '../assets/personaje/operador_casco_pechera_mochila_brazos.png'

// -- 5-piece combinations -------------------------------------------------------
import img_antebrazos_botas_brazos_casco_mochila   from '../assets/personaje/operador_casco_antebrazos_botas_brazos_mochila.png'
import img_antebrazos_botas_brazos_casco_pechera   from '../assets/personaje/operador_casco_pechera_brazos_botas_antebrazos.png'
import img_antebrazos_botas_brazos_mochila_pechera from '../assets/personaje/operador_pechera_mochila_brazos_botas_antebrazos.png'
import img_antebrazos_botas_casco_mochila_pechera  from '../assets/personaje/operador_casco_pechera_antebrazos_mochila_botas.png'
import img_antebrazos_brazos_casco_mochila_pechera from '../assets/personaje/operador_casco_pechera_mochila_brazos_antebrazos.png'
import img_botas_brazos_casco_mochila_pechera      from '../assets/personaje/operador_casco_pechera_mochila_brazos_botas.png'

// -- Combo lookup table (key = sorted piece names joined by "_") ----------------
const COMBO_MAP: Record<string, string> = {
  // 1-piece
  antebrazos: img_antebrazos,
  botas:      img_botas,
  brazos:     img_brazos,
  casco:      img_casco,
  mochila:    img_mochila,
  pechera:    img_pechera,
  // 2-piece
  antebrazos_botas:   img_antebrazos_botas,
  antebrazos_brazos:  img_antebrazos_brazos,
  antebrazos_casco:   img_antebrazos_casco,
  antebrazos_mochila: img_antebrazos_mochila,
  antebrazos_pechera: img_antebrazos_pechera,
  botas_brazos:       img_botas_brazos,
  botas_casco:        img_botas_casco,
  botas_mochila:      img_botas_mochila,
  botas_pechera:      img_botas_pechera,
  brazos_casco:       img_brazos_casco,
  brazos_mochila:     img_brazos_mochila,
  brazos_pechera:     img_brazos_pechera,
  casco_mochila:      img_casco_mochila,
  casco_pechera:      img_casco_pechera,
  mochila_pechera:    img_mochila_pechera,
  // 3-piece
  antebrazos_botas_mochila:   img_antebrazos_botas_mochila,
  antebrazos_brazos_pechera:  img_antebrazos_brazos_pechera,
  antebrazos_botas_brazos:    img_antebrazos_botas_brazos,
  antebrazos_botas_casco:     img_antebrazos_botas_casco,
  antebrazos_botas_pechera:   img_antebrazos_botas_pechera,
  antebrazos_brazos_casco:    img_antebrazos_brazos_casco,
  antebrazos_brazos_mochila:  img_antebrazos_brazos_mochila,
  antebrazos_casco_mochila:   img_antebrazos_casco_mochila,
  antebrazos_casco_pechera:   img_antebrazos_casco_pechera,
  antebrazos_mochila_pechera: img_antebrazos_mochila_pechera,
  botas_brazos_casco:         img_botas_brazos_casco,
  botas_brazos_mochila:       img_botas_brazos_mochila,
  botas_brazos_pechera:       img_botas_brazos_pechera,
  botas_casco_mochila:        img_botas_casco_mochila,
  botas_casco_pechera:        img_botas_casco_pechera,
  botas_mochila_pechera:      img_botas_mochila_pechera,
  brazos_casco_mochila:       img_brazos_casco_mochila,
  brazos_casco_pechera:       img_brazos_casco_pechera,
  brazos_mochila_pechera:     img_brazos_mochila_pechera,
  casco_mochila_pechera:      img_casco_mochila_pechera,
  // 4-piece
  antebrazos_botas_brazos_casco:     img_antebrazos_botas_brazos_casco,
  botas_brazos_casco_mochila:        img_botas_brazos_casco_mochila,
  antebrazos_botas_brazos_mochila:   img_antebrazos_botas_brazos_mochila,
  antebrazos_botas_brazos_pechera:   img_antebrazos_botas_brazos_pechera,
  antebrazos_botas_casco_mochila:    img_antebrazos_botas_casco_mochila,
  antebrazos_botas_casco_pechera:    img_antebrazos_botas_casco_pechera,
  antebrazos_botas_mochila_pechera:  img_antebrazos_botas_mochila_pechera,
  antebrazos_brazos_casco_mochila:   img_antebrazos_brazos_casco_mochila,
  antebrazos_brazos_casco_pechera:   img_antebrazos_brazos_casco_pechera,
  antebrazos_brazos_mochila_pechera: img_antebrazos_brazos_mochila_pechera,
  antebrazos_casco_mochila_pechera:  img_antebrazos_casco_mochila_pechera,
  botas_brazos_casco_pechera:        img_botas_brazos_casco_pechera,
  botas_brazos_mochila_pechera:      img_botas_brazos_mochila_pechera,
  botas_casco_mochila_pechera:       img_botas_casco_mochila_pechera,
  brazos_casco_mochila_pechera:      img_brazos_casco_mochila_pechera,
  // 5-piece
  antebrazos_botas_brazos_casco_mochila:   img_antebrazos_botas_brazos_casco_mochila,
  antebrazos_botas_brazos_casco_pechera:   img_antebrazos_botas_brazos_casco_pechera,
  antebrazos_botas_brazos_mochila_pechera: img_antebrazos_botas_brazos_mochila_pechera,
  antebrazos_botas_casco_mochila_pechera:  img_antebrazos_botas_casco_mochila_pechera,
  antebrazos_brazos_casco_mochila_pechera: img_antebrazos_brazos_casco_mochila_pechera,
  botas_brazos_casco_mochila_pechera:      img_botas_brazos_casco_mochila_pechera,
  // 6-piece (all slots)
  antebrazos_botas_brazos_casco_mochila_pechera: imgCompleto,
}

// Removal priority for fallback: least visible/important first
const REMOVAL_PRIORITY = ['antebrazos', 'botas', 'mochila', 'brazos', 'pechera', 'casco']

function getEquipImage(pieces: string[]): string {
  if (pieces.length === 0) return imgBase
  const sorted = [...pieces].sort()
  const direct = COMBO_MAP[sorted.join('_')]
  if (direct) return direct
  // Try removing one piece at a time using priority order
  for (const toRemove of REMOVAL_PRIORITY) {
    const reduced = sorted.filter(p => p !== toRemove)
    if (reduced.length > 0) {
      const fallback = COMBO_MAP[reduced.join('_')]
      if (fallback) return fallback
    }
  }
  return imgBase
}

// -- Equipment slots shown in the UI -------------------------------------------
const slots = [
  { key: 'head',   label: 'Casco'            },
  { key: 'chest',  label: 'Pechera'          },
  { key: 'ring',   label: 'Antebrazos'       },
  { key: 'legs',   label: 'Botas'            },
  { key: 'boots',  label: 'Mochila'          },
  { key: 'weapon', label: 'Brazos Robóticos' },
] as const

// -- Main component ------------------------------------------------------------
export const EquipmentPanel: React.FC = () => {
  const { equipment, health, maxHealth, lastCombatResult, inventory } = useGame()

  const head   = equipment.head   || null
  const chest  = equipment.chest  || null
  const legs   = equipment.legs   || null
  const weapon = equipment.weapon || null
  const ring   = equipment.ring   || null
  const boots  = equipment.boots  || null

  const totalPower = [head, chest, legs, weapon, ring, boots].reduce(
    (sum, item) => sum + (item?.power || 0), 0
  )

  const [potionActive, setPotionActive] = useState(false)
  const [potionPhase,  setPotionPhase]  = useState<1|2>(1)
  const prevHealthRef = useRef<number | null>(null)
  const potionTimer   = useRef<number | null>(null)

  const [glitching,  setGlitching]  = useState(false)
  const glitchTimer = useRef<number | null>(null)

  const [victoryJump, setVictoryJump] = useState<'combat' | 'item' | null>(null)
  const victoryTimer  = useRef<number | null>(null)
  const prevCombatRef = useRef<string>('none')
  const prevInvCount  = useRef<number>(-1)

  // Glitch on damage
  useEffect(() => {
    if (prevHealthRef.current === null) return
    if (health < (prevHealthRef.current ?? health) && health > 0) {
      setGlitching(true)
      if (glitchTimer.current) clearTimeout(glitchTimer.current)
      glitchTimer.current = window.setTimeout(() => setGlitching(false), 460)
    }
  }, [health])

  // Detect potion use
  useEffect(() => {
    if (prevHealthRef.current === null) { prevHealthRef.current = health; return }
    if (health > prevHealthRef.current) {
      if (potionTimer.current) clearTimeout(potionTimer.current)
      setPotionActive(true); setPotionPhase(1)
      potionTimer.current = window.setTimeout(() => {
        setPotionPhase(2)
        potionTimer.current = window.setTimeout(() => setPotionActive(false), 4000)
      }, 4000)
    }
    prevHealthRef.current = health
  }, [health])

  // Detect combat victory → salto épico 3s
  useEffect(() => {
    if (prevCombatRef.current === lastCombatResult) return
    prevCombatRef.current = lastCombatResult
    if (lastCombatResult === 'enemy_defeat') {
      if (victoryTimer.current) clearTimeout(victoryTimer.current)
      setVictoryJump('combat')
      victoryTimer.current = window.setTimeout(() => setVictoryJump(null), 3000)
    }
  }, [lastCombatResult])

  // Detect item gained → volando 2s
  useEffect(() => {
    const count = inventory?.length ?? 0
    if (prevInvCount.current === -1) { prevInvCount.current = count; return }
    if (count > prevInvCount.current) {
      if (victoryTimer.current) clearTimeout(victoryTimer.current)
      setVictoryJump('item')
      victoryTimer.current = window.setTimeout(() => setVictoryJump(null), 2000)
    }
    prevInvCount.current = count
  }, [inventory?.length])

  // Determine displayed image
  const healthPct = maxHealth > 0 ? health / maxHealth : 1

  const equippedPieces = [
    head   ? 'casco'      : null,
    chest  ? 'pechera'    : null,
    ring   ? 'antebrazos' : null,
    legs   ? 'botas'      : null,
    boots  ? 'mochila'    : null,
    weapon ? 'brazos'     : null,
  ].filter(Boolean) as string[]

  const equipImage = getEquipImage(equippedPieces)

  let specialImage: string | null = null
  if (health <= 0) {
    specialImage = imgMuertoSuelo
  } else if (victoryJump === 'combat') {
    specialImage = imgSaltoVictoria
  } else if (victoryJump === 'item') {
    specialImage = imgVolando
  } else if (potionActive) {
    specialImage = imgLuzDorada
  } else if (healthPct < 0.10) {
    specialImage = imgCritico
  }

  const displayImage = specialImage ?? equipImage

  // Crossfade on any image change
  const [shownImage, setShownImage] = useState(displayImage)
  const [prevImg,    setPrevImg]    = useState(displayImage)
  const [fading,     setFading]     = useState(false)
  const fadeTimer = useRef<number | null>(null)

  useEffect(() => {
    if (displayImage !== shownImage) {
      setPrevImg(shownImage)
      setShownImage(displayImage)
      setFading(true)
      if (fadeTimer.current) clearTimeout(fadeTimer.current)
      requestAnimationFrame(() => requestAnimationFrame(() => setFading(false)))
    }
  }, [displayImage])

  const equipCount = equippedPieces.length

  return (
    <div className="rounded-lg border border-cyan-900/60 bg-[#0a1628]/95 p-4 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_0_0_1px_rgba(0,200,255,0.08)]">

      {/* Header */}
      <div className="mb-4 rounded border border-cyan-800/50 bg-[#0d1f3c] px-3 py-2 text-center shadow-inner">
        <h2 className="text-lg font-black uppercase tracking-wide text-cyan-300">
          Equipo
          {totalPower > 0 && (
            <span className="ml-2 text-sm font-bold text-emerald-400">+{totalPower}</span>
          )}
        </h2>
      </div>

      {/* Character display */}
      <div className={`relative mx-auto mb-5 max-w-[280px] select-none overflow-hidden rounded-xl border border-cyan-900/40 bg-black shadow-[0_8px_32px_rgba(0,0,0,0.8)]${glitching ? ' glitch-anim' : ''}`}>

        <img src={prevImg} alt="" className="block w-full"
          style={{ opacity: 1, position: 'absolute', inset: 0, zIndex: 1 }}
          draggable={false} />
        <img src={shownImage} alt="Operador" className="relative z-[2] block w-full"
          style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.7s ease-in-out' }}
          draggable={false} />

        <div className="pointer-events-none absolute inset-0 opacity-15" style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,200,255,0.04) 2px, rgba(0,200,255,0.04) 4px)',
        }} />
        <div className="pointer-events-none absolute inset-0" style={{
          backgroundImage: 'radial-gradient(ellipse 90% 95% at 50% 50%, transparent 40%, rgba(0,0,0,0.75) 100%)',
        }} />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />

        {health <= 0 && (
          <div className="absolute inset-x-4 bottom-3 rounded border border-red-500/60 bg-red-950/80 px-3 py-1.5 text-center text-xs font-bold text-red-300 backdrop-blur-sm">
            OPERADOR CAIDO
          </div>
        )}
        {victoryJump === 'combat' && (
          <div className="absolute inset-x-4 bottom-3 rounded border border-yellow-400/70 bg-yellow-950/80 px-3 py-1.5 text-center text-xs font-bold text-yellow-300 backdrop-blur-sm animate-bounce">
            ⚡ ¡VICTORIA!
          </div>
        )}
        {victoryJump === 'item' && (
          <div className="absolute inset-x-4 bottom-3 rounded border border-emerald-400/70 bg-emerald-950/80 px-3 py-1.5 text-center text-xs font-bold text-emerald-300 backdrop-blur-sm animate-bounce">
            🎁 ¡ITEM OBTENIDO!
          </div>
        )}
        {potionActive && !victoryJump && (
          <div className="absolute inset-x-4 bottom-3 rounded border border-emerald-400/60 bg-emerald-950/80 px-3 py-1.5 text-center text-xs font-bold text-emerald-300 backdrop-blur-sm animate-pulse">
            {potionPhase === 1 ? 'ESTIMULANTE ACTIVO' : 'LUZ DORADA ACTIVA'}
          </div>
        )}
        {healthPct < 0.25 && health > 0 && !potionActive && !victoryJump && (
          <div className="absolute inset-x-4 bottom-3 rounded border border-red-400/60 bg-red-950/80 px-3 py-1.5 text-center text-xs font-bold text-red-300 backdrop-blur-sm animate-pulse">
            {healthPct < 0.10 ? '☠ CRÍTICO' : '⚠ PELIGRO'}
          </div>
        )}
        {equipCount === 0 && health > 0 && !potionActive && !victoryJump && (
          <div className="absolute inset-x-4 bottom-3 rounded border border-cyan-800/40 bg-[#0a1628]/80 px-3 py-1.5 text-center text-[11px] text-cyan-300/60 italic backdrop-blur-sm">
            Sin equipo
          </div>
        )}
      </div>

      {/* Slot grid */}
      <div className="grid grid-cols-2 gap-2">
        {slots.map(({ key, label }) => (
          <EquipmentSlot key={key} slot={key} label={label} item={equipment[key] || null} />
        ))}
      </div>
    </div>
  )
}
