const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const { Pool } = require('pg')
const bcrypt = require('bcrypt')
const session = require('express-session')
const multer = require('multer')
const fs = require('fs')
const path = require('path')

dotenv.config()
const app = express()
const uploadRoot = path.join(__dirname, 'uploads')
const storyUploadDir = path.join(uploadRoot, 'story')

fs.mkdirSync(storyUploadDir, { recursive: true })

let cloudinary = null
if (process.env.CLOUDINARY_URL) {
  try {
    cloudinary = require('cloudinary').v2
    cloudinary.config({ cloudinary_url: process.env.CLOUDINARY_URL })
  } catch (_) {
    cloudinary = null
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

app.set('trust proxy', 1)

const CUSTOM_DOMAIN = process.env.CUSTOM_DOMAIN
app.use((req, res, next) => {
  if (
    CUSTOM_DOMAIN &&
    req.get('host') !== CUSTOM_DOMAIN &&
    !req.path.startsWith('/api') &&
    !req.path.startsWith('/uploads') &&
    !req.path.startsWith('/socket.io')
  ) {
    return res.redirect(301, `https://${CUSTOM_DOMAIN}${req.url}`)
  }
  next()
})

app.use(cors({
  origin: true,
  credentials: true,
}))

app.use(express.json({ limit: '100mb' }))
app.use('/uploads', express.static(uploadRoot))

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
  },
}))

