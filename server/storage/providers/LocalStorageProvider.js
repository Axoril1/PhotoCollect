import fs from "fs";
import path from "path";
import { StorageProvider } from "../StorageProvider.js";
import { UPLOAD_PATHS } from "../../utils/storage.js";
import { FileNotFoundError, UploadFailedError, DeleteFailedError } from "../errors.js";

export class LocalStorageProvider extends StorageProvider {
  /**
   * Helper to ensure target directories exist locally
   */
  _ensureDirExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Copy file from local temporary path to final key destination
   */
  async upload(localPath, key, mimeType) {
    const baseDir = UPLOAD_PATHS.base || "uploads";
    const destinationPath = path.join(baseDir, key);
    try {
      this._ensureDirExists(destinationPath);
      // Copy file to target location
      fs.copyFileSync(localPath, destinationPath);
      // Clean up temp file if different
      if (fs.existsSync(localPath) && path.resolve(localPath) !== path.resolve(destinationPath)) {
        try { fs.unlinkSync(localPath); } catch (_) {}
      }
      return key;
    } catch (err) {
      console.error(`Local provider upload failed for key ${key}:`, err);
      throw new UploadFailedError(`Failed to save local file to ${destinationPath}: ${err.message}`, err);
    }
  }

  /**
   * Delete file from local disk
   */
  async delete(key) {
    const baseDir = UPLOAD_PATHS.base || "uploads";
    const destinationPath = path.join(baseDir, key);
    if (fs.existsSync(destinationPath)) {
      try {
        fs.unlinkSync(destinationPath);
      } catch (err) {
        console.error(`Failed to delete local file ${destinationPath}:`, err);
        throw new DeleteFailedError(`Failed to delete local file ${key}: ${err.message}`, err);
      }
    }
  }

  /**
   * Check if file exists locally
   */
  async exists(key) {
    const baseDir = UPLOAD_PATHS.base || "uploads";
    const destinationPath = path.join(baseDir, key);
    return fs.existsSync(destinationPath);
  }

  /**
   * Build public URL for local file
   */
  async getPublicUrl(key, req) {
    const host = req ? `${req.protocol}://${req.get("host")}` : process.env.CLIENT_URL || "http://localhost:5000";
    return `${host}/uploads/${key}`;
  }

  /**
   * Retrieve local file read stream
   */
  async getReadStream(key) {
    const baseDir = UPLOAD_PATHS.base || "uploads";
    const destinationPath = path.join(baseDir, key);
    if (!fs.existsSync(destinationPath)) {
      throw new FileNotFoundError(`Local file not found for key: ${key}`);
    }
    return fs.createReadStream(destinationPath);
  }

  /**
   * Perform local disk health check
   */
  async healthCheck() {
    const baseDir = UPLOAD_PATHS.base || "uploads";
    const testFile = path.join(baseDir, ".healthcheck");
    try {
      this._ensureDirExists(testFile);
      fs.writeFileSync(testFile, "ok");
      fs.unlinkSync(testFile);
      return { status: "healthy" };
    } catch (err) {
      return { status: "unhealthy", error: err.message };
    }
  }
}
