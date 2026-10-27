import { LocalStorageProvider } from "./providers/LocalStorageProvider.js";
import { R2StorageProvider } from "./providers/R2StorageProvider.js";
import { ProviderConfigurationError, StorageUnavailableError, DeleteFailedError } from "./errors.js";
import crypto from "crypto";
import path from "path";
import os from "os";
import fs from "fs";
import sharp from "sharp";

class StorageService {
  constructor() {
    this.provider = null;
    this.activeProviderName = null;
    this.initialized = false;
  }

  get providerName() {
    return process.env.STORAGE_PROVIDER || "local";
  }

  init() {
    const activeName = this.providerName;
    if (this.initialized && this.activeProviderName === activeName) return;

    try {
      if (activeName === "local") {
        this.provider = new LocalStorageProvider();
      } else if (activeName === "r2" || activeName === "cloudflare-r2") {
        this.provider = new R2StorageProvider();
      } else {
        throw new ProviderConfigurationError(`Unsupported storage provider: ${activeName}`);
      }
      this.activeProviderName = activeName;
      this.initialized = true;
      console.log(`[StorageService] Initialized with provider: ${activeName}`);
    } catch (err) {
      console.error(`[StorageService] Failed to initialize provider ${activeName}:`, err.message);
      throw err;
    }
  }

  getProvider() {
    if (!this.initialized) {
      this.init();
    }
    if (!this.provider) {
      throw new StorageUnavailableError("Storage service is not initialized");
    }
    return this.provider;
  }