function isUUID(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeUsername(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function buildItemPayload(item) {
  if (!item || typeof item.name !== 'string' || item.name.trim().length === 0) {
    return null
  }

  return {
    name: item.name.trim(),
    type: typeof item.type === 'string' ? item.type : 'misc',
    slot: typeof item.slot === 'string' ? item.slot : null,
    power: Number.isFinite(Number(item.power)) ? Number(item.power) : 0,
    description: typeof item.description === 'string' ? item.description : null,
    rarity: typeof item.rarity === 'string' ? item.rarity : 'common',
  }
}

async function findMatchingItemId(payload) {
  const result = await pool.query(
    `SELECT id
     FROM items
     WHERE name = $1
       AND type = $2
       AND slot IS NOT DISTINCT FROM $3
       AND power = $4
       AND description IS NOT DISTINCT FROM $5
       AND rarity = $6
     LIMIT 1`,
    [
      payload.name,
      payload.type,
      payload.slot,
      payload.power,
      payload.description,
      payload.rarity,
    ]
  )

  return result.rows[0]?.id || null
}

function isPotionItem(item) {
  return item?.type === 'potion' || item?.type === 'consumable'
}

function sanitizeUploadName(value) {
  return String(value || 'archivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'archivo'
}

const storyUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, storyUploadDir),
    filename: (_req, file, cb) => {
      const parsed = path.parse(sanitizeUploadName(file.originalname))
      const ext = parsed.ext || ''
      const base = parsed.name || 'archivo'
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`)
    },
  }),
  limits: { fileSize: 250 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^(image|video|audio)\//.test(file.mimetype)) return cb(null, true)
    cb(new Error('Solo se permiten imagenes, videos o audios'))
  },
})

function clampMapPercent(value, fallback) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return fallback
  return Math.min(100, Math.max(0, numeric))
}

const DEFAULT_STORY_CONFIG = {
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
}

const INVENTORY_ITEM_LIMIT = 5
const INVENTORY_STACK_LIMIT = 2

function normalizeStoryConfig(config) {
  const scenes = Array.isArray(config?.scenes) ? config.scenes : []
  const usedKeys = new Set()
  const normalizedScenes = scenes
    .filter(scene => scene && (scene.key || scene.title || (Array.isArray(scene.story) && scene.story.join('').trim())))
    .map((scene, index) => {
      let key = typeof scene.key === 'string' ? scene.key.trim() : ''
      if (!key) {
        key = index === 0 ? '1' : `1.${index}`
      }
      while (usedKeys.has(key)) {
        key = `${key}-${index + 1}`
      }
      usedKeys.add(key)
      const fallbackMarker = { x: 50, y: 50 }

      return {
        key,
        title: typeof scene.title === 'string' && scene.title.trim() ? scene.title.trim() : `Nodo ${key}`,
        musicUrl: typeof scene.musicUrl === 'string' ? scene.musicUrl.trim() : '',
        mediaUrl: typeof scene.mediaUrl === 'string' ? scene.mediaUrl.trim() : '',
        mediaType: typeof scene.mediaType === 'string' ? scene.mediaType.trim() : '',
        mapX: clampMapPercent(scene.mapX, fallbackMarker.x),
        mapY: clampMapPercent(scene.mapY, fallbackMarker.y),
        flowX: clampMapPercent(scene.flowX, 10 + (index % 4) * 22),
        flowY: clampMapPercent(scene.flowY, 12 + Math.floor(index / 4) * 28),
        flowPage: Number.isFinite(Number(scene.flowPage)) ? Math.max(1, Math.floor(Number(scene.flowPage))) : 1,
        story: Array.isArray(scene.story)
          ? scene.story.map(line => String(line)).filter(line => line.trim().length > 0)
          : [],
        isEnding: Boolean(scene.isEnding),
      }
    })

  const sceneKeys = new Set(normalizedScenes.map(scene => scene.key))
  const decisions = Array.isArray(config?.decisions) ? config.decisions : []
  const normalizedDecisions = decisions
    .map(decision => ({
      sceneKey: typeof decision.sceneKey === 'string' ? decision.sceneKey.trim() : '',
      label: typeof decision.label === 'string' ? decision.label.trim() : '',
      nextSceneKey: typeof decision.nextSceneKey === 'string' ? decision.nextSceneKey.trim() : '',
      effect: typeof decision.effect === 'string' ? decision.effect.trim() : '',
    }))
    .filter(decision => decision.sceneKey && decision.label)

  const deathTitles = Array.isArray(config?.deathTitles) ? config.deathTitles : []
  const endings = Array.isArray(config?.endings) ? config.endings : []
  const enemies = Array.isArray(config?.enemies) ? config.enemies : []
  const nodeItems = Array.isArray(config?.nodeItems) ? config.nodeItems : []
  const storyEvents = Array.isArray(config?.storyEvents) ? config.storyEvents : []
  const memoryEvents = [
    ...(Array.isArray(config?.memoryEvents) ? config.memoryEvents : []),
    ...storyEvents.filter(event => event?.optionAEffect === 'memory_duel' || event?.optionBEffect === 'memory_duel'),
  ]

  return {
    scenes: normalizedScenes.length > 0 ? normalizedScenes : DEFAULT_STORY_CONFIG.scenes,
    decisions: normalizedDecisions,
    enemies: enemies
      .map(enemy => ({
        key: typeof enemy.key === 'string' ? enemy.key.trim() : '',
        sceneKey: typeof enemy.sceneKey === 'string' ? enemy.sceneKey.trim() : '',
        name: typeof enemy.name === 'string' && enemy.name.trim() ? enemy.name.trim() : 'Enemigo',
        attack: Number.isFinite(Number(enemy.attack)) ? Math.max(1, Number(enemy.attack)) : 10,
        defense: Number.isFinite(Number(enemy.defense)) ? Math.max(1, Number(enemy.defense)) : 60,
        weakWeapon: typeof enemy.weakWeapon === 'string' ? enemy.weakWeapon.trim() : '',
        victoryTitle: typeof enemy.victoryTitle === 'string' ? enemy.victoryTitle.trim() : '',
        defeatTitle: typeof enemy.defeatTitle === 'string' ? enemy.defeatTitle.trim() : '',
        defeatDescription: typeof enemy.defeatDescription === 'string' ? enemy.defeatDescription.trim() : '',
        rewardItemName: typeof enemy.rewardItemName === 'string' ? enemy.rewardItemName.trim() : '',
        rewardItemType: typeof enemy.rewardItemType === 'string' ? enemy.rewardItemType.trim() : 'misc',
        rewardItemPower: Number.isFinite(Number(enemy.rewardItemPower)) ? Number(enemy.rewardItemPower) : 0,
      }))
      .filter(enemy => enemy.key && enemy.sceneKey && sceneKeys.has(enemy.sceneKey)),
    nodeItems: nodeItems
      .map(nodeItem => ({
        sceneKey: typeof nodeItem.sceneKey === 'string' ? nodeItem.sceneKey.trim() : '',
        name: typeof nodeItem.name === 'string' ? nodeItem.name.trim() : '',
        type: typeof nodeItem.type === 'string' ? nodeItem.type.trim() : 'misc',
        slot: typeof nodeItem.slot === 'string' ? nodeItem.slot.trim() : '',
        power: Number.isFinite(Number(nodeItem.power)) ? Number(nodeItem.power) : 0,
        rarity: typeof nodeItem.rarity === 'string' ? nodeItem.rarity.trim() : 'common',
        description: typeof nodeItem.description === 'string' ? nodeItem.description.trim() : '',
        specialDuration: Number.isFinite(Number(nodeItem.specialDuration)) ? Number(nodeItem.specialDuration) : 0,
      }))
      .filter(nodeItem => nodeItem.sceneKey && sceneKeys.has(nodeItem.sceneKey) && nodeItem.name),
    storyEvents: storyEvents
      .filter(event => event?.optionAEffect !== 'memory_duel' && event?.optionBEffect !== 'memory_duel')
      .map((event, index) => ({
        key: typeof event.key === 'string' && event.key.trim() ? event.key.trim() : `evento${index + 1}`,
        sceneKey: typeof event.sceneKey === 'string' ? event.sceneKey.trim() : '',
        title: typeof event.title === 'string' && event.title.trim() ? event.title.trim() : 'Encuentro',
        prompt: typeof event.prompt === 'string' ? event.prompt.trim() : '',
        optionALabel: typeof event.optionALabel === 'string' && event.optionALabel.trim() ? event.optionALabel.trim() : 'Aceptar',
        optionAEffect: typeof event.optionAEffect === 'string' ? event.optionAEffect.trim() : 'none',
        optionAItemName: typeof event.optionAItemName === 'string' ? event.optionAItemName.trim() : '',
        optionAItemType: typeof event.optionAItemType === 'string' ? event.optionAItemType.trim() : 'misc',
        optionAItemPower: Number.isFinite(Number(event.optionAItemPower)) ? Number(event.optionAItemPower) : 0,
        optionAText: typeof event.optionAText === 'string' ? event.optionAText.trim() : '',
        optionBLabel: typeof event.optionBLabel === 'string' && event.optionBLabel.trim() ? event.optionBLabel.trim() : 'Rechazar',
        optionBEffect: typeof event.optionBEffect === 'string' ? event.optionBEffect.trim() : 'none',
        optionBItemName: typeof event.optionBItemName === 'string' ? event.optionBItemName.trim() : '',
        optionBItemType: typeof event.optionBItemType === 'string' ? event.optionBItemType.trim() : 'misc',
        optionBItemPower: Number.isFinite(Number(event.optionBItemPower)) ? Number(event.optionBItemPower) : 0,
        optionBText: typeof event.optionBText === 'string' ? event.optionBText.trim() : '',
        correctOption: ['A', 'B'].includes(event.correctOption) ? event.correctOption : '',
        explanation: typeof event.explanation === 'string' ? event.explanation.trim() : '',
        memoryEnemyName: typeof event.memoryEnemyName === 'string' ? event.memoryEnemyName.trim() : '',
        memoryTurnSeconds: Number.isFinite(Number(event.memoryTurnSeconds)) ? Math.max(5, Math.min(60, Number(event.memoryTurnSeconds))) : 12,
        memoryStakeItemName: typeof event.memoryStakeItemName === 'string' ? event.memoryStakeItemName.trim() : '',
        memoryRewardItemName: typeof event.memoryRewardItemName === 'string' ? event.memoryRewardItemName.trim() : '',
        memoryRewardItemType: typeof event.memoryRewardItemType === 'string' ? event.memoryRewardItemType.trim() : 'misc',
        memoryRewardItemPower: Number.isFinite(Number(event.memoryRewardItemPower)) ? Number(event.memoryRewardItemPower) : 0,
        memoryWinText: typeof event.memoryWinText === 'string' ? event.memoryWinText.trim() : '',
        memoryLoseText: typeof event.memoryLoseText === 'string' ? event.memoryLoseText.trim() : '',
      }))
      .filter(event => event.sceneKey && sceneKeys.has(event.sceneKey) && event.key),
    memoryEvents: memoryEvents
      .map((event, index) => ({
        key: typeof event.key === 'string' && event.key.trim() ? event.key.trim() : `memoria${index + 1}`,
        sceneKey: typeof event.sceneKey === 'string' ? event.sceneKey.trim() : '',
        title: typeof event.title === 'string' && event.title.trim() ? event.title.trim() : 'Duelo memoria',
        prompt: typeof event.prompt === 'string' ? event.prompt.trim() : '',
        memoryEnemyName: typeof event.memoryEnemyName === 'string' ? event.memoryEnemyName.trim() : 'Rival',
        memoryTurnSeconds: Number.isFinite(Number(event.memoryTurnSeconds)) ? Math.max(5, Math.min(60, Number(event.memoryTurnSeconds))) : 12,
        memoryStakeItemName: typeof event.memoryStakeItemName === 'string' ? event.memoryStakeItemName.trim() : '',
        memoryRewardItemName: typeof event.memoryRewardItemName === 'string' ? event.memoryRewardItemName.trim() : '',
        memoryRewardItemType: typeof event.memoryRewardItemType === 'string' ? event.memoryRewardItemType.trim() : 'misc',
        memoryRewardItemPower: Number.isFinite(Number(event.memoryRewardItemPower)) ? Number(event.memoryRewardItemPower) : 0,
        memoryWinText: typeof event.memoryWinText === 'string' ? event.memoryWinText.trim() : '',
        memoryLoseText: typeof event.memoryLoseText === 'string' ? event.memoryLoseText.trim() : '',
      }))
      .filter(event => event.sceneKey && sceneKeys.has(event.sceneKey) && event.key),
    deathTitles: deathTitles
      .map(death => ({
        enemyKey: typeof death.enemyKey === 'string' ? death.enemyKey.trim() : '',
        title: typeof death.title === 'string' ? death.title.trim() : '',
        description: typeof death.description === 'string' ? death.description.trim() : '',
      }))
      .filter(death => death.enemyKey && death.title),
    endings: endings
      .map(ending => ({
        sceneKey: typeof ending.sceneKey === 'string' ? ending.sceneKey.trim() : '',
        title: typeof ending.title === 'string' ? ending.title.trim() : '',
        description: typeof ending.description === 'string' ? ending.description.trim() : '',
      }))
      .filter(ending => ending.sceneKey && sceneKeys.has(ending.sceneKey)),
    mapLocations: Array.isArray(config?.mapLocations)
      ? config.mapLocations
          .map((loc, index) => ({
            key: typeof loc.key === 'string' && loc.key.trim() ? loc.key.trim() : `loc${index + 1}`,
            name: typeof loc.name === 'string' && loc.name.trim() ? loc.name.trim() : `Ubicación ${index + 1}`,
            x: Number.isFinite(Number(loc.x)) ? Math.min(100, Math.max(0, Number(loc.x))) : 50,
            y: Number.isFinite(Number(loc.y)) ? Math.min(100, Math.max(0, Number(loc.y))) : 50,
            icon: typeof loc.icon === 'string' && loc.icon.trim() ? loc.icon.trim() : '📍',
          }))
      : [],
    runnerEvents: Array.isArray(config?.runnerEvents)
      ? config.runnerEvents
          .map((ev, index) => ({
            key: typeof ev.key === 'string' && ev.key.trim() ? ev.key.trim() : `runner${index + 1}`,
            sceneKey: typeof ev.sceneKey === 'string' ? ev.sceneKey.trim() : '',
            title: typeof ev.title === 'string' && ev.title.trim() ? ev.title.trim() : 'Desafio Runner',
            prompt: typeof ev.prompt === 'string' ? ev.prompt.trim() : '',
            targetScore: Number.isFinite(Number(ev.targetScore)) ? Math.max(1, Number(ev.targetScore)) : 500,
            rewardItemName: typeof ev.rewardItemName === 'string' ? ev.rewardItemName.trim() : '',
            rewardItemType: typeof ev.rewardItemType === 'string' ? ev.rewardItemType.trim() : 'misc',
            rewardItemPower: Number.isFinite(Number(ev.rewardItemPower)) ? Number(ev.rewardItemPower) : 0,
            winText: typeof ev.winText === 'string' ? ev.winText.trim() : '',
            loseText: typeof ev.loseText === 'string' ? ev.loseText.trim() : '',
          }))
          .filter(ev => ev.sceneKey && ev.key && sceneKeys.has(ev.sceneKey))
      : [],
    quizEvents: Array.isArray(config?.quizEvents)
      ? config.quizEvents
          .map((ev, index) => ({
            key: typeof ev.key === 'string' && ev.key.trim() ? ev.key.trim() : `quiz${index + 1}`,
            sceneKey: typeof ev.sceneKey === 'string' ? ev.sceneKey.trim() : '',
            title: typeof ev.title === 'string' ? ev.title.trim() : '',
            prompt: typeof ev.prompt === 'string' ? ev.prompt.trim() : '',
            rewardItemName: typeof ev.rewardItemName === 'string' ? ev.rewardItemName.trim() : '',
            rewardItemType: typeof ev.rewardItemType === 'string' ? ev.rewardItemType.trim() : 'misc',
            rewardItemPower: Number.isFinite(Number(ev.rewardItemPower)) ? Number(ev.rewardItemPower) : 0,
            winText: typeof ev.winText === 'string' ? ev.winText.trim() : '',
            loseText: typeof ev.loseText === 'string' ? ev.loseText.trim() : '',
          }))
          .filter(ev => ev.sceneKey && ev.key && sceneKeys.has(ev.sceneKey))
      : [],
    snakeEvents: Array.isArray(config?.snakeEvents)
      ? config.snakeEvents
          .map((ev, index) => ({
            key: typeof ev.key === 'string' && ev.key.trim() ? ev.key.trim() : `snake${index + 1}`,
            sceneKey: typeof ev.sceneKey === 'string' ? ev.sceneKey.trim() : '',
            title: typeof ev.title === 'string' ? ev.title.trim() : '',
            prompt: typeof ev.prompt === 'string' ? ev.prompt.trim() : '',
            targetScore: Number.isFinite(Number(ev.targetScore)) ? Math.max(1, Number(ev.targetScore)) : 80,
            rewardItemName: typeof ev.rewardItemName === 'string' ? ev.rewardItemName.trim() : '',
            rewardItemType: typeof ev.rewardItemType === 'string' ? ev.rewardItemType.trim() : 'misc',
            rewardItemPower: Number.isFinite(Number(ev.rewardItemPower)) ? Number(ev.rewardItemPower) : 0,
            winText: typeof ev.winText === 'string' ? ev.winText.trim() : '',
            loseText: typeof ev.loseText === 'string' ? ev.loseText.trim() : '',
          }))
          .filter(ev => ev.sceneKey && ev.key && sceneKeys.has(ev.sceneKey))
      : [],
    archEvents: Array.isArray(config?.archEvents)
      ? config.archEvents
          .map((ev, index) => ({
            key: typeof ev.key === 'string' && ev.key.trim() ? ev.key.trim() : `arch${index + 1}`,
            sceneKey: typeof ev.sceneKey === 'string' ? ev.sceneKey.trim() : '',
            title: typeof ev.title === 'string' ? ev.title.trim() : '',
            levelId: Number.isFinite(Number(ev.levelId)) ? Math.max(0, Math.min(2, Number(ev.levelId))) : 0,
            rewardItemName: typeof ev.rewardItemName === 'string' ? ev.rewardItemName.trim() : '',
            rewardItemType: typeof ev.rewardItemType === 'string' ? ev.rewardItemType.trim() : 'misc',
            rewardItemPower: Number.isFinite(Number(ev.rewardItemPower)) ? Number(ev.rewardItemPower) : 0,
            winText: typeof ev.winText === 'string' ? ev.winText.trim() : '',
            loseText: typeof ev.loseText === 'string' ? ev.loseText.trim() : '',
          }))
          .filter(ev => ev.sceneKey && ev.key && sceneKeys.has(ev.sceneKey))
      : [],
    minefieldEvents: Array.isArray(config?.minefieldEvents)
      ? config.minefieldEvents
          .map((ev, index) => ({
            key: typeof ev.key === 'string' && ev.key.trim() ? ev.key.trim() : `mf${index + 1}`,
            sceneKey: typeof ev.sceneKey === 'string' ? ev.sceneKey.trim() : '',
            title: typeof ev.title === 'string' ? ev.title.trim() : '',
            prompt: typeof ev.prompt === 'string' ? ev.prompt.trim() : '',
            enemyImageUrl: typeof ev.enemyImageUrl === 'string' ? ev.enemyImageUrl.trim() : '',
            enemyHP: Number.isFinite(Number(ev.enemyHP)) ? Number(ev.enemyHP) : 60,
            enemyAttack: Number.isFinite(Number(ev.enemyAttack)) ? Number(ev.enemyAttack) : 15,
            brainCount: Number.isFinite(Number(ev.brainCount)) ? Math.min(15, Math.max(1, Number(ev.brainCount))) : 6,
            rewardItemName: typeof ev.rewardItemName === 'string' ? ev.rewardItemName.trim() : '',
            rewardItemType: typeof ev.rewardItemType === 'string' ? ev.rewardItemType.trim() : 'misc',
            rewardItemPower: Number.isFinite(Number(ev.rewardItemPower)) ? Number(ev.rewardItemPower) : 0,
            winText: typeof ev.winText === 'string' ? ev.winText.trim() : '',
            loseText: typeof ev.loseText === 'string' ? ev.loseText.trim() : '',
          }))
          .filter(ev => ev.sceneKey && ev.key && sceneKeys.has(ev.sceneKey))
      : [],
    diceCombatEvents: Array.isArray(config?.diceCombatEvents)
      ? config.diceCombatEvents
          .map((ev, index) => ({
            key: typeof ev.key === 'string' && ev.key.trim() ? ev.key.trim() : `dice${index + 1}`,
            sceneKey: typeof ev.sceneKey === 'string' ? ev.sceneKey.trim() : '',
            title: typeof ev.title === 'string' ? ev.title.trim() : '',
            prompt: typeof ev.prompt === 'string' ? ev.prompt.trim() : '',
            enemyName: typeof ev.enemyName === 'string' && ev.enemyName.trim() ? ev.enemyName.trim() : '',
            enemyHP: Number.isFinite(Number(ev.enemyHP)) ? Number(ev.enemyHP) : 80,
            enemyAttack: Number.isFinite(Number(ev.enemyAttack)) ? Number(ev.enemyAttack) : 18,
            weakWeapon: typeof ev.weakWeapon === 'string' ? ev.weakWeapon.trim() : '',
            rewardItemName: typeof ev.rewardItemName === 'string' ? ev.rewardItemName.trim() : '',
            rewardItemType: typeof ev.rewardItemType === 'string' ? ev.rewardItemType.trim() : 'misc',
            rewardItemPower: Number.isFinite(Number(ev.rewardItemPower)) ? Number(ev.rewardItemPower) : 0,
            winText: typeof ev.winText === 'string' ? ev.winText.trim() : '',
            loseText: typeof ev.loseText === 'string' ? ev.loseText.trim() : '',
          }))
          .filter(ev => ev.sceneKey && ev.key && sceneKeys.has(ev.sceneKey) && ev.title)
      : [],
    circuitPuzzleEvents: Array.isArray(config?.circuitPuzzleEvents)
      ? config.circuitPuzzleEvents
          .map((ev, index) => ({
            key: typeof ev.key === 'string' && ev.key.trim() ? ev.key.trim() : `circuit${index + 1}`,
            sceneKey: typeof ev.sceneKey === 'string' ? ev.sceneKey.trim() : '',
            title: typeof ev.title === 'string' ? ev.title.trim() : '',
            prompt: typeof ev.prompt === 'string' ? ev.prompt.trim() : '',
            levelId: Number.isFinite(Number(ev.levelId)) ? Number(ev.levelId) : 0,
            rewardItemName: typeof ev.rewardItemName === 'string' ? ev.rewardItemName.trim() : '',
            rewardItemType: typeof ev.rewardItemType === 'string' ? ev.rewardItemType.trim() : 'misc',
            rewardItemPower: Number.isFinite(Number(ev.rewardItemPower)) ? Number(ev.rewardItemPower) : 0,
            winText: typeof ev.winText === 'string' ? ev.winText.trim() : '',
            loseText: typeof ev.loseText === 'string' ? ev.loseText.trim() : '',
          }))
          .filter(ev => ev.sceneKey && ev.key && sceneKeys.has(ev.sceneKey))
      : [],
    networkCardEvents: Array.isArray(config?.networkCardEvents)
      ? config.networkCardEvents
          .map((ev, index) => ({
            key: typeof ev.key === 'string' && ev.key.trim() ? ev.key.trim() : `netcard${index + 1}`,
            sceneKey: typeof ev.sceneKey === 'string' ? ev.sceneKey.trim() : '',
            title: typeof ev.title === 'string' ? ev.title.trim() : '',
            prompt: typeof ev.prompt === 'string' ? ev.prompt.trim() : '',
            rounds: Number.isFinite(Number(ev.rounds)) ? Math.max(1, Math.min(5, Number(ev.rounds))) : 3,
            rewardItemName: typeof ev.rewardItemName === 'string' ? ev.rewardItemName.trim() : '',
            rewardItemType: typeof ev.rewardItemType === 'string' ? ev.rewardItemType.trim() : 'misc',
            rewardItemPower: Number.isFinite(Number(ev.rewardItemPower)) ? Number(ev.rewardItemPower) : 0,
            winText: typeof ev.winText === 'string' ? ev.winText.trim() : '',
            loseText: typeof ev.loseText === 'string' ? ev.loseText.trim() : '',
          }))
          .filter(ev => ev.sceneKey && ev.key && sceneKeys.has(ev.sceneKey))
      : [],
    globalMusicUrl: typeof config?.globalMusicUrl === 'string' ? config.globalMusicUrl.trim() : '',
    victorySound: typeof config?.victorySound === 'string' ? config.victorySound.trim() : '',
    defeatSound: typeof config?.defeatSound === 'string' ? config.defeatSound.trim() : '',
  }
}

async function getCarriedNonPotionCount(characterId) {
  const result = await pool.query(
    `SELECT COALESCE(SUM(inv.quantity), 0)::int AS count
     FROM inventory inv
     JOIN items i ON i.id = inv.item_id
     WHERE inv.character_id = $1
       AND i.type NOT IN ('potion', 'consumable')`,
    [characterId]
  )

  return result.rows[0].count
}

async function getInventoryQuantity(characterId, itemId) {
  const result = await pool.query(
    'SELECT quantity FROM inventory WHERE character_id = $1 AND item_id = $2',
    [characterId, itemId]
  )

  return result.rows[0]?.quantity || 0
}

async function canAddToInventory(characterId, item, quantity = 1) {
  if (isPotionItem(item)) return { ok: true }

  const addQuantity = Math.max(1, Number(quantity) || 1)
  const carriedCount = await getCarriedNonPotionCount(characterId)
  const currentQuantity = await getInventoryQuantity(characterId, item.id)

  if (currentQuantity + addQuantity > INVENTORY_STACK_LIMIT) {
    return {
      ok: false,
      error: `Solo puedes tener ${INVENTORY_STACK_LIMIT} unidades de ${item.name} en inventario.`,
    }
  }

  if (carriedCount + addQuantity > INVENTORY_ITEM_LIMIT) {
    return {
      ok: false,
      error: `Inventario lleno. Solo puedes llevar ${INVENTORY_ITEM_LIMIT} items.`,
    }
  }

  return { ok: true }
}

async function getCharacterByUserId(userId) {
  const charRes = await pool.query(
    'SELECT * FROM characters WHERE user_id = $1',
    [userId]
  )

  if (charRes.rows.length === 0) return null
  const char = charRes.rows[0]

  const equipRes = await pool.query(
    `SELECT eq.slot,
            row_to_json(i) AS item
     FROM equipment eq
     LEFT JOIN items i ON i.id = eq.item_id
     WHERE eq.character_id = $1`,
    [char.id]
  )

  const equipment = {}
  equipRes.rows.forEach(e => {
    equipment[e.slot] = e.item
  })

  const invRes = await pool.query(
    `SELECT i.*, inv.quantity
     FROM items i
     JOIN inventory inv ON i.id = inv.item_id
     WHERE inv.character_id = $1
     ORDER BY inv.created_at ASC NULLS LAST`,
    [char.id]
  )

  return {
    ...char,
    equipment,
    inventory: invRes.rows,
  }
}

async function ensureDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS enemy_loot (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      enemy_key VARCHAR(120) NOT NULL,
      item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      quantity INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(enemy_key, item_id)
    )
  `)

  // Add profile columns if they don't exist
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(150)`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS age INTEGER`)
  await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS profession VARCHAR(100)`)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS story_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      config JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT single_story_config CHECK (id = 1)
    )
  `)

  await pool.query(`
    CREATE TABLE IF NOT EXISTS saved_stories (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      config JSONB NOT NULL,
      saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `)

  await pool.query(
    `INSERT INTO story_config (id, config)
     VALUES (1, $1::jsonb)
     ON CONFLICT (id) DO NOTHING`,
    [JSON.stringify(DEFAULT_STORY_CONFIG)]
  )

  const adminHash = await bcrypt.hash('admin300', 10)
  const adminRes = await pool.query(
    `INSERT INTO users (username, password_hash, role)
     VALUES ('admin', $1, 'admin')
     ON CONFLICT (username)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, role = 'admin'
     RETURNING id`,
    [adminHash]
  )
  const adminId = adminRes.rows[0].id

  // Ensure admin has a character and equipment slots
  const adminChar = await pool.query(
    `INSERT INTO characters (user_id, name, health, max_health)
     VALUES ($1, 'admin', 100, 100)
     ON CONFLICT (user_id) DO NOTHING
     RETURNING id`,
    [adminId]
  )
  if (adminChar.rows.length > 0) {
    const charId = adminChar.rows[0].id
    const slots = ['weapon', 'head', 'chest', 'legs', 'ring', 'boots']
    for (const slot of slots) {
      await pool.query(
        'INSERT INTO equipment (character_id, slot, item_id) VALUES ($1,$2,NULL) ON CONFLICT DO NOTHING',
        [charId, slot]
      )
    }
  }
}

