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
  // Wrap everything in try-catch to ensure we always return a response
  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      return res.status(200).json({});
    }

    // Initialize database before proceeding
    try {
      await ensureDb();
    } catch (dbError) {
      console.error('Database initialization failed:', dbError);
      // Continue - will use in-memory mode if DB fails
    }

    // Parse request body if present
    let body = {};
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        if (req.body) {
          if (typeof req.body === 'string') {
            body = JSON.parse(req.body);
          } else if (typeof req.body === 'object') {
            body = req.body;
          }
        }
      } catch (parseError) {
        console.error('Error parsing request body:', parseError);
        return res.status(400).json({ error: 'Invalid JSON in request body' });
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
      try {
        const gifts = await db.getAdminGifts();
        return res.status(200).json({ gifts: gifts || [] });
      } catch (error) {
        console.error('Error getting gifts:', error);
        return res.status(200).json({ gifts: [] });
      }
    }

    if (req.method === 'POST') {
      // Check if it's extract-amazon-image endpoint
      if (pathname.includes('extract-amazon-image')) {
        // This would need the amazonImageExtractor, but for now return error
        return res.status(501).json({ error: 'Amazon image extraction not available in serverless mode' });
      }

      // Add a new gift
      console.log('POST request received, body:', JSON.stringify(body));
      const { name, image } = body;
      
      if (!name || typeof name !== 'string' || !name.trim()) {
        console.log('Validation failed: name is missing or invalid');
        return res.status(400).json({ error: 'Gift name is required' });
      }

      try {
        console.log('Adding gift:', { name: name.trim(), image: (image || '').trim() });
        const gift = await db.addAdminGift(name.trim(), (image || '').trim());
        console.log('Gift added successfully:', gift);
        const gifts = await db.getAdminGifts();
        console.log('Retrieved gifts:', gifts);
        // Ensure we always return valid JSON
        const response = { 
          gift: gift || null, 
          gifts: Array.isArray(gifts) ? gifts : [] 
        };
        console.log('Sending response:', response);
        return res.status(200).json(response);
      } catch (error) {
        console.error('Error adding gift:', error);
        console.error('Error stack:', error.stack);
        return res.status(500).json({ 
          error: error?.message || 'Failed to add gift',
          details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
      }
    }

    if (req.method === 'DELETE') {
      // Check if deleting specific gift or clearing all
      // If URL ends with /gifts (no ID), clear all. Otherwise delete specific gift
      const isClearAll = !giftId || pathname.endsWith('/gifts') || pathname === '/api/admin/gifts';
      
      try {
        if (giftId && !isClearAll) {
          // Delete specific gift
          await db.deleteAdminGift(giftId);
          const gifts = await db.getAdminGifts();
          return res.status(200).json({ success: true, gifts: gifts || [] });
        } else {
          // Clear all gifts
          await db.clearAdminGifts();
          return res.status(200).json({ success: true, gifts: [] });
        }
      } catch (error) {
        console.error('Error deleting gift:', error);
        return res.status(500).json({ error: error.message || 'Failed to delete gift' });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Admin API error:', error);
    // Always return valid JSON, even on unexpected errors
    try {
      return res.status(500).json({ error: error?.message || 'Internal server error' });
    } catch (responseError) {
      // If we can't send response, log it
      console.error('Failed to send error response:', responseError);
      // Try one more time with a simple response
      if (!res.headersSent) {
        res.status(500).end(JSON.stringify({ error: 'Internal server error' }));
      }
    }
  }
}

