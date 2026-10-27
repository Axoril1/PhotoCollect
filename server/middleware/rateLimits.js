import rateLimit from "express-rate-limit";

// Helper to parse numeric env values with defaults
const getEnvInt = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

// 1. Login Limiter (Configurable)
export const loginLimiter = rateLimit({
  windowMs: getEnvInt("LIMIT_LOGIN_WINDOW_MS", 15 * 60 * 1000), // Default: 15 mins
  limit: getEnvInt("LIMIT_LOGIN_MAX", 5), // Max 5 login attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
});

// 2. Register Limiter (Configurable)
export const registerLimiter = rateLimit({
  windowMs: getEnvInt("LIMIT_REGISTER_WINDOW_MS", 15 * 60 * 1000), // Default: 15 mins
  limit: getEnvInt("LIMIT_REGISTER_MAX", 5), // Max 5 registration requests
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Please try again in 15 minutes." },
});

// 3. Email/Verification operations limiter (Configurable)
export const emailLimiter = rateLimit({
  windowMs: getEnvInt("LIMIT_EMAIL_WINDOW_MS", 15 * 60 * 1000), // Default: 15 mins
  limit: getEnvInt("LIMIT_EMAIL_MAX", 5), // Max 5 requests
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many email requests. Please try again later." },
});

// 4. Photo upload limiter (Configurable)
export const uploadLimiter = rateLimit({
  windowMs: getEnvInt("LIMIT_UPLOAD_WINDOW_MS", 60 * 1000), // Default: 1 min
  limit: getEnvInt("LIMIT_UPLOAD_MAX", 10), // Max 10 upload requests per min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many photo upload attempts. Please try again in a minute." },
});

// 5. Download limiter (Configurable)
export const downloadLimiter = rateLimit({
  windowMs: getEnvInt("LIMIT_DOWNLOAD_WINDOW_MS", 60 * 1000), // Default: 1 min
  limit: getEnvInt("LIMIT_DOWNLOAD_MAX", 10), // Max 10 download requests per min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many download attempts. Please try again in a minute." },
});

// 6. Generic API Write limiter (Configurable)
export const apiWriteLimiter = rateLimit({
  windowMs: getEnvInt("LIMIT_API_WRITE_WINDOW_MS", 60 * 1000), // Default: 1 min
  limit: getEnvInt("LIMIT_API_WRITE_MAX", 60), // Max 60 write operations per min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many write requests. Please slow down." },
});

// 7. General API Abuse limiter (Configurable)
export const apiLimiter = rateLimit({
  windowMs: getEnvInt("LIMIT_API_WINDOW_MS", 60 * 1000), // Default: 1 min
  limit: getEnvInt("LIMIT_API_MAX", 120), // Max 120 general api requests per min
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
});
