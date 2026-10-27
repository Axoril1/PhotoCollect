// Dynamic importer for heic2any to prevent blocking the main bundle or issues during SSR
const getHeic2Any = async () => {
  if (typeof window !== 'undefined') {
    try {
      const module = await import('heic2any');
      return module.default || module;
    } catch (err) {
      console.error('Failed to load heic2any dynamically:', err);
      throw new Error('HEIC/HEIF conversion library is not available.');
    }
  }
  return null;
};

export const compressImage = async (file, options = {}) => {
  const {
    maxLongEdge = 3000,
    quality = 0.82,
    minSizeToCompress = 1.5 * 1024 * 1024, // 1.5MB
  } = options;

  let workingFile = file;
  const lowerName = file.name.toLowerCase();
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || lowerName.endsWith('.heic') || lowerName.endsWith('.heif');

  // 1. Detect and Convert HEIC/HEIF to JPEG
  if (isHeic) {
    try {
      const heic2any = await getHeic2Any();
      if (!heic2any) {
        throw new Error('HEIC converter is not loaded.');
      }
      
      const convertedBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: quality,
      });

      const blobResult = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
      const newName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      
      workingFile = new File([blobResult], newName, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });
    } catch (err) {
      console.error('HEIC conversion failed:', err);
      throw new Error(`Could not convert HEIC/HEIF image to JPEG: ${err.message}`);
    }
  }

  // 2. Inspect dimensions and size
  const shouldResize = await new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(workingFile);
    
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const maxDim = Math.max(img.width, img.height);
      
      if (maxDim > maxLongEdge) {
        resolve({ resize: true, width: img.width, height: img.height });
      } else if (workingFile.size > minSizeToCompress) {
        resolve({ resize: false, compressOnly: true, width: img.width, height: img.height });
      } else {
        resolve({ resize: false, compressOnly: false });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ resize: false, compressOnly: false, error: true });
    };

    img.src = objectUrl;
  });

  if (shouldResize.error) {
    throw new Error('Unable to decode image file. It may be corrupted.');
  }

  // If already small and within limits, return the file as-is
  if (!shouldResize.resize && !shouldResize.compressOnly) {
    return workingFile;
  }

  // 3. Compress / Downscale via Canvas
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(workingFile);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let targetWidth = img.width;
      let targetHeight = img.height;

      if (shouldResize.resize) {
        if (img.width > img.height) {
          if (img.width > maxLongEdge) {
            targetHeight = Math.round((img.height * maxLongEdge) / img.width);
            targetWidth = maxLongEdge;
          }
        } else {
          if (img.height > maxLongEdge) {
            targetWidth = Math.round((img.width * maxLongEdge) / img.height);
            targetHeight = maxLongEdge;
          }
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context could not be created.'));
        return;
      }

      // Configure high-quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Modern browsers automatically respect EXIF orientation when drawing images on canvas
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Determine output mime type (default to original, fallback to jpeg if unknown or HEIC)
      let exportType = workingFile.type;
      if (!exportType || exportType === 'image/heic' || exportType === 'image/heif') {
        exportType = 'image/jpeg';
      }

      canvas.toBlob(
        (blob) => {
          // Free canvas memory buffer on completion
          canvas.width = 0;
          canvas.height = 0;

          if (!blob) {
            reject(new Error('Canvas export to blob failed.'));
            return;
          }

          // If compression didn't save space and we didn't resize, return the original
          if (blob.size >= workingFile.size && !shouldResize.resize) {
            resolve(workingFile);
            return;
          }

          const compressedFile = new File([blob], workingFile.name, {
            type: exportType,
            lastModified: Date.now(),
          });

          resolve(compressedFile);
        },
        exportType,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image decoding failed during canvas compression.'));
    };

    img.src = objectUrl;
  });
};
