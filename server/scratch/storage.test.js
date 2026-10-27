import fs from "fs";
import path from "path";
import assert from "assert";
import { Readable } from "stream";

// Helper to create dummy file
const createDummyFile = (filePath, content) => {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, content);
};

async function runLocalTests() {
  console.log("\n--- RUNNING LOCAL SERVICE TESTS ---");
  process.env.STORAGE_PROVIDER = "local";

  // Import dynamically to read the env var changes
  const { isR2Enabled, deleteFile, getFileStream } = await import("../services/storageService.js?local");

  assert.strictEqual(isR2Enabled(), false, "R2 should not be enabled in local mode");

  const originalFilename = "local_test_photo.jpg";
  const thumbFilename = `thumb_${originalFilename}`;

  const originalPath = path.join(process.cwd(), "uploads", "originals", originalFilename);
  const thumbPath = path.join(process.cwd(), "uploads", "thumbnails", thumbFilename);

  createDummyFile(originalPath, "dummy-original-data");
  createDummyFile(thumbPath, "dummy-thumbnail-data");

  console.log("Local test files created.");

  // Test streaming local file
  const stream = await getFileStream(originalFilename, "originals", "local");
  let originalData = "";
  for await (const chunk of stream) {
    originalData += chunk;
  }
  assert.strictEqual(originalData, "dummy-original-data", "Local stream data matches original data");
  console.log("Local stream verified successfully.");

  // Test deleting local files
  await deleteFile(originalFilename, "local");
  assert.ok(!fs.existsSync(originalPath), "Original local file was deleted");
  assert.ok(!fs.existsSync(thumbPath), "Thumbnail local file was deleted");
  console.log("Local file deletion verified successfully.");
}

