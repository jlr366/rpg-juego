import React, { createContext, useState, useCallback, useEffect } from 'react'
import { useAuth } from './AuthProvider'
import { Item } from '../types'
import { API_BASE_URL } from '../config'
import { prefetchItemImages } from '../hooks/useItemImage'

interface GameContextType {
  characterName: string
  health: number
  maxHealth: number
  equipment: Record<string, Item | null>
  inventory: Item[]

  log: string[]

  equipItem: (itemId: string) => Promise<void>
  unequipSlot: (slot: string) => Promise<void>
  consumePotion: (itemId: string) => Promise<void>
  dropItem: (itemId: string) => Promise<void>
  stashItem: (itemId: string) => Promise<void>
  storePotionInBox: (itemId: string) => Promise<void>
  withdrawPotionFromBox: (itemId: string) => Promise<void>
  acquireItem: (item: Item) => Promise<{ ok: boolean; error?: string }>

  combat: any | null
  startCombat: (enemy: any) => void
  resolveCombatRound: () => void
  autoWinCombat: () => void
  fleeCombat: () => void

  injure: (damage: number, step: string) => void
  storyKill: (message: string, step: string) => void
  resetGame: () => void
  reviveFromDeath: () => void
  lastCombatResult: string | null
  lastEnemyName: string | null
  lastEventTitle: string | null

  dropInventoryToScene: (sceneKey: string) => void
  getSceneItems: (sceneKey: string) => Promise<Item[]>
  pickUpSceneItem: (sceneKey: string, itemId: string) => void
}

