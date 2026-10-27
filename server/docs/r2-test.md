# Cloudflare R2 Connection Validation

This document describes the purpose, execution steps, expected outputs, and troubleshooting procedures for the Cloudflare R2 Connection Test script.

---

## 1. Purpose

Before migrating the PhotoCollect application storage layer from the local disk to Cloudflare R2 (or any S3-compatible cloud storage provider), this isolated script verifies:
1. Environmental setup (presence of all configuration keys).
2. Proper client initialization.
3. Network connection and bucket accessibility.
4. Bucket write (upload), read (download/fetch), and delete operations.

---

## 2. Environment Variables

The connection test reads variables from the `server/.env` file. Ensure the following configurations exist:

```bash
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key-id
R2_SECRET_ACCESS_KEY=your-r2-secret-access-key
R2_BUCKET_NAME=your-r2-bucket-name
```
*Note: The script also accepts `R2_BUCKET` as a fallback parameter.*

---

## 3. How to Run

Execute the validation script directly using npm:

```bash
# Navigate to the server folder (if not already there)
cd server

# Execute connection validation
npm run test:r2
```

---

## 4. Expected Output

When all connection parameters are correct and the bucket is writable, the console output will show:

```text
------------------------------------------
Cloudflare R2 Connection Test
------------------------------------------

✓ Environment Loaded
✓ R2 Client Created
✓ Bucket Accessible
✓ Upload Successful
✓ Object Found
✓ Download Successful
✓ Delete Successful
✓ Cleanup Successful

------------------------------------------
ALL TESTS PASSED
Cloudflare R2 is ready.
------------------------------------------
```

---

## 5. Troubleshooting & Common Errors

### 5.1 Step 1 Failed: Environment Configuration Incomplete
*   **Cause:** One or more configuration keys (`R2_ACCOUNT_ID`, etc.) are missing from the `server/.env` file.
*   **Resolution:** Verify that `server/.env` contains all four variables. Double check that the file is named `.env` exactly, not `.env.txt`.

### 5.2 Step 3 Failed: Bucket Connection/Access Denied
*   **Cause:** Incorrect `R2_ACCOUNT_ID` or `R2_BUCKET_NAME`, or the Cloudflare API token lacks sufficient bucket access permissions.
*   **Resolution:**
    *   Verify the account ID and bucket name match your Cloudflare dashboard.
    *   Recreate the API Token in Cloudflare under R2 bucket settings. Ensure the token has **Object Read & Write** permissions for the specific bucket.

### 5.3 Step 4 Failed: File Upload to R2 Failed
*   **Cause:** The API token only has Read permissions, or there is a local firewall blocking requests to `*.r2.cloudflarestorage.com`.
*   **Resolution:** Confirm that the token has Write permission. Verify that your network is not blocking custom outbound ports/protocols.

### 5.4 Step 8 Failed: Cleanup Verification Failed
*   **Cause:** The DeleteObjectCommand reported success, but the object was not immediately deleted from R2 (eventual consistency delay) or deletion failed silently.
*   **Resolution:** Re-run the test script. If it persists, verify that the API token contains **Delete** permission.
