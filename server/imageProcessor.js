import fs from 'fs';

// Optional imports with fallback
let sharp, Tesseract;
try {
  const sharpModule = await import('sharp');
  sharp = sharpModule.default;
} catch (error) {
  console.warn('⚠️ Sharp library not available:', error.message);
  sharp = null;
}

try {
  const tesseractModule = await import('tesseract.js');
  Tesseract = tesseractModule.default;
} catch (error) {
  console.warn('⚠️ Tesseract library not available:', error.message);
  Tesseract = null;
}

export async function preprocessImage(inputPath) {
  if (!sharp) {
    console.warn('⚠️ Sharp not available, skipping image preprocessing');
    return inputPath; // Return original path
  }
  
  try {
    const outputPath = inputPath + '.proc.jpg';
    await sharp(inputPath)
      .rotate() // auto-orient
      .resize({ width: 1600, withoutEnlargement: true })
      .toColourspace('b-w')
      .normalize()
      .jpeg({ quality: 85 })
      .toFile(outputPath);
    return outputPath;
  } catch (error) {
    console.warn('⚠️ Image preprocessing failed:', error.message);
    return inputPath; // Return original path
  }
}

export async function extractTextWithOCR(imagePath, lang = 'eng') {
  if (!Tesseract) {
    console.warn('⚠️ Tesseract not available, skipping OCR');
    return 'OCR not available - Tesseract library missing';
  }
  
  try {
    const { data } = await Tesseract.recognize(imagePath, lang, { logger: () => {} });
    return (data?.text || '').trim();
  } catch (error) {
    console.warn('⚠️ OCR failed:', error.message);
    return 'OCR failed - ' + error.message;
  }
}

export async function basicVisionHints(imagePath) {
  try {
    const stats = fs.statSync(imagePath);
    return {
      sizeBytes: stats.size,
      available: sharp !== null,
      // Future: dominant colors, edges, shapes using sharp stats
    };
  } catch (error) {
    console.warn('⚠️ Vision hints failed:', error.message);
    return {
      sizeBytes: 0,
      available: false,
      error: error.message
    };
  }
}


