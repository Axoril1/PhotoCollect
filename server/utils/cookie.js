/**
 * Utility functions for parsing request cookies and setting secure HTTP-Only response cookies.
 */

/**
 * Manually parse the Cookie header of a request
 * @param {Object} req - Express Request
 * @returns {Object} Key-value pairs of parsed cookies
 */
export const parseCookies = (req) => {
  const list = {};
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return list;

  cookieHeader.split(";").forEach((cookie) => {
    const parts = cookie.split("=");
    if (parts.length < 1) return;
    const name = parts[0].trim();
    if (!name) return;
    const val = parts.slice(1).join("=").trim();
    list[name] = decodeURIComponent(val);
  });
  return list;
};

/**
 * Configure secure HttpOnly refresh token cookie
 * @param {Object} res - Express Response
 * @param {string} token - Raw refresh JWT
 */
export const setRefreshCookie = (res, token) => {
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days (matching JWT refresh token lifespan)
  const isProduction = process.env.NODE_ENV === "production";
  const cookieName = process.env.SESSION_COOKIE_NAME || "pc_sid";

  // Use SameSite=None and Secure in production to allow cross-origin cookie sharing
  const sameSite = isProduction ? "None" : "Lax";
  const secure = isProduction ? "; Secure" : "";

  res.setHeader("Set-Cookie", [
    `${cookieName}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge / 1000}; HttpOnly; SameSite=${sameSite}${secure}`
  ]);
};

/**
 * Clear the refresh token cookie
 * @param {Object} res - Express Response
 */
export const clearRefreshCookie = (res) => {
  const cookieName = process.env.SESSION_COOKIE_NAME || "pc_sid";
  const isProduction = process.env.NODE_ENV === "production";

  // Use SameSite=None and Secure in production to allow cross-origin cookie sharing
  const sameSite = isProduction ? "None" : "Lax";
  const secure = isProduction ? "; Secure" : "";

  res.setHeader("Set-Cookie", [
    `${cookieName}=; Path=/; Max-Age=0; HttpOnly; SameSite=${sameSite}${secure}`
  ]);
};
