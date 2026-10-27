/**
 * Base Storage Provider Interface
 * Defines a generic storage interface independent of the underlying storage engine.
 */
export class StorageProvider {
  /**
   * Upload a file to storage
   * @param {string} localPath - Path to the local file to upload
   * @param {string} key - Unique object key/path in storage
   * @param {string} mimeType - The MIME type of the file
   * @returns {Promise<string>} The public URL of the uploaded object
   */
  async upload(localPath, key, mimeType) {
    throw new Error("Method 'upload' must be implemented");
  }

  /**
   * Delete an object from storage
   * @param {string} key - Unique object key/path in storage
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error("Method 'delete' must be implemented");
  }

  /**
   * Check if an object exists in storage
   * @param {string} key - Unique object key/path in storage
   * @returns {Promise<boolean>}
   */
  async exists(key) {
    throw new Error("Method 'exists' must be implemented");
  }

  /**
   * Get the public URL for an object key
   * @param {string} key - Unique object key/path in storage
   * @param {Object} [req] - Express request object for relative URLs (local provider)
   * @returns {string}
   */
  async getPublicUrl(key, req) {
    throw new Error("Method 'getPublicUrl' must be implemented");
  }

  /**
   * Get a readable stream for the object
   * @param {string} key - Unique object key/path in storage
   * @returns {Promise<ReadableStream|fs.ReadStream>}
   */
  async getReadStream(key) {
    throw new Error("Method 'getReadStream' must be implemented");
  }

  /**
   * Check the connection health of the provider
   * @returns {Promise<{ status: string, diagnostics?: any }>}
   */
  async healthCheck() {
    throw new Error("Method 'healthCheck' must be implemented");
  }
}
