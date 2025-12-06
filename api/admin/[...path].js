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
    // Vercel serverless functions may auto-parse JSON, but handle both cases
    let body = {};
    if (req.method === 'POST' || req.method === 'PUT') {
      try {
        // Log raw body to debug
        console.log('Raw req.body type:', typeof req.body);
        console.log('Raw req.body:', req.body);
        
        if (req.body) {
          if (typeof req.body === 'string') {
            try {
              body = JSON.parse(req.body);
            } catch (e) {
              console.error('Failed to parse body as JSON:', e);
              body = {};
            }
          } else if (typeof req.body === 'object') {
            body = req.body;
          } else {
            console.log('Unexpected body type:', typeof req.body);
            body = {};
          }
        } else {
          console.log('No body in request');
        }
        console.log('Parsed body:', body);
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
    
    console.log('Request path:', req.url);
    console.log('Path array:', pathArray);
    console.log('First segment:', firstSegment);
    console.log('Request body:', JSON.stringify(body));
    console.log('Request method:', req.method);

    // Extract gift ID from path (if path is like ['gifts', '123'])
    let giftId = null;
    if (pathArray.length > 1) {
      giftId = pathArray[pathArray.length - 1];
    } else if (pathArray.length === 1 && firstSegment !== 'gifts' && firstSegment !== 'extract-amazon-image' && !firstSegment.includes('.')) {
      // Single segment that's not a known endpoint might be an ID
      giftId = firstSegment;
    }

    // Handle extract-amazon-image endpoint
    // Check both path segment and URL to handle different routing scenarios
    const isExtractEndpoint = firstSegment === 'extract-amazon-image' || 
                             (req.url && req.url.includes('extract-amazon-image'));
    
    if (isExtractEndpoint && req.method === 'POST') {
      try {
        console.log('Processing extract-amazon-image request');
        console.log('Body:', JSON.stringify(body));
        console.log('Body keys:', Object.keys(body || {}));
        const { url } = body || {};
        console.log('Extracted URL from body:', url);
        console.log('URL type:', typeof url);
        
        if (!url) {
          console.log('URL validation failed: URL is missing');
          return res.status(400).json({ 
            error: 'URL is required',
            received: body,
            bodyKeys: Object.keys(body || {})
          });
        }
        
        if (typeof url === 'string' && !url.trim()) {
          console.log('URL validation failed: URL is empty string');
          return res.status(400).json({ error: 'URL cannot be empty' });
        }

        const urlString = typeof url === 'string' ? url.trim() : String(url).trim();

        // Check if it's an Amazon URL
        if (!urlString.includes('amazon.com') && !urlString.includes('amzn.to')) {
          console.log('URL validation failed: Not an Amazon URL');
          return res.status(400).json({ error: 'Please provide an Amazon product URL' });
        }

        console.log('Extracting image from Amazon URL:', urlString);
        const imageUrl = await extractAmazonImage(urlString);
        
        if (!imageUrl) {
          console.log('Image extraction returned null');
          return res.status(404).json({ error: 'Could not extract image from Amazon URL' });
        }

        console.log('Extracted image URL:', imageUrl);
        return res.status(200).json({ imageUrl });
      } catch (error) {
        console.error('Error extracting Amazon image:', error);
        console.error('Error stack:', error.stack);
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

      if (req.method === 'PUT') {
        // Update a gift
        if (!giftId) {
          return res.status(400).json({ error: 'Gift ID is required for update' });
        }

        const { name, image } = body;
        
        if (!name || typeof name !== 'string' || !name.trim()) {
          return res.status(400).json({ error: 'Gift name is required' });
        }

        try {
          const updatedGift = await db.updateAdminGift(giftId, name.trim(), (image || '').trim());
          const gifts = await db.getAdminGifts();
          return res.status(200).json({ 
            gift: updatedGift, 
            gifts: gifts || [] 
          });
        } catch (error) {
          console.error('Error updating gift:', error);
          return res.status(500).json({ error: error.message || 'Failed to update gift' });
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