async function runR2Tests() {
  console.log("\n--- RUNNING CLOUDFLARE R2 MOCKED TESTS ---");
  
  // Set R2 dummy env variables
  process.env.STORAGE_PROVIDER = "r2";
  process.env.R2_ACCOUNT_ID = "mock-account-id";
  process.env.R2_ACCESS_KEY_ID = "mock-access-key-id";
  process.env.R2_SECRET_ACCESS_KEY = "mock-secret-access-key";
  process.env.R2_BUCKET_NAME = "mock-bucket";
  process.env.R2_PUBLIC_URL = "https://cdn.photocollect.example.com/";

  // Dynamic import with unique query param to avoid cache
  const storageModule = await import("../services/storageService.js?r2");
  const { isR2Enabled, uploadFile, deleteFile, getFileStream, s3Client } = storageModule;

  assert.strictEqual(isR2Enabled(), true, "R2 should be enabled with env config set");
  assert.ok(s3Client, "s3Client should be initialized");

  const sentCommands = [];
  
  // Mock the send command of s3Client
  s3Client.send = async (command) => {
    sentCommands.push({
      name: command.constructor.name,
      input: command.input,
    });

    if (command.constructor.name === "GetObjectCommand") {
      // Return a dummy stream
      return {
        Body: Readable.from(["mock-r2-stream-data"]),
      };
    }

    return {};
  };

  const filename = "r2_test_photo.jpg";
  const tempPath = path.join(process.cwd(), "uploads", "originals", filename);
  createDummyFile(tempPath, "mock-temp-original-data");

  try {
    // 1. Test Upload
    console.log("Testing R2 file upload...");
    const publicUrl = await uploadFile(tempPath, filename, "originals", "image/jpeg");
    assert.strictEqual(publicUrl, "https://cdn.photocollect.example.com/originals/r2_test_photo.jpg", "Public URL format matches R2 format");
    
    // Verify that the command was sent correctly
    const putCmd = sentCommands.find(c => c.name === "PutObjectCommand");
    assert.ok(putCmd, "PutObjectCommand was sent to R2");
    assert.strictEqual(putCmd.input.Bucket, "mock-bucket", "Bucket matches input");
    assert.strictEqual(putCmd.input.Key, `originals/${filename}`, "Key matches input");
    assert.strictEqual(putCmd.input.ContentType, "image/jpeg", "ContentType matches input");
    console.log("R2 file upload verified successfully.");

    // 2. Test Get Stream
    console.log("Testing R2 file streaming...");
    const stream = await getFileStream(filename, "originals", "r2");
    let streamData = "";
    for await (const chunk of stream) {
      streamData += chunk;
    }
    assert.strictEqual(streamData, "mock-r2-stream-data", "R2 stream data matches mock data");
    
    const getCmd = sentCommands.find(c => c.name === "GetObjectCommand");
    assert.ok(getCmd, "GetObjectCommand was sent to R2");
    assert.strictEqual(getCmd.input.Bucket, "mock-bucket", "Bucket matches input");
    assert.strictEqual(getCmd.input.Key, `originals/${filename}`, "Key matches input");
    console.log("R2 file streaming verified successfully.");

    // 3. Test Delete
    console.log("Testing R2 file deletion...");
    sentCommands.length = 0; // Clear commands list
    await deleteFile(filename, "r2");

    const deleteCmds = sentCommands.filter(c => c.name === "DeleteObjectCommand");
    assert.strictEqual(deleteCmds.length, 2, "Two delete commands sent (original + thumbnail)");
    
    const originalDel = deleteCmds.find(c => c.input.Key === `originals/${filename}`);
    const thumbDel = deleteCmds.find(c => c.input.Key === `thumbnails/thumb_${filename}`);
    
    assert.ok(originalDel, "Delete original key sent");
    assert.ok(thumbDel, "Delete thumbnail key sent");
    assert.strictEqual(originalDel.input.Bucket, "mock-bucket", "Bucket matches input");
    assert.strictEqual(thumbDel.input.Bucket, "mock-bucket", "Bucket matches input");
    console.log("R2 file deletion verified successfully.");

  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

async function runR2FailureTests() {
  console.log("\n--- RUNNING CLOUDFLARE R2 FAILURE TESTS ---");
  
  process.env.STORAGE_PROVIDER = "r2";
  
  const storageModule = await import(`../services/storageService.js?r2-failure-${Date.now()}`);
  const { deleteFile, s3Client } = storageModule;

  // Mock the send command of s3Client to throw on DeleteObjectCommand
  s3Client.send = async (command) => {
    if (command.constructor.name === "DeleteObjectCommand") {
      throw new Error("S3 Delete Object Error Simulation");
    }
    return {};
  };

  const filename = "r2_failure_test_photo.jpg";
  
  let errorThrown = false;
  try {
    await deleteFile(filename, "r2");
  } catch (err) {
    errorThrown = true;
    assert.ok(err.message.includes("Delete partial failure"), "Error message contains delete partial failure");
    assert.ok(err.message.includes("S3 Delete Object Error Simulation"), "Error message contains simulated error");
  }
  
  assert.ok(errorThrown, "Expected deleteFile to throw on R2 delete failure");
  console.log("R2 delete failure throwing verified successfully.");
}

async function runLocalFailureTests() {
  console.log("\n--- RUNNING LOCAL FAILURE TESTS ---");
  process.env.STORAGE_PROVIDER = "local";

  const { deleteFile } = await import(`../services/storageService.js?local-failure-${Date.now()}`);

  const originalUnlinkSync = fs.unlinkSync;
  const originalExistsSync = fs.existsSync;
  
  // Mock fs methods
  fs.existsSync = () => true; // force exists to be true
  fs.unlinkSync = (path) => {
    throw new Error("Simulated local unlink failure");
  };

  let errorThrown = false;
  try {
    await deleteFile("local_fail.jpg", "local");
  } catch (err) {
    errorThrown = true;
    assert.ok(err.message.includes("Delete partial failure"), "Error message contains delete partial failure");
    assert.ok(err.message.includes("Simulated local unlink failure"), "Error message contains simulated local error");
  } finally {
    // Restore
    fs.unlinkSync = originalUnlinkSync;
    fs.existsSync = originalExistsSync;
  }

  assert.ok(errorThrown, "Expected deleteFile to throw on local delete failure");
  console.log("Local delete failure throwing verified successfully.");
}

async function main() {
  await runLocalTests();
  await runR2Tests();
  await runR2FailureTests();
  await runLocalFailureTests();
  console.log("\n=== ALL SYSTEM TESTS COMPLETED SUCCESSFULLY ===");
}

main().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
