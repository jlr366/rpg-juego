import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { BookmarkPlus, Flag, FolderOpen, GitBranch, LogOut, MapPin, Music, PackagePlus, Pencil, Plus, Save, Skull, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthProvider'
import { API_BASE_URL } from '../config'
import { RunnerGame } from '../components/RunnerGame'
import { TechQuizGame, QUESTION_BANK } from '../components/TechQuizGame'
import { TechSnakeGame } from '../components/TechSnakeGame'
import { MemoryDuelBoard } from '../components/ExplorationPanel'
import { MinefieldGame } from '../components/MinefieldGame'
import { CircuitPuzzleGame, CircuitPuzzleEventConfig, CircuitLevelConfig, CompId, COMP_DEFS, SlotDef } from '../components/CircuitPuzzleGame'
import { NetworkCardGame, NetworkCardEventConfig } from '../components/NetworkCardGame'

interface SceneConfig {
  key: string
  title: string
  musicUrl: string
  mediaUrl: string
  mediaType: string
  mapX: number
  mapY: number
  flowX: number
  flowY: number
  flowPage: number
  story: string[]
  isEnding: boolean
}

interface DecisionConfig {
  sceneKey: string
  label: string
  nextSceneKey: string
}

interface NodeItemConfig {
  sceneKey: string
  name: string
  type: string
  slot: string
  power: number
  rarity: string
  description: string
  specialDuration?: number
}

// Catalogo global: los unicos 6 objetos de equipo que existen en el juego.
// Su nombre/poder/rareza se configuran una sola vez aqui y se usan en todos
// lados (nodos y premios de minijuegos) seleccionando por slot, sin volver a
// escribir nombre ni poder en cada lugar.
const DEFAULT_EQUIPMENT_CATALOG: NodeItemConfig[] = [
  { sceneKey: '', name: 'Casco',            type: 'armor',  slot: 'head',   power: 5, rarity: 'common', description: '' },
  { sceneKey: '', name: 'Pechera',          type: 'armor',  slot: 'chest',  power: 5, rarity: 'common', description: '' },
  { sceneKey: '', name: 'Antebrazos',       type: 'ring',   slot: 'ring',   power: 5, rarity: 'common', description: '' },
  { sceneKey: '', name: 'Botas',            type: 'armor',  slot: 'legs',   power: 5, rarity: 'common', description: '' },
  { sceneKey: '', name: 'Mochila',          type: 'armor',  slot: 'boots',  power: 5, rarity: 'common', description: '' },
  { sceneKey: '', name: 'Brazos Robóticos', type: 'weapon', slot: 'weapon', power: 5, rarity: 'common', description: '' },
]

function catalogToNodeItem(cat: NodeItemConfig, sceneKey: string): NodeItemConfig {
  return { ...cat, sceneKey }
}

type EventEffect = 'none' | 'reward_item' | 'damage_half' | 'death' | 'remove_item'

interface StoryChoiceEventConfig {
  key: string
  sceneKey: string
  title: string
  prompt: string
  optionALabel: string
  optionAEffect: EventEffect
  optionAItemName: string
  optionAItemType: string
  optionAItemPower: number
  optionAText: string
  optionBLabel: string
  optionBEffect: EventEffect
  optionBItemName: string
  optionBItemType: string
  optionBItemPower: number
  optionBText: string
  correctOption: 'A' | 'B' | ''
  explanation: string
}

interface MemoryEventConfig {
  key: string
  sceneKey: string
  title: string
  prompt: string
  memoryEnemyName: string
  memoryTurnSeconds: number
  memoryStakeItemName: string
  memoryRewardItemName: string
  memoryRewardItemType: string
  memoryRewardItemSlot?: string
  memoryRewardItemPower: number
  memoryWinText: string
  memoryLoseText: string
}

interface EndingConfig {
  sceneKey: string
  title: string
  description: string
}

interface MapLocationConfig {
  key: string
  name: string
  x: number
  y: number
  icon: string
}

interface RunnerEventConfig {
  key: string
  sceneKey: string
  title: string
  prompt: string
  targetScore: number
  rewardItemName: string
  rewardItemType: string
  rewardItemSlot?: string
  rewardItemPower: number
  winText: string
  loseText: string
}

interface SelectOption {
  value: string
  label: string
  key?: string
}

interface QuizEventConfig {
  key: string
  sceneKey: string
  title?: string
  prompt?: string
  rewardItemName?: string
  rewardItemType?: string
  rewardItemSlot?: string
  rewardItemPower?: number
  winText?: string
  loseText?: string
  questionIds?: string[]
}

interface SnakeEventConfig {
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

interface MinefieldEventConfig {
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

interface StoryConfig {
  scenes: SceneConfig[]
  decisions: DecisionConfig[]
  nodeItems: NodeItemConfig[]
  equipmentCatalog: NodeItemConfig[]
  storyEvents: StoryChoiceEventConfig[]
  memoryEvents: MemoryEventConfig[]
  endings: EndingConfig[]
  mapLocations: MapLocationConfig[]
  runnerEvents: RunnerEventConfig[]
  quizEvents?: QuizEventConfig[]
  snakeEvents?: SnakeEventConfig[]
  minefieldEvents?: MinefieldEventConfig[]
  circuitPuzzleEvents?: CircuitPuzzleEventConfig[]
  circuitLevels?: CircuitLevelConfig[]
  networkCardEvents?: NetworkCardEventConfig[]
  globalMusicUrl?: string
  victorySound?: string
  defeatSound?: string
}

const emptyConfig: StoryConfig = {
  scenes: [],
  decisions: [],
  nodeItems: [],
  equipmentCatalog: DEFAULT_EQUIPMENT_CATALOG,
  storyEvents: [],
  memoryEvents: [],
  endings: [],
  mapLocations: [],
  runnerEvents: [],
  quizEvents: [],
  snakeEvents: [],
  minefieldEvents: [],
  circuitPuzzleEvents: [],
  circuitLevels: [],
  networkCardEvents: [],
}

const blankCircuitLevel: CircuitLevelConfig = {
  key: '',
  name: '',
  story: '',
  winTitle: '⚡ ¡Circuito completado!',
  loseTitle: '💥 ¡Sistema comprometido!',
  slots: [],
  toolbox: [],
}

const blankScene: SceneConfig = {
  key: '',
  title: '',
  musicUrl: '',
  mediaUrl: '',
  mediaType: '',
  mapX: 50,
  mapY: 50,
  flowX: 10,
  flowY: 20,
  flowPage: 1,
  story: [''],
  isEnding: false,
}

const blankDecision: DecisionConfig = {
  sceneKey: '',
  label: '',
  nextSceneKey: '',
}

const blankNodeItem: NodeItemConfig = {
  sceneKey: '',
  name: '',
  type: 'weapon',
  slot: 'weapon',
  power: 1,
  rarity: 'common',
  description: '',
  specialDuration: 0,
}

const blankPotion: NodeItemConfig = {
  sceneKey: '',
  name: '',
  type: 'potion',
  slot: '',
  power: 20,
  rarity: 'common',
  description: '',
  specialDuration: 0,
}

// Pociones predefinidas siempre disponibles como premios (no requieren configurar nodeItems)
const POTION_PRESETS: NodeItemConfig[] = [
  { sceneKey: '', name: 'Poción leve', type: 'potion', slot: '', power: 15, rarity: 'common', description: '', specialDuration: 0 },
  { sceneKey: '', name: 'Poción media', type: 'potion', slot: '', power: 30, rarity: 'common', description: '', specialDuration: 0 },
  { sceneKey: '', name: 'Poción fuerte', type: 'potion', slot: '', power: 60, rarity: 'rare', description: '', specialDuration: 0 },
  { sceneKey: '', name: 'Poción especial', type: 'consumable', slot: '', power: 0, rarity: 'epic', description: '', specialDuration: 60 },
]

// Mapeo de tipo visual → type+slot real (sin mostrar slot al usuario)
// Los unicos 6 slots de equipamiento que existen visualmente en el personaje
// (ver EquipmentPanel.tsx -> slots). Cualquier otro "tipo" es ficticio y no se
// renderiza nunca en el personaje.
const EQUIP_VISUAL_OPTIONS = [
  { value: 'head',   label: 'Casco' },
  { value: 'chest',  label: 'Pechera' },
  { value: 'ring',   label: 'Antebrazos' },
  { value: 'legs',   label: 'Botas' },
  { value: 'boots',  label: 'Mochila' },
  { value: 'weapon', label: 'Brazos Robóticos' },
]

const VISUAL_TYPE_MAP: Record<string, { type: string; slot: string }> = {
  head:   { type: 'armor',  slot: 'head'   },
  chest:  { type: 'armor',  slot: 'chest'  },
  ring:   { type: 'ring',   slot: 'ring'   },
  legs:   { type: 'armor',  slot: 'legs'   },
  boots:  { type: 'armor',  slot: 'boots'  },
  weapon: { type: 'weapon', slot: 'weapon' },
}

function getVisualType(type: string, slot: string): string {
  if (slot === 'head' || slot === 'chest' || slot === 'ring' || slot === 'legs' || slot === 'boots' || slot === 'weapon') return slot
  if (type === 'weapon') return 'weapon'
  if (type === 'ring') return 'ring'
  return 'chest'
}

const blankStoryEvent: StoryChoiceEventConfig = {
  key: '',
  sceneKey: '',
  title: 'Encuentro',
  prompt: '',
  optionALabel: 'Aceptar',
  optionAEffect: 'none',
  optionAItemName: '',
  optionAItemType: 'misc',
  optionAItemPower: 0,
  optionAText: '',
  optionBLabel: 'Rechazar',
  optionBEffect: 'damage_half',
  optionBItemName: '',
  optionBItemType: 'misc',
  optionBItemPower: 0,
  optionBText: '',
  correctOption: '',
  explanation: '',
}

const blankMemoryEvent: MemoryEventConfig = {
  key: '',
  sceneKey: '',
  title: 'Duelo de memoria',
  prompt: '',
  memoryEnemyName: 'Rival',
  memoryTurnSeconds: 12,
  memoryStakeItemName: '',
  memoryRewardItemName: '',
  memoryRewardItemType: 'misc',
  memoryRewardItemPower: 0,
  memoryWinText: '',
  memoryLoseText: '',
}

const eventEffectOptions: SelectOption[] = [
  { value: 'none', label: 'Sin efecto' },
  { value: 'reward_item', label: 'Dar premio/objeto' },
  { value: 'damage_half', label: 'Quitar media vida' },
  { value: 'death', label: 'Matar jugador' },
  { value: 'remove_item', label: 'Quitar un objeto' },
]

function normalizeScene(scene: Partial<SceneConfig>): SceneConfig {
  return {
    key: scene.key || '',
    title: scene.title || '',
    musicUrl: scene.musicUrl || '',
    mediaUrl: scene.mediaUrl || '',
    mediaType: scene.mediaType || '',
    mapX: Number.isFinite(Number(scene.mapX)) ? Number(scene.mapX) : 50,
    mapY: Number.isFinite(Number(scene.mapY)) ? Number(scene.mapY) : 50,
    flowX: Number.isFinite(Number(scene.flowX)) ? Number(scene.flowX) : 10,
    flowY: Number.isFinite(Number(scene.flowY)) ? Number(scene.flowY) : 20,
    flowPage: Number.isFinite(Number(scene.flowPage)) ? Math.max(1, Math.floor(Number(scene.flowPage))) : 1,
    story: Array.isArray(scene.story) && scene.story.length ? scene.story : [''],
    isEnding: Boolean(scene.isEnding),
  }
}

function normalizeNodeItem(item: Partial<NodeItemConfig>): NodeItemConfig {
  return {
    ...blankNodeItem,
    ...item,
    power: Number.isFinite(Number(item.power)) ? Number(item.power) : blankNodeItem.power,
    specialDuration: Number.isFinite(Number(item.specialDuration)) ? Number(item.specialDuration) : 0,
  }
}

function normalizeStoryEvent(event: Partial<StoryChoiceEventConfig>, index = 0): StoryChoiceEventConfig {
  return {
    ...blankStoryEvent,
    ...event,
    key: event.key || `evento${index + 1}`,
    optionAEffect: (event.optionAEffect || 'none') as EventEffect,
    optionBEffect: (event.optionBEffect || 'none') as EventEffect,
    optionAItemPower: Number.isFinite(Number(event.optionAItemPower)) ? Number(event.optionAItemPower) : 0,
    optionBItemPower: Number.isFinite(Number(event.optionBItemPower)) ? Number(event.optionBItemPower) : 0,
  }
}

function normalizeMemoryEvent(event: Partial<MemoryEventConfig>, index = 0): MemoryEventConfig {
  return {
    ...blankMemoryEvent,
    ...event,
    key: event.key || `memoria${index + 1}`,
    memoryTurnSeconds: Number.isFinite(Number(event.memoryTurnSeconds)) ? Math.max(5, Number(event.memoryTurnSeconds)) : blankMemoryEvent.memoryTurnSeconds,
    memoryRewardItemPower: Number.isFinite(Number(event.memoryRewardItemPower)) ? Number(event.memoryRewardItemPower) : 0,
  }
}

function normalizeMapLocation(loc: Partial<MapLocationConfig>, index = 0): MapLocationConfig {
  return {
    key: (typeof loc.key === 'string' && loc.key.trim()) ? loc.key.trim() : `loc${index + 1}`,
    name: (typeof loc.name === 'string' && loc.name.trim()) ? loc.name.trim() : `Ubicación ${index + 1}`,
    x: Number.isFinite(Number(loc.x)) ? Math.min(100, Math.max(0, Number(loc.x))) : 50,
    y: Number.isFinite(Number(loc.y)) ? Math.min(100, Math.max(0, Number(loc.y))) : 50,
    icon: (typeof loc.icon === 'string' && loc.icon.trim()) ? loc.icon.trim() : '📍',
  }
}

function findNodeEventConflict(config: StoryConfig): string {
  for (const scene of config.scenes) {
    const types = [
      config.storyEvents.some(event => event.sceneKey === scene.key) ? 'evento de dos opciones' : '',
      config.memoryEvents.some(event => event.sceneKey === scene.key) ? 'duelo memoria' : '',
    ].filter(Boolean)
    if (types.length > 1) return `El nodo ${scene.key} tiene varios tipos de evento: ${types.join(', ')}. Deja solo uno.`
  }
  return ''
}

function findDraftProblem(config: StoryConfig): string {
  if (config.scenes.some(scene => !scene.key.trim())) return 'Hay nodos sin numero.'
  if (config.decisions.some(decision => !decision.sceneKey.trim() || !decision.label.trim() || !decision.nextSceneKey.trim())) {
    return 'Hay decisiones sin nodo origen, texto o destino.'
  }
  if (config.nodeItems.some(item => !item.sceneKey.trim() || !item.name.trim() || !item.type.trim())) {
    return 'Hay objetos o pociones sin nodo, nombre o tipo.'
  }
  if (config.storyEvents.some(event => !event.key.trim() || !event.sceneKey.trim() || !event.title.trim() || !event.optionALabel.trim() || !event.optionBLabel.trim())) {
    return 'Hay eventos sin clave, nodo, titulo u opciones.'
  }
  if (config.memoryEvents.some(event => !event.key.trim() || !event.sceneKey.trim() || !event.title.trim())) {
    return 'Hay encuentros de memoria sin clave, nodo o titulo.'
  }
  const conflict = findNodeEventConflict(config)
  if (conflict) return conflict
  if (config.endings.some(ending => !ending.sceneKey.trim())) return 'Hay finales sin nodo final.'
  return ''
}

function clampFlow(value: number) {
  return Math.min(98, Math.max(1, Math.round(value)))
}

function isFlowSpotFree(scenes: SceneConfig[], x: number, y: number, page = 1, excludeKey = '') {
  return scenes.every(scene => {
    if (scene.key === excludeKey) return true
    if ((scene.flowPage || 1) !== page) return true
    const dx = Math.abs(Number(scene.flowX || 0) - x)
    const dy = Math.abs(Number(scene.flowY || 0) - y)
    return dx >= 24 || dy >= 24
  })
}

function findOpenFlowSpot(scenes: SceneConfig[], desiredX: number, desiredY: number, page = 1, excludeKey = '') {
  const baseX = clampFlow(desiredX)
  const baseY = clampFlow(desiredY)
  if (isFlowSpotFree(scenes, baseX, baseY, page, excludeKey)) return { x: baseX, y: baseY }

  for (let radius = 1; radius <= 8; radius += 1) {
    const offsets = [
      [radius * 18, 0],
      [-radius * 18, 0],
      [0, radius * 18],
      [0, -radius * 18],
      [radius * 18, radius * 18],
      [radius * 18, -radius * 18],
      [-radius * 18, radius * 18],
      [-radius * 18, -radius * 18],
    ]
    for (const [dx, dy] of offsets) {
      const x = clampFlow(baseX + dx)
      const y = clampFlow(baseY + dy)
      if (isFlowSpotFree(scenes, x, y, page, excludeKey)) return { x, y }
    }
  }

  const index = scenes.filter(scene => scene.key !== excludeKey && (scene.flowPage || 1) === page).length
  return {
    x: 6 + (index % 4) * 24,
    y: 10 + Math.floor(index / 4) * 28,
  }
}

async function adminFetch(path: string, options: RequestInit = {}) {
  const hasJsonBody = Boolean(options.body) && !(options.body instanceof FormData)
  const makeRequest = () => fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'X-Admin-Password': 'admin300',
      ...(hasJsonBody ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  })

  let response = await makeRequest()
  if (response.status !== 401 && response.status !== 403) return response

  const loginResponse = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ username: 'admin', password: 'admin300' }),
  })

  if (!loginResponse.ok) return response
  response = await makeRequest()
  return response
}

function dataUrlToFile(dataUrl: string, fallbackName: string) {
  const [header, payload] = dataUrl.split(',')
  const mime = header.match(/^data:([^;]+);base64$/)?.[1] || 'application/octet-stream'
  const binary = atob(payload || '')
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  const extension = mime.split('/')[1]?.split(';')[0] || 'bin'
  return new File([bytes], `${fallbackName}.${extension}`, { type: mime })
}

async function uploadStoryAsset(file: File) {
  const form = new FormData()
  form.append('file', file)
  const response = await adminFetch('/api/admin/uploads/story', {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error || 'No se pudo subir el archivo')
  }

  return response.json() as Promise<{ url: string; type: 'image' | 'video' | 'audio' }>
}

async function uploadConfigAssets(config: StoryConfig) {
  let changed = false
  const scenes = []

  for (const scene of config.scenes) {
    const nextScene = { ...scene }
    if (nextScene.mediaUrl?.startsWith('data:')) {
      const file = dataUrlToFile(nextScene.mediaUrl, `nodo-${nextScene.key || 'media'}`)
      const uploaded = await uploadStoryAsset(file)
      nextScene.mediaUrl = uploaded.url
      nextScene.mediaType = uploaded.type === 'video' ? 'video' : 'image'
      changed = true
    }
    if (nextScene.musicUrl?.startsWith('data:')) {
      const file = dataUrlToFile(nextScene.musicUrl, `nodo-${nextScene.key || 'musica'}`)
      const uploaded = await uploadStoryAsset(file)
      nextScene.musicUrl = uploaded.url
      changed = true
    }
    scenes.push(nextScene)
  }

  return { config: changed ? { ...config, scenes } : config, changed }
}

