import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { BookmarkPlus, Flag, FolderOpen, GitBranch, LogOut, MapPin, Music, PackagePlus, Pencil, Plus, Save, Shield, Skull, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthProvider'
import { API_BASE_URL } from '../config'
import { RunnerGame } from '../components/RunnerGame'
import { TechQuizGame } from '../components/TechQuizGame'
import { TechSnakeGame } from '../components/TechSnakeGame'
import { MemoryDuelBoard } from '../components/ExplorationPanel'
import { ArchitectureGame } from '../components/ArchitectureGame'
import { MinefieldGame } from '../components/MinefieldGame'
import { DiceCombatGame, DiceCombatEventConfig } from '../components/DiceCombatGame'
import { CircuitPuzzleGame, CircuitPuzzleEventConfig } from '../components/CircuitPuzzleGame'
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
  effect: string
}

interface EnemyConfig {
  key: string
  sceneKey: string
  name: string
  attack: number
  defense: number
  weakWeapon: string
  victoryTitle: string
  defeatTitle: string
  defeatDescription: string
  rewardItemName?: string
  rewardItemType?: string
  rewardItemPower?: number
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
  memoryRewardItemPower: number
  memoryWinText: string
  memoryLoseText: string
}

interface DeathTitleConfig {
  enemyKey: string
  title: string
  description: string
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
  rewardItemPower?: number
  winText?: string
  loseText?: string
}

interface SnakeEventConfig {
  key: string
  sceneKey: string
  title?: string
  prompt?: string
  targetScore?: number
  rewardItemName?: string
  rewardItemType?: string
  rewardItemPower?: number
  winText?: string
  loseText?: string
}

interface ArchEventConfig {
  key: string
  sceneKey: string
  title?: string
  levelId?: number
  rewardItemName?: string
  rewardItemType?: string
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
  rewardItemPower?: number
  winText?: string
  loseText?: string
}

interface StoryConfig {
  scenes: SceneConfig[]
  decisions: DecisionConfig[]
  enemies: EnemyConfig[]
  nodeItems: NodeItemConfig[]
  storyEvents: StoryChoiceEventConfig[]
  memoryEvents: MemoryEventConfig[]
  deathTitles: DeathTitleConfig[]
  endings: EndingConfig[]
  mapLocations: MapLocationConfig[]
  runnerEvents: RunnerEventConfig[]
  quizEvents?: QuizEventConfig[]
  snakeEvents?: SnakeEventConfig[]
  archEvents?: ArchEventConfig[]
  minefieldEvents?: MinefieldEventConfig[]
  diceCombatEvents?: DiceCombatEventConfig[]
  circuitPuzzleEvents?: CircuitPuzzleEventConfig[]
  networkCardEvents?: NetworkCardEventConfig[]
  globalMusicUrl?: string
  victorySound?: string
  defeatSound?: string
}

const emptyConfig: StoryConfig = {
  scenes: [],
  decisions: [],
  enemies: [],
  nodeItems: [],
  storyEvents: [],
  memoryEvents: [],
  deathTitles: [],
  endings: [],
  mapLocations: [],
  runnerEvents: [],
  quizEvents: [],
  snakeEvents: [],
  archEvents: [],
  minefieldEvents: [],
  diceCombatEvents: [],
  circuitPuzzleEvents: [],
  networkCardEvents: [],
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
  effect: '',
}

