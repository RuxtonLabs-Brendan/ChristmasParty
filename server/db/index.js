import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Validate DATABASE_URL - warn but don't exit in production
if (!process.env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL environment variable is not set!');
  console.warn('Database features will be disabled. Game state will be in-memory only.');
  console.warn('To enable database persistence, set DATABASE_URL in your environment.');
}

// Create connection pool only if DATABASE_URL is set
let pool = null;
if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : {
      rejectUnauthorized: false
    }
  });
}

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
  if (!pool) {
    console.log('Database not configured, skipping schema initialization');
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

export async function updateGame(gameId, updates) {
  const fields = Object.keys(updates);
  const values = Object.values(updates);
  const setClause = fields.map((field, i) => {
    const dbField = field === 'hostId' ? 'host_id' : 
                   field === 'currentTurnIndex' ? 'current_turn_index' : field;
    return `${dbField} = $${i + 2}`;
  }).join(', ');
  
  const result = await pool.query(
    `UPDATE games SET ${setClause} WHERE id = $1 RETURNING *`,
    [gameId, ...values]
  );
  return result.rows[0];
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
    // In-memory fallback - return mock player
    return { id: socketId, socket_id: socketId, name, emoji, is_connected: true };
  }
  const result = await pool.query(
    `INSERT INTO players (game_id, socket_id, name, emoji, is_connected)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (game_id, socket_id) 
     DO UPDATE SET name = $3, emoji = $4, is_connected = true
     RETURNING *`,
    [gameId, socketId, name, emoji]
  );
  return result.rows[0];
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
  if (!pool) return [];
  
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
  
  return result.rows.map(row => ({
    id: row.socket_id,
    name: row.name,
    emoji: row.emoji,
    gifts: row.gifts || [],
    isConnected: row.is_connected
  }));
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
  await pool.query('BEGIN');
  try {
    // Get player ID
    const player = await getPlayerBySocketId(gameId, playerSocketId);
    if (!player) throw new Error('Player not found');
    
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
  await pool.query('BEGIN');
  try {
    // Get current player
    const currentPlayer = await getPlayerBySocketId(gameId, playerSocketId);
    if (!currentPlayer) throw new Error('Player not found');
    
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

