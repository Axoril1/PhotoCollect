/**
 * Base Email Provider Interface
 * All concrete email sending adapters must extend this class and implement its methods.
 */
export class EmailProvider {
  /**
   * Send a transactional email
   * @param {Object} options - Sending options
   * @param {string} options.to - Recipient email address
   * @param {string} options.subject - Email subject
   * @param {string} options.html - HTML body
   * @param {string} options.text - Plain text body
   * @returns {Promise<{ messageId: string, provider: string }>}
   */
  async send(options) {
    throw new Error("Method 'send' must be implemented");
  }

  /**
   * Check connection/API validity of the provider
   * @returns {Promise<{ status: string, diagnostics?: any }>}
   */
  async healthCheck() {
    throw new Error("Method 'healthCheck' must be implemented");
  }
}
