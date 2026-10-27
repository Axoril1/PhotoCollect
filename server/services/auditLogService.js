import AuditLog from "../models/AuditLog.js";

/**
 * Log a security or authentication-related event to the database.
 * Redacts sensitive credentials from the log metadata.
 */
export const logSecurityEvent = async ({ userId, event, status, req, details }) => {
  try {
    const ip = req ? (req.headers?.["x-forwarded-for"] || (req.socket ? req.socket.remoteAddress : null)) : null;
    const userAgent = req ? req.headers?.["user-agent"] : null;

    // Deep copy and redact sensitive fields from metadata
    let cleanDetails = null;
    if (details) {
      cleanDetails = JSON.parse(JSON.stringify(details));
      const redactKeys = ["password", "token", "refreshToken", "accessToken", "eventPassword", "authorization"];
      
      const recursiveRedact = (obj) => {
        if (!obj || typeof obj !== "object") return;
        for (const key of Object.keys(obj)) {
          if (redactKeys.some(rk => key.toLowerCase().includes(rk))) {
            obj[key] = "[REDACTED]";
          } else if (typeof obj[key] === "object") {
            recursiveRedact(obj[key]);
          }
        }
      };
      recursiveRedact(cleanDetails);
    }

    await AuditLog.create({
      userId,
      event,
      status,
      ip,
      userAgent,
      details: cleanDetails,
    });
  } catch (err) {
    console.error(`[AuditLogService] Failed to record security event "${event}":`, err.message);
  }
};

export default logSecurityEvent;
