import express from 'express';
import gameState from './gameState.js';
import { extractAmazonImage } from './amazonImageExtractor.js';

const router = express.Router();

// Get all admin gifts
router.get('/gifts', async (req, res) => {
  try {
    const gifts = await gameState.getAdminGifts();
    res.json({ gifts });
  } catch (error) {
    console.error('Error getting admin gifts:', error);
    res.status(500).json({ error: 'Failed to get admin gifts' });
  }
});

// Add a new gift
router.post('/gifts', async (req, res) => {
  try {
    const { name, image } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Gift name is required' });
    }

    const gift = await gameState.addAdminGift({
      name: name.trim(),
      image: image || ''
    });

    const gifts = await gameState.getAdminGifts();
    res.json({ gift, gifts });
  } catch (error) {
    console.error('Error adding admin gift:', error);
    res.status(500).json({ error: 'Failed to add admin gift' });
  }
});

// Update a gift
router.put('/gifts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, image } = req.body;
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Gift name is required' });
    }

    const gift = await gameState.updateAdminGift(id, {
      name: name.trim(),
      image: image || ''
    });

    const gifts = await gameState.getAdminGifts();
    res.json({ gift, gifts });
  } catch (error) {
    console.error('Error updating admin gift:', error);
    res.status(500).json({ error: error.message || 'Failed to update admin gift' });
  }
});

// Delete a gift
router.delete('/gifts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await gameState.deleteAdminGift(id);
    const gifts = await gameState.getAdminGifts();
    res.json({ success: true, gifts });
  } catch (error) {
    console.error('Error deleting admin gift:', error);
    res.status(500).json({ error: 'Failed to delete admin gift' });
  }
});

// Clear all gifts
router.delete('/gifts', async (req, res) => {
  try {
    await gameState.clearAdminGifts();
    res.json({ success: true, gifts: [] });
  } catch (error) {
    console.error('Error clearing admin gifts:', error);
    res.status(500).json({ error: 'Failed to clear admin gifts' });
  }
});

// Extract image from Amazon URL
router.post('/extract-amazon-image', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url || !url.trim()) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Check if it's an Amazon URL
    if (!url.includes('amazon.com') && !url.includes('amzn.to')) {
      return res.status(400).json({ error: 'Please provide an Amazon product URL' });
    }

    const imageUrl = await extractAmazonImage(url.trim());
    
    if (!imageUrl) {
      return res.status(404).json({ error: 'Could not extract image from Amazon URL' });
    }

    res.json({ imageUrl });
  } catch (error) {
    console.error('Error extracting Amazon image:', error);
    res.status(500).json({ error: 'Failed to extract image from Amazon URL' });
  }
});

export default router;
