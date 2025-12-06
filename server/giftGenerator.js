import { GIFT_PATTERNS } from '../shared/types.js';
import gameState from './gameState.js';

// Fallback products if no admin gifts are available
const FALLBACK_PRODUCTS = [
  { name: 'Wireless Earbuds', image: 'https://images-na.ssl-images-amazon.com/images/I/71SUiGUEUXL._AC_SL1500_.jpg' },
  { name: 'Smart Watch', image: 'https://images-na.ssl-images-amazon.com/images/I/71Swqqe7XAL._AC_SX466_.jpg' },
  { name: 'Coffee Maker', image: 'https://images-na.ssl-images-amazon.com/images/I/81O%2BGNdkzKL._AC_SX450_.jpg' },
  { name: 'Bluetooth Speaker', image: 'https://images-na.ssl-images-amazon.com/images/I/71aJ4l8n%2BXL._AC_SL1500_.jpg' },
  { name: 'Tablet Stand', image: 'https://images-na.ssl-images-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg' },
  { name: 'Phone Case', image: 'https://images-na.ssl-images-amazon.com/images/I/71WBQ2gqYEL._AC_SL1500_.jpg' },
  { name: 'Desk Lamp', image: 'https://images-na.ssl-images-amazon.com/images/I/61k%2BZvF%2BkXL._AC_SL1500_.jpg' },
  { name: 'Water Bottle', image: 'https://images-na.ssl-images-amazon.com/images/I/71gGPRwqkyL._AC_SL1500_.jpg' },
  { name: 'Backpack', image: 'https://images-na.ssl-images-amazon.com/images/I/81QPKvJfXlL._AC_SL1500_.jpg' },
  { name: 'Headphones', image: 'https://images-na.ssl-images-amazon.com/images/I/61SUj2aKoEL._AC_SL1500_.jpg' },
  { name: 'Keyboard', image: 'https://images-na.ssl-images-amazon.com/images/I/71Swqqe7XAL._AC_SX466_.jpg' },
  { name: 'Mouse Pad', image: 'https://images-na.ssl-images-amazon.com/images/I/81O%2BGNdkzKL._AC_SX450_.jpg' }
];

export async function generateGifts(playerCount) {
  const gifts = [];
  const centerX = 500; // Center of 1000px board
  const centerY = 500;
  const radius = 180;
  
  // Use admin gifts if available, otherwise use fallback
  const adminGifts = await gameState.getAdminGifts();
  const products = adminGifts.length > 0 
    ? adminGifts.map(g => ({ name: g.name, image: g.image }))
    : FALLBACK_PRODUCTS;
  
  // Shuffle products to use
  const shuffledProducts = [...products].sort(() => Math.random() - 0.5);
  
  // Use playerCount or number of available products, whichever is smaller
  const giftCount = Math.min(playerCount, shuffledProducts.length);
  
  for (let i = 0; i < giftCount; i++) {
    // Position gifts in circle around tree
    const angle = (2 * Math.PI * i) / giftCount + (Math.random() - 0.5) * 0.5;
    const x = centerX + radius * Math.cos(angle) + (Math.random() - 0.5) * 40;
    const y = centerY + radius * Math.sin(angle) + (Math.random() - 0.5) * 40;
    const rotation = Math.random() * 360;
    
    const product = shuffledProducts[i % shuffledProducts.length];
    
    gifts.push({
      id: `gift-${i}`,
      x,
      y,
      rotation,
      pattern: GIFT_PATTERNS[i % GIFT_PATTERNS.length],
      isOpened: false,
      ownerId: null,
      stealCount: 0,
      product: {
        name: product.name,
        image: product.image || ''
      }
    });
  }
  
  return gifts;
}

