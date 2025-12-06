// Vercel serverless function for admin gifts API
import { initDatabase } from '../../server/db/index.js';
import * as db from '../../server/db/index.js';

// Initialize database on cold start - cache the promise to avoid multiple initializations
let dbInitPromise = null;
async function ensureDb() {
  if (!dbInitPromise) {
    dbInitPromise = (async () => {
      try {
        await initDatabase();
        console.log('Database initialized for serverless function');
      } catch (error) {
        console.error('Database initialization error:', error);
        // Continue even if DB init fails (will use in-memory mode)
      }
    })();
  }
  await dbInitPromise;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await ensureDb();

  try {
    // Parse request body if present
    let body = {};
    if (req.method === 'POST' || req.method === 'PUT') {
      if (typeof req.body === 'string') {
        try {
          body = JSON.parse(req.body);
        } catch {
          body = {};
        }
      } else {
        body = req.body || {};
      }
    }

    // Parse URL to get route and ID
    // Handle both direct calls and rewrites from Vercel
    let pathname = req.url || '';
    try {
      const url = req.url ? new URL(req.url, `http://${req.headers.host || 'localhost'}`) : null;
      pathname = url?.pathname || req.url || '';
    } catch {
      pathname = req.url || '';
    }
    
    const pathParts = pathname.split('/').filter(Boolean);
    
    // Extract gift ID from path or query
    let giftId = req.query?.id || null;
    if (!giftId && pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      // If last part is a valid ID (not 'gifts', 'admin', or empty), use it
      if (lastPart !== 'gifts' && lastPart !== 'admin' && lastPart.length > 0 && !lastPart.includes('.')) {
        giftId = lastPart;
      }
    }

    if (req.method === 'GET') {
      // Get all gifts
      const gifts = await db.getAdminGifts();
      return res.status(200).json({ gifts });
    }

    if (req.method === 'POST') {
      // Check if it's extract-amazon-image endpoint
      if (pathname.includes('extract-amazon-image')) {
        // This would need the amazonImageExtractor, but for now return error
        return res.status(501).json({ error: 'Amazon image extraction not available in serverless mode' });
      }

      // Add a new gift
      const { name, image } = body;
      
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Gift name is required' });
      }

      const gift = await db.addAdminGift(name.trim(), image || '');
      const gifts = await db.getAdminGifts();
      return res.status(200).json({ gift, gifts });
    }

    if (req.method === 'DELETE') {
      // Check if deleting specific gift or clearing all
      // If URL ends with /gifts (no ID), clear all. Otherwise delete specific gift
      const isClearAll = !giftId || pathname.endsWith('/gifts') || pathname === '/api/admin/gifts';
      
      if (giftId && !isClearAll) {
        // Delete specific gift
        await db.deleteAdminGift(giftId);
        const gifts = await db.getAdminGifts();
        return res.status(200).json({ success: true, gifts });
      } else {
        // Clear all gifts
        await db.clearAdminGifts();
        return res.status(200).json({ success: true, gifts: [] });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

