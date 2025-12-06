// Vercel serverless function for all admin API routes (catch-all)
import { initDatabase } from '../../server/db/index.js';
import * as db from '../../server/db/index.js';
import { extractAmazonImage } from '../../server/amazonImageExtractor.js';

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

    // Get the path from the catch-all parameter
    // For /api/admin/gifts, req.query.path = ['gifts']
    // For /api/admin/extract-amazon-image, req.query.path = ['extract-amazon-image']
    const path = req.query.path || [];
    const pathArray = Array.isArray(path) ? path : (path ? [path] : []);
    const firstSegment = pathArray[0] || '';
    
    // Extract gift ID from path (if path is like ['gifts', '123'])
    let giftId = null;
    if (pathArray.length > 1) {
      giftId = pathArray[pathArray.length - 1];
    } else if (pathArray.length === 1 && firstSegment !== 'gifts' && firstSegment !== 'extract-amazon-image' && !firstSegment.includes('.')) {
      // Single segment that's not a known endpoint might be an ID
      giftId = firstSegment;
    }

    // Handle extract-amazon-image endpoint
    if (firstSegment === 'extract-amazon-image' && req.method === 'POST') {
      try {
        const { url } = body;
        
        if (!url || !url.trim()) {
          return res.status(400).json({ error: 'URL is required' });
        }

        // Check if it's an Amazon URL
        if (!url.includes('amazon.com') && !url.includes('amzn.to')) {
          return res.status(400).json({ error: 'Please provide an Amazon product URL' });
        }

        console.log('Extracting image from Amazon URL:', url);
        const imageUrl = await extractAmazonImage(url.trim());
        
        if (!imageUrl) {
          return res.status(404).json({ error: 'Could not extract image from Amazon URL' });
        }

        console.log('Extracted image URL:', imageUrl);
        return res.status(200).json({ imageUrl });
      } catch (error) {
        console.error('Error extracting Amazon image:', error);
        return res.status(500).json({ error: 'Failed to extract image from Amazon URL: ' + (error?.message || 'Unknown error') });
      }
    }

    // Handle gifts endpoints (default or /gifts)
    if (firstSegment === 'gifts' || firstSegment === '' || pathArray.length === 0) {
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
        // If giftId is set, delete specific gift. Otherwise clear all.
        const isClearAll = !giftId;
        
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
    }

    return res.status(404).json({ error: 'Endpoint not found' });
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

