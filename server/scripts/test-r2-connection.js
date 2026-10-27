import dotenv from "dotenv";
import { 
  S3Client, 
  HeadBucketCommand, 
  PutObjectCommand, 
  HeadObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand 
} from "@aws-sdk/client-s3";

dotenv.config();

console.log("------------------------------------------");
console.log("Cloudflare R2 Connection Test");
console.log("------------------------------------------\n");

// Step 1: Load and Validate Environment Variables
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucketName = process.env.R2_BUCKET_NAME || process.env.R2_BUCKET;

if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
  console.error("Step 1 Failed: Environment Configuration Incomplete");
  console.error("Reason: One or more required environment variables are missing.");
  console.error("Required variables status:");
  console.error(`- R2_ACCOUNT_ID: ${accountId ? "✓ Present" : "✗ Missing"}`);
  console.error(`- R2_ACCESS_KEY_ID: ${accessKeyId ? "✓ Present" : "✗ Missing"}`);
  console.error(`- R2_SECRET_ACCESS_KEY: ${secretAccessKey ? "✓ Present" : "✗ Missing"}`);
  console.error(`- R2_BUCKET_NAME (or R2_BUCKET): ${bucketName ? "✓ Present" : "✗ Missing"}`);
  console.error("\nSuggested fix: Please configure these variables in server/.env");
  process.exit(1);
}

console.log("✓ Environment Loaded");

// Step 2: Create R2 Client
let s3Client;
try {
  s3Client = new S3Client({
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    region: "auto",
  });
  console.log("✓ R2 Client Created");
} catch (err) {
  console.error("Step 2 Failed: S3Client Initialization Error");
  console.error("Reason:", err.message);
  process.exit(1);
}

// Step 3: Connect to Bucket
try {
  await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
  console.log("✓ Bucket Accessible");
} catch (err) {
  console.error("Step 3 Failed: Bucket Connection/Access Denied");
  console.error("Reason:", err.message);
  console.error("AWS Error Code:", err.name);
  console.error("\nSuggested fix: Verify the R2_BUCKET_NAME is correct and the API token has Read/Write permissions for this bucket.");
  process.exit(1);
}

// Step 4: File Upload
const timestamp = Date.now();
const testFilename = `r2-test-${timestamp}.txt`;
const testKey = `health-check/${testFilename}`;
const testContent = "Hello from PhotoCollect!";

try {
  await s3Client.send(new PutObjectCommand({
    Bucket: bucketName,
    Key: testKey,
    Body: testContent,
    ContentType: "text/plain",
  }));
  console.log("✓ Upload Successful");
} catch (err) {
  console.error("Step 4 Failed: File Upload to R2 Failed");
  console.error("Reason:", err.message);
  console.error("AWS Error Code:", err.name);
  process.exit(1);
}

// Step 5: Object Verification
try {
  await s3Client.send(new HeadObjectCommand({
    Bucket: bucketName,
    Key: testKey,
  }));
  console.log("✓ Object Found");
} catch (err) {
  console.error("Step 5 Failed: Object Verification Failed");
  console.error("Reason: Object not found in bucket after upload.", err.message);
  process.exit(1);
}

// Step 6: File Retrieval & Verification
try {
  const getResponse = await s3Client.send(new GetObjectCommand({
    Bucket: bucketName,
    Key: testKey,
  }));
  
  const streamToString = (stream) =>
    new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    });

  const downloadedContent = await streamToString(getResponse.Body);
  if (downloadedContent !== testContent) {
    throw new Error(`Content mismatch. Expected "${testContent}", but got "${downloadedContent}"`);
  }
  console.log("✓ Download Successful");
} catch (err) {
  console.error("Step 6 Failed: Object Download Verification Failed");
  console.error("Reason:", err.message);
  process.exit(1);
}

// Step 7: File Deletion
try {
  await s3Client.send(new DeleteObjectCommand({
    Bucket: bucketName,
    Key: testKey,
  }));
  console.log("✓ Delete Successful");
} catch (err) {
  console.error("Step 7 Failed: Object Deletion Failed");
  console.error("Reason:", err.message);
  process.exit(1);
}

// Step 8: Verify Deletion
try {
  await s3Client.send(new HeadObjectCommand({
    Bucket: bucketName,
    Key: testKey,
  }));
  console.error("Step 8 Failed: Cleanup Verification Failed");
  console.error("Reason: The object still exists in the bucket after deletion.");
  process.exit(1);
} catch (err) {
  if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) {
    console.log("✓ Cleanup Successful");
  } else {
    console.error("Step 8 Failed: Unexpected Error during cleanup verification");
    console.error("Reason:", err.message);
    process.exit(1);
  }
}

console.log("\n------------------------------------------");
console.log("ALL TESTS PASSED");
console.log("Cloudflare R2 is ready.");
console.log("------------------------------------------");
