import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { normalizeRole } from "../src/auth/roles.js";

/**
 * Sign a short-lived access JWT (default: 15 minutes)
 * Includes: userId (sub/userId), role, permissionsVersion
 * Note: Permissions are NOT stored in the JWT payload; they are resolved server-side.
 */
export const signAccessToken = (user) => {
  const secret = process.env.JWT_ACCESS_SECRET;
  const expiry = process.env.ACCESS_TOKEN_EXPIRY || "15m";
  const userIdStr = (user._id || user.id).toString();
  const normalizedRole = normalizeRole(user.role);

  return jwt.sign(
    {
      sub: userIdStr,
      userId: userIdStr,
      email: user.email,
      role: normalizedRole,
      permissionsVersion: user.permissionsVersion || 1,
    },
    secret,
    { expiresIn: expiry }
  );
};

/**
 * Sign a long-lived refresh JWT containing Session ID and token hash (default: 7 days)
 */
export const signRefreshToken = (user, sessionId, tokenHash) => {
  const secret = process.env.JWT_REFRESH_SECRET;
  const expiry = process.env.REFRESH_TOKEN_EXPIRY || "7d";
  return jwt.sign(
    {
      sub: (user._id || user.id).toString(),
      sid: sessionId.toString(),
      hash: tokenHash,
    },
    secret,
    { expiresIn: expiry }
  );
};

/**
 * Extract token from Authorization Bearer header
 */
const readBearerToken = (req) => {
  const header = req.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  return header.slice(7).trim();
};

/**
 * Enforce authentication using the access token and validate user status/permissions version
 */
export const requireAuth = async (req, res, next) => {
  try {
    const token = readBearerToken(req);
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub || payload.userId).select("-passwordHash");

    if (!user) {
      return res.status(401).json({ error: "Invalid session" });
    }

    if (user.isSuspended) {
      return res.status(403).json({ error: "Forbidden: Account is suspended" });
    }

    // Verify permissions version freshness
    if (user.permissionsVersion && payload.permissionsVersion && user.permissionsVersion > payload.permissionsVersion) {
      return res.status(401).json({
        error: "Permissions have been updated. Please re-authenticate.",
        code: "PERMISSIONS_REVOKED",
      });
    }

    user.role = normalizeRole(user.role);
    req.user = user;
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Access token expired", code: "ACCESS_TOKEN_EXPIRED" });
    }
    return res.status(401).json({ error: "Invalid or expired session" });
  }
};

/**
 * Optionally populate authentication details if present
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const token = readBearerToken(req);
    if (!token) return next();

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.sub || payload.userId).select("-passwordHash");
    if (user && !user.isSuspended) {
      user.role = normalizeRole(user.role);
      req.user = user;
    }
    next();
  } catch (err) {
    next(); // Silently continue for optional auth
  }
};
