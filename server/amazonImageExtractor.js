import { parse } from 'node-html-parser';

/**
 * Extracts the main product image URL from an Amazon product page
 * @param {string} amazonUrl - Amazon product URL
 * @returns {Promise<string|null>} - Image URL or null if not found
 */
export async function extractAmazonImage(amazonUrl) {
  try {
    // Extract ASIN from URL if possible
    const asinMatch = amazonUrl.match(/\/dp\/([A-Z0-9]{10})|asin=([A-Z0-9]{10})|product\/([A-Z0-9]{10})/i);
    const asin = asinMatch ? (asinMatch[1] || asinMatch[2] || asinMatch[3]) : null;

    // Try to fetch the page
    const response = await fetch(amazonUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch Amazon page: ${response.status}`);
      return null;
    }

    const html = await response.text();
    const root = parse(html);

    // Method 1: Try to find the main product image by ID
    let imgElement = root.querySelector('#landingImage') || 
                     root.querySelector('#imgBlkFront') ||
                     root.querySelector('#main-image');

    if (imgElement) {
      const src = imgElement.getAttribute('src') || imgElement.getAttribute('data-src');
      if (src && src.startsWith('http')) {
        return src;
      }
    }

    // Method 2: Try to find in meta tags (og:image)
    const ogImage = root.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const content = ogImage.getAttribute('content');
      if (content && content.startsWith('http')) {
        return content;
      }
    }

    // Method 3: Try to find in JSON-LD structured data
    const jsonLdScripts = root.querySelectorAll('script[type="application/ld+json"]');
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script.text);
        if (data.image) {
          if (typeof data.image === 'string' && data.image.startsWith('http')) {
            return data.image;
          }
          if (data.image.url && data.image.url.startsWith('http')) {
            return data.image.url;
          }
          if (Array.isArray(data.image) && data.image[0] && data.image[0].startsWith('http')) {
            return data.image[0];
          }
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }

    // Method 4: Try to find any large product image
    const allImages = root.querySelectorAll('img');
    for (const img of allImages) {
      const src = img.getAttribute('src') || img.getAttribute('data-src');
      if (src && (
        src.includes('images-na.ssl-images-amazon.com') ||
        src.includes('images.amazon.com') ||
        src.includes('m.media-amazon.com')
      )) {
        // Prefer larger images (usually have _AC_SL1500_ or similar)
        if (src.includes('_AC_SL') || src.includes('_AC_SX')) {
          return src;
        }
      }
    }

    // Method 5: If we have ASIN, try to construct image URL
    if (asin) {
      // Try common Amazon image URL patterns
      const patterns = [
        `https://images-na.ssl-images-amazon.com/images/I/${asin}._AC_SL1500_.jpg`,
        `https://images-na.ssl-images-amazon.com/images/I/${asin}._AC_SX466_.jpg`,
        `https://m.media-amazon.com/images/I/${asin}._AC_SL1500_.jpg`,
      ];
      
      // Return first pattern (we can't verify if it exists without fetching)
      return patterns[0];
    }

    return null;
  } catch (error) {
    console.error('Error extracting Amazon image:', error);
    return null;
  }
}

