/**
 * File: src/components/ExplorationPanel.tsx
 * Description: Narrative exploration panel where the 4-map-node story is a linear
 * sequence. Shows a persistent scene title, the map, a central story/log panel and the
 * node options. When the player dies the header shows a distinct death title with
 * visual emphasis (animation + color) and the GameProvider moves inventory + equipped
 * items into the scene so they are removed from the player.
 */

import React, { useEffect, useRef, useState } from 'react'
import { PlusCircle, Swords, Volume2, VolumeX, Skull, CheckCircle } from 'lucide-react'
import { useGame } from '../context/GameProvider'
import { Item } from '../types'
import MapMini, { ExplorationStep as MapStep } from './MapMini'
import { RunnerGame, RunnerResult } from './RunnerGame'
import { TechQuizGame, TechQuizEventConfig, QuizResult } from './TechQuizGame'
import { TechSnakeGame, TechSnakeEventConfig, SnakeResult } from './TechSnakeGame'
import { MinefieldGame, MinefieldEventConfig, MinefieldResult } from './MinefieldGame'
import { CircuitPuzzleGame, CircuitPuzzleEventConfig, CircuitPuzzleResult } from './CircuitPuzzleGame'
import { NetworkCardGame, NetworkCardEventConfig, NetworkCardResult } from './NetworkCardGame'
import { useMusic } from '../context/MusicProvider'
import { API_BASE_URL } from '../config'
import { useAuth } from '../context/AuthProvider'

// -- Memory game: AWS tech icons ------------------------------------------------
import imgMemEC2     from '../assets/Architecture-Service-Icons_07312025/Arch_Compute/64/Arch_Amazon-EC2_64.png'
import imgMemLambda  from '../assets/Architecture-Service-Icons_07312025/Arch_Compute/64/Arch_AWS-Lambda_64.png'
import imgMemS3      from '../assets/Architecture-Service-Icons_07312025/Arch_Storage/64/Arch_Amazon-Simple-Storage-Service_64.png'
import imgMemRDS     from '../assets/Architecture-Service-Icons_07312025/Arch_Database/64/Arch_Amazon-RDS_64.png'
import imgMemDynamo  from '../assets/Architecture-Service-Icons_07312025/Arch_Database/64/Arch_Amazon-DynamoDB_64.png'
import imgMemCF      from '../assets/Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/64/Arch_Amazon-CloudFront_64.png'
import imgMemAPI     from '../assets/Architecture-Service-Icons_07312025/Arch_Networking-Content-Delivery/64/Arch_Amazon-API-Gateway_64.png'
import imgMemBedrock from '../assets/Architecture-Service-Icons_07312025/Arch_Artificial-Intelligence/64/Arch_Amazon-Bedrock_64.png'

// -- Combat splash images -------------------------------------------------------
import imgCombatIntro   from '../assets/imagenes/jungla_combate.webp'
import imgCombatVictory from '../assets/imagenes/explosion_final.webp'
import imgCombatDefeat  from '../assets/personaje/operador_dentro.png'

interface StorySceneConfig {
  key: string
  title: string
  musicUrl?: string
  mediaUrl?: string
  mediaType?: string
  mapX?: number
  mapY?: number
  story: string[]
  isEnding?: boolean
}

interface StoryDecisionConfig {
  sceneKey: string
  label: string
  nextSceneKey: string
}

interface StoryEnemyConfig {
  key: string
  sceneKey: string
  name: string
  attack: number
  defense: number
  weakWeapon?: string
  victoryTitle?: string
  defeatTitle?: string
  defeatDescription?: string
}

interface StoryNodeItemConfig {
  sceneKey: string
  name: string
  type: string
  slot?: string
  power: number
  rarity?: string
  description?: string
  specialDuration?: number
}

interface StoryChoiceEventConfig {
  key: string
  sceneKey: string
  title: string
  prompt: string
  optionALabel: string
  optionAEffect: string
  optionAItemName?: string
  optionAItemType?: string
  optionAItemPower?: number
  optionAText?: string
  optionBLabel: string
  optionBEffect: string
  optionBItemName?: string
  optionBItemType?: string
  optionBItemPower?: number
  optionBText?: string
  correctOption?: string
  explanation?: string
}

interface MemoryEventConfig {
  key: string
  sceneKey: string
  title: string
  prompt?: string
  memoryEnemyName?: string
  memoryTurnSeconds?: number
  memoryStakeItemName?: string
  memoryRewardItemName?: string
  memoryRewardItemType?: string
  memoryRewardItemSlot?: string
  memoryRewardItemPower?: number
  memoryWinText?: string
  memoryLoseText?: string
}

interface RunnerEventConfig {
  key: string
  sceneKey: string
  title: string
  prompt?: string
  targetScore?: number
  rewardItemName?: string
  rewardItemType?: string
  rewardItemSlot?: string
  rewardItemPower?: number
  winText?: string
  loseText?: string
}

export type MemoryDuelResult = 'win' | 'loss' | 'draw'

interface StoryConfig {
  scenes: StorySceneConfig[]
  decisions: StoryDecisionConfig[]
  enemies?: StoryEnemyConfig[]
  nodeItems?: StoryNodeItemConfig[]
  storyEvents?: StoryChoiceEventConfig[]
  memoryEvents?: MemoryEventConfig[]
  deathTitles?: Array<{ enemyKey: string; title: string; description: string }>
  endings?: Array<{ sceneKey: string; title: string; description: string }>
  mapLocations?: Array<{ key: string; name: string; x: number; y: number; icon: string }>
  runnerEvents?: RunnerEventConfig[]
  quizEvents?: TechQuizEventConfig[]
  snakeEvents?: TechSnakeEventConfig[]
  minefieldEvents?: MinefieldEventConfig[]
  networkCardEvents?: NetworkCardEventConfig[]
  circuitLevels?: import('./CircuitPuzzleGame').CircuitLevelConfig[]
}

/**
 * Function: generateId
 * Generates a compact unique id string for loot items.
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

function sampleLootPool(): Item {
  const pool: Array<Omit<Item, 'id'>> = [
    {
      name: 'Telescopio Derecho',
      type: 'weapon',
      slot: 'weapon',
      power: 8,
      description: 'Dispositivo de largo alcance montado en el brazo derecho del operador.',
      rarity: 'rare',
    },
    {
      name: 'Brazos Roboticos',
      type: 'weapon',
      slot: 'weapon',
      power: 12,
      description: 'Exoesqueleto de brazos con potencia aumentada para combate cuerpo a cuerpo.',
      rarity: 'epic',
    },
    {
      name: 'Casco Operador',
      type: 'armor',
      slot: 'head',
      power: 5,
      description: 'Casco de alta tecnologia con visor HUD integrado.',
      rarity: 'common',
    },
    {
      name: 'Pecho Blindado',
      type: 'armor',
      slot: 'chest',
      power: 9,
      description: 'Blindaje de pecho reforzado con planchas de titanio.',
      rarity: 'rare',
    },
    {
      name: 'Canilleras Operativas',
      type: 'armor',
      slot: 'legs',
      power: 5,
      description: 'Protectores de pierna con amortiguadores de impacto.',
      rarity: 'common',
    },
    {
      name: 'Antebrazos Tacticos',
      type: 'accessory',
      slot: 'ring',
      power: 4,
      description: 'Protectores de antebrazo con sensores de campo integrados.',
      rarity: 'common',
    },
    {
      name: 'Telescopio Izquierdo',
      type: 'accessory',
      slot: 'ring',
      power: 6,
      description: 'Dispositivo de escaneo montado en el brazo izquierdo.',
      rarity: 'rare',
    },
    {
      name: 'Bolso Tactico',
      type: 'accessory',
      slot: 'boots',
      power: 3,
      description: 'Bolso modular con compartimentos para equipo de campo.',
      rarity: 'common',
    },
    {
      name: 'Estimulo Medico',
      type: 'potion',
      description: 'Restaura vida al operador.',
      rarity: 'common',
    },
  ]
  const pick = pool[Math.floor(Math.random() * pool.length)]
  return { ...pick, id: generateId() }
}

function createStrongSword(): Item {
  return {
    id: generateId(),
    name: 'Brazos Roboticos Avanzados',
    type: 'weapon',
    slot: 'weapon',
    power: 15,
    description: 'Exoesqueleto de combate de maxima potencia, obtenido como recompensa.',
    rarity: 'epic',
  }
}

function itemFromConfig(item: StoryNodeItemConfig): Item {
  return {
    id: generateId(),
    name: item.name,
    type: item.type as Item['type'],
    slot: (item.slot || undefined) as Item['slot'],
    power: Number.isFinite(Number(item.power)) ? Number(item.power) : 0,
    description: item.description || '',
    rarity: (item.rarity || 'common') as Item['rarity'],
  }
}

/**
 * Component: ExplorationPanel
 * Main exploration UI with persistent scene title, central log and node actions.
 */
