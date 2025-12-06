# Database Schema Documentation

## Overview
The White Elephant game uses a PostgreSQL database (Neon) to persist all game state, players, gifts, and admin-managed products.

## Tables

### 1. `games`
Stores game sessions and their current state.

**Columns:**
- `id` (SERIAL PRIMARY KEY) - Unique game session ID
- `phase` (VARCHAR(20)) - Current game phase: 'lobby', 'playing', 'ended'
- `current_turn_index` (INTEGER) - Index of current player's turn
- `host_id` (VARCHAR(255)) - Socket ID of the game host
- `created_at` (TIMESTAMP) - When the game was created
- `updated_at` (TIMESTAMP) - Auto-updated on game state changes

**Indexes:**
- Primary key on `id`

**Triggers:**
- `update_games_updated_at` - Automatically updates `updated_at` on row changes

---

### 2. `players`
Stores players participating in games.

**Columns:**
- `id` (SERIAL PRIMARY KEY) - Internal player ID
- `game_id` (INTEGER) - Foreign key to `games.id` (CASCADE DELETE)
- `socket_id` (VARCHAR(255)) - WebSocket connection ID (unique per game)
- `name` (VARCHAR(255)) - Player's display name
- `emoji` (VARCHAR(10)) - Player's chosen emoji
- `is_connected` (BOOLEAN) - Connection status
- `created_at` (TIMESTAMP) - When player joined

**Constraints:**
- UNIQUE(`game_id`, `socket_id`) - One socket per game
- FOREIGN KEY `game_id` REFERENCES `games(id)` ON DELETE CASCADE

**Indexes:**
- `idx_players_game_id` - Fast lookup by game
- `idx_players_socket_id` - Fast lookup by socket
- `idx_players_game_socket` - Composite index for game+socket queries

---

### 3. `gifts`
Stores gifts for each game session.

**Columns:**
- `id` (SERIAL PRIMARY KEY) - Internal gift ID
- `game_id` (INTEGER) - Foreign key to `games.id` (CASCADE DELETE)
- `gift_id` (VARCHAR(255)) - Unique gift identifier within game (e.g., "gift-0")
- `x` (FLOAT) - X coordinate on game board
- `y` (FLOAT) - Y coordinate on game board
- `rotation` (FLOAT) - Rotation angle in degrees
- `pattern` (VARCHAR(50)) - Gift wrapping pattern (dots, stripes, snowflakes, plaid)
- `is_opened` (BOOLEAN) - Whether gift has been opened
- `owner_id` (INTEGER) - Foreign key to `players.id` (SET NULL on delete)
- `steal_count` (INTEGER) - Number of times gift has been stolen (max 2)
- `product_name` (VARCHAR(500)) - Name of the product inside
- `product_image` (TEXT) - URL to product image
- `created_at` (TIMESTAMP) - When gift was created

**Constraints:**
- UNIQUE(`game_id`, `gift_id`) - One gift ID per game
- FOREIGN KEY `game_id` REFERENCES `games(id)` ON DELETE CASCADE
- FOREIGN KEY `owner_id` REFERENCES `players(id)` ON DELETE SET NULL

**Indexes:**
- `idx_gifts_game_id` - Fast lookup by game
- `idx_gifts_owner_id` - Fast lookup by owner
- `idx_gifts_game_gift_id` - Composite index for game+gift queries
- `idx_gifts_opened` - Partial index on opened gifts

---

### 4. `player_gifts`
Junction table tracking which gifts each player currently owns.

**Columns:**
- `id` (SERIAL PRIMARY KEY) - Internal ID
- `player_id` (INTEGER) - Foreign key to `players.id` (CASCADE DELETE)
- `gift_id` (VARCHAR(255)) - Gift identifier
- `game_id` (INTEGER) - Foreign key to `games.id` (CASCADE DELETE)
- `created_at` (TIMESTAMP) - When ownership was established

**Constraints:**
- UNIQUE(`player_id`, `gift_id`, `game_id`) - One ownership record per player-gift-game
- FOREIGN KEY `player_id` REFERENCES `players(id)` ON DELETE CASCADE
- FOREIGN KEY `game_id` REFERENCES `games(id)` ON DELETE CASCADE

**Indexes:**
- `idx_player_gifts_player_id` - Fast lookup by player
- `idx_player_gifts_game_id` - Fast lookup by game
- `idx_player_gifts_player_game` - Composite index for player+game queries

---

### 5. `admin_gifts`
Global gift products managed by admins, persist across all games.

**Columns:**
- `id` (SERIAL PRIMARY KEY) - Internal ID
- `gift_id` (VARCHAR(255)) - Unique gift identifier
- `name` (VARCHAR(500)) - Product name
- `image` (TEXT) - Product image URL
- `added_at` (TIMESTAMP) - When gift was added

**Constraints:**
- UNIQUE(`gift_id`) - One gift ID globally

**Indexes:**
- `idx_admin_gifts_gift_id` - Fast lookup by gift ID

---

## Relationships

```
games (1) ──< (many) players
games (1) ──< (many) gifts
games (1) ──< (many) player_gifts
players (1) ──< (many) gifts (via owner_id)
players (1) ──< (many) player_gifts
admin_gifts (standalone, no foreign keys)
```

## Data Flow

1. **Game Creation**: New game created in `games` table
2. **Player Joining**: Player added to `players` table, first player becomes host
3. **Game Start**: Gifts created in `gifts` table based on admin gifts or fallbacks
4. **Gift Opening**: Gift updated in `gifts`, entry added to `player_gifts`
5. **Gift Stealing**: Ownership transferred in `gifts` and `player_gifts` tables
6. **Game Reset**: All game-specific data deleted, new game created

## Key Features

- **Cascade Deletes**: Deleting a game removes all associated players, gifts, and player_gifts
- **Soft Deletes**: Player deletion sets gift ownership to NULL (gifts remain)
- **Connection Tracking**: Players can disconnect/reconnect without losing game state
- **Admin Gifts**: Persist across games, used when generating new game gifts
- **Turn Management**: Current turn tracked in games table
- **Steal Limits**: Enforced at application level (steal_count < 2)

## Performance Considerations

- All foreign keys are indexed
- Composite indexes for common query patterns
- Partial index on opened gifts for faster filtering
- Connection pooling via pg Pool

## Migration Notes

- Schema uses `CREATE IF NOT EXISTS` for idempotent initialization
- Triggers use `DROP IF EXISTS` before creation
- Safe to run schema initialization multiple times

