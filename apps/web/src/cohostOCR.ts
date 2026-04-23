/**
 * Cohost OCR Integration - Tesseract.js for username extraction from screenshots
 */

import type { OCRResult, ImageRegion } from './cohostTypes.js';

// Tesseract.js will be imported dynamically to avoid bundle bloat
let tesseractWorker: any = null;

/**
 * Initialize Tesseract.js worker (lazy load)
 */
async function initTesseract(): Promise<any> {
  if (tesseractWorker) {
    return tesseractWorker;
  }

  try {
    // Dynamic import to reduce initial bundle size
    const { createWorker } = await import('tesseract.js');
    
    tesseractWorker = await createWorker('eng', 1, {
      logger: (m) => {
        // Optional: Log OCR progress for debugging
        if (m.status === 'recognizing text') {
          console.log(`OCR progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    await tesseractWorker.setParameters({
      tessedit_char_whitelist:
        'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.@',
      tessedit_pageseg_mode: '7', // Treat image as single text line
    });

    return tesseractWorker;
  } catch (error) {
    console.error('Failed to initialize Tesseract.js:', error);
    throw new Error('OCR initialization failed. Please check your internet connection.');
  }
}

/**
 * Process image file with OCR to extract username
 * @param imageFile - Screenshot file uploaded by user
 * @param region - Optional: cropped region coordinates (if null, process full image)
 * @returns OCR result with extracted text and confidence
 */
export async function processImageOCR(
  imageFile: File,
  region?: ImageRegion,
): Promise<OCRResult> {
  const worker = await initTesseract();

  // Create image element from file
  const imageUrl = URL.createObjectURL(imageFile);
  const img = new Image();
  
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });

  // If region specified, crop image using canvas
  let processImage: HTMLCanvasElement | HTMLImageElement = img;
  if (region) {
    const canvas = document.createElement('canvas');
    canvas.width = region.width;
    canvas.height = region.height;
    const ctx = canvas.getContext('2d')!;
    
    // Draw cropped region
    ctx.drawImage(
      img,
      region.x,
      region.y,
      region.width,
      region.height,
      0,
      0,
      region.width,
      region.height,
    );
    
    processImage = canvas;
  }

  try {
    // Run OCR
    const {
      data: { text, confidence, words },
    } = await worker.recognize(processImage);

    URL.revokeObjectURL(imageUrl);

    // Clean up extracted text (remove extra whitespace)
    const cleanedText = text.trim().replace(/\s+/g, ' ');

    return {
      text: cleanedText,
      confidence: Math.round(confidence),
      words: words.map((word: any) => ({
        text: word.text,
        confidence: Math.round(word.confidence),
        bbox: word.bbox,
      })),
    };
  } catch (error) {
    URL.revokeObjectURL(imageUrl);
    console.error('OCR processing failed:', error);
    throw new Error('Failed to extract text from image. Please try again with a clearer screenshot.');
  }
}

/**
 * Extract username from OCR result (removes @ prefix, handles multiple words)
 * @param ocrResult - Raw OCR result from Tesseract.js
 * @returns Cleaned username string
 */
export function extractUsernameFromOCR(ocrResult: OCRResult): string {
  // Strategy 1: Take the highest confidence word if multiple words detected
  if (ocrResult.words.length > 1) {
    const bestWord = ocrResult.words.reduce((best, word) =>
      word.confidence > best.confidence ? word : best,
    );
    return cleanUsername(bestWord.text);
  }

  // Strategy 2: Use full text if single word
  return cleanUsername(ocrResult.text);
}

/**
 * Clean username string (remove @, special chars, whitespace)
 */
function cleanUsername(raw: string): string {
  return raw
    .replace(/^@+/, '') // Remove @ prefix
    .replace(/[^a-zA-Z0-9_.]/g, '') // Remove invalid chars
    .toLowerCase()
    .trim();
}

/**
 * Crop image region using HTML5 canvas
 * @param imageFile - Original screenshot file
 * @param region - Region coordinates to crop
 * @returns Cropped image as data URL
 */
export async function cropImageRegion(
  imageFile: File,
  region: ImageRegion,
): Promise<string> {
  const imageUrl = URL.createObjectURL(imageFile);
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = region.width;
  canvas.height = region.height;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(
    img,
    region.x,
    region.y,
    region.width,
    region.height,
    0,
    0,
    region.width,
    region.height,
  );

  URL.revokeObjectURL(imageUrl);

  // Return data URL for preview
  return canvas.toDataURL('image/png');
}

/**
 * Preprocess image for better OCR accuracy (grayscale, contrast, threshold)
 */
export async function preprocessImageForOCR(imageFile: File): Promise<File> {
  const imageUrl = URL.createObjectURL(imageFile);
  const img = new Image();

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d')!;

  // Draw original image
  ctx.drawImage(img, 0, 0);

  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert to grayscale and increase contrast
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    
    // Simple threshold: make text darker, background lighter
    const threshold = gray > 128 ? 255 : 0;
    
    data[i] = threshold; // R
    data[i + 1] = threshold; // G
    data[i + 2] = threshold; // B
  }

  ctx.putImageData(imageData, 0, 0);

  URL.revokeObjectURL(imageUrl);

  // Convert canvas to blob then File
  return new Promise<File>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Failed to create preprocessed image'));
        return;
      }
      const file = new File([blob], 'preprocessed.png', { type: 'image/png' });
      resolve(file);
    }, 'image/png');
  });
}

/**
 * Cleanup Tesseract.js worker (call on unmount or when done)
 */
export async function cleanupOCR(): Promise<void> {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
  }
}