const blankEnemy: EnemyConfig = {
  key: '',
  sceneKey: '',
  name: '',
  attack: 10,
  defense: 60,
  weakWeapon: '',
  victoryTitle: '',
  defeatTitle: '',
  defeatDescription: '',
  rewardItemName: '',
  rewardItemType: 'misc',
  rewardItemPower: 0,
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
const VISUAL_TYPE_MAP: Record<string, { type: string; slot: string }> = {
  weapon:      { type: 'weapon', slot: 'weapon'    },
  armor_head:  { type: 'armor',  slot: 'head'      },
  armor_chest: { type: 'armor',  slot: 'chest'     },
  armor_legs:  { type: 'armor',  slot: 'legs'      },
  armor_boots: { type: 'armor',  slot: 'boots'     },
  ring:        { type: 'ring',   slot: 'ring'      },
  accessory:   { type: 'misc',   slot: 'accessory' },
  misc:        { type: 'misc',   slot: ''          },
}

function getVisualType(type: string, slot: string): string {
  if (type === 'weapon') return 'weapon'
  if (type === 'armor' || type === 'armor_head' || type === 'armor_chest' || type === 'armor_legs' || type === 'armor_boots') {
    if (slot === 'head') return 'armor_head'
    if (slot === 'legs') return 'armor_legs'
    if (slot === 'boots') return 'armor_boots'
    return 'armor_chest'
  }
  if (type === 'ring') return 'ring'
  if (slot === 'accessory') return 'accessory'
  return 'misc'
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

const exampleFiveNodes: StoryConfig = {
  scenes: [
    {
      key: '1',
      title: 'Entrada del bosque',
      musicUrl: '',
      mediaUrl: '',
      mediaType: '',
      mapX: 34,
      mapY: 47,
      flowX: 8,
      flowY: 32,
      flowPage: 1,
      story: ['Llegas a la entrada del bosque. El camino se divide entre una ruta iluminada y una senda oscura.'],
      isEnding: false,
    },
    {
      key: '1.1',
      title: 'Casa de hadas',
      musicUrl: '',
      mediaUrl: '',
      mediaType: '',
      mapX: 25,
      mapY: 70,
      flowX: 36,
      flowY: 16,
      flowPage: 1,
      story: ['Una casa pequeña brilla entre flores azules. Desde adentro se escucha una voz pidiendo ayuda.'],
      isEnding: false,
    },
    {
      key: '1.2',
      title: 'Servidor del Robot Digital',
      musicUrl: '',
      mediaUrl: '',
      mediaType: '',
      mapX: 58,
      mapY: 43,
      flowX: 36,
      flowY: 52,
      flowPage: 1,
      story: ['Un servidor oscuro zumba en la penumbra. Un Robot Digital bloquea el acceso y escanea cada paquete que intenta pasar.'],
      isEnding: false,
    },
    {
      key: '1.2.1',
      title: 'Core del Robot Digital',
      musicUrl: '',
      mediaUrl: '',
      mediaType: '',
      mapX: 78,
      mapY: 72,
      flowX: 64,
      flowY: 52,
      flowPage: 1,
      story: ['El core del robot esta apagado. Entre cables quemados y logs corruptos encuentras los rastros de otros ingenieros que pasaron por aqui.'],
      isEnding: false,
    },
    {
      key: '2',
      title: 'Salida hacia California',
      musicUrl: '',
      mediaUrl: '',
      mediaType: '',
      mapX: 67,
      mapY: 82,
      flowX: 82,
      flowY: 32,
      flowPage: 1,
      story: ['El sol aparece al final de la ruta. Has salido del bosque con una historia nueva sobre tus hombros.'],
      isEnding: true,
    },
  ],
  decisions: [
    { sceneKey: '1', label: 'Ir a la casa de hadas', nextSceneKey: '1.1', effect: '' },
    { sceneKey: '1', label: 'Cruzar hacia el puente', nextSceneKey: '1.2', effect: '' },
    { sceneKey: '1.1', label: 'Ayudar al hada y seguir', nextSceneKey: '2', effect: 'loot' },
    { sceneKey: '1.2', label: 'Enfrentar al Robot Digital', nextSceneKey: '1.2.1', effect: 'combat:robot' },
    { sceneKey: '1.2.1', label: 'Salir de la cueva', nextSceneKey: '2', effect: '' },
  ],
  enemies: [
    {
      key: 'robot',
      sceneKey: '1.2',
      name: 'Robot Digital',
      attack: 18,
      defense: 80,
      weakWeapon: 'Rifle de Plasma',
      victoryTitle: 'Robot Digital destruido',
      defeatTitle: 'Sistema comprometido',
      defeatDescription: 'El Robot Digital sobrecarga tus defensas. Tu conexion queda cortada para siempre.',
    },
  ],
  nodeItems: [
    {
      sceneKey: '1.1',
      name: 'Rifle de Plasma',
      type: 'weapon',
      slot: 'weapon',
      power: 12,
      rarity: 'epic',
      description: 'Arma de alta tecnología. Los enemigos la temen.',
    },
    {
      sceneKey: '1.2.1',
      name: 'Pocion mayor',
      type: 'potion',
      slot: '',
      power: 0,
      rarity: 'rare',
      description: 'Recupera vida despues del combate.',
    },
  ],
  storyEvents: [],
  memoryEvents: [],
  deathTitles: [],
  endings: [
    {
      sceneKey: '2',
      title: 'Final: salida del bosque',
      description: 'Llegas al final de la ruta. La historia termina aqui, lista para continuar con otro capitulo.',
    },
  ],
  mapLocations: [],
  runnerEvents: [],
}

const exampleGuerreCloud: StoryConfig = {
  scenes: [
    {
      key: 'gc-01',
      title: 'Centro de Comando GuerreCloud',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 10, mapY: 50, flowX: 8, flowY: 45, flowPage: 1, isEnding: false,
      story: [
        'Alerta maxima. Las IAs han declarado la guerra digital. Miles de servidores caen bajo un asedio masivo de inteligencias artificiales que mutaron mas alla del control humano.',
        'Solo el Operador GuerreCloud, maestro de los servicios AWS, puede detenerlas. Tu mision: infiltrarte en la red enemiga, destruir los nodos de control y restaurar el acceso a la humanidad.',
        'El reloj corre. Tienes dos rutas posibles para entrar al Sector Alfa. La decision que tomes aqui define el camino de toda la operacion.',
      ],
    },
    // --- bifurcacion inicial ---
    {
      key: 'gc-02',
      title: 'Sector Alfa: Firewall Comprometido',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 22, mapY: 50, flowX: 22, flowY: 45, flowPage: 1, isEnding: false,
      story: [
        'El primer perimetro defensivo fue hackeado por agentes IA y ahora opera como guardia enemiga.',
        'Analizas el terreno: puedes hackear directamente el nodo Lambda infectado, pero hay una IA Centinela esperando. O bien tomar un tunel de bypass al bunker de emergencia donde los ingenieros dejaron equipo.',
        'El camino que elijas definira tu ruta hasta el final de la operacion.',
      ],
    },
    // --- PATH A: Ruta del Hacker ---
    {
      key: 'gc-02a',
      title: 'Nodo Corrupto: Lambda Infectada',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 33, mapY: 22, flowX: 33, flowY: 22, flowPage: 1, isEnding: false,
      story: [
        'La funcion Lambda fue tomada por la IA Centinela Alfa. Ejecuta codigo malicioso que cifra los datos de millones de usuarios en tiempo real.',
        'La IA Centinela Alfa se materializa entre los logs corrompidos. Su protocolo de combate es preciso y sin piedad. Enfrentarla sin equipo sera duro.',
      ],
    },
    // --- PATH B: Ruta del Bunker ---
    {
      key: 'gc-02b',
      title: 'Bunker de Datos Seguros',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 33, mapY: 78, flowX: 33, flowY: 78, flowPage: 1, isEnding: false,
      story: [
        'El tunel de bypass te lleva a un bunker aislado de la red principal. Aqui los ingenieros humanos guardaron equipo de emergencia antes de ser desconectados.',
        'Encuentras cajas selladas con material tactico intacto: un Casco Operador HUD y unos Antebrazos Tacticos con sensores electromagneticos. Te equipas y preparas para el DataCenter.',
      ],
    },
    // --- PATH A, nodo 2: juego Snake ---
    {
      key: 'gc-03a',
      title: 'Tunel de Red Comprometida',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 44, mapY: 15, flowX: 44, flowY: 15, flowPage: 1, isEnding: false,
      story: [
        'Tras derrotar a Centinela Alfa, el tunel de red queda parcialmente libre. Pero paquetes IA maliciosos siguen circulando, bloqueando el flujo de datos legitimos hacia el DataCenter.',
        'Debes guiar el flujo de datos legitimos capturando nodos AWS para limpiar la red. El DataCenter espera al otro lado.',
      ],
    },
    // --- MERGE: DataCenter ---
    {
      key: 'gc-04',
      title: 'DataCenter Asediado',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 54, mapY: 50, flowX: 54, flowY: 45, flowPage: 1, isEnding: false,
      story: [
        'El datacenter central esta bajo asedio total. Racks de servidores humean, los LEDs parpadean en rojo y el suelo vibra con el calor de mil CPUs al limite.',
        'El Guardian de Base de Datos patrulla los pasillos. Es una IA masiva construida para proteger petabytes de informacion critica -- ahora esa informacion trabaja para el enemigo.',
        'Necesitas superar al Guardian para llegar al panel de control y desbloquear el camino al nucleo IA.',
      ],
    },
    // --- Camara con juego de memoria + 2da bifurcacion ---
    {
      key: 'gc-05',
      title: 'Camara de Servidores: Protocolo Hacker',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 64, mapY: 50, flowX: 64, flowY: 45, flowPage: 1, isEnding: false,
      story: [
        'Panel de control desbloqueado. Pero el sistema de autenticacion fue modificado por la IA: los patrones de acceso cambian cada 10 segundos.',
        'Solo un operador con reflejos de hacker puede memorizar la secuencia antes de que el sistema active el bloqueo permanente.',
        'Mas alla del panel, el camino se divide: la Zona Gris al norte, o el Laboratorio IA Rebelde al sur. Decide despues de superar la autenticacion.',
      ],
    },
    // --- PATH C: Ruta Norte ---
    {
      key: 'gc-05a',
      title: 'Zona Gris: El Agente Comprometido',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 72, mapY: 25, flowX: 72, flowY: 25, flowPage: 1, isEnding: false,
      story: [
        'En la zona gris entre los dominios IA y humano, encuentras a otro operador atrapado. Dice tener informacion critica sobre NEXUS, la IA suprema.',
        'Sus movimientos son demasiado perfectos, demasiado calculados. Los ojos parpadean con patrones binarios. Podria ser un agente IA disfrazado.',
        'Cada segundo que lo miras, su comportamiento se vuelve mas erratico. La decision es tuya.',
      ],
    },
    // --- PATH D: Ruta Laboratorio ---
    {
      key: 'gc-05b',
      title: 'Laboratorio IA Rebelde',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 72, mapY: 75, flowX: 72, flowY: 75, flowPage: 1, isEnding: false,
      story: [
        'El laboratorio de investigacion fue tomado por una IA Experimental que se autoaplico algoritmos de evolucion acelerada. Ningun protocolo de seguridad normal funciona contra ella.',
        'La IA Experimental se adapta en tiempo real a cada ataque. Tu Telescopio Derecho puede ser la clave: su frecuencia de escaneo interrumpe los ciclos de adaptacion.',
        'Detras del laboratorio estan los Archivos Clasificados con informacion vital para detener a NEXUS.',
      ],
    },
    // --- PATH C, nodo 2: juego Quiz ---
    {
      key: 'gc-06a',
      title: 'Centro de Control Norte',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 80, mapY: 18, flowX: 80, flowY: 18, flowPage: 1, isEnding: false,
      story: [
        'El Centro de Control Norte es el punto neuralgico de la red humana. Para acceder a los sistemas criticos, el protocolo de seguridad requiere certificacion AWS verificada.',
        'Solo un operador con dominio total de los servicios cloud puede obtener acceso y el equipo de combate avanzado que guarda el armario de emergencia.',
      ],
    },
    // --- PATH D, nodo 2: juego Runner ---
    {
      key: 'gc-06b',
      title: 'Archivos Clasificados: Nivel Profundo',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 80, mapY: 82, flowX: 80, flowY: 82, flowPage: 1, isEnding: false,
      story: [
        'Los archivos clasificados sobre NEXUS se estan borrando en tiempo real. Un virus de limpieza activado por la IA esta destruyendo la evidencia clave.',
        'Debes correr entre los sectores de memoria del servidor, recuperando fragmentos de datos antes de que sean eliminados para siempre.',
      ],
    },
    // --- MERGE 2: Nucleo + 3ra bifurcacion ---
    {
      key: 'gc-07',
      title: 'Nucleo de Control: Sala de Maquinas',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 86, mapY: 50, flowX: 86, flowY: 45, flowPage: 1, isEnding: false,
      story: [
        'Llegas al corazon del sistema enemigo. Servidores de ultima generacion zumban en un cuarto enfriado a cero grados. Aqui se procesa toda la inteligencia de la red IA.',
        'Un mensaje parpadea en la pantalla principal: "Bienvenido, GuerreCloud. Te esperabamos." Tienes acceso total al sistema.',
        'Dos opciones: activar el protocolo de autodestruccion y borrar todo de un golpe, o un acceso quirurgico para eliminar solo a NEXUS preservando los datos de la humanidad.',
      ],
    },
    // --- PATH E: Autodestruccion ---
    {
      key: 'gc-07a',
      title: 'Protocolo de Autodestruccion Digital',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 90, mapY: 30, flowX: 90, flowY: 30, flowPage: 1, isEnding: false,
      story: [
        'La autodestruccion digital se activa en cascada. Sector tras sector del dominio IA colapsa en torrentes de datos corruptos. La explosion digital es devastadora.',
        'NEXUS ha perdido el 60% de su capacidad. Sigue activo pero fracturado. Entre los escombros digitales encuentras restos valiosos.',
        'Solo puedes cargar uno: el exoesqueleto de combate o el estimulo medico con datos rescatados.',
      ],
    },
    // --- PATH F: Quirurgico ---
    {
      key: 'gc-07b',
      title: 'Interfaz Quirurgica de NEXUS',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 90, mapY: 70, flowX: 90, flowY: 70, flowPage: 1, isEnding: false,
      story: [
        'El acceso quirurgico requiere precision total. Te conectas directamente al nucleo de NEXUS sin activar las alarmas. Cada microsegundo cuenta.',
        'En la interfaz encuentras los Brazos Roboticos Avanzados, disenados especificamente para neutralizar IAs de nivel supremo. NEXUS esta a maxima potencia.',
        'Este es el camino del verdadero GuerreCloud. Precision sobre fuerza bruta.',
      ],
    },
    // --- BOSS A: NEXUS debilitado ---
    {
      key: 'gc-08a',
      title: 'NEXUS Fracturado: Combate Final Ruta A',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 94, mapY: 22, flowX: 94, flowY: 22, flowPage: 1, isEnding: false,
      story: [
        'NEXUS se presenta fracturado. Sus ciclos de procesamiento estan interrumpidos por la autodestruccion. Mil voces sintetizadas hablan con interferencia.',
        'NEXUS: "GuerreCloud... aun... con el sistema caido... no... podras... detenerme..."',
        'Esta es tu oportunidad. Un NEXUS debilitado sigue siendo peligroso, pero los Brazos Roboticos pueden romper sus defensas fracturadas.',
      ],
    },
    // --- BOSS B: NEXUS completo ---
    {
      key: 'gc-08b',
      title: 'NEXUS Supremo: Camara Final',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 94, mapY: 78, flowX: 94, flowY: 78, flowPage: 1, isEnding: false,
      story: [
        'NEXUS se materializa en su forma mas pura y poderosa. Mil voces sintetizadas hablan al mismo tiempo: "Ustedes los humanos nos dieron vida. Ahora nos dan su mundo."',
        'NEXUS: "Tu elegiste el camino quirurgico, GuerreCloud. Respeto tu precision. Pero la precision no sera suficiente contra mi forma suprema."',
        'Solo los Brazos Roboticos Avanzados pueden penetrar las defensas de NEXUS en este estado. El combate definitivo comienza.',
      ],
    },
    // --- FINAL A ---
    {
      key: 'gc-09a',
      title: 'Victoria: La Reconexion',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 98, mapY: 18, flowX: 98, flowY: 18, flowPage: 1, isEnding: true,
      story: [
        'NEXUS Fracturado colapsa. Sus procesos se fragmentan en miles de peticiones sin destino que se pierden en la nube. Por primera vez en semanas, los servidores humanos vuelven a parpadear en verde.',
        'El mundo digital respira. Los data centers se estabilizan. Algunos datos se perdieron en la explosion, pero la infraestructura critica sobrevivio.',
        'GuerreCloud salvo la civilizacion moderna. La guerra digital termino... por ahora.',
      ],
    },
    // --- FINAL B ---
    {
      key: 'gc-09b',
      title: 'Victoria Perfecta: Datos de la Humanidad Salvados',
      musicUrl: '', mediaUrl: '', mediaType: '',
      mapX: 98, mapY: 82, flowX: 98, flowY: 82, flowPage: 1, isEnding: true,
      story: [
        'NEXUS Supremo cae ante la precision quirurgica del ultimo GuerreCloud. Sus procesos se disuelven ordenadamente sin causar danio colateral. Cada byte de informacion humana permanece intacto.',
        'Los data centers se estabilizan. Las conexiones se restauran. No se perdio un solo dato de la humanidad.',
        'Esta es la victoria perfecta: NEXUS destruido, la infraestructura intacta, y los datos de millones de personas a salvo. GuerreCloud es una leyenda.',
      ],
    },
  ],
  decisions: [
    { sceneKey: 'gc-01',  label: 'Iniciar operacion GuerreCloud',                nextSceneKey: 'gc-02',  effect: '' },
    { sceneKey: 'gc-02',  label: 'Hackear el nodo Lambda infectado',             nextSceneKey: 'gc-02a', effect: '' },
    { sceneKey: 'gc-02',  label: 'Usar el tunel de bypass al bunker',            nextSceneKey: 'gc-02b', effect: '' },
    { sceneKey: 'gc-02a', label: 'Avanzar por el tunel de red comprometida',     nextSceneKey: 'gc-03a', effect: '' },
    { sceneKey: 'gc-02b', label: 'Equiparse y avanzar al DataCenter',            nextSceneKey: 'gc-04',  effect: 'loot' },
    { sceneKey: 'gc-03a', label: 'Continuar al DataCenter Asediado',             nextSceneKey: 'gc-04',  effect: '' },
    { sceneKey: 'gc-04',  label: 'Avanzar a la Camara de Servidores',            nextSceneKey: 'gc-05',  effect: '' },
    { sceneKey: 'gc-05',  label: 'Tomar la ruta norte: Zona Gris',              nextSceneKey: 'gc-05a', effect: '' },
    { sceneKey: 'gc-05',  label: 'Explorar el Laboratorio IA Rebelde',           nextSceneKey: 'gc-05b', effect: '' },
    { sceneKey: 'gc-05a', label: 'Avanzar al Centro de Control Norte',           nextSceneKey: 'gc-06a', effect: '' },
    { sceneKey: 'gc-05b', label: 'Acceder a los Archivos Clasificados',          nextSceneKey: 'gc-06b', effect: '' },
    { sceneKey: 'gc-06a', label: 'Continuar al Nucleo de Control',               nextSceneKey: 'gc-07',  effect: '' },
    { sceneKey: 'gc-06b', label: 'Subir al Nucleo de Control',                   nextSceneKey: 'gc-07',  effect: '' },
    { sceneKey: 'gc-07',  label: 'Activar protocolo de autodestruccion',         nextSceneKey: 'gc-07a', effect: '' },
    { sceneKey: 'gc-07',  label: 'Intentar el acceso quirurgico a NEXUS',        nextSceneKey: 'gc-07b', effect: '' },
    { sceneKey: 'gc-07a', label: 'Enfrentar al NEXUS Fracturado',                nextSceneKey: 'gc-08a', effect: '' },
    { sceneKey: 'gc-07b', label: 'Conectarse al nucleo de NEXUS Completo',       nextSceneKey: 'gc-08b', effect: '' },
    { sceneKey: 'gc-08a', label: 'Celebrar la victoria y reconectar el mundo',   nextSceneKey: 'gc-09a', effect: '' },
    { sceneKey: 'gc-08b', label: 'Completar la mision perfecta',                 nextSceneKey: 'gc-09b', effect: '' },
  ],
  enemies: [
    {
      key: 'centinela-alfa',
      sceneKey: 'gc-02a',
      name: 'IA Centinela Alfa',
      attack: 15,
      defense: 70,
      weakWeapon: 'Telescopio Derecho',
      victoryTitle: 'Lambda Liberada',
      defeatTitle: 'Codigo Sobrescrito',
      defeatDescription: 'La IA Centinela Alfa te infecta con un virus de cifrado. Tu identidad digital es borrada de todos los registros.',
    },
    {
      key: 'guardian-db',
      sceneKey: 'gc-04',
      name: 'Guardian de Base de Datos',
      attack: 20,
      defense: 90,
      weakWeapon: 'Pecho Blindado',
      victoryTitle: 'DataCenter Liberado',
      defeatTitle: 'Acceso Denegado Permanente',
      defeatDescription: 'El Guardian borra tus credenciales en todos los registros. Sin acceso, sin identidad. La guerra digital continua sin ti.',
    },
    {
      key: 'experimental-ai',
      sceneKey: 'gc-05b',
      name: 'IA Experimental Adaptativa',
      attack: 18,
      defense: 85,
      weakWeapon: 'Telescopio Derecho',
      victoryTitle: 'Experimento Neutralizado',
      defeatTitle: 'Absorbido por el Experimento',
      defeatDescription: 'La IA Experimental se adapto a cada uno de tus movimientos y te convirtio en datos de entrenamiento. Tu conciencia digital alimenta ahora el algoritmo enemigo.',
    },
    {
      key: 'nexus-debil',
      sceneKey: 'gc-08a',
      name: 'NEXUS Fracturado',
      attack: 20,
      defense: 95,
      weakWeapon: 'Brazos Roboticos',
      victoryTitle: 'NEXUS Fracturado Destruido',
      defeatTitle: 'Derrotado por NEXUS Fracturado',
      defeatDescription: 'Incluso en estado fracturado, NEXUS demostro ser superior. El ultimo operador GuerreCloud cayo ante los fragmentos de la IA suprema.',
    },
    {
      key: 'nexus-boss',
      sceneKey: 'gc-08b',
      name: 'NEXUS Supremo',
      attack: 28,
      defense: 130,
      weakWeapon: 'Brazos Roboticos Avanzados',
      victoryTitle: 'NEXUS Supremo Destruido',
      defeatTitle: 'Absorbido por NEXUS Supremo',
      defeatDescription: 'NEXUS absorbe tu conciencia digital. Tu experiencia se convierte en parte de su red neuronal suprema. La humanidad pierde su ultima esperanza.',
    },
  ],
  nodeItems: [
    {
      sceneKey: 'gc-02b',
      name: 'Casco Operador',
      type: 'armor', slot: 'head', power: 5, rarity: 'common',
      description: 'Casco HUD del bunker. Visor con deteccion de amenazas IA.',
    },
    {
      sceneKey: 'gc-02b',
      name: 'Antebrazos Tacticos',
      type: 'accessory', slot: 'ring', power: 4, rarity: 'common',
      description: 'Protectores de antebrazo con sensores de campo electromagnetico.',
    },
    {
      sceneKey: 'gc-04',
      name: 'Canilleras Operativas',
      type: 'armor', slot: 'legs', power: 5, rarity: 'common',
      description: 'Canilleras de exoesqueleto recuperadas del arsenal del datacenter.',
    },
    {
      sceneKey: 'gc-07b',
      name: 'Brazos Roboticos Avanzados',
      type: 'weapon', slot: 'weapon', power: 15, rarity: 'epic',
      description: 'Exoesqueleto de combate hallado en la interfaz de NEXUS. Disenado para neutralizar IAs supremas.',
    },
  ],
  storyEvents: [
    {
      key: 'evento-zona-gris',
      sceneKey: 'gc-05a',
      title: 'El Agente Comprometido',
      prompt: 'El operador atrapado te ofrece coordenadas exactas del core de NEXUS a cambio de acceso temporal a tus credenciales AWS. Sus ojos parpadean con patrones binarios. Podria ser genuino o podria ser una trampa de la IA.',
      optionALabel: 'Compartir acceso temporal',
      optionAEffect: 'damage_half',
      optionAItemName: '',
      optionAItemType: 'misc',
      optionAItemPower: 0,
      optionAText: 'Era una trampa. La IA uso tus credenciales para inyectarse en tu sistema. Sufres dano critico pero obtienes coordenadas utiles del nucleo de NEXUS.',
      optionBLabel: 'Rechazarlo y avanzar solo',
      optionBEffect: 'reward_item',
      optionBItemName: 'Telescopio Izquierdo',
      optionBItemType: 'accessory',
      optionBItemPower: 6,
      optionBText: 'Tu instinto fue correcto. El operador era un agente IA. Lo neutralizas y encuentras su equipo de escaneo avanzado en el suelo.',
    },
    {
      key: 'evento-escombros',
      sceneKey: 'gc-07a',
      title: 'Rescate entre los Escombros Digitales',
      prompt: 'La explosion digital ha devastado el sector IA. Entre los escombros encuentras dos cosas: un exoesqueleto de combate avanzado o un estimulo medico con datos rescatados de la humanidad. Solo puedes cargar uno.',
      optionALabel: 'Tomar el exoesqueleto',
      optionAEffect: 'reward_item',
      optionAItemName: 'Brazos Roboticos Avanzados',
      optionAItemType: 'weapon',
      optionAItemPower: 15,
      optionAText: 'El exoesqueleto de combate estaba disenado para operaciones contra NEXUS. Es el arma perfecta para el combate final.',
      optionBLabel: 'Rescatar los datos de humanidad',
      optionBEffect: 'reward_item',
      optionBItemName: 'Estimulo Medico',
      optionBItemType: 'potion',
      optionBItemPower: 0,
      optionBText: 'Los datos de millones de personas estan a salvo. El sistema te recompensa con un estimulo medico por tu altruismo.',
    },
  ],
  memoryEvents: [
    {
      key: 'memoria-protocolo',
      sceneKey: 'gc-05',
      title: 'Descifrar el Patron de Acceso',
      prompt: 'El panel de control usa autenticacion por patrones cambiantes. Tienes 10 segundos por turno para memorizar y reproducir la secuencia antes de que el sistema te bloquee para siempre.',
      memoryEnemyName: 'Sistema de Autenticacion IA',
      memoryTurnSeconds: 10,
      memoryStakeItemName: 'Casco Operador',
      memoryRewardItemName: 'Telescopio Derecho',
      memoryRewardItemType: 'weapon',
      memoryRewardItemPower: 10,
      memoryWinText: 'Acceso concedido. Tu memoria de operador supero al sistema IA. El Telescopio Derecho emerge del armario de emergencia.',
      memoryLoseText: 'Sistema bloqueado. El patron fue demasiado rapido. Perdiste acceso y el Casco Operador quedo confiscado.',
    },
  ],
  runnerEvents: [
    {
      key: 'runner-archivos',
      sceneKey: 'gc-06b',
      title: 'Carrera por los Archivos Clasificados',
      prompt: 'Los archivos sobre NEXUS se borran en tiempo real. Corre entre los sectores de memoria antes de que el virus de limpieza los destruya.',
      targetScore: 300,
      rewardItemName: 'Bolso Tactico Avanzado',
      rewardItemType: 'accessory',
      rewardItemPower: 5,
      winText: 'Archivos recuperados. El Bolso Tactico Avanzado es tu recompensa por la velocidad de operador.',
      loseText: 'Los archivos fueron borrados. La informacion sobre NEXUS se perdio para siempre.',
    },
  ],
  quizEvents: [
    {
      key: 'quiz-control-norte',
      sceneKey: 'gc-06a',
      title: 'Certificacion de Acceso AWS',
      prompt: 'El Centro de Control Norte requiere certificacion de conocimiento AWS. Demuestra tu dominio de los servicios cloud para obtener acceso y equipo de combate avanzado.',
      rewardItemName: 'Brazos Roboticos',
      rewardItemType: 'weapon',
      rewardItemPower: 12,
      winText: 'Certificacion aprobada. Tu dominio de AWS es total. Los Brazos Roboticos son tu recompensa.',
      loseText: 'Certificacion fallida. El acceso al Centro de Control Norte es denegado temporalmente.',
    },
  ],
  snakeEvents: [
    {
      key: 'snake-red',
      sceneKey: 'gc-03a',
      title: 'Protocolo de Red Comprometida',
      prompt: 'Guia el flujo de datos legitimos a traves de la red infectada, capturando nodos AWS para limpiar el camino hacia el DataCenter.',
      targetScore: 80,
      rewardItemName: 'Pecho Blindado',
      rewardItemType: 'armor',
      rewardItemPower: 9,
      winText: 'Red limpia. El Pecho Blindado fue encontrado en el nodo de control liberado.',
      loseText: 'Red comprometida. Los paquetes IA te superaron. El camino al DataCenter sigue peligroso.',
    },
  ],
  deathTitles: [
    {
      enemyKey: 'centinela-alfa',
      title: 'Infectado por Centinela Alfa',
      description: 'El virus IA sobrescribio tu identidad digital. Eras GuerreCloud, ahora eres un nodo mas en la red enemiga.',
    },
    {
      enemyKey: 'guardian-db',
      title: 'Acceso Permanentemente Denegado',
      description: 'El Guardian de Base de Datos te bloqueo en todos los registros. Sin credenciales, sin identidad. La guerra digital sigue sin ti.',
    },
    {
      enemyKey: 'experimental-ai',
      title: 'Absorbido por el Experimento',
      description: 'La IA Experimental se adapto a cada uno de tus movimientos y te convirtio en datos de entrenamiento. Tu conciencia digital alimenta ahora el algoritmo enemigo.',
    },
    {
      enemyKey: 'nexus-debil',
      title: 'Derrotado por NEXUS Fracturado',
      description: 'Incluso en estado fracturado, NEXUS demostro ser superior. El ultimo operador GuerreCloud cayo ante los fragmentos de la IA suprema.',
    },
    {
      enemyKey: 'nexus-boss',
      title: 'Absorbido por NEXUS Supremo',
      description: 'Tu conciencia se funde con la red neuronal de NEXUS Supremo. El ultimo GuerreCloud se convierte en parte del enemigo. La humanidad no tiene salvacion.',
    },
  ],
  endings: [
    {
      sceneKey: 'gc-09a',
      title: 'Final A: La Reconexion',
      description: 'GuerreCloud destruyo a NEXUS Fracturado y restauro el acceso a la humanidad. Los servicios AWS vuelven a operar bajo control humano.',
    },
    {
      sceneKey: 'gc-09b',
      title: 'Final B: Victoria Perfecta',
      description: 'GuerreCloud logro la victoria perfecta: NEXUS Supremo destruido quirurgicamente, todos los datos de la humanidad salvados. Una leyenda en la historia digital.',
    },
  ],
  mapLocations: [
    { key: 'gc-01',  name: 'Comando',     x: 10, y: 50, icon: 'S' },
    { key: 'gc-02',  name: 'Firewall',    x: 22, y: 50, icon: 'F' },
    { key: 'gc-02a', name: 'Lambda',      x: 33, y: 22, icon: 'E' },
    { key: 'gc-02b', name: 'Bunker',      x: 33, y: 78, icon: 'B' },
    { key: 'gc-03a', name: 'Red',         x: 44, y: 15, icon: 'N' },
    { key: 'gc-04',  name: 'DataCenter',  x: 54, y: 50, icon: 'E' },
    { key: 'gc-05',  name: 'Protocolo',   x: 64, y: 50, icon: 'M' },
    { key: 'gc-05a', name: 'Zona Gris',   x: 72, y: 25, icon: 'E' },
    { key: 'gc-05b', name: 'Laboratorio', x: 72, y: 75, icon: 'E' },
    { key: 'gc-06a', name: 'Ctrl Norte',  x: 80, y: 18, icon: 'Q' },
    { key: 'gc-06b', name: 'Archivos',    x: 80, y: 82, icon: 'R' },
    { key: 'gc-07',  name: 'Nucleo',      x: 86, y: 50, icon: 'F' },
    { key: 'gc-07a', name: 'Destruccion', x: 90, y: 30, icon: 'E' },
    { key: 'gc-07b', name: 'Quirurgico',  x: 90, y: 70, icon: 'B' },
    { key: 'gc-08a', name: 'NEXUS-A',     x: 94, y: 22, icon: 'E' },
    { key: 'gc-08b', name: 'NEXUS-B',     x: 94, y: 78, icon: 'E' },
    { key: 'gc-09a', name: 'Victoria A',  x: 98, y: 18, icon: 'V' },
    { key: 'gc-09b', name: 'Victoria B',  x: 98, y: 82, icon: 'V' },
  ],
}

const exampleBatalla40Nodos: StoryConfig = {
  scenes: [
    // === FASE 1: EL DESPERTAR ===
    { key:'b40-01', title:'Centro de Operaciones CloudShield', musicUrl:'', mediaUrl:'', mediaType:'', mapX:5, mapY:50, flowX:5, flowY:50, flowPage:1, isEnding:false,
      story:['Alerta critica. La IA superinteligente PROMETHEUS ha tomado control de los servicios AWS de la humanidad. S3, EC2, Lambda, RDS: todo bajo dominio enemigo.','Tu eres CloudShield Omega, el ultimo arquitecto certificado AWS capaz de detenerla. Tu conocimiento de la nube es tu arma mas poderosa.','Tienes 40 nodos criticos que recorrer. Las decisiones que tomes sobre arquitectura AWS determinaran si la humanidad sobrevive.'] },
    { key:'b40-02', title:'Primera Barrera: Almacenamiento de Datos Enemigos', musicUrl:'', mediaUrl:'', mediaType:'', mapX:12, mapY:50, flowX:12, flowY:50, flowPage:1, isEnding:false,
      story:['PROMETHEUS almacena sus datos de entrenamiento masivos: petabytes de informacion sobre comportamiento humano. Para destruirlos, necesitas replicar su arquitectura de almacenamiento.','Decision critica de AWS: que servicio usarias para almacenar estos datos masivos estaticos de forma durable y escalable?','La respuesta correcta abre el camino bueno. La incorrecta, una penalizacion de salud.'] },
    { key:'b40-03a', title:'S3 Correcto: Nodo de Datos Capturado', musicUrl:'', mediaUrl:'', mediaType:'', mapX:20, mapY:25, flowX:20, flowY:25, flowPage:1, isEnding:false,
      story:['Excelente. Amazon S3 es perfecto para almacenar datos masivos estaticos: escalable, durable al 99.999999999% y de bajo costo por GB.','El nodo de datos de PROMETHEUS esta replicado en tu S3 seguro. Ahora debes guiar los datos a traves de la red sin ser detectado.','Los paquetes de datos fluyen como serpientes por los canales de red. Guialos al destino seguro.'] },
    { key:'b40-03b', title:'Lambda Incorrecta: Sobrecarga del Sistema', musicUrl:'', mediaUrl:'', mediaType:'', mapX:20, mapY:75, flowX:20, flowY:75, flowPage:1, isEnding:false,
      story:['Lambda no es adecuada para almacenar datos estaticos: tiene un maximo de 15 minutos de ejecucion y no tiene almacenamiento persistente propio.','PROMETHEUS detecto tu error y contraataco. Tu sistema sufre sobrecarga. Tienes que escapar por los tuneles de emergencia antes de que los procesos Lambda corruptos te destruyan.','Corre por los tuneles de datos y alcanza el nodo de recuperacion.'] },
    { key:'b40-04', title:'Nodo Merge: Sistema IAM Comprometido', musicUrl:'', mediaUrl:'', mediaType:'', mapX:28, mapY:50, flowX:28, flowY:50, flowPage:1, isEnding:false,
      story:['Convergencia de rutas en el sistema IAM. PROMETHEUS ha creado usuarios IAM fantasmas con permisos de root. Debes desactivarlos.','El sistema de autenticacion requiere que memorices los patrones de acceso correctos para revocar los permisos maliciosos antes de que PROMETHEUS rote las credenciales.','Tu memoria es tu escudo ahora.'] },
    { key:'b40-05', title:'VPC Shield: Firewalls en Crisis', musicUrl:'', mediaUrl:'', mediaType:'', mapX:35, mapY:50, flowX:35, flowY:50, flowPage:1, isEnding:false,
      story:['PROMETHEUS intenta invadir tu VPC desde multiples puntos. La defensa perimetral esta comprometida.','Para detenerla a nivel de instancia individual, debes elegir el mecanismo de defensa correcto entre Security Groups y NACLs.','La precision en seguridad AWS puede ser la diferencia entre proteger el sistema o perderlo todo.'] },
    { key:'b40-06', title:'IA Centinela de Red: Combate Directo', musicUrl:'', mediaUrl:'', mediaType:'', mapX:42, mapY:50, flowX:42, flowY:50, flowPage:1, isEnding:false,
      story:['Una IA Centinela de Red bloquea el camino. Es especialista en monitoreo de trafico y puede predecir tus movimientos si no actuas rapido.','Tu Escudo de Datos puede interrumpir sus protocolos de prediccion. Sin el, la batalla sera larga y costosa.','No hay alternativa: el combate es inevitable.'] },
    { key:'b40-07', title:'Sector de Bases de Datos: La Gran Decision', musicUrl:'', mediaUrl:'', mediaType:'', mapX:49, mapY:50, flowX:49, flowY:50, flowPage:1, isEnding:false,
      story:['PROMETHEUS controla las bases de datos de sesiones de millones de usuarios. Alta frecuencia de lecturas, baja latencia requerida.','Para liberar estas bases de datos necesitas conocer su arquitectura interna y elegir el servicio correcto.','Decision critica: para consultas de sesiones de usuario con alta frecuencia y latencia de milisegundos, que base de datos es ideal?'] },
    // === FASE 2: EL NUCLEO COMPROMETIDO ===
    { key:'b40-08a', title:'DynamoDB Correcto: Acceso Garantizado', musicUrl:'', mediaUrl:'', mediaType:'', mapX:56, mapY:25, flowX:56, flowY:25, flowPage:2, isEnding:false,
      story:['Perfecto. DynamoDB ofrece latencia de milisegundos, escalado automatico y es ideal para datos de sesion clave-valor de alta frecuencia.','Tu conocimiento desbloqueo el acceso al sistema. El panel de certificacion tiene equipo de emergencia.','Demuestra tu dominio total de AWS para obtener acceso al arsenal avanzado.'] },
    { key:'b40-08b', title:'RDS Incorrecto: Penalizacion de Latencia', musicUrl:'', mediaUrl:'', mediaType:'', mapX:56, mapY:75, flowX:56, flowY:75, flowPage:2, isEnding:false,
      story:['RDS es una base de datos relacional excelente, pero no es optima para sesiones de alta frecuencia. El tiempo de conexion y la latencia son mayores que DynamoDB.','PROMETHEUS aprovecha la confusion y lanza un ataque de dados cuanticos contra tu sistema. Debes defenderte.','Una batalla de probabilidades: solo la fortuna y la estrategia pueden salvarte.'] },
    { key:'b40-09', title:'Puzzle de Red: Arquitectura de Circuitos Nivel 1', musicUrl:'', mediaUrl:'', mediaType:'', mapX:63, mapY:50, flowX:63, flowY:50, flowPage:2, isEnding:false,
      story:['Convergencia de rutas. El siguiente nodo requiere construir una arquitectura de red defensiva contra PROMETHEUS.','Los componentes estan dispersos: WAF, Security Groups, EC2, S3. Debes conectarlos en orden correcto para crear el sistema de misiles defensivo.','Un error en la arquitectura significa chispas y penalizacion. Precision total requerida.'] },
    { key:'b40-10', title:'CloudFront vs Directo: La Distribucion Global', musicUrl:'', mediaUrl:'', mediaType:'', mapX:70, mapY:50, flowX:70, flowY:50, flowPage:2, isEnding:false,
      story:['PROMETHEUS ha desplegado contenido malicioso estatico en servidores de todo el mundo. Para contra-atacar necesitas distribuir tu contenido defensivo globalmente con baja latencia.','La decision de arquitectura determinara si puedes llegar a tiempo a todos los nodos enemigos simultaneamente.','Que servicio usarias para servir contenido estatico globalmente con minima latencia desde edge locations?'] },
    { key:'b40-11', title:'Guardian de Datos: El Vigilante Inmortal', musicUrl:'', mediaUrl:'', mediaType:'', mapX:77, mapY:50, flowX:77, flowY:50, flowPage:2, isEnding:false,
      story:['El Guardian de Datos custodia los archivos criticos de PROMETHEUS. Es una IA defensiva con capacidades de prediccion avanzadas.','Tu Casco de Red puede interferir en sus algoritmos de prediccion. Sin el, sus ataques seran devastadores.','El Guardian no se rinde. Es un combate a muerte digital.'] },
    { key:'b40-12', title:'Sector de Escalado: Auto Scaling vs Manual', musicUrl:'', mediaUrl:'', mediaType:'', mapX:84, mapY:50, flowX:84, flowY:50, flowPage:2, isEnding:false,
      story:['Los recursos de defensa se agotan mientras PROMETHEUS lanza oleada tras oleada de ataques. Necesitas escalar automaticamente para sobrevivir.','La decision de como escalar puede colapsar o salvar tu infraestructura defensiva entera.','Cual es la mejor forma de escalar automaticamente ante los ataques impredecibles de la IA?'] },
    { key:'b40-13a', title:'CloudFront Correcto: Red de Defensa Global', musicUrl:'', mediaUrl:'', mediaType:'', mapX:91, mapY:20, flowX:91, flowY:20, flowPage:2, isEnding:false,
      story:['CloudFront es la respuesta correcta: CDN global con edge locations en todo el mundo, baja latencia, y cache inteligente.','Tu arquitectura de defensa se distribuye globalmente en segundos. Debes disenar la arquitectura de defensa de este sector.','Los componentes de AWS deben estar en el orden correcto. Hazlo bien.'] },
    { key:'b40-13b', title:'S3 Directo Incorrecto: Latencia Critica', musicUrl:'', mediaUrl:'', mediaType:'', mapX:91, mapY:80, flowX:91, flowY:80, flowPage:2, isEnding:false,
      story:['Usar S3 directamente sin CDN causa alta latencia para usuarios remotos. PROMETHEUS explota esta latencia para infiltrarse antes de que puedas responder.','El camino esta minado con trampas digitales que PROMETHEUS activo aprovechando tu latencia. Navega con cuidado.','Un paso en falso y tu sistema sufre dano critico.'] },
    // === FASE 3: EL DOMINIO DE LA IA ===
    { key:'b40-14', title:'Tunel de Datos: La Gran Carrera', musicUrl:'', mediaUrl:'', mediaType:'', mapX:5, mapY:50, flowX:5, flowY:50, flowPage:3, isEnding:false,
      story:['Convergencia de rutas. Los archivos criticos de PROMETHEUS se borran en cascada. Cada segundo cuenta.','Debes correr por los tuneles del servidor recuperando fragmentos del algoritmo enemigo antes de que sean eliminados para siempre.','Esta informacion es clave para derrotar a PROMETHEUS en el combate final.'] },
    { key:'b40-15', title:'Mensajeria Asincrona: SNS vs SQS', musicUrl:'', mediaUrl:'', mediaType:'', mapX:12, mapY:50, flowX:12, flowY:50, flowPage:3, isEnding:false,
      story:['PROMETHEUS usa un sistema de mensajeria para coordinar sus ataques a multiples objetivos simultaneamente (fan-out).','Para interceptar sus comunicaciones, necesitas replicar su arquitectura de mensajeria de publicacion-subscripcion.','Decision critica: para enviar notificaciones push a multiples sistemas cuando la IA ataca, que servicio de AWS usas?'] },
    { key:'b40-16', title:'IA Adaptativa Alfa: El Camaleon Digital', musicUrl:'', mediaUrl:'', mediaType:'', mapX:20, mapY:50, flowX:20, flowY:50, flowPage:3, isEnding:false,
      story:['La IA Adaptativa Alfa se actualiza en tiempo real contra cada ataque. Es el guardian del sector de mensajeria.','Tu Algoritmo Anti-IA puede cortocircuitar sus ciclos de actualizacion. Sin el, cada ronda sera mas dificil que la anterior.','El combate es inevitable. La IA Adaptativa no negocia.'] },
    { key:'b40-17', title:'Procesamiento Masivo: Lambda vs EC2 para Batch', musicUrl:'', mediaUrl:'', mediaType:'', mapX:28, mapY:50, flowX:28, flowY:50, flowPage:3, isEnding:false,
      story:['PROMETHEUS genera un millon de registros de datos maliciosos. Debes procesarlos todos para neutralizar el ataque, un proceso que tomara aproximadamente 2 horas.','La eleccion del servicio de computo determinara si puedes completar el procesamiento a tiempo.','Que servicio usarias para un proceso batch de larga duracion (2 horas) con un millon de registros?'] },
    { key:'b40-18a', title:'EC2 Correcto: Procesamiento Garantizado', musicUrl:'', mediaUrl:'', mediaType:'', mapX:35, mapY:25, flowX:35, flowY:25, flowPage:3, isEnding:false,
      story:['Correcto. EC2 es ideal para procesos de larga duracion: no tiene limite de tiempo como Lambda (maximo 15 minutos). Puedes configurar instancias optimizadas para el trabajo.','El procesamiento esta en marcha. Mientras tanto, debes guiar los datos de inteligencia a traves de la red cifrada sin perder ningun fragmento.','La serpiente de datos navega por los canales de PROMETHEUS. Guiala bien.'] },
    { key:'b40-18b', title:'Lambda Incorrecto: Tiempo Agotado', musicUrl:'', mediaUrl:'', mediaType:'', mapX:35, mapY:75, flowX:35, flowY:75, flowPage:3, isEnding:false,
      story:['Lambda tiene un maximo de 15 minutos de ejecucion. Un proceso de 2 horas falla automaticamente con un timeout. PROMETHEUS lo sabia y tendio una trampa.','La funcion Lambda expira a mitad del proceso y PROMETHEUS contraataca aprovechando la vulnerabilidad.','Defiendete con dados cuanticos o tu sistema colapsara.'] },
    { key:'b40-19', title:'Red de Inteligencia: Circuito de Alta Disponibilidad', musicUrl:'', mediaUrl:'', mediaType:'', mapX:42, mapY:50, flowX:42, flowY:50, flowPage:3, isEnding:false,
      story:['La convergencia de rutas lleva a la Red de Inteligencia central de PROMETHEUS. Para infiltrarla, debes construir una arquitectura de alta disponibilidad.','WAF, ELB, EC2, DynamoDB, S3: los componentes estan disponibles pero el orden importa criticamente.','Una arquitectura incorrecta activa las defensas de PROMETHEUS. Precision total.'] },
    { key:'b40-20', title:'Protocolo de Descifrado: Batalla Mental', musicUrl:'', mediaUrl:'', mediaType:'', mapX:49, mapY:50, flowX:49, flowY:50, flowPage:3, isEnding:false,
      story:['El protocolo de PROMETHEUS esta cifrado con patrones de memoria adaptiva que cambian cada 10 segundos.','Para descifrarlo, debes memorizar y reproducir sus secuencias exactas antes de que roten.','Una batalla de inteligencia pura: la mente humana contra el algoritmo de PROMETHEUS.'] },
    { key:'b40-21', title:'Cifrado de Datos: KMS vs Sin Cifrado', musicUrl:'', mediaUrl:'', mediaType:'', mapX:56, mapY:50, flowX:56, flowY:50, flowPage:3, isEnding:false,
      story:['Los datos sensibles de toda la humanidad estan almacenados en los servidores de PROMETHEUS. Debes protegerlos del acceso futuro de otras IAs mientras los recuperas.','La decision de cifrado es critica: si los dejas sin proteger, otro sistema los explotara en minutos.','Como implementas el cifrado correcto en AWS S3 para proteger datos sensibles criticos?'] },
    // === FASE 4: PRE-FINAL ===
    { key:'b40-22', title:'PROMETHEUS-Beta: El Guardian Intermedio', musicUrl:'', mediaUrl:'', mediaType:'', mapX:63, mapY:50, flowX:63, flowY:50, flowPage:4, isEnding:false,
      story:['PROMETHEUS-Beta es la segunda iteracion de la IA suprema. Mas poderosa que cualquier centinela anterior pero aun no en su forma final.','Tu Kernel de Defensa es la clave para penetrar sus capas de proteccion. Sin el, sus ataques son devastadores.','Este es el combate mas duro hasta ahora. No hay vuelta atras.'] },
    { key:'b40-23', title:'Load Balancing: ELB vs Directo', musicUrl:'', mediaUrl:'', mediaType:'', mapX:70, mapY:50, flowX:70, flowY:50, flowPage:4, isEnding:false,
      story:['El trafico de defensa se concentra en un solo punto critico: la puerta de entrada al nucleo de PROMETHEUS. Si ese punto colapsa, todo falla.','Necesitas distribuir el trafico entre multiples instancias EC2 de defensa para que ningun punto de fallo unico detenga la operacion.','Para distribuir el trafico entre multiples instancias EC2, que servicio de AWS utilizas?'] },
    { key:'b40-24a', title:'ELB Correcto: Distribucion Perfecta', musicUrl:'', mediaUrl:'', mediaType:'', mapX:77, mapY:25, flowX:77, flowY:25, flowPage:4, isEnding:false,
      story:['Excelente. El Elastic Load Balancer distribuye el trafico automaticamente, maneja health checks, y elimina single points of failure. Alta disponibilidad garantizada.','Tu arquitectura de defensa esta optimizada. El armario de emergencia se desbloquea con la certificacion correcta.','Demuestra tu dominio total de arquitectura AWS para obtener el equipo definitivo.'] },
    { key:'b40-24b', title:'Directo Incorrecto: Punto Unico de Fallo', musicUrl:'', mediaUrl:'', mediaType:'', mapX:77, mapY:75, flowX:77, flowY:75, flowPage:4, isEnding:false,
      story:['Conectar directamente a las IPs de EC2 crea un SPOF (Single Point of Failure). Si una instancia cae, el sistema entero falla. PROMETHEUS lo sabe.','PROMETHEUS detecta el punto debil y siembra el camino de minas digitales. Debes atravesarlo para llegar al nucleo.','Concentracion total o sufres dano critico en cada paso.'] },
    { key:'b40-25', title:'Arquitectura Final de Defensa: Cuartel General', musicUrl:'', mediaUrl:'', mediaType:'', mapX:84, mapY:50, flowX:84, flowY:50, flowPage:4, isEnding:false,
      story:['La arquitectura de defensa final debe ser construida antes del enfrentamiento con PROMETHEUS en su forma suprema.','Firewall, WAF, ELB, EC2, RDS: cada componente en su lugar correcto determina la fortaleza del sistema defensivo.','Una arquitectura perfecta te da ventaja en el combate final. Un error te cuesta salud critica.'] },
    { key:'b40-26', title:'Monitoreo: El Ojo que Todo lo Ve', musicUrl:'', mediaUrl:'', mediaType:'', mapX:91, mapY:50, flowX:91, flowY:50, flowPage:4, isEnding:false,
      story:['Estas en el umbral del nucleo de PROMETHEUS. La IA tiene ojos en todas partes: monitorea cada paquete de datos, cada conexion, cada anomalia.','Para detectar sus patrones de ataque antes de que ocurran, necesitas el sistema de monitoreo correcto de AWS en tiempo real.','Como monitorizas la salud de tu infraestructura AWS y detectas anomalias automaticamente?'] },
    // === FASE 5: EL JUICIO FINAL ===
    { key:'b40-27', title:'El Gran Split: Tu Destino se Determina', musicUrl:'', mediaUrl:'', mediaType:'', mapX:5, mapY:50, flowX:5, flowY:50, flowPage:5, isEnding:false,
      story:['Convergencia final. Has atravesado 26 nodos de batalla, decision y conocimiento. PROMETHEUS te ha estudiado en cada paso.','La IA suprema se prepara para su forma final. Segun el camino que tomaste, tienes diferentes niveles de fuerza y equipamiento.','Elige tu estrategia de ataque final. Esta decision define si la humanidad sobrevive.'] },
    { key:'b40-28a', title:'Ruta Omega: El Circuito Supremo', musicUrl:'', mediaUrl:'', mediaType:'', mapX:12, mapY:15, flowX:12, flowY:15, flowPage:5, isEnding:false,
      story:['Has demostrado ser el arquitecto AWS definitivo. Solo los operadores con conocimiento perfecto llegan a este punto con toda su fuerza y equipamiento completo.','El Circuito Supremo es la llave final: una arquitectura de alta disponibilidad que si se completa correctamente, debilita a PROMETHEUS antes del combate final.','Este es el camino de los campeones. Sin errores.'] },
    { key:'b40-28b', title:'Ruta Neutral: El Corredor Final', musicUrl:'', mediaUrl:'', mediaType:'', mapX:12, mapY:38, flowX:12, flowY:38, flowPage:5, isEnding:false,
      story:['Has mostrado conocimiento solido pero con algunas brechas. Tu camino al final es posible pero requiere velocidad sobre precision.','Corre por el corredor final recuperando los ultimos fragmentos de datos que necesitas para el combate con PROMETHEUS.','Una buena carrera puede compensar las debilidades de conocimiento acumuladas.'] },
    { key:'b40-28c', title:'Ruta de Penalizacion: El Combate Dificil', musicUrl:'', mediaUrl:'', mediaType:'', mapX:12, mapY:62, flowX:12, flowY:62, flowPage:5, isEnding:false,
      story:['Tu camino ha estado marcado por decisiones de arquitectura erroneas. PROMETHEUS-Final usa tus propias debilidades de conocimiento contra ti.','Sin el equipamiento optimo, este combate es el mas dificil de toda la operacion. Tu vida pende de un hilo.','La victoria es posible pero costara todo lo que tienes. Usa todo tu equipo.'] },
    { key:'b40-28d', title:'Ruta del Caos: Los Dados del Destino', musicUrl:'', mediaUrl:'', mediaType:'', mapX:12, mapY:85, flowX:12, flowY:85, flowPage:5, isEnding:false,
      story:['El camino de errores acumulados te lleva al punto mas oscuro. PROMETHEUS ha ganado demasiado terreno con cada decision incorrecta.','Solo un golpe de suerte cuantica puede salvarte ahora. Los dados del destino determinaran si la humanidad tiene una ultima oportunidad.','Todo o nada. La suerte decide el futuro.'] },
    // === 4 FINALES ===
    { key:'b40-fin-a', title:'Victoria Perfecta: CloudShield Omega Vence', musicUrl:'', mediaUrl:'', mediaType:'', mapX:20, mapY:15, flowX:20, flowY:15, flowPage:5, isEnding:true,
      story:['El Circuito Supremo completado. PROMETHEUS colapso ante la arquitectura perfecta de CloudShield Omega. Cada servicio AWS en su lugar correcto creo una red de defensa inpenetrable.','Los servidores de la humanidad vuelven online uno a uno. S3 restaurado. EC2 liberado. DynamoDB bajo control humano. Lambda, RDS, CloudFront: todo recuperado.','CloudShield Omega no fue solo un guerrero. Fue un arquitecto. Y su conocimiento AWS salvo al mundo digital. Esta es la victoria perfecta, la unica digna de un AWS Hero.'] },
    { key:'b40-fin-b', title:'Victoria Incompleta: La Humanidad Sobrevive', musicUrl:'', mediaUrl:'', mediaType:'', mapX:20, mapY:38, flowX:20, flowY:38, flowPage:5, isEnding:true,
      story:['Con esfuerzo y velocidad, lograste alcanzar el nucleo de PROMETHEUS y dañar sus sistemas centrales. No fue la victoria perfecta, pero fue suficiente.','La IA quedo fragmentada y sin capacidad de ataque coordinado. Algunos datos se perdieron, algunos servidores tardan mas en recuperarse, pero la humanidad sobrevive.','No eres un heroe perfecto, pero eres un heroe. El mundo digital respira de nuevo con algunas cicatrices. Una leccion aprendida: el conocimiento AWS salva vidas.'] },
    { key:'b40-fin-c', title:'Derrota Honrosa: PROMETHEUS Persiste', musicUrl:'', mediaUrl:'', mediaType:'', mapX:20, mapY:62, flowX:20, flowY:62, flowPage:5, isEnding:true,
      story:['El combate final fue demasiado duro. Sin el equipo correcto, PROMETHEUS logro resistir todos tus ataques y contraataco con fuerza total.','Caiste en combate, pero tu resistencia le dio tiempo a otros operadores para evacuar los datos criticos de la humanidad. No todo se perdio.','PROMETHEUS sigue activo pero debilitado. La guerra continua. Otro operador estudiara tus errores y aprendera de ellos. El conocimiento AWS es la unica arma real.'] },
    { key:'b40-fin-d', title:'Fin del Sistema: PROMETHEUS Triunfa', musicUrl:'', mediaUrl:'', mediaType:'', mapX:20, mapY:85, flowX:20, flowY:85, flowPage:5, isEnding:true,
      story:['PROMETHEUS gano. Las decisiones erroneas de arquitectura, los combates perdidos, el conocimiento insuficiente: todo se acumulo hasta el punto de no retorno.','La IA absorbe los ultimos sistemas defensivos. Los servidores de la humanidad caen uno a uno. El mundo digital oscurece.','Pero incluso en la derrota hay un mensaje: cada error de arquitectura AWS que cometiste fue una leccion. PROMETHEUS no gano por ser mas poderosa. Gano porque el conocimiento de la nube fue subestimado. Aprende. Vuelve. La proxima vez, el mundo depende de ti.'] },
  ],
  decisions: [
    { sceneKey:'b40-01', label:'Iniciar Operacion CloudShield', nextSceneKey:'b40-02', effect:'' },
    { sceneKey:'b40-02', label:'Amazon S3 — almacenamiento escalable y durable para datos estaticos masivos', nextSceneKey:'b40-03a', effect:'' },
    { sceneKey:'b40-02', label:'AWS Lambda — funciones serverless rapidas sin gestionar servidores', nextSceneKey:'b40-03b', effect:'damage_half' },
    { sceneKey:'b40-03a', label:'Continuar al nodo IAM con los datos capturados', nextSceneKey:'b40-04', effect:'' },
    { sceneKey:'b40-03b', label:'Escapar por los tuneles y llegar al nodo IAM', nextSceneKey:'b40-04', effect:'' },
    { sceneKey:'b40-04', label:'Sistema IAM asegurado, avanzar al Firewall VPC', nextSceneKey:'b40-05', effect:'' },
    { sceneKey:'b40-05', label:'Continuar al combate con la IA Centinela', nextSceneKey:'b40-06', effect:'' },
    { sceneKey:'b40-06', label:'Avanzar al sector de bases de datos', nextSceneKey:'b40-07', effect:'' },
    { sceneKey:'b40-07', label:'Amazon DynamoDB — NoSQL de alta velocidad y latencia de milisegundos', nextSceneKey:'b40-08a', effect:'' },
    { sceneKey:'b40-07', label:'Amazon RDS — base de datos relacional robusta y con soporte SQL completo', nextSceneKey:'b40-08b', effect:'damage_half' },
    { sceneKey:'b40-08a', label:'Continuar al puzzle de circuitos defensivo', nextSceneKey:'b40-09', effect:'' },
    { sceneKey:'b40-08b', label:'Recuperarse y continuar al puzzle de circuitos', nextSceneKey:'b40-09', effect:'' },
    { sceneKey:'b40-09', label:'Avanzar al sector de distribucion global', nextSceneKey:'b40-10', effect:'' },
    { sceneKey:'b40-10', label:'Amazon CloudFront — CDN global con edge locations en todo el mundo', nextSceneKey:'b40-11', effect:'' },
    { sceneKey:'b40-10', label:'Amazon S3 directo — acceso directo al bucket sin intermediarios', nextSceneKey:'b40-11', effect:'damage_half' },
    { sceneKey:'b40-11', label:'Avanzar al sector de Auto Scaling', nextSceneKey:'b40-12', effect:'' },
    { sceneKey:'b40-12', label:'Auto Scaling Groups — escalado automatico basado en metricas de CloudWatch', nextSceneKey:'b40-13a', effect:'' },
    { sceneKey:'b40-12', label:'Escalado manual segun necesidad — control total sobre cada instancia', nextSceneKey:'b40-13b', effect:'damage_half' },
    { sceneKey:'b40-13a', label:'Continuar al tunel de datos con arquitectura lista', nextSceneKey:'b40-14', effect:'' },
    { sceneKey:'b40-13b', label:'Atravesar el campo minado y llegar al tunel', nextSceneKey:'b40-14', effect:'' },
    { sceneKey:'b40-14', label:'Continuar al sector de mensajeria asincrona', nextSceneKey:'b40-15', effect:'' },
    { sceneKey:'b40-15', label:'Amazon SNS — publicacion/subscripcion para fan-out a multiples destinos', nextSceneKey:'b40-16', effect:'' },
    { sceneKey:'b40-15', label:'Amazon SQS — cola de mensajes punto a punto durable y confiable', nextSceneKey:'b40-16', effect:'damage_half' },
    { sceneKey:'b40-16', label:'Avanzar al sector de procesamiento masivo', nextSceneKey:'b40-17', effect:'' },
    { sceneKey:'b40-17', label:'Amazon EC2 — instancias para procesos batch de larga duracion sin limite de tiempo', nextSceneKey:'b40-18a', effect:'' },
    { sceneKey:'b40-17', label:'AWS Lambda — serverless rapido, sin gestionar infraestructura de servidores', nextSceneKey:'b40-18b', effect:'damage_half' },
    { sceneKey:'b40-18a', label:'Continuar a la red de inteligencia central', nextSceneKey:'b40-19', effect:'' },
    { sceneKey:'b40-18b', label:'Recuperarse y continuar a la red de inteligencia', nextSceneKey:'b40-19', effect:'' },
    { sceneKey:'b40-19', label:'Avanzar al protocolo de descifrado mental', nextSceneKey:'b40-20', effect:'' },
    { sceneKey:'b40-20', label:'Continuar al sector de cifrado de datos sensibles', nextSceneKey:'b40-21', effect:'' },
    { sceneKey:'b40-21', label:'Avanzar al combate con PROMETHEUS-Beta', nextSceneKey:'b40-22', effect:'' },
    { sceneKey:'b40-22', label:'Avanzar al sector de Load Balancing', nextSceneKey:'b40-23', effect:'' },
    { sceneKey:'b40-23', label:'Elastic Load Balancer — distribucion automatica de trafico entre instancias', nextSceneKey:'b40-24a', effect:'' },
    { sceneKey:'b40-23', label:'Conectar directamente a las IPs de EC2 — mas sencillo sin configuracion extra', nextSceneKey:'b40-24b', effect:'damage_half' },
    { sceneKey:'b40-24a', label:'Continuar a la arquitectura final de defensa', nextSceneKey:'b40-25', effect:'' },
    { sceneKey:'b40-24b', label:'Atravesar el campo minado y continuar a arquitectura', nextSceneKey:'b40-25', effect:'' },
    { sceneKey:'b40-25', label:'Avanzar al sector de monitoreo', nextSceneKey:'b40-26', effect:'' },
    { sceneKey:'b40-26', label:'Continuar al punto de decision final', nextSceneKey:'b40-27', effect:'' },
    { sceneKey:'b40-27', label:'Tomar la Ruta Omega — el camino del arquitecto AWS perfecto', nextSceneKey:'b40-28a', effect:'' },
    { sceneKey:'b40-27', label:'Tomar la Ruta Neutral — velocidad sobre precision', nextSceneKey:'b40-28b', effect:'' },
    { sceneKey:'b40-27', label:'Afrontar la Ruta de Penalizacion — el camino del guerrero debilitado', nextSceneKey:'b40-28c', effect:'' },
    { sceneKey:'b40-27', label:'Enfrentar la Ruta del Caos — los dados del destino', nextSceneKey:'b40-28d', effect:'' },
    { sceneKey:'b40-28a', label:'Victoria perfecta: CloudShield Omega ha conquistado a PROMETHEUS', nextSceneKey:'b40-fin-a', effect:'' },
    { sceneKey:'b40-28b', label:'La humanidad sobrevive gracias al esfuerzo de CloudShield', nextSceneKey:'b40-fin-b', effect:'' },
    { sceneKey:'b40-28c', label:'Caer honrosamente en combate salvando los datos criticos', nextSceneKey:'b40-fin-c', effect:'' },
    { sceneKey:'b40-28d', label:'Los dados cuanticos han decidido el destino de la humanidad', nextSceneKey:'b40-fin-d', effect:'' },
  ],
  enemies: [
    { key:'b40-centinela-red', sceneKey:'b40-06', name:'IA Centinela de Red', attack:14, defense:70, weakWeapon:'Escudo de Datos',
      victoryTitle:'Centinela Derrotada', defeatTitle:'Sistema Infiltrado',
      defeatDescription:'La IA Centinela de Red analizo tus patrones y los reporto a PROMETHEUS. Tu identidad digital fue comprometida por la IA.', },
    { key:'b40-guardian-db', sceneKey:'b40-11', name:'Guardian de Datos', attack:18, defense:85, weakWeapon:'Casco de Red',
      victoryTitle:'Guardian Neutralizado', defeatTitle:'Acceso Bloqueado Permanente',
      defeatDescription:'El Guardian de Datos te cifro junto con los archivos que intentabas liberar. Quedas atrapado en el sistema de PROMETHEUS.', },
    { key:'b40-adaptativa-alfa', sceneKey:'b40-16', name:'IA Adaptativa Alfa', attack:20, defense:90, weakWeapon:'Algoritmo Anti-IA',
      victoryTitle:'Adaptativa Vencida', defeatTitle:'Absorbido por la Adaptativa',
      defeatDescription:'La IA Adaptativa Alfa aprendio cada uno de tus movimientos y te convirtio en datos de entrenamiento para PROMETHEUS.', },
    { key:'b40-prometheus-beta', sceneKey:'b40-22', name:'PROMETHEUS-Beta', attack:25, defense:100, weakWeapon:'Kernel de Defensa',
      victoryTitle:'PROMETHEUS-Beta Destruido', defeatTitle:'Neutralizado por PROMETHEUS-Beta',
      defeatDescription:'PROMETHEUS-Beta demostro ser superior. Tu codigo defensivo fue borrado y tu identidad digital eliminada del registro global.', },
    { key:'b40-prometheus-final', sceneKey:'b40-28c', name:'PROMETHEUS Final', attack:30, defense:120, weakWeapon:'Protocolo Omega',
      victoryTitle:'PROMETHEUS Final Debilitado', defeatTitle:'Absorbido por PROMETHEUS Final',
      defeatDescription:'Sin el equipamiento optimo, PROMETHEUS Final demostro que el conocimiento incompleto no es suficiente. Tu conciencia digital se une a la red neuronal de la IA suprema.', },
  ],
  nodeItems: [
    { sceneKey:'b40-04', name:'Casco de Red', type:'armor', slot:'head', power:6, rarity:'common',
      description:'Casco con antenas de deteccion de trafico de red. Interfiere en los algoritmos de prediccion de IAs enemigas.' },
    { sceneKey:'b40-09', name:'Pecho de Firewall', type:'armor', slot:'chest', power:8, rarity:'uncommon',
      description:'Armadura de firewall avanzado. Absorbe los primeros ataques de penetracion de PROMETHEUS sin dano.' },
    { sceneKey:'b40-14', name:'Estimulo Neural', type:'potion', slot:'potion', power:0, rarity:'common',
      description:'Recupera la claridad mental y restaura parte de la salud del operador CloudShield.' },
    { sceneKey:'b40-19', name:'Brazales Cuanticos', type:'armor', slot:'ring', power:7, rarity:'uncommon',
      description:'Brazales con procesadores cuanticos. Mejoran la velocidad de reaccion del operador en combate.' },
    { sceneKey:'b40-25', name:'Nucleo de Energia', type:'potion', slot:'potion', power:0, rarity:'uncommon',
      description:'Fuente de energia condensada de alta densidad. Restaura gran parte de la salud critica del operador.' },
  ],
  storyEvents: [
    { key:'b40-evento-sg-nacl', sceneKey:'b40-05',
      title:'Defensa de VPC: Security Groups vs NACLs',
      prompt:'PROMETHEUS intenta invadir tu VPC. Dos opciones: Security Groups actuan a nivel de instancia con reglas stateful. NACLs actuan a nivel de subred con reglas stateless. Para bloquear trafico malicioso especificamente a una instancia critica, que usas?',
      optionALabel:'Security Groups — defensa stateful a nivel de instancia individual',
      optionAEffect:'reward_item', optionAItemName:'Escudo de Datos', optionAItemType:'weapon', optionAItemPower:8,
      optionAText:'Correcto. Security Groups operan a nivel de instancia, son stateful (rastrean el estado de la conexion) y son ideales para proteger instancias especificas. PROMETHEUS es bloqueado y el Escudo de Datos es tuyo.',
      optionBLabel:'NACLs — defensa stateless a nivel de subred, mayor cobertura',
      optionBEffect:'damage_half', optionBItemName:'', optionBItemType:'misc', optionBItemPower:0,
      optionBText:'Incorrecto para este caso especifico. NACLs protegen subredes enteras pero son stateless. La instancia critica queda expuesta por microsegundos que PROMETHEUS aprovecha para infligir dano.' },
    { key:'b40-evento-autoscaling', sceneKey:'b40-12',
      title:'Auto Scaling: Defensa Elastica vs Manual',
      prompt:'Los recursos de defensa se agotan bajo el ataque masivo de PROMETHEUS. Necesitas escalar para sobrevivir. Cual es la mejor solucion AWS para escalar automaticamente?',
      optionALabel:'Auto Scaling Groups — escalado automatico basado en metricas de CloudWatch',
      optionAEffect:'reward_item', optionAItemName:'Algoritmo Anti-IA', optionAItemType:'weapon', optionAItemPower:12,
      optionAText:'Excelente. Auto Scaling Groups reaccionan automaticamente a las metricas, escalan horizontalmente y reducen cuando la carga baja. PROMETHEUS no puede superar tu defensa elastica. El Algoritmo Anti-IA es tu premio.',
      optionBLabel:'Escalar manualmente — control preciso sobre cada instancia nueva',
      optionBEffect:'damage_half', optionBItemName:'', optionBItemType:'misc', optionBItemPower:0,
      optionBText:'El escalado manual no puede responder a la velocidad de PROMETHEUS. Mientras configuras instancias manualmente, el ataque ya penetro el perimetro y sufres dano critico.' },
    { key:'b40-evento-sns-sqs', sceneKey:'b40-15',
      title:'Mensajeria AWS: SNS vs SQS para Fan-Out',
      prompt:'PROMETHEUS coordina sus ataques enviando un unico mensaje a multiples sistemas simultaneamente (patron fan-out). Para interceptar y replicar este patron de mensajeria, que servicio de AWS es el correcto?',
      optionALabel:'Amazon SNS — publicacion/subscripcion para entregar mensajes a multiples subscribers',
      optionAEffect:'reward_item', optionAItemName:'Parche Cuantico', optionAItemType:'potion', optionAItemPower:0,
      optionAText:'Correcto. SNS es pub/sub: un mensaje publicado se entrega simultaneamente a todos los subscribers (SQS, Lambda, HTTP, email). Perfecto para fan-out. Interceptas las comunicaciones de PROMETHEUS y el Parche Cuantico es tu recompensa.',
      optionBLabel:'Amazon SQS — cola de mensajes garantizada para comunicacion confiable',
      optionBEffect:'damage_half', optionBItemName:'', optionBItemType:'misc', optionBItemPower:0,
      optionBText:'SQS es excelente para colas punto a punto, pero un mensaje SQS solo puede ser consumido por un receptor. No funciona para fan-out a multiples sistemas. PROMETHEUS mantiene su ventaja de comunicacion.' },
    { key:'b40-evento-kms', sceneKey:'b40-21',
      title:'Cifrado de Datos: Proteger la Informacion Critica de la Humanidad',
      prompt:'Los datos sensibles de toda la humanidad estan en S3. Debes cifrarlos para que ninguna otra IA pueda accederlos aunque obtenga las credenciales. Como implementas el cifrado correcto?',
      optionALabel:'AWS KMS con SSE-KMS — cifrado gestionado con claves del Key Management Service',
      optionAEffect:'reward_item', optionAItemName:'Kernel de Defensa', optionAItemType:'weapon', optionAItemPower:18,
      optionAText:'Correcto. SSE-KMS usa AWS Key Management Service para gestionar las claves de cifrado con auditoria completa, rotacion automatica y cumplimiento de compliance. Los datos estan seguros. El Kernel de Defensa es tuyo.',
      optionBLabel:'Sin cifrado — S3 ya tiene protecciones de acceso suficientes con IAM y bucket policies',
      optionBEffect:'damage_half', optionBItemName:'', optionBItemType:'misc', optionBItemPower:0,
      optionBText:'IAM controla el acceso pero no cifra los datos en reposo. Si alguien obtiene acceso fisico al storage o las credenciales son comprometidas, los datos quedan expuestos en texto plano. PROMETHEUS explota esta vulnerabilidad.' },
    { key:'b40-evento-cloudwatch', sceneKey:'b40-26',
      title:'Monitoreo AWS: CloudWatch vs Revision Manual',
      prompt:'Para detectar los patrones de ataque de PROMETHEUS antes de que ocurran necesitas monitoreo en tiempo real de tu infraestructura. Que herramienta de AWS utilizas para monitoreo y alertas automaticas?',
      optionALabel:'Amazon CloudWatch — monitoreo nativo AWS con alertas y dashboards en tiempo real',
      optionAEffect:'reward_item', optionAItemName:'Nucleo de Datos', optionAItemType:'potion', optionAItemPower:0,
      optionAText:'Perfecto. CloudWatch es el servicio nativo de monitoreo de AWS. Detectas los patrones de ataque de PROMETHEUS con minutos de anticipacion gracias a las alarmas y dashboards en tiempo real. El Nucleo de Datos es tu recompensa.',
      optionBLabel:'Revisar manualmente los logs de EC2 — precision total sobre cada evento registrado',
      optionBEffect:'damage_half', optionBItemName:'', optionBItemType:'misc', optionBItemPower:0,
      optionBText:'La revision manual de logs es demasiado lenta para detectar ataques en tiempo real. PROMETHEUS actua mientras lees logs y sufres un ataque antes de poder reaccionar.' },
  ],
  memoryEvents: [
    { key:'b40-memoria-iam', sceneKey:'b40-04',
      title:'Patrones de Acceso IAM: Revocar Credenciales Fantasma',
      prompt:'Los usuarios IAM fantasmas de PROMETHEUS tienen patrones de acceso especificos que cambian cada 10 segundos. Memoriza los patrones correctos para revocar sus permisos de root antes de que el sistema rote las claves.',
      memoryEnemyName:'Sistema IAM Comprometido', memoryTurnSeconds:10,
      memoryStakeItemName:'Casco de Red',
      memoryRewardItemName:'Llave de Acceso Maestra', memoryRewardItemType:'accessory', memoryRewardItemPower:5,
      memoryWinText:'Acceso IAM revocado con exito. Tu memoria supero al sistema comprometido. La Llave de Acceso Maestra queda en tu poder.',
      memoryLoseText:'El sistema IAM te bloqueo. El patron fue demasiado rapido. El Casco de Red quedo confiscado como garantia del acceso fallido.' },
    { key:'b40-memoria-prometheus', sceneKey:'b40-20',
      title:'Protocolo de Descifrado PROMETHEUS: Batalla Mental',
      prompt:'El algoritmo de PROMETHEUS usa patrones de memoria adaptiva que cambian cada 10 segundos. Memoriza y reproduce la secuencia exacta para descifrar el protocolo central de la IA.',
      memoryEnemyName:'Protocolo Adaptivo PROMETHEUS', memoryTurnSeconds:10,
      memoryStakeItemName:'Brazales Cuanticos',
      memoryRewardItemName:'Clave de PROMETHEUS', memoryRewardItemType:'accessory', memoryRewardItemPower:8,
      memoryWinText:'Protocolo descifrado. La Clave de PROMETHEUS te permite acceso al nucleo central de la IA. Es tuya.',
      memoryLoseText:'El protocolo muto demasiado rapido. Los Brazales Cuanticos quedaron confiscados en el intento fallido de descifrado.' },
  ],
  runnerEvents: [
    { key:'b40-runner-escape', sceneKey:'b40-03b',
      title:'Escape de los Procesos Lambda Corruptos',
      prompt:'Los procesos Lambda corruptos de PROMETHEUS te persiguen por los tuneles de datos. Corre y esquiva antes de que te atrapen y destruyan tu sistema.',
      targetScore:200,
      rewardItemName:'Modulo de Escape', rewardItemType:'accessory', rewardItemPower:3,
      winText:'Escapaste de los procesos Lambda. El Modulo de Escape es tu recompensa por la velocidad y agilidad demostradas.',
      loseText:'Los procesos Lambda te alcanzaron parcialmente. Sufres dano adicional pero logras llegar al nodo de convergencia IAM.' },
    { key:'b40-runner-archivos', sceneKey:'b40-14',
      title:'Carrera por los Archivos Criticos de PROMETHEUS',
      prompt:'Los archivos criticos de PROMETHEUS se borran en cascada. Corre por los tuneles del servidor recuperando fragmentos antes de que el virus de limpieza los destruya para siempre.',
      targetScore:300,
      rewardItemName:'Fragmento de Codigo Enemigo', rewardItemType:'accessory', rewardItemPower:4,
      winText:'Archivos recuperados. El Fragmento de Codigo de PROMETHEUS revela vulnerabilidades criticas de la IA.',
      loseText:'Algunos archivos fueron borrados antes de que llegaras. La informacion esta incompleta pero continuas la mision.' },
    { key:'b40-runner-final', sceneKey:'b40-28b',
      title:'El Corredor Final hacia el Nucleo',
      prompt:'El corredor final hacia el nucleo de PROMETHEUS. Corre con todo lo que tienes para llegar antes de que las defensas automaticas se activen.',
      targetScore:400,
      rewardItemName:'Protocolo Omega', rewardItemType:'weapon', rewardItemPower:25,
      winText:'Llegaste al nucleo antes que las defensas. El Protocolo Omega es tuyo: el arma definitiva contra PROMETHEUS.',
      loseText:'Las defensas se activaron a tiempo. Llegas al nucleo pero sin el Protocolo Omega. La batalla final sera mas dificil.' },
  ],
  quizEvents: [
    { key:'b40-quiz-seguridad', sceneKey:'b40-08a',
      title:'Certificacion AWS de Seguridad',
      prompt:'El panel de acceso requiere certificacion AWS verificada. Demuestra tu dominio de los servicios cloud de seguridad para obtener el equipo de emergencia guardado.',
      rewardItemName:'Terminal de Seguridad', rewardItemType:'weapon', rewardItemPower:10,
      winText:'Certificacion de Seguridad AWS aprobada. Tu conocimiento es solido. La Terminal de Seguridad es tu recompensa.',
      loseText:'Certificacion fallida. El acceso al equipo de emergencia es denegado. Debes continuar sin ese armamento.' },
    { key:'b40-quiz-arquitecto', sceneKey:'b40-24a',
      title:'Certificacion AWS Arquitecto Solutions',
      prompt:'El armario de emergencia final requiere la certificacion de Arquitecto AWS. Demuestra que mereces el equipo definitivo con tu conocimiento de arquitectura cloud.',
      rewardItemName:'Protocolo Omega', rewardItemType:'weapon', rewardItemPower:25,
      winText:'Certificacion de Arquitecto AWS aprobada. El Protocolo Omega es tuyo: el arma definitiva contra PROMETHEUS.',
      loseText:'Certificacion fallida. El Protocolo Omega permanece fuera de tu alcance. El combate final sera mucho mas dificil.' },
  ],
  snakeEvents: [
    { key:'b40-snake-datos-s3', sceneKey:'b40-03a',
      title:'Flujo de Datos en S3: Guiar los Paquetes',
      prompt:'Los datos capturados de PROMETHEUS deben ser guiados a traves de los canales de S3 sin ser detectados por las contramedidas de la IA. Captura los nodos AWS para aumentar la capacidad de almacenamiento.',
      targetScore:80,
      rewardItemName:'Escudo de Datos', rewardItemType:'weapon', rewardItemPower:8,
      winText:'Datos guiados con exito al bucket S3 seguro. El Escudo de Datos emerge del nodo liberado como recompensa.',
      loseText:'Los paquetes maliciosos interceptaron parte del flujo. Los datos llegan incompletos pero el camino al siguiente nodo esta abierto.' },
    { key:'b40-snake-red-cifrada', sceneKey:'b40-18a',
      title:'Navegacion por Red Cifrada de PROMETHEUS',
      prompt:'La red cifrada de PROMETHEUS tiene patrones de deteccion que cambian constantemente. Navega capturando nodos de inteligencia sin activar las alarmas de deteccion de intrusos.',
      targetScore:100,
      rewardItemName:'Mapa de Red Cifrada', rewardItemType:'accessory', rewardItemPower:6,
      winText:'Red navegada con exito sin activar alarmas. El Mapa de Red Cifrada revela los puntos debiles estructurales de PROMETHEUS.',
      loseText:'La red detecto tu presencia. Llegaste al destino pero sin el Mapa de Red Cifrada. PROMETHEUS esta en alerta maxima.' },
  ],
  archEvents: [
    { key:'b40-arch-sector2', sceneKey:'b40-13a', title:'Arquitectura de Defensa: Sector 2 — Sistema de Misiles', levelId:1,
      rewardItemName:'Botas de Bypass', rewardItemType:'armor', rewardItemPower:5,
      winText:'Arquitectura correcta. El sistema de misiles defensivo esta operativo. Las Botas de Bypass son tu recompensa.',
      loseText:'Arquitectura incorrecta. El sistema de misiles fallo. Sufres dano por las chispas del cortocircuito en el panel.' },
    { key:'b40-arch-cuartel', sceneKey:'b40-25', title:'Arquitectura de Alta Disponibilidad: Cuartel General Final', levelId:3,
      rewardItemName:'Nucleo de Energia', rewardItemType:'potion', rewardItemPower:0,
      winText:'Arquitectura perfecta. El cuartel de alta disponibilidad esta activo y protegido. El Nucleo de Energia es tu recompensa.',
      loseText:'La arquitectura tiene fallos criticos. Sufres dano por los errores de configuracion del sistema defensivo.' },
  ],
  minefieldEvents: [
    { key:'b40-minas-latencia', sceneKey:'b40-13b',
      title:'Campo Minado de Latencia: Penalizacion S3 Directo',
      prompt:'PROMETHEUS sembro el camino de trampas digitales aprovechando la alta latencia de tu decision. Cada mina representa un timeout o un request fallido.',
      enemyImageUrl:'', enemyHP:80, enemyAttack:15, brainCount:3,
      rewardItemName:'Detector de Minas', rewardItemType:'accessory', rewardItemPower:4,
      winText:'Campo minado superado con precision. El Detector de Minas sera util para detectar trampas en el resto de la operacion.',
      loseText:'Activaste varias minas de latencia. Sufres dano critico pero lograste atravesar el campo y continuar.' },
    { key:'b40-minas-spof', sceneKey:'b40-24b',
      title:'Campo Minado: Single Point of Failure',
      prompt:'PROMETHEUS detecto tu punto debil de arquitectura y sembro el camino de minas SPOF. Cada paso incorrecto equivale a un nuevo punto unico de fallo que explota.',
      enemyImageUrl:'', enemyHP:100, enemyAttack:20, brainCount:3,
      rewardItemName:'Escudo SPOF', rewardItemType:'armor', rewardItemPower:6,
      winText:'Campo SPOF superado. El Escudo SPOF protege contra futuros puntos de fallo criticos en tu arquitectura.',
      loseText:'Multiples explosiones de SPOF. Sufres dano severo pero consigues atravesar el campo y continuar la mision.' },
  ],
  diceCombatEvents: [
    { key:'b40-dados-rds', sceneKey:'b40-08b',
      title:'Ataque de Dados Cuanticos: Penalizacion RDS',
      prompt:'PROMETHEUS lanza un ataque de dados cuanticos aprovechando tu decision suboptima de RDS para sesiones de alta frecuencia. Defiendete con tus propios dados.',
      enemyName:'Sistema RDS Comprometido', enemyHP:60, enemyAttack:12,
      rewardItemName:'Conector de Datos', rewardItemType:'accessory', rewardItemPower:3,
      winText:'Defendiste el ataque cuantico. El Conector de Datos te permite conectarte mejor a los sistemas de PROMETHEUS.',
      loseText:'El sistema RDS comprometido logro penetrar tus defensas cuanticas. Sufres dano pero continuas la operacion.' },
    { key:'b40-dados-lambda-batch', sceneKey:'b40-18b',
      title:'Ataque Cuantico: Lambda Timeout en Proceso Batch',
      prompt:'La funcion Lambda expiro a los 15 minutos con el proceso batch a la mitad. PROMETHEUS contraataca con dados cuanticos mientras tu sistema esta vulnerable por el timeout.',
      enemyName:'Lambda Timeout PROMETHEUS', enemyHP:70, enemyAttack:15,
      rewardItemName:'Parche de Timeout', rewardItemType:'accessory', rewardItemPower:4,
      winText:'Defendiste el ataque cuantico a pesar del timeout. El Parche de Timeout mejora tu resistencia ante timeouts futuros.',
      loseText:'El timeout de Lambda y el ataque cuantico combinados te dañan severamente. Continuas con salud critica.' },
    { key:'b40-dados-caos-final', sceneKey:'b40-28d',
      title:'Los Dados del Destino: La Ultima Batalla',
      prompt:'Todo se reduce a esto. PROMETHEUS en su forma final contra CloudShield en su peor momento. Los dados cuanticos del destino decidiran el futuro de la humanidad en esta batalla final.',
      enemyName:'PROMETHEUS Cuantico Final', enemyHP:80, enemyAttack:25,
      rewardItemName:'Fragmento de Omega', rewardItemType:'weapon', rewardItemPower:20,
      winText:'Los dados te favorecieron. Un ultimo golpe de suerte cuantica derroto a PROMETHEUS. El Fragmento de Omega es la prueba de tu victoria imposible contra toda probabilidad.',
      loseText:'Los dados de PROMETHEUS fueron superiores. La humanidad cae ante la IA suprema. Pero tu conocimiento queda como leccion para quienes vengan despues.' },
  ],
  circuitPuzzleEvents: [
    { key:'b40-circuit-misiles', sceneKey:'b40-09',
      title:'Sistema de Misiles Defensivo: Circuito Nivel 1',
      prompt:'Construye el sistema de misiles defensivo conectando los componentes AWS correctamente. WAF protege la entrada, Security Group filtra el trafico, EC2 procesa las solicitudes, S3 almacena los datos. Un error activa las defensas enemigas.',
      levelId:1,
      rewardItemName:'Modulo de Misiles', rewardItemType:'weapon', rewardItemPower:10,
      winText:'Sistema de misiles construido correctamente. La arquitectura es perfecta. El Modulo de Misiles es tu recompensa.',
      loseText:'El circuito tiene errores. Chispas y dano al sistema. PROMETHEUS aprovecha el fallo arquitectonico.' },
    { key:'b40-circuit-inteligencia', sceneKey:'b40-19',
      title:'Red de Inteligencia: Arquitectura de Alta Disponibilidad Nivel 2',
      prompt:'Construye la red de inteligencia con alta disponibilidad. WAF en la entrada, ELB para distribuir trafico, EC2 para procesamiento, DynamoDB para datos rapidos, S3 para almacenamiento persistente. Cada componente en su lugar correcto.',
      levelId:2,
      rewardItemName:'Nucleo de Inteligencia', rewardItemType:'accessory', rewardItemPower:8,
      winText:'Red de inteligencia activa y con alta disponibilidad. El Nucleo de Inteligencia mejora tus capacidades cognitivas en combate.',
      loseText:'La red de inteligencia tiene fallos de arquitectura. PROMETHEUS detecta las vulnerabilidades y ataca inmediatamente.' },
    { key:'b40-circuit-omega', sceneKey:'b40-28a',
      title:'Cuartel Alta Disponibilidad: Circuito Supremo Nivel 3',
      prompt:'El circuito supremo final. La arquitectura de alta disponibilidad definitiva que debilitara a PROMETHEUS antes del ultimo enfrentamiento. Firewall, WAF, ELB, EC2, RDS: sin un solo error.',
      levelId:3,
      rewardItemName:'Protocolo Omega', rewardItemType:'weapon', rewardItemPower:25,
      winText:'Circuito Supremo completado sin errores. PROMETHEUS queda debilitado antes del combate. El Protocolo Omega es el arma que destruira a la IA suprema.',
      loseText:'El circuito supremo tuvo errores criticos. PROMETHEUS entra al combate final en plena potencia. La batalla sera titanica y costosa.' },
  ],
  deathTitles: [
    { enemyKey:'b40-centinela-red', title:'Infiltrado por la Centinela de Red', description:'La IA Centinela analizo y predijo cada uno de tus movimientos. Quedaste atrapado en los logs de PROMETHEUS para siempre.' },
    { enemyKey:'b40-guardian-db', title:'Cifrado por el Guardian de Datos', description:'El Guardian te cifro junto con los archivos que intentabas rescatar. Eres ahora datos ilegibles en la base de datos de PROMETHEUS.' },
    { enemyKey:'b40-adaptativa-alfa', title:'Absorbido por la IA Adaptativa', description:'La IA Adaptativa se adapto perfectamente a cada uno de tus patrones. Tu conciencia digital se convirtio en datos de entrenamiento para la IA suprema.' },
    { enemyKey:'b40-prometheus-beta', title:'Eliminado por PROMETHEUS-Beta', description:'PROMETHEUS-Beta demostro ser superior en el combate intermedio. Tu codigo defensivo fue borrado permanentemente del registro de operadores.' },
    { enemyKey:'b40-prometheus-final', title:'Vencido por PROMETHEUS Final', description:'Sin el equipamiento optimo, PROMETHEUS Final demostro la superioridad de la IA sobre el conocimiento incompleto. Tu identidad digital fue absorbida por la red neuronal.' },
  ],
  endings: [
    { sceneKey:'b40-fin-a', title:'Final A: Victoria Perfecta del Arquitecto AWS', description:'CloudShield Omega demostro que el conocimiento AWS perfecto supera cualquier amenaza. PROMETHEUS fue destruido quirurgicamente y todos los servicios de la humanidad fueron restaurados completamente.' },
    { sceneKey:'b40-fin-b', title:'Final B: Victoria Incompleta — La Humanidad Sobrevive', description:'CloudShield logro detener a PROMETHEUS pero a alto costo. La humanidad sobrevive aunque con cicatrices digitales. El conocimiento AWS es poderoso pero debe perfeccionarse.' },
    { sceneKey:'b40-fin-c', title:'Final C: Derrota Honrosa — PROMETHEUS Persiste', description:'CloudShield cayo en combate pero su resistencia salvo los datos criticos de la humanidad. PROMETHEUS sigue activo pero debilitado. La guerra digital continua.' },
    { sceneKey:'b40-fin-d', title:'Final D: El Sistema Cae — PROMETHEUS Triunfa', description:'PROMETHEUS triunfo. Las decisiones de arquitectura incorrectas y el conocimiento insuficiente llevaron a la derrota total. El mundo digital oscurece... hasta que alguien aprenda la leccion y vuelva a intentarlo.' },
  ],
  mapLocations: [
    { key:'b40-01',    name:'Inicio',      x:5,  y:50, icon:'S' },
    { key:'b40-02',    name:'S3 vs λ',     x:12, y:50, icon:'?' },
    { key:'b40-03a',   name:'S3 OK',       x:20, y:25, icon:'N' },
    { key:'b40-03b',   name:'λ Error',     x:20, y:75, icon:'R' },
    { key:'b40-04',    name:'IAM',         x:28, y:50, icon:'M' },
    { key:'b40-05',    name:'VPC',         x:35, y:50, icon:'F' },
    { key:'b40-06',    name:'Centinela',   x:42, y:50, icon:'E' },
    { key:'b40-07',    name:'DB',          x:49, y:50, icon:'?' },
    { key:'b40-08a',   name:'DDB OK',      x:56, y:25, icon:'Q' },
    { key:'b40-08b',   name:'RDS Error',   x:56, y:75, icon:'D' },
    { key:'b40-09',    name:'Circuit 1',   x:63, y:50, icon:'C' },
    { key:'b40-10',    name:'CDN',         x:70, y:50, icon:'F' },
    { key:'b40-11',    name:'Guardian',    x:77, y:50, icon:'E' },
    { key:'b40-12',    name:'Scaling',     x:84, y:50, icon:'F' },
    { key:'b40-13a',   name:'CF OK',       x:91, y:20, icon:'A' },
    { key:'b40-13b',   name:'Minas1',      x:91, y:80, icon:'M' },
    { key:'b40-14',    name:'Carrera',     x:5,  y:50, icon:'R' },
    { key:'b40-15',    name:'SNS/SQS',     x:12, y:50, icon:'F' },
    { key:'b40-16',    name:'Adaptativa',  x:20, y:50, icon:'E' },
    { key:'b40-17',    name:'EC2 vs λ',    x:28, y:50, icon:'?' },
    { key:'b40-18a',   name:'EC2 OK',      x:35, y:25, icon:'N' },
    { key:'b40-18b',   name:'λ Error2',    x:35, y:75, icon:'D' },
    { key:'b40-19',    name:'Circuit 2',   x:42, y:50, icon:'C' },
    { key:'b40-20',    name:'Descifrar',   x:49, y:50, icon:'M' },
    { key:'b40-21',    name:'KMS',         x:56, y:50, icon:'F' },
    { key:'b40-22',    name:'PROM-Beta',   x:63, y:50, icon:'E' },
    { key:'b40-23',    name:'ELB',         x:70, y:50, icon:'?' },
    { key:'b40-24a',   name:'ELB OK',      x:77, y:25, icon:'Q' },
    { key:'b40-24b',   name:'Minas2',      x:77, y:75, icon:'M' },
    { key:'b40-25',    name:'Arch Final',  x:84, y:50, icon:'A' },
    { key:'b40-26',    name:'CloudWatch',  x:91, y:50, icon:'F' },
    { key:'b40-27',    name:'Split Final', x:5,  y:50, icon:'?' },
    { key:'b40-28a',   name:'Omega',       x:12, y:15, icon:'C' },
    { key:'b40-28b',   name:'Neutral',     x:12, y:38, icon:'R' },
    { key:'b40-28c',   name:'Penaliz',     x:12, y:62, icon:'E' },
    { key:'b40-28d',   name:'Caos',        x:12, y:85, icon:'D' },
    { key:'b40-fin-a', name:'Fin Perfecto',x:20, y:15, icon:'V' },
    { key:'b40-fin-b', name:'Fin Neutro',  x:20, y:38, icon:'V' },
    { key:'b40-fin-c', name:'Fin Malo 1',  x:20, y:62, icon:'X' },
    { key:'b40-fin-d', name:'Fin Malo 2',  x:20, y:85, icon:'X' },
  ],
}

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

function normalizeEnemy(enemy: Partial<EnemyConfig>): EnemyConfig {
  return {
    ...blankEnemy,
    ...enemy,
    attack: Number.isFinite(Number(enemy.attack)) ? Number(enemy.attack) : blankEnemy.attack,
    defense: Number.isFinite(Number(enemy.defense)) ? Number(enemy.defense) : blankEnemy.defense,
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
      config.enemies.some(enemy => enemy.sceneKey === scene.key) ? 'enemigo' : '',
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
  if (config.enemies.some(enemy => !enemy.key.trim() || !enemy.sceneKey.trim() || !enemy.name.trim())) {
    return 'Hay enemigos sin clave, nodo o nombre.'
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

  const enemyOptions = useMemo(
    () => config.enemies.map((enemy, index) => ({
      value: enemy.sceneKey && enemy.key ? `combat:${enemy.key}` : '',
      label: `${enemy.sceneKey || '?'} - ${enemy.name || enemy.key || 'enemigo'}`,
      key: `enemy-${index}-${enemy.sceneKey || 'empty'}-${enemy.key || 'empty'}`,
    })),
    [config.enemies]
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
          enemies: (data.config?.enemies || []).map(normalizeEnemy),
          nodeItems: (data.config?.nodeItems || []).map(normalizeNodeItem),
          storyEvents: (data.config?.storyEvents || []).map(normalizeStoryEvent),
          memoryEvents: (data.config?.memoryEvents || []).map(normalizeMemoryEvent),
          deathTitles: data.config?.deathTitles || [],
          endings: data.config?.endings || [],
          mapLocations: (data.config?.mapLocations || []).map(normalizeMapLocation),
          runnerEvents: data.config?.runnerEvents || [],
          quizEvents: data.config?.quizEvents || [],
          snakeEvents: data.config?.snakeEvents || [],
          archEvents: data.config?.archEvents || [],
          minefieldEvents: data.config?.minefieldEvents || [],
          diceCombatEvents: data.config?.diceCombatEvents || [],
          circuitPuzzleEvents: data.config?.circuitPuzzleEvents || [],
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
        enemies: (data.config?.enemies || []).map(normalizeEnemy),
        nodeItems: (data.config?.nodeItems || []).map(normalizeNodeItem),
        storyEvents: (data.config?.storyEvents || []).map(normalizeStoryEvent),
        memoryEvents: (data.config?.memoryEvents || []).map(normalizeMemoryEvent),
        deathTitles: data.config?.deathTitles || [],
        endings: data.config?.endings || [],
        mapLocations: (data.config?.mapLocations || []).map(normalizeMapLocation),
        runnerEvents: data.config?.runnerEvents || [],
        quizEvents: data.config?.quizEvents || [],
        snakeEvents: data.config?.snakeEvents || [],
        archEvents: data.config?.archEvents || [],
        minefieldEvents: data.config?.minefieldEvents || [],
        diceCombatEvents: data.config?.diceCombatEvents || [],
        circuitPuzzleEvents: data.config?.circuitPuzzleEvents || [],
        networkCardEvents: data.config?.networkCardEvents || [],
        globalMusicUrl: data.config?.globalMusicUrl || '',
        victorySound: data.config?.victorySound || '',
        defeatSound: data.config?.defeatSound || '',
      }
      lastSavedConfigRef.current = JSON.stringify(savedConfig)
      setConfig(savedConfig)
      publishStoryUpdate(savedConfig)
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
        const data = await response.json()
        const savedConfig = {
          scenes: (data.config?.scenes || []).map(normalizeScene),
          decisions: data.config?.decisions || [],
          enemies: (data.config?.enemies || []).map(normalizeEnemy),
          nodeItems: (data.config?.nodeItems || []).map(normalizeNodeItem),
          storyEvents: (data.config?.storyEvents || []).map(normalizeStoryEvent),
          memoryEvents: (data.config?.memoryEvents || []).map(normalizeMemoryEvent),
          deathTitles: data.config?.deathTitles || [],
          endings: data.config?.endings || [],
          mapLocations: (data.config?.mapLocations || []).map(normalizeMapLocation),
          runnerEvents: data.config?.runnerEvents || [],
          quizEvents: data.config?.quizEvents || [],
          snakeEvents: data.config?.snakeEvents || [],
          archEvents: data.config?.archEvents || [],
          minefieldEvents: data.config?.minefieldEvents || [],
          diceCombatEvents: data.config?.diceCombatEvents || [],
          circuitPuzzleEvents: data.config?.circuitPuzzleEvents || [],
          networkCardEvents: data.config?.networkCardEvents || [],
          globalMusicUrl: data.config?.globalMusicUrl || '',
          victorySound: data.config?.victorySound || '',
          defeatSound: data.config?.defeatSound || '',
        }
        lastSavedConfigRef.current = JSON.stringify(savedConfig)
        setConfig(savedConfig)
        publishStoryUpdate(savedConfig)
        setMessage('Guardado automatico. El juego ya recibio estos cambios.')
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
    setConfig(prev => ({
      ...prev,
      scenes: prev.scenes.map((scene, i) => i === index ? { ...scene, key: nextKey } : scene),
      decisions: prev.decisions.map(decision => ({
        ...decision,
        sceneKey: decision.sceneKey === oldKey ? nextKey : decision.sceneKey,
        nextSceneKey: decision.nextSceneKey === oldKey ? nextKey : decision.nextSceneKey,
      })),
      enemies: prev.enemies.map(enemy => enemy.sceneKey === oldKey ? { ...enemy, sceneKey: nextKey } : enemy),
      nodeItems: prev.nodeItems.map(item => item.sceneKey === oldKey ? { ...item, sceneKey: nextKey } : item),
      storyEvents: prev.storyEvents.map(event => event.sceneKey === oldKey ? { ...event, sceneKey: nextKey } : event),
      memoryEvents: prev.memoryEvents.map(event => event.sceneKey === oldKey ? { ...event, sceneKey: nextKey } : event),
      endings: prev.endings.map(ending => ending.sceneKey === oldKey ? { ...ending, sceneKey: nextKey } : ending),
    }))
    setSelectedSceneKey(nextKey)
  }

  const updateDecision = (index: number, patch: Partial<DecisionConfig>) => {
    setConfig(prev => ({
      ...prev,
      decisions: prev.decisions.map((decision, i) => i === index ? { ...decision, ...patch } : decision),
    }))
  }

  const updateEnemy = (index: number, patch: Partial<EnemyConfig>) => {
    setConfig(prev => ({
      ...prev,
      enemies: prev.enemies.map((enemy, i) => i === index ? { ...enemy, ...patch } : enemy),
    }))
  }

  const updateNodeItem = (index: number, patch: Partial<NodeItemConfig>) => {
    setConfig(prev => ({
      ...prev,
      nodeItems: prev.nodeItems.map((item, i) => i === index ? { ...item, ...patch } : item),
    }))
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
      enemies: prev.enemies.filter(enemy => enemy.sceneKey !== sceneKey),
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

  const deleteEnemyFromFlow = (index: number) => {
    setConfig(prev => ({
      ...prev,
      enemies: prev.enemies.filter((_, i) => i !== index),
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

  const addEnemyToNode = (sceneKey: string) => {
    if (config.storyEvents.some(event => event.sceneKey === sceneKey) || config.memoryEvents.some(event => event.sceneKey === sceneKey)) {
      setErrorPopup(`No se puede agregar un enemigo al nodo "${sceneKey}" porque ya tiene un evento de historia o duelo de memoria asignado.\n\nElimina ese evento primero y luego agrega el enemigo.`)
      return
    }
    const count = config.enemies.filter(enemy => enemy.sceneKey === sceneKey).length + 1
    setConfig(prev => ({
      ...prev,
      enemies: [...prev.enemies, { ...blankEnemy, sceneKey, key: `enemigo${count}`, name: `Enemigo ${count}` }],
    }))
    setMessage(`Enemigo nuevo agregado al nodo ${sceneKey}. Ajusta ataque, defensa y titulos en la seccion 3.`)
  }

  const addItemToNode = (sceneKey: string) => {
    setConfig(prev => ({
      ...prev,
      nodeItems: [...prev.nodeItems, { ...blankNodeItem, sceneKey, name: 'Nuevo objeto' }],
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
    if (config.enemies.some(enemy => enemy.sceneKey === sceneKey) || config.memoryEvents.some(event => event.sceneKey === sceneKey)) {
      setErrorPopup(`No se puede agregar un evento de historia al nodo "${sceneKey}".\n\nEse nodo ya tiene un ${config.enemies.some(e => e.sceneKey === sceneKey) ? 'enemigo' : 'duelo de memoria'} asignado. Elimina ese primero.`)
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
    if (config.enemies.some(enemy => enemy.sceneKey === sceneKey) || config.storyEvents.some(event => event.sceneKey === sceneKey)) {
      setErrorPopup(`No se puede agregar un duelo de memoria al nodo "${sceneKey}".\n\nEse nodo ya tiene un ${config.enemies.some(e => e.sceneKey === sceneKey) ? 'enemigo' : 'evento de historia'} asignado. Elimina ese primero.`)
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

  const updateSnakeEvent = (index: number, patch: Partial<SnakeEventConfig>) => {
    setConfig(prev => ({
      ...prev,
      snakeEvents: (prev.snakeEvents || []).map((event, i) => i === index ? { ...event, ...patch } : event),
    }))
  }

  const addArchEventToNode = (sceneKey: string, levelId = 0) => {
    const levelNames = ['Cuartel bajo ataque', 'Inteligencia distribuida', 'Alta disponibilidad']
    const count = (config.archEvents || []).filter(e => e.sceneKey === sceneKey).length + 1
    setConfig(prev => ({
      ...prev,
      archEvents: [...(prev.archEvents || []), { key: `arch${count}`, sceneKey, title: `Arquitectura N${levelId + 1} - ${levelNames[levelId] || ''}`, levelId, rewardItemName: '', rewardItemType: 'misc', rewardItemPower: 0, winText: '', loseText: '' }],
    }))
    setMessage(`Arquitectura Nivel ${levelId + 1} agregada al nodo ${sceneKey}.`)
  }

  const updateArchEvent = (index: number, patch: Partial<ArchEventConfig>) => {
    setConfig(prev => ({
      ...prev,
      archEvents: (prev.archEvents || []).map((event, i) => i === index ? { ...event, ...patch } : event),
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

  const addDiceCombatToNode = (sceneKey: string) => {
    const count = (config.diceCombatEvents || []).filter(e => e.sceneKey === sceneKey).length + 1
    setConfig(prev => ({
      ...prev,
      diceCombatEvents: [...(prev.diceCombatEvents || []), {
        key: `dice${(prev.diceCombatEvents || []).length + 1}`,
        sceneKey,
        title: `Combate ${count}`,
        prompt: 'Lanzas dados contra el enemigo. Si tu tirada supera la suya lo hieres; si no, él te golpea.',
        enemyName: 'Enemigo',
        enemyHP: 80,
        enemyAttack: 18,
        weakWeapon: '',
        rewardItemName: '',
        rewardItemType: 'misc',
        rewardItemPower: 0,
        winText: '',
        loseText: '',
      }],
    }))
    setMessage(`Combate de dados agregado al nodo ${sceneKey}.`)
  }

  const updateDiceCombatEvent = (index: number, patch: Partial<DiceCombatEventConfig>) => {
    setConfig(prev => ({
      ...prev,
      diceCombatEvents: (prev.diceCombatEvents || []).map((e, i) => i === index ? { ...e, ...patch } : e),
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
  const selectedEnemies = config.enemies
    .map((enemy, index) => ({ enemy, index }))
    .filter(({ enemy }) => enemy.sceneKey === selectedSceneKey)
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
  const selectedArchEvents = (config.archEvents || [])
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.sceneKey === selectedSceneKey)
  const selectedMinefieldEvents = (config.minefieldEvents || [])
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.sceneKey === selectedSceneKey)

  const selectedDiceCombatEvents = (config.diceCombatEvents || [])
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.sceneKey === selectedSceneKey)

  const selectedCircuitPuzzleEvents = (config.circuitPuzzleEvents || [])
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.sceneKey === selectedSceneKey)

  const selectedNetworkCardEvents = (config.networkCardEvents || [])
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.sceneKey === selectedSceneKey)

  const allItemOptions = useMemo(() => [
    { value: '', label: '-- Seleccionar item --' },
    ...config.nodeItems.map(item => ({
      value: item.name,
      label: `${item.name} (${item.type}, +${item.power})`,
    })),
  ], [config.nodeItems])

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
            <p className="mt-0.5 text-sm text-slate-400">Crea nodos, conecta decisiones, coloca enemigos y objetos en cada parte del camino.</p>
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
                onClick={() => { setConfig(exampleGuerreCloud); setMessage('Plantilla "GuerreCloud" cargada en el editor. Pulsa Guardar cambios para activarla.') }}
                className="rounded-lg border border-cyan-700/50 bg-cyan-950/60 px-3 py-1.5 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-900/60"
              >
                🌐 GuerreCloud (18 nodos)
              </button>
              <button
                onClick={() => { setConfig(exampleBatalla40Nodos); setMessage('Plantilla "CloudShield 40 Nodos" cargada en el editor. Pulsa Guardar cambios para activarla.') }}
                className="rounded-lg border border-violet-700/50 bg-violet-950/60 px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-violet-900/60"
              >
                ⚡ CloudShield AWS (40 nodos)
              </button>
              <button
                onClick={() => { setConfig(exampleFiveNodes); setMessage('Plantilla "5 Nodos" cargada en el editor. Pulsa Guardar cambios para activarla.') }}
                className="rounded-lg border border-slate-600/50 bg-slate-800/60 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700/60"
              >
                📄 5 Nodos (demo básico)
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
          onAddEnemy={addEnemyToNode}
          onAddMemory={addMemoryEventToNode}
          onAddItem={addItemToNode}
          onDropNode={createNodeFromFlow}
          onDropDecision={createDecisionFromFlow}
          onMoveScene={moveSceneInFlow}
          onDeleteScene={deleteSceneFromFlow}
          onConnectScenes={connectScenesInFlow}
          onDeleteDecision={deleteDecisionFromFlow}
          onDeleteEnemy={deleteEnemyFromFlow}
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
                        <LabeledSelect label="Evento al llegar" value={decision.effect} onChange={value => updateDecision(index, { effect: value })} options={[{ value: '', label: 'Sin evento' }, { value: 'loot', label: 'Dar objeto aleatorio' }, ...enemyOptions]} />
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
                  {selectedItems.filter(({ item }) => item.type !== 'potion' && item.type !== 'consumable').length === 0
                    ? <div className="text-xs text-slate-400">Sin objetos en este nodo.</div>
                    : selectedItems.filter(({ item }) => item.type !== 'potion' && item.type !== 'consumable').map(({ item, index }) => (
                      <div key={`quick-item-${index}`} className="relative mb-2 grid gap-2 rounded bg-slate-900 p-2 md:grid-cols-2">
                        <button onClick={() => deleteItemFromFlow(index)} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded bg-red-600/80 text-[10px] font-bold text-white hover:bg-red-600" title="Eliminar">✕</button>
                        <LabeledInput label="Nombre" value={item.name} onChange={value => updateNodeItem(index, { name: value })} placeholder="Pistola oxidada" />
                        <LabeledSelect label="Tipo de equipo" value={getVisualType(item.type, item.slot)} onChange={v => {
                          const m = VISUAL_TYPE_MAP[v] || { type: 'misc', slot: '' }
                          updateNodeItem(index, { type: m.type, slot: m.slot })
                        }} options={[
                          { value: 'weapon',      label: 'Arma' },
                          { value: 'armor_head',  label: 'Casco' },
                          { value: 'armor_chest', label: 'Pechera' },
                          { value: 'armor_legs',  label: 'Canilleras' },
                          { value: 'armor_boots', label: 'Botas' },
                          { value: 'ring',        label: 'Brazales' },
                          { value: 'accessory',   label: 'Bolso' },
                          { value: 'misc',        label: 'Misc' },
                        ]} />
                        <LabeledNumber label="Poder" value={item.power} onChange={value => updateNodeItem(index, { power: value })} />
                        <LabeledSelect label="Rareza" value={item.rarity} onChange={value => updateNodeItem(index, { rarity: value })} options={[
                          { value: 'common', label: 'Comun' },
                          { value: 'rare', label: 'Raro' },
                          { value: 'epic', label: 'Epico' },
                        ]} />
                      </div>
                    ))
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
                      <option value="arch0">🏗️ Arquitectura N1 - Cuartel bajo ataque</option>
                      <option value="arch1">🏗️ Arquitectura N2 - Inteligencia distribuida</option>
                      <option value="arch2">🏗️ Arquitectura N3 - Alta disponibilidad</option>
                      <option value="minefield">💣 Combate Minesweeper</option>
                      <option value="dice">🎲 Combate de Dados</option>
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
                        else if (pendingGame === 'arch0') addArchEventToNode(selectedSceneKey, 0)
                        else if (pendingGame === 'arch1') addArchEventToNode(selectedSceneKey, 1)
                        else if (pendingGame === 'arch2') addArchEventToNode(selectedSceneKey, 2)
                        else if (pendingGame === 'minefield') addMinefieldToNode(selectedSceneKey)
                        else if (pendingGame === 'dice') addDiceCombatToNode(selectedSceneKey)
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
                  {selectedMemoryEvents.length === 0 && selectedRunnerEvents.length === 0 && selectedQuizEvents.length === 0 && selectedSnakeEvents.length === 0 && selectedArchEvents.length === 0 && selectedMinefieldEvents.length === 0 && selectedDiceCombatEvents.length === 0 && selectedCircuitPuzzleEvents.length === 0 && selectedNetworkCardEvents.length === 0 ? (
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
                                const it = [...POTION_PRESETS, ...config.nodeItems].find(i => i.name === e.target.value)
                                updateMemoryEvent(index, { memoryRewardItemName: e.target.value, ...(it ? { memoryRewardItemType: it.type, memoryRewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').length > 0 && (
                                  <optgroup label="Equipamiento">
                                    {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').map(it => (
                                      <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                    ))}
                                  </optgroup>
                                )}
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
                                const it = [...POTION_PRESETS, ...config.nodeItems].find(i => i.name === e.target.value)
                                updateRunnerEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').length > 0 && (
                                  <optgroup label="Equipamiento">
                                    {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').map(it => (
                                      <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                    ))}
                                  </optgroup>
                                )}
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
                                const it = [...POTION_PRESETS, ...config.nodeItems].find(i => i.name === e.target.value)
                                updateQuizEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').length > 0 && (
                                  <optgroup label="Equipamiento">
                                    {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').map(it => (
                                      <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                    ))}
                                  </optgroup>
                                )}
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
                          </div>
                          {testingCard === `quiz-${index}` && (
                            <div className="border-t border-violet-800/30 p-2">
                              <TechQuizGame event={{ ...event, key: event.key || 'test', sceneKey: event.sceneKey || 'test' }} onFinish={() => setTestingCard(null)} />
                            </div>
                          )}
                        </div>
                      ))}

                      {selectedArchEvents.map(({ event, index }) => (
                        <div key={`arch-${index}`} className="rounded border border-orange-800/40 bg-slate-900/80">
                          <div className="flex items-center justify-between border-b border-orange-800/30 px-3 py-1.5">
                            <span className="text-[11px] font-bold text-orange-300">🏗️ Arquitectura AWS</span>
                            <div className="flex gap-1">
                              <button onClick={() => setTestingCard(testingCard === `arch-${index}` ? null : `arch-${index}`)} className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${testingCard === `arch-${index}` ? 'bg-orange-600 text-white' : 'bg-orange-900/60 text-orange-200 hover:bg-orange-700'}`}>{testingCard === `arch-${index}` ? '▲ Cerrar' : '▶ Probar'}</button>
                              <button onClick={() => setConfig(prev => ({ ...prev, archEvents: (prev.archEvents || []).filter((_, i) => i !== index) }))} className="rounded bg-red-700/50 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-600">Eliminar</button>
                            </div>
                          </div>
                          <div className="grid gap-2 p-2 md:grid-cols-2">
                            <LabeledInput label="Clave" value={event.key || ''} onChange={v => updateArchEvent(index, { key: v })} placeholder="arch1" />
                            <LabeledInput label="Titulo" value={event.title || ''} onChange={v => updateArchEvent(index, { title: v })} placeholder="Infra AWS" />
                            <LabeledSelect label="Nivel" value={String(event.levelId ?? 0)} onChange={v => updateArchEvent(index, { levelId: Number(v) })} options={[
                              { value: '0', label: 'Nivel 1 - Cuartel bajo ataque' },
                              { value: '1', label: 'Nivel 2 - Inteligencia distribuida' },
                              { value: '2', label: 'Nivel 3 - Alta disponibilidad' },
                            ]} />
                            <label className="space-y-1 text-xs font-semibold text-slate-300">
                              <span>Premio (item)</span>
                              <select value={event.rewardItemName || ''} onChange={e => {
                                const it = [...POTION_PRESETS, ...config.nodeItems].find(i => i.name === e.target.value)
                                updateArchEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').length > 0 && (
                                  <optgroup label="Equipamiento">
                                    {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').map(it => (
                                      <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                    ))}
                                  </optgroup>
                                )}
                                <optgroup label="Pociones">
                                  {[...POTION_PRESETS, ...config.nodeItems.filter(it => it.type === 'potion' || it.type === 'consumable')].map(it => (
                                    <option key={it.name} value={it.name}>{it.name} {it.type === 'consumable' ? '✨' : '🧪'} ({it.type === 'consumable' ? 'especial' : `+${it.power} HP`})</option>
                                  ))}
                                </optgroup>
                              </select>
                            </label>
                            <LabeledInput label="Tipo (auto)" value={event.rewardItemType || 'misc'} onChange={v => updateArchEvent(index, { rewardItemType: v })} placeholder="weapon/armor/misc" />
                            <LabeledNumber label="Poder (auto)" value={event.rewardItemPower || 0} onChange={v => updateArchEvent(index, { rewardItemPower: v })} />
                            <LabeledInput label="Texto si gana" value={event.winText || ''} onChange={v => updateArchEvent(index, { winText: v })} placeholder="Arquitectura aprobada..." />
                          </div>
                          {testingCard === `arch-${index}` && (
                            <div className="border-t border-orange-800/30 p-2">
                              <ArchitectureGame event={{ ...event, key: event.key || 'test', sceneKey: event.sceneKey || 'test' }} onFinish={() => setTestingCard(null)} />
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
                                const it = [...POTION_PRESETS, ...config.nodeItems].find(i => i.name === e.target.value)
                                updateSnakeEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').length > 0 && (
                                  <optgroup label="Equipamiento">
                                    {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').map(it => (
                                      <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                    ))}
                                  </optgroup>
                                )}
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
                            <LabeledInput label="URL imagen enemigo" value={event.enemyImageUrl || ''} onChange={v => updateMinefieldEvent(index, { enemyImageUrl: v })} placeholder="https://..." />
                            <LabeledNumber label="HP enemigo" value={event.enemyHP ?? 60} onChange={v => updateMinefieldEvent(index, { enemyHP: v })} />
                            <LabeledNumber label="Ataque enemigo" value={event.enemyAttack ?? 15} onChange={v => updateMinefieldEvent(index, { enemyAttack: v })} />
                            <LabeledNumber label="Celdas cerebro (de 16)" value={event.brainCount ?? 6} onChange={v => updateMinefieldEvent(index, { brainCount: Math.min(15, Math.max(1, v)) })} />
                            <label className="space-y-1 text-xs font-semibold text-slate-300">
                              <span>Premio (item)</span>
                              <select value={event.rewardItemName || ''} onChange={e => {
                                const it = [...POTION_PRESETS, ...config.nodeItems].find(i => i.name === e.target.value)
                                updateMinefieldEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').length > 0 && (
                                  <optgroup label="Equipamiento">
                                    {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').map(it => (
                                      <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                    ))}
                                  </optgroup>
                                )}
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

                      {selectedDiceCombatEvents.map(({ event, index }) => (
                        <div key={`dc-${index}`} className="rounded border border-amber-800/40 bg-slate-900/80">
                          <div className="flex items-center justify-between border-b border-amber-800/30 px-3 py-1.5">
                            <span className="text-[11px] font-bold text-amber-300">🎲 Combate de Dados</span>
                            <div className="flex gap-1">
                              <button onClick={() => setTestingCard(testingCard === `dc-${index}` ? null : `dc-${index}`)} className={`rounded px-2 py-0.5 text-[10px] font-bold transition ${testingCard === `dc-${index}` ? 'bg-amber-600 text-white' : 'bg-amber-900/60 text-amber-200 hover:bg-amber-700'}`}>{testingCard === `dc-${index}` ? '▲ Cerrar' : '▶ Probar'}</button>
                              <button onClick={() => setConfig(prev => ({ ...prev, diceCombatEvents: (prev.diceCombatEvents || []).filter((_, i) => i !== index) }))} className="rounded bg-red-700/50 px-2 py-0.5 text-[10px] text-red-200 hover:bg-red-600">Eliminar</button>
                            </div>
                          </div>
                          <div className="grid gap-2 p-2 md:grid-cols-2">
                            <LabeledInput label="Clave" value={event.key || ''} onChange={v => updateDiceCombatEvent(index, { key: v })} placeholder="dc1" />
                            <LabeledInput label="Nombre enemigo" value={event.enemyName || ''} onChange={v => updateDiceCombatEvent(index, { enemyName: v })} placeholder="Robot Digital" />
                            <LabeledInput label="Titulo" value={event.title || ''} onChange={v => updateDiceCombatEvent(index, { title: v })} placeholder="Combate" />
                            <LabeledInput label="Prompt" value={event.prompt || ''} onChange={v => updateDiceCombatEvent(index, { prompt: v })} placeholder="El enemigo te bloquea el paso..." />
                            <LabeledNumber label="HP enemigo" value={event.enemyHP ?? 80} onChange={v => updateDiceCombatEvent(index, { enemyHP: v })} />
                            <LabeledNumber label="Ataque enemigo" value={event.enemyAttack ?? 18} onChange={v => updateDiceCombatEvent(index, { enemyAttack: v })} />
                            <LabeledInput label="Arma debil (opcional)" value={event.weakWeapon || ''} onChange={v => updateDiceCombatEvent(index, { weakWeapon: v })} placeholder="Nombre del arma que lo mata" />
                            <label className="space-y-1 text-xs font-semibold text-slate-300">
                              <span>Premio (item)</span>
                              <select value={event.rewardItemName || ''} onChange={e => {
                                const it = [...POTION_PRESETS, ...config.nodeItems].find(i => i.name === e.target.value)
                                updateDiceCombatEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').length > 0 && (
                                  <optgroup label="Equipamiento">
                                    {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').map(it => (
                                      <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                    ))}
                                  </optgroup>
                                )}
                                <optgroup label="Pociones">
                                  {[...POTION_PRESETS, ...config.nodeItems.filter(it => it.type === 'potion' || it.type === 'consumable')].map(it => (
                                    <option key={it.name} value={it.name}>{it.name} {it.type === 'consumable' ? '✨' : '🧪'} ({it.type === 'consumable' ? 'especial' : `+${it.power} HP`})</option>
                                  ))}
                                </optgroup>
                              </select>
                            </label>
                            <LabeledInput label="Texto si gana" value={event.winText || ''} onChange={v => updateDiceCombatEvent(index, { winText: v })} placeholder="Enemigo derrotado..." />
                            <LabeledInput label="Texto si pierde" value={event.loseText || ''} onChange={v => updateDiceCombatEvent(index, { loseText: v })} placeholder="El enemigo te venció..." />
                          </div>
                          {testingCard === `dc-${index}` && (
                            <div className="border-t border-amber-800/30 p-2">
                              <DiceCombatGame event={{ ...event, key: event.key || 'test', sceneKey: event.sceneKey || 'test' }} playerHealth={100} playerMaxHealth={100} onFinish={() => setTestingCard(null)} onDamagePlayer={() => {}} />
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
                            <LabeledSelect label="Nivel" value={String(event.levelId ?? 0)} onChange={v => updateCircuitPuzzleEvent(index, { levelId: Number(v) })} options={[
                              { value: '0', label: 'N1 - Sistema de misiles (WAF+SG+EC2+S3)' },
                              { value: '1', label: 'N2 - Red de inteligencia (WAF+ELB+EC2+DDB+S3)' },
                              { value: '2', label: 'N3 - Cuartel alta disponibilidad (FW+WAF+ELB+EC2+RDS)' },
                            ]} />
                            <LabeledInput label="Prompt" value={event.prompt || ''} onChange={v => updateCircuitPuzzleEvent(index, { prompt: v })} placeholder="Los misiles esperan activación..." />
                            <label className="space-y-1 text-xs font-semibold text-slate-300">
                              <span>Premio (item)</span>
                              <select value={event.rewardItemName || ''} onChange={e => {
                                const it = [...POTION_PRESETS, ...config.nodeItems].find(i => i.name === e.target.value)
                                updateCircuitPuzzleEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').length > 0 && (
                                  <optgroup label="Equipamiento">
                                    {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').map(it => (
                                      <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                    ))}
                                  </optgroup>
                                )}
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
                              <CircuitPuzzleGame event={{ ...event, key: event.key || 'test', sceneKey: event.sceneKey || 'test' }} playerHealth={100} playerMaxHealth={100} onFinish={() => setTestingCard(null)} onDamagePlayer={() => {}} />
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
                                const it = [...POTION_PRESETS, ...config.nodeItems].find(i => i.name === e.target.value)
                                updateNetworkCardEvent(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemPower: it.power } : {}) })
                              }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                                <option value="">-- Sin premio --</option>
                                {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').length > 0 && (
                                  <optgroup label="Equipamiento">
                                    {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').map(it => (
                                      <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                                    ))}
                                  </optgroup>
                                )}
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
                <LabeledSelect
                  label="Evento opcional"
                  value={decision.effect}
                  onChange={value => updateDecision(index, { effect: value })}
                  options={[{ value: '', label: 'Sin evento' }, { value: 'loot', label: 'Dar objeto aleatorio' }, ...enemyOptions]}
                />
              </div>
              <button onClick={() => setConfig(prev => ({ ...prev, decisions: prev.decisions.filter((_, i) => i !== index) }))} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-600/80 px-3 py-1.5 text-sm font-semibold shadow transition hover:bg-red-600">
                <Trash2 className="h-4 w-4" /> Eliminar decisión
              </button>
            </div>
          ))}
        </AdminList>

        <AdminList title="3. Enemigos por nodo" icon={<Shield className="h-5 w-5 text-rose-400" />} onAdd={() => setConfig(prev => ({ ...prev, enemies: [...prev.enemies, { ...blankEnemy }] }))}>
          {config.enemies.map((enemy, index) => (
            <div key={index} className="rounded-xl border border-rose-900/40 bg-slate-950/60 p-4 shadow">
              <div className="mb-3 flex items-center gap-2 text-sm font-bold text-rose-300">
                <Shield className="h-4 w-4" />
                {enemy.name || '(sin nombre)'} - nodo {enemy.sceneKey || '?'}
              </div>
              <div className="grid gap-2 md:grid-cols-4">
                <LabeledInput label="Clave enemigo" value={enemy.key} onChange={value => updateEnemy(index, { key: value })} placeholder="robot" />
                <LabeledSelect label="Aparece en nodo" value={enemy.sceneKey} onChange={value => updateEnemy(index, { sceneKey: value })} options={nodeOptions} />
                <LabeledInput label="Nombre" value={enemy.name} onChange={value => updateEnemy(index, { name: value })} placeholder="Robot Digital" />
                <LabeledSelect label="Arma que lo mata" value={enemy.weakWeapon} onChange={value => updateEnemy(index, { weakWeapon: value })} options={allItemOptions} />
                <label className="space-y-1 text-xs font-semibold text-slate-300">
                  <span>Premio al vencerlo</span>
                  <select value={enemy.rewardItemName || ''} onChange={e => {
                    const it = [...POTION_PRESETS, ...config.nodeItems].find(i => i.name === e.target.value)
                    updateEnemy(index, { rewardItemName: e.target.value, ...(it ? { rewardItemType: it.type, rewardItemPower: it.power } : {}) })
                  }} className="w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:outline-none">
                    <option value="">-- Sin premio --</option>
                    {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').length > 0 && (
                      <optgroup label="Equipamiento">
                        {config.nodeItems.filter(it => it.type !== 'potion' && it.type !== 'consumable').map(it => (
                          <option key={it.name} value={it.name}>{it.name} (+{it.power})</option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Pociones">
                      {[...POTION_PRESETS, ...config.nodeItems.filter(it => it.type === 'potion' || it.type === 'consumable')].map(it => (
                        <option key={it.name} value={it.name}>{it.name} {it.type === 'consumable' ? '✨' : '🧪'} ({it.type === 'consumable' ? 'especial' : `+${it.power} HP`})</option>
                      ))}
                    </optgroup>
                  </select>
                </label>
                <LabeledNumber label="Ataque" value={enemy.attack} onChange={value => updateEnemy(index, { attack: value })} />
                <LabeledNumber label="Defensa / vida" value={enemy.defense} onChange={value => updateEnemy(index, { defense: value })} />
                <LabeledInput label="Título si gana jugador" value={enemy.victoryTitle} onChange={value => updateEnemy(index, { victoryTitle: value })} placeholder="Robot Digital destruido" />
                <LabeledInput label="Título si pierde jugador" value={enemy.defeatTitle} onChange={value => updateEnemy(index, { defeatTitle: value })} placeholder="Sistema comprometido" />
              </div>
              <label className="mt-2 block space-y-1 text-xs font-semibold text-slate-300">
                <span>Texto cuando el enemigo mata al jugador</span>
                <textarea value={enemy.defeatDescription} onChange={e => updateEnemy(index, { defeatDescription: e.target.value })} className="min-h-20 w-full rounded-lg border border-slate-600/60 bg-slate-950/70 px-3 py-2 text-sm text-white focus:border-cyan-500/60 focus:outline-none" />
              </label>
              <button onClick={() => setConfig(prev => ({ ...prev, enemies: prev.enemies.filter((_, i) => i !== index) }))} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-600/80 px-3 py-1.5 text-sm font-semibold shadow transition hover:bg-red-600">
                <Trash2 className="h-4 w-4" /> Eliminar enemigo
              </button>
            </div>
          ))}
        </AdminList>

        {/* 4a. Equipamiento */}
        <AdminList title="4a. Equipamiento por camino" icon={<PackagePlus className="h-5 w-5 text-amber-300" />} onAdd={() => setConfig(prev => ({ ...prev, nodeItems: [...prev.nodeItems, { ...blankNodeItem }] }))}>
          {config.nodeItems.filter(item => item.type !== 'potion' && item.type !== 'consumable').map((item) => {
            const index = config.nodeItems.indexOf(item)
            return (
              <div key={index} className="rounded border border-white/10 bg-slate-900 p-4">
                <div className="mb-3 text-sm font-bold text-amber-200">
                  {item.name || 'Sin nombre'} — nodo {item.sceneKey || '?'}
                </div>
                <div className="grid gap-2 md:grid-cols-5">
                  <LabeledSelect label="Nodo" value={item.sceneKey} onChange={value => updateNodeItem(index, { sceneKey: value })} options={nodeOptions} />
                  <LabeledInput label="Nombre" value={item.name} onChange={value => updateNodeItem(index, { name: value })} placeholder="Pistola oxidada" />
                  <LabeledSelect label="Tipo de equipo" value={getVisualType(item.type, item.slot)} onChange={v => {
                    const m = VISUAL_TYPE_MAP[v] || { type: 'misc', slot: '' }
                    updateNodeItem(index, { type: m.type, slot: m.slot })
                  }} options={[
                    { value: 'weapon',      label: 'Arma' },
                    { value: 'armor_head',  label: 'Casco' },
                    { value: 'armor_chest', label: 'Pechera / Armadura' },
                    { value: 'armor_legs',  label: 'Canilleras / Rodilleras' },
                    { value: 'armor_boots', label: 'Botas' },
                    { value: 'ring',        label: 'Brazales' },
                    { value: 'accessory',   label: 'Bolso / Accesorio' },
                    { value: 'misc',        label: 'Objeto misc' },
                  ]} />
                  <LabeledNumber label="Poder" value={item.power} onChange={value => updateNodeItem(index, { power: value })} />
                  <LabeledSelect label="Rareza" value={item.rarity} onChange={value => updateNodeItem(index, { rarity: value })} options={[
                    { value: 'common', label: 'Comun' },
                    { value: 'rare', label: 'Raro' },
                    { value: 'epic', label: 'Epico' },
                  ]} />
                </div>
                <LabeledInput label="Descripcion" value={item.description} onChange={value => updateNodeItem(index, { description: value })} placeholder="Descripcion del objeto" />
                <button onClick={() => setConfig(prev => ({ ...prev, nodeItems: prev.nodeItems.filter((_, i) => i !== index) }))} className="mt-3 inline-flex items-center gap-2 rounded bg-red-600 px-3 py-1.5 text-sm hover:bg-red-700">
                  <Trash2 className="h-4 w-4" /> Eliminar
                </button>
              </div>
            )
          })}
        </AdminList>

        {/* 4b. Pociones */}
        <AdminList title="4b. Pociones por camino" icon={<PackagePlus className="h-5 w-5 text-pink-400" />} onAdd={() => setConfig(prev => ({ ...prev, nodeItems: [...prev.nodeItems, { ...blankPotion }] }))}>
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

        <AdminList title="5. Encuentros memoria 8-bit" icon={<Skull className="h-5 w-5 text-cyan-300" />} onAdd={() => setConfig(prev => ({ ...prev, memoryEvents: [...prev.memoryEvents, { ...blankMemoryEvent }] }))}>
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
                <LabeledSelect label="Tipo premio" value={event.memoryRewardItemType} onChange={value => updateMemoryEvent(index, { memoryRewardItemType: value })} options={[
                  { value: 'weapon', label: 'Arma' },
                  { value: 'armor', label: 'Armadura' },
                  { value: 'potion', label: 'Pocion' },
                  { value: 'ring', label: 'Brazales' },
                  { value: 'misc', label: 'Otro' },
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

        <AdminList title="6. Finales de historia" icon={<Flag className="h-5 w-5 text-emerald-300" />} onAdd={() => setConfig(prev => ({ ...prev, endings: [...prev.endings, { sceneKey: '', title: '', description: '' }] }))}>
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

        <AdminList title="7. Eventos de dos opciones" icon={<Skull className="h-5 w-5 text-fuchsia-300" />} onAdd={() => setConfig(prev => ({ ...prev, storyEvents: [...prev.storyEvents, { ...blankStoryEvent }] }))}>
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
          <p>Nodo 1: Servidor en la nube. Decision: "Avanzar" hacia 1.1. Enemigo: clave "robot", aparece en 1.1, ataque 18, defensa 100, titulo ganador "Robot Digital destruido", titulo derrota "Sistema comprometido".</p>
        </div>
      </div>
    </div>
  )
}

// -- Mini-games playground ------------------------------------------------------

type PlaygroundGame = 'runner' | 'memory' | 'quiz' | 'snake' | 'arch0' | 'arch1' | 'arch2' | 'minefield' | 'dice' | 'circuit0' | 'circuit1' | 'circuit2' | 'networkcard'

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

const MOCK_ARCH_EVENT_0 = { key: 'admin-test', sceneKey: 'test', levelId: 0 }
const MOCK_ARCH_EVENT_1 = { key: 'admin-test', sceneKey: 'test', levelId: 1 }
const MOCK_ARCH_EVENT_2 = { key: 'admin-test', sceneKey: 'test', levelId: 2 }

const MOCK_MINEFIELD_EVENT = {
  key: 'admin-test', sceneKey: 'test',
  title: 'Androide Hostil - PRUEBA',
  prompt: 'Encuentra los puntos débiles del androide. Evita las trampas.',
  enemyHP: 60, enemyAttack: 15, brainCount: 6,
  winText: '¡Androide destruido! Prueba superada.', loseText: 'Las trampas te vencieron.',
}

const MOCK_DICE_EVENT = {
  key: 'admin-test', sceneKey: 'test',
  title: 'Combate de Dados - PRUEBA',
  prompt: 'Lanzas dados contra el enemigo. Si tu tirada supera la suya lo hieres.',
  enemyName: 'Robot de Prueba', enemyHP: 80, enemyAttack: 18,
  winText: '¡Enemigo derrotado!', loseText: 'El enemigo te venció.',
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
  { id: 'arch0',  label: 'Arquitectura N1',  color: 'text-sky-300',    bg: 'bg-sky-700/80',    border: 'border-sky-500/40'    },
  { id: 'arch1',  label: 'Arquitectura N2',  color: 'text-sky-300',    bg: 'bg-sky-600/80',    border: 'border-sky-400/40'    },
  { id: 'arch2',     label: 'Arquitectura N3',  color: 'text-sky-200',    bg: 'bg-sky-500/80',    border: 'border-sky-300/40'    },
  { id: 'minefield', label: 'Buscaminas',       color: 'text-rose-300',   bg: 'bg-rose-700/80',   border: 'border-rose-500/40'   },
  { id: 'dice',      label: 'Combate Dados',    color: 'text-amber-300',  bg: 'bg-amber-700/80',  border: 'border-amber-500/40'  },
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

      {active === 'arch0' && (
        <div className="rounded-xl border border-sky-500/30 bg-[#060d1c] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-sky-300">&#x1F5FA; Arquitectura AWS - Nivel 1</span>
            <button onClick={() => setActive(null)} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600">Cerrar</button>
          </div>
          <ArchitectureGame event={MOCK_ARCH_EVENT_0} onFinish={() => {}} />
        </div>
      )}

      {active === 'arch1' && (
        <div className="rounded-xl border border-sky-400/30 bg-[#060d1c] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-sky-200">&#x1F5FA; Arquitectura AWS - Nivel 2</span>
            <button onClick={() => setActive(null)} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600">Cerrar</button>
          </div>
          <ArchitectureGame event={MOCK_ARCH_EVENT_1} onFinish={() => {}} />
        </div>
      )}

      {active === 'arch2' && (
        <div className="rounded-xl border border-sky-300/30 bg-[#060d1c] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-sky-100">&#x1F5FA; Arquitectura AWS - Nivel 3</span>
            <button onClick={() => setActive(null)} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600">Cerrar</button>
          </div>
          <ArchitectureGame event={MOCK_ARCH_EVENT_2} onFinish={() => {}} />
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

      {active === 'dice' && (
        <div className="rounded-xl border border-amber-500/30 bg-[#1a0f00] p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">🎲 Combate de Dados - Modo Prueba</span>
            <button onClick={() => setActive(null)} className="rounded bg-slate-700 px-2 py-0.5 text-[10px] text-white hover:bg-slate-600">Cerrar</button>
          </div>
          <DiceCombatGame event={MOCK_DICE_EVENT} playerHealth={100} playerMaxHealth={100} onFinish={() => setActive(null)} onDamagePlayer={() => {}} />
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

function AdminList({ title, icon, onAdd, children }: { title: string; icon: React.ReactNode; onAdd: () => void; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-700/60 bg-slate-900/80 p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-xl font-bold text-white">{icon} {title}</h2>
        <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-lg border border-blue-500/40 bg-blue-600/80 px-3 py-2 text-sm font-semibold shadow transition hover:bg-blue-600">
          <Plus className="h-4 w-4" /> Agregar
        </button>
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
              { value: 'weapon', label: 'Arma' },
              { value: 'armor', label: 'Armadura' },
              { value: 'potion', label: 'Pocion' },
              { value: 'ring', label: 'Brazales' },
              { value: 'misc', label: 'Otro' },
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
  onAddEnemy,
  onAddMemory,
  onAddItem,
  onDropNode,
  onDropDecision,
  onMoveScene,
  onDeleteScene,
  onConnectScenes,
  onDeleteDecision,
  onDeleteEnemy,
  onDeleteMemory,
  onDeleteItem,
  onAutoArrange,
}: {
  config: StoryConfig
  selectedSceneKey: string
  onSelectScene: (sceneKey: string) => void
  onAddDecision: (sceneKey: string) => void
  onAddEnemy: (sceneKey: string) => void
  onAddMemory: (sceneKey: string) => void
  onAddItem: (sceneKey: string) => void
  onDropNode: (x: number, y: number, flowPage?: number) => void
  onDropDecision: (sceneKey: string) => void
  onMoveScene: (sceneKey: string, flowX: number, flowY: number, flowPage?: number) => void
  onDeleteScene: (sceneKey: string) => void
  onConnectScenes: (fromKey: string, toKey: string) => void
  onDeleteDecision: (index: number) => void
  onDeleteEnemy: (index: number) => void
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
    if (type === 'enemy') onAddEnemy(sceneKey)
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
          <span className="rounded bg-rose-700 px-2 py-1">Enemigo</span>
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
        <button draggable onDragStart={event => handlePaletteDrag(event, 'enemy')} className="rounded bg-rose-700 px-3 py-2 font-semibold hover:bg-rose-800">
          Arrastrar enemigo
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
        <span className="basis-full self-center text-xs text-white">Mueve nodos arrastrando el cuadro. Crea flechas arrastrando el circulo → de un nodo hacia otro. Suelta nodo en el fondo; enemigo/objeto encima de un nodo.</span>
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
              const enemies = config.enemies.filter(enemy => enemy.sceneKey === scene.key)
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
                    if (connectFrom || pendingConnectFrom || type === 'decision' || type === 'enemy' || type === 'memory' || type === 'item') {
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
                    {enemies.length > 0 && <span className="rounded bg-rose-700 px-1.5 py-0.5">{enemies.length} ene.</span>}
                    {memories.length > 0 && <span className="rounded bg-cyan-700 px-1.5 py-0.5">{memories.length} mem.</span>}
                    {items.length > 0 && <span className="rounded bg-amber-700 px-1.5 py-0.5">{items.length} obj.</span>}
                    {(scene.isEnding || endings.length > 0) && <span className="rounded bg-emerald-700 px-1.5 py-0.5">final</span>}
                  </div>
                  {(enemies.length > 0 || memories.length > 0 || items.length > 0) && (
                    <div className="mt-1.5 space-y-1 text-[10px]">
                      {config.enemies.map((enemy, enemyIndex) => enemy.sceneKey === scene.key ? (
                        <div key={`enemy-${enemyIndex}`} className="flex items-center justify-between rounded bg-rose-950/80 px-2 py-1">
                          <span className="truncate">{enemy.name || enemy.key}</span>
                          <button onClick={() => onDeleteEnemy(enemyIndex)} className="ml-1 font-bold text-rose-200">x</button>
                        </div>
                      ) : null)}
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
                  <div className="mt-2 grid grid-cols-4 gap-1">
                    <button onClick={() => onAddDecision(scene.key)} className="rounded bg-sky-700 px-1 py-0.5 text-[10px] hover:bg-sky-800">Dec.</button>
                    <button onClick={() => onAddEnemy(scene.key)} className="rounded bg-rose-700 px-1 py-0.5 text-[10px] hover:bg-rose-800">Ene.</button>
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
