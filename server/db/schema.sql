-- Neon Database Schema for White Elephant Game

-- Games table - stores game sessions
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  phase VARCHAR(20) NOT NULL DEFAULT 'lobby',
  current_turn_index INTEGER NOT NULL DEFAULT 0,
  host_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Players table - stores players in games
CREATE TABLE IF NOT EXISTS players (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  socket_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  is_connected BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_id, socket_id)
);

-- Player gifts junction table - tracks which gifts each player owns
CREATE TABLE IF NOT EXISTS player_gifts (
  id SERIAL PRIMARY KEY,
  player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  gift_id VARCHAR(255) NOT NULL,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(player_id, gift_id, game_id)
);

-- Gifts table - stores gifts for each game
CREATE TABLE IF NOT EXISTS gifts (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  gift_id VARCHAR(255) NOT NULL,
  x FLOAT NOT NULL,
  y FLOAT NOT NULL,
  rotation FLOAT NOT NULL,
  pattern VARCHAR(50) NOT NULL,
  is_opened BOOLEAN DEFAULT false,
  owner_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  steal_count INTEGER DEFAULT 0,
  product_name VARCHAR(500),
  product_image TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(game_id, gift_id)
);

-- Admin gifts table - global gifts that persist across games
CREATE TABLE IF NOT EXISTS admin_gifts (
  id SERIAL PRIMARY KEY,
  gift_id VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(500) NOT NULL,
  image TEXT,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);
CREATE INDEX IF NOT EXISTS idx_players_socket_id ON players(socket_id);
CREATE INDEX IF NOT EXISTS idx_players_game_socket ON players(game_id, socket_id);
CREATE INDEX IF NOT EXISTS idx_gifts_game_id ON gifts(game_id);
CREATE INDEX IF NOT EXISTS idx_gifts_owner_id ON gifts(owner_id);
CREATE INDEX IF NOT EXISTS idx_gifts_game_gift_id ON gifts(game_id, gift_id);
CREATE INDEX IF NOT EXISTS idx_gifts_opened ON gifts(is_opened) WHERE is_opened = true;
CREATE INDEX IF NOT EXISTS idx_player_gifts_player_id ON player_gifts(player_id);
CREATE INDEX IF NOT EXISTS idx_player_gifts_game_id ON player_gifts(game_id);
CREATE INDEX IF NOT EXISTS idx_player_gifts_player_game ON player_gifts(player_id, game_id);
CREATE INDEX IF NOT EXISTS idx_admin_gifts_gift_id ON admin_gifts(gift_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-update games.updated_at
DROP TRIGGER IF EXISTS update_games_updated_at ON games;
CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON games
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