export default function AdminPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [config, setConfig] = useState<StoryConfig>(emptyConfig)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [audioUploading, setAudioUploading] = useState<Record<string, boolean>>({})
  const [selectedSceneKey, setSelectedSceneKey] = useState('')
  const lastSavedConfigRef = useRef('')
  const hasLoadedConfigRef = useRef(false)
  const autosaveTimerRef = useRef<number | null>(null)
  const saveRequestIdRef = useRef(0)

  // -- Saved stories (database) ------------------------------------------------
  interface SavedStory { id: string; name: string; savedAt: number }
  const [savedStories, setSavedStories] = useState<SavedStory[]>([])
  const [newSaveName, setNewSaveName] = useState('')
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [pendingGame, setPendingGame] = useState('')
  const [testingCard, setTestingCard] = useState<string | null>(null)
  const [errorPopup, setErrorPopup] = useState('')

  const handleSaveLocally = async () => {
    if (!newSaveName.trim()) return
    const id = `s-${Date.now()}`
    const name = newSaveName.trim()
    try {
      const res = await adminFetch('/api/admin/saved-stories', {
        method: 'POST',
        body: JSON.stringify({ id, name, config }),
      })
      if (res.ok) {
        setSavedStories(prev => [{ id, name, savedAt: Date.now() }, ...prev])
        setNewSaveName('')
        setMessage(`Aventura guardada: "${name}"`)
      }
    } catch { setMessage('Error al guardar la aventura') }
  }
  const handleLoadSaved = async (id: string) => {
    try {
      const res = await adminFetch(`/api/admin/saved-stories/${id}`)
      if (!res.ok) return
      const data = await res.json()
      setConfig(data.config)
      const story = savedStories.find(s => s.id === id)
      setMessage(`Aventura "${story?.name ?? id}" cargada en el editor. Pulsa Guardar cambios para activarla.`)
    } catch { setMessage('Error al cargar la aventura') }
  }
  const handleDeleteSaved = async (id: string) => {
    try {
      await adminFetch(`/api/admin/saved-stories/${id}`, { method: 'DELETE' })
      setSavedStories(prev => prev.filter(s => s.id !== id))
    } catch { /* ignore */ }
  }
  const handleRenameConfirm = async (id: string) => {
    if (!editingName.trim()) { setEditingNameId(null); return }
    try {
      await adminFetch(`/api/admin/saved-stories/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: editingName.trim() }),
      })
      setSavedStories(prev => prev.map(s => s.id === id ? { ...s, name: editingName.trim() } : s))
    } catch { /* ignore */ }
    setEditingNameId(null)
  }

  const handleExportCurrent = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `aventura-actual-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportAll = async () => {
    try {
      const bundle: { stories: Array<{ id: string; name: string; savedAt: number; config: StoryConfig }> } = { stories: [] }
      await Promise.all(
        savedStories.map(async s => {
          const res = await adminFetch(`/api/admin/saved-stories/${s.id}`)
          if (res.ok) {
            const data = await res.json()
            bundle.stories.push({ id: s.id, name: s.name, savedAt: s.savedAt, config: data.config })
          }
        })
      )
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aventuras-backup-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      setMessage(`Exportadas ${bundle.stories.length} aventura(s).`)
    } catch { setMessage('Error al exportar aventuras.') }
  }

  const importFileRef = useRef<HTMLInputElement>(null)
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string)
        if (parsed && parsed.stories && Array.isArray(parsed.stories)) {
          // Bundle: restore all stories to DB
          let imported = 0
          for (const s of parsed.stories) {
            const id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
            const res = await adminFetch('/api/admin/saved-stories', {
              method: 'POST',
              body: JSON.stringify({ id, name: s.name || 'Importada', config: s.config }),
            })
            if (res.ok) {
              setSavedStories(prev => [{ id, name: s.name || 'Importada', savedAt: Date.now() }, ...prev])
              imported++
            }
          }
          setMessage(`Importadas ${imported} aventura(s) desde el archivo.`)
        } else if (parsed && (parsed.scenes || parsed.decisions)) {
          // Single config: load into editor
          setConfig(parsed)
          setMessage('Configuración importada en el editor. Pulsa Guardar cambios para activarla.')
        } else {
          setMessage('Archivo JSON no reconocido. Debe ser una aventura o un bundle de aventuras.')
        }
      } catch { setMessage('Error al leer el archivo JSON.') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const publishStoryUpdate = (nextConfig: StoryConfig) => {
    localStorage.setItem('rpg-story-config-updated-at', String(Date.now()))
    localStorage.setItem('rpg-start-scene-key', nextConfig.scenes[0]?.key || '')
    window.dispatchEvent(new Event('rpg-story-config-updated'))
  }

  const nodeOptions = useMemo(
    () => config.scenes.map((scene, index) => ({
      value: scene.key,
      label: `${scene.key || 'sin clave'} - ${scene.title || 'sin titulo'}`,
      key: `node-${index}-${scene.key || 'empty'}`,
    })),
    [config.scenes]
  )

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await adminFetch('/api/admin/story-config')

        if (response.status === 401 || response.status === 403) {
          setMessage('No se pudo activar la sesion de administrador. Entra otra vez con admin / admin300.')
          return
        }

        if (!response.ok) throw new Error('No se pudo cargar la configuracion')

        const data = await response.json()
        const loadedConfig = {
          scenes: (data.config?.scenes || []).map(normalizeScene),
          decisions: data.config?.decisions || [],
          nodeItems: (data.config?.nodeItems || []).map(normalizeNodeItem),
          equipmentCatalog: data.config?.equipmentCatalog || DEFAULT_EQUIPMENT_CATALOG,
          storyEvents: (data.config?.storyEvents || []).map(normalizeStoryEvent),
          memoryEvents: (data.config?.memoryEvents || []).map(normalizeMemoryEvent),
          endings: data.config?.endings || [],
          mapLocations: (data.config?.mapLocations || []).map(normalizeMapLocation),
          runnerEvents: data.config?.runnerEvents || [],
          quizEvents: data.config?.quizEvents || [],
          snakeEvents: data.config?.snakeEvents || [],
          minefieldEvents: data.config?.minefieldEvents || [],
          circuitPuzzleEvents: data.config?.circuitPuzzleEvents || [],
          circuitLevels: data.config?.circuitLevels || [],
          networkCardEvents: data.config?.networkCardEvents || [],
          globalMusicUrl: data.config?.globalMusicUrl || '',
          victorySound: data.config?.victorySound || '',
          defeatSound: data.config?.defeatSound || '',
        }
        lastSavedConfigRef.current = JSON.stringify(loadedConfig)
        hasLoadedConfigRef.current = true
        setConfig(loadedConfig)

        // Load saved stories from DB (and migrate any localStorage remnants)
        try {
          const savedRes = await adminFetch('/api/admin/saved-stories')
          if (savedRes.ok) {
            const rows = await savedRes.json()
            setSavedStories(rows.map((r: { id: string; name: string; saved_at: string }) => ({
              id: r.id, name: r.name, savedAt: new Date(r.saved_at).getTime(),
            })))
            // Migrate old localStorage stories to DB if DB is empty
            const LS_KEY = 'rpg-admin-saved-stories'
            const lsRaw = localStorage.getItem(LS_KEY)
            if (lsRaw && rows.length === 0) {
              try {
                const lsStories: Array<{ id: string; name: string; config: StoryConfig; savedAt: number }> = JSON.parse(lsRaw)
                for (const s of lsStories) {
                  await adminFetch('/api/admin/saved-stories', {
                    method: 'POST',
                    body: JSON.stringify({ id: s.id, name: s.name, config: s.config }),
                  })
                }
                setSavedStories(lsStories.map(s => ({ id: s.id, name: s.name, savedAt: s.savedAt })))
              } catch { /* ignore migration errors */ }
            }
            localStorage.removeItem(LS_KEY)
          }
        } catch { /* ignore saved stories load error */ }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'No se pudo cargar la configuracion')
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [logout, navigate])

  const saveConfig = async () => {
    setSaving(true)
    setMessage('')
    const requestId = ++saveRequestIdRef.current
    try {
      const draftProblem = findDraftProblem(config)
      if (draftProblem) throw new Error(`${draftProblem} Completa esos campos antes de guardar.`)
      const prepared = await uploadConfigAssets(config)

      const response = await adminFetch('/api/admin/story-config', {
        method: 'PUT',
        body: JSON.stringify({ config: prepared.config }),
      })

      if (response.status === 401 || response.status === 403) {
        throw new Error('No se pudo activar la sesion de administrador. Entra otra vez con admin / admin300.')
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || 'Error guardando')
      }

      const data = await response.json()
      const savedConfig = {
        scenes: (data.config?.scenes || []).map(normalizeScene),
        decisions: data.config?.decisions || [],
        nodeItems: (data.config?.nodeItems || []).map(normalizeNodeItem),
          equipmentCatalog: data.config?.equipmentCatalog || DEFAULT_EQUIPMENT_CATALOG,
        storyEvents: (data.config?.storyEvents || []).map(normalizeStoryEvent),
        memoryEvents: (data.config?.memoryEvents || []).map(normalizeMemoryEvent),
        endings: data.config?.endings || [],
        mapLocations: (data.config?.mapLocations || []).map(normalizeMapLocation),
        runnerEvents: data.config?.runnerEvents || [],
        quizEvents: data.config?.quizEvents || [],
        snakeEvents: data.config?.snakeEvents || [],
        minefieldEvents: data.config?.minefieldEvents || [],
        circuitPuzzleEvents: data.config?.circuitPuzzleEvents || [],
        circuitLevels: data.config?.circuitLevels || [],
        networkCardEvents: data.config?.networkCardEvents || [],
        globalMusicUrl: data.config?.globalMusicUrl || '',
        victorySound: data.config?.victorySound || '',
        defeatSound: data.config?.defeatSound || '',
      }
      // Only apply this response if no newer save has started meanwhile —
      // otherwise a slower request could overwrite fresher local edits (e.g. music just uploaded).
      if (requestId === saveRequestIdRef.current) {
        lastSavedConfigRef.current = JSON.stringify(savedConfig)
        setConfig(savedConfig)
        publishStoryUpdate(savedConfig)
      }
      setMessage('Guardado. El juego ya usa esta historia; vuelve al juego o recarga para verla.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Error guardando')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (loading || saving || !hasLoadedConfigRef.current) return

    const serialized = JSON.stringify(config)
    if (serialized === lastSavedConfigRef.current) return

    // Only block autosave for draft problems in story content,
    // NOT when the only change is mapLocations
    const lastSaved = lastSavedConfigRef.current ? JSON.parse(lastSavedConfigRef.current) : null
    const onlyMapLocationsChanged = lastSaved && JSON.stringify({ ...config, mapLocations: [] }) === JSON.stringify({ ...lastSaved, mapLocations: [] })
    const draftBlock = !onlyMapLocationsChanged && findDraftProblem(config)
    if (draftBlock) {
      setMessage(`⚠️ Guardado pausado: ${draftBlock}`)
      return
    }

    if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = window.setTimeout(async () => {
      const requestId = ++saveRequestIdRef.current
      try {
        const prepared = await uploadConfigAssets(config)
        const response = await adminFetch('/api/admin/story-config', {
          method: 'PUT',
          body: JSON.stringify({ config: prepared.config }),
        })
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            setMessage('⚠️ Sesion expirada. Recarga la pagina e inicia sesion de nuevo, o pide al administrador que configure ADMIN_PASSWORD en Railway.')
          } else {
            const errData = await response.json().catch(() => null)
            setMessage(`⚠️ Error en guardado automatico (${response.status}): ${errData?.error || 'error desconocido'}`)
          }
          return
        }
        // A newer save (manual or autosave) started while this request was in flight — discard this stale response.
        if (requestId !== saveRequestIdRef.current) return
        const data = await response.json()
        const savedConfig = {
          scenes: (data.config?.scenes || []).map(normalizeScene),
          decisions: data.config?.decisions || [],
          nodeItems: (data.config?.nodeItems || []).map(normalizeNodeItem),
          equipmentCatalog: data.config?.equipmentCatalog || DEFAULT_EQUIPMENT_CATALOG,
          storyEvents: (data.config?.storyEvents || []).map(normalizeStoryEvent),
          memoryEvents: (data.config?.memoryEvents || []).map(normalizeMemoryEvent),
          endings: data.config?.endings || [],
          mapLocations: (data.config?.mapLocations || []).map(normalizeMapLocation),
          runnerEvents: data.config?.runnerEvents || [],
          quizEvents: data.config?.quizEvents || [],
          snakeEvents: data.config?.snakeEvents || [],
          minefieldEvents: data.config?.minefieldEvents || [],
          circuitPuzzleEvents: data.config?.circuitPuzzleEvents || [],
          circuitLevels: data.config?.circuitLevels || [],
          networkCardEvents: data.config?.networkCardEvents || [],
          globalMusicUrl: data.config?.globalMusicUrl || '',
          victorySound: data.config?.victorySound || '',
          defeatSound: data.config?.defeatSound || '',
        }
        // Detect if backend dropped any items (key mismatch / orphaned sceneKey)
        const sent = prepared.config
        const lostScenes   = (sent.scenes?.length || 0) - (savedConfig.scenes.length)
        const lostEvents   = ((sent.storyEvents?.length || 0) + (sent.runnerEvents?.length || 0) + (sent.quizEvents?.length || 0) + (sent.snakeEvents?.length || 0) + (sent.minefieldEvents?.length || 0) + (sent.circuitPuzzleEvents?.length || 0) + (sent.networkCardEvents?.length || 0) + (sent.memoryEvents?.length || 0))
          - ((savedConfig.storyEvents.length) + (savedConfig.runnerEvents.length) + (savedConfig.quizEvents.length) + (savedConfig.snakeEvents.length) + (savedConfig.minefieldEvents.length) + (savedConfig.circuitPuzzleEvents.length) + (savedConfig.networkCardEvents.length) + (savedConfig.memoryEvents.length))
        const lostItems    = (sent.nodeItems?.length || 0) - savedConfig.nodeItems.length
        const totalLost = lostScenes + lostEvents + lostItems

        lastSavedConfigRef.current = JSON.stringify(savedConfig)
        setConfig(savedConfig)
        publishStoryUpdate(savedConfig)

        if (totalLost > 0) {
          const parts = [
            lostScenes  > 0 ? `${lostScenes} nodo(s)` : '',
            lostEvents  > 0 ? `${lostEvents} evento(s)` : '',
            lostItems   > 0 ? `${lostItems} item(s)` : '',
          ].filter(Boolean).join(', ')
          setMessage(`⚠️ Guardado OK pero se perdieron ${parts}. Causa probable: la clave del nodo no coincide. Revisa que todos los eventos/items apunten a un nodo existente.`)
        } else {
          setMessage('Guardado automatico. El juego ya recibio estos cambios.')
        }
      } catch (error) {
        console.error('Error en guardado automatico:', error)
        setMessage(`⚠️ Error en guardado automatico: ${error instanceof Error ? error.message : 'error de red'}`)
      }
    }, 800)

    return () => {
      if (autosaveTimerRef.current) window.clearTimeout(autosaveTimerRef.current)
    }
  }, [config, loading, saving])

  const updateScene = (index: number, patch: Partial<SceneConfig>) => {
    setConfig(prev => ({
      ...prev,
      scenes: prev.scenes.map((scene, i) => i === index ? { ...scene, ...patch } : scene),
    }))
  }

  const renameSceneKey = (index: number, nextKey: string) => {
    const oldKey = config.scenes[index]?.key || ''
    const rk = <T extends { sceneKey: string }>(arr: T[]): T[] =>
      arr.map(item => item.sceneKey === oldKey ? { ...item, sceneKey: nextKey } : item)
    setConfig(prev => ({
      ...prev,
      scenes: prev.scenes.map((scene, i) => i === index ? { ...scene, key: nextKey } : scene),
      decisions: prev.decisions.map(decision => ({
        ...decision,
        sceneKey: decision.sceneKey === oldKey ? nextKey : decision.sceneKey,
        nextSceneKey: decision.nextSceneKey === oldKey ? nextKey : decision.nextSceneKey,
      })),
      nodeItems:           rk(prev.nodeItems),
      storyEvents:         rk(prev.storyEvents),
      memoryEvents:        rk(prev.memoryEvents),
      endings:             rk(prev.endings),
      runnerEvents:        rk(prev.runnerEvents as { sceneKey: string }[]) as typeof prev.runnerEvents,
      quizEvents:          rk(prev.quizEvents as { sceneKey: string }[]) as typeof prev.quizEvents,
      snakeEvents:         rk(prev.snakeEvents as { sceneKey: string }[]) as typeof prev.snakeEvents,
      minefieldEvents:     rk(prev.minefieldEvents as { sceneKey: string }[]) as typeof prev.minefieldEvents,
      circuitPuzzleEvents: rk(prev.circuitPuzzleEvents as { sceneKey: string }[]) as typeof prev.circuitPuzzleEvents,
      networkCardEvents:   rk(prev.networkCardEvents as { sceneKey: string }[]) as typeof prev.networkCardEvents,
    }))
    setSelectedSceneKey(nextKey)
  }

  const updateDecision = (index: number, patch: Partial<DecisionConfig>) => {
    setConfig(prev => ({
      ...prev,
      decisions: prev.decisions.map((decision, i) => i === index ? { ...decision, ...patch } : decision),
    }))
  }

  const updateNodeItem = (index: number, patch: Partial<NodeItemConfig>) => {
    setConfig(prev => ({
      ...prev,
      nodeItems: prev.nodeItems.map((item, i) => i === index ? { ...item, ...patch } : item),
    }))
  }

  const updateEquipmentCatalogItem = (slot: string, patch: Partial<NodeItemConfig>) => {
    setConfig(prev => ({
      ...prev,
      equipmentCatalog: prev.equipmentCatalog.map(item => item.slot === slot ? { ...item, ...patch } : item),
    }))
  }

  const placeCatalogItem = (index: number, slot: string) => {
    const cat = config.equipmentCatalog.find(c => c.slot === slot) || config.equipmentCatalog[0]
    updateNodeItem(index, { name: cat.name, type: cat.type, slot: cat.slot, power: cat.power, rarity: cat.rarity })
  }

  const updateEnding = (index: number, patch: Partial<EndingConfig>) => {
    setConfig(prev => ({
      ...prev,
      endings: prev.endings.map((ending, i) => i === index ? { ...ending, ...patch } : ending),
    }))
  }

  const updateStoryEvent = (index: number, patch: Partial<StoryChoiceEventConfig>) => {
    setConfig(prev => ({
      ...prev,
      storyEvents: prev.storyEvents.map((event, i) => i === index ? { ...event, ...patch } : event),
    }))
  }

  const updateMemoryEvent = (index: number, patch: Partial<MemoryEventConfig>) => {
    setConfig(prev => ({
      ...prev,
      memoryEvents: prev.memoryEvents.map((event, i) => i === index ? { ...event, ...patch } : event),
    }))
  }

  const deleteSceneFromFlow = (sceneKey: string) => {
    setConfig(prev => ({
      ...prev,
      scenes: prev.scenes.filter(scene => scene.key !== sceneKey),
      decisions: prev.decisions.filter(decision => decision.sceneKey !== sceneKey && decision.nextSceneKey !== sceneKey),
      nodeItems: prev.nodeItems.filter(item => item.sceneKey !== sceneKey),
      storyEvents: prev.storyEvents.filter(event => event.sceneKey !== sceneKey),
      memoryEvents: prev.memoryEvents.filter(event => event.sceneKey !== sceneKey),
      endings: prev.endings.filter(ending => ending.sceneKey !== sceneKey),
    }))
    setSelectedSceneKey('')
    setMessage(`Nodo ${sceneKey} eliminado del diagrama y de los cuadros.`)
  }

  const moveSceneInFlow = (sceneKey: string, flowX: number, flowY: number, flowPage = 1) => {
    setConfig(prev => ({
      ...prev,
      scenes: prev.scenes.map(scene => {
        if (scene.key !== sceneKey) return scene
        return { ...scene, flowX: clampFlow(flowX), flowY: clampFlow(flowY), flowPage }
      }),
    }))
  }

  const connectScenesInFlow = (fromKey: string, toKey: string) => {
    if (!fromKey || !toKey || fromKey === toKey) return
    setConfig(prev => ({
      ...prev,
      decisions: [
        ...prev.decisions,
        { ...blankDecision, sceneKey: fromKey, nextSceneKey: toKey, label: `Ir a ${toKey}` },
      ],
    }))
    setMessage(`Flecha creada: ${fromKey} -> ${toKey}. Completa el texto de la decision abajo.`)
  }

  const deleteDecisionFromFlow = (index: number) => {
    setConfig(prev => ({
      ...prev,
      decisions: prev.decisions.filter((_, i) => i !== index),
    }))
  }

  const deleteMemoryEventFromFlow = (index: number) => {
    setConfig(prev => ({
      ...prev,
      memoryEvents: prev.memoryEvents.filter((_, i) => i !== index),
    }))
  }

  const deleteItemFromFlow = (index: number) => {
    setConfig(prev => ({
      ...prev,
      nodeItems: prev.nodeItems.filter((_, i) => i !== index),
    }))
  }

  const autoArrangeFlow = () => {
    const incomingCount = new Map<string, number>()
    config.scenes.forEach(scene => incomingCount.set(scene.key, 0))
    config.decisions.forEach(decision => {
      incomingCount.set(decision.nextSceneKey, (incomingCount.get(decision.nextSceneKey) || 0) + 1)
    })

    const roots = config.scenes.filter(scene => (incomingCount.get(scene.key) || 0) === 0)
    const ordered: SceneConfig[] = []
    const visited = new Set<string>()
    const visit = (scene: SceneConfig, depth = 0) => {
      if (visited.has(scene.key)) return
      visited.add(scene.key)
      ordered.push({ ...scene, flowX: 6 + Math.min(depth, 5) * 16 })
      config.decisions
        .filter(decision => decision.sceneKey === scene.key)
        .forEach(decision => {
          const child = config.scenes.find(item => item.key === decision.nextSceneKey)
          if (child) visit(child, depth + 1)
        })
    }
    roots.forEach(root => visit(root, 0))
    config.scenes.forEach(scene => {
      if (!visited.has(scene.key)) visit(scene, 0)
    })
    setConfig(prev => ({
      ...prev,
      scenes: prev.scenes.map(scene => {
        const index = Math.max(0, ordered.findIndex(item => item.key === scene.key))
        const arranged = ordered[index]
        return {
          ...scene,
          flowX: arranged?.flowX ?? (6 + (index % 5) * 18),
          flowY: 10 + (index % 8) * 11,
          flowPage: Math.floor(index / 8) + 1,
        }
      }),
    }))
    setMessage('Diagrama ordenado y guardado con flechas mas legibles.')
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  const nextSceneKey = () => {
    const used = new Set(config.scenes.map(scene => scene.key.trim()).filter(Boolean))
    let candidate = String(config.scenes.length + 1)
    let counter = config.scenes.length + 1
    while (used.has(candidate)) {
      counter += 1
      candidate = String(counter)
    }
    return candidate
  }

  const addDecisionFromNode = (sceneKey: string) => {
    setConfig(prev => ({
      ...prev,
      decisions: [...prev.decisions, { ...blankDecision, sceneKey, label: 'Nueva decision' }],
    }))
    setMessage(`Decision nueva creada desde el nodo ${sceneKey}. Completa el destino en la seccion 2.`)
  }

  const addItemToNode = (sceneKey: string) => {
    setConfig(prev => ({
      ...prev,
      nodeItems: [...prev.nodeItems, catalogToNodeItem(prev.equipmentCatalog[0], sceneKey)],
    }))
    setMessage(`Objeto agregado al nodo ${sceneKey}.`)
  }

  const addPotionToNode = (sceneKey: string) => {
    setConfig(prev => ({
      ...prev,
      nodeItems: [...prev.nodeItems, { ...blankPotion, sceneKey, name: 'Nueva pocion' }],
    }))
    setMessage(`Pocion agregada al nodo ${sceneKey}.`)
  }

  const addStoryEventToNode = (sceneKey: string) => {
    if (config.memoryEvents.some(event => event.sceneKey === sceneKey)) {
      setErrorPopup(`No se puede agregar un evento de historia al nodo "${sceneKey}".\n\nEse nodo ya tiene un duelo de memoria asignado. Elimina ese primero.`)
      return
    }
    const count = config.storyEvents.filter(event => event.sceneKey === sceneKey).length + 1
    setConfig(prev => ({
      ...prev,
      storyEvents: [...prev.storyEvents, { ...blankStoryEvent, sceneKey, key: `evento${count}`, title: `Evento ${count}` }],
    }))
    setMessage(`Evento nuevo agregado al nodo ${sceneKey}. Configura sus dos opciones y sus consecuencias.`)
  }

  const addMemoryEventToNode = (sceneKey: string) => {
    if (config.storyEvents.some(event => event.sceneKey === sceneKey)) {
      setErrorPopup(`No se puede agregar un duelo de memoria al nodo "${sceneKey}".\n\nEse nodo ya tiene un evento de historia asignado. Elimina ese primero.`)
      return
    }
    const count = config.memoryEvents.filter(event => event.sceneKey === sceneKey).length + 1
    setConfig(prev => ({
      ...prev,
      memoryEvents: [...prev.memoryEvents, { ...blankMemoryEvent, sceneKey, key: `memoria${count}`, title: `Duelo memoria ${count}` }],
    }))
    setMessage(`Duelo memoria agregado al nodo ${sceneKey}. Completa rival, apuesta y premio en la seccion de encuentros de memoria.`)
  }

  const addRunnerEventToNode = (sceneKey: string) => {
    const count = (config.runnerEvents || []).filter(event => event.sceneKey === sceneKey).length + 1
    setConfig(prev => ({
      ...prev,
      runnerEvents: [...(prev.runnerEvents || []), { key: `runner${count}`, sceneKey, title: `Desafío Runner ${count}`, prompt: '', targetScore: 500, rewardItemName: '', rewardItemType: 'misc', rewardItemPower: 0, winText: '', loseText: '' }],
    }))
    setMessage(`Runner 8-bit agregado al nodo ${sceneKey}. Configura meta y premio.`)
  }

  const addGameEventToNode = (sceneKey: string) => {
    addMemoryEventToNode(sceneKey)
  }

  const addQuizEventToNode = (sceneKey: string) => {
    const count = (config.quizEvents || []).filter(e => e.sceneKey === sceneKey).length + 1
    setConfig(prev => ({
      ...prev,
      quizEvents: [...(prev.quizEvents || []), { key: `quiz${count}`, sceneKey, title: `Quiz AWS ${count}`, prompt: '', rewardItemName: '', rewardItemType: 'misc', rewardItemPower: 0, winText: '', loseText: '' }],
    }))
    setMessage(`Quiz AWS agregado al nodo ${sceneKey}. Configura premio y textos.`)
  }

  const addSnakeEventToNode = (sceneKey: string) => {
    const count = (config.snakeEvents || []).filter(e => e.sceneKey === sceneKey).length + 1
    setConfig(prev => ({
      ...prev,
      snakeEvents: [...(prev.snakeEvents || []), { key: `snake${count}`, sceneKey, title: `Network Snake ${count}`, prompt: '', targetScore: 80, rewardItemName: '', rewardItemType: 'misc', rewardItemPower: 0, winText: '', loseText: '' }],
    }))
    setMessage(`Snake de red agregado al nodo ${sceneKey}. Configura meta y premio.`)
  }

  const updateRunnerEvent = (index: number, patch: Partial<RunnerEventConfig>) => {
    setConfig(prev => ({
      ...prev,
      runnerEvents: (prev.runnerEvents || []).map((event, i) => i === index ? { ...event, ...patch } : event),
    }))
  }

  const updateQuizEvent = (index: number, patch: Partial<QuizEventConfig>) => {
    setConfig(prev => ({
      ...prev,
      quizEvents: (prev.quizEvents || []).map((event, i) => i === index ? { ...event, ...patch } : event),
    }))
  }

  const toggleQuizQuestion = (index: number, questionId: string) => {
    const allIds = QUESTION_BANK.map(q => q.id)
    setConfig(prev => ({
      ...prev,
      quizEvents: (prev.quizEvents || []).map((event, i) => {
        if (i !== index) return event
        const current = event.questionIds && event.questionIds.length > 0 ? event.questionIds : allIds
        const next = current.includes(questionId) ? current.filter(id => id !== questionId) : [...current, questionId]
        return { ...event, questionIds: next.length === allIds.length ? [] : next }
      }),
    }))
  }

  const updateSnakeEvent = (index: number, patch: Partial<SnakeEventConfig>) => {
    setConfig(prev => ({
      ...prev,
      snakeEvents: (prev.snakeEvents || []).map((event, i) => i === index ? { ...event, ...patch } : event),
    }))
  }

  const addMinefieldToNode = (sceneKey: string) => {
    const count = (config.minefieldEvents || []).filter(e => e.sceneKey === sceneKey).length + 1
    setConfig(prev => ({
      ...prev,
      minefieldEvents: [...(prev.minefieldEvents || []), {
        key: `minefield${(prev.minefieldEvents || []).length + 1}`,
        sceneKey,
        title: `Androide ${count}`,
        prompt: '',
        enemyImageUrl: '',
        enemyHP: 60,
        enemyAttack: 15,
        brainCount: 6,
        rewardItemName: '',
        rewardItemType: 'misc',
        rewardItemPower: 0,
        winText: '',
        loseText: '',
      }],
    }))
    setMessage(`Combate Minesweeper agregado al nodo ${sceneKey}.`)
  }

  const updateMinefieldEvent = (index: number, patch: Partial<MinefieldEventConfig>) => {
    setConfig(prev => ({
      ...prev,
      minefieldEvents: (prev.minefieldEvents || []).map((e, i) => i === index ? { ...e, ...patch } : e),
    }))
  }

  const deleteMinefieldEvent = (index: number) => {
    setConfig(prev => ({
      ...prev,
      minefieldEvents: (prev.minefieldEvents || []).filter((_, i) => i !== index),
    }))
  }

  const addCircuitPuzzleToNode = (sceneKey: string) => {
    setConfig(prev => ({
      ...prev,
      circuitPuzzleEvents: [...(prev.circuitPuzzleEvents || []), {
        key: `circuit${(prev.circuitPuzzleEvents || []).length + 1}`,
        sceneKey,
        title: '',
        prompt: '',
        levelId: 0,
        rewardItemName: '',
        rewardItemType: 'misc',
        rewardItemPower: 0,
        winText: '',
        loseText: '',
      }],
    }))
    setMessage(`Laboratorio de circuito agregado al nodo ${sceneKey}.`)
  }

  const updateCircuitPuzzleEvent = (index: number, patch: Partial<CircuitPuzzleEventConfig>) => {
    setConfig(prev => ({
      ...prev,
      circuitPuzzleEvents: (prev.circuitPuzzleEvents || []).map((e, i) => i === index ? { ...e, ...patch } : e),
    }))
  }

  // -- Custom Circuit Lab levels ------------------------------------------------
  const addCircuitLevel = () => {
    const n = (config.circuitLevels || []).length + 1
    setConfig(prev => ({
      ...prev,
      circuitLevels: [...(prev.circuitLevels || []), {
        ...blankCircuitLevel,
        key: `customcircuit${Date.now()}`,
        name: `Nivel personalizado ${n}`,
        slots: [{ id: `slot${Date.now()}`, answer: 'ec2' as CompId, label: 'Slot 1', row: 1, col: 1, insideVpc: false }],
        toolbox: ['ec2'],
      }],
    }))
  }

  const updateCircuitLevel = (index: number, patch: Partial<CircuitLevelConfig>) => {
    setConfig(prev => ({
      ...prev,
      circuitLevels: (prev.circuitLevels || []).map((lvl, i) => i === index ? { ...lvl, ...patch } : lvl),
    }))
  }

  const deleteCircuitLevel = (index: number) => {
    setConfig(prev => ({
      ...prev,
      circuitLevels: (prev.circuitLevels || []).filter((_, i) => i !== index),
    }))
  }

  const addSlotToCircuitLevel = (levelIndex: number) => {
    setConfig(prev => ({
      ...prev,
      circuitLevels: (prev.circuitLevels || []).map((lvl, i) => {
        if (i !== levelIndex) return lvl
        const col = lvl.slots.length + 1
        return { ...lvl, slots: [...lvl.slots, { id: `slot${Date.now()}`, answer: 'ec2' as CompId, label: `Slot ${col}`, row: 1, col, insideVpc: false }] }
      }),
    }))
  }

  const updateCircuitLevelSlot = (levelIndex: number, slotIndex: number, patch: Partial<SlotDef>) => {
    setConfig(prev => ({
      ...prev,
      circuitLevels: (prev.circuitLevels || []).map((lvl, i) => i !== levelIndex ? lvl : {
        ...lvl,
        slots: lvl.slots.map((s, si) => si === slotIndex ? { ...s, ...patch } : s),
      }),
    }))
  }

  const deleteCircuitLevelSlot = (levelIndex: number, slotIndex: number) => {
    setConfig(prev => ({
      ...prev,
      circuitLevels: (prev.circuitLevels || []).map((lvl, i) => i !== levelIndex ? lvl : {
        ...lvl,
        slots: lvl.slots.filter((_, si) => si !== slotIndex),
      }),
    }))
  }

  const toggleCircuitLevelToolboxComponent = (levelIndex: number, comp: CompId) => {
    setConfig(prev => ({
      ...prev,
      circuitLevels: (prev.circuitLevels || []).map((lvl, i) => i !== levelIndex ? lvl : {
        ...lvl,
        toolbox: lvl.toolbox.includes(comp) ? lvl.toolbox.filter(c => c !== comp) : [...lvl.toolbox, comp],
      }),
    }))
  }

  const addNetworkCardToNode = (sceneKey: string) => {
    setConfig(prev => ({
      ...prev,
      networkCardEvents: [...(prev.networkCardEvents || []), {
        key: `netcard${(prev.networkCardEvents || []).length + 1}`,
        sceneKey,
        title: 'Duelo de Red AWS',
        prompt: '',
        rounds: 3,
        rewardItemName: '',
        rewardItemType: 'misc',
        rewardItemPower: 0,
        winText: '¡Dominaste la seguridad de red!',
        loseText: 'La red AWS te superó.',
      }],
    }))
    setMessage(`Duelo de Red AWS agregado al nodo ${sceneKey}.`)
  }

  const updateNetworkCardEvent = (index: number, patch: Partial<NetworkCardEventConfig>) => {
    setConfig(prev => ({
      ...prev,
      networkCardEvents: (prev.networkCardEvents || []).map((e, i) => i === index ? { ...e, ...patch } : e),
    }))
  }

  const createNodeFromFlow = (x: number, y: number, flowPage = 1) => {
    const key = nextSceneKey()
    setConfig(prev => ({
      ...prev,
      scenes: [
        ...prev.scenes,
        (() => {
          const spot = findOpenFlowSpot(prev.scenes, x, y, flowPage)
          return {
            ...blankScene,
            key,
            title: `Nodo ${key}`,
            mapX: x,
            mapY: y,
            flowX: spot.x,
            flowY: spot.y,
            flowPage,
          }
        })(),
      ],
    }))
    setSelectedSceneKey(key)
    setMessage(`Nodo ${key} creado desde el diagrama.`)
  }

  const createDecisionFromFlow = (sceneKey: string) => {
    const firstOther = config.scenes.find(scene => scene.key !== sceneKey)?.key || ''
    setConfig(prev => ({
      ...prev,
      decisions: [...prev.decisions, { ...blankDecision, sceneKey, nextSceneKey: firstOther, label: 'Nueva ruta' }],
    }))
    setMessage(`Decision creada desde ${sceneKey}. Cambia el destino si lo necesitas.`)
  }

  const selectedSceneIndex = config.scenes.findIndex(scene => scene.key === selectedSceneKey)
  const selectedScene = selectedSceneIndex >= 0 ? config.scenes[selectedSceneIndex] : null
  const selectedDecisions = config.decisions
    .map((decision, index) => ({ decision, index }))
    .filter(({ decision }) => decision.sceneKey === selectedSceneKey)
  const selectedItems = config.nodeItems
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => item.sceneKey === selectedSceneKey)
  const selectedStoryEvents = config.storyEvents
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.sceneKey === selectedSceneKey)
  const selectedMemoryEvents = config.memoryEvents
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.sceneKey === selectedSceneKey)
  const selectedRunnerEvents = (config.runnerEvents || [])
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.sceneKey === selectedSceneKey)
  const selectedQuizEvents = (config.quizEvents || [])
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.sceneKey === selectedSceneKey)
  const selectedSnakeEvents = (config.snakeEvents || [])
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.sceneKey === selectedSceneKey)
  const selectedMinefieldEvents = (config.minefieldEvents || [])
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.sceneKey === selectedSceneKey)

  const selectedCircuitPuzzleEvents = (config.circuitPuzzleEvents || [])
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.sceneKey === selectedSceneKey)

  const selectedNetworkCardEvents = (config.networkCardEvents || [])
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.sceneKey === selectedSceneKey)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-white">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cyan-500/30 border-t-cyan-400" />
          <span className="text-sm font-semibold text-slate-300">Cargando panel de administrador...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d1117] p-6 text-white">
      {/* Popup de error de conflicto de nodo */}
      {errorPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setErrorPopup('')}>
          <div className="mx-4 max-w-md rounded-xl border border-red-500/60 bg-[#1a0a0a] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-3 flex items-center gap-3">
              <span className="text-2xl">⛔</span>
              <h3 className="text-base font-black text-red-300">No se puede agregar</h3>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{errorPopup}</p>
            <button
              onClick={() => setErrorPopup('')}
              className="mt-5 w-full rounded-lg bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-500"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-[1500px] space-y-5">

        {/* -- Header -- */}
        <div className="flex flex-col gap-3 rounded-xl border border-slate-700/60 bg-slate-900/80 px-6 py-4 shadow-lg md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-white">
              <span className="text-2xl">🗺️</span> Administrador de Historia
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">Crea nodos, conecta decisiones, coloca objetos en cada parte del camino.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveConfig}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-600/80 px-4 py-2 text-sm font-semibold shadow transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button
              onClick={() => window.open(window.location.origin + window.location.pathname + '#/demo', '_blank')}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-500/40 bg-purple-700/80 px-4 py-2 text-sm font-semibold shadow transition hover:bg-purple-600"
            >
              🎭 Demo
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-600/80 px-4 py-2 text-sm font-semibold shadow transition hover:bg-red-600"
            >
              <LogOut className="h-4 w-4" />
              Salir
            </button>
          </div>
        </div>

        {/* -- Aventuras Guardadas -- */}
        <div className="rounded-xl border border-amber-800/30 bg-slate-900/80 px-5 py-4 shadow-lg">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-amber-300">
              <FolderOpen className="h-4 w-4" />
              Aventuras Guardadas
              {savedStories.length > 0 && (
                <span className="rounded-full bg-amber-700/50 px-2 py-0.5 text-xs font-bold text-amber-200">{savedStories.length}</span>
              )}
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={newSaveName}
                onChange={e => setNewSaveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveLocally()}
                placeholder="Nombre de la aventura..."
                className="w-48 rounded border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-amber-500/60 focus:outline-none"
              />
              <button
                onClick={handleSaveLocally}
                disabled={!newSaveName.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-700/70 px-3 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                Guardar
              </button>
              <button
                onClick={handleExportCurrent}
                title="Exportar la aventura del editor como JSON"
                className="inline-flex items-center gap-1.5 rounded-lg border border-sky-600/40 bg-sky-900/50 px-3 py-1.5 text-xs font-semibold text-sky-300 shadow transition hover:bg-sky-800/60"
              >
                📥 Exportar actual
              </button>
              <button
                onClick={handleExportAll}
                disabled={savedStories.length === 0}
                title="Descargar todas las aventuras guardadas como un bundle JSON"
                className="inline-flex items-center gap-1.5 rounded-lg border border-violet-600/40 bg-violet-900/50 px-3 py-1.5 text-xs font-semibold text-violet-300 shadow transition hover:bg-violet-800/60 disabled:cursor-not-allowed disabled:opacity-40"
              >
                📦 Exportar todas
              </button>
              <input ref={importFileRef} type="file" accept=".json" className="hidden" onChange={handleImportFile} />
              <button
                onClick={() => importFileRef.current?.click()}
                title="Importar aventura o bundle de aventuras desde un archivo JSON"
                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600/40 bg-emerald-900/50 px-3 py-1.5 text-xs font-semibold text-emerald-300 shadow transition hover:bg-emerald-800/60"
              >
                📤 Importar
              </button>
            </div>
          </div>

          {/* Plantillas de ejemplo */}
          <div className="mb-3 border-t border-amber-800/20 pt-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-500/70">Plantillas de ejemplo</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => { setConfig(emptyConfig); setMessage('Plantilla nueva cargada en el editor: 0 nodos. Pulsa Guardar cambios para activarla.') }}
                className="rounded-lg border border-dashed border-emerald-600/50 bg-emerald-950/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-900/50"
              >
                ✨ Plantilla nueva (0 nodos)
              </button>
            </div>
          </div>

          {savedStories.length === 0 ? (
            <p className="text-xs italic text-slate-500">No hay aventuras guardadas. Escribe un nombre y pulsa el boton para guardar la aventura actual.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {savedStories.map(story => (
                <div key={story.id} className="flex flex-col rounded-lg border border-slate-700/60 bg-slate-800/60 p-3">
                  {editingNameId === story.id ? (
                    <input
                      type="text"
                      autoFocus
                      value={editingName}
                      onChange={e => setEditingName(e.target.value)}
                      onBlur={() => handleRenameConfirm(story.id)}
                      onKeyDown={e => { if (e.key === 'Enter') handleRenameConfirm(story.id); if (e.key === 'Escape') setEditingNameId(null) }}
                      className="mb-1 w-full rounded border border-amber-500/50 bg-slate-700 px-2 py-1 text-xs text-white focus:outline-none"
                    />
                  ) : (
                    <div className="mb-1 flex items-start justify-between gap-1">
                      <p className="line-clamp-2 flex-1 text-xs font-semibold leading-snug text-white">{story.name}</p>
                      <button
                        onClick={() => { setEditingNameId(story.id); setEditingName(story.name) }}
                        className="shrink-0 text-slate-500 transition hover:text-amber-400"
                        title="Renombrar"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <p className="mb-2 text-[10px] text-slate-500">
                    {new Date(story.savedAt).toLocaleDateString('es')}
                  </p>
                  <div className="mt-auto flex gap-1.5">
                    <button
                      onClick={() => handleLoadSaved(story.id)}
                      className="flex-1 rounded border border-emerald-600/40 bg-emerald-900/50 px-2 py-1 text-[10px] font-semibold text-emerald-300 transition hover:bg-emerald-800/60"
                    >
                      Cargar
                    </button>
                    <button
                      onClick={() => handleDeleteSaved(story.id)}
                      className="rounded border border-red-700/40 bg-red-950/40 px-2 py-1 text-red-400 transition hover:bg-red-900/60"
                      title="Eliminar"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Configuración de Audio ── */}
        <div className="rounded-xl border border-sky-800/30 bg-slate-900/80 px-5 py-4 shadow-lg">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-sky-300">
            🎵 Configuración de Audio
          </h2>
          <p className="mb-4 text-xs text-slate-400">Sube archivos de tu PC o pega una URL externa (MP3, OGG, WAV). La música de fondo suena en bucle durante toda la aventura. Los sonidos de victoria/derrota se reproducen una sola vez.</p>
          <div className="grid gap-4 md:grid-cols-3">
            {(
              [
                { key: 'globalMusicUrl', label: '🎶 Música de fondo',    accent: 'sky',     placeholder: 'https://... música loop' },
                { key: 'victorySound',   label: '🏆 Sonido de victoria', accent: 'emerald', placeholder: 'https://... sonido victoria' },
                { key: 'defeatSound',    label: '💀 Sonido de derrota',  accent: 'rose',    placeholder: 'https://... sonido derrota' },
              ] as const
            ).map(({ key, label, accent, placeholder }) => {
              const currentUrl = (config as any)[key] as string | undefined
              const uploading  = !!audioUploading[key]
              const inputRef   = React.createRef<HTMLInputElement>()
              return (
                <div key={key}>
                  <label className={`mb-1 block text-[11px] font-semibold uppercase tracking-wide text-${accent}-400`}>{label}</label>

                  {/* Hidden file input */}
                  <input
                    type="file"
                    accept="audio/*"
                    ref={inputRef}
                    className="hidden"
                    onChange={async e => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setAudioUploading(prev => ({ ...prev, [key]: true }))
                      try {
                        const uploaded = await uploadStoryAsset(file)
                        setConfig(prev => ({ ...prev, [key]: uploaded.url }))
                      } catch (err: any) {
                        setMessage(`Error subiendo audio: ${err.message}`)
                      } finally {
                        setAudioUploading(prev => ({ ...prev, [key]: false }))
                        e.target.value = ''
                      }
                    }}
                  />

                  {/* URL input + browse button row */}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={currentUrl || ''}
                      onChange={e => setConfig(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className={`min-w-0 flex-1 rounded border border-${accent}-700/40 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-${accent}-500/60 focus:outline-none`}
                    />
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => inputRef.current?.click()}
                      className={`shrink-0 rounded border border-${accent}-600/50 bg-${accent}-900/60 px-2.5 py-2 text-xs font-semibold text-${accent}-300 transition hover:bg-${accent}-800/60 disabled:cursor-not-allowed disabled:opacity-50`}
                      title="Buscar archivo en tu PC"
                    >
                      {uploading ? '⏳' : '📁'}
                    </button>
                    {currentUrl && (
                      <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, [key]: '' }))}
                        className="shrink-0 rounded border border-slate-600/40 bg-slate-800 px-2 py-2 text-xs text-slate-400 transition hover:text-rose-400"
                        title="Quitar audio"
                      >✕</button>
                    )}
                  </div>

                  {/* Player preview */}
                  {currentUrl && !uploading && (
                    <audio key={currentUrl} controls src={currentUrl} className="mt-2 w-full" style={{ height: 32 }} />
                  )}
                  {uploading && (
                    <p className={`mt-1 text-[10px] text-${accent}-400 animate-pulse`}>Subiendo archivo...</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {message && (
          <div className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow ${
            message.toLowerCase().includes('error') || message.toLowerCase().includes('problema')
              ? 'border-rose-500/40 bg-rose-950/60 text-rose-200'
              : 'border-emerald-500/30 bg-emerald-950/50 text-emerald-200'
          }`}>
            <span className="mt-0.5 shrink-0 text-base">
              {message.toLowerCase().includes('error') || message.toLowerCase().includes('problema') ? '⚠️' : '✅'}
            </span>
            <span>{message}</span>
          </div>
        )}

        <FlowDiagram
          config={config}
          selectedSceneKey={selectedSceneKey}
          onSelectScene={setSelectedSceneKey}
          onAddDecision={addDecisionFromNode}
          onAddMemory={addMemoryEventToNode}
          onAddItem={addItemToNode}
          onDropNode={createNodeFromFlow}
          onDropDecision={createDecisionFromFlow}
          onMoveScene={moveSceneInFlow}
          onDeleteScene={deleteSceneFromFlow}
          onConnectScenes={connectScenesInFlow}
          onDeleteDecision={deleteDecisionFromFlow}
          onDeleteMemory={deleteMemoryEventFromFlow}
          onDeleteItem={deleteItemFromFlow}
          onAutoArrange={autoArrangeFlow}
        />

        {selectedScene && (
          <section className="rounded-xl border border-cyan-400/25 bg-slate-900/90 p-5 shadow-lg">
            <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="inline-flex items-center gap-2 text-xl font-bold text-cyan-100">
                  <GitBranch className="h-5 w-5 text-cyan-400" />
                  Nodo seleccionado
                  <span className="rounded-full border border-cyan-400/40 bg-cyan-950/60 px-2.5 py-0.5 text-sm font-black text-cyan-300">
                    {selectedScene.key}
                  </span>
                </h2>
                <p className="mt-0.5 text-sm text-slate-400">Completa los datos del nodo sin perder el contexto del diagrama.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => addDecisionFromNode(selectedScene.key)} className="rounded-lg border border-sky-500/40 bg-sky-700/80 px-3 py-2 text-sm font-semibold shadow transition hover:bg-sky-700">+ Decisión</button>
                <button onClick={() => addGameEventToNode(selectedScene.key)} className="rounded-lg border border-cyan-500/40 bg-cyan-700/80 px-3 py-2 text-sm font-semibold shadow transition hover:bg-cyan-700">+ Combate ⚔️</button>
                <button onClick={() => addItemToNode(selectedScene.key)} className="rounded-lg border border-amber-500/40 bg-amber-700/80 px-3 py-2 text-sm font-semibold shadow transition hover:bg-amber-700">+ Objeto</button>
                <button onClick={() => addPotionToNode(selectedScene.key)} className="rounded-lg border border-pink-500/40 bg-pink-700/80 px-3 py-2 text-sm font-semibold shadow transition hover:bg-pink-700">+ Pocion 🧪</button>
                <button onClick={() => addStoryEventToNode(selectedScene.key)} className="rounded-lg border border-fuchsia-500/40 bg-fuchsia-700/80 px-3 py-2 text-sm font-semibold shadow transition hover:bg-fuchsia-700">+ Evento</button>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-4">
                <div className="mb-3 text-xs font-black uppercase tracking-widest text-cyan-400">Nodo {selectedScene.key}</div>
                <div className="grid gap-2 md:grid-cols-3">
                  <LabeledInput label="Numero del nodo" value={selectedScene.key} onChange={value => renameSceneKey(selectedSceneIndex, value)} placeholder="1, 1.1, 2.2" />
                  <LabeledInput label="Titulo" value={selectedScene.title} onChange={value => updateScene(selectedSceneIndex, { title: value })} placeholder="Camino del bosque" />
                  <LabeledNumber label="Página del diagrama" value={selectedScene.flowPage || 1} onChange={value => updateScene(selectedSceneIndex, { flowPage: Math.max(1, Math.floor(value)) })} />
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-[1fr_160px]">
                  <LabeledMediaInput label="Imagen o video del nodo" value={selectedScene.mediaUrl} onChange={(value, type) => updateScene(selectedSceneIndex, { mediaUrl: value, mediaType: type || selectedScene.mediaType })} placeholder="URL de imagen/video para reemplazar el mapa" />
                  <LabeledSelect label="Tipo visual" value={selectedScene.mediaType} onChange={value => updateScene(selectedSceneIndex, { mediaType: value })} options={[
                    { value: '', label: 'Mapa normal' },
                    { value: 'image', label: 'Imagen' },
                    { value: 'video', label: 'Video' },
                  ]} />
                </div>
                <div className="mt-3">
                  <LabeledFileInput label="Cancion del nodo" value={selectedScene.musicUrl} onChange={value => updateScene(selectedSceneIndex, { musicUrl: value })} placeholder="URL o archivo de musica" accept="audio/*" buttonText="Buscar" loadedText="Audio cargado desde este PC." />
                </div>
                <label className="mt-3 block space-y-1 text-xs font-semibold text-white">
                  <span>Historia de este nodo</span>
                  <textarea value={selectedScene.story.join('\n')} onChange={e => updateScene(selectedSceneIndex, { story: e.target.value.split('\n') })} className="min-h-28 w-full rounded bg-slate-800 px-3 py-2 text-sm text-white" />
                </label>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <LabeledLocationSelect
                    label="Ubicación en mapa"
                    mapLocations={config.mapLocations}
                    mapX={selectedScene.mapX}
                    mapY={selectedScene.mapY}
                    onChange={(x, y) => updateScene(selectedSceneIndex, { mapX: x, mapY: y })}
                    className="md:col-span-2"
                  />
                  <label className="flex items-end gap-2 pb-2 text-sm">
                    <input type="checkbox" checked={selectedScene.isEnding} onChange={e => updateScene(selectedSceneIndex, { isEnding: e.target.checked })} />
                    Termina historia
                  </label>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded border border-sky-300/25 bg-sky-950/25 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold text-sky-100">
                      Decisiones / flechas
                      {selectedDecisions.length > 0 && (
                        <span className="ml-2 rounded-full bg-sky-700/60 px-2 py-0.5 text-[10px] font-bold text-sky-200">
                          {selectedDecisions.length} opción{selectedDecisions.length !== 1 ? 'es' : ''}
                        </span>
                      )}
                    </span>
                    {selectedDecisions.length < 4 && (
                      <button
                        onClick={() => setConfig(prev => ({
                          ...prev,
                          decisions: [...prev.decisions, { ...blankDecision, sceneKey: selectedSceneKey }],
                        }))}
                        className="flex items-center gap-1 rounded bg-sky-700/60 px-2 py-0.5 text-[10px] font-bold text-sky-200 hover:bg-sky-600/70"
                      >
                        + Añadir opción
                      </button>
                    )}
                  </div>
                  {selectedDecisions.length === 0 && (
                    <div className="text-xs italic text-slate-400">Sin decisiones. Añade entre 2 y 4 opciones.</div>
                  )}
                  {selectedDecisions.map(({ decision, index }, slot) => (
                    <div key={`quick-decision-${index}`} className="relative mb-2 rounded bg-slate-900 p-2">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-400">Opción {slot + 1}</span>
                        <button onClick={() => deleteDecisionFromFlow(index)} className="flex h-5 w-5 items-center justify-center rounded bg-red-600/80 text-[10px] font-bold text-white hover:bg-red-600" title="Eliminar">✕</button>
                      </div>
                      <div className="grid gap-1.5">
                        <LabeledInput label="Texto del botón" value={decision.label} onChange={value => updateDecision(index, { label: value })} placeholder="Ir al sector norte" />
                        <LabeledSelect label="Nodo destino" value={decision.nextSceneKey} onChange={value => updateDecision(index, { nextSceneKey: value })} options={[{ value: '', label: '— Elige destino —' }, ...nodeOptions.filter(o => o.value !== selectedSceneKey)]} />
                      </div>
                    </div>
                  ))}
                  {selectedDecisions.length >= 2 && selectedDecisions.length < 4 && (
                    <p className="mt-1 text-[10px] text-slate-500">Puedes añadir hasta {4 - selectedDecisions.length} opción{4 - selectedDecisions.length !== 1 ? 'es' : ''} más.</p>
                  )}
                  {selectedDecisions.length === 4 && (
                    <p className="mt-1 text-[10px] text-amber-500/80">Máximo de 4 opciones alcanzado.</p>
                  )}
                </div>

                {/* Objetos de equipamiento */}
                <div className="rounded border border-amber-300/25 bg-amber-950/20 p-3">
                  <div className="mb-2 font-semibold text-amber-100">Objetos de equipamiento</div>
                  <p className="mb-2 text-[10px] text-slate-500">Elige cual de los 6 objetos del catalogo aparece en este nodo. El poder y la rareza se configuran en "Catalogo de Equipamiento".</p>
                  {selectedItems.filter(({ item }) => item.type !== 'potion' && item.type !== 'consumable').length === 0
                    ? <div className="text-xs text-slate-400">Sin objetos en este nodo.</div>
                    : selectedItems.filter(({ item }) => item.type !== 'potion' && item.type !== 'consumable').map(({ item, index }) => {
                      const cat = config.equipmentCatalog.find(c => c.slot === getVisualType(item.type, item.slot)) || config.equipmentCatalog[0]
                      return (
                      <div key={`quick-item-${index}`} className="relative mb-2 flex items-center gap-2 rounded bg-slate-900 p-2">
                        <button onClick={() => deleteItemFromFlow(index)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-red-600/80 text-[10px] font-bold text-white hover:bg-red-600" title="Eliminar">✕</button>
                        <div className="flex-1">
                          <LabeledSelect label="Objeto" value={getVisualType(item.type, item.slot)} onChange={v => placeCatalogItem(index, v)} options={EQUIP_VISUAL_OPTIONS} />
                        </div>
                        <span className="mt-4 shrink-0 rounded bg-slate-800 px-2 py-1.5 text-xs font-bold text-amber-200">+{cat.power} · {cat.rarity === 'epic' ? 'Épico' : cat.rarity === 'rare' ? 'Raro' : 'Común'}</span>
                      </div>
                      )
                    })
                  }
                </div>

                {/* Pociones */}
                <div className="rounded border border-pink-300/20 bg-pink-950/15 p-3">
                  <div className="mb-2 font-semibold text-pink-200">Pociones</div>
                  {selectedItems.filter(({ item }) => item.type === 'potion' || item.type === 'consumable').length === 0
                    ? <div className="text-xs text-slate-400">Sin pociones en este nodo.</div>
                    : selectedItems.filter(({ item }) => item.type === 'potion' || item.type === 'consumable').map(({ item, index }) => {
                      const isSpecial = item.type === 'consumable'
                      return (
                        <div key={`quick-potion-${index}`} className={`relative mb-2 grid gap-2 rounded p-2 md:grid-cols-2 ${isSpecial ? 'bg-yellow-950/40 ring-1 ring-yellow-500/40' : 'bg-slate-900'}`}>
                          <button onClick={() => deleteItemFromFlow(index)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-red-600/80 text-[10px] font-bold text-white hover:bg-red-600" title="Eliminar">✕</button>
                          <LabeledInput label={isSpecial ? '✨ Nombre (especial)' : '🧪 Nombre'} value={item.name} onChange={value => updateNodeItem(index, { name: value })} placeholder="Pocion de vida" />
                          <LabeledNumber label="Incremento HP" value={item.power} onChange={value => updateNodeItem(index, { power: value })} />
                          <label className="col-span-2 flex cursor-pointer items-center gap-2 text-[11px] font-semibold text-slate-300">
                            <input type="checkbox" checked={isSpecial} onChange={e => updateNodeItem(index, { type: e.target.checked ? 'consumable' : 'potion', slot: '' })} className="accent-yellow-400" />
                            <span className={isSpecial ? 'text-yellow-300' : ''}>Pocion especial (items brillan en amarillo)</span>
                          </label>
                          {isSpecial && (
                            <LabeledNumber label="Duracion (seg)" value={item.specialDuration || 30} onChange={value => updateNodeItem(index, { specialDuration: value })} />
                          )}
                        </div>
                      )
                    })
                  }
                </div>

                <div className="rounded border border-fuchsia-300/25 bg-fuchsia-950/20 p-3">
                  <div className="mb-2 font-semibold text-fuchsia-100">Eventos de dos opciones</div>
                  {selectedStoryEvents.length === 0 && <div className="text-xs text-white">Sin eventos en este nodo.</div>}
                  {selectedStoryEvents.map(({ event, index }) => (
                    <div key={`quick-event-${index}`} className="relative mb-2 grid gap-2 rounded bg-slate-900 p-2">
                      <button onClick={() => setConfig(prev => ({ ...prev, storyEvents: prev.storyEvents.filter((_, i) => i !== index) }))} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-red-600/80 text-[10px] font-bold text-white hover:bg-red-600" title="Eliminar">✕</button>
                      <div className="grid gap-2 md:grid-cols-2">
                        <LabeledInput label="Clave" value={event.key} onChange={value => updateStoryEvent(index, { key: value })} placeholder="bruja1" />
                        <LabeledInput label="Titulo" value={event.title} onChange={value => updateStoryEvent(index, { title: value })} placeholder="La bruja del camino" />
                      </div>
                      <LabeledInput label="Pregunta / historia corta" value={event.prompt} onChange={value => updateStoryEvent(index, { prompt: value })} placeholder="La figura te ofrece un trato..." />
                      <div className="grid gap-2 md:grid-cols-2">
                        <LabeledInput label="Opcion A" value={event.optionALabel} onChange={value => updateStoryEvent(index, { optionALabel: value })} />
                        <LabeledSelect label="Efecto A" value={event.optionAEffect} onChange={value => updateStoryEvent(index, { optionAEffect: value as EventEffect })} options={eventEffectOptions} />
                        <LabeledInput label="Opcion B" value={event.optionBLabel} onChange={value => updateStoryEvent(index, { optionBLabel: value })} />
                        <LabeledSelect label="Efecto B" value={event.optionBEffect} onChange={value => updateStoryEvent(index, { optionBEffect: value as EventEffect })} options={eventEffectOptions} />
                      </div>
                      <div className="mt-1 rounded border border-fuchsia-400/20 bg-fuchsia-950/30 p-2">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-fuchsia-300">📚 Retroalimentacion</div>
                        <div className="grid gap-2 md:grid-cols-3">
                          <LabeledSelect
                            label="Opcion correcta"
                            value={event.correctOption || ''}
                            onChange={value => updateStoryEvent(index, { correctOption: value as 'A' | 'B' | '' })}
                            options={[
                              { value: '', label: 'Sin respuesta correcta' },
                              { value: 'A', label: 'Opcion A correcta' },
                              { value: 'B', label: 'Opcion B correcta' },
                            ]}
                          />
                          <div className="md:col-span-2">
                            <LabeledInput
                              label="Explicacion general (se muestra siempre)"
                              value={event.explanation || ''}
                              onChange={value => updateStoryEvent(index, { explanation: value })}
                              placeholder="Explicacion que aparece tras cualquier eleccion..."
                            />
                          </div>
                        </div>
                        <div className="mt-2 grid gap-2 md:grid-cols-2">
                          <LabeledInput
                            label="Texto si elige Opcion A"
                            value={event.optionAText || ''}
                            onChange={value => updateStoryEvent(index, { optionAText: value })}
                            placeholder="Texto para cuando elige A..."
                          />
                          <LabeledInput
                            label="Texto si elige Opcion B"
                            value={event.optionBText || ''}
                            onChange={value => updateStoryEvent(index, { optionBText: value })}
                            placeholder="Texto para cuando elige B..."
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded border border-cyan-300/25 bg-cyan-950/20 p-3">
                  <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-cyan-300">⚔️ Combates</div>

                  {/* Selector dropdown + boton Agregar */}
                  <div className="mb-3 flex gap-2">
                    <select
                      value={pendingGame}
                      onChange={e => setPendingGame(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white transition focus:border-cyan-500/60 focus:outline-none"
                    >
                      <option value="">-- Seleccionar juego --</option>
                      <option value="memory">🧠 Duelo de Memoria</option>
                      <option value="runner">🏃 Runner 8-bit</option>
                      <option value="quiz">📋 Quiz AWS</option>
                      <option value="snake">🌐 Snake de Red</option>
                      <option value="minefield">💣 Combate Minesweeper</option>
                      <option value="circuit">🔌 Laboratorio de Circuito</option>
                      <option value="networkcard">🃏 Duelo de Red AWS</option>
                    </select>
                    <button
                      onClick={() => {
                        if (!pendingGame || !selectedSceneKey) return
                        if (pendingGame === 'memory') addMemoryEventToNode(selectedSceneKey)
                        else if (pendingGame === 'runner') addRunnerEventToNode(selectedSceneKey)
                        else if (pendingGame === 'quiz') addQuizEventToNode(selectedSceneKey)
                        else if (pendingGame === 'snake') addSnakeEventToNode(selectedSceneKey)
                        else if (pendingGame === 'minefield') addMinefieldToNode(selectedSceneKey)
                        else if (pendingGame === 'circuit') addCircuitPuzzleToNode(selectedSceneKey)
                        else if (pendingGame === 'networkcard') addNetworkCardToNode(selectedSceneKey)
                        setPendingGame('')
                      }}
                      disabled={!pendingGame}
                      className="shrink-0 rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      + Agregar
                    </button>
                  </div>

                  {/* Juegos asignados al nodo */}
                  {selectedMemoryEvents.length === 0 && selectedRunnerEvents.length === 0 && selectedQuizEvents.length === 0 && selectedSnakeEvents.length === 0 && selectedMinefieldEvents.length === 0 && selectedCircuitPuzzleEvents.length === 0 && selectedNetworkCardEvents.length === 0 ? (
                    <div className="px-1 text-[11px] italic text-slate-500">Sin juegos asignados a este nodo.</div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Asignados:</div>

                      {selectedMemoryEvents.map(({ event, index }) => (
                        <div key={`mem-${index}`} className="rounded border border-cyan-800/40 bg-slate-900/80">
                          <div className="flex items-center justify-between border-b border-cyan-800/30 px-3 py-1.5">
                            <span className="text-[11px] font-bold text-cyan-300">🧠 Duelo de Memoria</span>
                            <div className="flex gap-1">
                              <button onClick={() => setTestingCard(testingCard === `mem-${index}` ? null : `mem-${index}`)} className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${testingCard === `mem-${index}` ? 'bg-cyan-600 text-white' : 'bg-cyan-900/60 text-cyan-200 hover:bg-cyan-700'}`}>{testingCard === `mem-${index}` ? '▲ Cerrar' : '▶ Probar'}</button>
                              <button onClick={() => deleteMemoryEventFromFlow(index)} className="rounded bg-red-700/50 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-600">Eliminar</button>
                            </div>
                          </div>
                          <div className="grid gap-2 p-2 md:grid-cols-2">
                            <LabeledInput label="Clave" value={event.key} onChange={v => updateMemoryEvent(index, { key: v })} placeholder="memoria1" />
                            <LabeledInput label="Rival" value={event.memoryEnemyName} onChange={v => updateMemoryEvent(index, { memoryEnemyName: v })} placeholder="Tahur 8-bit" />
                            <label className="space-y-1 text-xs font-semibold text-slate-300">
                              <span>Premio (item)</span>
                              <select value={event.memoryRewardItemName} onChange={e => {
                                const it = [...POTION_PRESETS, ...config.equipmentCatalog].find(i => i.name === e.target.value)
                                updateMemoryEvent(index, { memoryRewardItemName: e.target.value, ...(it ? { memoryRewardItemType: it.type, memoryRewardItemSlot: it.slot, memoryRewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                <optgroup label="Equipamiento">
                                      {config.equipmentCatalog.map(it => (
                                        <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                      ))}
                                    </optgroup>
                                <optgroup label="Pociones">
                                  {[...POTION_PRESETS, ...config.nodeItems.filter(it => it.type === 'potion' || it.type === 'consumable')].map(it => (
                                    <option key={it.name} value={it.name}>{it.name} {it.type === 'consumable' ? '✨' : '🧪'} ({it.type === 'consumable' ? 'especial' : `+${it.power} HP`})</option>
                                  ))}
                                </optgroup>
                              </select>
                            </label>
                            <LabeledNumber label="Seg./turno" value={event.memoryTurnSeconds} onChange={v => updateMemoryEvent(index, { memoryTurnSeconds: v })} />
                          </div>
                          {testingCard === `mem-${index}` && (
                            <div className="border-t border-cyan-800/30 p-2">
                              <MemoryDuelBoard event={{ ...event, key: event.key || 'test', sceneKey: event.sceneKey || 'test' }} inventory={[]} onFinish={() => setTestingCard(null)} />
                            </div>
                          )}
                        </div>
                      ))}

                      {selectedRunnerEvents.map(({ event, index }) => (
                        <div key={`run-${index}`} className="rounded border border-green-800/40 bg-slate-900/80">
                          <div className="flex items-center justify-between border-b border-green-800/30 px-3 py-1.5">
                            <span className="text-[11px] font-bold text-green-300">🏃 Runner 8-bit</span>
                            <div className="flex gap-1">
                              <button onClick={() => setTestingCard(testingCard === `run-${index}` ? null : `run-${index}`)} className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${testingCard === `run-${index}` ? 'bg-green-600 text-white' : 'bg-green-900/60 text-green-200 hover:bg-green-700'}`}>{testingCard === `run-${index}` ? '▲ Cerrar' : '▶ Probar'}</button>
                              <button onClick={() => setConfig(prev => ({ ...prev, runnerEvents: prev.runnerEvents.filter((_, i) => i !== index) }))} className="rounded bg-red-700/50 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-600">Eliminar</button>
                            </div>
                          </div>
                          <div className="grid gap-2 p-2 md:grid-cols-2">
                            <LabeledInput label="Clave" value={event.key} onChange={v => updateRunnerEvent(index, { key: v })} placeholder="runner1" />
                            <LabeledInput label="Titulo" value={event.title} onChange={v => updateRunnerEvent(index, { title: v })} placeholder="Carrera mortal" />
                            <LabeledNumber label="Meta (pts)" value={event.targetScore} onChange={v => updateRunnerEvent(index, { targetScore: v })} />
                            <label className="space-y-1 text-xs font-semibold text-slate-300">
                              <span>Premio (item)</span>
                              <select value={event.rewardItemName} onChange={e => {
                                const it = [...POTION_PRESETS, ...config.equipmentCatalog].find(i => i.name === e.target.value)
                                updateRunnerEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemSlot: it.slot, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                <optgroup label="Equipamiento">
                                      {config.equipmentCatalog.map(it => (
                                        <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                      ))}
                                    </optgroup>
                                <optgroup label="Pociones">
                                  {[...POTION_PRESETS, ...config.nodeItems.filter(it => it.type === 'potion' || it.type === 'consumable')].map(it => (
                                    <option key={it.name} value={it.name}>{it.name} {it.type === 'consumable' ? '✨' : '🧪'} ({it.type === 'consumable' ? 'especial' : `+${it.power} HP`})</option>
                                  ))}
                                </optgroup>
                              </select>
                            </label>
                            <LabeledInput label="Tipo (auto)" value={event.rewardItemType} onChange={v => updateRunnerEvent(index, { rewardItemType: v })} placeholder="weapon/armor/misc" />
                            <LabeledNumber label="Poder (auto)" value={event.rewardItemPower} onChange={v => updateRunnerEvent(index, { rewardItemPower: v })} />
                          </div>
                          {testingCard === `run-${index}` && (
                            <div className="border-t border-green-800/30 p-2">
                              <RunnerGame event={{ ...event, key: event.key || 'test', sceneKey: event.sceneKey || 'test' }} inventory={[]} onFinish={() => setTestingCard(null)} />
                            </div>
                          )}
                        </div>
                      ))}

                      {selectedQuizEvents.map(({ event, index }) => (
                        <div key={`quiz-${index}`} className="rounded border border-violet-800/40 bg-slate-900/80">
                          <div className="flex items-center justify-between border-b border-violet-800/30 px-3 py-1.5">
                            <span className="text-[11px] font-bold text-violet-300">📋 Quiz AWS</span>
                            <div className="flex gap-1">
                              <button onClick={() => setTestingCard(testingCard === `quiz-${index}` ? null : `quiz-${index}`)} className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${testingCard === `quiz-${index}` ? 'bg-violet-600 text-white' : 'bg-violet-900/60 text-violet-200 hover:bg-violet-700'}`}>{testingCard === `quiz-${index}` ? '▲ Cerrar' : '▶ Probar'}</button>
                              <button onClick={() => setConfig(prev => ({ ...prev, quizEvents: (prev.quizEvents || []).filter((_, i) => i !== index) }))} className="rounded bg-red-700/50 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-600">Eliminar</button>
                            </div>
                          </div>
                          <div className="grid gap-2 p-2 md:grid-cols-2">
                            <LabeledInput label="Clave" value={event.key || ''} onChange={v => updateQuizEvent(index, { key: v })} placeholder="quiz1" />
                            <LabeledInput label="Titulo" value={event.title || ''} onChange={v => updateQuizEvent(index, { title: v })} placeholder="Certificacion AWS" />
                            <label className="space-y-1 text-xs font-semibold text-slate-300">
                              <span>Premio (item)</span>
                              <select value={event.rewardItemName || ''} onChange={e => {
                                const it = [...POTION_PRESETS, ...config.equipmentCatalog].find(i => i.name === e.target.value)
                                updateQuizEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemSlot: it.slot, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                <optgroup label="Equipamiento">
                                      {config.equipmentCatalog.map(it => (
                                        <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                      ))}
                                    </optgroup>
                                <optgroup label="Pociones">
                                  {[...POTION_PRESETS, ...config.nodeItems.filter(it => it.type === 'potion' || it.type === 'consumable')].map(it => (
                                    <option key={it.name} value={it.name}>{it.name} {it.type === 'consumable' ? '✨' : '🧪'} ({it.type === 'consumable' ? 'especial' : `+${it.power} HP`})</option>
                                  ))}
                                </optgroup>
                              </select>
                            </label>
                            <LabeledInput label="Tipo (auto)" value={event.rewardItemType || 'misc'} onChange={v => updateQuizEvent(index, { rewardItemType: v })} placeholder="weapon/armor/misc" />
                            <LabeledNumber label="Poder (auto)" value={event.rewardItemPower || 0} onChange={v => updateQuizEvent(index, { rewardItemPower: v })} />
                            <LabeledInput label="Texto si gana" value={event.winText || ''} onChange={v => updateQuizEvent(index, { winText: v })} placeholder="Certificacion aprobada..." />
                            <div className="col-span-2 rounded border border-violet-700/30 bg-slate-950/40 p-2">
                              <div className="mb-1 flex items-center justify-between">
                                <span className="text-[10px] font-bold uppercase tracking-wide text-violet-300">
                                  Preguntas incluidas ({event.questionIds && event.questionIds.length > 0 ? event.questionIds.length : QUESTION_BANK.length} de {QUESTION_BANK.length})
                                </span>
                                {event.questionIds && event.questionIds.length > 0 && (
                                  <button onClick={() => updateQuizEvent(index, { questionIds: [] })} className="rounded bg-violet-800/50 px-2 py-0.5 text-[10px] text-violet-200 hover:bg-violet-700">Usar todas</button>
                                )}
                              </div>
                              <p className="mb-1 text-[10px] text-slate-500">Vacio = se usan todas las preguntas del banco. Desmarca las que no quieras incluir en este quiz.</p>
                              <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                                {[1, 2, 3].map(lvl => (
                                  <div key={lvl}>
                                    <div className="text-[10px] font-bold text-slate-400">Nivel {lvl}</div>
                                    {QUESTION_BANK.filter(q => q.level === lvl).map(q => (
                                      <label key={q.id} className="flex items-start gap-1.5 py-0.5 text-[10px] text-slate-300">
                                        <input
                                          type="checkbox"
                                          checked={!event.questionIds || event.questionIds.length === 0 ? true : event.questionIds.includes(q.id)}
                                          onChange={() => toggleQuizQuestion(index, q.id)}
                                          className="mt-0.5"
                                        />
                                        <span>{q.text}</span>
                                      </label>
                                    ))}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          {testingCard === `quiz-${index}` && (
                            <div className="border-t border-violet-800/30 p-2">
                              <TechQuizGame event={{ ...event, key: event.key || 'test', sceneKey: event.sceneKey || 'test' }} onFinish={() => setTestingCard(null)} />
                            </div>
                          )}
                        </div>
                      ))}

                      {selectedSnakeEvents.map(({ event, index }) => (
                        <div key={`snk-${index}`} className="rounded border border-teal-800/40 bg-slate-900/80">
                          <div className="flex items-center justify-between border-b border-teal-800/30 px-3 py-1.5">
                            <span className="text-[11px] font-bold text-teal-300">🌐 Snake de Red</span>
                            <div className="flex gap-1">
                              <button onClick={() => setTestingCard(testingCard === `snk-${index}` ? null : `snk-${index}`)} className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${testingCard === `snk-${index}` ? 'bg-teal-600 text-white' : 'bg-teal-900/60 text-teal-200 hover:bg-teal-700'}`}>{testingCard === `snk-${index}` ? '▲ Cerrar' : '▶ Probar'}</button>
                              <button onClick={() => setConfig(prev => ({ ...prev, snakeEvents: (prev.snakeEvents || []).filter((_, i) => i !== index) }))} className="rounded bg-red-700/50 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-600">Eliminar</button>
                            </div>
                          </div>
                          <div className="grid gap-2 p-2 md:grid-cols-2">
                            <LabeledInput label="Clave" value={event.key || ''} onChange={v => updateSnakeEvent(index, { key: v })} placeholder="snake1" />
                            <LabeledInput label="Titulo" value={event.title || ''} onChange={v => updateSnakeEvent(index, { title: v })} placeholder="Protocolo de red" />
                            <LabeledNumber label="Meta (pts)" value={event.targetScore || 80} onChange={v => updateSnakeEvent(index, { targetScore: v })} />
                            <label className="space-y-1 text-xs font-semibold text-slate-300">
                              <span>Premio (item)</span>
                              <select value={event.rewardItemName || ''} onChange={e => {
                                const it = [...POTION_PRESETS, ...config.equipmentCatalog].find(i => i.name === e.target.value)
                                updateSnakeEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemSlot: it.slot, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                <optgroup label="Equipamiento">
                                      {config.equipmentCatalog.map(it => (
                                        <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                      ))}
                                    </optgroup>
                                <optgroup label="Pociones">
                                  {[...POTION_PRESETS, ...config.nodeItems.filter(it => it.type === 'potion' || it.type === 'consumable')].map(it => (
                                    <option key={it.name} value={it.name}>{it.name} {it.type === 'consumable' ? '✨' : '🧪'} ({it.type === 'consumable' ? 'especial' : `+${it.power} HP`})</option>
                                  ))}
                                </optgroup>
                              </select>
                            </label>
                            <LabeledInput label="Tipo (auto)" value={event.rewardItemType || 'misc'} onChange={v => updateSnakeEvent(index, { rewardItemType: v })} placeholder="weapon/armor/misc" />
                            <LabeledNumber label="Poder (auto)" value={event.rewardItemPower || 0} onChange={v => updateSnakeEvent(index, { rewardItemPower: v })} />
                          </div>
                          {testingCard === `snk-${index}` && (
                            <div className="border-t border-teal-800/30 p-2">
                              <TechSnakeGame event={{ ...event, key: event.key || 'test', sceneKey: event.sceneKey || 'test' }} onFinish={() => setTestingCard(null)} />
                            </div>
                          )}
                        </div>
                      ))}

                      {selectedMinefieldEvents.map(({ event, index }) => (
                        <div key={`mf-${index}`} className="rounded border border-rose-800/40 bg-slate-900/80">
                          <div className="flex items-center justify-between border-b border-rose-800/30 px-3 py-1.5">
                            <span className="text-[11px] font-bold text-rose-300">💣 Combate Minesweeper</span>
                            <div className="flex gap-1">
                              <button onClick={() => setTestingCard(testingCard === `mf-${index}` ? null : `mf-${index}`)} className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${testingCard === `mf-${index}` ? 'bg-rose-600 text-white' : 'bg-rose-900/60 text-rose-200 hover:bg-rose-700'}`}>{testingCard === `mf-${index}` ? '▲ Cerrar' : '▶ Probar'}</button>
                              <button onClick={() => setConfig(prev => ({ ...prev, minefieldEvents: (prev.minefieldEvents || []).filter((_, i) => i !== index) }))} className="rounded bg-red-700/50 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-600">Eliminar</button>
                            </div>
                          </div>
                          <div className="grid gap-2 p-2 md:grid-cols-2">
                            <LabeledInput label="Clave" value={event.key || ''} onChange={v => updateMinefieldEvent(index, { key: v })} placeholder="mf1" />
                            <LabeledInput label="Titulo" value={event.title || ''} onChange={v => updateMinefieldEvent(index, { title: v })} placeholder="Androide hostil" />
                            <LabeledInput label="Prompt" value={event.prompt || ''} onChange={v => updateMinefieldEvent(index, { prompt: v })} placeholder="Encuentra los puntos débiles..." />
                            <LabeledFileInput label="Imagen enemigo" value={event.enemyImageUrl || ''} onChange={v => updateMinefieldEvent(index, { enemyImageUrl: v })} placeholder="https://... o sube un archivo" accept="image/*" buttonText="Buscar" loadedText="Imagen cargada desde este PC." />
                            <LabeledNumber label="HP enemigo" value={event.enemyHP ?? 60} onChange={v => updateMinefieldEvent(index, { enemyHP: v })} />
                            <LabeledNumber label="Ataque enemigo" value={event.enemyAttack ?? 15} onChange={v => updateMinefieldEvent(index, { enemyAttack: v })} />
                            <LabeledNumber label="Celdas cerebro (de 16)" value={event.brainCount ?? 6} onChange={v => updateMinefieldEvent(index, { brainCount: Math.min(15, Math.max(1, v)) })} />
                            <label className="space-y-1 text-xs font-semibold text-slate-300">
                              <span>Premio (item)</span>
                              <select value={event.rewardItemName || ''} onChange={e => {
                                const it = [...POTION_PRESETS, ...config.equipmentCatalog].find(i => i.name === e.target.value)
                                updateMinefieldEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemSlot: it.slot, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                <optgroup label="Equipamiento">
                                      {config.equipmentCatalog.map(it => (
                                        <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                      ))}
                                    </optgroup>
                                <optgroup label="Pociones">
                                  {[...POTION_PRESETS, ...config.nodeItems.filter(it => it.type === 'potion' || it.type === 'consumable')].map(it => (
                                    <option key={it.name} value={it.name}>{it.name} {it.type === 'consumable' ? '✨' : '🧪'} ({it.type === 'consumable' ? 'especial' : `+${it.power} HP`})</option>
                                  ))}
                                </optgroup>
                              </select>
                            </label>
                            <LabeledInput label="Texto si gana" value={event.winText || ''} onChange={v => updateMinefieldEvent(index, { winText: v })} placeholder="Androide destruido..." />
                            <LabeledInput label="Texto si pierde" value={event.loseText || ''} onChange={v => updateMinefieldEvent(index, { loseText: v })} placeholder="Las trampas te vencieron..." />
                          </div>
                          {testingCard === `mf-${index}` && (
                            <div className="border-t border-rose-800/30 p-2">
                              <MinefieldGame event={{ ...event, key: event.key || 'test', sceneKey: event.sceneKey || 'test' }} playerAttack={10} playerHealth={100} playerMaxHealth={100} onFinish={() => setTestingCard(null)} onDamagePlayer={() => {}} />
                            </div>
                          )}
                        </div>
                      ))}

                      {selectedCircuitPuzzleEvents.map(({ event, index }) => (
                        <div key={`cp-${index}`} className="rounded border border-emerald-800/40 bg-slate-900/80">
                          <div className="flex items-center justify-between border-b border-emerald-800/30 px-3 py-1.5">
                            <span className="text-[11px] font-bold text-emerald-300">🔌 Laboratorio de Circuito</span>
                            <div className="flex gap-1">
                              <button onClick={() => setTestingCard(testingCard === `cp-${index}` ? null : `cp-${index}`)} className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${testingCard === `cp-${index}` ? 'bg-emerald-600 text-white' : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-700'}`}>{testingCard === `cp-${index}` ? '▲ Cerrar' : '▶ Probar'}</button>
                              <button onClick={() => setConfig(prev => ({ ...prev, circuitPuzzleEvents: (prev.circuitPuzzleEvents || []).filter((_, i) => i !== index) }))} className="rounded bg-red-700/50 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-600">Eliminar</button>
                            </div>
                          </div>
                          <div className="grid gap-2 p-2 md:grid-cols-2">
                            <LabeledInput label="Clave" value={event.key || ''} onChange={v => updateCircuitPuzzleEvent(index, { key: v })} placeholder="circuit1" />
                            <LabeledInput label="Titulo" value={event.title || ''} onChange={v => updateCircuitPuzzleEvent(index, { title: v })} placeholder="Circuito de misiles" />
                            <LabeledSelect
                              label="Nivel"
                              value={event.customLevelKey ? `custom:${event.customLevelKey}` : String(event.levelId ?? 0)}
                              onChange={v => {
                                if (v.startsWith('custom:')) {
                                  updateCircuitPuzzleEvent(index, { customLevelKey: v.slice('custom:'.length) })
                                } else {
                                  updateCircuitPuzzleEvent(index, { levelId: Number(v), customLevelKey: '' })
                                }
                              }}
                              options={[
                                { value: '0', label: 'N1 - Sistema de misiles (WAF+SG+EC2+S3)' },
                                { value: '1', label: 'N2 - Red de inteligencia (WAF+ELB+EC2+DDB+S3)' },
                                { value: '2', label: 'N3 - Cuartel alta disponibilidad (FW+WAF+ELB+EC2+RDS)' },
                                ...(config.circuitLevels || []).map(lvl => ({ value: `custom:${lvl.key}`, label: `🎨 ${lvl.name}` })),
                              ]}
                            />
                            <LabeledInput label="Prompt" value={event.prompt || ''} onChange={v => updateCircuitPuzzleEvent(index, { prompt: v })} placeholder="Los misiles esperan activación..." />
                            <label className="space-y-1 text-xs font-semibold text-slate-300">
                              <span>Premio (item)</span>
                              <select value={event.rewardItemName || ''} onChange={e => {
                                const it = [...POTION_PRESETS, ...config.equipmentCatalog].find(i => i.name === e.target.value)
                                updateCircuitPuzzleEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemSlot: it.slot, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                <optgroup label="Equipamiento">
                                      {config.equipmentCatalog.map(it => (
                                        <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                      ))}
                                    </optgroup>
                                <optgroup label="Pociones">
                                  {[...POTION_PRESETS, ...config.nodeItems.filter(it => it.type === 'potion' || it.type === 'consumable')].map(it => (
                                    <option key={it.name} value={it.name}>{it.name} {it.type === 'consumable' ? '✨' : '🧪'} ({it.type === 'consumable' ? 'especial' : `+${it.power} HP`})</option>
                                  ))}
                                </optgroup>
                              </select>
                            </label>
                            <LabeledInput label="Texto si gana" value={event.winText || ''} onChange={v => updateCircuitPuzzleEvent(index, { winText: v })} placeholder="¡Misiles listos!" />
                            <LabeledInput label="Texto si pierde" value={event.loseText || ''} onChange={v => updateCircuitPuzzleEvent(index, { loseText: v })} placeholder="Sistema comprometido..." />
                          </div>
                          {testingCard === `cp-${index}` && (
                            <div className="border-t border-emerald-800/30 p-2">
                              <CircuitPuzzleGame event={{ ...event, key: event.key || 'test', sceneKey: event.sceneKey || 'test' }} customLevels={config.circuitLevels} playerHealth={100} playerMaxHealth={100} onFinish={() => setTestingCard(null)} onDamagePlayer={() => {}} />
                            </div>
                          )}
                        </div>
                      ))}

                      {selectedNetworkCardEvents.map(({ event, index }) => (
                        <div key={`nc-${index}`} className="rounded border border-indigo-800/40 bg-slate-900/80">
                          <div className="flex items-center justify-between border-b border-indigo-800/30 px-3 py-1.5">
                            <span className="text-[11px] font-bold text-indigo-300">🃏 Duelo de Red AWS</span>
                            <div className="flex gap-1">
                              <button onClick={() => setTestingCard(testingCard === `nc-${index}` ? null : `nc-${index}`)} className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${testingCard === `nc-${index}` ? 'bg-indigo-600 text-white' : 'bg-indigo-900/60 text-indigo-200 hover:bg-indigo-700'}`}>{testingCard === `nc-${index}` ? '▲ Cerrar' : '▶ Probar'}</button>
                              <button onClick={() => setConfig(prev => ({ ...prev, networkCardEvents: (prev.networkCardEvents || []).filter((_, i) => i !== index) }))} className="rounded bg-red-700/50 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-600">Eliminar</button>
                            </div>
                          </div>
                          <div className="grid gap-2 p-2 md:grid-cols-2">
                            <LabeledInput label="Clave" value={event.key || ''} onChange={v => updateNetworkCardEvent(index, { key: v })} placeholder="netcard1" />
                            <LabeledInput label="Título" value={event.title || ''} onChange={v => updateNetworkCardEvent(index, { title: v })} placeholder="Duelo de Red AWS" />
                            <LabeledInput label="Prompt" value={event.prompt || ''} onChange={v => updateNetworkCardEvent(index, { prompt: v })} placeholder="Demuestra que entiendes las capas de red..." />
                            <LabeledNumber label="Rondas (mejor de N)" value={event.rounds ?? 3} onChange={v => updateNetworkCardEvent(index, { rounds: Math.max(1, Math.min(5, v)) })} />
                            <label className="space-y-1 text-xs font-semibold text-slate-300">
                              <span>Premio (item)</span>
                              <select value={event.rewardItemName || ''} onChange={e => {
                                const it = [...POTION_PRESETS, ...config.equipmentCatalog].find(i => i.name === e.target.value)
                                updateNetworkCardEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemSlot: it.slot, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                <optgroup label="Equipamiento">
                                      {config.equipmentCatalog.map(it => (
                                        <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                      ))}
                                    </optgroup>
                                <optgroup label="Pociones">
                                  {[...POTION_PRESETS, ...config.nodeItems.filter(it => it.type === 'potion' || it.type === 'consumable')].map(it => (
                                    <option key={it.name} value={it.name}>{it.name} {it.type === 'consumable' ? '✨' : '🧪'} ({it.type === 'consumable' ? 'especial' : `+${it.power} HP`})</option>
                                  ))}
                                </optgroup>
                              </select>
                            </label>
                            <LabeledInput label="Texto si gana" value={event.winText || ''} onChange={v => updateNetworkCardEvent(index, { winText: v })} placeholder="¡Dominaste la seguridad de red!" />
                            <LabeledInput label="Texto si pierde" value={event.loseText || ''} onChange={v => updateNetworkCardEvent(index, { loseText: v })} placeholder="La red AWS te superó." />
                          </div>
                          {testingCard === `nc-${index}` && (
                            <div className="border-t border-indigo-800/30 p-2">
                              <NetworkCardGame event={{ ...event, key: event.key || 'test', sceneKey: event.sceneKey || 'test' }} onFinish={() => setTestingCard(null)} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Laboratorio de Circuitos: niveles personalizados ── */}
        <div className="rounded-xl border border-emerald-800/30 bg-slate-900/80 px-5 py-4 shadow-lg">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-300">
              🔌 Laboratorio de Circuitos — Niveles personalizados
            </h2>
            <button
              onClick={addCircuitLevel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/40 bg-emerald-700/80 px-3 py-1.5 text-xs font-semibold shadow transition hover:bg-emerald-600"
            >
              + Crear nivel
            </button>
          </div>
          <p className="mb-4 text-xs text-slate-400">
            Diseña tu propio circuito: define los slots, qué componente va en cada uno, y qué componentes aparecen disponibles para arrastrar.
            Luego selecciónalo en cualquier "Laboratorio de Circuito" de un nodo, en el campo Nivel.
          </p>

          {(config.circuitLevels || []).length === 0 && (
            <p className="text-xs italic text-slate-500">Sin niveles personalizados todavía. Crea uno para empezar.</p>
          )}

          <div className="space-y-3">
            {(config.circuitLevels || []).map((level, index) => {
              const answeredComps = new Set(level.slots.map(s => s.answer))
              const missingFromToolbox = level.slots.filter(s => s.answer && !level.toolbox.includes(s.answer))
              const testCardKey = `cl-${index}`
              const testEvent: CircuitPuzzleEventConfig = {
                key: 'test', sceneKey: 'test', customLevelKey: level.key, title: level.name,
              }
              return (
                <div key={level.key || index} className="rounded border border-emerald-800/40 bg-slate-950/60">
                  <div className="flex items-center justify-between border-b border-emerald-800/30 px-3 py-1.5">
                    <span className="text-[11px] font-bold text-emerald-300">🎨 {level.name || 'Nivel sin nombre'}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setTestingCard(testingCard === testCardKey ? null : testCardKey)}
                        disabled={level.slots.length === 0}
                        className={`rounded px-2 py-0.5 text-[10px] font-bold transition disabled:cursor-not-allowed disabled:opacity-40 ${testingCard === testCardKey ? 'bg-emerald-600 text-white' : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-700'}`}
                      >
                        {testingCard === testCardKey ? '▲ Cerrar' : '▶ Probar'}
                      </button>
                      <button onClick={() => deleteCircuitLevel(index)} className="rounded bg-red-700/50 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-600">Eliminar</button>
                    </div>
                  </div>

                  <div className="grid gap-2 p-3 md:grid-cols-2">
                    <LabeledInput label="Nombre del nivel" value={level.name} onChange={v => updateCircuitLevel(index, { name: v })} placeholder="Defensa de la VPC norte" />
                    <LabeledInput label="Clave (interna)" value={level.key} onChange={v => updateCircuitLevel(index, { key: v })} placeholder="customcircuit1" />
                    <label className="space-y-1 text-xs font-semibold text-slate-300 md:col-span-2">
                      <span>Historia / instrucciones</span>
                      <textarea value={level.story} onChange={e => updateCircuitLevel(index, { story: e.target.value })} rows={2}
                        placeholder="Necesitas estos componentes en orden para..."
                        className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500/60 focus:outline-none" />
                    </label>
                    <LabeledInput label="Título si gana" value={level.winTitle} onChange={v => updateCircuitLevel(index, { winTitle: v })} placeholder="⚡ ¡Circuito completado!" />
                    <LabeledInput label="Título si pierde" value={level.loseTitle} onChange={v => updateCircuitLevel(index, { loseTitle: v })} placeholder="💥 ¡Sistema comprometido!" />
                  </div>

                  {/* Slots */}
                  <div className="border-t border-emerald-800/30 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-400">Slots ({level.slots.length})</span>
                      <button onClick={() => addSlotToCircuitLevel(index)} className="rounded bg-emerald-800/60 px-2 py-0.5 text-[10px] font-bold text-emerald-200 hover:bg-emerald-700">+ Añadir slot</button>
                    </div>
                    <p className="mb-2 text-[10px] text-slate-500">
                      <strong>Columna</strong> define el orden de izquierda a derecha. <strong>Fila</strong> 1 = camino principal; usa 2, 3... para crear ramas en paralelo
                      que cuelgan debajo de la fila 1 en esa misma columna (ej. EC2 en columna 1 fila 1, y Security Group en columna 1 fila 2).
                    </p>
                    {level.slots.length === 0 && <p className="text-xs italic text-slate-500">Sin slots. Añade al menos uno.</p>}
                    <div className="space-y-1.5">
                      {level.slots.map((slot, slotIndex) => (
                        <div key={slot.id} className="grid grid-cols-[1fr_1fr_70px_70px_auto_auto] items-end gap-1.5 rounded bg-slate-900/70 p-1.5">
                          <LabeledInput label="Etiqueta" value={slot.label} onChange={v => updateCircuitLevelSlot(index, slotIndex, { label: v })} placeholder="Firewall web" />
                          <LabeledSelect
                            label="Componente correcto"
                            value={slot.answer}
                            onChange={v => updateCircuitLevelSlot(index, slotIndex, { answer: v as CompId })}
                            options={(Object.keys(COMP_DEFS) as CompId[]).map(id => ({ value: id, label: COMP_DEFS[id].label }))}
                          />
                          <LabeledNumber label="Columna" value={slot.col} onChange={v => updateCircuitLevelSlot(index, slotIndex, { col: Math.max(1, Math.round(v)) })} />
                          <LabeledNumber label="Fila" value={slot.row} onChange={v => updateCircuitLevelSlot(index, slotIndex, { row: Math.max(1, Math.round(v)) })} />
                          <label className="flex items-center gap-1 pb-2 text-[10px] font-semibold text-slate-300">
                            <input type="checkbox" checked={!!slot.insideVpc} onChange={e => updateCircuitLevelSlot(index, slotIndex, { insideVpc: e.target.checked })} />
                            Dentro de VPC
                          </label>
                          <button onClick={() => deleteCircuitLevelSlot(index, slotIndex)} className="flex h-7 w-7 items-center justify-center rounded bg-red-700/50 text-[10px] font-bold text-red-200 hover:bg-red-600">✕</button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Toolbox */}
                  <div className="border-t border-emerald-800/30 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-400">Componentes disponibles para arrastrar ({level.toolbox.length})</span>
                      {missingFromToolbox.length > 0 && (
                        <button
                          onClick={() => updateCircuitLevel(index, { toolbox: Array.from(new Set([...level.toolbox, ...Array.from(answeredComps)])) })}
                          className="rounded bg-amber-800/60 px-2 py-0.5 text-[10px] font-bold text-amber-200 hover:bg-amber-700"
                        >
                          ⚠ Incluir respuestas faltantes
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 md:grid-cols-6">
                      {(Object.keys(COMP_DEFS) as CompId[]).map(id => (
                        <label key={id} className={`flex items-center gap-1 rounded border px-1.5 py-1 text-[10px] font-semibold transition ${level.toolbox.includes(id) ? 'border-emerald-500/50 bg-emerald-900/40 text-emerald-200' : 'border-slate-700/50 bg-slate-900/40 text-slate-400'}`}>
                          <input type="checkbox" checked={level.toolbox.includes(id)} onChange={() => toggleCircuitLevelToolboxComponent(index, id)} />
                          {COMP_DEFS[id].label}
                        </label>
                      ))}
                    </div>
                    {missingFromToolbox.length > 0 && (
                      <p className="mt-1.5 text-[10px] text-amber-400/80">Falta incluir en la caja de herramientas: {missingFromToolbox.map(s => COMP_DEFS[s.answer]?.label || s.answer).join(', ')}.</p>
                    )}
                  </div>

                  {testingCard === testCardKey && level.slots.length > 0 && (
                    <div className="border-t border-emerald-800/30 p-2">
                      <CircuitPuzzleGame
                        event={testEvent}
                        customLevels={config.circuitLevels}
                        playerHealth={100}
                        playerMaxHealth={100}
                        onFinish={() => setTestingCard(null)}
                        onDamagePlayer={() => {}}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* -- Configuración de Mapa -- */}
        <section className="rounded-xl border border-[#6b371d]/80 bg-slate-900/80 p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="inline-flex items-center gap-2 text-xl font-bold text-[#ffd99a]">
                <MapPin className="h-5 w-5 text-red-400" />
                Configuración de Mapa
                <span className="rounded-full border border-[#a96b32]/50 bg-[#3b1d11] px-2 py-0.5 text-xs font-black text-[#f7c878]">
                  {config.mapLocations.length} ubicaciones
                </span>
              </h2>
              <p className="mt-0.5 text-sm text-slate-400">
                Haz clic en el mapa para crear ubicaciones con nombre. Luego en cada nodo podrás seleccionar dónde aparece en el mapa.
              </p>
            </div>
          </div>
          <MapLocationEditor
            locations={config.mapLocations}
            onChange={locs => setConfig(prev => ({ ...prev, mapLocations: locs }))}
          />
        </section>

        <section className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="inline-flex items-center gap-2 text-xl font-bold text-emerald-100">
              <Music className="h-5 w-5 text-emerald-400" />
              1. Nodos de historia
              <span className="rounded-full border border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 text-xs font-black text-emerald-300">
                {config.scenes.length}
              </span>
            </h2>
            <button onClick={() => createNodeFromFlow(10, 14, 1)} className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-600/80 px-3 py-2 text-sm font-semibold shadow transition hover:bg-blue-600">
              <Plus className="h-4 w-4" /> Nodo
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {config.scenes.map((scene, index) => (
              <div key={index} className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-950/70 shadow">
                <div className="flex items-center justify-between bg-slate-800/80 px-4 py-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Nodo</div>
                    <div className="text-base font-bold text-white">
                      <span className="mr-2 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-2 py-0.5 text-sm text-emerald-300">{scene.key || '?'}</span>
                      {scene.title || 'Sin título'}
                    </div>
                  </div>
                </div>
                <div className="space-y-3 p-4">
                  <div className="grid gap-2 md:grid-cols-2">
                    <LabeledInput label="Numero del nodo" value={scene.key} onChange={value => renameSceneKey(index, value)} placeholder="1, 1.1, 2.2" />
                    <LabeledInput label="Nombre visible" value={scene.title} onChange={value => updateScene(index, { title: value })} placeholder="Camino del bosque" />
                  </div>
                  <div className="grid gap-2 rounded border border-white/10 bg-slate-950/50 p-3 md:grid-cols-2">
                    <LabeledLocationSelect
                      label="Ubicación en mapa"
                      mapLocations={config.mapLocations}
                      mapX={scene.mapX}
                      mapY={scene.mapY}
                      onChange={(x, y) => updateScene(index, { mapX: x, mapY: y })}
                      className="md:col-span-2"
                    />
                  </div>
                  <LabeledFileInput label="Cancion del nodo" value={scene.musicUrl} onChange={value => updateScene(index, { musicUrl: value })} placeholder="URL o archivo de musica" accept="audio/*" buttonText="Buscar" loadedText="Audio cargado desde este PC." />
                  <div className="grid gap-2 md:grid-cols-[1fr_160px]">
                    <LabeledMediaInput label="Imagen o video del nodo" value={scene.mediaUrl} onChange={(value, type) => updateScene(index, { mediaUrl: value, mediaType: type || scene.mediaType })} placeholder="URL de imagen/video para reemplazar el mapa" />
                    <LabeledSelect label="Tipo visual" value={scene.mediaType} onChange={value => updateScene(index, { mediaType: value })} options={[
                      { value: '', label: 'Mapa normal' },
                      { value: 'image', label: 'Imagen' },
                      { value: 'video', label: 'Video' },
                    ]} />
                  </div>
                  <label className="space-y-1 text-xs font-semibold text-white">
                    <span>Historia que se cuenta en este nodo</span>
                    <textarea value={scene.story.join('\n')} onChange={e => updateScene(index, { story: e.target.value.split('\n') })} placeholder="Una linea = un parrafo de historia." className="min-h-32 w-full rounded bg-slate-800 px-3 py-2 text-sm text-white" />
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={scene.isEnding} onChange={e => updateScene(index, { isEnding: e.target.checked })} />
                    Este nodo termina la historia
                  </label>
                  <button onClick={() => deleteSceneFromFlow(scene.key)} className="inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-600/80 px-3 py-1.5 text-sm font-semibold shadow transition hover:bg-red-600">
                    <Trash2 className="h-4 w-4" /> Eliminar nodo
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <AdminList title="2. Decisiones que conectan caminos" icon={<GitBranch className="h-5 w-5 text-sky-400" />} onAdd={() => setConfig(prev => ({ ...prev, decisions: [...prev.decisions, { ...blankDecision }] }))}>
          {config.decisions.map((decision, index) => (
            <div key={index} className="rounded-xl border border-slate-700/50 bg-slate-950/60 p-4 shadow">
              <div className="mb-3 text-sm font-bold text-sky-300">
                {decision.sceneKey || '?'} → {decision.nextSceneKey || '?'}
                {decision.label && <span className="ml-2 text-slate-400 font-normal">"{decision.label}"</span>}
              </div>
              <div className="grid gap-2 md:grid-cols-5">
                <LabeledSelect label="Desde nodo" value={decision.sceneKey} onChange={value => updateDecision(index, { sceneKey: value })} options={nodeOptions} />
                <LabeledInput label="Texto del botón" value={decision.label} onChange={value => updateDecision(index, { label: value })} placeholder="Caminar más" className="md:col-span-2" />
                <LabeledSelect label="Va al nodo" value={decision.nextSceneKey} onChange={value => updateDecision(index, { nextSceneKey: value })} options={nodeOptions} />
              </div>
              <button onClick={() => setConfig(prev => ({ ...prev, decisions: prev.decisions.filter((_, i) => i !== index) }))} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-600/80 px-3 py-1.5 text-sm font-semibold shadow transition hover:bg-red-600">
                <Trash2 className="h-4 w-4" /> Eliminar decisión
              </button>
            </div>
          ))}
        </AdminList>

        {/* Catalogo de Equipamiento */}
        <section className="rounded-xl border border-amber-700/40 bg-amber-950/10 p-5 shadow-lg">
          <h2 className="mb-1 inline-flex items-center gap-2 text-xl font-bold text-white"><PackagePlus className="h-5 w-5 text-amber-300" /> Catálogo de Equipamiento</h2>
          <p className="mb-4 text-xs text-slate-400">Configura aqui el poder y la rareza de los 6 objetos de equipo del juego. Son los unicos que se pueden colocar en los nodos o dar como premio en los minijuegos.</p>
          <div className="grid gap-3 md:grid-cols-3">
            {config.equipmentCatalog.map(cat => (
              <div key={cat.slot} className="rounded border border-white/10 bg-slate-900 p-3">
                <div className="mb-2 text-sm font-bold text-amber-200">{EQUIP_VISUAL_OPTIONS.find(o => o.value === cat.slot)?.label || cat.slot}</div>
                <div className="grid grid-cols-2 gap-2">
                  <LabeledNumber label="Poder" value={cat.power} onChange={value => updateEquipmentCatalogItem(cat.slot, { power: value })} />
                  <LabeledSelect label="Rareza" value={cat.rarity} onChange={value => updateEquipmentCatalogItem(cat.slot, { rarity: value })} options={[
                    { value: 'common', label: 'Comun' },
                    { value: 'rare', label: 'Raro' },
                    { value: 'epic', label: 'Epico' },
                  ]} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4a. Equipamiento */}
        <AdminList title="3a. Equipamiento por camino" icon={<PackagePlus className="h-5 w-5 text-amber-300" />} onAdd={() => setConfig(prev => ({ ...prev, nodeItems: [...prev.nodeItems, catalogToNodeItem(prev.equipmentCatalog[0], '')] }))}>
          {config.nodeItems.filter(item => item.type !== 'potion' && item.type !== 'consumable').map((item) => {
            const index = config.nodeItems.indexOf(item)
            const cat = config.equipmentCatalog.find(c => c.slot === getVisualType(item.type, item.slot)) || config.equipmentCatalog[0]
            return (
              <div key={index} className="rounded border border-white/10 bg-slate-900 p-4">
                <div className="mb-3 text-sm font-bold text-amber-200">
                  {item.name || 'Sin nombre'} — nodo {item.sceneKey || '?'}
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <LabeledSelect label="Nodo" value={item.sceneKey} onChange={value => updateNodeItem(index, { sceneKey: value })} options={nodeOptions} />
                  <LabeledSelect label="Objeto" value={getVisualType(item.type, item.slot)} onChange={v => placeCatalogItem(index, v)} options={EQUIP_VISUAL_OPTIONS} />
                  <span className="mt-4 self-start rounded bg-slate-800 px-2 py-1.5 text-xs font-bold text-amber-200">+{cat.power} · {cat.rarity === 'epic' ? 'Épico' : cat.rarity === 'rare' ? 'Raro' : 'Común'}</span>
                </div>
                <button onClick={() => setConfig(prev => ({ ...prev, nodeItems: prev.nodeItems.filter((_, i) => i !== index) }))} className="mt-3 inline-flex items-center gap-2 rounded bg-red-600 px-3 py-1.5 text-sm hover:bg-red-700">
                  <Trash2 className="h-4 w-4" /> Eliminar
                </button>
              </div>
            )
          })}
        </AdminList>

        {/* 4b. Pociones */}
        <AdminList title="3b. Pociones por camino" icon={<PackagePlus className="h-5 w-5 text-pink-400" />} onAdd={() => setConfig(prev => ({ ...prev, nodeItems: [...prev.nodeItems, { ...blankPotion }] }))}>
          {config.nodeItems.filter(item => item.type === 'potion' || item.type === 'consumable').map((item) => {
            const index = config.nodeItems.indexOf(item)
            const isSpecial = item.type === 'consumable'
            return (
              <div key={index} className={`rounded border p-4 ${isSpecial ? 'border-yellow-500/40 bg-yellow-950/20' : 'border-pink-900/30 bg-slate-900'}`}>
                <div className="mb-3 text-sm font-bold">
                  {isSpecial
                    ? <span className="text-yellow-300">✨ Pocion Especial — {item.name || 'Sin nombre'} — nodo {item.sceneKey || '?'}</span>
                    : <span className="text-pink-300">🧪 Pocion — {item.name || 'Sin nombre'} — nodo {item.sceneKey || '?'}</span>
                  }
                </div>
                <div className="grid gap-2 md:grid-cols-4">
                  <LabeledSelect label="Nodo" value={item.sceneKey} onChange={value => updateNodeItem(index, { sceneKey: value })} options={nodeOptions} />
                  <LabeledInput label="Nombre" value={item.name} onChange={value => updateNodeItem(index, { name: value })} placeholder="Pocion de vida" />
                  <LabeledNumber label="Incremento de salud (HP)" value={item.power} onChange={value => updateNodeItem(index, { power: value })} />
                  <LabeledSelect label="Rareza" value={item.rarity} onChange={value => updateNodeItem(index, { rarity: value })} options={[
                    { value: 'common', label: 'Comun' },
                    { value: 'rare', label: 'Raro' },
                    { value: 'epic', label: 'Epico' },
                  ]} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-300">
                    <input
                      type="checkbox"
                      checked={isSpecial}
                      onChange={e => updateNodeItem(index, { type: e.target.checked ? 'consumable' : 'potion', slot: '' })}
                      className="accent-yellow-400"
                    />
                    <span className={isSpecial ? 'text-yellow-300 font-bold' : ''}>
                      Pocion especial — todos los items brillan en amarillo por tiempo limitado
                    </span>
                  </label>
                  {isSpecial && (
                    <LabeledNumber label="Duracion (segundos)" value={item.specialDuration || 30} onChange={value => updateNodeItem(index, { specialDuration: value })} />
                  )}
                </div>
                <LabeledInput label="Descripcion" value={item.description} onChange={value => updateNodeItem(index, { description: value })} placeholder="Restaura vida al jugador" />
                <button onClick={() => setConfig(prev => ({ ...prev, nodeItems: prev.nodeItems.filter((_, i) => i !== index) }))} className="mt-3 inline-flex items-center gap-2 rounded bg-red-600 px-3 py-1.5 text-sm hover:bg-red-700">
                  <Trash2 className="h-4 w-4" /> Eliminar pocion
                </button>
              </div>
            )
          })}
        </AdminList>

        <AdminList title="4. Encuentros memoria 8-bit" icon={<Skull className="h-5 w-5 text-cyan-300" />} onAdd={() => setConfig(prev => ({ ...prev, memoryEvents: [...prev.memoryEvents, { ...blankMemoryEvent }] }))}>
          {config.memoryEvents.map((event, index) => (
            <div key={index} className="rounded border border-white/10 bg-slate-900 p-4">
              <div className="mb-3 text-sm font-bold text-cyan-200">
                Memoria {event.key || '(sin clave)'} en nodo {event.sceneKey || '(sin nodo)'} - {event.title || 'Sin titulo'}
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <LabeledInput label="Clave" value={event.key} onChange={value => updateMemoryEvent(index, { key: value })} placeholder="memoria1" />
                <LabeledSelect label="Nodo" value={event.sceneKey} onChange={value => updateMemoryEvent(index, { sceneKey: value })} options={nodeOptions} />
                <LabeledInput label="Titulo" value={event.title} onChange={value => updateMemoryEvent(index, { title: value })} placeholder="Duelo en la mesa vieja" />
                <LabeledInput label="Rival" value={event.memoryEnemyName} onChange={value => updateMemoryEvent(index, { memoryEnemyName: value })} placeholder="Tahur 8-bit" />
                <LabeledNumber label="Segundos por turno" value={event.memoryTurnSeconds} onChange={value => updateMemoryEvent(index, { memoryTurnSeconds: value })} />
                <LabeledInput label="Premio si gana" value={event.memoryRewardItemName} onChange={value => updateMemoryEvent(index, { memoryRewardItemName: value })} placeholder="Brazal de memoria" />
                <LabeledSelect label="Tipo premio" value={event.memoryRewardItemType} onChange={value => updateMemoryEvent(index, { memoryRewardItemType: value, memoryRewardItemSlot: value === 'potion' ? '' : value })} options={[
                  ...EQUIP_VISUAL_OPTIONS,
                  { value: 'potion', label: 'Pocion' },
                ]} />
                <LabeledNumber label="Poder premio" value={event.memoryRewardItemPower} onChange={value => updateMemoryEvent(index, { memoryRewardItemPower: value })} />
              </div>
              <label className="mt-2 block space-y-1 text-xs font-semibold text-white">
                <span>Texto antes del duelo</span>
                <textarea value={event.prompt} onChange={e => updateMemoryEvent(index, { prompt: e.target.value })} className="min-h-20 w-full rounded bg-slate-800 px-3 py-2 text-sm text-white" />
              </label>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <LabeledInput label="Texto si gana" value={event.memoryWinText} onChange={value => updateMemoryEvent(index, { memoryWinText: value })} placeholder="Vences al rival y tomas la apuesta." />
                <LabeledInput label="Texto si pierde" value={event.memoryLoseText} onChange={value => updateMemoryEvent(index, { memoryLoseText: value })} placeholder="El rival se lleva tu objeto apostado." />
              </div>
              <button onClick={() => setConfig(prev => ({ ...prev, memoryEvents: prev.memoryEvents.filter((_, i) => i !== index) }))} className="mt-3 inline-flex items-center gap-2 rounded bg-red-600 px-3 py-1.5 text-sm hover:bg-red-700">
                <Trash2 className="h-4 w-4" /> Eliminar duelo memoria
              </button>
            </div>
          ))}
        </AdminList>

        <AdminList title="5. Finales de historia" icon={<Flag className="h-5 w-5 text-emerald-300" />} onAdd={() => setConfig(prev => ({ ...prev, endings: [...prev.endings, { sceneKey: '', title: '', description: '' }] }))}>
          {config.endings.map((ending, index) => (
            <div key={index} className="rounded border border-white/10 bg-slate-900 p-4">
              <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                <LabeledSelect label="Nodo final" value={ending.sceneKey} onChange={value => updateEnding(index, { sceneKey: value })} options={nodeOptions} />
                <LabeledInput label="Titulo final" value={ending.title} onChange={value => updateEnding(index, { title: value })} placeholder="Final feliz" />
                <button onClick={() => setConfig(prev => ({ ...prev, endings: prev.endings.filter((_, i) => i !== index) }))} className="self-end rounded bg-red-600 px-2 py-2"><Trash2 className="mx-auto h-4 w-4" /></button>
              </div>
              <label className="mt-3 block space-y-1 text-xs font-semibold text-white">
                <span>Texto largo del final</span>
                <textarea value={ending.description} onChange={e => updateEnding(index, { description: e.target.value })} placeholder="Escribe aqui el cierre completo como libro-juego. Puede ser largo." className="min-h-32 w-full rounded bg-slate-800 px-3 py-2 text-sm text-white" />
              </label>
            </div>
          ))}
        </AdminList>

        <AdminList title="6. Eventos de dos opciones" icon={<Skull className="h-5 w-5 text-fuchsia-300" />} onAdd={() => setConfig(prev => ({ ...prev, storyEvents: [...prev.storyEvents, { ...blankStoryEvent }] }))}>
          {config.storyEvents.map((event, index) => (
            <div key={index} className="rounded border border-white/10 bg-slate-900 p-4">
              <div className="mb-3 text-sm font-bold text-fuchsia-200">
                Evento {event.key || '(sin clave)'} en nodo {event.sceneKey || '(sin nodo)'} - {event.title || 'Sin titulo'}
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <LabeledInput label="Clave evento" value={event.key} onChange={value => updateStoryEvent(index, { key: value })} placeholder="bruja1" />
                <LabeledSelect label="Nodo" value={event.sceneKey} onChange={value => updateStoryEvent(index, { sceneKey: value })} options={nodeOptions} />
                <LabeledInput label="Titulo" value={event.title} onChange={value => updateStoryEvent(index, { title: value })} placeholder="La bruja del camino" className="md:col-span-2" />
              </div>
              <label className="mt-2 block space-y-1 text-xs font-semibold text-white">
                <span>Texto del evento</span>
                <textarea value={event.prompt} onChange={e => updateStoryEvent(index, { prompt: e.target.value })} className="min-h-20 w-full rounded bg-slate-800 px-3 py-2 text-sm text-white" />
              </label>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <EventOptionEditor title="Opcion A" event={event} prefix="A" onChange={patch => updateStoryEvent(index, patch)} />
                <EventOptionEditor title="Opcion B" event={event} prefix="B" onChange={patch => updateStoryEvent(index, patch)} />
              </div>
              <div className="mt-3 rounded border border-fuchsia-400/25 bg-fuchsia-950/30 p-3">
                <div className="mb-2 text-xs font-bold uppercase tracking-wide text-fuchsia-300">📚 Retroalimentacion al alumno</div>
                <div className="grid gap-2 md:grid-cols-3">
                  <LabeledSelect
                    label="Opcion correcta"
                    value={event.correctOption || ''}
                    onChange={value => updateStoryEvent(index, { correctOption: value as 'A' | 'B' | '' })}
                    options={[
                      { value: '', label: 'Sin respuesta correcta' },
                      { value: 'A', label: 'Opcion A es correcta' },
                      { value: 'B', label: 'Opcion B es correcta' },
                    ]}
                  />
                  <div className="md:col-span-2">
                    <LabeledInput
                      label="Texto explicativo (aparece despues de elegir)"
                      value={event.explanation || ''}
                      onChange={value => updateStoryEvent(index, { explanation: value })}
                      placeholder="La respuesta correcta es A porque los Security Groups son stateful..."
                    />
                  </div>
                </div>
              </div>
              <button onClick={() => setConfig(prev => ({ ...prev, storyEvents: prev.storyEvents.filter((_, i) => i !== index) }))} className="mt-3 inline-flex items-center gap-2 rounded bg-red-600 px-3 py-1.5 text-sm hover:bg-red-700">
                <Trash2 className="h-4 w-4" /> Eliminar evento
              </button>
            </div>
          ))}
        </AdminList>

        {/* -- Banco de pruebas mini-juegos -- */}
        <section className="rounded-xl border border-violet-500/30 bg-slate-900/80 p-5 shadow-lg">
          <h2 className="mb-1 flex items-center gap-2 text-xl font-bold text-violet-200">
            🎮 Banco de pruebas - Mini-juegos
          </h2>
          <p className="mb-4 text-sm text-slate-400">Prueba cada juego 8-bit directamente aquí sin necesidad de configurar una historia.</p>
          <MiniGamesPlayground />
        </section>

        <div className="rounded border border-slate-700 bg-slate-900 p-4 text-sm text-white">
          <div className="mb-1 inline-flex items-center gap-2 font-bold"><Skull className="h-4 w-4 text-rose-300" /> Ejemplo rapido</div>
          <p>Nodo 1: Servidor en la nube. Decision: "Avanzar" hacia 1.1. Nodo 1.1: agrega un objeto, evento de dos opciones o duelo de memoria segun lo que necesite la historia.</p>
        </div>
      </div>
    </div>
  )
}

// -- Mini-games playground ------------------------------------------------------

type PlaygroundGame = 'runner' | 'memory' | 'quiz' | 'snake' | 'minefield' | 'circuit0' | 'circuit1' | 'circuit2' | 'networkcard'

const MOCK_RUNNER_EVENT = {
  key: 'admin-test', sceneKey: 'test',
  title: 'AWS Cloud Runner - PRUEBA',
  prompt: 'Modo de prueba. Esquiva nubes, recoge servicios AWS.',
  targetScore: 300,
  rewardItemName: '', rewardItemType: 'misc', rewardItemPower: 0,
  winText: '¡Prueba superada!', loseText: 'Juego terminado.',
}

const MOCK_MEMORY_EVENT = {
  key: 'admin-test', sceneKey: 'test',
  title: 'Duelo de Memoria - PRUEBA',
  prompt: 'Encuentra los pares de servicios AWS antes de que acabe el tiempo.',
  memoryEnemyName: 'IA Rival',
  memoryTurnSeconds: 15,
  memoryStakeItemName: '',
  memoryRewardItemName: '',
  memoryRewardItemType: 'misc',
  memoryRewardItemPower: 0,
  memoryWinText: '¡Ganaste!',
  memoryLoseText: 'Perdiste.',
}

const MOCK_QUIZ_EVENT = {
  key: 'admin-test', sceneKey: 'test',
  title: 'AWS Quiz - PRUEBA',
  prompt: 'Responde preguntas sobre servicios AWS. 3 vidas, 100 puntos para ganar.',
}

const MOCK_SNAKE_EVENT = {
  key: 'admin-test', sceneKey: 'test',
  title: 'Network Flow Snake - PRUEBA',
  prompt: 'Dirige el paquete de datos y recoge nodos AWS.',
  targetScore: 50,
}

const MOCK_MINEFIELD_EVENT = {
  key: 'admin-test', sceneKey: 'test',
  title: 'Androide Hostil - PRUEBA',
  prompt: 'Encuentra los puntos débiles del androide. Evita las trampas.',
  enemyHP: 60, enemyAttack: 15, brainCount: 6,
  winText: '¡Androide destruido! Prueba superada.', loseText: 'Las trampas te vencieron.',
}

const MOCK_CIRCUIT_EVENT_0 = {
  key: 'admin-test', sceneKey: 'test', levelId: 0,
  title: 'Laboratorio de Circuito N1 - PRUEBA',
  prompt: 'Completa la arquitectura de misiles. Arrastra los componentes a sus posiciones.',
  winText: '¡Infraestructura completada! Los misiles están listos.', loseText: 'El circuito falló. El sistema colapsó.',
}
const MOCK_CIRCUIT_EVENT_1 = {
  key: 'admin-test', sceneKey: 'test', levelId: 1,
  title: 'Laboratorio de Circuito N2 - PRUEBA',
  prompt: 'Construye la red de inteligencia. Coloca los servicios correctos.',
  winText: '¡Red de inteligencia operativa!', loseText: 'La red de inteligencia fue saboteada.',
}
const MOCK_CIRCUIT_EVENT_2 = {
  key: 'admin-test', sceneKey: 'test', levelId: 2,
  title: 'Laboratorio de Circuito N3 - PRUEBA',
  prompt: 'Arma el cuartel general. Despliega la infraestructura defensiva.',
  winText: '¡Cuartel general en línea!', loseText: 'El cuartel fue destruido.',
}

const MOCK_NETWORK_CARD_EVENT = {
  key: 'admin-test', sceneKey: 'test',
  title: 'Duelo de Red AWS - PRUEBA',
  prompt: 'Elige tu carta. 0.0.0.0/0 vence a NACL · NACL vence a Security Group · Security Group vence a 0.0.0.0/0.',
  rounds: 3,
  winText: '¡Dominaste la seguridad de red!',
  loseText: 'La red AWS te superó esta vez.',
}

const GAME_TABS: Array<{ id: PlaygroundGame; label: string; color: string; bg: string; border: string }> = [
  { id: 'runner', label: 'Runner AWS',       color: 'text-orange-300', bg: 'bg-orange-700/80', border: 'border-orange-500/40' },
  { id: 'memory', label: 'Memoria AWS',      color: 'text-cyan-300',   bg: 'bg-cyan-700/80',   border: 'border-cyan-500/40'   },
  { id: 'quiz',   label: 'AWS Quiz',         color: 'text-violet-300', bg: 'bg-violet-700/80', border: 'border-violet-500/40' },
  { id: 'snake',  label: 'Network Snake',    color: 'text-green-300',  bg: 'bg-green-700/80',  border: 'border-green-500/40'  },
  { id: 'minefield', label: 'Buscaminas',       color: 'text-rose-300',   bg: 'bg-rose-700/80',   border: 'border-rose-500/40'   },
  { id: 'circuit0',    label: 'Circuito N1',      color: 'text-emerald-300', bg: 'bg-emerald-700/80',  border: 'border-emerald-500/40'  },
  { id: 'circuit1',    label: 'Circuito N2',      color: 'text-emerald-300', bg: 'bg-emerald-600/80',  border: 'border-emerald-400/40'  },
  { id: 'circuit2',    label: 'Circuito N3',      color: 'text-emerald-200', bg: 'bg-emerald-500/80',  border: 'border-emerald-300/40'  },
  { id: 'networkcard', label: 'Duelo de Red AWS', color: 'text-indigo-300',  bg: 'bg-indigo-700/80',   border: 'border-indigo-500/40'   },
]

function MiniGamesPlayground() {
  const [active, setActive] = useState<PlaygroundGame | null>(null)

  const toggle = (id: PlaygroundGame) => setActive(prev => prev === id ? null : id)

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {GAME_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => toggle(tab.id)}
            className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold shadow transition hover:brightness-110 ${tab.border} ${tab.bg} ${active === tab.id ? 'ring-2 ring-white/30' : ''}`}
          >
            {tab.label}
            {active === tab.id && <span className="ml-1 text-[10px] font-black uppercase text-white/70">▼ abierto</span>}
          </button>
        ))}
      </div>

      {active === 'runner' && (
        <div className="rounded-xl border border-orange-500/30 bg-[#0a0f1e] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-orange-400">🏃 AWS Cloud Runner - Modo Prueba</span>
            <button onClick={() => setActive(null)} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600">Cerrar</button>
          </div>
          <RunnerGame event={MOCK_RUNNER_EVENT} onFinish={() => {}} inventory={[]} />
        </div>
      )}

      {active === 'memory' && (
        <div className="rounded-xl border border-cyan-500/30 bg-[#0a0f1e] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-cyan-400">🧠 Duelo de Memoria - Modo Prueba</span>
            <button onClick={() => setActive(null)} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600">Cerrar</button>
          </div>
          <MemoryDuelBoard event={MOCK_MEMORY_EVENT} inventory={[]} onFinish={() => {}} />
        </div>
      )}

      {active === 'quiz' && (
        <div className="rounded-xl border border-violet-500/30 bg-[#0a0f1e] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-violet-400">⚡ AWS Quiz - Modo Prueba</span>
            <button onClick={() => setActive(null)} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600">Cerrar</button>
          </div>
          <TechQuizGame event={MOCK_QUIZ_EVENT} onFinish={() => {}} />
        </div>
      )}

      {active === 'snake' && (
        <div className="rounded-xl border border-green-500/30 bg-[#0a0f1e] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-green-400">&#x1F40D; Network Flow Snake - Modo Prueba</span>
            <button onClick={() => setActive(null)} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600">Cerrar</button>
          </div>
          <TechSnakeGame event={MOCK_SNAKE_EVENT} onFinish={() => {}} />
        </div>
      )}

      {active === 'minefield' && (
        <div className="rounded-xl border border-rose-500/30 bg-[#120808] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-rose-400">💣 Buscaminas - Modo Prueba</span>
            <button onClick={() => setActive(null)} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600">Cerrar</button>
          </div>
          <MinefieldGame event={MOCK_MINEFIELD_EVENT} playerAttack={10} playerHealth={100} playerMaxHealth={100} onFinish={() => setActive(null)} onDamagePlayer={() => {}} />
        </div>
      )}

      {active === 'circuit0' && (
        <div className="rounded-xl border border-emerald-500/30 bg-[#001a0a] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">🔌 Circuito N1 - Modo Prueba</span>
            <button onClick={() => setActive(null)} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600">Cerrar</button>
          </div>
          <CircuitPuzzleGame event={MOCK_CIRCUIT_EVENT_0} playerHealth={100} playerMaxHealth={100} onFinish={() => setActive(null)} onDamagePlayer={() => {}} />
        </div>
      )}

      {active === 'circuit1' && (
        <div className="rounded-xl border border-emerald-500/30 bg-[#001a0a] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">🔌 Circuito N2 - Modo Prueba</span>
            <button onClick={() => setActive(null)} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600">Cerrar</button>
          </div>
          <CircuitPuzzleGame event={MOCK_CIRCUIT_EVENT_1} playerHealth={100} playerMaxHealth={100} onFinish={() => setActive(null)} onDamagePlayer={() => {}} />
        </div>
      )}

      {active === 'circuit2' && (
        <div className="rounded-xl border border-emerald-500/30 bg-[#001a0a] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">🔌 Circuito N3 - Modo Prueba</span>
            <button onClick={() => setActive(null)} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600">Cerrar</button>
          </div>
          <CircuitPuzzleGame event={MOCK_CIRCUIT_EVENT_2} playerHealth={100} playerMaxHealth={100} onFinish={() => setActive(null)} onDamagePlayer={() => {}} />
        </div>
      )}

      {active === 'networkcard' && (
        <div className="rounded-xl border border-indigo-500/30 bg-[#080c1a] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-400">🃏 Duelo de Red AWS - Modo Prueba</span>
            <button onClick={() => setActive(null)} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600">Cerrar</button>
          </div>
          <NetworkCardGame event={MOCK_NETWORK_CARD_EVENT} onFinish={() => setActive(null)} />
        </div>
      )}
    </div>
  )
}

function AdminList({ title, icon, onAdd, children }: { title: string; icon: React.ReactNode; onAdd?: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-xl font-bold text-white">{icon} {title}</h2>
        {onAdd && (
          <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-600/80 px-3 py-2 text-sm font-semibold shadow transition hover:bg-blue-600">
            <Plus className="h-4 w-4" /> Agregar
          </button>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function EventOptionEditor({ title, event, prefix, onChange }: { title: string; event: StoryChoiceEventConfig; prefix: 'A' | 'B'; onChange: (patch: Partial<StoryChoiceEventConfig>) => void }) {
  const labelKey = prefix === 'A' ? 'optionALabel' : 'optionBLabel'
  const effectKey = prefix === 'A' ? 'optionAEffect' : 'optionBEffect'
  const itemNameKey = prefix === 'A' ? 'optionAItemName' : 'optionBItemName'
  const itemTypeKey = prefix === 'A' ? 'optionAItemType' : 'optionBItemType'
  const itemPowerKey = prefix === 'A' ? 'optionAItemPower' : 'optionBItemPower'
  const textKey = prefix === 'A' ? 'optionAText' : 'optionBText'
  const effect = event[effectKey]

  return (
    <div className="rounded border border-white/10 bg-slate-950/50 p-3">
      <div className="mb-2 font-semibold text-white">{title}</div>
      <div className="grid gap-2">
        <LabeledInput label="Texto boton" value={String(event[labelKey])} onChange={value => onChange({ [labelKey]: value } as Partial<StoryChoiceEventConfig>)} />
        <LabeledSelect label="Efecto" value={String(effect)} onChange={value => onChange({ [effectKey]: value as EventEffect } as Partial<StoryChoiceEventConfig>)} options={eventEffectOptions} />
        {effect === 'reward_item' && (
          <div className="grid gap-2 md:grid-cols-3">
            <LabeledInput label="Objeto premio" value={String(event[itemNameKey])} onChange={value => onChange({ [itemNameKey]: value } as Partial<StoryChoiceEventConfig>)} placeholder="Pistola de plasma" />
            <LabeledSelect label="Tipo" value={String(event[itemTypeKey])} onChange={value => onChange({ [itemTypeKey]: value } as Partial<StoryChoiceEventConfig>)} options={[
              ...EQUIP_VISUAL_OPTIONS,
              { value: 'potion', label: 'Pocion' },
            ]} />
            <LabeledNumber label="Poder" value={Number(event[itemPowerKey]) || 0} onChange={value => onChange({ [itemPowerKey]: value } as Partial<StoryChoiceEventConfig>)} />
          </div>
        )}
        <LabeledInput label="Texto resultado" value={String(event[textKey])} onChange={value => onChange({ [textKey]: value } as Partial<StoryChoiceEventConfig>)} placeholder="Texto que aparece al elegir esta opcion" />
      </div>
    </div>
  )
}

function FlowDiagram({
  config,
  selectedSceneKey,
  onSelectScene,
  onAddDecision,
  onAddMemory,
  onAddItem,
  onDropNode,
  onDropDecision,
  onMoveScene,
  onDeleteScene,
  onConnectScenes,
  onDeleteDecision,
  onDeleteMemory,
  onDeleteItem,
  onAutoArrange,
}: {
  config: StoryConfig
  selectedSceneKey: string
  onSelectScene: (sceneKey: string) => void
  onAddDecision: (sceneKey: string) => void
  onAddMemory: (sceneKey: string) => void
  onAddItem: (sceneKey: string) => void
  onDropNode: (x: number, y: number, flowPage?: number) => void
  onDropDecision: (sceneKey: string) => void
  onMoveScene: (sceneKey: string, flowX: number, flowY: number, flowPage?: number) => void
  onDeleteScene: (sceneKey: string) => void
  onConnectScenes: (fromKey: string, toKey: string) => void
  onDeleteDecision: (index: number) => void
  onDeleteMemory: (index: number) => void
  onDeleteItem: (index: number) => void
  onAutoArrange: () => void
}) {
  const [dragOverScene, setDragOverScene] = useState('')
  const [connectFrom, setConnectFrom] = useState('')
  const [pendingConnectFrom, setPendingConnectFrom] = useState('')
  const [flowPage, setFlowPage] = useState(1)
  const [editingPageKey, setEditingPageKey] = useState('')
  const [editingPageValue, setEditingPageValue] = useState('')
  const pageCount = Math.max(1, ...config.scenes.map(scene => scene.flowPage || 1))
  const visibleScenes = config.scenes.filter(scene => (scene.flowPage || 1) === flowPage)
  const nodeWidth = 156
  const nodeHeight = 92
  const width = 1900
  const height = 1100
  const xScale = (width - nodeWidth - 70) / 100
  const yScale = (height - nodeHeight - 70) / 100
  const layout = useMemo(() => visibleScenes.map((scene, index) => ({
    scene,
    x: 35 + clampFlow(Number.isFinite(Number(scene.flowX)) ? Number(scene.flowX) : 8 + (index % 5) * 18) * xScale,
    y: 35 + clampFlow(Number.isFinite(Number(scene.flowY)) ? Number(scene.flowY) : 12 + Math.floor(index / 5) * 18) * yScale,
  })), [visibleScenes, xScale, yScale])

  const byKey = new Map(layout.map(node => [node.scene.key, node]))

  const handlePaletteDrag = (event: React.DragEvent<HTMLButtonElement>, type: string) => {
    event.dataTransfer.setData('application/rpg-flow', type)
    event.dataTransfer.effectAllowed = 'copy'
  }

  const readDropType = (event: React.DragEvent) => event.dataTransfer.getData('application/rpg-flow')

  const handleCanvasDrop = (event: React.DragEvent<HTMLDivElement>) => {
    const type = readDropType(event)
    const sceneKey = event.dataTransfer.getData('application/rpg-scene')
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.min(100, Math.max(0, ((event.clientX - bounds.left) / bounds.width) * 100))
    const y = Math.min(100, Math.max(0, ((event.clientY - bounds.top) / bounds.height) * 100))
    if (sceneKey) {
      onMoveScene(sceneKey, Math.round(x), Math.round(y), flowPage)
      return
    }
    if (type === 'node') onDropNode(Math.round(x), Math.round(y), flowPage)
  }

  const moveSceneWithPointer = (sceneKey: string, event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button,input,select,textarea')) return
    event.preventDefault()
    event.stopPropagation()
    const canvas = event.currentTarget.parentElement
    if (!canvas) return
    const bounds = canvas.getBoundingClientRect()
    const nodeBounds = event.currentTarget.getBoundingClientRect()
    const offsetX = event.clientX - nodeBounds.left
    const offsetY = event.clientY - nodeBounds.top
    const pointerId = event.pointerId
    const handleMove = (moveEvent: PointerEvent) => {
      const x = Math.min(100, Math.max(0, ((moveEvent.clientX - bounds.left - offsetX) / Math.max(1, bounds.width - nodeWidth)) * 100))
      const y = Math.min(100, Math.max(0, ((moveEvent.clientY - bounds.top - offsetY) / Math.max(1, bounds.height - nodeHeight)) * 100))
      onMoveScene(sceneKey, Math.round(x), Math.round(y), flowPage)
    }
    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    event.currentTarget.setPointerCapture?.(pointerId)
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  const handleSceneDrop = (event: React.DragEvent<HTMLDivElement>, sceneKey: string) => {
    event.preventDefault()
    event.stopPropagation()
    const type = readDropType(event)
    setDragOverScene('')
    if (type === 'decision') onDropDecision(sceneKey)
    if (type === 'memory') onAddMemory(sceneKey)
    if (type === 'item') onAddItem(sceneKey)
  }

  return (
    <section className="rounded-lg border border-slate-700 bg-slate-800 p-5">
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="inline-flex items-center gap-2 text-xl font-bold"><GitBranch className="h-5 w-5 text-cyan-300" /> Diagrama de flujo</h2>
          <p className="text-sm text-white">Construye aqui la estructura. Abajo solo bajas a completar textos, valores y detalles faltantes.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-white">
          <span className="rounded bg-sky-700 px-2 py-1">Decision</span>
          <span className="rounded bg-cyan-700 px-2 py-1">Memoria</span>
          <span className="rounded bg-amber-700 px-2 py-1">Objeto</span>
          <span className="rounded bg-emerald-700 px-2 py-1">Final</span>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 rounded border border-white/10 bg-slate-900 p-3 text-sm text-white">
        <button onClick={() => onDropNode(10, 14, flowPage)} className="rounded bg-cyan-600 px-3 py-2 font-semibold hover:bg-cyan-700">
          Agregar nodo
        </button>
        <button draggable onDragStart={event => handlePaletteDrag(event, 'node')} className="rounded bg-cyan-700 px-3 py-2 font-semibold hover:bg-cyan-800">
          Arrastrar nodo
        </button>
        <button draggable onDragStart={event => handlePaletteDrag(event, 'decision')} className="rounded bg-sky-700 px-3 py-2 font-semibold hover:bg-sky-800">
          Arrastrar decision
        </button>
        <button draggable onDragStart={event => handlePaletteDrag(event, 'memory')} className="rounded bg-cyan-700 px-3 py-2 font-semibold hover:bg-cyan-800">
          Arrastrar memoria
        </button>
        <button draggable onDragStart={event => handlePaletteDrag(event, 'item')} className="rounded bg-amber-700 px-3 py-2 font-semibold hover:bg-amber-800">
          Arrastrar objeto
        </button>
        <button onClick={onAutoArrange} className="rounded bg-slate-700 px-3 py-2 font-semibold hover:bg-slate-600">
          Ordenar cuadros
        </button>
        {pendingConnectFrom && (
          <div className="flex items-center gap-2 rounded border border-cyan-400/40 bg-cyan-950/60 px-3 py-2 text-xs">
            <span>Conectando desde {pendingConnectFrom}. Ve a otra pagina y haz clic en el nodo destino.</span>
            <button onClick={() => setPendingConnectFrom('')} className="rounded bg-red-700 px-2 py-1 hover:bg-red-800">Cancelar</button>
          </div>
        )}
        <div className="ml-auto flex items-center gap-2 rounded bg-slate-800 px-2 py-1 text-xs">
          <button onClick={() => setFlowPage(page => Math.max(1, page - 1))} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">‹</button>
          <span>Pag. {flowPage} / {pageCount}</span>
          <button onClick={() => setFlowPage(page => Math.min(pageCount + 1, page + 1))} className="rounded bg-slate-700 px-2 py-1 hover:bg-slate-600">›</button>
          <button onClick={() => setFlowPage(pageCount + 1)} className="rounded bg-cyan-700 px-2 py-1 hover:bg-cyan-800">Nueva pag.</button>
        </div>
        <span className="basis-full self-center text-xs text-white">Mueve nodos arrastrando el cuadro. Crea flechas arrastrando el circulo → de un nodo hacia otro. Suelta nodo en el fondo; objeto encima de un nodo.</span>
      </div>

      {config.scenes.length === 0 && (
        <div className="rounded border border-white/10 bg-slate-900 p-4 text-sm text-white">
          Arrastra "nodo" al lienzo para empezar o carga el ejemplo de 5 nodos.
        </div>
      )}

        <div className="overflow-auto rounded border border-white/10 bg-slate-950 p-4">
          <div
            className="relative cursor-crosshair"
            style={{
              width,
              height,
              backgroundImage: 'linear-gradient(rgba(148,163,184,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.14) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
              backgroundPosition: '0 0',
            }}
            onDragOver={event => {
              if (readDropType(event) === 'node' || event.dataTransfer.types.includes('application/rpg-scene')) event.preventDefault()
            }}
            onDrop={handleCanvasDrop}
          >
            <svg className="absolute inset-0 h-full w-full" width={width} height={height}>
              <defs>
                <marker id="flow-arrow" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                  <path d="M0,0 L0,6 L9,3 z" fill="#38bdf8" />
                </marker>
              </defs>
              {config.decisions.map((decision, index) => {
                const from = byKey.get(decision.sceneKey)
                const to = byKey.get(decision.nextSceneKey)
                if (!from && !to) return null

                // Offset multiple arrows from the same source node so they don't overlap
                const outgoingFromSame = config.decisions.filter(d => d.sceneKey === decision.sceneKey)
                const slotInGroup = outgoingFromSame.findIndex(d => d === decision)
                const groupSize = outgoingFromSame.length
                const offsetStep = groupSize > 1 ? (nodeHeight * 0.55) / (groupSize - 1) : 0
                const yOffset = groupSize > 1 ? -((nodeHeight * 0.55) / 2) + slotInGroup * offsetStep : 0

                if (from && !to) {
                  const target = config.scenes.find(scene => scene.key === decision.nextSceneKey)
                  if (!target) return null
                  const startX = from.x + nodeWidth
                  const startY = from.y + nodeHeight / 2 + yOffset
                  const endX = width - 80
                  const endY = startY
                  return (
                    <g key={`${decision.sceneKey}-${decision.nextSceneKey}-${index}`}>
                      <path d={`M ${startX} ${startY} C ${startX + 120} ${startY}, ${endX - 120} ${endY}, ${endX} ${endY}`} fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 6" markerEnd="url(#flow-arrow)" />
                      <text x={endX - 90} y={endY - 10} fill="#e0f2fe" fontSize="12" textAnchor="middle">
                        Pag. {target.flowPage || 1}: {decision.label || 'decision'}
                      </text>
                      <foreignObject x={endX - 20} y={endY + 8} width="72" height="24">
                        <button onClick={() => setFlowPage(target.flowPage || 1)} className="rounded bg-cyan-700 px-2 py-1 text-[10px] font-bold text-white hover:bg-cyan-800">Ir →</button>
                      </foreignObject>
                    </g>
                  )
                }
                if (!from && to) {
                  const source = config.scenes.find(scene => scene.key === decision.sceneKey)
                  if (!source) return null
                  const endX = to.x
                  const endY = to.y + nodeHeight / 2
                  return (
                    <g key={`${decision.sceneKey}-${decision.nextSceneKey}-${index}`}>
                      <path d={`M 80 ${endY} C 180 ${endY}, ${endX - 120} ${endY}, ${endX} ${endY}`} fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="6 6" markerEnd="url(#flow-arrow)" />
                      <text x="120" y={endY - 10} fill="#e0f2fe" fontSize="12" textAnchor="middle">
                        Desde pag. {source.flowPage || 1}
                      </text>
                    </g>
                  )
                }
                const startX = from.x + nodeWidth
                const startY = from.y + nodeHeight / 2 + yOffset
                const endX = to.x
                const endY = to.y + nodeHeight / 2
                const midX = startX + Math.max(60, (endX - startX) / 2)
                // Color based on option slot: 1=sky, 2=violet, 3=amber, 4=emerald
                const arrowColors = ['#38bdf8', '#a78bfa', '#fbbf24', '#34d399']
                const arrowColor = arrowColors[slotInGroup % 4]
                return (
                  <g key={`${decision.sceneKey}-${decision.nextSceneKey}-${index}`}>
                    <path
                      d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                      fill="none"
                      stroke={arrowColor}
                      strokeWidth="2"
                      markerEnd="url(#flow-arrow)"
                    />
                    <text x={(startX + endX) / 2} y={(startY + endY) / 2 - 8} fill={arrowColor} fontSize="11" textAnchor="middle" fontWeight="600">
                      {slotInGroup + 1}. {decision.label || 'decisión'}
                    </text>
                    <foreignObject x={(startX + endX) / 2 - 12} y={(startY + endY) / 2 + 4} width="24" height="24">
                      <button
                        onClick={() => onDeleteDecision(index)}
                        className="h-5 w-5 rounded bg-red-600 text-[10px] font-bold text-white hover:bg-red-700"
                        title="Eliminar flecha"
                      >
                        X
                      </button>
                    </foreignObject>
                  </g>
                )
              })}
            </svg>

            {layout.map(({ scene, x, y }) => {
              const memories = config.memoryEvents.filter(event => event.sceneKey === scene.key)
              const items = config.nodeItems.filter(item => item.sceneKey === scene.key)
              const endings = config.endings.filter(ending => ending.sceneKey === scene.key)
              const outgoing = config.decisions.filter(decision => decision.sceneKey === scene.key)
              const selected = selectedSceneKey === scene.key

              return (
                <div
                  key={scene.key}
                  className={`absolute cursor-move rounded border p-2 text-white shadow-lg ${selected || dragOverScene === scene.key ? 'border-cyan-300 bg-slate-700' : 'border-white/10 bg-slate-900'}`}
                  style={{ left: x, top: y, width: nodeWidth, touchAction: 'none' }}
                  onPointerDown={event => moveSceneWithPointer(scene.key, event)}
                  onClick={event => {
                    if ((event.target as HTMLElement).closest('button')) return
                    if (pendingConnectFrom) {
                      onConnectScenes(pendingConnectFrom, scene.key)
                      setPendingConnectFrom('')
                      return
                    }
                    onSelectScene(scene.key)
                  }}
                  onDragOver={event => {
                    const type = readDropType(event)
                    if (connectFrom || pendingConnectFrom || type === 'decision' || type === 'memory' || type === 'item') {
                      event.preventDefault()
                      event.stopPropagation()
                      setDragOverScene(scene.key)
                    }
                  }}
                  onDragLeave={() => setDragOverScene('')}
                  onDrop={event => {
                    if (connectFrom || pendingConnectFrom) {
                      event.preventDefault()
                      event.stopPropagation()
                      onConnectScenes(connectFrom || pendingConnectFrom, scene.key)
                      setConnectFrom('')
                      setPendingConnectFrom('')
                      setDragOverScene('')
                      return
                    }
                    handleSceneDrop(event, scene.key)
                  }}
                >
                  <div className="block w-full text-left">
                    <div className="text-xs uppercase text-cyan-200">Nodo {scene.key}</div>
                    <div className="truncate text-xs font-bold">{scene.title || 'Sin titulo'}</div>
                  </div>
                  <button
                    onClick={() => onDeleteScene(scene.key)}
                    className="absolute right-2 top-2 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold hover:bg-red-700"
                    title="Eliminar nodo"
                  >
                    X
                  </button>
                  <button
                    draggable
                    onDragStart={event => {
                      event.stopPropagation()
                      setConnectFrom(scene.key)
                      setPendingConnectFrom(scene.key)
                      event.dataTransfer.setData('application/rpg-connect', scene.key)
                      event.dataTransfer.effectAllowed = 'link'
                    }}
                    onDragEnd={() => setConnectFrom('')}
                    className="absolute -right-3 top-10 flex h-6 w-6 items-center justify-center rounded-full border border-cyan-200 bg-cyan-700 text-xs font-bold hover:bg-cyan-800"
                    title="Arrastra para crear flecha"
                  >
                    →
                  </button>
                  <button
                    onClick={() => setPendingConnectFrom(scene.key)}
                    className="absolute -right-3 top-[68px] flex h-6 w-6 items-center justify-center rounded-full border border-sky-200 bg-sky-800 text-[10px] font-bold hover:bg-sky-900"
                    title="Conectar con nodo de otra pagina"
                  >
                    Pg
                  </button>
                  <div className="mt-1.5 flex flex-wrap gap-1 text-[10px]">
                    {editingPageKey === scene.key ? (
                      <input
                        autoFocus
                        type="number"
                        min="1"
                        value={editingPageValue}
                        onChange={e => setEditingPageValue(e.target.value)}
                        onBlur={() => {
                          const page = Math.max(1, parseInt(editingPageValue) || 1)
                          onMoveScene(scene.key, scene.flowX, scene.flowY, page)
                          setFlowPage(page)
                          setEditingPageKey('')
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            const page = Math.max(1, parseInt(editingPageValue) || 1)
                            onMoveScene(scene.key, scene.flowX, scene.flowY, page)
                            setFlowPage(page)
                            setEditingPageKey('')
                          }
                          if (e.key === 'Escape') setEditingPageKey('')
                        }}
                        onClick={e => e.stopPropagation()}
                        onPointerDown={e => e.stopPropagation()}
                        className="w-12 rounded bg-slate-500 px-1 text-center text-[10px] font-bold text-white outline-none ring-1 ring-cyan-400"
                      />
                    ) : (
                      <span
                        className="cursor-pointer rounded bg-slate-600 px-1.5 py-0.5 font-bold hover:bg-cyan-700"
                        title="Clic para mover a otra página"
                        onClick={e => { e.stopPropagation(); setEditingPageKey(scene.key); setEditingPageValue(String(scene.flowPage || 1)) }}
                        onPointerDown={e => e.stopPropagation()}
                      >
                        Pg.{scene.flowPage || 1}
                      </span>
                    )}
                    <span className="rounded bg-sky-700 px-1.5 py-0.5">{outgoing.length} dec.</span>
                    {memories.length > 0 && <span className="rounded bg-cyan-700 px-1.5 py-0.5">{memories.length} mem.</span>}
                    {items.length > 0 && <span className="rounded bg-amber-700 px-1.5 py-0.5">{items.length} obj.</span>}
                    {(scene.isEnding || endings.length > 0) && <span className="rounded bg-emerald-700 px-1.5 py-0.5">final</span>}
                  </div>
                  {(memories.length > 0 || items.length > 0) && (
                    <div className="mt-1.5 space-y-1 text-[10px]">
                      {config.memoryEvents.map((event, memoryIndex) => event.sceneKey === scene.key ? (
                        <div key={`memory-${memoryIndex}`} className="flex items-center justify-between rounded bg-cyan-950/80 px-2 py-1">
                          <span className="truncate">{event.title || event.key}</span>
                          <button onClick={() => onDeleteMemory(memoryIndex)} className="ml-1 font-bold text-cyan-200">x</button>
                        </div>
                      ) : null)}
                      {config.nodeItems.map((item, itemIndex) => item.sceneKey === scene.key ? (
                        <div key={`item-${itemIndex}`} className="flex items-center justify-between rounded bg-amber-950/80 px-2 py-1">
                          <span className="truncate">{item.name}</span>
                          <button onClick={() => onDeleteItem(itemIndex)} className="ml-1 font-bold text-amber-200">x</button>
                        </div>
                      ) : null)}
                    </div>
                  )}
                  <div className="mt-2 grid grid-cols-3 gap-1">
                    <button onClick={() => onAddDecision(scene.key)} className="rounded bg-sky-700 px-1 py-0.5 text-[10px] hover:bg-sky-800">Dec.</button>
                    <button onClick={() => onAddMemory(scene.key)} className="rounded bg-cyan-700 px-1 py-0.5 text-[10px] hover:bg-cyan-800">Mem.</button>
                    <button onClick={() => onAddItem(scene.key)} className="rounded bg-amber-700 px-1 py-0.5 text-[10px] hover:bg-amber-800">Obj.</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
    </section>
  )
}

function LabeledInput({ label, value, onChange, placeholder, className = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; className?: string }) {
  return (
    <label className={`space-y-1 text-xs font-semibold text-slate-300 ${className}`}>
      <span>{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder-slate-500 transition focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
      />
    </label>
  )
}

function LabeledMediaInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (value: string, type?: string) => void; placeholder?: string }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const readFile = async (file?: File) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const uploaded = await uploadStoryAsset(file)
      const mediaType = file.type.startsWith('video/') ? 'video' : 'image'
      onChange(uploaded.url, uploaded.type === 'video' ? 'video' : mediaType)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <label className="space-y-1 text-xs font-semibold text-white">
      <span>{label}</span>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded bg-slate-800 px-3 py-2 text-sm text-white" />
        <span className="relative inline-flex cursor-pointer items-center justify-center rounded bg-cyan-700 px-3 py-2 text-sm font-semibold hover:bg-cyan-800">
          {uploading ? 'Subiendo...' : 'Buscar'}
          <input
            type="file"
            accept="image/*,video/*"
            onChange={event => readFile(event.target.files?.[0])}
            className="absolute inset-0 cursor-pointer opacity-0"
            disabled={uploading}
          />
        </span>
        <button type="button" onClick={() => onChange('', '')} className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-600">
          Limpiar
        </button>
      </div>
      {value.includes('/uploads/story/') && <span className="block text-[11px] font-normal text-cyan-100">Archivo guardado en el backend.</span>}
      {value.startsWith('data:') && <span className="block text-[11px] font-normal text-amber-100">Pendiente de migrar al backend al guardar.</span>}
      {error && <span className="block text-[11px] font-normal text-rose-200">{error}</span>}
    </label>
  )
}

function LabeledFileInput({
  label,
  value,
  onChange,
  placeholder,
  accept,
  buttonText = 'Buscar',
  loadedText = 'Archivo cargado desde este PC.',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  accept: string
  buttonText?: string
  loadedText?: string
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const readFile = async (file?: File) => {
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const uploaded = await uploadStoryAsset(file)
      onChange(uploaded.url)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'No se pudo subir el archivo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <label className="space-y-1 text-xs font-semibold text-white">
      <span>{label}</span>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded bg-slate-800 px-3 py-2 text-sm text-white" />
        <span className="relative inline-flex cursor-pointer items-center justify-center rounded bg-cyan-700 px-3 py-2 text-sm font-semibold hover:bg-cyan-800">
          {uploading ? 'Subiendo...' : buttonText}
          <input
            type="file"
            accept={accept}
            onChange={event => readFile(event.target.files?.[0])}
            className="absolute inset-0 cursor-pointer opacity-0"
            disabled={uploading}
          />
        </span>
        <button type="button" onClick={() => onChange('')} className="rounded bg-slate-700 px-3 py-2 text-sm font-semibold hover:bg-slate-600">
          Limpiar
        </button>
      </div>
      {value.includes('/uploads/story/') && <span className="block text-[11px] font-normal text-cyan-100">Archivo guardado en el backend.</span>}
      {value.startsWith('data:') && <span className="block text-[11px] font-normal text-amber-100">{loadedText} Se migrara al backend al guardar.</span>}
      {error && <span className="block text-[11px] font-normal text-rose-200">{error}</span>}
    </label>
  )
}

function LabeledNumber({ label, value, onChange, icon }: { label: string; value: number; onChange: (value: number) => void; icon?: React.ReactNode }) {
  return (
    <label className="space-y-1 text-xs font-semibold text-slate-300">
      <span className="inline-flex items-center gap-1">{icon}{label}</span>
      <input
        type="number"
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white transition focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
      />
    </label>
  )
}

function LabeledSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: SelectOption[] }) {
  return (
    <label className="space-y-1 text-xs font-semibold text-slate-300">
      <span>{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white transition focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
      >
        <option value="">Seleccionar</option>
        {options.map((option, index) => (
          <option key={option.key || `${index}-${option.value}-${option.label}`} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

// -----------------------------------------------------------------------------
// LabeledLocationSelect
// Replaces the raw mapX/mapY number inputs with a dropdown of named locations.
// -----------------------------------------------------------------------------
function LabeledLocationSelect({
  label,
  mapLocations,
  mapX,
  mapY,
  onChange,
  className = '',
}: {
  label: string
  mapLocations: MapLocationConfig[]
  mapX: number
  mapY: number
  onChange: (x: number, y: number) => void
  className?: string
}) {
  // Find which location key matches current coords (within 1%)
  const currentKey = mapLocations.find(
    loc => Math.abs(loc.x - mapX) < 1 && Math.abs(loc.y - mapY) < 1
  )?.key || ''

  const handleChange = (key: string) => {
    const loc = mapLocations.find(l => l.key === key)
    if (loc) onChange(loc.x, loc.y)
  }

  return (
    <label className={`space-y-1 text-xs font-semibold text-slate-300 ${className}`}>
      <span className="inline-flex items-center gap-1">
        <MapPin className="h-3 w-3 text-red-400" />
        {label}
      </span>
      {mapLocations.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-950/30 px-3 py-2 text-xs text-amber-300">
          ⚠️ Sin ubicaciones definidas. Ve a <strong>Configuración de Mapa</strong> para crearlas.
        </div>
      ) : (
        <select
          value={currentKey}
          onChange={e => handleChange(e.target.value)}
          className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white transition focus:border-cyan-500/60 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
        >
          <option value="">- Sin ubicación -</option>
          {mapLocations.map(loc => (
            <option key={loc.key} value={loc.key}>
              {loc.icon} {loc.name}
            </option>
          ))}
        </select>
      )}
      {currentKey && (
        <span className="block text-[10px] text-slate-500">
          coords: {mapX.toFixed(1)}% / {mapY.toFixed(1)}%
        </span>
      )}
    </label>
  )
}

// -----------------------------------------------------------------------------
// MapLocationEditor
// Full visual editor: shows the map image, lets the admin click to place pins,
// name them, pick an icon, and delete them.
// -----------------------------------------------------------------------------
import mapImageForAdmin from '../assets/mapa tecnologico.jpg'

const ICON_OPTIONS = ['📍', '⚔️', '🏰', '🌲', '💀', '🏠', '🗝️', '🌊', '🔥', '⛰️', '🕌', '🎭', '🧙', '🐉', '💎', '🚪']

function MapLocationEditor({
  locations,
  onChange,
}: {
  locations: MapLocationConfig[]
  onChange: (locations: MapLocationConfig[]) => void
}) {
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('📍')
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const imgRef = React.useRef<HTMLDivElement>(null)

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editingKey) return // don't place while editing
    const rect = e.currentTarget.getBoundingClientRect()
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100)
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100)
    setPendingPin({ x, y })
    setNewName('')
    setNewIcon('📍')
  }

  const confirmPin = () => {
    if (!pendingPin || !newName.trim()) return
    const key = `loc_${Date.now()}`
    onChange([...locations, { key, name: newName.trim(), x: pendingPin.x, y: pendingPin.y, icon: newIcon }])
    setPendingPin(null)
    setNewName('')
  }

  const cancelPin = () => {
    setPendingPin(null)
    setNewName('')
  }

  const deleteLocation = (key: string) => {
    onChange(locations.filter(l => l.key !== key))
    if (editingKey === key) setEditingKey(null)
  }

  const updateLocation = (key: string, patch: Partial<MapLocationConfig>) => {
    onChange(locations.map(l => l.key === key ? { ...l, ...patch } : l))
  }

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="flex items-start gap-2 rounded-lg border border-cyan-500/20 bg-cyan-950/30 px-4 py-3 text-sm text-cyan-200">
        <span className="mt-0.5 shrink-0">💡</span>
        <span>Haz clic en cualquier punto del mapa para colocar una ubicación. Luego ponle nombre e ícono y confirma.</span>
      </div>

      {/* Map with pins */}
      <div
        ref={imgRef}
        className="relative cursor-crosshair overflow-hidden rounded-xl border-2 border-[#6b371d] shadow-[0_6px_24px_rgba(0,0,0,0.5)]"
        onClick={handleMapClick}
      >
        <img
          src={mapImageForAdmin}
          alt="Mapa"
          className="block w-full select-none"
          draggable={false}
        />

        {/* Existing pins */}
        {locations.map(loc => (
          <div
            key={loc.key}
            className="absolute z-10 -translate-x-1/2 -translate-y-full"
            style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
            onClick={e => { e.stopPropagation(); setEditingKey(editingKey === loc.key ? null : loc.key) }}
          >
            {/* Pin */}
            <div className={`flex flex-col items-center cursor-pointer group`}>
              <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-base shadow-lg transition ${editingKey === loc.key ? 'border-cyan-300 bg-cyan-900 scale-125' : 'border-white/70 bg-[#2d160d] hover:scale-110'}`}>
                {loc.icon}
              </div>
              <div className="mt-0.5 max-w-[80px] truncate rounded border border-black/40 bg-[#2d160d]/90 px-1.5 py-0.5 text-center text-[10px] font-bold text-[#ffd99a] shadow">
                {loc.name}
              </div>
              {/* Needle */}
              <div className="h-2 w-0.5 bg-[#ffd99a]/60" />
            </div>
          </div>
        ))}

        {/* Pending pin preview */}
        {pendingPin && (
          <div
            className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full"
            style={{ left: `${pendingPin.x}%`, top: `${pendingPin.y}%` }}
          >
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 animate-bounce items-center justify-center rounded-full border-2 border-yellow-300 bg-yellow-700 text-base shadow-lg">
                {newIcon}
              </div>
              <div className="h-2 w-0.5 bg-yellow-300/60" />
            </div>
          </div>
        )}

        {/* Vignette */}
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.4)]" />
      </div>

      {/* New pin form */}
      {pendingPin && (
        <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/40 p-4 shadow">
          <div className="mb-3 text-sm font-bold text-yellow-200">
            📌 Nueva ubicación en {pendingPin.x}% / {pendingPin.y}%
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') confirmPin(); if (e.key === 'Escape') cancelPin() }}
              placeholder="Nombre de la ubicación (ej: Aldea del Norte)"
              className="rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-yellow-400/60 focus:outline-none"
            />
            <select
              value={newIcon}
              onChange={e => setNewIcon(e.target.value)}
              className="rounded-lg border border-slate-600/60 bg-slate-950/70 px-2 py-2 text-sm text-white focus:outline-none"
            >
              {ICON_OPTIONS.map(icon => (
                <option key={icon} value={icon}>{icon}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={confirmPin}
                disabled={!newName.trim()}
                className="rounded-lg border border-emerald-500/40 bg-emerald-600/80 px-4 py-2 text-sm font-bold text-white shadow transition hover:bg-emerald-600 disabled:opacity-40"
              >
                ✓ Confirmar
              </button>
              <button
                onClick={cancelPin}
                className="rounded-lg border border-slate-500/40 bg-slate-700/80 px-3 py-2 text-sm font-bold text-white shadow transition hover:bg-slate-700"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit existing pin */}
      {editingKey && (() => {
        const loc = locations.find(l => l.key === editingKey)
        if (!loc) return null
        return (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-4 shadow">
            <div className="mb-3 text-sm font-bold text-cyan-200">
              ✏️ Editando: {loc.icon} {loc.name}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
              <input
                value={loc.name}
                onChange={e => updateLocation(loc.key, { name: e.target.value })}
                className="rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
              />
              <select
                value={loc.icon}
                onChange={e => updateLocation(loc.key, { icon: e.target.value })}
                className="rounded-lg border border-slate-600/60 bg-slate-950/70 px-2 py-2 text-sm text-white focus:outline-none"
              >
                {ICON_OPTIONS.map(icon => (
                  <option key={icon} value={icon}>{icon}</option>
                ))}
              </select>
              <div className="text-xs text-slate-400 self-center">
                {loc.x.toFixed(1)}% / {loc.y.toFixed(1)}%
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingKey(null)}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-600/80 px-3 py-2 text-sm font-bold text-white shadow transition hover:bg-emerald-600"
                >
                  ✓ Listo
                </button>
                <button
                  onClick={() => deleteLocation(loc.key)}
                  className="rounded-lg border border-red-500/40 bg-red-600/80 px-3 py-2 text-sm font-bold text-white shadow transition hover:bg-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Location list */}
      {locations.length > 0 && (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-4">
          <div className="mb-3 text-xs font-black uppercase tracking-widest text-slate-400">
            {locations.length} ubicación{locations.length !== 1 ? 'es' : ''} definida{locations.length !== 1 ? 's' : ''}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {locations.map(loc => (
              <div
                key={loc.key}
                className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition ${editingKey === loc.key ? 'border-cyan-400/60 bg-cyan-950/40' : 'border-slate-700/50 bg-slate-950/50 hover:border-slate-600'}`}
                onClick={() => setEditingKey(editingKey === loc.key ? null : loc.key)}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="text-base">{loc.icon}</span>
                  <span className="truncate font-semibold text-white">{loc.name}</span>
                </span>
                <span className="shrink-0 text-[10px] text-slate-500">{loc.x}%/{loc.y}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {locations.length === 0 && !pendingPin && (
        <div className="rounded-xl border border-slate-700/40 bg-slate-900/40 p-6 text-center text-sm text-slate-500">
          Haz clic en el mapa para agregar tu primera ubicación.
        </div>
      )}
    </div>
  )
}
