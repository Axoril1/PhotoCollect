import { ResendProvider } from "./providers/ResendProvider.js";
import { SMTPProvider } from "./providers/SMTPProvider.js";
import { templateRenderer } from "./EmailTemplateRenderer.js";

class EmailService {
  constructor() {
    this.providerName = process.env.EMAIL_PROVIDER || "smtp";
    this.provider = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;

    try {
      if (this.providerName === "resend") {
        this.provider = new ResendProvider();
      } else if (this.providerName === "smtp") {
        this.provider = new SMTPProvider();
      } else {
        throw new Error(`Unsupported email provider: ${this.providerName}`);
      }
      this.initialized = true;
      console.log(`[EmailService] Initialized with provider: ${this.providerName}`);
    } catch (err) {
      console.error(`[EmailService] Failed to initialize provider ${this.providerName}:`, err.message);
      if (process.env.NODE_ENV === "production") {
        throw err;
      }
      // Fallback for local development/testing
      this.provider = new SMTPProvider();
      this.initialized = true;
      console.log(`[EmailService] Fallback to SMTP/mock provider for dev/testing`);
    }
  }

  getProvider() {
    if (!this.initialized) {
      this.init();
    }
    return this.provider;
  }

  /**
   * Send Welcome Email
   */
  async sendWelcomeEmail(user) {
    const appUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const rendered = templateRenderer.render("welcome", {
      name: user.name,
      appUrl,
    });

    return this._send({
      to: user.email,
      subject: "Welcome to PhotoCollect!",
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Send Email Verification Link
   */
  async sendVerificationEmail(user, token) {
    const appUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const verificationUrl = `${appUrl}/verify-email?token=${token}`;
    const rendered = templateRenderer.render("verify", {
      name: user.name,
      verificationUrl,
    });

    return this._send({
      to: user.email,
      subject: "Verify Your Email Address - PhotoCollect",
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Send Password Reset Link
   */
  async sendPasswordResetEmail(user, token) {
    const appUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;
    const rendered = templateRenderer.render("reset", {
      name: user.name,
      resetUrl,
    });

    return this._send({
      to: user.email,
      subject: "Reset Your Password - PhotoCollect",
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Send Password Change Confirmation
   */
  async sendPasswordChangedEmail(user) {
    const rendered = templateRenderer.render("changed", {
      name: user.name,
    });

    return this._send({
      to: user.email,
      subject: "Your Password Has Been Changed - PhotoCollect",
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Send Event Created Confirmation
   */
  async sendEventCreatedEmail(user, event) {
    const appUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const eventUrl = `${appUrl}/events/${event.slug}`;
    const rendered = templateRenderer.render("created", {
      name: user.name,
      eventName: event.name,
      eventUrl,
    });

    return this._send({
      to: user.email,
      subject: `Event Gallery Created: ${event.name} - PhotoCollect`,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Send Event Closed Confirmation
   */
  async sendEventClosedEmail(user, event) {
    const appUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const eventUrl = `${appUrl}/events/${event.slug}`;
    const rendered = templateRenderer.render("closed", {
      name: user.name,
      eventName: event.name,
      eventUrl,
    });

    return this._send({
      to: user.email,
      subject: `Event Gallery Closed: ${event.name} - PhotoCollect`,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Send Event Expiring Alert
   */
  async sendEventExpiringEmail(user, event) {
    const appUrl = process.env.CLIENT_URL || "http://localhost:5173";
    const eventUrl = `${appUrl}/events/${event.slug}`;
    const dateStr = event.expiresAt ? new Date(event.expiresAt).toLocaleDateString() : "";
    const rendered = templateRenderer.render("expiring", {
      name: user.name,
      eventName: event.name,
      expiresAt: dateStr,
      eventUrl,
    });

    return this._send({
      to: user.email,
      subject: `Event Gallery Expiring Soon: ${event.name} - PhotoCollect`,
      html: rendered.html,
      text: rendered.text,
    });
  }

  /**
   * Internal sender method wrapping providers with JSON structured logs
   */
  async _send(options) {
    const provider = this.getProvider();
    const startTime = Date.now();
    
    // Log Email Queued
    console.log(JSON.stringify({
      level: "info",
      message: "Email queued",
      provider: this.providerName,
      to: options.to,
      subject: options.subject,
      timestamp: new Date().toISOString(),
    }));

    try {
      const result = await provider.send(options);
      const duration = Date.now() - startTime;
      
      // Log Email Sent Success
      console.log(JSON.stringify({
        level: "info",
        message: "Email sent",
        provider: this.providerName,
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      }));

      return result;
    } catch (err) {
      const duration = Date.now() - startTime;
      
      // Log Email Sent Failure
      console.error(JSON.stringify({
        level: "error",
        message: "Email failed",
        provider: this.providerName,
        to: options.to,
        subject: options.subject,
        error: err.message,
        durationMs: duration,
        timestamp: new Date().toISOString(),
      }));

      throw err;
    }
  }

  /**
   * Check connection/credentials status
   */
  async healthCheck() {
    const provider = this.getProvider();
    return await provider.healthCheck();
  }
}

export const emailService = new EmailService();
export default emailService;
