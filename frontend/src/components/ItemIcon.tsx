import React from 'react'
import {
  Crown,
  FlaskConical,
  Footprints,
  Hammer,
  Package,
  Shield,
  ShieldCheck,
  Shirt,
  Sparkles,
  Zap,
  Target,
  ShieldHalf,
} from 'lucide-react'
import { Item } from '../types'

interface ItemIconProps {
  item?: Item | null
  slot?: string
  className?: string
}

export const ItemIcon: React.FC<ItemIconProps> = ({ item, slot, className = 'h-5 w-5' }) => {
  const power = item?.power || 0
  const itemSlot = item?.slot || slot
  const itemType = item?.type

  if (itemSlot === 'weapon' || itemType === 'weapon') {
    if (power >= 8) return <Zap className={`${className} text-amber-300`} />
    if (power >= 4) return <Target className={`${className} text-sky-300`} />
    return <Target className={`${className} text-zinc-200`} />
  }

  if (itemSlot === 'head') return <Crown className={`${className} text-yellow-200`} />
  if (itemSlot === 'chest') return <Shirt className={`${className} text-cyan-200`} />
  if (itemSlot === 'legs') return <Footprints className={`${className} text-lime-200`} />
  if (itemSlot === 'ring' || itemType === 'ring' || itemType === 'accessory') {
    return <ShieldHalf className={`${className} text-fuchsia-300`} />
  }
  if (itemType === 'armor') {
    return power >= 3
      ? <ShieldCheck className={`${className} text-cyan-200`} />
      : <Shield className={`${className} text-zinc-200`} />
  }
  if (itemType === 'potion' || itemType === 'consumable') {
    return <FlaskConical className={`${className} text-emerald-300`} />
  }
  if (item?.rarity === 'epic' || item?.rarity === 'rare') {
    return <Sparkles className={`${className} text-violet-300`} />
  }

  return power > 0
    ? <Hammer className={`${className} text-zinc-200`} />
    : <Package className={`${className} text-zinc-200`} />
}
