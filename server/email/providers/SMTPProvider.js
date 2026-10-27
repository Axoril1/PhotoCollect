import { EmailProvider } from "../EmailProvider.js";
import fs from "fs";
import path from "path";

export class SMTPProvider extends EmailProvider {
  constructor() {
    super();
    this.host = process.env.SMTP_HOST || "localhost";
    this.port = process.env.SMTP_PORT || 25;
    this.from = process.env.EMAIL_FROM || "PhotoCollect <noreply@photocollect.net>";
  }

  /**
   * Log email to console and local file for development/testing
   */
  async send(options) {
    const { to, subject, html, text } = options;
    
    const emailLog = {
      timestamp: new Date().toISOString(),
      from: this.from,
      to,
      subject,
      text,
      html,
    };

    console.log(`[SMTPProvider Mock] Sending email to ${to} | Subject: "${subject}"`);

    try {
      const logDir = path.join(process.cwd(), "uploads", "email_logs");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logFile = path.join(logDir, `email_${Date.now()}_${Math.floor(Math.random() * 1000)}.json`);
      fs.writeFileSync(logFile, JSON.stringify(emailLog, null, 2));
    } catch (err) {
      console.warn("[SMTPProvider Mock] Failed to write mock email log to disk:", err.message);
    }

    return {
      messageId: `mock-smtp-id-${Date.now()}`,
      provider: "smtp",
    };
  }

  /**
   * SMTP health check
   */
  async healthCheck() {
    return { status: "healthy", provider: "smtp", host: this.host, port: this.port };
  }
}

export default SMTPProvider;
