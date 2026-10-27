export const validateFile = async (file, options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/jpg'],
    maxSizeBytes = 50 * 1024 * 1024, // 50MB original file cap
    minWidth = 100,
    minHeight = 100,
  } = options;

  // 1. Zero-byte check
  if (file.size === 0) {
    throw new Error(`File "${file.name}" is empty (0 bytes).`);
  }

  // 2. Size check
  if (file.size > maxSizeBytes) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(1);
    throw new Error(`File "${file.name}" is too large (${sizeMb}MB). Max limit is ${maxMb}MB.`);
  }

  // 3. Supported file type (by MIME type or extension)
  const lowerName = file.name.toLowerCase();
  const isTypeSupported = allowedTypes.includes(file.type) || 
    /\.(jpe?g|png|webp|heic|heif)$/i.test(lowerName);
  
  if (!isTypeSupported) {
    throw new Error(`File "${file.name}" has an unsupported format. Please upload JPEG, PNG, WEBP, or HEIC.`);
  }

  // 4. Minimum dimensions and corruption check
  // Note: HEIC/HEIF images cannot be decoded by standard HTML5 Image elements natively.
  // We skip dimension checks for HEIC/HEIF files until they are converted to JPEG.
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || lowerName.endsWith('.heic') || lowerName.endsWith('.heif');

  if (!isHeic) {
    await new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        if (img.width < minWidth || img.height < minHeight) {
          reject(new Error(`File "${file.name}" dimensions are too small (${img.width}x${img.height}px). Minimum required is ${minWidth}x${minHeight}px.`));
        } else {
          resolve();
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error(`File "${file.name}" is corrupted or could not be parsed as an image.`));
      };

      img.src = objectUrl;
    });
  }
};

/**
 * Filter duplicates out of the selected file list.
 * Identifies duplicates by combining name, size, and lastModified timestamp.
 */
export const checkDuplicates = (files, existingQueue = []) => {
  const duplicates = [];
  const seen = new Set();

  const existingKeys = new Set(
    existingQueue
      .filter(item => item.file)
      .map(item => `${item.file.name}-${item.file.size}-${item.file.lastModified}`)
  );

  const uniqueFiles = files.filter(file => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;
    if (seen.has(key) || existingKeys.has(key)) {
      duplicates.push(file.name);
      return false;
    }
    seen.add(key);
    return true;
  });

  return { uniqueFiles, duplicates };
};