export const ExplorationPanel: React.FC<{ demoMode?: boolean }> = ({ demoMode = false }) => {
  const { user } = useAuth()
  const {
    acquireItem,
    combat,
    startWolfEncounter,
    resolveCombatRound,
    fleeCombat,
    health,
    maxHealth,
    lastCombatResult,
    lastEnemyName,
    resetGame,
    reviveFromDeath,
    startCombat,
    storyKill,
    injure,
    lastEventTitle,
    dropInventoryToScene,
    getSceneItems,
    pickUpSceneItem,
    inventory,
    dropItem,
    log,
    autoWinCombat,
    equipment,
  } = useGame()
  const effectiveInjure = demoMode ? (() => {}) : injure

  /**
   * Safe helpers for scene APIs (fallbacks if missing).
   */
  const dropInventoryToSceneSafe = (sceneKey: string) => {
    if (typeof dropInventoryToScene === 'function') {
      dropInventoryToScene(sceneKey)
      return
    }
    if (inventory && dropItem) {
      inventory.forEach(i => dropItem(i.id))
    }
  }

  const getSceneItemsSafe = (sceneKey: string) => {
    if (typeof getSceneItems === 'function') return getSceneItems(sceneKey)
    return [] as Item[]
  }

  const pickUpSceneItemSafe = (sceneKey: string, itemId: string) => {
    if (typeof pickUpSceneItem === 'function') return pickUpSceneItem(sceneKey, itemId)
    return
  }

  const { setScene, playCombatAlert, mute, toggleMute, volume, setVolume } = useMusic()

  /**
   * Sequence state.
   */
  const [nodesVisited, setNodesVisited] = useState<boolean[]>([false, false, false, false])
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [currentSceneKey, setCurrentSceneKey] = useState<string>('')
  const [nodeStage, setNodeStage] = useState<'initial' | 'house_inside' | 'resolved'>('initial')
  const [pendingTroll, setPendingTroll] = useState<boolean>(false)
  const [pendingAdvance, setPendingAdvance] = useState<number | null>(null)
  const [combatSplash, setCombatSplash] = useState<'intro' | 'victory' | 'defeat' | null>(null)
  const splashTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevCombatRef = React.useRef<boolean>(false)
  const prevLastResultRef = React.useRef<string | null>(null)
  const [pendingConfiguredNext, setPendingConfiguredNext] = useState<string | null>(null)
  const [blockedDecision, setBlockedDecision] = useState<StoryDecisionConfig | null>(null)

  const [step, setStep] = useState<MapStep>('camino')
  const [storyConfig, setStoryConfig] = useState<StoryConfig | null>(null)
  const [collectedNodeItems, setCollectedNodeItems] = useState<Record<string, boolean>>({})
  const [openedChests, setOpenedChests] = useState<Record<string, boolean>>({})
  const [resolvedConfiguredEnemies, setResolvedConfiguredEnemies] = useState<Record<string, boolean>>({})
  const [fledConfiguredEnemies, setFledConfiguredEnemies] = useState<Record<string, boolean>>({})
  const [resolvedStoryEvents, setResolvedStoryEvents] = useState<Record<string, boolean>>({})
  const [resolvedMemoryEvents, setResolvedMemoryEvents] = useState<Record<string, boolean>>({})
  const [eventResultText, setEventResultText] = useState('')
  const [pendingStoryFeedback, setPendingStoryFeedback] = useState<{
    wasCorrect: boolean | null
    explanation: string
    event: StoryChoiceEventConfig
    option: 'A' | 'B'
  } | null>(null)
  const [activeMemoryEvent, setActiveMemoryEvent]     = useState<MemoryEventConfig | null>(null)
  const [activeRunnerEvent, setActiveRunnerEvent]     = useState<RunnerEventConfig | null>(null)
  const [activeTechQuizEvent, setActiveTechQuizEvent] = useState<TechQuizEventConfig | null>(null)
  const [activeTechSnakeEvent, setActiveTechSnakeEvent] = useState<TechSnakeEventConfig | null>(null)
  const [activeMinefieldEvent, setActiveMinefieldEvent] = useState<MinefieldEventConfig | null>(null)
  const [resolvedMinefieldEvents, setResolvedMinefieldEvents] = useState<Record<string, boolean>>({})
  const [activeCircuitPuzzleEvent, setActiveCircuitPuzzleEvent] = useState<CircuitPuzzleEventConfig | null>(null)
  const [resolvedCircuitPuzzleEvents, setResolvedCircuitPuzzleEvents] = useState<Record<string, boolean>>({})
  const [activeNetworkCardEvent, setActiveNetworkCardEvent] = useState<NetworkCardEventConfig | null>(null)
  const [resolvedNetworkCardEvents, setResolvedNetworkCardEvents] = useState<Record<string, boolean>>({})
  const [resolvedRunnerEvents, setResolvedRunnerEvents] = useState<Record<string, boolean>>({})
  const [pendingGameReward, setPendingGameReward] = useState<{ name: string; type: string; slot?: string; power: number; rarity?: string; description?: string } | null>(null)
  const [gameResultPending, setGameResultPending] = useState(false)
  const [lastPenaltyHP, setLastPenaltyHP] = useState(0)
  const specialPotionEndRef = useRef<number>(0)
  const [specialPotionSecs, setSpecialPotionSecs] = useState(0)
  const nodeAudioRef   = useRef<HTMLAudioElement | null>(null)
  const globalAudioRef = useRef<HTMLAudioElement | null>(null)
  const transientAudioRef = useRef<HTMLAudioElement | null>(null)
  const lastStoryUpdateRef = useRef('')
  const activeConfiguredEnemyKeyRef = useRef('')
  const didRestoreRef = useRef(false)

  const sessionSaveKey = user ? `rpg-adventure-current-${user.id}` : ''
  const checkpointSaveKey = user ? `rpg-adventure-checkpoint-${user.id}` : ''

  const loadStoryConfig = React.useCallback(async (forceFirstScene = false) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/story-config?t=${Date.now()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (response.ok) {
        const data = await response.json()
        const config = data.config || null
        setStoryConfig(config)
        const updateMarker = localStorage.getItem('rpg-story-config-updated-at') || ''
        const prevMarker = lastStoryUpdateRef.current
        lastStoryUpdateRef.current = updateMarker

        if (!config?.scenes?.length) return

        if (demoMode) {
          // In demo mode: refresh config in place so the admin sees changes at their
          // current node without navigating from the first scene each time.
          if (!currentSceneKey || !config.scenes.some((s: StorySceneConfig) => s.key === currentSceneKey)) {
            setCurrentSceneKey(config.scenes[0].key)
          }
          // Clear resolved state so events appear fresh after each admin save
          setResolvedStoryEvents({})
          setResolvedMemoryEvents({})
          setResolvedConfiguredEnemies({})
          setNodeStage('initial')
          setEventResultText('')
          setPendingStoryFeedback(null)
          return
        }

        const shouldForceFirst = forceFirstScene || (updateMarker !== '' && updateMarker !== prevMarker)
        if (shouldForceFirst) {
          setCurrentSceneKey(config.scenes[0].key)
          setCurrentIndex(0)
          setStep('camino')
          setNodesVisited([false, false, false, false])
          setNodeStage('initial')
          setPendingTroll(false)
          setPendingAdvance(null)
          setPendingConfiguredNext(null)
          setBlockedDecision(null)
          setCollectedNodeItems({})
          setOpenedChests({})
          setResolvedConfiguredEnemies({})
          setFledConfiguredEnemies({})
          setResolvedStoryEvents({})
          setResolvedMemoryEvents({})
          setEventResultText('')
          setActiveMemoryEvent(null)
          activeConfiguredEnemyKeyRef.current = ''
        } else if (!currentSceneKey || !config.scenes.some((scene: StorySceneConfig) => scene.key === currentSceneKey)) {
          setCurrentSceneKey(config.scenes[0].key)
        }
      }
    } catch (error) {
      console.error('Error loading story config:', error)
    }
  }, [currentSceneKey, demoMode])

  useEffect(() => {
    loadStoryConfig()
  }, [loadStoryConfig])

  useEffect(() => {
    const refresh = () => loadStoryConfig()
    const refreshForced = () => loadStoryConfig(true)
    const refreshFromStorage = (event: StorageEvent) => {
      if (event.key === 'rpg-story-config-updated-at') loadStoryConfig(true)
    }

    window.addEventListener('focus', refresh)
    window.addEventListener('rpg-story-config-updated', refreshForced)
    window.addEventListener('storage', refreshFromStorage)
    return () => {
      window.removeEventListener('focus', refresh)
      window.removeEventListener('rpg-story-config-updated', refreshForced)
      window.removeEventListener('storage', refreshFromStorage)
    }
  }, [loadStoryConfig])

  /**
   * State: pinnedTitle
   * When the player dies this stores the death title so it remains visible across
   * subsequent events until the adventure is reset. Null means no pinned death title.
   */
  /**
   * State: pinnedTitle
   * When the player dies this stores the death title so it remains visible across
   * subsequent events until the adventure is reset. Null means no pinned death title.
   */
  const [pinnedTitle, setPinnedTitle] = useState<string | null>(null)

  /**
   * State: showVictoryAnim
   * Temporary visual feedback when the player reclaims a scene (enemy_victory).
   */
  const [showVictoryAnim, setShowVictoryAnim] = useState<boolean>(false)

  useEffect(() => {
    const keys: MapStep[] = ['camino', 'bosque', 'arbustos', 'claroLobos']
    const knownStep = keys.includes(currentSceneKey as MapStep)
      ? currentSceneKey as MapStep
      : keys[currentIndex]
    setStep(knownStep)
    const mapping: Record<MapStep, 'camino' | 'bosque' | 'arbustos' | 'claroLobos'> = {
      camino: 'camino',
      bosque: 'bosque',
      arbustos: 'arbustos',
      claroLobos: 'claroLobos',
    }
    setScene(mapping[knownStep])
  }, [currentIndex, currentSceneKey, setScene])

  useEffect(() => {
    if (combat && combat.inCombat) {
      playCombatAlert()
      setScene('combat')
    } else {
      const t = setTimeout(() => {
        const mapping: Record<MapStep, 'camino' | 'bosque' | 'arbustos' | 'claroLobos'> = {
          camino: 'camino',
          bosque: 'bosque',
          arbustos: 'arbustos',
          claroLobos: 'claroLobos',
        }
        setScene(mapping[step])
      }, 400)
      return () => clearTimeout(t)
    }
  }, [combat, playCombatAlert, setScene, step])

  // -- Combat splash: intro when combat starts --------------------------------
  useEffect(() => {
    const nowInCombat = !!combat
    if (nowInCombat && !prevCombatRef.current) {
      if (splashTimerRef.current) clearTimeout(splashTimerRef.current)
      setCombatSplash('intro')
      splashTimerRef.current = setTimeout(() => setCombatSplash(null), 2500)
    }
    prevCombatRef.current = nowInCombat
  }, [combat])

  // -- Combat splash: victory / defeat when combat ends ---------------------
  useEffect(() => {
    if (lastCombatResult === prevLastResultRef.current) return
    prevLastResultRef.current = lastCombatResult
    if (lastCombatResult === 'enemy_victory') {
      if (splashTimerRef.current) clearTimeout(splashTimerRef.current)
      setCombatSplash('victory')
      const vs = (storyConfig as any)?.victorySound as string | undefined
      if (vs && !mute) { try { if (transientAudioRef.current) { transientAudioRef.current.pause(); transientAudioRef.current.currentTime = 0 } const a = new Audio(vs); a.volume = volume; transientAudioRef.current = a; a.play().catch(() => {}) } catch {} }
    } else if (lastCombatResult === 'enemy_defeat') {
      if (splashTimerRef.current) clearTimeout(splashTimerRef.current)
      setCombatSplash('defeat')
      const ds = (storyConfig as any)?.defeatSound as string | undefined
      if (ds && !mute) { try { if (transientAudioRef.current) { transientAudioRef.current.pause(); transientAudioRef.current.currentTime = 0 } const a = new Audio(ds); a.volume = volume; transientAudioRef.current = a; a.play().catch(() => {}) } catch {} }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCombatResult])

  // -- Stop victory/defeat sound when node changes ----------------------------
  useEffect(() => {
    if (transientAudioRef.current) {
      transientAudioRef.current.pause()
      transientAudioRef.current.currentTime = 0
      transientAudioRef.current = null
    }
  }, [currentSceneKey])

  // -- Special potion countdown -----------------------------------------------
  useEffect(() => {
    if (specialPotionSecs <= 0) return
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((specialPotionEndRef.current - Date.now()) / 1000))
      setSpecialPotionSecs(remaining)
      if (remaining === 0) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [specialPotionSecs])

  const specialPotionActive = specialPotionSecs > 0

  const activateSpecialPotion = (durationSeconds: number) => {
    specialPotionEndRef.current = Date.now() + durationSeconds * 1000
    setSpecialPotionSecs(durationSeconds)
  }

  /**
   * Mark current node resolved and advance.
   */
  const markCurrentResolved = () => {
    setNodesVisited(prev => {
      const copy = [...prev]
      copy[currentIndex] = true
      return copy
    })
    setNodeStage('resolved')
    const next = Math.min(currentIndex + 1, Math.max(0, (storyConfig?.scenes.length || 1) - 1))
    setCurrentIndex(next)
    setPendingTroll(false)
    setPendingAdvance(null)
  }

  const goToScene = (sceneKey: string, resetEnemiesForVisit = true) => {
    const keys: MapStep[] = ['camino', 'bosque', 'arbustos', 'claroLobos']
    const index = keys.indexOf(sceneKey as MapStep)
    if (index >= 0) {
      setCurrentIndex(index)
      setStep(sceneKey as MapStep)
    } else {
      const configuredIndex = storyConfig?.scenes.findIndex(scene => scene.key === sceneKey) ?? -1
      if (configuredIndex >= 0) setCurrentIndex(configuredIndex)
    }
    setCurrentSceneKey(sceneKey)
    setNodeStage('initial')
    setPendingTroll(false)
    setPendingAdvance(null)
    setBlockedDecision(null)
    setEventResultText('')
    setActiveMemoryEvent(null)
    setActiveRunnerEvent(null)
    setActiveTechQuizEvent(null)
    setActiveTechSnakeEvent(null)
    setActiveMinefieldEvent(null)
    setActiveCircuitPuzzleEvent(null)
    setActiveNetworkCardEvent(null)
    setPendingGameReward(null)
    setGameResultPending(false)
    setLastPenaltyHP(0)
    if (resetEnemiesForVisit) {
      setResolvedConfiguredEnemies(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(key => {
          if (key.startsWith(`${sceneKey}:`)) delete next[key]
        })
      return next
    })
    setResolvedStoryEvents(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${sceneKey}:`)) delete next[key]
      })
      return next
    })
    setResolvedMemoryEvents(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${sceneKey}:`)) delete next[key]
      })
      return next
    })
  }
  }

  const startConfiguredEnemyCombat = (enemy: StoryEnemyConfig, nextSceneKey: string | null = null) => {
    const enemyAttack = Number(enemy.attack) || 12
    const enemyDefense = Number(enemy.defense) || 60
    const fullEnemyKey = `${enemy.sceneKey}:${enemy.key}`
    activeConfiguredEnemyKeyRef.current = fullEnemyKey
    setFledConfiguredEnemies(prev => {
      const next = { ...prev }
      delete next[fullEnemyKey]
      return next
    })
    setPendingAdvance(null)
    setPendingConfiguredNext(nextSceneKey)
    setPendingTroll(enemy.key.toLowerCase() === 'robot' || enemy.key.toLowerCase() === 'trol' || enemy.name.toLowerCase().includes('robot') || enemy.name.toLowerCase().includes('trol'))
    startCombat({
      inCombat: true,
      enemyKey: fullEnemyKey,
      enemyName: enemy.name || enemy.key || 'Enemigo',
      enemyHealth: enemyDefense,
      enemyMaxHealth: enemyDefense,
      enemyDamageMin: Math.max(1, Math.floor(enemyAttack * 0.6)),
      enemyDamageMax: Math.max(2, Math.ceil(enemyAttack * 1.2)),
      weakWeapon: enemy.weakWeapon || '',
      victoryTitle: enemy.victoryTitle || '',
      defeatTitle: enemy.defeatTitle || '',
      nextSceneKey: nextSceneKey || undefined,
    })
  }

  const handleFleeCombat = () => {
    const enemyKey = activeConfiguredEnemyKeyRef.current
    if (enemyKey) {
      setFledConfiguredEnemies(prev => ({ ...prev, [enemyKey]: true }))
      activeConfiguredEnemyKeyRef.current = ''
    }
    setPendingAdvance(null)
    setPendingConfiguredNext(null)
    setPendingTroll(false)
    fleeCombat()
  }

  const getDecisionBlockingEnemy = (decision: StoryDecisionConfig) => {
    if (!decision.nextSceneKey) return null
    return storyConfig?.enemies?.find(enemy => (
      enemy.sceneKey === decision.nextSceneKey &&
      !resolvedConfiguredEnemies[`${enemy.sceneKey}:${enemy.key}`]
    )) || null
  }

  const resolveConfiguredDecision = (decision: StoryDecisionConfig) => {
    const blockingEnemy = getDecisionBlockingEnemy(decision)
    if (blockingEnemy) {
      setBlockedDecision(decision)
      startConfiguredEnemyCombat(blockingEnemy, decision.nextSceneKey || null)
      return
    }

    if (decision.nextSceneKey) {
      goToScene(decision.nextSceneKey)
    } else {
      markCurrentResolved()
    }
  }

  const applyStoryEventEffect = (event: StoryChoiceEventConfig, option: 'A' | 'B') => {
    const effect = option === 'A' ? event.optionAEffect : event.optionBEffect
    const text = option === 'A' ? event.optionAText : event.optionBText
    const itemName = option === 'A' ? event.optionAItemName : event.optionBItemName
    const itemType = option === 'A' ? event.optionAItemType : event.optionBItemType
    const itemPower = option === 'A' ? event.optionAItemPower : event.optionBItemPower

    setEventResultText(text || '')

    if (effect === 'reward_item' && itemName) {
      const visual = resolveEquipVisual(itemType || 'misc')
      acquireItem({
        id: generateId(),
        name: itemName,
        type: visual.type,
        slot: visual.slot,
        power: Number(itemPower) || 0,
        rarity: Number(itemPower) >= 10 ? 'epic' : Number(itemPower) >= 5 ? 'rare' : 'common',
        description: text || `Premio recibido en ${event.title}`,
      })
      return
    }

    if (effect === 'damage_half') {
      effectiveInjure(Math.max(1, Math.ceil(health / 2)), step)
      return
    }

    if (effect === 'death') {
      storyKill(text || 'El evento acaba con tu aventura.', step)
      return
    }

    if (effect === 'remove_item') {
      const item = inventory.find(entry => entry.type !== 'potion' && entry.type !== 'consumable') || inventory[0]
      if (item) dropItem(item.id)
    }
  }

  const applyStoryEventChoice = (event: StoryChoiceEventConfig, option: 'A' | 'B') => {
    setResolvedStoryEvents(prev => ({ ...prev, [`${event.sceneKey}:${event.key}`]: true }))

    const wasCorrect = event.correctOption ? event.correctOption === option : null
    setPendingStoryFeedback({ wasCorrect, explanation: event.explanation || '', event, option })
  }

  const dismissStoryFeedback = () => {
    if (!pendingStoryFeedback) return
    const { event, option } = pendingStoryFeedback
    setPendingStoryFeedback(null)
    applyStoryEventEffect(event, option)
  }

  const finishMemoryDuel = (event: MemoryEventConfig, result: MemoryDuelResult, wageredItemId?: string) => {
    setActiveMemoryEvent(null)
    setResolvedMemoryEvents(prev => ({ ...prev, [`${event.sceneKey}:${event.key}`]: true }))

    if (result === 'win') {
      const rewardName = event.memoryRewardItemName
      if (rewardName) {
        const power = Number(event.memoryRewardItemPower) || 0
        applyGameReward(rewardName, event.memoryRewardItemType || 'misc', power, event.memoryWinText || `¡Ganaste el duelo de memoria contra ${event.memoryEnemyName || 'el rival'}!`, event.memoryRewardItemSlot)
      } else {
        setEventResultText(event.memoryWinText || `¡Ganaste el duelo de memoria!`)
        setGameResultPending(true)
      }
      return
    }

    if (result === 'loss') {
      const stakedItem = wageredItemId ? inventory.find(item => item.id === wageredItemId) : null
      if (stakedItem) dropItem(stakedItem.id)
      const loseText = event.memoryLoseText || (stakedItem
        ? `Perdiste el duelo de memoria y entregas ${stakedItem.name}.`
        : `Perdiste el duelo de memoria contra ${event.memoryEnemyName || 'el rival'}.`)
      applyGameLoss(loseText)
      return
    }

    setEventResultText('El duelo termina empatado.')
    setGameResultPending(true)
  }

  const applyGameReward = (name: string, type: string, power: number, winText: string, slot?: string) => {
    playOneShot((storyConfig as any)?.victorySound)
    setEventResultText(winText)
    setPendingGameReward({ name, type, slot, power, rarity: power >= 10 ? 'epic' : power >= 5 ? 'rare' : 'common', description: winText })
  }

  const applyGameLoss = (loseText: string) => {
    const penalty = Math.max(1, Math.ceil(health / 4))
    effectiveInjure(penalty, step)
    setLastPenaltyHP(penalty)
    playOneShot((storyConfig as any)?.defeatSound)
    setEventResultText(loseText)
    setGameResultPending(true)
  }

  // Los unicos 6 slots de equipamiento reales (ver EquipmentPanel.tsx -> slots).
  // 'armor'/'accessory' son valores legados de configuraciones guardadas antes
  // de unificar los tipos de premio; se mapean a un slot razonable por compatibilidad.
  const resolveEquipVisual = (raw: string): { type: Item['type']; slot: Item['slot'] | undefined } => {
    if (raw === 'head' || raw === 'chest' || raw === 'legs' || raw === 'boots') return { type: 'armor', slot: raw }
    if (raw === 'ring')      return { type: 'ring', slot: 'ring' }
    if (raw === 'weapon')    return { type: 'weapon', slot: 'weapon' }
    if (raw === 'potion')    return { type: 'potion', slot: undefined }
    if (raw === 'armor')     return { type: 'armor', slot: 'chest' }
    if (raw === 'accessory') return { type: 'ring', slot: 'ring' }
    return { type: 'misc', slot: undefined }
  }

  const finishRunnerEvent = (event: RunnerEventConfig, result: RunnerResult, _wageredItemId?: string) => {
    setActiveRunnerEvent(null)
    setResolvedRunnerEvents(prev => ({ ...prev, [`${event.sceneKey}:${event.key}`]: true }))
    if (result === 'win' || result === 'p1_wins') {
      if (event.rewardItemName) {
        applyGameReward(event.rewardItemName, event.rewardItemType || 'misc', Number(event.rewardItemPower) || 0, event.winText || '¡Superaste el desafío runner!', event.rewardItemSlot)
      } else {
        setEventResultText(event.winText || '¡Superaste el desafío runner!')
        setGameResultPending(true)
      }
    } else {
      applyGameLoss(event.loseText || 'No lograste completar el desafío.')
    }
  }

  const finishTechQuiz = (event: TechQuizEventConfig, result: QuizResult) => {
    setActiveTechQuizEvent(null)
    setResolvedRunnerEvents(prev => ({ ...prev, [`${event.sceneKey}:${event.key}`]: true }))
    if (result === 'win') {
      if (event.rewardItemName) {
        applyGameReward(event.rewardItemName, event.rewardItemType || 'misc', Number(event.rewardItemPower) || 3, event.winText || '¡Dominaste el AWS Quiz!', event.rewardItemSlot)
      } else {
        setEventResultText(event.winText || '¡Dominaste el AWS Quiz!')
        setGameResultPending(true)
      }
    } else {
      applyGameLoss(event.loseText || 'Fallaste el quiz. La nube guarda sus secretos.')
    }
  }

  const finishTechSnake = (event: TechSnakeEventConfig, result: SnakeResult) => {
    setActiveTechSnakeEvent(null)
    setResolvedRunnerEvents(prev => ({ ...prev, [`${event.sceneKey}:${event.key}`]: true }))
    if (result === 'win') {
      if (event.rewardItemName) {
        applyGameReward(event.rewardItemName, event.rewardItemType || 'misc', Number(event.rewardItemPower) || 3, event.winText || '¡Dominaste la red!', event.rewardItemSlot)
      } else {
        setEventResultText(event.winText || '¡Dominaste la red!')
        setGameResultPending(true)
      }
    } else {
      applyGameLoss(event.loseText || 'La conexión se perdió.')
    }
  }

  const finishMinefield = (event: MinefieldEventConfig, result: MinefieldResult) => {
    const evKey = `${event.sceneKey}:${event.key}`
    setActiveMinefieldEvent(null)
    setResolvedMinefieldEvents(prev => ({ ...prev, [evKey]: true }))
    if (result === 'win') {
      if (event.rewardItemName) {
        applyGameReward(event.rewardItemName, event.rewardItemType || 'misc', Number(event.rewardItemPower) || 5, event.winText || '¡Destruiste al androide!', event.rewardItemSlot)
      } else {
        setEventResultText(event.winText || '¡Destruiste al androide!')
        setGameResultPending(true)
      }
    } else {
      applyGameLoss(event.loseText || 'El androide te superó.')
    }
  }

  const finishCircuitPuzzle = (event: CircuitPuzzleEventConfig, result: CircuitPuzzleResult) => {
    const evKey = `${event.sceneKey}:${event.key}`
    setActiveCircuitPuzzleEvent(null)
    setResolvedCircuitPuzzleEvents(prev => ({ ...prev, [evKey]: true }))
    if (result === 'win') {
      if (event.rewardItemName) {
        applyGameReward(event.rewardItemName, event.rewardItemType || 'misc', Number(event.rewardItemPower) || 5, event.winText || '¡Circuito completado!', event.rewardItemSlot)
      } else {
        setEventResultText(event.winText || '¡Circuito completado!')
        setGameResultPending(true)
      }
    } else {
      applyGameLoss(event.loseText || 'El circuito falló.')
    }
  }

  const finishNetworkCard = (event: NetworkCardEventConfig, result: NetworkCardResult) => {
    const evKey = `${event.sceneKey}:${event.key}`
    setActiveNetworkCardEvent(null)
    setResolvedNetworkCardEvents(prev => ({ ...prev, [evKey]: true }))
    if (result === 'win') {
      if (event.rewardItemName) {
        applyGameReward(event.rewardItemName, event.rewardItemType || 'misc', Number(event.rewardItemPower) || 5, event.winText || '¡Dominaste la seguridad de red!', event.rewardItemSlot)
      } else {
        setEventResultText(event.winText || '¡Dominaste la seguridad de red!')
        setGameResultPending(true)
      }
    } else if (result === 'loss') {
      applyGameLoss(event.loseText || 'La red AWS te superó.')
    } else {
      setEventResultText('Duelo igualado — nadie domina la red.')
      setGameResultPending(true)
    }
  }

  /**
   * resolveInitialChoice
   * Start combat with sceneKey awareness so death drops items into node.
   */
  const resolveInitialChoice = (choice: 'seguir' | 'entrarCasa' | 'explorar') => {
    if (choice === 'seguir') {
      const item = sampleLootPool()
      acquireItem(item)
      markCurrentResolved()
    } else if (choice === 'entrarCasa') {
      setNodeStage('house_inside')
    } else if (choice === 'explorar') {
      const troll: any = {
        inCombat: true,
        enemyKey: `${step}:robot`,
        enemyName: 'Robot Anti-Nube',
        enemyHealth: 100,
        enemyMaxHealth: 100,
        enemyDamageMin: 10,
        enemyDamageMax: 18,
      }
      setPendingAdvance(currentIndex + 1)
      setPendingTroll(true)
      startCombat(troll)
    }
  }

  /**
   * resolveHouseDecision
   * Pass step to injure/storyKill so reducer drops items at current node on death.
   */
  const resolveHouseDecision = (choice: 'help' | 'kill') => {
    if (choice === 'help') {
      const sword = createStrongSword()
      const potion: Item = {
        id: generateId(),
        name: 'Poción de Agradecimiento',
        type: 'potion',
        description: 'Una poción entregada por el hada, recupera algo de vida.',
        rarity: 'rare',
      }
      acquireItem(sword)
      acquireItem(potion)
      markCurrentResolved()
    } else if (choice === 'kill') {
      const damage = Math.max(1, Math.floor(health / 2))
      if (damage >= health) {
        storyKill('La sangre del hada te consume; tu vida se extingue.', step)
      } else {
        effectiveInjure(damage, step)
        markCurrentResolved()
      }
    }
  }

  useEffect(() => {
    if (!pendingAdvance) return
    if (lastCombatResult === 'enemy_victory') {
      const next = pendingAdvance
      setPendingAdvance(null)
      setNodesVisited(prev => {
        const copy = [...prev]
        const toMark = Math.max(0, next - 1)
        copy[toMark] = true
        return copy
      })
      setCurrentIndex(Math.min(next, 3))
    } else if (lastCombatResult === 'enemy_defeat') {
      setPendingAdvance(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCombatResult, pendingAdvance])

  useEffect(() => {
    if (lastCombatResult === 'enemy_victory' && pendingConfiguredNext) {
      const next = pendingConfiguredNext
      setPendingConfiguredNext(null)
      setBlockedDecision(null)
      goToScene(next, false)
    } else if (lastCombatResult === 'enemy_defeat') {
      setPendingConfiguredNext(null)
      if (blockedDecision?.sceneKey) goToScene(blockedDecision.sceneKey)
      setBlockedDecision(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastCombatResult, pendingConfiguredNext])

  const inCombat = Boolean(combat && combat.inCombat)

  const isDeath =
    health <= 0 &&
    (lastCombatResult === 'enemy_defeat' || lastCombatResult === 'story_death')

  /**
   * Effect: manage pinned death title
   * - Pin the death title when the player dies for the first time.
   * - If a subsequent death produces a different title, replace the pinned title.
   * - Clear the pinned title when the player wins (enemy_victory).
   * - The pinned title is also cleared when starting a new adventure (handled in restart).
   */
  /**
   * Effect: update pinned title on terminal events
   * - On death (combat or story) set pinnedTitle to the death title.
   * - On victory (enemy_victory) set pinnedTitle to a victory title.
   * - Pinned title always reflects the latest terminal event and is only cleared when the adventure is restarted.
   */
  React.useEffect(() => {
    // Victory: set a victory title and show brief animation
    if (lastCombatResult === 'enemy_victory') {
      const victoryTitle = lastEventTitle || `Has reclamado la escena`
      setPinnedTitle(victoryTitle)
      setShowVictoryAnim(true)
      const t = setTimeout(() => setShowVictoryAnim(false), 2200)
      return () => clearTimeout(t)
    }

    // Death: always set the pinned title to the death title when dying
    if (isDeath) {
      setPinnedTitle(lastEventTitle || getDeathTitle())
    }
  }, [isDeath, lastCombatResult, lastEventTitle, step])

  /**
   * Function: getDeathTitle
   * Returns a title to display on death.
   */
  const getDeathTitle = (): string => {
    if (lastCombatResult === 'story_death') return 'Has muerto'
    if (lastEventTitle) return lastEventTitle
    const configuredTitle = storyConfig?.deathTitles?.find(death => death.enemyKey === `${currentSceneKey}:${(lastEnemyName || '').toLowerCase()}`)?.title
    if (configuredTitle) return configuredTitle
    if (lastCombatResult === 'enemy_defeat' && lastEnemyName) return `Te mato ${lastEnemyName}`
    if (pendingTroll && lastCombatResult === 'enemy_defeat') return 'Eliminado por el Robot Anti-Nube'
    const titles: Record<MapStep, string> = {
      camino: 'Has muerto en el camino',
      bosque: 'Has muerto en el bosque',
      arbustos: 'Has muerto entre arbustos',
      claroLobos: 'Comida de lobos',
    }
    return titles[step] ?? 'Has muerto'
  }

  const handleRestartGame = () => {
    // Reset character (health / equip / inventory) on backend
    resetGame()
    // Clear any active combat
    fleeCombat()
    // Story position
    setCurrentIndex(0)
    setCurrentSceneKey(storyConfig?.scenes[0]?.key || '')
    setNodesVisited([])
    setNodeStage('initial')
    // Pending/blocked navigation
    setPendingAdvance(null)
    setPendingConfiguredNext(null)
    setPendingTroll(false)
    setBlockedDecision(null)
    // All resolved/collected flags
    setCollectedNodeItems({})
    setOpenedChests({})
    setResolvedConfiguredEnemies({})
    setFledConfiguredEnemies({})
    setResolvedStoryEvents({})
    setResolvedMemoryEvents({})
    setResolvedRunnerEvents({})
    // Active events / mini-games
    setEventResultText('')
    setActiveMemoryEvent(null)
    setActiveRunnerEvent(null)
    setActiveTechQuizEvent(null)
    setActiveTechSnakeEvent(null)
    setActiveMinefieldEvent(null)
    setResolvedMinefieldEvents({})
    setActiveCircuitPuzzleEvent(null)
    setResolvedCircuitPuzzleEvents({})
    setActiveNetworkCardEvent(null)
    setResolvedNetworkCardEvents({})
    setPendingGameReward(null)
    setGameResultPending(false)
    setLastPenaltyHP(0)
    // Combat animation state
    setCombatRolling(false)
    setCombatDiceDisplay(null)
    setBonusDiceActive(false)
    setCombatSplash(null)
    // Refs
    activeConfiguredEnemyKeyRef.current = ''
    runnerDismissedRef.current = ''
    prevCombatRef.current = false
    prevLastResultRef.current = null
    // UI
    setStep('camino')
    setPinnedTitle(null)
  }

  // Auto-restart on death: show death screen for 4 s then reset
  const deathAutoRestartRef = React.useRef<number | null>(null)
  const [deathCountdown, setDeathCountdown] = React.useState(4)

  React.useEffect(() => {
    if (isDeath) {
      setDeathCountdown(4)
      let remaining = 4
      const tick = window.setInterval(() => {
        remaining -= 1
        setDeathCountdown(remaining)
        if (remaining <= 0) {
          clearInterval(tick)
          restartAdventure()
        }
      }, 1000)
      deathAutoRestartRef.current = tick
      return () => clearInterval(tick)
    } else {
      if (deathAutoRestartRef.current) {
        clearInterval(deathAutoRestartRef.current)
        deathAutoRestartRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDeath])

  const handleReturnToPrevious = () => {
    reviveFromDeath()
    const safe = Math.max(0, currentIndex - 1)
    setStep(['camino', 'bosque', 'arbustos', 'claroLobos'][safe])
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = Number(e.target.value) / 100
    setVolume(v)
  }

  const configuredScene = storyConfig?.scenes.find(scene => scene.key === currentSceneKey)
  const configuredDecisions = storyConfig?.decisions.filter(decision => decision.sceneKey === currentSceneKey) || []
  const configuredDeath = storyConfig?.deathTitles?.find(death => death.enemyKey === `${currentSceneKey}:${(lastEnemyName || '').toLowerCase()}`)
  const configuredEnemyDeath = storyConfig?.enemies?.find(enemy => (
    enemy.sceneKey === currentSceneKey &&
    `${currentSceneKey}:${enemy.key}` === `${currentSceneKey}:${(lastEnemyName || '').toLowerCase()}`
  ))
  const configuredEnding = storyConfig?.endings?.find(ending => ending.sceneKey === currentSceneKey)
  const configuredCurrentEnemies = storyConfig?.enemies?.filter(enemy => (
    enemy.sceneKey === currentSceneKey &&
    !resolvedConfiguredEnemies[`${enemy.sceneKey}:${enemy.key}`]
  )) || []
  const configuredStoryEvents = storyConfig?.storyEvents?.filter(event => (
    event.sceneKey === currentSceneKey &&
    !resolvedStoryEvents[`${event.sceneKey}:${event.key}`]
  )) || []
  const configuredMemoryEvents = storyConfig?.memoryEvents?.filter(event => (
    event.sceneKey === currentSceneKey &&
    !resolvedMemoryEvents[`${event.sceneKey}:${event.key}`]
  )) || []
  const configuredRunnerEvents = storyConfig?.runnerEvents?.filter(event => (
    event.sceneKey === currentSceneKey &&
    !resolvedRunnerEvents[`${event.sceneKey}:${event.key}`]
  )) || []
  const configuredQuizEvents = storyConfig?.quizEvents?.filter(event => (
    event.sceneKey === currentSceneKey &&
    !resolvedRunnerEvents[`${event.sceneKey}:${event.key}`]
  )) || []
  const configuredSnakeEvents = storyConfig?.snakeEvents?.filter(event => (
    event.sceneKey === currentSceneKey &&
    !resolvedRunnerEvents[`${event.sceneKey}:${event.key}`]
  )) || []
  const hasStoryEventInScene = Boolean(storyConfig?.storyEvents?.some(event => event.sceneKey === currentSceneKey))
  const hasMemoryEventInScene = Boolean(storyConfig?.memoryEvents?.some(event => event.sceneKey === currentSceneKey))
  const hasRunnerEventInScene = Boolean(storyConfig?.runnerEvents?.some(event => event.sceneKey === currentSceneKey))
  const currentStoryEvent = configuredStoryEvents[0] || null
  const currentMemoryEvent = configuredMemoryEvents[0] || null
  const currentRunnerEvent = configuredRunnerEvents[0] || null
  const currentQuizEvent   = configuredQuizEvents[0]  || null
  const currentSnakeEvent  = configuredSnakeEvents[0] || null
  const configuredMinefieldEvents = (storyConfig?.minefieldEvents || []).filter(event => (
    event.sceneKey === currentSceneKey &&
    !resolvedMinefieldEvents[`${event.sceneKey}:${event.key}`]
  ))
  const currentMinefieldEvent = configuredMinefieldEvents[0] || null

  const configuredCircuitPuzzleEvents = (storyConfig?.circuitPuzzleEvents || []).filter(event => (
    event.sceneKey === currentSceneKey &&
    !resolvedCircuitPuzzleEvents[`${event.sceneKey}:${event.key}`]
  ))
  const currentCircuitPuzzleEvent = configuredCircuitPuzzleEvents[0] || null

  const configuredNetworkCardEvents = (storyConfig?.networkCardEvents || []).filter(event => (
    event.sceneKey === currentSceneKey &&
    !resolvedNetworkCardEvents[`${event.sceneKey}:${event.key}`]
  ))
  const currentNetworkCardEvent = configuredNetworkCardEvents[0] || null

  const fledCurrentEnemies = configuredCurrentEnemies.filter(enemy => fledConfiguredEnemies[`${enemy.sceneKey}:${enemy.key}`])
  const configuredNodeItems = storyConfig?.nodeItems?.filter(item => (
    item.sceneKey === currentSceneKey &&
    !collectedNodeItems[`${item.sceneKey}:${item.name}`]
  )) || []
  const sceneTitle = configuredScene?.title || configuredEnding?.title || (currentSceneKey ? `Nodo ${currentSceneKey}` : 'Explorar')
  const mapMarker = {
    x: Number.isFinite(Number(configuredScene?.mapX)) ? Number(configuredScene?.mapX) : 50,
    y: Number.isFinite(Number(configuredScene?.mapY)) ? Number(configuredScene?.mapY) : 50,
  }
  const resolvedStory = ['Nodo resuelto. Elige otra decision desde el administrador para continuar la ruta.']
  const combatStory = [
    `El ${combat?.enemyName || 'enemigo'} se planta frente a ti. El mundo se reduce al peso del arma, al pulso en la garganta y al ruido seco de los dados antes del golpe.`,
    'Cada ronda puede abrirte paso o dejarte al borde de la muerte.',
  ]
  const deathStory = [
    configuredEnemyDeath?.defeatDescription || configuredDeath?.description || (lastEnemyName
      ? `${lastEnemyName} te derriba y el camino se vuelve silencio. Esta escena recuerda tu derrota, pero la historia aun permite volver a intentarlo desde un punto seguro.`
      : 'Tu cuerpo cae y el camino se vuelve silencio. Esta escena recuerda tu derrota, pero la historia aun permite volver a intentarlo desde un punto seguro.'),
  ]
  const storyParagraphs = isDeath
    ? deathStory
    : inCombat
      ? combatStory
      : nodeStage === 'house_inside'
        ? (configuredScene?.story?.length ? configuredScene.story : ['Este nodo no tiene historia escrita en admin.'])
        : nodeStage === 'resolved'
          ? resolvedStory
          : configuredEnding
            ? [configuredEnding.description]
            : eventResultText
              ? [eventResultText]
            : configuredScene?.story?.length
              ? configuredScene.story
              : ['Este nodo no tiene historia escrita en admin.']

  useEffect(() => {
    if (isDeath || inCombat || configuredEnding || nodeStage !== 'initial') return
    if (activeConfiguredEnemyKeyRef.current) return
    const nextEnemy = configuredCurrentEnemies.find(enemy => !fledConfiguredEnemies[`${enemy.sceneKey}:${enemy.key}`])
    if (!nextEnemy) return
    startConfiguredEnemyCombat(nextEnemy)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSceneKey, configuredCurrentEnemies.length, configuredEnding, fledConfiguredEnemies, inCombat, isDeath, nodeStage])

  useEffect(() => {
    if (isDeath || inCombat || activeMemoryEvent || configuredEnding || nodeStage !== 'initial') return
    if (configuredCurrentEnemies.length > 0 || currentStoryEvent) return
    if (!currentMemoryEvent) return
    setActiveMemoryEvent(currentMemoryEvent)
  }, [activeMemoryEvent, configuredCurrentEnemies.length, configuredEnding, currentMemoryEvent, currentStoryEvent, inCombat, isDeath, nodeStage])

  // Auto-activate runner event (only once per scene visit, not after losing)
  const runnerDismissedRef = useRef<string>('')

  useEffect(() => {
    // Reset dismissed flag when scene changes
    runnerDismissedRef.current = ''
  }, [currentSceneKey])

  useEffect(() => {
    if (isDeath || inCombat || activeMemoryEvent || activeRunnerEvent || activeTechQuizEvent || activeTechSnakeEvent || configuredEnding || nodeStage !== 'initial') return
    if (configuredCurrentEnemies.length > 0 || currentStoryEvent || currentMemoryEvent) return
    if (!currentRunnerEvent) return
    if (runnerDismissedRef.current === `${currentRunnerEvent.sceneKey}:${currentRunnerEvent.key}`) return
    setActiveRunnerEvent(currentRunnerEvent)
  }, [activeMemoryEvent, activeRunnerEvent, activeTechQuizEvent, activeTechSnakeEvent, configuredCurrentEnemies.length, configuredEnding, currentMemoryEvent, currentRunnerEvent, currentStoryEvent, inCombat, isDeath, nodeStage])

  useEffect(() => {
    if (isDeath || inCombat || activeMemoryEvent || activeRunnerEvent || activeTechQuizEvent || activeTechSnakeEvent || configuredEnding || nodeStage !== 'initial') return
    if (configuredCurrentEnemies.length > 0 || currentStoryEvent || currentMemoryEvent || currentRunnerEvent) return
    if (!currentQuizEvent) return
    if (runnerDismissedRef.current === `${currentQuizEvent.sceneKey}:${currentQuizEvent.key}`) return
    setActiveTechQuizEvent(currentQuizEvent)
  }, [activeMemoryEvent, activeRunnerEvent, activeTechQuizEvent, activeTechSnakeEvent, configuredCurrentEnemies.length, configuredEnding, currentMemoryEvent, currentQuizEvent, currentRunnerEvent, currentStoryEvent, inCombat, isDeath, nodeStage])

  useEffect(() => {
    if (isDeath || inCombat || activeMemoryEvent || activeRunnerEvent || activeTechQuizEvent || activeTechSnakeEvent || configuredEnding || nodeStage !== 'initial') return
    if (configuredCurrentEnemies.length > 0 || currentStoryEvent || currentMemoryEvent || currentRunnerEvent || currentQuizEvent) return
    if (!currentSnakeEvent) return
    if (runnerDismissedRef.current === `${currentSnakeEvent.sceneKey}:${currentSnakeEvent.key}`) return
    setActiveTechSnakeEvent(currentSnakeEvent)
  }, [activeMemoryEvent, activeRunnerEvent, activeTechQuizEvent, activeTechSnakeEvent, configuredCurrentEnemies.length, configuredEnding, currentMemoryEvent, currentQuizEvent, currentRunnerEvent, currentSnakeEvent, currentStoryEvent, inCombat, isDeath, nodeStage])

  useEffect(() => {
    if (isDeath || inCombat || activeMemoryEvent || activeRunnerEvent || activeTechQuizEvent || activeTechSnakeEvent || activeMinefieldEvent || configuredEnding || nodeStage !== 'initial') return
    if (configuredCurrentEnemies.length > 0 || currentStoryEvent || currentMemoryEvent || currentRunnerEvent || currentQuizEvent || currentSnakeEvent) return
    if (!currentMinefieldEvent) return
    if (runnerDismissedRef.current === `${currentMinefieldEvent.sceneKey}:${currentMinefieldEvent.key}`) return
    setActiveMinefieldEvent(currentMinefieldEvent)
  }, [activeMemoryEvent, activeMinefieldEvent, activeRunnerEvent, activeTechQuizEvent, activeTechSnakeEvent, configuredCurrentEnemies.length, configuredEnding, currentMemoryEvent, currentMinefieldEvent, currentQuizEvent, currentRunnerEvent, currentSnakeEvent, currentStoryEvent, inCombat, isDeath, nodeStage])

  useEffect(() => {
    if (isDeath || inCombat || activeMemoryEvent || activeRunnerEvent || activeTechQuizEvent || activeTechSnakeEvent || activeMinefieldEvent || activeCircuitPuzzleEvent || configuredEnding || nodeStage !== 'initial') return
    if (configuredCurrentEnemies.length > 0 || currentStoryEvent || currentMemoryEvent || currentRunnerEvent || currentQuizEvent || currentSnakeEvent || currentMinefieldEvent) return
    if (!currentCircuitPuzzleEvent) return
    if (runnerDismissedRef.current === `${currentCircuitPuzzleEvent.sceneKey}:${currentCircuitPuzzleEvent.key}`) return
    setActiveCircuitPuzzleEvent(currentCircuitPuzzleEvent)
  }, [activeCircuitPuzzleEvent, activeMemoryEvent, activeMinefieldEvent, activeRunnerEvent, activeTechQuizEvent, activeTechSnakeEvent, configuredCurrentEnemies.length, configuredEnding, currentCircuitPuzzleEvent, currentMemoryEvent, currentMinefieldEvent, currentQuizEvent, currentRunnerEvent, currentSnakeEvent, currentStoryEvent, inCombat, isDeath, nodeStage])

  useEffect(() => {
    if (isDeath || inCombat || activeMemoryEvent || activeRunnerEvent || activeTechQuizEvent || activeTechSnakeEvent || activeMinefieldEvent || activeCircuitPuzzleEvent || activeNetworkCardEvent || configuredEnding || nodeStage !== 'initial') return
    if (configuredCurrentEnemies.length > 0 || currentStoryEvent || currentMemoryEvent || currentRunnerEvent || currentQuizEvent || currentSnakeEvent || currentMinefieldEvent || currentCircuitPuzzleEvent) return
    if (!currentNetworkCardEvent) return
    if (runnerDismissedRef.current === `${currentNetworkCardEvent.sceneKey}:${currentNetworkCardEvent.key}`) return
    setActiveNetworkCardEvent(currentNetworkCardEvent)
  }, [activeCircuitPuzzleEvent, activeMemoryEvent, activeMinefieldEvent, activeNetworkCardEvent, activeRunnerEvent, activeTechQuizEvent, activeTechSnakeEvent, configuredCurrentEnemies.length, configuredEnding, currentCircuitPuzzleEvent, currentMemoryEvent, currentMinefieldEvent, currentNetworkCardEvent, currentQuizEvent, currentRunnerEvent, currentSnakeEvent, currentStoryEvent, inCombat, isDeath, nodeStage])

  useEffect(() => {
    if (lastCombatResult === 'enemy_victory' && activeConfiguredEnemyKeyRef.current) {
      const enemyKey = activeConfiguredEnemyKeyRef.current
      setResolvedConfiguredEnemies(prev => ({ ...prev, [enemyKey]: true }))
      activeConfiguredEnemyKeyRef.current = ''
    } else if (lastCombatResult === 'enemy_defeat') {
      activeConfiguredEnemyKeyRef.current = ''
    }
  }, [lastCombatResult])

  const buildAdventureState = () => ({
    currentIndex,
    currentSceneKey,
    nodeStage,
    nodesVisited,
    collectedNodeItems,
    fledConfiguredEnemies,
    resolvedConfiguredEnemies,
    resolvedStoryEvents,
    resolvedMemoryEvents,
    eventResultText,
    activeMemoryEventKey: activeMemoryEvent ? `${activeMemoryEvent.sceneKey}:${activeMemoryEvent.key}` : '',
  })

  const restoreAdventureState = (raw: string | null) => {
    if (!raw) return false
    try {
      const state = JSON.parse(raw)
      if (!state || typeof state.currentSceneKey !== 'string') return false
      setCurrentIndex(Number.isFinite(Number(state.currentIndex)) ? Number(state.currentIndex) : 0)
      setCurrentSceneKey(state.currentSceneKey)
      setNodeStage(['initial', 'house_inside', 'resolved'].includes(state.nodeStage) ? state.nodeStage : 'initial')
      setNodesVisited(Array.isArray(state.nodesVisited) ? state.nodesVisited : [false, false, false, false])
      setCollectedNodeItems(state.collectedNodeItems || {})
      setFledConfiguredEnemies(state.fledConfiguredEnemies || {})
      setResolvedConfiguredEnemies(state.resolvedConfiguredEnemies || {})
      setResolvedStoryEvents(state.resolvedStoryEvents || {})
      setResolvedMemoryEvents(state.resolvedMemoryEvents || {})
      setEventResultText(state.eventResultText || '')
      setActiveMemoryEvent(null)
      setPendingTroll(false)
      setPendingAdvance(null)
      setPendingConfiguredNext(null)
      setBlockedDecision(null)
      activeConfiguredEnemyKeyRef.current = ''
      return true
    } catch {
      return false
    }
  }

  const saveCheckpoint = () => {
    if (!checkpointSaveKey || !sessionSaveKey) return
    const serialized = JSON.stringify(buildAdventureState())
    localStorage.setItem(checkpointSaveKey, serialized)
    sessionStorage.setItem(sessionSaveKey, serialized)
  }

  const restartAdventure = () => {
    handleRestartGame()
    if (checkpointSaveKey) localStorage.removeItem(checkpointSaveKey)
    if (sessionSaveKey) sessionStorage.removeItem(sessionSaveKey)
  }

  useEffect(() => {
    if (!storyConfig?.scenes?.length || didRestoreRef.current) return
    didRestoreRef.current = true
    // Demo mode always starts fresh at the first scene — never restores saved progress
    if (demoMode) {
      setCurrentSceneKey(storyConfig.scenes[0].key)
      return
    }
    if (!user) return
    const restored = restoreAdventureState(sessionStorage.getItem(sessionSaveKey) || localStorage.getItem(checkpointSaveKey))
    if (!restored && !currentSceneKey) setCurrentSceneKey(storyConfig.scenes[0].key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpointSaveKey, sessionSaveKey, storyConfig?.scenes?.length, user])

  useEffect(() => {
    // Demo mode never saves progress to sessionStorage
    if (demoMode || !sessionSaveKey || !currentSceneKey) return
    sessionStorage.setItem(sessionSaveKey, JSON.stringify(buildAdventureState()))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentSceneKey, nodeStage, nodesVisited, collectedNodeItems, fledConfiguredEnemies, resolvedConfiguredEnemies, resolvedStoryEvents, resolvedMemoryEvents, eventResultText, activeMemoryEvent, sessionSaveKey])

  useEffect(() => {
    const onSave = () => saveCheckpoint()
    const onReset = () => restartAdventure()
    window.addEventListener('rpg-save-adventure', onSave)
    window.addEventListener('rpg-reset-adventure', onReset)
    return () => {
      window.removeEventListener('rpg-save-adventure', onSave)
      window.removeEventListener('rpg-reset-adventure', onReset)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkpointSaveKey, sessionSaveKey, currentIndex, currentSceneKey, nodeStage, nodesVisited, collectedNodeItems, fledConfiguredEnemies, resolvedConfiguredEnemies, resolvedStoryEvents, resolvedMemoryEvents, eventResultText])

  useEffect(() => {
    if (nodeAudioRef.current) {
      nodeAudioRef.current.pause()
      nodeAudioRef.current = null
    }

    if (!configuredScene?.musicUrl) return

    const audio = new Audio(configuredScene.musicUrl)
    audio.loop = true
    audio.volume = mute ? 0 : volume
    nodeAudioRef.current = audio
    audio.play().catch(() => {})

    return () => {
      audio.pause()
    }
  }, [configuredScene?.musicUrl])

  useEffect(() => {
    if (nodeAudioRef.current)   nodeAudioRef.current.volume   = mute ? 0 : volume
    if (globalAudioRef.current) globalAudioRef.current.volume = mute ? 0 : volume
  }, [mute, volume])

  // -- Global background music -----------------------------------------------
  useEffect(() => {
    const url = (storyConfig as any)?.globalMusicUrl as string | undefined
    if (!url) {
      globalAudioRef.current?.pause()
      globalAudioRef.current = null
      return
    }
    // Same URL already playing — just sync volume
    if (globalAudioRef.current && globalAudioRef.current.src === url) {
      globalAudioRef.current.volume = mute ? 0 : volume
      return
    }
    globalAudioRef.current?.pause()
    const audio = new Audio(url)
    audio.loop = true
    audio.volume = mute ? 0 : volume
    globalAudioRef.current = audio
    audio.play().catch(() => {})
    return () => { audio.pause() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [(storyConfig as any)?.globalMusicUrl])

  // Cleanup global music on unmount
  useEffect(() => () => { globalAudioRef.current?.pause() }, [])

  // -- One-shot sound helper --------------------------------------------------
  const playOneShot = (url: string | undefined) => {
    if (!url || mute) return
    try {
      if (transientAudioRef.current) { transientAudioRef.current.pause(); transientAudioRef.current.currentTime = 0 }
      const a = new Audio(url)
      a.volume = volume
      transientAudioRef.current = a
      a.play().catch(() => {})
    } catch {}
  }


  /**
   * Header classes: apply distinct visual treatment when dead.
   */
  const headerTextClass = isDeath
    ? 'inline-flex items-center gap-2 text-rose-100'
    : 'font-semibold text-lg md:text-xl tracking-tight'
  const headerWrapperClass = isDeath
    ? 'font-semibold text-lg md:text-xl tracking-tight inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-rose-700/25 via-rose-600/15 to-transparent shadow-sm animate-pulse'
    : 'font-semibold text-lg md:text-xl tracking-tight'

  const activeMiniGameName =
    activeRunnerEvent      ? (activeRunnerEvent.title      || 'Desafío Runner') :
    activeMemoryEvent      ? (activeMemoryEvent.title      || 'Duelo de Memoria') :
    activeTechQuizEvent    ? (activeTechQuizEvent.title    || 'AWS Quiz') :
    activeTechSnakeEvent   ? (activeTechSnakeEvent.title   || 'Snake Tecnológico') :
    activeMinefieldEvent   ? (activeMinefieldEvent.title   || 'Campo de Minas') :
    activeCircuitPuzzleEvent ? (activeCircuitPuzzleEvent.title || 'Circuito Eléctrico') :
    activeNetworkCardEvent ? (activeNetworkCardEvent.title || 'Duelo de Red AWS') :
    ''

  const resolveActiveMiniGame = (result: 'win' | 'loss') => {
    if (activeRunnerEvent)       finishRunnerEvent(activeRunnerEvent, result)
    else if (activeMemoryEvent)  finishMemoryDuel(activeMemoryEvent, result)
    else if (activeTechQuizEvent) finishTechQuiz(activeTechQuizEvent, result)
    else if (activeTechSnakeEvent) finishTechSnake(activeTechSnakeEvent, result)
    else if (activeMinefieldEvent) finishMinefield(activeMinefieldEvent, result)
    else if (activeCircuitPuzzleEvent) finishCircuitPuzzle(activeCircuitPuzzleEvent, result)
    else if (activeNetworkCardEvent) finishNetworkCard(activeNetworkCardEvent, result)
  }

  return (
    <div className={`relative rounded-lg border-2 border-[#6b371d] bg-[#2d160d]/95 p-5 shadow-[0_14px_40px_rgba(0,0,0,0.5),inset_0_0_0_2px_rgba(245,193,108,0.14)] md:p-6 ${isDeath ? 'ring-1 ring-rose-600/40' : ''}`}>

      {demoMode && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-purple-400/50 bg-purple-900/60 px-4 py-2 text-sm font-black text-purple-200 shadow">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎭</span>
            MODO DEMO — Sin efectos reales · Vida infinita · Mini-juegos saltables
          </div>
          {currentSceneKey && (
            <div className="flex items-center gap-2 rounded border border-purple-300/30 bg-purple-800/60 px-3 py-1 text-xs font-mono">
              <span className="text-purple-400">Nodo</span>
              <span className="text-white">
                #{(storyConfig?.scenes?.findIndex((s: StorySceneConfig) => s.key === currentSceneKey) ?? -1) + 1}
              </span>
              <span className="text-purple-400">·</span>
              <span className="text-yellow-200">{currentSceneKey}</span>
            </div>
          )}
        </div>
      )}

      {/* -- Combat splash overlay ------------------------------------------- */}
      {combatSplash && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center overflow-hidden rounded-lg"
          style={{ background: 'rgba(0,0,0,0.82)' }}
          onClick={combatSplash === 'intro' ? () => setCombatSplash(null) : undefined}
        >
          <img
            src={
              combatSplash === 'intro'   ? ((storyConfig as any)?.combatIntroImageUrl   || imgCombatIntro)   :
              combatSplash === 'victory' ? ((storyConfig as any)?.combatVictoryImageUrl || imgCombatVictory) :
              ((storyConfig as any)?.combatDefeatImageUrl || imgCombatDefeat)
            }
            alt={combatSplash}
            className="max-h-[60%] max-w-[85%] rounded-xl object-contain drop-shadow-2xl"
            style={{
              animation: 'splashIn 0.4s ease-out',
              filter: combatSplash === 'defeat' ? 'grayscale(0.4) brightness(0.85)' : 'brightness(1.08)',
            }}
          />
          <div
            className="mt-4 text-center text-2xl font-black uppercase tracking-widest drop-shadow-lg"
            style={{
              color: combatSplash === 'intro'   ? '#fbbf24' :
                     combatSplash === 'victory' ? '#34d399' :
                     '#f87171',
              textShadow: combatSplash === 'victory'
                ? '0 0 20px rgba(52,211,153,0.7)'
                : combatSplash === 'defeat'
                ? '0 0 20px rgba(248,113,113,0.7)'
                : '0 0 20px rgba(251,191,36,0.7)',
            }}
          >
            {combatSplash === 'intro'   && <span>&#x2694; Combate iniciado</span>}
            {combatSplash === 'victory' && <span>&#x1F3C6; Victoria</span>}
            {combatSplash === 'defeat'  && <span>&#x1F480; Derrotado</span>}
          </div>
          {combatSplash === 'intro'
            ? <p className="mt-2 text-xs text-white/40">Toca para continuar</p>
            : (
              <button
                onClick={() => {
                  if (transientAudioRef.current) {
                    transientAudioRef.current.pause()
                    transientAudioRef.current.currentTime = 0
                    transientAudioRef.current = null
                  }
                  setCombatSplash(null)
                }}
                className="mt-5 rounded-full border-2 px-8 py-2.5 text-sm font-black uppercase tracking-widest shadow-lg transition hover:brightness-110 active:scale-95"
                style={{
                  borderColor: combatSplash === 'victory' ? '#34d399' : '#f87171',
                  background: combatSplash === 'victory' ? 'rgba(16,60,35,0.9)' : 'rgba(60,16,16,0.9)',
                  color: combatSplash === 'victory' ? '#34d399' : '#f87171',
                }}
              >
                Acepto
              </button>
            )
          }
          <style>{`
            @keyframes splashIn {
              from { opacity: 0; transform: scale(0.85); }
              to   { opacity: 1; transform: scale(1); }
            }
          `}</style>
        </div>
      )}

      {/* Inline music control */}
      <div
        aria-label="music-control"
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-[#a96b32]/70 bg-[#160b08]/90 px-3 py-2 shadow-lg backdrop-blur-sm"
        role="region"
      >
        <button
          onClick={toggleMute}
          title={mute ? 'Activar sonido' : 'Silenciar'}
          className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 transition-colors"
        >
          {mute ? <VolumeX className="w-5 h-5 text-rose-300" /> : <Volume2 className="w-5 h-5 text-emerald-300" />}
        </button>
        <input
          aria-label="volume"
          type="range"
          min={0}
          max={100}
          value={Math.round(volume * 100)}
          onChange={handleVolumeChange}
          className="w-24 accent-emerald-400"
        />
        <span className="text-xs text-zinc-400 w-8 text-center">{Math.round(volume * 100)}%</span>
      </div>

      {/* Persistent scene title + small header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-emerald-300" />
          <div>
            {/**
             * Mostrar pinnedTitle si existe (reemplaza el título de la escena).
             * - Si contiene indicios de victoria muestra un icono de victoria.
             * - En cualquier otro caso (muerte u otro título) muestra el icono de muerte.
             */}
            {pinnedTitle ? (
              <div className={headerWrapperClass}>
                {pinnedTitle.toLowerCase().includes('reclam') ? (
                  <CheckCircle className="w-5 h-5 text-emerald-300" />
                ) : (
                  <Skull className="w-5 h-5 text-rose-200" />
                )}
                <span className={headerTextClass}>{pinnedTitle}</span>
              </div>
            ) : isDeath ? (
              <div className={headerWrapperClass}>
                <Skull className="w-5 h-5 text-rose-200" />
                <span className={headerTextClass}>{getDeathTitle()}</span>
              </div>
            ) : (
              <div className="rounded border border-[#a96b32]/70 bg-[#5a2b17] px-4 py-2 shadow-inner">
                <h4 className="break-words text-lg font-black uppercase tracking-wide text-[#ffd99a] md:text-xl">{sceneTitle}</h4>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Active game overlay — expands to full screen while a mini-game runs ── */}
      {(activeRunnerEvent || activeMemoryEvent || activeTechQuizEvent || activeTechSnakeEvent || activeMinefieldEvent || activeCircuitPuzzleEvent || activeNetworkCardEvent) && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/85 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-4xl px-4 py-6">

            {/* Demo mode: skip panel instead of actual game */}
            {demoMode ? (
              <div className="flex flex-col items-center gap-6 rounded-2xl border border-purple-500/50 bg-purple-950/90 p-10 text-center shadow-2xl">
                <span className="text-5xl">🎭</span>
                <div className="text-2xl font-black text-purple-200">MODO DEMO</div>
                <p className="text-purple-300">Mini-juego: <span className="font-black text-white">{activeMiniGameName}</span></p>
                <p className="text-sm text-purple-400">En el juego real los estudiantes jugarian aqui. Elige como simular el resultado:</p>
                <div className="flex gap-4">
                  <button
                    onClick={() => resolveActiveMiniGame('win')}
                    className="rounded-xl bg-emerald-600 px-6 py-3 font-black text-white shadow hover:bg-emerald-500 active:scale-95"
                  >
                    ✅ Simular victoria
                  </button>
                  <button
                    onClick={() => resolveActiveMiniGame('loss')}
                    className="rounded-xl bg-rose-700 px-6 py-3 font-black text-white shadow hover:bg-rose-600 active:scale-95"
                  >
                    ❌ Simular derrota
                  </button>
                </div>
                <p className="text-xs text-purple-600">Sin daño a la vida en modo demo</p>
              </div>
            ) : (
              <>
                {activeRunnerEvent && (
                  <RunnerGame
                    event={activeRunnerEvent}
                    inventory={inventory}
                    onFinish={(result, wageredItemId) => finishRunnerEvent(activeRunnerEvent, result, wageredItemId)}
                  />
                )}
                {activeMemoryEvent && (
                  <MemoryDuelBoard
                    event={activeMemoryEvent}
                    inventory={inventory}
                    onFinish={(result, wageredItemId) => finishMemoryDuel(activeMemoryEvent, result, wageredItemId)}
                  />
                )}
                {activeTechQuizEvent && (
                  <TechQuizGame
                    event={activeTechQuizEvent}
                    onFinish={(result) => finishTechQuiz(activeTechQuizEvent, result)}
                  />
                )}
                {activeTechSnakeEvent && (
                  <TechSnakeGame
                    event={activeTechSnakeEvent}
                    onFinish={(result) => finishTechSnake(activeTechSnakeEvent, result)}
                  />
                )}
                {activeMinefieldEvent && (
                  <MinefieldGame
                    event={activeMinefieldEvent}
                    playerAttack={Math.max(5, Object.values(equipment).reduce((s, it) => s + (it?.power || 0), 0))}
                    playerHealth={health}
                    playerMaxHealth={maxHealth}
                    onFinish={(result) => finishMinefield(activeMinefieldEvent, result)}
                    onDamagePlayer={(dmg) => effectiveInjure(dmg, step)}
                  />
                )}
                {activeCircuitPuzzleEvent && (
                  <CircuitPuzzleGame
                    event={activeCircuitPuzzleEvent}
                    playerHealth={health}
                    playerMaxHealth={maxHealth}
                    onFinish={(result) => finishCircuitPuzzle(activeCircuitPuzzleEvent, result)}
                    onDamagePlayer={(dmg) => effectiveInjure(dmg, step)}
                    customLevels={storyConfig?.circuitLevels}
                  />
                )}
                {activeNetworkCardEvent && (
                  <NetworkCardGame
                    event={activeNetworkCardEvent}
                    onFinish={(result) => finishNetworkCard(activeNetworkCardEvent, result)}
                  />
                )}

                {/* Surrender button — always visible during any real mini-game */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      if (window.confirm('¿Rendirse? Perderás este mini-juego y recibirás una penalización de vida.')) {
                        resolveActiveMiniGame('loss')
                      }
                    }}
                    className="rounded-lg border border-rose-500/40 bg-rose-950/70 px-5 py-2 text-sm font-bold text-rose-300 shadow hover:bg-rose-900/80 active:scale-95"
                  >
                    🏳️ Rendirse (perder el mini-juego)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Middle panel: main scene story */}
      <div className="mt-4 min-h-52 rounded border-2 border-[#8f5728]/80 bg-[#1c0f0a]/85 p-5 shadow-inner">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="inline-flex rounded border border-[#a96b32]/70 bg-[#5a2b17] px-3 py-1 text-base font-black uppercase tracking-wide text-[#ffd99a]">
            {configuredEnding ? (configuredEnding.title || 'Final') : 'Historia'}
          </div>
        </div>
        <div className="max-h-[48vh] space-y-3 overflow-y-auto pr-2 text-sm leading-6 text-[#fff2d2] md:text-base">
          {storyParagraphs.map((paragraph, index) => (
            <p key={index} className="whitespace-pre-wrap break-words">{paragraph}</p>
          ))}
        </div>
      </div>

      {/* Reward chest after winning a mini-game */}
      {!isDeath && pendingGameReward && (
        <div className="mt-4 rounded border-2 border-emerald-500/50 bg-[#0d1f12]/90 p-4 shadow-inner">
          <div className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-emerald-300">
            <span>🏆</span> ¡Recompensa ganada!
          </div>
          <div className="mb-3 text-xs leading-5 text-emerald-100/80">{eventResultText}</div>
          <div className="mb-3 flex items-center gap-3 rounded border border-emerald-700/50 bg-[#0a1a0e] p-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-emerald-400/70 bg-emerald-900/60 text-2xl">
              {pendingGameReward.type === 'weapon' ? '⚔️' : pendingGameReward.type === 'potion' ? '🧪' : pendingGameReward.type === 'ring' || pendingGameReward.type === 'accessory' ? '💍' : '🛡️'}
            </div>
            <div>
              <p className="font-bold text-emerald-200">{pendingGameReward.name}</p>
              <p className={`text-xs ${pendingGameReward.rarity === 'epic' ? 'text-violet-300' : pendingGameReward.rarity === 'rare' ? 'text-cyan-300' : 'text-amber-300'}`}>
                {pendingGameReward.rarity === 'epic' ? 'Épico' : pendingGameReward.rarity === 'rare' ? 'Raro' : 'Común'}{pendingGameReward.power > 0 ? ` · Poder ${pendingGameReward.power}` : ''}
              </p>
            </div>
          </div>
          <button
            onClick={async () => {
              if (transientAudioRef.current) { transientAudioRef.current.pause(); transientAudioRef.current.currentTime = 0; transientAudioRef.current = null }
              const reward = pendingGameReward
              setPendingGameReward(null)
              setGameResultPending(false)
              setEventResultText('')
              const visual = reward.slot
                ? { type: reward.type as Item['type'], slot: reward.slot as Item['slot'] }
                : resolveEquipVisual(reward.type)
              await acquireItem({
                id: generateId(),
                name: reward.name,
                type: visual.type,
                slot: visual.slot,
                power: reward.power,
                rarity: (reward.rarity || 'common') as Item['rarity'],
                description: reward.description || '',
              })
            }}
            className="w-full rounded border border-emerald-400/40 bg-gradient-to-b from-emerald-600 to-emerald-900 px-3 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow hover:brightness-110"
          >
            Tomar recompensa y continuar
          </button>
        </div>
      )}

      {/* Continue button after losing a mini-game */}
      {!isDeath && !pendingGameReward && gameResultPending && (
        <div className="mt-4 rounded border-2 border-rose-500/40 bg-[#1f0d0d]/90 p-4 shadow-inner">
          <div className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-rose-300">
            <span>💔</span> Resultado
          </div>
          <p className="mb-3 text-xs leading-5 text-rose-100/80">{eventResultText}</p>
          <div className="mb-3 rounded border border-rose-700/40 bg-rose-950/50 px-3 py-2 text-center text-xs font-bold text-rose-300">
            ⚠️ Has perdido <span className="text-rose-200">{lastPenaltyHP} HP</span> (1/4 de tu vida)
          </div>
          <button
            onClick={() => {
              if (transientAudioRef.current) { transientAudioRef.current.pause(); transientAudioRef.current.currentTime = 0; transientAudioRef.current = null }
              setGameResultPending(false); setEventResultText(''); setLastPenaltyHP(0)
            }}
            className="w-full rounded border border-rose-400/40 bg-gradient-to-b from-rose-700 to-rose-950 px-3 py-2.5 text-sm font-black uppercase tracking-wide text-white shadow hover:brightness-110"
          >
            Continuar
          </button>
        </div>
      )}

      {!isDeath && !inCombat && !activeMemoryEvent && !currentMemoryEvent && !pendingGameReward && !gameResultPending && !pendingStoryFeedback && nodeStage === 'initial' && currentStoryEvent && !configuredEnding && (
        <div className="mt-4 rounded border-2 border-fuchsia-400/40 bg-[#211020]/85 p-4 shadow-inner">
          <div className="mb-2 font-semibold text-fuchsia-100">{currentStoryEvent.title}</div>
          {currentStoryEvent.prompt && <p className="mb-3 whitespace-pre-wrap text-sm leading-6 text-white">{currentStoryEvent.prompt}</p>}
          <div className="grid gap-2 md:grid-cols-2">
            <button
              onClick={() => applyStoryEventChoice(currentStoryEvent, 'A')}
              className="rounded border border-fuchsia-200/30 bg-gradient-to-b from-fuchsia-600 to-fuchsia-900 px-3 py-2 text-sm font-bold text-white shadow hover:brightness-110"
            >
              {currentStoryEvent.optionALabel}
            </button>
            <button
              onClick={() => applyStoryEventChoice(currentStoryEvent, 'B')}
              className="rounded border border-slate-200/20 bg-gradient-to-b from-slate-600 to-slate-900 px-3 py-2 text-sm font-bold text-white shadow hover:brightness-110"
            >
              {currentStoryEvent.optionBLabel}
            </button>
          </div>
        </div>
      )}

      {/* Feedback panel — shown after choosing any story event option */}
      {pendingStoryFeedback && (() => {
        const { wasCorrect, explanation, event: fe, option: fo } = pendingStoryFeedback
        const chosenLabel  = fo === 'A' ? fe.optionALabel : fe.optionBLabel
        const chosenText   = fo === 'A' ? fe.optionAText  : fe.optionBText
        const chosenEffect = fo === 'A' ? fe.optionAEffect : fe.optionBEffect
        const isReward = chosenEffect === 'reward_item'
        const isDamage = chosenEffect === 'damage_half' || chosenEffect === 'damage_quarter' || chosenEffect === 'damage_fixed'
        return (
          <div className={`mt-4 rounded border-2 p-5 shadow-inner ${
            wasCorrect === true  ? 'border-emerald-400/60 bg-emerald-950/80' :
            wasCorrect === false ? 'border-rose-400/60    bg-rose-950/80'    :
            isReward             ? 'border-emerald-400/40 bg-emerald-950/60' :
            isDamage             ? 'border-rose-400/40    bg-rose-950/60'    :
                                   'border-fuchsia-400/40 bg-[#211020]/85'
          }`}>
            {wasCorrect !== null ? (
              <div className={`mb-3 flex flex-wrap items-center gap-2 text-lg font-black ${wasCorrect ? 'text-emerald-300' : 'text-rose-300'}`}>
                {wasCorrect ? '✅ ¡Respuesta correcta!' : '❌ Respuesta incorrecta'}
                <span className="text-sm font-normal text-slate-400">
                  — Elegiste la opcion {fo}
                  {fe.correctOption && !wasCorrect && ` (la correcta era la opcion ${fe.correctOption})`}
                </span>
              </div>
            ) : (
              <div className={`mb-3 flex flex-wrap items-center gap-2 text-base font-bold ${isReward ? 'text-emerald-300' : isDamage ? 'text-rose-300' : 'text-fuchsia-200'}`}>
                {isReward ? '🎁' : isDamage ? '💔' : '📋'} Elegiste: <span className="font-normal text-white">{chosenLabel}</span>
              </div>
            )}
            {/* Text specific to the chosen option (optionAText / optionBText) */}
            {chosenText && (
              <p className="mb-3 whitespace-pre-wrap text-sm leading-6 text-slate-100">{chosenText}</p>
            )}
            {/* General explanation (shown after the option-specific text) */}
            {explanation && (
              <p className="mb-4 whitespace-pre-wrap text-sm leading-6 text-slate-300 italic">{explanation}</p>
            )}
            <button
              onClick={dismissStoryFeedback}
              className="rounded border border-fuchsia-400/40 bg-fuchsia-700/60 px-5 py-2 text-sm font-bold text-white shadow hover:bg-fuchsia-600/70 active:scale-95"
            >
              Continuar →
            </button>
          </div>
        )
      })()}

      {!isDeath && !inCombat && !activeMemoryEvent && !activeMinefieldEvent && !activeCircuitPuzzleEvent && !activeNetworkCardEvent && !activeRunnerEvent && !activeTechQuizEvent && !activeTechSnakeEvent && !pendingGameReward && !gameResultPending && !currentStoryEvent && !currentMemoryEvent && configuredNodeItems.length > 0 && (
        <div className="mt-4 rounded border-2 border-amber-400/40 bg-[#211408]/85 p-4 shadow-inner">
          <div className="mb-3 font-semibold text-amber-100">🎁 Objetos en este camino</div>
          <div className="grid gap-3 md:grid-cols-2">
            {configuredNodeItems.map((item, index) => {
              const chestKey   = `${item.sceneKey}:${item.name}:${index}` // for open/close animation only
              const collectKey = `${item.sceneKey}:${item.name}`           // must match filter key
              const isOpen = openedChests[chestKey]
              return (
                <ChestCard
                  key={chestKey}
                  item={item}
                  isOpen={isOpen}
                  onOpen={() => setOpenedChests(prev => ({ ...prev, [chestKey]: true }))}
                  onTake={async () => {
                    const result = await acquireItem(itemFromConfig(item))
                    if (result.ok) {
                      setCollectedNodeItems(prev => ({ ...prev, [collectKey]: true }))
                      const dur = item.specialDuration || 0
                      if ((item.type === 'potion' || item.type === 'consumable') && dur > 0) activateSpecialPotion(dur)
                    }
                    return result
                  }}
                  inventory={inventory}
                  onDropItem={dropItem}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Always show current node options (no click required) */}
      {!isDeath && !inCombat && !activeMemoryEvent && !activeRunnerEvent && !activeTechQuizEvent && !activeTechSnakeEvent && !activeMinefieldEvent && !activeCircuitPuzzleEvent && !activeNetworkCardEvent && !pendingGameReward && !gameResultPending && nodeStage === 'initial' && configuredDecisions.length > 0 && !currentStoryEvent && !currentMemoryEvent && !configuredEnding && (
        <div className="mt-4 rounded border-2 border-[#8f5728]/80 bg-[#160b08]/80 p-4 shadow-inner">
          <div className="flex flex-col gap-2">
            {configuredDecisions.map((decision, index) => (
              <button
                key={`${decision.sceneKey}-${index}`}
                onClick={() => resolveConfiguredDecision(decision)}
                className="w-full rounded border border-[#e4b66f]/40 bg-gradient-to-b from-[#8b4b22] to-[#4a1f10] px-3 py-2 text-sm font-black uppercase tracking-wide text-[#ffe2aa] shadow hover:brightness-110"
              >
                {decision.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <MapMini currentStep={step} marker={mapMarker} label={sceneTitle} mediaUrl={configuredScene?.mediaUrl} mediaType={configuredScene?.mediaType} mapLocations={storyConfig?.mapLocations || []} />

      {!isDeath && !inCombat && !activeMemoryEvent && !pendingGameReward && !gameResultPending && nodeStage === 'initial' && fledCurrentEnemies.length > 0 && !configuredEnding && (
        <div className="mt-4 rounded border-2 border-rose-400/40 bg-[#240d0d]/85 p-4 shadow-inner">
          <div className="mb-2 font-semibold text-rose-100">Combate pendiente</div>
          <div className="flex flex-col gap-2">
            {fledCurrentEnemies.map(enemy => (
              <button
                key={`${enemy.sceneKey}:${enemy.key}`}
                onClick={() => startConfiguredEnemyCombat(enemy)}
                className="w-full rounded border border-rose-200/30 bg-gradient-to-b from-rose-700 to-rose-950 px-3 py-2 text-sm font-bold text-white shadow hover:brightness-110"
              >
                Enfrentar a {enemy.name || enemy.key}
              </button>
            ))}
          </div>
        </div>
      )}

      {!isDeath && !inCombat && !activeMemoryEvent && !activeRunnerEvent && !activeTechQuizEvent && !activeTechSnakeEvent && !activeMinefieldEvent && !activeCircuitPuzzleEvent && !activeNetworkCardEvent && !pendingGameReward && !gameResultPending && nodeStage === 'initial' && configuredDecisions.length === 0 && !currentStoryEvent && !currentMemoryEvent && !configuredEnding && (
        <div className="mt-4 rounded border border-[#8f5728]/80 bg-[#160b08]/80 p-4 text-sm text-[#ffe7bd]">
          Este nodo no tiene decisiones configuradas en el admin.
        </div>
      )}

      {!isDeath && !inCombat && !activeMemoryEvent && nodeStage === 'initial' && configuredEnding && (
        <div className="mt-4 rounded border-2 border-emerald-400/40 bg-[#0f2413]/85 p-4 shadow-inner">
          <div className="mb-2 font-semibold text-emerald-100">Ruta terminada</div>
          <button
            onClick={handleRestartGame}
            className="w-full rounded border border-emerald-200/30 bg-gradient-to-b from-emerald-600 to-emerald-900 px-3 py-2 text-sm font-black uppercase text-white shadow hover:brightness-110 md:w-auto md:px-5"
          >
            Comenzar de nuevo
          </button>
        </div>
      )}

      {/* Inside house: fairy scenario */}
      {/* Death event UI */}
      {isDeath && (
        <div className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-black/90 text-center px-6">
          <div className="text-7xl mb-4 animate-pulse">☠</div>
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-widest text-rose-400 mb-3">
            {getDeathTitle()}
          </h2>
          <p className="text-zinc-300 text-base md:text-lg mb-6 max-w-md">
            Tu aventura ha terminado. La partida reiniciará automáticamente.
          </p>
          <div className="text-5xl font-black text-white/80">{deathCountdown}</div>
        </div>
      )}

      {/* Combat UI */}
      {!isDeath && inCombat && combat && (
        <div className="mt-4 space-y-3 rounded border-2 border-rose-500/40 bg-[#240d0d]/90 p-4 shadow-inner">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-red-300" />
            <h5 className="text-sm font-black uppercase tracking-wide text-rose-100">
              &#x1F916; Combate contra {combat.enemyName}
            </h5>
          </div>
          <p className="text-xs text-[#ffe7bd]">Atacas a {combat.enemyName}. Si no lo derrotas, te devuelve el golpe.</p>

          <div className="space-y-2 text-xs text-[#ffe7bd]">
            <div>
              <div className="mb-1 flex justify-between"><span>Tu vida</span><span>{health}/{maxHealth}</span></div>
              <div className="h-4 overflow-hidden rounded-full border border-black/60 bg-red-950/70">
                <div className="h-full bg-gradient-to-r from-red-700 via-red-500 to-rose-300" style={{ width: `${Math.max(0, Math.min(100, (health / Math.max(1, maxHealth)) * 100))}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between"><span>Vida del {combat.enemyName}</span><span>{combat.enemyHealth}/{combat.enemyMaxHealth}</span></div>
              <div className="h-4 overflow-hidden rounded-full border border-black/60 bg-amber-950/70">
                <div className="h-full bg-gradient-to-r from-amber-700 via-orange-500 to-yellow-200" style={{ width: `${Math.max(0, Math.min(100, (combat.enemyHealth / Math.max(1, combat.enemyMaxHealth)) * 100))}%` }} />
              </div>
            </div>
            <div>Daño del robot: {combat.enemyDamageMin}&#x2013;{combat.enemyDamageMax}</div>
          </div>

          {/* Special potion active banner */}
          {specialPotionActive && (
            <div className="rounded border border-yellow-400/60 bg-yellow-900/40 px-3 py-1.5 text-center text-xs font-bold text-yellow-200 animate-pulse">
              ⚡ Poción Especial activa — {specialPotionSecs}s restantes — Victoria garantizada
            </div>
          )}

          <div className="flex flex-col gap-2 pt-1">
            {specialPotionActive ? (
              <button
                className="w-full rounded border border-yellow-300/60 bg-gradient-to-b from-yellow-500 to-yellow-800 py-2 text-sm font-black uppercase text-white shadow hover:brightness-110"
                onClick={() => autoWinCombat()}
              >
                ⚡ Poción Especial: Derrotar automáticamente
              </button>
            ) : (
            <button
              className="w-full rounded border border-emerald-200/30 bg-gradient-to-b from-emerald-600 to-emerald-900 py-2 text-sm font-black uppercase text-white shadow hover:brightness-110"
              onClick={() => resolveCombatRound()}
            >
              Atacar
            </button>
            )}
            <button
              className="w-full rounded border border-zinc-200/20 bg-gradient-to-b from-zinc-600 to-zinc-900 py-2 text-sm font-black uppercase text-white shadow hover:brightness-110"
              onClick={handleFleeCombat}
            >
              Huir del combate
            </button>
          </div>
        </div>
      )}

      {/* After resolving a node but before next interaction */}
      {!isDeath && !inCombat && nodeStage === 'resolved' && (
        <div className="mt-4 rounded border border-white/6 bg-white/3 p-4">
          <p className="text-sm text-zinc-200">
            Has completado este punto de la historia. Avanzas al siguiente.
          </p>
          <div className="pt-2">
            <button
              className="w-full bg-zinc-700 hover:bg-zinc-800 py-2.5 rounded text-white text-sm md:text-base transition-colors"
              onClick={() => setNodeStage('initial')}
            >
              Continuar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// -----------------------------------------------------------------------------
// ChestCard
// Shows a locked chest. Click "Abrir" to reveal the item with animation,
// then "Tomar" to add it to inventory. If inventory is full, shows a panel
// to discard an existing item first.
// -----------------------------------------------------------------------------
function rarityChestGlow(rarity = 'common') {
  if (rarity === 'epic') return 'border-violet-500/70 shadow-[0_0_14px_rgba(167,139,250,0.35)]'
  if (rarity === 'rare') return 'border-cyan-500/60 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
  return 'border-amber-600/60 shadow-[0_0_8px_rgba(180,120,30,0.2)]'
}

function rarityLabel(rarity = 'common') {
  if (rarity === 'epic') return { text: 'Épico', cls: 'text-violet-300' }
  if (rarity === 'rare') return { text: 'Raro', cls: 'text-cyan-300' }
  return { text: 'Común', cls: 'text-amber-200/70' }
}

interface ChestCardProps {
  item: { name: string; type: string; power: number; rarity?: string; description?: string }
  isOpen: boolean
  onOpen: () => void
  onTake: () => Promise<{ ok: boolean; error?: string }>
  inventory: Item[]
  onDropItem: (itemId: string) => Promise<void>
}

function ChestCard({ item, isOpen, onOpen, onTake, inventory, onDropItem }: ChestCardProps) {
  const [taking, setTaking] = React.useState(false)
  const [fullError, setFullError] = React.useState<string | null>(null)
  const [dropping, setDropping] = React.useState<string | null>(null)
  const rl = rarityLabel(item.rarity)

  // Items that can be discarded (non-potions shown first, then potions)
  const droppable = [...inventory].sort((a, b) => {
    const aPotion = a.type === 'potion' || a.type === 'consumable' ? 1 : 0
    const bPotion = b.type === 'potion' || b.type === 'consumable' ? 1 : 0
    return aPotion - bPotion
  })

  const handleTake = async () => {
    setTaking(true)
    setFullError(null)
    const result = await onTake()
    if (!result.ok) {
      setFullError(result.error || 'No se pudo tomar el objeto.')
    }
    setTaking(false)
  }

  const handleDrop = async (itemId: string) => {
    setDropping(itemId)
    await onDropItem(itemId)
    setDropping(null)
    // Retry taking after drop
    setTaking(true)
    setFullError(null)
    const result = await onTake()
    if (!result.ok) setFullError(result.error || 'No se pudo tomar el objeto.')
    setTaking(false)
  }

  if (!isOpen) {
    // -- Closed chest --
    return (
      <div className={`relative overflow-hidden rounded-lg border-2 bg-[#1a0e06] p-4 text-center ${rarityChestGlow(item.rarity)}`}>
        {(item.rarity === 'epic' || item.rarity === 'rare') && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(167,139,250,0.08),transparent_70%)]" />
        )}
        {/* CSS chest - closed */}
        <div className="mb-3 flex justify-center">
          <div className="relative">
            <div className={`absolute inset-0 rounded-full opacity-30 blur-xl ${item.rarity === 'epic' ? 'bg-violet-500' : item.rarity === 'rare' ? 'bg-cyan-400' : 'bg-amber-500'}`} />
            <div className="relative w-16">
              <div className={`h-5 w-16 rounded-t-lg border-2 border-b-0 ${item.rarity === 'epic' ? 'border-violet-400 bg-gradient-to-b from-violet-800 to-violet-950' : item.rarity === 'rare' ? 'border-cyan-400 bg-gradient-to-b from-cyan-800 to-cyan-950' : 'border-amber-500 bg-gradient-to-b from-amber-700 to-amber-900'}`}>
                <div className={`mx-1 mt-1.5 h-1 rounded-full ${item.rarity === 'epic' ? 'bg-violet-300/60' : item.rarity === 'rare' ? 'bg-cyan-300/60' : 'bg-amber-300/60'}`} />
              </div>
              <div className={`h-1 w-full border-x-2 ${item.rarity === 'epic' ? 'border-violet-400 bg-violet-600' : item.rarity === 'rare' ? 'border-cyan-400 bg-cyan-600' : 'border-amber-500 bg-amber-600'}`} />
              <div className={`h-9 w-16 rounded-b-lg border-2 border-t-0 ${item.rarity === 'epic' ? 'border-violet-400 bg-gradient-to-b from-violet-900 to-slate-950' : item.rarity === 'rare' ? 'border-cyan-400 bg-gradient-to-b from-cyan-900 to-slate-950' : 'border-amber-500 bg-gradient-to-b from-amber-900 to-slate-950'}`}>
                <div className="mx-auto mt-1.5 flex h-5 w-5 flex-col items-center">
                  <div className={`h-2.5 w-3 rounded-t-full border-2 border-b-0 ${item.rarity === 'epic' ? 'border-violet-300' : item.rarity === 'rare' ? 'border-cyan-300' : 'border-amber-300'}`} />
                  <div className={`h-3 w-4 rounded-sm border-2 ${item.rarity === 'epic' ? 'border-violet-300 bg-violet-800' : item.rarity === 'rare' ? 'border-cyan-300 bg-cyan-800' : 'border-amber-300 bg-amber-800'}`}>
                    <div className={`mx-auto mt-0.5 h-1.5 w-1 rounded-full ${item.rarity === 'epic' ? 'bg-violet-200' : item.rarity === 'rare' ? 'bg-cyan-200' : 'bg-amber-200'}`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="mb-1 text-sm font-black uppercase tracking-wide text-[#ffd99a]">Cofre misterioso</p>
        <p className="mb-3 text-xs text-[#ffe7bd]/60">Contiene algo desconocido...</p>
        <button
          onClick={onOpen}
          className="w-full rounded border border-amber-400/30 bg-gradient-to-b from-amber-700 to-amber-950 px-3 py-2 text-sm font-black uppercase tracking-wide text-white shadow transition hover:brightness-110"
        >
          🔓 Abrir cofre
        </button>
      </div>
    )
  }

  // -- Opened chest --
  return (
    <div
      className={`relative overflow-hidden rounded-lg border-2 bg-[#1a0e06] ${rarityChestGlow(item.rarity)}`}
      style={{ animation: 'chestReveal 0.4s ease-out' }}
    >
      {(item.rarity === 'epic' || item.rarity === 'rare') && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(167,139,250,0.10),transparent_70%)]" />
      )}

      <div className="p-4">
        {/* Open chest header */}
        <div className="mb-2 flex items-center justify-between">
          <div className="relative w-10">
            <div className={`h-3 w-10 origin-bottom-left -rotate-45 rounded-t border-2 border-b-0 ${item.rarity === 'epic' ? 'border-violet-400 bg-violet-800' : item.rarity === 'rare' ? 'border-cyan-400 bg-cyan-800' : 'border-amber-500 bg-amber-800'}`} />
            <div className={`h-6 w-10 rounded-b border-2 border-t-0 ${item.rarity === 'epic' ? 'border-violet-400 bg-violet-950' : item.rarity === 'rare' ? 'border-cyan-400 bg-cyan-950' : 'border-amber-500 bg-amber-950'}`} />
            <span className="absolute -right-3 -top-3 text-sm">✨</span>
          </div>
          <span className={`text-[11px] font-black uppercase tracking-wide ${rl.cls}`}>{rl.text}</span>
        </div>

        {/* Item info */}
        <p className="mb-0.5 font-black text-[#ffe2aa]">{item.name}</p>
        <p className="mb-1 text-xs text-[#ffe7bd]/60 capitalize">
          {item.type}{item.power ? ` · +${item.power} poder` : ''}
        </p>
        {item.description && (
          <p className="mb-3 text-[11px] italic leading-relaxed text-[#ffe7bd]/50">{item.description}</p>
        )}

        {/* Normal take button - shown when no error */}
        {!fullError && (
          <button
            onClick={handleTake}
            disabled={taking}
            className="w-full rounded border border-emerald-400/30 bg-gradient-to-b from-emerald-700 to-emerald-950 px-3 py-2 text-sm font-black uppercase tracking-wide text-white shadow transition hover:brightness-110 disabled:opacity-50"
          >
            {taking ? '⏳ Tomando...' : '✋ Tomar'}
          </button>
        )}
      </div>

      {/* -- Inventory full panel -- */}
      {fullError && (
        <div className="border-t border-rose-500/30 bg-[#1f0808]/90 p-4">
          {/* Error message */}
          <div className="mb-3 flex items-start gap-2 rounded border border-rose-500/40 bg-rose-950/60 px-3 py-2 text-xs text-rose-200">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span>{fullError}</span>
          </div>

          {/* Only show discard panel for inventory-full errors, not connection errors */}
          {!fullError.toLowerCase().includes('conexión') && !fullError.toLowerCase().includes('sesión') && (
            <>
              <p className="mb-2 text-xs font-bold text-[#ffe7bd]">
                Descarta un objeto para hacer espacio:
              </p>

              <div className="mb-3 max-h-40 space-y-1.5 overflow-y-auto pr-1">
                {droppable.length === 0 ? (
                  <p className="text-xs text-[#ffe7bd]/50 italic">Sin objetos para descartar.</p>
                ) : (
                  droppable.map(inv => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between gap-2 rounded border border-white/10 bg-[#160b08]/70 px-2 py-1.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#ffe2aa]">
                          {inv.name}
                          {(inv.quantity || 1) > 1 && (
                            <span className="ml-1 text-emerald-300">x{inv.quantity}</span>
                          )}
                        </p>
                        <p className="text-[10px] text-[#ffe7bd]/50 capitalize">
                          {inv.type}{inv.power ? ` +${inv.power}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDrop(inv.id)}
                        disabled={dropping === inv.id || taking}
                        className="shrink-0 rounded border border-rose-400/30 bg-gradient-to-b from-rose-700 to-rose-950 px-2 py-1 text-[11px] font-black text-white shadow transition hover:brightness-110 disabled:opacity-50"
                      >
                        {dropping === inv.id ? '...' : '🗑️ Botar'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          <button
            onClick={() => setFullError(null)}
            className="w-full rounded border border-slate-500/30 bg-slate-800/80 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:bg-slate-700"
          >
            {fullError.toLowerCase().includes('conexión') ? '🔄 Reintentar más tarde' : 'Cancelar'}
          </button>
        </div>
      )}
    </div>
  )
}

const MEMORY_CARDS: Array<{ symbol: string; label: string; img: string }> = [
  { symbol: 'EC2',     label: 'EC2',        img: imgMemEC2     },
  { symbol: 'Lambda',  label: 'Lambda',     img: imgMemLambda  },
  { symbol: 'S3',      label: 'S3',         img: imgMemS3      },
  { symbol: 'RDS',     label: 'RDS',        img: imgMemRDS     },
  { symbol: 'Dynamo',  label: 'DynamoDB',   img: imgMemDynamo  },
  { symbol: 'CF',      label: 'CloudFront', img: imgMemCF      },
  { symbol: 'API-GW',  label: 'API Gateway',img: imgMemAPI     },
  { symbol: 'Bedrock', label: 'Bedrock',    img: imgMemBedrock },
]

function createMemoryDeck() {
  return [...MEMORY_CARDS, ...MEMORY_CARDS]
    .map(({ symbol }, index) => ({ id: `${index}-${Math.random().toString(36).slice(2)}`, symbol, matchedBy: '' }))
    .sort(() => Math.random() - 0.5)
}

export function MemoryDuelBoard({
  event,
  inventory,
  onFinish,
}: {
  event: MemoryEventConfig
  inventory: Item[]
  onFinish: (result: MemoryDuelResult, wageredItemId?: string) => void
}) {
  const [deck, setDeck] = useState(createMemoryDeck)
  const [selected, setSelected] = useState<number[]>([])
  const [turn, setTurn] = useState<'player' | 'enemy'>('player')
  const [playerScore, setPlayerScore] = useState(0)
  const [enemyScore, setEnemyScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(Math.max(5, Number(event.memoryTurnSeconds) || 12))
  const [message, setMessage] = useState('Tu turno: encuentra una pareja antes de que termine el tiempo.')
  const [finished, setFinished] = useState(false)
  const [wageredItemId, setWageredItemId] = useState('')
  const [started, setStarted] = useState(false)
  // AI only remembers cards revealed during play (not full-deck cheating)
  const aiMemory = useRef<Record<number, string>>({})

  const turnSeconds = Math.max(5, Number(event.memoryTurnSeconds) || 12)
  const wageredItem = inventory.find(item => item.id === wageredItemId) || null
  const remaining = deck.filter(card => !card.matchedBy).length

  useEffect(() => {
    setDeck(createMemoryDeck())
    setSelected([])
    setTurn('player')
    setPlayerScore(0)
    setEnemyScore(0)
    setTimeLeft(turnSeconds)
    setFinished(false)
    setStarted(false)
    setWageredItemId('')
    setMessage('Elige una apuesta y pulsa Empezar juego 8-bit.')
    aiMemory.current = {}
  }, [event.key, turnSeconds])

  useEffect(() => {
    if (!started && !wageredItemId && inventory[0]?.id) {
      setWageredItemId(inventory[0].id)
    }
  }, [inventory, started, wageredItemId])

  useEffect(() => {
    if (!started || finished || turn !== 'player') return
    if (timeLeft <= 0) {
      setSelected([])
      setTurn('enemy')
      setMessage(`${event.memoryEnemyName || 'El rival'} toma el turno por tiempo agotado.`)
      return
    }
    const timer = window.setTimeout(() => setTimeLeft(value => value - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [event.memoryEnemyName, finished, started, timeLeft, turn])

  useEffect(() => {
    if (!started || finished || remaining > 0) return
    setFinished(true)
    if (playerScore > enemyScore) onFinish('win', wageredItemId || undefined)
    else if (enemyScore > playerScore) onFinish('loss', wageredItemId || undefined)
    else onFinish('draw', wageredItemId || undefined)
  }, [enemyScore, finished, onFinish, playerScore, remaining, started, wageredItemId])

  useEffect(() => {
    if (!started || finished || turn !== 'enemy') return
    const timer = window.setTimeout(() => {
      const available = deck
        .map((card, index) => ({ card, index }))
        .filter(entry => !entry.card.matchedBy)
      if (available.length < 2) {
        setTurn('player')
        setTimeLeft(turnSeconds)
        return
      }

      // Pick first card randomly from unmatched cards
      const firstEntry = available[Math.floor(Math.random() * available.length)]
      aiMemory.current[firstEntry.index] = firstEntry.card.symbol

      // Look for the matching card in AI's memory (only revealed cards are known)
      const memoryMatch = Object.entries(aiMemory.current).find(([idxStr, sym]) => {
        const idx = Number(idxStr)
        return sym === firstEntry.card.symbol && idx !== firstEntry.index && !deck[idx]?.matchedBy
      })

      // AI uses memory with 60% probability — results in ~50% win rate vs average player
      let secondEntry: { card: { symbol: string; matchedBy: string; id: string }; index: number } | undefined
      if (memoryMatch && Math.random() < 0.60) {
        const matchIdx = Number(memoryMatch[0])
        secondEntry = available.find(e => e.index === matchIdx)
      }
      if (!secondEntry) {
        const others = available.filter(e => e.index !== firstEntry.index)
        secondEntry = others[Math.floor(Math.random() * others.length)]
      }

      if (!secondEntry) {
        setTurn('player')
        setTimeLeft(turnSeconds)
        return
      }

      // AI also "sees" what it flipped
      aiMemory.current[secondEntry.index] = secondEntry.card.symbol

      if (firstEntry.card.symbol === secondEntry.card.symbol) {
        setDeck(prev => prev.map((card, index) =>
          index === firstEntry.index || index === secondEntry!.index ? { ...card, matchedBy: 'enemy' } : card))
        setEnemyScore(score => score + 1)
        setMessage(`${event.memoryEnemyName || 'El rival'} encontró una pareja.`)
      } else {
        setMessage(`${event.memoryEnemyName || 'El rival'} falló. Vuelve tu turno.`)
      }
      setSelected([])
      setTurn('player')
      setTimeLeft(turnSeconds)
    }, 900)

    return () => window.clearTimeout(timer)
  }, [deck, event.memoryEnemyName, finished, started, turn, turnSeconds])

  const pickCard = (index: number) => {
    if (!started || finished || turn !== 'player') return
    if (deck[index].matchedBy || selected.includes(index) || selected.length >= 2) return

    // AI observes every card the player flips
    aiMemory.current[index] = deck[index].symbol

    const nextSelected = [...selected, index]
    setSelected(nextSelected)

    if (nextSelected.length === 2) {
      const [firstIndex, secondIndex] = nextSelected
      const first = deck[firstIndex]
      const second = deck[secondIndex]
      window.setTimeout(() => {
        if (first.symbol === second.symbol) {
          setDeck(prev => prev.map((card, cardIndex) => cardIndex === firstIndex || cardIndex === secondIndex ? { ...card, matchedBy: 'player' } : card))
          setPlayerScore(score => score + 1)
          setMessage('¡Acertaste! Ahora juega el rival.')
        } else {
          setMessage('No coinciden. Ahora juega el rival.')
        }
        setSelected([])
        setTurn('enemy')
      }, 650)
    }
  }

  const startMemoryGame = () => {
    setStarted(true)
    setTimeLeft(turnSeconds)
    setMessage('Tu turno: encuentra una pareja antes de que termine el tiempo.')
  }

  return (
    <div className="aspect-video w-full overflow-hidden bg-[#070707] p-3 text-white">
      <div className="flex h-full min-h-0 flex-col rounded border-2 border-[#7c4a22] bg-[#15100c] p-3 shadow-[inset_0_0_0_2px_rgba(255,196,91,0.18)]">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-black uppercase tracking-wide text-[#ffd36e]">
          <span>Duelo memoria 8-bit vs {event.memoryEnemyName || 'Rival'}</span>
          <span>Tu {playerScore} / Rival {enemyScore}</span>
          <span>Turno: {started ? (turn === 'player' ? `Jugador ${timeLeft}s` : 'Rival') : 'Preparacion'}</span>
        </div>

        <div className="mb-2 grid gap-2 rounded border border-[#7c4a22] bg-black/35 px-2 py-2 text-[11px] text-[#ffe7bd] sm:grid-cols-[auto_1fr_auto] sm:items-center">
          <span className="font-black uppercase text-[#ffd36e]">Apostar</span>
          <select
            value={wageredItemId}
            onChange={event => setWageredItemId(event.target.value)}
            disabled={started}
            className="min-w-40 rounded border border-[#7c4a22] bg-[#20130c] px-2 py-1 text-xs text-white"
          >
            <option value="">Sin apuesta</option>
            {inventory.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}{item.quantity && item.quantity > 1 ? ` x${item.quantity}` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={startMemoryGame}
            disabled={started}
            className="rounded border border-emerald-200/30 bg-gradient-to-b from-emerald-600 to-emerald-900 px-3 py-1.5 text-[11px] font-black uppercase text-white shadow hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-600 disabled:to-slate-800"
          >
            {started ? 'Juego iniciado' : 'Empezar juego 8-bit'}
          </button>
          <div className="sm:col-span-3">
            {wageredItem ? (
              <span className="text-[#f5b65a]">Objeto traido del inventario: {wageredItem.name}</span>
            ) : (
              <span className="text-[#f5b65a]">{inventory.length ? 'Sin apuesta seleccionada.' : 'No tienes objetos en inventario para apostar.'}</span>
            )}
          </div>
        </div>

        <div className="mb-2 h-2 overflow-hidden rounded bg-red-950">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-yellow-300" style={{ width: `${Math.max(0, Math.min(100, (timeLeft / turnSeconds) * 100))}%` }} />
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-4 gap-1" style={{ gridTemplateRows: 'repeat(4, 1fr)' }}>
          {deck.map((card, index) => {
            const revealed  = selected.includes(index) || Boolean(card.matchedBy)
            const mine      = card.matchedBy === 'player'
            const enemy     = card.matchedBy === 'enemy'
            const cardData  = MEMORY_CARDS.find(c => c.symbol === card.symbol)
            return (
              <button
                key={card.id}
                onClick={() => pickCard(index)}
                disabled={!started || finished || turn !== 'player' || Boolean(card.matchedBy)}
                className={`flex min-h-0 flex-col items-center justify-center gap-0.5 overflow-hidden rounded-lg border-2 p-1 shadow-inner transition-all duration-300
                  ${revealed
                    ? mine  ? 'border-emerald-400 bg-[#0c2d18] shadow-[0_0_12px_rgba(52,211,153,0.5)]'
                    : enemy ? 'border-rose-500    bg-[#2d0c0c] shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                            : 'border-yellow-400/80 bg-[#1a1200]'
                    : 'border-[#4f6a7d] bg-[#11324a] hover:border-cyan-400/70 hover:bg-[#174969] hover:shadow-[0_0_8px_rgba(34,211,238,0.3)]'}
                  ${!started ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                  ${mine  ? 'ring-2 ring-emerald-400/80' : ''}
                  ${enemy ? 'ring-2 ring-rose-500/80'    : ''}`}
              >
                {revealed && cardData ? (
                  <>
                    <img
                      src={cardData.img}
                      alt={cardData.label}
                      className="min-h-0 w-full flex-1 object-contain"
                      style={{
                        filter: mine
                          ? 'drop-shadow(0 0 6px #4ade80) brightness(1.1)'
                          : enemy
                          ? 'drop-shadow(0 0 6px #f43f5e) grayscale(30%) brightness(0.9)'
                          : 'drop-shadow(0 0 3px rgba(255,220,100,0.5))',
                      }}
                    />
                    <span className={`shrink-0 text-[7px] font-black uppercase leading-none tracking-wide ${mine ? 'text-emerald-300' : enemy ? 'text-rose-300' : 'text-yellow-200/80'}`}>
                      {cardData.label}
                    </span>
                  </>
                ) : (
                  <span className="select-none text-lg font-black text-cyan-300/60">?</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-2 min-h-8 rounded bg-black/35 px-2 py-1 text-[11px] text-[#ffe7bd]">
          {message}
          {!inventory.length && <span className="block text-[#f5b65a]">No tienes objetos para apostar.</span>}
        </div>
      </div>
    </div>
  )
}

export default ExplorationPanel
