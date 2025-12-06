import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file from server directory (works regardless of where server is started)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const { Pool } = pg;

// Validate DATABASE_URL - warn but don't exit in production
if (!process.env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL environment variable is not set!');
  console.warn('Database features will be disabled. Game state will be in-memory only.');
  console.warn('To enable database persistence, set DATABASE_URL in your environment.');
}

// Create connection pool only if DATABASE_URL is set
let pool = null;

function initializePool() {
  if (pool) {
    return pool; // Already initialized
  }
  
  if (!process.env.DATABASE_URL) {
    console.warn('WARNING: DATABASE_URL environment variable is not set!');
    console.warn('Database features will be disabled. Game state will be in-memory only.');
    return null;
  }
  
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
        rejectUnauthorized: false
      }
    });
    console.log('Database pool created successfully');
    return pool;
  } catch (error) {
    console.error('Error creating database pool:', error);
    return null;
  }
}

// Initialize pool immediately
pool = initializePool();

// Test connection only if pool exists
if (pool) {
  pool.on('connect', () => {
    console.log('Connected to Neon database');
  });

  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
  });
}

// Initialize database schema
export async function initDatabase() {
  // Ensure pool is initialized
  if (!pool) {
    pool = initializePool();
  }
  
  if (!pool) {
    console.warn('Database pool not initialized. Skipping schema creation.');
    console.warn('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'NOT SET');
    return;
  }
  
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const { fileURLToPath } = await import('url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const schemaPath = path.join(__dirname, 'schema.sql');
    
    const schema = await fs.readFile(schemaPath, 'utf8');
    
    // Execute schema - PostgreSQL can handle multiple statements
    // We'll catch and ignore "already exists" errors which are safe
    try {
      await pool.query(schema);
      console.log('Database schema initialized');
    } catch (error) {
      // These error codes indicate objects already exist, which is fine
      const safeErrorCodes = ['42710', '42P07', '42704', '42P16'];
      if (safeErrorCodes.includes(error.code)) {
        console.log('Database schema objects already exist (this is normal)');
      } else {
        // For other errors, log but don't fail - schema might be partially created
        console.warn('Schema initialization warning:', error.message);
        console.warn('This is usually safe if tables already exist');
      }
    }
  } catch (error) {
    console.error('Error reading schema file:', error);
    throw error;
  }
}

// Game operations
export async function createGame() {
  if (!pool) {
    // Return a mock game object if database is not available
    return { id: 'in-memory-game', phase: 'lobby', current_turn_index: 0 };
  }
  
  const result = await pool.query(
    'INSERT INTO games (phase, current_turn_index) VALUES ($1, $2) RETURNING *',
    ['lobby', 0]
  );
  return result.rows[0];
}

export async function getGame(gameId) {
  if (!pool) return null;
  const result = await pool.query('SELECT * FROM games WHERE id = $1', [gameId]);
  return result.rows[0];
}

export async function getLatestGame() {
  if (!pool) {
    console.log('getLatestGame: No database pool, returning null');
    return null;
  }
  // Get the most recent game that has players
  try {
    // First, let's see all games
    const allGames = await pool.query('SELECT id, phase, created_at FROM games ORDER BY created_at DESC LIMIT 5');
    console.log(`getLatestGame: Total games in database: ${allGames.rows.length}`);
    if (allGames.rows.length > 0) {
      console.log('getLatestGame: Recent games:', allGames.rows.map(g => ({ id: g.id, phase: g.phase })));
    }
    
    // Check players for each game
    for (const game of allGames.rows) {
      const playerCount = await pool.query('SELECT COUNT(*) as count FROM players WHERE game_id = $1', [game.id]);
      console.log(`getLatestGame: Game ${game.id} has ${playerCount.rows[0].count} players`);
    }
    
    const result = await pool.query(
      `SELECT g.* FROM games g
       WHERE EXISTS (SELECT 1 FROM players p WHERE p.game_id = g.id)
       ORDER BY g.created_at DESC
       LIMIT 1`
    );
    console.log(`getLatestGame: Found ${result.rows.length} game(s) with players`);
    if (result.rows.length > 0) {
      console.log(`getLatestGame: Returning game ID ${result.rows[0].id}`);
    } else {
      console.log('getLatestGame: No games found with players');
    }
    return result.rows[0] || null;
  } catch (error) {
    console.error('getLatestGame error:', error);
    console.error('getLatestGame error stack:', error.stack);
    return null;
  }
}

export async function getAnyGame() {
  if (!pool) return null;
  try {
    const result = await pool.query('SELECT * FROM games ORDER BY created_at DESC LIMIT 1');
    return result.rows[0] || null;
  } catch (error) {
    console.error('getAnyGame error:', error);
    return null;
  }
}

export async function updateGame(gameId, updates) {
  if (!pool) {
    console.log('updateGame: No database pool, skipping update');
    return null;
  }
  
  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((field, i) => {
    const dbField = field === 'hostId' ? 'host_id' : 
                   field === 'currentTurnIndex' ? 'current_turn_index' : field;
    return `${dbField} = $${i + 2}`;
  }).join(', ');
  
  try {
    const result = await pool.query(
      `UPDATE games SET ${setClause} WHERE id = $1 RETURNING *`,
      [gameId, ...values]
    );
    console.log(`updateGame: Updated game ${gameId}. Fields: ${fields.join(', ')}`);
    return result.rows[0];
  } catch (error) {
    console.error(`updateGame: Error updating game ${gameId}:`, error);
    throw error;
  }
}

export async function resetGame(gameId) {
  await pool.query('BEGIN');
  try {
    // Delete all gifts and players for this game
    await pool.query('DELETE FROM gifts WHERE game_id = $1', [gameId]);
    await pool.query('DELETE FROM players WHERE game_id = $1', [gameId]);
    // Reset game state
    await pool.query(
      'UPDATE games SET phase = $1, current_turn_index = $2, host_id = NULL WHERE id = $3',
      ['lobby', 0, gameId]
    );
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

// Player operations
export async function addPlayer(gameId, socketId, name, emoji) {
  if (!pool) {
    console.log('addPlayer: No database pool, using in-memory fallback');
    // In-memory fallback - return mock player
    return { id: socketId, socket_id: socketId, name, emoji, is_connected: true };
  }
  console.log(`addPlayer: Adding player to database - gameId: ${gameId}, socketId: ${socketId}, name: ${name}`);
  try {
    const result = await pool.query(
      `INSERT INTO players (game_id, socket_id, name, emoji, is_connected)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (game_id, socket_id) 
       DO UPDATE SET name = $3, emoji = $4, is_connected = true
       RETURNING *`,
      [gameId, socketId, name, emoji]
    );
    console.log(`addPlayer: Player saved successfully, row count: ${result.rows.length}`);
    if (result.rows.length > 0) {
      console.log(`addPlayer: Saved player:`, { id: result.rows[0].id, socket_id: result.rows[0].socket_id, name: result.rows[0].name });
    }
    return result.rows[0];
  } catch (error) {
    console.error('addPlayer: Database error:', error);
    throw error;
  }
}

export async function removePlayer(gameId, socketId) {
  await pool.query(
    'DELETE FROM players WHERE game_id = $1 AND socket_id = $2',
    [gameId, socketId]
  );
}

export async function setPlayerConnected(gameId, socketId, isConnected) {
  await pool.query(
    'UPDATE players SET is_connected = $1 WHERE game_id = $2 AND socket_id = $3',
    [isConnected, gameId, socketId]
  );
}

export async function getPlayers(gameId) {
  if (!pool) {
    console.log('getPlayers: No database pool, returning empty array');
    return [];
  }
  
  console.log(`getPlayers: Querying players for gameId: ${gameId}`);
  try {
    const result = await pool.query(
      `SELECT p.id, p.socket_id, p.name, p.emoji, p.is_connected, p.created_at,
       COALESCE(
         json_agg(pg.gift_id) FILTER (WHERE pg.gift_id IS NOT NULL),
         '[]'::json
       ) as gifts
       FROM players p
       LEFT JOIN player_gifts pg ON p.id = pg.player_id AND pg.game_id = $1
       WHERE p.game_id = $1
       GROUP BY p.id, p.socket_id, p.name, p.emoji, p.is_connected, p.created_at
       ORDER BY p.created_at`,
      [gameId]
    );
    
    console.log(`getPlayers: Found ${result.rows.length} players for gameId ${gameId}`);
    const players = result.rows.map(row => ({
      id: row.socket_id,
      name: row.name,
      emoji: row.emoji,
      gifts: row.gifts || [],
      isConnected: row.is_connected
    }));
    console.log(`getPlayers: Returning players:`, players.map(p => ({ id: p.id, name: p.name })));
    return players;
  } catch (error) {
    console.error('getPlayers: Database error:', error);
    return [];
  }
}

export async function getPlayerBySocketId(gameId, socketId) {
  const result = await pool.query(
    'SELECT * FROM players WHERE game_id = $1 AND socket_id = $2',
    [gameId, socketId]
  );
  return result.rows[0];
}

// Gift operations
export async function addGifts(gameId, gifts) {
  if (!pool) {
    // In-memory mode - gifts are handled by gameState cache
    return;
  }
  await pool.query('BEGIN');
  try {
    for (const gift of gifts) {
      await pool.query(
        `INSERT INTO gifts (game_id, gift_id, x, y, rotation, pattern, is_opened, 
         owner_id, steal_count, product_name, product_image)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, 0, $8, $9)
         ON CONFLICT (game_id, gift_id) DO NOTHING`,
        [
          gameId,
          gift.id,
          gift.x,
          gift.y,
          gift.rotation,
          gift.pattern,
          false,
          gift.product?.name || null,
          gift.product?.image || null
        ]
      );
    }
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

export async function getGifts(gameId) {
  if (!pool) return [];
  const result = await pool.query(
    `SELECT g.*, p.socket_id as owner_socket_id
     FROM gifts g
     LEFT JOIN players p ON g.owner_id = p.id
     WHERE g.game_id = $1
     ORDER BY g.created_at`,
    [gameId]
  );
  
  return result.rows.map(row => ({
    id: row.gift_id,
    x: row.x,
    y: row.y,
    rotation: row.rotation,
    pattern: row.pattern,
    isOpened: row.is_opened,
    ownerId: row.owner_socket_id,
    stealCount: row.steal_count,
    product: {
      name: row.product_name || '',
      image: row.product_image || ''
    }
  }));
}

export async function openGift(gameId, giftId, playerSocketId) {
  if (!pool) {
    console.log('openGift: No database pool, skipping open gift');
    return null;
  }
  
  await pool.query('BEGIN');
  try {
    // Get player ID
    const player = await getPlayerBySocketId(gameId, playerSocketId);
    if (!player) {
      await pool.query('ROLLBACK');
      throw new Error('Player not found');
    }
    
    // Update gift
    const giftResult = await pool.query(
      `UPDATE gifts 
       SET is_opened = true, owner_id = $1, steal_count = 0
       WHERE game_id = $2 AND gift_id = $3 AND is_opened = false
       RETURNING *`,
      [player.id, gameId, giftId]
    );
    
    if (giftResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return null;
    }
    
    // Add to player gifts
    await pool.query(
      `INSERT INTO player_gifts (player_id, gift_id, game_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [player.id, giftId, gameId]
    );
    
    await pool.query('COMMIT');
    
    // Return gift with socket_id
    const gift = giftResult.rows[0];
    return {
      id: gift.gift_id,
      x: gift.x,
      y: gift.y,
      rotation: gift.rotation,
      pattern: gift.pattern,
      isOpened: true,
      ownerId: playerSocketId,
      stealCount: 0,
      product: {
        name: gift.product_name || '',
        image: gift.product_image || ''
      }
    };
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

export async function stealGift(gameId, giftId, playerSocketId) {
  if (!pool) {
    console.log('stealGift: No database pool, skipping steal gift');
    return null;
  }
  
  await pool.query('BEGIN');
  try {
    // Get current player
    const currentPlayer = await getPlayerBySocketId(gameId, playerSocketId);
    if (!currentPlayer) {
      await pool.query('ROLLBACK');
      throw new Error('Player not found');
    }
    
    // Get gift with owner info
    const giftResult = await pool.query(
      `SELECT g.*, p.socket_id as owner_socket_id
       FROM gifts g
       LEFT JOIN players p ON g.owner_id = p.id
       WHERE g.game_id = $1 AND g.gift_id = $2 AND g.is_opened = true`,
      [gameId, giftId]
    );
    
    if (giftResult.rows.length === 0) {
      await pool.query('ROLLBACK');
      return null;
    }
    
    const gift = giftResult.rows[0];
    
    // Check if can steal
    if (gift.steal_count >= 2) {
      await pool.query('ROLLBACK');
      return null;
    }
    
    if (gift.owner_id === currentPlayer.id) {
      await pool.query('ROLLBACK');
      return null;
    }
    
    // Remove from old owner's gifts
    if (gift.owner_id) {
      await pool.query(
        'DELETE FROM player_gifts WHERE player_id = $1 AND gift_id = $2 AND game_id = $3',
        [gift.owner_id, giftId, gameId]
      );
    }
    
    // Update gift
    await pool.query(
      `UPDATE gifts 
       SET owner_id = $1, steal_count = steal_count + 1
       WHERE game_id = $2 AND gift_id = $3`,
      [currentPlayer.id, gameId, giftId]
    );
    
    // Add to current player's gifts
    await pool.query(
      `INSERT INTO player_gifts (player_id, gift_id, game_id)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [currentPlayer.id, giftId, gameId]
    );
    
    await pool.query('COMMIT');
    
    // Get updated gift
    const updatedGift = await pool.query(
      `SELECT g.*, p.socket_id as owner_socket_id
       FROM gifts g
       LEFT JOIN players p ON g.owner_id = p.id
       WHERE g.game_id = $1 AND g.gift_id = $2`,
      [gameId, giftId]
    );
    
    const updated = updatedGift.rows[0];
    return {
      id: updated.gift_id,
      x: updated.x,
      y: updated.y,
      rotation: updated.rotation,
      pattern: updated.pattern,
      isOpened: true,
      ownerId: updated.owner_socket_id,
      stealCount: updated.steal_count,
      product: {
        name: updated.product_name || '',
        image: updated.product_image || ''
      }
    };
  } catch (error) {
    await pool.query('ROLLBACK');
    throw error;
  }
}

// Admin gifts operations
export async function addAdminGift(name, image) {
  if (!pool) {
    // In-memory fallback for admin gifts
    const inMemoryGifts = global._inMemoryAdminGifts || [];
    const gift = {
      id: `admin-gift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      image,
      added_at: new Date().toISOString()
    };
    inMemoryGifts.push(gift);
    global._inMemoryAdminGifts = inMemoryGifts;
    return gift;
  }
  const giftId = `admin-gift-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const result = await pool.query(
    'INSERT INTO admin_gifts (gift_id, name, image) VALUES ($1, $2, $3) RETURNING *',
    [giftId, name, image || '']
  );
  return {
    id: result.rows[0].gift_id,
    name: result.rows[0].name,
    image: result.rows[0].image || '',
    addedAt: result.rows[0].added_at
  };
}

export async function getAdminGifts() {
  if (!pool) {
    return global._inMemoryAdminGifts || [];
  }
  const result = await pool.query(
    'SELECT * FROM admin_gifts ORDER BY added_at DESC'
  );
  return result.rows.map(row => ({
    id: row.gift_id,
    name: row.name,
    image: row.image || '',
    addedAt: row.added_at
  }));
}

export async function updateAdminGift(giftId, name, image) {
  if (!pool) {
    // In-memory mode - update in-memory store
    if (!global._inMemoryAdminGifts) {
      throw new Error('Gift not found');
    }
    const giftIndex = global._inMemoryAdminGifts.findIndex(g => g.id === giftId);
    if (giftIndex === -1) {
      throw new Error('Gift not found');
    }
    global._inMemoryAdminGifts[giftIndex] = {
      ...global._inMemoryAdminGifts[giftIndex],
      name: name.trim(),
      image: image || ''
    };
    return global._inMemoryAdminGifts[giftIndex];
  }
  
  const result = await pool.query(
    'UPDATE admin_gifts SET name = $1, image = $2 WHERE gift_id = $3 RETURNING *',
    [name, image || '', giftId]
  );
  if (result.rows.length === 0) {
    throw new Error('Gift not found');
  }
  return {
    id: result.rows[0].gift_id,
    name: result.rows[0].name,
    image: result.rows[0].image || '',
    addedAt: result.rows[0].added_at
  };
}

export async function deleteAdminGift(giftId) {
  if (!pool) {
    if (global._inMemoryAdminGifts) {
      global._inMemoryAdminGifts = global._inMemoryAdminGifts.filter(g => g.id !== giftId);
    }
    return;
  }
  await pool.query('DELETE FROM admin_gifts WHERE gift_id = $1', [giftId]);
}

export async function clearAdminGifts() {
  if (!pool) {
    global._inMemoryAdminGifts = [];
    return;
  }
  await pool.query('DELETE FROM admin_gifts');
}

export default pool;

