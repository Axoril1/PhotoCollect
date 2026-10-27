import { storageService } from "../storage/StorageService.js";

// Force initialization on import to support dynamic environment checks in tests
try {
  storageService.init();
} catch (err) {
  // Ignore configuration errors during static import if credentials aren't loaded yet
}

export const provider = process.env.STORAGE_PROVIDER || "local";
export const r2PublicUrl = process.env.R2_PUBLIC_URL || "";

// Export the underlying S3 client of R2 provider for testing/backward compatibility
export const s3Client = storageService.isR2Enabled() 
  ? storageService.getProvider().s3Client 
  : null;

/**
 * Upload helper (retained for backward compatibility and test mock compatibility)
 */
export const uploadFile = async (localPath, filename, type, contentType) => {
  const activeProvider = storageService.getProvider();
  if (storageService.isR2Enabled()) {
    const fs = await import("fs");
    const fileStream = fs.createReadStream(localPath);
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    await activeProvider.s3Client.send(
      new PutObjectCommand({
        Bucket: activeProvider.bucketName,
        Key: `${type}/${filename}`,
        Body: fileStream,
        ContentType: contentType,
      })
    );
    const publicUrlBase = activeProvider.publicUrl.endsWith("/") ? activeProvider.publicUrl.slice(0, -1) : activeProvider.publicUrl;
    return `${publicUrlBase}/${type}/${filename}`;
  }
  return null;
};

/**
 * Delete helper
 */
export const deleteFile = async (filename, storageProvider = "local") => {
  return await storageService.deletePhoto(filename, storageProvider);
};

/**
 * Stream helper
 */
export const getFileStream = async (filename, type, storageProvider = "local") => {
  return await storageService.getFileStream(filename, type, storageProvider);
};

/**
 * R2 status helper
 */
export const isR2Enabled = () => {
  return storageService.isR2Enabled();
};

export { storageService };
export default storageService;