  /**
   * Process photo (rotate, generate thumbnail as webp) and store in active provider
   * @param {Object} file - Multer file object
   * @param {Object} event - Event Mongoose model instance
   * @param {Object} req - Express request object for local public URL mapping
   */
  async storePhoto(file, event, req) {
    const provider = this.getProvider();
    const startTime = Date.now();
    const uuid = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const originalKey = `events/${event._id}/originals/${uuid}${ext}`;
    const thumbnailKey = `events/${event._id}/thumbnails/${uuid}.webp`;
    const tempThumbPath = path.join(os.tmpdir(), `thumb_${uuid}.webp`);

    try {
      // 1. Process thumbnail as WebP
      await sharp(file.path)
        .rotate()
        .resize(600, 600, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 75 })
        .toFile(tempThumbPath);

      // 2. Upload both files
      await provider.upload(file.path, originalKey, file.mimetype);
      await provider.upload(tempThumbPath, thumbnailKey, "image/webp");

      // 3. Generate public URLs
      const originalUrl = await provider.getPublicUrl(originalKey, req);
      const thumbnailUrl = await provider.getPublicUrl(thumbnailKey, req);

      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        level: "info",
        message: "Upload success",
        provider: this.providerName,
        filename: originalKey,
        sizeBytes: file.size,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      }));

      return {
        filename: originalKey,
        originalUrl,
        thumbnailUrl,
        storageProvider: this.providerName,
      };
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(JSON.stringify({
        level: "error",
        message: "Upload failure",
        provider: this.providerName,
        filename: originalKey,
        sizeBytes: file.size,
        durationMs: duration,
        error: err.message,
        timestamp: new Date().toISOString(),
      }));

      // Cleanup local files on failure if still exists
      [file.path, tempThumbPath].forEach((p) => {
        if (p && fs.existsSync(p)) {
          try { fs.unlinkSync(p); } catch (_) {}
        }
      });

      throw err;
    }
  }

  /**
   * Process and store branding asset (logo or cover image)
   */
  async storeBrandingAsset(file, event, req, assetType) {
    const provider = this.getProvider();
    const uuid = crypto.randomUUID();
    const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
    const key = `events/${event._id}/branding/${assetType}_${uuid}${ext}`;
    const tempPath = path.join(os.tmpdir(), `brand_${uuid}${ext}`);

    try {
      let sharpPipeline = sharp(file.path).rotate();
      if (assetType === "cover") {
        sharpPipeline = sharpPipeline.resize(1920, 1080, { fit: "inside", withoutEnlargement: true });
      } else if (assetType === "logo") {
        sharpPipeline = sharpPipeline.resize(400, 400, { fit: "inside", withoutEnlargement: true });
      }

      if (ext === ".png") {
        await sharpPipeline.png({ quality: 85 }).toFile(tempPath);
      } else if (ext === ".webp") {
        await sharpPipeline.webp({ quality: 85 }).toFile(tempPath);
      } else {
        await sharpPipeline.jpeg({ quality: 85 }).toFile(tempPath);
      }

      await provider.upload(tempPath, key, file.mimetype);
      const publicUrl = await provider.getPublicUrl(key, req);

      [file.path, tempPath].forEach((p) => {
        if (p && fs.existsSync(p)) {
          try { fs.unlinkSync(p); } catch (_) {}
        }
      });

      return {
        url: publicUrl,
        filename: key,
        storageProvider: this.providerName,
      };
    } catch (err) {
      [file.path].forEach((p) => {
        if (p && fs.existsSync(p)) {
          try { fs.unlinkSync(p); } catch (_) {}
        }
      });
      throw err;
    }
  }


  /**
   * Delete a photo and its thumbnail
   */
  async deletePhoto(filename, specificProvider = null) {
    const targetProviderName = specificProvider || this.providerName;
    const startTime = Date.now();
    try {
      let activeProvider = this.getProvider();
      
      // Select different provider if requested (useful during fallback/rollback phases)
      if (specificProvider && specificProvider !== this.providerName) {
        if (specificProvider === "local") {
          activeProvider = new LocalStorageProvider();
        } else if (specificProvider === "r2" || specificProvider === "cloudflare-r2") {
          activeProvider = new R2StorageProvider();
        }
      }

      // Resolve key formats (supporting legacy structure and event-scoped keys)
      const isOldFormat = !filename.startsWith("events/");
      let originalKey = filename;
      let thumbnailKey = filename
        .replace("/originals/", "/thumbnails/")
        .replace(/\.[^/.]+$/, ".webp");

      if (isOldFormat) {
        originalKey = `originals/${filename}`;
        thumbnailKey = `thumbnails/thumb_${filename}`;
      }

      const errors = [];
      try {
        await activeProvider.delete(originalKey);
      } catch (err) {
        errors.push(err);
      }

      try {
        await activeProvider.delete(thumbnailKey);
      } catch (err) {
        errors.push(err);
      }

      if (errors.length > 0) {
        throw new DeleteFailedError(`Delete partial failure: ${errors.map(e => e.message).join("; ")}`);
      }

      const duration = Date.now() - startTime;
      console.log(JSON.stringify({
        level: "info",
        message: "Delete success",
        provider: targetProviderName,
        filename,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      }));
    } catch (err) {
      const duration = Date.now() - startTime;
      console.error(JSON.stringify({
        level: "error",
        message: "Delete failure",
        provider: targetProviderName,
        filename,
        durationMs: duration,
        error: err.message,
        timestamp: new Date().toISOString(),
      }));
      throw err;
    }
  }

  /**
   * Retrieve file read stream
   */
  async getFileStream(filename, type, specificProvider = null) {
    let activeProvider = this.getProvider();
    
    if (specificProvider && specificProvider !== this.providerName) {
      if (specificProvider === "local") {
        activeProvider = new LocalStorageProvider();
      } else if (specificProvider === "r2" || specificProvider === "cloudflare-r2") {
        activeProvider = new R2StorageProvider();
      }
    }

    const isOldFormat = !filename.startsWith("events/");
    let key = filename;

    if (isOldFormat) {
      key = type === "thumbnails" ? `thumbnails/thumb_${filename}` : `originals/${filename}`;
    } else {
      if (type === "thumbnails") {
        key = filename
          .replace("/originals/", "/thumbnails/")
          .replace(/\.[^/.]+$/, ".webp");
      }
    }

    return await activeProvider.getReadStream(key);
  }

  /**
   * Check if active provider is R2/S3-compatible
   */
  isR2Enabled() {
    return (this.providerName === "r2" || this.providerName === "cloudflare-r2");
  }

  /**
   * Health check for active provider
   */
  async healthCheck() {
    const provider = this.getProvider();
    return await provider.healthCheck();
  }
}

export const storageService = new StorageService();
export default storageService;