export const GameContext = createContext<GameContextType | undefined>(undefined)

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [characterName, setCharacterName] = useState('Aventurero')
  const [health, setHealth] = useState(100)
  const [maxHealth, setMaxHealth] = useState(100)
  const [equipment, setEquipment] = useState<Record<string, Item | null>>({})
  const [inventory, setInventory] = useState<Item[]>([])
  const [log, setLog] = useState<string[]>([])
  const [combat, setCombat] = useState(null)
  const [lastCombatResult, setLastCombatResult] = useState<string | null>(null)
  const [lastEnemyName, setLastEnemyName] = useState<string | null>(null)
  const [lastEventTitle, setLastEventTitle] = useState<string | null>(null)

  // ✅ CARGA INICIAL (FIX)
  useEffect(() => {
    if (!user) return

    const loadCharacterData = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/characters/${user.id}`, {
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()

          setCharacterName(data.name || 'Aventurero')
          setHealth(data.health)
          setMaxHealth(data.max_health)

          // ✅ FIX AQUÍ
          setEquipment(data.equipment || {})

          const items: Item[] = data.inventory || []
          setInventory(items)
          prefetchItemImages(items, API_BASE_URL)
        }
      } catch (error) {
        console.error('Error loading character:', error)
      }
    }

    loadCharacterData()
  }, [user])

  const saveHealth = useCallback(async (nextHealth: number) => {
    if (!user) return

    try {
      await fetch(`${API_BASE_URL}/api/characters/${user.id}/health`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ health: nextHealth }),
      })
    } catch (error) {
      console.error('Error saving health:', error)
    }
  }, [user])

  const handleDeath = useCallback(async (enemyKey?: string) => {
    if (!user) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/characters/${user.id}/death`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enemyKey }),
      })

      if (response.ok) {
        const data = await response.json()
        setHealth(data.health)
        setEquipment(data.equipment || {})
        setInventory(data.inventory || [])
      } else {
        setHealth(0)
        setEquipment({})
      }
    } catch (error) {
      console.error('Error handling death:', error)
      setHealth(0)
      setEquipment({})
    }
  }, [user])

  const claimEnemyLoot = useCallback(async (enemyKey?: string) => {
    if (!user || !enemyKey) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/characters/${user.id}/claim-enemy-loot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enemyKey }),
      })

      if (response.ok) {
        const data = await response.json()
        setInventory(data.inventory || [])
        if (data.claimed > 0) {
          setLog(prev => [...prev, `Recuperaste ${data.claimed} botin(es) del enemigo.`])
        }
      }
    } catch (error) {
      console.error('Error claiming enemy loot:', error)
    }
  }, [user])

  // ✅ EQUIPAR
  const equipItem = useCallback(async (itemId: string) => {
    if (!user) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/characters/${user.id}/equip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId }),
      })

      if (response.ok) {
        const data = await response.json()
        setEquipment(data.equipment)
        setInventory(data.inventory)
        setLog(prev => [...prev, `Equipaste ${data.itemName}`])
      } else {
        const data = await response.json().catch(() => null)
        setLog(prev => [...prev, data?.error || 'No se pudo equipar el item'])
      }
    } catch (error) {
      console.error('Error equipping item:', error)
    }
  }, [user])

  // ✅ DESEQUIPAR
  const unequipSlot = useCallback(async (slot: string) => {
    if (!user) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/characters/${user.id}/equipment/${slot}`, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (response.ok) {
        const data = await response.json()
        setEquipment(data.equipment)
        setInventory(data.inventory)
      } else {
        const data = await response.json().catch(() => null)
        setLog(prev => [...prev, data?.error || 'No se pudo quitar el item'])
      }
    } catch (error) {
      console.error('Error unequipping:', error)
    }
  }, [user])

  // ✅ CONSUMIR POCIÓN
  const consumePotion = useCallback(async (itemId: string) => {
    if (!user) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/characters/${user.id}/consume-potion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId }),
      })

      if (response.ok) {
        const data = await response.json()
        setHealth(data.health)
        setInventory(data.inventory)
        setLog(prev => [...prev, `Consumiste una poción. +${data.healthRestored} HP`])
      }
    } catch (error) {
      console.error('Error consuming potion:', error)
    }
  }, [user])

  // ✅ BOTAR ITEM
  const dropItem = useCallback(async (itemId: string) => {
    if (!user) return

    try {
      const response = await fetch(`${API_BASE_URL}/api/characters/${user.id}/drop-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId }),
      })

      if (response.ok) {
        const data = await response.json()
        setInventory(data.inventory)
        setLog(prev => [...prev, `Botaste un item`])
      }
    } catch (error) {
      console.error('Error dropping item:', error)
    }
  }, [user])

  const stashItem = useCallback(async () => {}, [])
  const storePotionInBox = useCallback(async () => {}, [])
  const withdrawPotionFromBox = useCallback(async () => {}, [])

  // ✅ LOOT (FIX REAL)
  const acquireItem = useCallback(async (item: Item): Promise<{ ok: boolean; error?: string }> => {
    if (!user) return { ok: false, error: 'Sin sesión' }

    try {
      const response = await fetch(`${API_BASE_URL}/api/characters/${user.id}/acquire-item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ itemId: item.id, item }),
      })

      if (response.ok) {
        const data = await response.json()
        setInventory(data.inventory)
        setLog(prev => [...prev, `¡Encontraste ${item.name}!`])
        return { ok: true }
      }

      const data = await response.json().catch(() => null)
      const errorMsg = data?.error || 'No se pudo agregar el item al inventario'
      setLog(prev => [...prev, errorMsg])
      return { ok: false, error: errorMsg }
    } catch (error) {
      console.error('Error acquiring item:', error)
      return { ok: false, error: 'Error de conexión' }
    }
  }, [user])

  // ✅ COMBATE
  const startCombat = useCallback((enemy: any) => {
    setCombat(enemy)
  }, [])

  const resolveCombatRound = useCallback(() => {
    if (!combat) return

    const equippedWeapon = equipment.weapon?.name?.toLowerCase() || ''
    const weakWeapon = typeof combat.weakWeapon === 'string' ? combat.weakWeapon.toLowerCase().trim() : ''
    if (weakWeapon && equippedWeapon.includes(weakWeapon)) {
      setLastCombatResult('enemy_victory')
      setLastEnemyName(combat.enemyName || 'enemigo')
      setLastEventTitle(combat.victoryTitle || `Ganador de ${combat.enemyName || 'enemigo'}`)
      setLog(prev => [...prev, `${equipment.weapon?.name} derrota de un golpe a ${combat.enemyName}.`])
      claimEnemyLoot(combat.enemyKey)
      setCombat(null)
      return
    }

    // Stat bonuses from equipment
    const weaponPower = equipment.weapon?.power || 0
    const armorPower =
      (equipment.head?.power   || 0) +
      (equipment.chest?.power  || 0) +
      (equipment.legs?.power   || 0) +
      (equipment.ring?.power   || 0) +
      (equipment.boots?.power  || 0)
    const defenseReduction = Math.floor(armorPower / 2)

    // Intercambio directo de golpes: tu ataque primero, y si el enemigo
    // sobrevive, te devuelve el golpe. Sin tiradas ni azar enfrentado.
    const baseDmg = Math.floor(Math.random() * 15) + 5
    const damage = baseDmg + weaponPower
    const newEnemyHealth = combat.enemyHealth - damage
    const weaponNote = weaponPower > 0 ? ` (+${weaponPower} arma)` : ''

    if (newEnemyHealth <= 0) {
      setLastCombatResult('enemy_victory')
      setLastEnemyName(combat.enemyName || 'enemigo')
      setLastEventTitle(combat.victoryTitle || `Ganador de ${combat.enemyName || 'enemigo'}`)
      setLog(prev => [...prev, `¡Derrotaste al ${combat.enemyName}! Daño final: ${damage}${weaponNote}`])
      claimEnemyLoot(combat.enemyKey)
      setCombat(null)
      return
    }

    const rawDamage =
      Math.floor(Math.random() * (combat.enemyDamageMax - combat.enemyDamageMin + 1)) +
      combat.enemyDamageMin
    const enemyDamage = Math.max(1, rawDamage - defenseReduction)
    const defNote = defenseReduction > 0 ? ` (bloqueado ${defenseReduction} por armadura)` : ''
    const newHealth = Math.max(0, health - enemyDamage)
    setHealth(newHealth)
    saveHealth(newHealth)

    if (newHealth <= 0) {
      setLastEnemyName(combat.enemyName || 'enemigo')
      setLastCombatResult('enemy_defeat')
      setLastEventTitle(combat.defeatTitle || `Comida de ${combat.enemyName || 'enemigo'}`)
      setLog(prev => [...prev, `Golpeas a ${combat.enemyName} por ${damage}${weaponNote}, pero ${combat.enemyName || 'el enemigo'} te mata. Daño: ${enemyDamage}${defNote}`])
      handleDeath(combat.enemyKey)
      setCombat(null)
    } else {
      setLog(prev => [...prev, `Golpeas a ${combat.enemyName} por ${damage}${weaponNote}. Vida enemigo: ${newEnemyHealth}. ${combat.enemyName} te golpea por ${enemyDamage}${defNote}. Tu vida: ${newHealth}`])
      setCombat({ ...combat, enemyHealth: newEnemyHealth })
    }
  }, [claimEnemyLoot, combat, equipment, health, handleDeath, saveHealth])

  const autoWinCombat = useCallback(() => {
    if (!combat) return
    setLastCombatResult('enemy_victory')
    setLastEnemyName(combat.enemyName || 'enemigo')
    setLastEventTitle(combat.victoryTitle || `Victoria sobre ${combat.enemyName || 'enemigo'}`)
    setLog(prev => [...prev, `⚡ Poción Especial: ${combat.enemyName} derrotado instantáneamente.`])
    claimEnemyLoot(combat.enemyKey)
    setCombat(null)
  }, [claimEnemyLoot, combat])

  const fleeCombat = useCallback(() => setCombat(null), [])

  const injure = useCallback((damage: number) => {
    setHealth(prev => {
      const nextHealth = Math.max(0, prev - damage)
      saveHealth(nextHealth)
      if (nextHealth <= 0) {
        handleDeath()
        setLastCombatResult('story_death')
        setLastEventTitle('Has muerto')
      }
      return nextHealth
    })
  }, [handleDeath, saveHealth])

  const storyKill = useCallback((message: string) => {
    setHealth(0)
    handleDeath()
    setLastEnemyName(null)
    setLastCombatResult('story_death')
    setLastEventTitle('Has muerto')
    setLog(prev => [...prev, message])
  }, [handleDeath])

  const resetGame = useCallback(async () => {
    // Clear local state immediately so the UI updates right away
    setHealth(maxHealth)
    setEquipment({})
    setInventory([])
    setLog([])
    setLastEnemyName(null)
    setLastCombatResult(null)
    setLastEventTitle(null)

    if (!user) return

    // Try the single-call reset endpoint first
    try {
      const res = await fetch(`${API_BASE_URL}/api/characters/${user.id}/reset`, {
        method: 'POST',
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setHealth(data.health ?? maxHealth)
        setMaxHealth(data.max_health ?? maxHealth)
        setEquipment(data.equipment || {})
        setInventory(data.inventory || [])
        return
      }
    } catch { /* fall through */ }

    // Fallback: fetch fresh character state, then clear each item explicitly
    try {
      const charRes = await fetch(`${API_BASE_URL}/api/characters/${user.id}`, {
        credentials: 'include',
      })
      const charData = charRes.ok ? await charRes.json() : null

      // Unequip all slots (using fresh backend data to know which are occupied)
      const slots = ['weapon', 'head', 'chest', 'legs', 'ring', 'boots']
      await Promise.all(
        slots.map(slot =>
          fetch(`${API_BASE_URL}/api/characters/${user.id}/equipment/${slot}`, {
            method: 'DELETE',
            credentials: 'include',
          })
        )
      )

      // Drop every inventory item (using fresh backend list, not stale closure)
      const freshItems: Item[] = charData?.inventory || []
      await Promise.all(
        freshItems.map(item =>
          fetch(`${API_BASE_URL}/api/characters/${user.id}/drop-item`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ itemId: item.id }),
          })
        )
      )

      // Restore health
      await fetch(`${API_BASE_URL}/api/characters/${user.id}/health`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ health: maxHealth }),
      })
    } catch (error) {
      console.error('Error in fallback reset:', error)
    }
  }, [maxHealth, user])

  const reviveFromDeath = useCallback(() => {
    const revivedHealth = Math.floor(maxHealth * 0.5)
    setHealth(revivedHealth)
    saveHealth(revivedHealth)
    setLastEnemyName(null)
    setLastCombatResult(null)
    setLastEventTitle(null)
  }, [maxHealth, saveHealth])

  const dropInventoryToScene = useCallback(() => {}, [])
  const getSceneItems = useCallback(async (): Promise<Item[]> => [], [])
  const pickUpSceneItem = useCallback(() => {}, [])

  return (
    <GameContext.Provider
      value={{
        characterName,
        health,
        maxHealth,
        equipment,
        inventory,
        log,
        equipItem,
        unequipSlot,
        consumePotion,
        dropItem,
        stashItem,
        storePotionInBox,
        withdrawPotionFromBox,
        acquireItem,
        combat,
        startCombat,
        resolveCombatRound,
        autoWinCombat,
        fleeCombat,
        injure,
        storyKill,
        resetGame,
        reviveFromDeath,
        lastCombatResult,
        lastEnemyName,
        lastEventTitle,
        dropInventoryToScene,
        getSceneItems,
        pickUpSceneItem,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export const useGame = () => {
  const context = React.useContext(GameContext)
  if (!context) throw new Error('useGame must be used within GameProvider')
  return context
}
