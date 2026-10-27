import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import { StorageProvider } from "../StorageProvider.js";
import { UploadFailedError, DeleteFailedError, ProviderConfigurationError, FileNotFoundError, StorageUnavailableError } from "../errors.js";

// Helper for retrying operation
const runWithRetry = async (fn, maxRetries = 3, delayMs = 1000) => {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      console.warn(`R2 operation failed (attempt ${attempt}/${maxRetries}):`, err.message);
      if (attempt >= maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
    }
  }
};

export class CloudflareR2Provider extends StorageProvider {
  constructor() {
    super();
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET;
    this.publicUrl = process.env.R2_PUBLIC_URL || "";

    if (!accountId || !accessKeyId || !secretAccessKey || !this.bucketName) {
      throw new ProviderConfigurationError("Cloudflare R2 credentials are incomplete in environment variables.");
    }

    try {
      this.s3Client = new S3Client({
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
        region: "auto",
      });
    } catch (err) {
      throw new ProviderConfigurationError(`Failed to initialize S3Client for R2: ${err.message}`, err);
    }
  }

  /**
   * Stream a local temporary file to R2 bucket and clean up the local copy
   */
  async upload(localPath, key, mimeType) {
    if (!fs.existsSync(localPath)) {
      throw new FileNotFoundError(`Source file to upload not found: ${localPath}`);
    }

    try {
      const fileStream = fs.createReadStream(localPath);
      await runWithRetry(async () => {
        await this.s3Client.send(
          new PutObjectCommand({
            Bucket: this.bucketName,
            Key: key,
            Body: fileStream,
            ContentType: mimeType,
          })
        );
      });

      // Cleanup local temp file on successful upload
      try {
        fs.unlinkSync(localPath);
      } catch (_) {}

      return this.getPublicUrl(key);
    } catch (err) {
      console.error(`R2 upload failed for key ${key}:`, err);
      // Cleanup local temp file on failure
      try {
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
        }
      } catch (_) {}
      throw new UploadFailedError(`R2 upload failed for key ${key}: ${err.message}`, err);
    }
  }

  /**
   * Delete an object from the R2 bucket
   */
  async delete(key) {
    try {
      await runWithRetry(async () => {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          })
        );
      });
    } catch (err) {
      console.error(`R2 delete failed for key ${key}:`, err);
      throw new DeleteFailedError(`R2 delete failed for key ${key}: ${err.message}`, err);
    }
  }

  /**
   * Check if object exists in R2 bucket
   */
  async exists(key) {
    try {
      await runWithRetry(async () => {
        await this.s3Client.send(
          new HeadObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          })
        );
      });
      return true;
    } catch (err) {
      if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      console.error(`R2 exists check failed for key ${key}:`, err);
      return false;
    }
  }

  /**
   * Get public URL for R2 key
   */
  getPublicUrl(key) {
    const publicUrlBase = this.publicUrl.endsWith("/") ? this.publicUrl.slice(0, -1) : this.publicUrl;
    return `${publicUrlBase}/${key}`;
  }

  /**
   * Retrieve read stream for R2 object
   */
  async getReadStream(key) {
    try {
      const response = await runWithRetry(async () => {
        return await this.s3Client.send(
          new GetObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          })
        );
      });
      return response.Body;
    } catch (err) {
      if (err.name === "NoSuchKey" || err.$metadata?.httpStatusCode === 404) {
        throw new FileNotFoundError(`R2 object not found: ${key}`, err);
      }
      throw new StorageUnavailableError(`R2 read failed for key ${key}: ${err.message}`, err);
    }
  }

  /**
   * Perform R2 connection and capability check
   */
  async healthCheck() {
    try {
      await this.s3Client.send(
        new HeadBucketCommand({
          Bucket: this.bucketName,
        })
      );
      return { status: "healthy", bucket: this.bucketName };
    } catch (err) {
      return { status: "unhealthy", error: err.message };
    }
  }
}

// Export as R2StorageProvider for backward compatibility
export { CloudflareR2Provider as R2StorageProvider };
export default CloudflareR2Provider;
