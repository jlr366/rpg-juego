-- EXTENSIÓN
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- LIMPIAR TABLAS SI YA EXISTEN
DROP TABLE IF EXISTS scene_items CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS equipment CASCADE;
DROP TABLE IF EXISTS characters CASCADE;
DROP TABLE IF EXISTS items CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. USUARIOS
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(100),
  role VARCHAR(20) DEFAULT 'player',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. PERSONAJES
CREATE TABLE characters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) DEFAULT 'Aventurero',
  health INTEGER DEFAULT 100,
  max_health INTEGER DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. ITEMS
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  type VARCHAR(20) NOT NULL,
  slot VARCHAR(20),
  power INTEGER DEFAULT 0,
  description TEXT,
  rarity VARCHAR(20) DEFAULT 'common',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. EQUIPAMIENTO
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  slot VARCHAR(20) NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  UNIQUE(character_id, slot)
);

-- 5. INVENTARIO
CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(character_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_character
ON inventory(character_id);

-- 6. ITEMS EN ESCENAS
CREATE TABLE scene_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_key VARCHAR(50) NOT NULL,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SEMILLAS DE ITEMS
INSERT INTO items (name, type, slot, power, description, rarity) VALUES
('Espada oxidada', 'weapon', 'weapon', 5, 'Una espada vieja pero útil', 'common'),
('Casco viejo', 'armor', 'head', 2, 'Protege poco', 'common'),
('Armadura rota', 'armor', 'chest', 3, 'Muy dañada', 'common'),
('Pantalones gastados', 'armor', 'legs', 1, 'Casi inútiles', 'common'),
('Anillo extraño', 'accessory', 'ring', 1, 'Tiene energía rara', 'rare'),
('Poción de vida', 'consumable', NULL, 20, 'Restaura vida', 'common');