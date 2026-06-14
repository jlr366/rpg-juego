/**
 * File: src/components/Stash.tsx
 * Description: Displays the stash items and allows withdrawing, equipping or
 * dropping them. Visually groups identical items and shows quantities.
 */

import React from 'react'
import { Archive } from 'lucide-react'
import { useGame } from '../context/GameProvider'
import { Item } from '../types'
import { ItemCard } from './ItemCard'

/**
 * Interface: StashItemGroup
 * Represents a group of identical items inside the stash.
 */
interface StashItemGroup {
  key: string
  item: Item
  count: number
}

/**
 * Function: buildStashKey
 * Builds a grouping key for stash items based on their main properties.
 */
function buildStashKey(item: Item): string {
  return [
    item.type,
    item.slot ?? '',
    item.name,
    item.rarity ?? '',
    item.description ?? '',
  ].join('|')
}

/**
 * Function: groupStashItems
 * Groups identical stash items into stacks with a quantity.
 */
function groupStashItems(items: Item[]): StashItemGroup[] {
  const map = new Map<string, StashItemGroup>()

  for (const it of items) {
    const key = buildStashKey(it)
    const existing = map.get(key)
    if (existing) {
      existing.count += 1
    } else {
      map.set(key, { key, item: it, count: 1 })
    }
  }

  return Array.from(map.values())
}

/**
 * Component: Stash
 * Shows items stored in the stash with options to withdraw, equip or drop.
 * Limited to 10 items (regla aplicada en el GameProvider). Objetos iguales se
 * apilan y muestran x2, x3, etc.
 */
export const Stash: React.FC = () => {
  const { stash, withdrawFromStash, dropFromStash, equipFromStash } = useGame()

  const grouped = React.useMemo(() => groupStashItems(stash), [stash])

  return (
    <div className="min-h-[240px] space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Archive className="h-5 w-5 text-sky-300" />
          <h3 className="text-sm font-semibold">Stash</h3>
        </div>
        <span className="text-xs text-white">
          {stash.length} objeto{stash.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="space-y-2">
        {grouped.length === 0 && (
          <div className="text-xs text-white">
            No tienes nada guardado aún. Guarda objetos desde tu inventario.
          </div>
        )}

        {grouped.map(group => (
          <ItemCard
            key={group.key}
            item={group.item}
            count={group.count}
            showEquip
            showWithdraw
            showDrop
            onEquip={id => equipFromStash(id)}
            onWithdraw={id => withdrawFromStash(id)}
            onDrop={id => dropFromStash(id)}
          />
        ))}
      </div>
    </div>
  )
}
