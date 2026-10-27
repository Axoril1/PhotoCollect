import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import Photo from "../models/Photo.js";
import { R2StorageProvider } from "../storage/providers/R2StorageProvider.js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import fsPath from "path";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = fsPath.dirname(__filename);

const isDryRun = process.argv.includes("--dry-run");

async function run() {
  console.log("--------------------------------------------------");
  console.log(`Starting Storage Migration to R2${isDryRun ? " (DRY RUN)" : ""}`);
  console.log("--------------------------------------------------\n");

  // 1. Connect to MongoDB
  try {
    await connectDB();
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err.message);
    process.exit(1);
  }

  // 2. Instantiate R2 Storage Provider
  let r2Provider;
  try {
    r2Provider = new R2StorageProvider();
    console.log("✓ R2 Provider initialized.");
  } catch (err) {
    console.error("Failed to initialize R2 Storage Provider. Check your credentials.");
    console.error("Error:", err.message);
    await mongoose.connection.close();
    process.exit(1);
  }

  // 3. Find all local photos
  const query = {
    $or: [
      { storageProvider: "local" },
      { storageProvider: { $exists: false } }
    ]
  };

  const localPhotos = await Photo.find(query);
  console.log(`Found ${localPhotos.length} local photos to migrate.\n`);

  if (localPhotos.length === 0) {
    console.log("No photos need migration. Exiting.");
    await mongoose.connection.close();
    process.exit(0);
  }

  const publicUrlBase = r2Provider.publicUrl.endsWith("/") 
    ? r2Provider.publicUrl.slice(0, -1) 
    : r2Provider.publicUrl;

  const stats = {
    success: 0,
    missingFiles: 0,
    failed: 0
  };

  // Base uploads directories
  const baseUploadsDir = fsPath.join(__dirname, "../uploads");
  const originalsDir = fsPath.join(baseUploadsDir, "originals");
  const thumbnailsDir = fsPath.join(baseUploadsDir, "thumbnails");

  for (let i = 0; i < localPhotos.length; i++) {
    const photo = localPhotos[i];
    const originalPath = fsPath.join(originalsDir, photo.filename);
    const thumbnailPath = fsPath.join(thumbnailsDir, `thumb_${photo.filename}`);
    
    console.log(`[${i + 1}/${localPhotos.length}] Processing: ${photo.filename}`);

    // Verify local files exist
    const hasOriginal = fs.existsSync(originalPath);
    const hasThumbnail = fs.existsSync(thumbnailPath);

    if (!hasOriginal || !hasThumbnail) {
      console.warn(`  ✗ Skipped: Local files missing.`);
      console.warn(`    Original exists: ${hasOriginal ? "Yes" : "No"} (${originalPath})`);
      console.warn(`    Thumbnail exists: ${hasThumbnail ? "Yes" : "No"} (${thumbnailPath})`);
      stats.missingFiles++;
      continue;
    }

    if (isDryRun) {
      console.log(`  [Dry Run] Would migrate: ${photo.filename} to R2.`);
      stats.success++;
      continue;
    }

    try {
      // 4. Upload original
      const ext = fsPath.extname(photo.filename).toLowerCase();
      let mimeType = "image/jpeg";
      if (ext === ".png") mimeType = "image/png";
      if (ext === ".gif") mimeType = "image/gif";
      if (ext === ".webp") mimeType = "image/webp";

      const originalKey = `originals/${photo.filename}`;
      const thumbnailKey = `thumbnails/thumb_${photo.filename}`;

      console.log("  Uploading original to R2...");
      await r2Provider.s3Client.send(
        new PutObjectCommand({
          Bucket: r2Provider.bucketName,
          Key: originalKey,
          Body: fs.createReadStream(originalPath),
          ContentType: mimeType,
        })
      );

      console.log("  Uploading thumbnail to R2...");
      await r2Provider.s3Client.send(
        new PutObjectCommand({
          Bucket: r2Provider.bucketName,
          Key: thumbnailKey,
          Body: fs.createReadStream(thumbnailPath),
          ContentType: "image/jpeg",
        })
      );

      // 5. Update DB record
      photo.originalUrl = `${publicUrlBase}/${originalKey}`;
      photo.thumbnailUrl = `${publicUrlBase}/${thumbnailKey}`;
      photo.storageProvider = "r2";
      await photo.save();

      console.log("  ✓ Migration complete and database updated.");
      stats.success++;
    } catch (err) {
      console.error(`  ✗ Failed to migrate ${photo.filename}:`, err.message);
      stats.failed++;
    }
  }

  console.log("\n--------------------------------------------------");
  console.log("Migration Summary");
  console.log("--------------------------------------------------");
  console.log(`Total photos processed: ${localPhotos.length}`);
  console.log(`Successfully migrated:  ${stats.success}`);
  console.log(`Missing local files:   ${stats.missingFiles}`);
  console.log(`Failed migrations:     ${stats.failed}`);
  console.log("--------------------------------------------------\n");

  await mongoose.connection.close();
  console.log("MongoDB connection closed. Process finished.");
}

run();
