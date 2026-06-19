/**
 * File: src/types.ts
 * Description: Tipos compartidos para el juego (items, slots, estado).
 */

/**
 * Interface: Item
 * Describes a game item that can be in inventory, equipped, or in stash.
 */
export interface Item {
  id: string
  name: string
  type: 'armor' | 'ring' | 'weapon' | 'potion' | 'consumable' | 'accessory' | 'misc'
  slot?: 'head' | 'chest' | 'legs' | 'ring' | 'weapon' | 'boots'
  power?: number
  description?: string
  rarity?: 'common' | 'rare' | 'epic'
  quantity?: number
}

/**
 * Interface: EquipmentSlots
 * Represents wearable slots for the player.
 */
export interface EquipmentSlots {
  head: Item | null
  chest: Item | null
  legs: Item | null
  ring: Item | null
  weapon: Item | null
}

/**
 * Interface: CombatState
 * Represents the current combat situation against a single enemy.
 */
export interface CombatState {
  /** Whether the player is currently in combat. */
  inCombat: boolean
  /** Display name of the enemy. */
  enemyName: string
  /** Current enemy health points. */
  enemyHealth: number
  /** Maximum enemy health points. */
  enemyMaxHealth: number
  /** Minimum damage the enemy can deal in one hit. */
  enemyDamageMin: number
  /** Maximum damage the enemy can deal in one hit. */
  enemyDamageMax: number
}

/**
 * Type: LastCombatResult
 * Represents the high-level outcome of the last combat.
 */
/**
 * Type: LastCombatResult
 * Represents the high-level outcome of the last combat or death event.
 */
export type LastCombatResult = 'none' | 'enemy_victory' | 'enemy_defeat' | 'story_death'

/**
 * Interface: GameState
 * Root state for game context.
 */
export interface GameState {
  inventory: Item[]
  equipment: EquipmentSlots
  stash: Item[]
  /** Potion box where the player stores potions (separate from stash). */
  potionBox: Item[]
  log: string[]
  /** Current player health points. */
  health: number
  /** Maximum health points the player can reach. */
  maxHealth: number
  /** Current combat status, null when not fighting. */
  combat: CombatState | null
  /** Outcome of the last resolved combat, if any. */
  lastCombatResult: LastCombatResult
  /** Scene loot: map from scene key to dropped items (used when a player dies). */
  sceneLoot?: Record<string, Item[]>
}
