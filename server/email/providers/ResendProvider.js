import { EmailProvider } from "../EmailProvider.js";

export class ResendProvider extends EmailProvider {
  constructor() {
    super();
    this.apiKey = process.env.RESEND_API_KEY;
    this.from = process.env.EMAIL_FROM || "PhotoCollect <noreply@photocollect.net>";
    this.replyTo = process.env.EMAIL_REPLY_TO;

    if (!this.apiKey) {
      throw new Error("RESEND_API_KEY is not set in environment variables");
    }
  }

  /**
   * Send a transactional email using Resend HTTP API
   */
  async send(options) {
    const { to, subject, html, text } = options;

    const body = {
      from: this.from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    };

    if (this.replyTo) {
      body.reply_to = this.replyTo;
    }

    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Resend API returned status code ${response.status}`);
      }

      return {
        messageId: data.id,
        provider: "resend",
      };
    } catch (err) {
      console.error("Resend API send failed:", err.message);
      throw new Error(`Email failed to send via Resend: ${err.message}`);
    }
  }

  /**
   * Simple API credentials verification
   */
  async healthCheck() {
    try {
      if (!this.apiKey) {
        return { status: "unhealthy", error: "RESEND_API_KEY is missing" };
      }
      return { status: "healthy", provider: "resend" };
    } catch (err) {
      return { status: "unhealthy", error: err.message };
    }
  }
}

export default ResendProvider;