async function requireAdmin(req, res, next) {
  try {
    const adminPassword = process.env.ADMIN_PASSWORD
    if (adminPassword && req.get('x-admin-password') === adminPassword) {
      return next()
    }

    if (!req.session.userId) {
      return res.status(401).json({ error: 'Sesion requerida' })
    }

    const userRes = await pool.query(
      'SELECT role FROM users WHERE id = $1',
      [req.session.userId]
    )

    if (userRes.rows[0]?.role !== 'admin') {
      return res.status(403).json({ error: 'Solo administrador' })
    }

    next()
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

/* HEALTH */
app.get('/api/health', (_req, res) => res.json({ ok: true }))

/* AUTH */
app.get('/api/auth/session', async (req, res) => {
  try {
    if (!req.session.userId) return res.json(null)

    const userRes = await pool.query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [req.session.userId]
    )

    if (userRes.rows.length === 0) return res.json(null)

    res.json(userRes.rows[0])
  } catch (err) {
    console.error('SESSION ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/auth/register', async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username)
    const { password, email, age, profession } = req.body

    if (!username || typeof password !== 'string') {
      return res.status(400).json({ error: 'Username y password requeridos' })
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
    }

    const exists = await pool.query(
      'SELECT id FROM users WHERE LOWER(username)=LOWER($1)',
      [username]
    )

    if (exists.rows.length > 0) {
      return res.status(400).json({ error: 'Usuario ya existe' })
    }

    // Check email uniqueness if provided
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
    if (cleanEmail) {
      const emailExists = await pool.query(
        'SELECT id FROM users WHERE LOWER(email)=LOWER($1)',
        [cleanEmail]
      )
      if (emailExists.rows.length > 0) {
        return res.status(400).json({ error: 'Este correo ya está registrado' })
      }
    }

    const hash = await bcrypt.hash(password, 10)
    const cleanAge = Number.isFinite(Number(age)) ? Math.max(1, Math.min(120, Number(age))) : null
    const cleanProfession = typeof profession === 'string' ? profession.trim().slice(0, 100) : ''

    const userRes = await pool.query(
      'INSERT INTO users (username, password_hash, email, age, profession, role) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, username, role',
      [username, hash, cleanEmail || null, cleanAge, cleanProfession || null, 'player']
    )

    const user = userRes.rows[0]

    const charRes = await pool.query(
      'INSERT INTO characters (user_id, name, health, max_health) VALUES ($1,$2,100,100) RETURNING id',
      [user.id, username]
    )

    const charId = charRes.rows[0].id

    const slots = ['weapon', 'head', 'chest', 'legs', 'ring', 'boots']
    for (const slot of slots) {
      await pool.query(
        'INSERT INTO equipment (character_id, slot, item_id) VALUES ($1,$2,NULL)',
        [charId, slot]
      )
    }

    req.session.userId = user.id
    res.json({ id: user.id, username: user.username, role: user.role })
  } catch (err) {
    console.error('REGISTER ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const username = normalizeUsername(req.body.username)
    const { password } = req.body

    if (!username || typeof password !== 'string') {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(username)=LOWER($1)',
      [username]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    const user = result.rows[0]
    const valid = await bcrypt.compare(password, user.password_hash)

    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas' })
    }

    req.session.userId = user.id
    res.json({ id: user.id, username: user.username, role: user.role })
  } catch (err) {
    console.error('LOGIN ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'No se pudo cerrar sesión' })
    res.clearCookie('connect.sid')
    res.json({ ok: true })
  })
})

app.get('/api/admin/story-config', requireAdmin, async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    const result = await pool.query('SELECT config, updated_at FROM story_config WHERE id = 1')
    const row = result.rows[0]
    res.json(row ? { ...row, config: normalizeStoryConfig(row.config) } : { config: DEFAULT_STORY_CONFIG, updated_at: null })
  } catch (err) {
    console.error('ADMIN CONFIG GET ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/story-config', async (req, res) => {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    const result = await pool.query('SELECT config, updated_at FROM story_config WHERE id = 1')
    const row = result.rows[0]
    res.json(row ? { ...row, config: normalizeStoryConfig(row.config) } : { config: DEFAULT_STORY_CONFIG, updated_at: null })
  } catch (err) {
    console.error('CONFIG GET ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/admin/uploads/story', requireAdmin, storyUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo requerido' })
    }

    const type = req.file.mimetype.startsWith('video/')
      ? 'video'
      : req.file.mimetype.startsWith('audio/')
        ? 'audio'
        : 'image'

    if (cloudinary) {
      const result = await cloudinary.uploader.upload(req.file.path, {
        resource_type: 'auto',
        folder: 'rpg-story',
        use_filename: true,
        unique_filename: true,
      })
      fs.unlink(req.file.path, () => {})
      return res.json({ url: result.secure_url, type, filename: result.public_id, originalName: req.file.originalname, size: req.file.size })
    }

    const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol
    const url = `${protocol}://${req.get('host')}/uploads/story/${req.file.filename}`
    res.json({ url, type, filename: req.file.filename, originalName: req.file.originalname, size: req.file.size })
  } catch (err) {
    console.error('ADMIN UPLOAD ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/admin/story-config', requireAdmin, async (req, res) => {
  try {
    const config = normalizeStoryConfig(req.body.config)

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Config invalida' })
    }

    const result = await pool.query(
      `UPDATE story_config
       SET config = $1::jsonb, updated_at = CURRENT_TIMESTAMP
       WHERE id = 1
       RETURNING config, updated_at`,
      [JSON.stringify(config)]
    )

    res.json(result.rows[0])
  } catch (err) {
    console.error('ADMIN CONFIG PUT ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

/* SAVED STORIES */
app.get('/api/admin/saved-stories', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, saved_at FROM saved_stories ORDER BY saved_at DESC')
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/admin/saved-stories', requireAdmin, async (req, res) => {
  try {
    const { id, name, config } = req.body
    if (!id || !name || !config) return res.status(400).json({ error: 'Faltan campos' })
    await pool.query(
      `INSERT INTO saved_stories (id, name, config, saved_at)
       VALUES ($1, $2, $3::jsonb, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, config = EXCLUDED.config, saved_at = CURRENT_TIMESTAMP`,
      [id, name, JSON.stringify(config)]
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/admin/saved-stories/:id', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, config, saved_at FROM saved_stories WHERE id = $1', [req.params.id])
    if (!result.rows[0]) return res.status(404).json({ error: 'No encontrado' })
    res.json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/admin/saved-stories/:id', requireAdmin, async (req, res) => {
  try {
    const { name } = req.body
    if (!name) return res.status(400).json({ error: 'Falta nombre' })
    await pool.query('UPDATE saved_stories SET name = $1 WHERE id = $2', [name, req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.delete('/api/admin/saved-stories/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM saved_stories WHERE id = $1', [req.params.id])
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

/* CHARACTER */
app.get('/api/characters/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    if (!isUUID(userId)) {
      return res.status(400).json({ error: 'userId inválido' })
    }

    const data = await getCharacterByUserId(userId)

    if (!data) {
      return res.status(404).json({ error: 'Personaje no encontrado' })
    }

    res.json(data)
  } catch (err) {
    console.error('CHARACTER ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/characters/:userId/health', async (req, res) => {
  try {
    const { userId } = req.params
    const health = Number(req.body.health)

    if (!isUUID(userId) || !Number.isFinite(health)) {
      return res.status(400).json({ error: 'Datos de salud invalidos' })
    }

    const updated = await pool.query(
      `UPDATE characters
       SET health = LEAST(max_health, GREATEST(0, $1))
       WHERE user_id = $2
       RETURNING health, max_health`,
      [Math.round(health), userId]
    )

    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Personaje no encontrado' })
    }

    res.json(updated.rows[0])
  } catch (err) {
    console.error('HEALTH ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/characters/:userId/death', async (req, res) => {
  try {
    const { userId } = req.params
    const enemyKey = typeof req.body.enemyKey === 'string' ? req.body.enemyKey.trim() : ''

    if (!isUUID(userId)) {
      return res.status(400).json({ error: 'userId invalido' })
    }

    const charRes = await pool.query(
      'SELECT id FROM characters WHERE user_id = $1',
      [userId]
    )

    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: 'Personaje no encontrado' })
    }

    const charId = charRes.rows[0].id

    if (enemyKey) {
      const equipped = await pool.query(
        'SELECT item_id FROM equipment WHERE character_id = $1 AND item_id IS NOT NULL',
        [charId]
      )

      for (const row of equipped.rows) {
        await pool.query(
          `INSERT INTO enemy_loot (enemy_key, item_id, quantity)
           VALUES ($1, $2, 1)
           ON CONFLICT (enemy_key, item_id)
           DO UPDATE SET quantity = enemy_loot.quantity + 1`,
          [enemyKey, row.item_id]
        )
      }
    }

    await pool.query('UPDATE equipment SET item_id = NULL WHERE character_id = $1', [charId])
    await pool.query('UPDATE characters SET health = 0 WHERE id = $1', [charId])

    const updated = await getCharacterByUserId(userId)
    res.json({
      health: updated.health,
      equipment: updated.equipment,
      inventory: updated.inventory,
    })
  } catch (err) {
    console.error('DEATH ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

app.post('/api/characters/:userId/claim-enemy-loot', async (req, res) => {
  try {
    const { userId } = req.params
    const enemyKey = typeof req.body.enemyKey === 'string' ? req.body.enemyKey.trim() : ''

    if (!isUUID(userId) || !enemyKey) {
      return res.status(400).json({ error: 'Datos de botin invalidos' })
    }

    const charRes = await pool.query(
      'SELECT id FROM characters WHERE user_id = $1',
      [userId]
    )

    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: 'Personaje no encontrado' })
    }

    const charId = charRes.rows[0].id
    const loot = await pool.query(
      'SELECT item_id, quantity FROM enemy_loot WHERE enemy_key = $1',
      [enemyKey]
    )

    let claimedCount = 0
    for (const row of loot.rows) {
      const itemRes = await pool.query('SELECT * FROM items WHERE id = $1', [row.item_id])
      const item = itemRes.rows[0]
      if (!item) continue

      let quantityToClaim = Number(row.quantity) || 0
      if (!isPotionItem(item)) {
        const carriedCount = await getCarriedNonPotionCount(charId)
        const currentQuantity = await getInventoryQuantity(charId, row.item_id)
        quantityToClaim = Math.min(
          quantityToClaim,
          Math.max(0, INVENTORY_STACK_LIMIT - currentQuantity),
          Math.max(0, INVENTORY_ITEM_LIMIT - carriedCount)
        )
      }

      if (quantityToClaim <= 0) continue

      await pool.query(
        `INSERT INTO inventory (character_id, item_id, quantity)
         VALUES ($1, $2, $3)
         ON CONFLICT (character_id, item_id)
         DO UPDATE SET quantity = inventory.quantity + EXCLUDED.quantity`,
        [charId, row.item_id, quantityToClaim]
      )
      claimedCount += quantityToClaim

      if (quantityToClaim >= Number(row.quantity)) {
        await pool.query('DELETE FROM enemy_loot WHERE enemy_key = $1 AND item_id = $2', [enemyKey, row.item_id])
      } else {
        await pool.query(
          'UPDATE enemy_loot SET quantity = quantity - $1 WHERE enemy_key = $2 AND item_id = $3',
          [quantityToClaim, enemyKey, row.item_id]
        )
      }
    }

    const updated = await getCharacterByUserId(userId)
    res.json({
      claimed: claimedCount,
      inventory: updated.inventory,
    })
  } catch (err) {
    console.error('CLAIM LOOT ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ACQUIRE ITEM */
app.post('/api/characters/:userId/acquire-item', async (req, res) => {
  try {
    const { userId } = req.params
    const { itemId, item } = req.body

    if (!isUUID(userId)) {
      return res.status(400).json({ error: 'userId inválido' })
    }

    const charRes = await pool.query(
      'SELECT id FROM characters WHERE user_id = $1',
      [userId]
    )

    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: 'Personaje no encontrado' })
    }

    const charId = charRes.rows[0].id

    let resolvedItemId = itemId
    let itemCheck = { rows: [] }

    if (isUUID(itemId)) {
      itemCheck = await pool.query(
        'SELECT * FROM items WHERE id = $1',
        [itemId]
      )
    }

    if (itemCheck.rows.length === 0) {
      const payload = buildItemPayload(item)

      if (!payload) {
        return res.status(400).json({ error: 'Item inválido' })
      }

      const matchingItemId = await findMatchingItemId(payload)

      if (matchingItemId) {
        resolvedItemId = matchingItemId
      } else {
        const created = await pool.query(
          `INSERT INTO items (name, type, slot, power, description, rarity)
           VALUES ($1,$2,$3,$4,$5,$6)
           RETURNING id`,
          [
            payload.name,
            payload.type,
            payload.slot,
            payload.power,
            payload.description,
            payload.rarity,
          ]
        )

        resolvedItemId = created.rows[0].id
      }
    }

    const resolvedItem = await pool.query(
      'SELECT * FROM items WHERE id = $1',
      [resolvedItemId]
    )

    if (resolvedItem.rows.length === 0) {
      return res.status(400).json({ error: 'Item no existe en DB' })
    }

    const itemToAdd = resolvedItem.rows[0]
    const addCheck = await canAddToInventory(charId, itemToAdd, 1)
    if (!addCheck.ok) {
      return res.status(400).json({ error: addCheck.error })
    }

    const existing = await pool.query(
      'SELECT quantity FROM inventory WHERE character_id = $1 AND item_id = $2',
      [charId, resolvedItemId]
    )

    if (existing.rows.length > 0) {
      await pool.query(
        'UPDATE inventory SET quantity = quantity + 1 WHERE character_id = $1 AND item_id = $2',
        [charId, resolvedItemId]
      )
    } else {
      await pool.query(
        'INSERT INTO inventory (character_id, item_id, quantity) VALUES ($1, $2, 1)',
        [charId, resolvedItemId]
      )
    }

    const updated = await getCharacterByUserId(userId)
    res.json({ inventory: updated.inventory })
  } catch (err) {
    console.error('ACQUIRE ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

/* EQUIP */
app.post('/api/characters/:userId/equip', async (req, res) => {
  try {
    const { userId } = req.params
    const { itemId } = req.body

    if (!isUUID(userId) || !isUUID(itemId)) {
      return res.status(400).json({ error: 'UUID inválido' })
    }

    const charRes = await pool.query(
      'SELECT id FROM characters WHERE user_id = $1',
      [userId]
    )
    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: 'Personaje no encontrado' })
    }

    const charId = charRes.rows[0].id

    const itemRes = await pool.query(
      'SELECT * FROM items WHERE id = $1',
      [itemId]
    )
    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: 'Item no existe' })
    }

    const item = itemRes.rows[0]

    if (!item.slot) {
      return res.status(400).json({ error: 'Este item no se puede equipar' })
    }

    const equippedRes = await pool.query(
      'SELECT item_id FROM equipment WHERE character_id = $1 AND slot = $2',
      [charId, item.slot]
    )

    const previouslyEquippedId = equippedRes.rows[0]?.item_id
    if (previouslyEquippedId === itemId) {
      const updated = await getCharacterByUserId(userId)
      return res.json({
        equipment: updated.equipment,
        inventory: updated.inventory,
        itemName: item.name,
      })
    }

    const invRes = await pool.query(
      'SELECT quantity FROM inventory WHERE character_id = $1 AND item_id = $2',
      [charId, itemId]
    )

    if (invRes.rows.length === 0 || invRes.rows[0].quantity <= 0) {
      return res.status(400).json({ error: 'Item no esta en inventario' })
    }

    if (previouslyEquippedId && previouslyEquippedId !== itemId) {
      const previousItemRes = await pool.query('SELECT * FROM items WHERE id = $1', [previouslyEquippedId])
      const previousItem = previousItemRes.rows[0]
      if (previousItem && !isPotionItem(previousItem)) {
        const currentPreviousQuantity = await getInventoryQuantity(charId, previouslyEquippedId)
        if (currentPreviousQuantity + 1 > INVENTORY_STACK_LIMIT) {
          return res.status(400).json({ error: `No puedes guardar mas de ${INVENTORY_STACK_LIMIT} unidades de ${previousItem.name}.` })
        }
      }

      await pool.query(
        `INSERT INTO inventory (character_id, item_id, quantity)
         VALUES ($1, $2, 1)
         ON CONFLICT (character_id, item_id)
         DO UPDATE SET quantity = inventory.quantity + 1`,
        [charId, previouslyEquippedId]
      )
    }

    await pool.query(
      'UPDATE equipment SET item_id = $1 WHERE character_id = $2 AND slot = $3',
      [itemId, charId, item.slot]
    )

    if (invRes.rows[0].quantity <= 1) {
      await pool.query(
        'DELETE FROM inventory WHERE character_id = $1 AND item_id = $2',
        [charId, itemId]
      )
    } else {
      await pool.query(
        'UPDATE inventory SET quantity = quantity - 1 WHERE character_id = $1 AND item_id = $2',
        [charId, itemId]
      )
    }

    const updated = await getCharacterByUserId(userId)
    res.json({
      equipment: updated.equipment,
      inventory: updated.inventory,
      itemName: item.name,
    })
  } catch (err) {
    console.error('EQUIP ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

/* UNEQUIP */
app.delete('/api/characters/:userId/equipment/:slot', async (req, res) => {
  try {
    const { userId, slot } = req.params

    if (!isUUID(userId)) {
      return res.status(400).json({ error: 'userId inválido' })
    }

    const charRes = await pool.query(
      'SELECT id FROM characters WHERE user_id = $1',
      [userId]
    )
    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: 'Personaje no encontrado' })
    }

    const charId = charRes.rows[0].id

    const equippedRes = await pool.query(
      'SELECT item_id FROM equipment WHERE character_id = $1 AND slot = $2',
      [charId, slot]
    )

    const equippedItemId = equippedRes.rows[0]?.item_id
    if (equippedItemId) {
      const equippedItemRes = await pool.query('SELECT * FROM items WHERE id = $1', [equippedItemId])
      const equippedItem = equippedItemRes.rows[0]
      if (equippedItem) {
        const addCheck = await canAddToInventory(charId, equippedItem, 1)
        if (!addCheck.ok) {
          return res.status(400).json({ error: addCheck.error })
        }
      }

      await pool.query(
        `INSERT INTO inventory (character_id, item_id, quantity)
         VALUES ($1, $2, 1)
         ON CONFLICT (character_id, item_id)
         DO UPDATE SET quantity = inventory.quantity + 1`,
        [charId, equippedItemId]
      )
    }

    await pool.query(
      'UPDATE equipment SET item_id = NULL WHERE character_id = $1 AND slot = $2',
      [charId, slot]
    )

    const updated = await getCharacterByUserId(userId)
    res.json({
      equipment: updated.equipment,
      inventory: updated.inventory,
    })
  } catch (err) {
    console.error('UNEQUIP ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

/* CONSUME POTION */
app.post('/api/characters/:userId/consume-potion', async (req, res) => {
  try {
    const { userId } = req.params
    const { itemId } = req.body

    if (!isUUID(userId) || !isUUID(itemId)) {
      return res.status(400).json({ error: 'UUID inválido' })
    }

    const charRes = await pool.query(
      'SELECT id, health, max_health FROM characters WHERE user_id = $1',
      [userId]
    )

    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: 'Personaje no encontrado' })
    }

    const char = charRes.rows[0]

    const itemRes = await pool.query(
      'SELECT * FROM items WHERE id = $1',
      [itemId]
    )

    if (itemRes.rows.length === 0) {
      return res.status(404).json({ error: 'Item no existe' })
    }

    const item = itemRes.rows[0]
    const healAmount = item.power || 20
    const newHealth = Math.min(char.max_health, char.health + healAmount)

    await pool.query(
      'UPDATE characters SET health = $1 WHERE id = $2',
      [newHealth, char.id]
    )

    const inv = await pool.query(
      'SELECT quantity FROM inventory WHERE character_id = $1 AND item_id = $2',
      [char.id, itemId]
    )

    if (inv.rows.length > 0) {
      const q = inv.rows[0].quantity
      if (q <= 1) {
        await pool.query(
          'DELETE FROM inventory WHERE character_id = $1 AND item_id = $2',
          [char.id, itemId]
        )
      } else {
        await pool.query(
          'UPDATE inventory SET quantity = quantity - 1 WHERE character_id = $1 AND item_id = $2',
          [char.id, itemId]
        )
      }
    }

    const updated = await getCharacterByUserId(userId)
    res.json({
      health: newHealth,
      healthRestored: healAmount,
      inventory: updated.inventory,
    })
  } catch (err) {
    console.error('CONSUME ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

/* RESET CHARACTER — clear all items and restore full health */
app.post('/api/characters/:userId/reset', async (req, res) => {
  try {
    const { userId } = req.params

    if (!isUUID(userId)) {
      return res.status(400).json({ error: 'UUID inválido' })
    }

    const charRes = await pool.query(
      'SELECT id FROM characters WHERE user_id = $1',
      [userId]
    )

    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: 'Personaje no encontrado' })
    }

    const charId = charRes.rows[0].id

    // Remove all inventory items
    await pool.query('DELETE FROM inventory WHERE character_id = $1', [charId])
    // Clear all equipment slots
    await pool.query('UPDATE equipment SET item_id = NULL WHERE character_id = $1', [charId])
    // Restore health to max_health
    await pool.query('UPDATE characters SET health = max_health WHERE id = $1', [charId])

    const updated = await getCharacterByUserId(userId)
    res.json({
      health: updated.health,
      max_health: updated.max_health,
      equipment: updated.equipment,
      inventory: updated.inventory,
    })
  } catch (err) {
    console.error('RESET CHARACTER ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

/* DROP ITEM */
app.post('/api/characters/:userId/drop-item', async (req, res) => {
  try {
    const { userId } = req.params
    const { itemId } = req.body

    if (!isUUID(userId) || !isUUID(itemId)) {
      return res.status(400).json({ error: 'UUID inválido' })
    }

    const charRes = await pool.query(
      'SELECT id FROM characters WHERE user_id = $1',
      [userId]
    )

    if (charRes.rows.length === 0) {
      return res.status(404).json({ error: 'Personaje no encontrado' })
    }

    const charId = charRes.rows[0].id

    const invRes = await pool.query(
      'SELECT quantity FROM inventory WHERE character_id = $1 AND item_id = $2',
      [charId, itemId]
    )

    if (invRes.rows.length > 0) {
      if (invRes.rows[0].quantity <= 1) {
        await pool.query(
          'DELETE FROM inventory WHERE character_id = $1 AND item_id = $2',
          [charId, itemId]
        )
      } else {
        await pool.query(
          'UPDATE inventory SET quantity = quantity - 1 WHERE character_id = $1 AND item_id = $2',
          [charId, itemId]
        )
      }
    }

    const updated = await getCharacterByUserId(userId)
    res.json({ inventory: updated.inventory })
  } catch (err) {
    console.error('DROP ERROR:', err)
    res.status(500).json({ error: err.message })
  }
})

// ── Socket.io Multiplayer ──────────────────────────────────────────────────────
const http = require('http')
const { Server: SocketServer } = require('socket.io')

const httpServer = http.createServer(app)
const io = new SocketServer(httpServer, {
  cors: { origin: true, credentials: true },
})

// Track connected players
const onlinePlayers = new Map() // socketId -> { userId, username, sceneKey, x, y }

io.on('connection', (socket) => {
  console.log(`[Socket] Conectado: ${socket.id}`)

  // Player joins the world
  socket.on('player:join', (data) => {
    const { userId, username, sceneKey } = data
    onlinePlayers.set(socket.id, { userId, username, sceneKey, x: 50, y: 50 })
    // Notify others
    socket.broadcast.emit('player:joined', { socketId: socket.id, userId, username, sceneKey })
    // Send current players to the new one
    const players = []
    onlinePlayers.forEach((p, id) => {
      if (id !== socket.id) players.push({ socketId: id, ...p })
    })
    socket.emit('player:list', players)
  })

  // Player moves to a different scene
  socket.on('player:move', (data) => {
    const player = onlinePlayers.get(socket.id)
    if (player) {
      player.sceneKey = data.sceneKey || player.sceneKey
      player.x = data.x ?? player.x
      player.y = data.y ?? player.y
      socket.broadcast.emit('player:moved', { socketId: socket.id, ...player })
    }
  })

  // Chat message
  socket.on('chat:message', (data) => {
    const player = onlinePlayers.get(socket.id)
    if (player) {
      io.emit('chat:message', {
        socketId: socket.id,
        username: player.username,
        message: typeof data.message === 'string' ? data.message.slice(0, 200) : '',
        timestamp: Date.now(),
      })
    }
  })

  // Disconnect
  socket.on('disconnect', () => {
    const player = onlinePlayers.get(socket.id)
    if (player) {
      io.emit('player:left', { socketId: socket.id, username: player.username })
      onlinePlayers.delete(socket.id)
    }
    console.log(`[Socket] Desconectado: ${socket.id}`)
  })
})

// ── External API proxies ──────────────────────────────────────────────────────

// ElevenLabs TTS
app.post('/api/tts', async (req, res) => {
  const { text, voiceId = 'pNInz6obpgDQGcFmaJgB' } = req.body
  if (!text) return res.status(400).json({ error: 'text required' })
  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY || '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.slice(0, 2500),
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.3 },
      }),
    })
    if (!upstream.ok) {
      const err = await upstream.text()
      return res.status(upstream.status).json({ error: err })
    }
    const buf = await upstream.arrayBuffer()
    res.set('Content-Type', 'audio/mpeg')
    res.send(Buffer.from(buf))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// PixelLab pixel art generation (pixflux model)
app.post('/api/generate-item-image', async (req, res) => {
  const { description } = req.body
  if (!description) return res.status(400).json({ error: 'description required' })
  try {
    const upstream = await fetch('https://api.pixellab.ai/v1/generate-image-pixflux', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PIXELLAB_API_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description,
        image_size: { width: 64, height: 64 },
        outline: 'single color black outline',
        shading: 'basic shading',
        detail: 'medium detail',
        isometric: false,
        no_background: true,
        text_guidance_scale: 8,
      }),
    })
    if (!upstream.ok) {
      const err = await upstream.text()
      return res.status(upstream.status).json({ error: err })
    }
    const data = await upstream.json()
    // data.image.base64 contains the full data URL (data:image/png;base64,...)
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Meshy.ai 3D preview — submit job
app.post('/api/generate-3d-preview', async (req, res) => {
  const { prompt } = req.body
  if (!prompt) return res.status(400).json({ error: 'prompt required' })
  try {
    const upstream = await fetch('https://api.meshy.ai/openapi/v2/text-to-3d', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MESHY_API_KEY || ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mode: 'preview',
        prompt,
        art_style: 'realistic',
        negative_prompt: 'low quality, blurry',
        should_remesh: true,
        should_texture: true,
      }),
    })
    if (!upstream.ok) {
      const err = await upstream.text()
      return res.status(upstream.status).json({ error: err })
    }
    const data = await upstream.json()
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// Meshy.ai 3D preview — poll task
app.get('/api/3d-preview/:taskId', async (req, res) => {
  const { taskId } = req.params
  try {
    const upstream = await fetch(`https://api.meshy.ai/openapi/v2/text-to-3d/${taskId}`, {
      headers: { 'Authorization': `Bearer ${process.env.MESHY_API_KEY || ''}` },
    })
    if (!upstream.ok) {
      const err = await upstream.text()
      return res.status(upstream.status).json({ error: err })
    }
    const data = await upstream.json()
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── Serve built frontend (production) ─────────────────────────────────────────
const frontendDist = path.join(__dirname, '../frontend/dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
      return res.status(404).json({ error: 'Ruta no encontrada' })
    }
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
} else {
  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' })
  })
}

// ── Start server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5001
ensureDatabase()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server en http://localhost:${PORT} (HTTP + WebSocket)`)
    })
  })
  .catch(err => {
    console.error('DATABASE INIT ERROR:', err)
    process.exit(1)
  })

