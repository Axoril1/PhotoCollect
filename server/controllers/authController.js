import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import parseUserAgent from "../utils/userAgent.js";
import logSecurityEvent from "../services/auditLogService.js";
import { parseCookies, setRefreshCookie, clearRefreshCookie } from "../utils/cookie.js";
import { signAccessToken, signRefreshToken } from "../middleware/auth.js";
import { emailService } from "../email/EmailService.js";
import { verifyIdToken } from "../config/firebase.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Complex password requirements: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character
const COMPLEXITY_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  plan: user.plan,
  role: user.role,
  isVerified: user.isVerified || false,
  provider: user.provider || "email",
  avatar: user.avatar || "",
});

// Generate cryptographically secure random token in hex format
const generateToken = () => crypto.randomBytes(32).toString("hex");

// Hash token before storing using SHA-256
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const register = async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || name.length < 2) {
      return res.status(400).json({ error: "Your name is required" });
    }
    if (!EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: "A valid email is required" });
    }
    if (!COMPLEXITY_PATTERN.test(password)) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const verificationToken = generateToken();
    const hashedToken = hashToken(verificationToken);
    const tokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      name,
      email,
      passwordHash,
      verificationToken: hashedToken,
      verificationTokenExpires: tokenExpires,
      isVerified: false,
    });

    // Create a new session on registration
    const userAgent = req.headers["user-agent"] || "";
    const { browser, device } = parseUserAgent(userAgent);
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const rawSessionToken = crypto.randomBytes(40).toString("hex");
    const hashedSessionToken = hashToken(rawSessionToken);
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await Session.create({
      userId: user._id,
      refreshTokenHash: hashedSessionToken,
      browser,
      device,
      ip,
      expiresAt: sessionExpiresAt,
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, session._id, hashedSessionToken);

    setRefreshCookie(res, refreshToken);

    await logSecurityEvent({
      userId: user._id,
      event: "user_registered",
      status: "success",
      req,
      details: { email: user.email },
    });

    // Send emails asynchronously
    emailService.sendWelcomeEmail(user).catch((err) =>
      console.error("[EmailService] Failed to send welcome email:", err.message)
    );
    emailService.sendVerificationEmail(user, verificationToken).catch((err) =>
      console.error("[EmailService] Failed to send verification email:", err.message)
    );

    res.status(201).json({ accessToken, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

export const login = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    const user = await User.findOne({ email });

    // Prevent user enumeration: use generic checks and delays
    if (!user) {
      await new Promise((r) => setTimeout(r, 200)); // Constant fake comparison delay
      await logSecurityEvent({
        event: "failed_login",
        status: "failure",
        req,
        details: { email, reason: "User not found" },
      });
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Check account lockout
    if (user.lockoutUntil && user.lockoutUntil > new Date()) {
      const waitMin = Math.ceil((user.lockoutUntil.getTime() - Date.now()) / 60000);
      await logSecurityEvent({
        userId: user._id,
        event: "failed_login",
        status: "failure",
        req,
        details: { email, reason: "Account locked" },
      });
      return res.status(423).json({
        error: `Account is temporarily locked due to too many failed attempts. Try again in ${waitMin} minute(s).`,
      });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      // Brute-force counter and lockout mapping
      user.failedLoginAttempts += 1;
      let lockoutMessage = "";
      if (user.failedLoginAttempts >= 5) {
        user.lockoutUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes lockout
        user.failedLoginAttempts = 0; // reset counter after locking
        lockoutMessage = " Account locked.";
      }
      await user.save();

      // Progressive delay (100ms * 2^failedLoginAttempts) up to 2.5s
      const delay = Math.min(100 * Math.pow(2, user.failedLoginAttempts), 2500);
      await new Promise((r) => setTimeout(r, delay));

      await logSecurityEvent({
        userId: user._id,
        event: "failed_login",
        status: "failure",
        req,
        details: { email, reason: "Incorrect password", attempts: user.failedLoginAttempts },
      });

      return res.status(401).json({ error: `Invalid email or password.${lockoutMessage}` });
    }

    // Success: Reset brute-force stats
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    await user.save();

    // Create session details
    const userAgent = req.headers["user-agent"] || "";
    const { browser, device } = parseUserAgent(userAgent);
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const rawSessionToken = crypto.randomBytes(40).toString("hex");
    const hashedSessionToken = hashToken(rawSessionToken);
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await Session.create({
      userId: user._id,
      refreshTokenHash: hashedSessionToken,
      browser,
      device,
      ip,
      expiresAt: sessionExpiresAt,
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, session._id, hashedSessionToken);

    setRefreshCookie(res, refreshToken);

    await logSecurityEvent({
      userId: user._id,
      event: "successful_login",
      status: "success",
      req,
      details: { sessionId: session._id },
    });

    res.json({ accessToken, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

export const getMe = async (req, res) => {
  res.json({ user: publicUser(req.user) });
};

/**
 * Log out of current device / invalidate session
 */
export const logout = async (req, res, next) => {
  try {
    const cookies = parseCookies(req);
    const refreshToken = cookies[process.env.SESSION_COOKIE_NAME || "pc_sid"];

    if (refreshToken) {
      try {
        const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        await Session.findByIdAndDelete(payload.sid);
        
        await logSecurityEvent({
          userId: payload.sub,
          event: "logout",
          status: "success",
          req,
          details: { sessionId: payload.sid },
        });
      } catch (_) {
        // Suppress verify errors during logout
      }
    }

    clearRefreshCookie(res);
    res.json({ message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Refresh Access Token using Refresh Token Cookie
 */
export const refresh = async (req, res, next) => {
  try {
    const cookies = parseCookies(req);
    const token = cookies[process.env.SESSION_COOKIE_NAME || "pc_sid"];

    if (!token) {
      return res.status(401).json({ error: "Refresh token required" });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      clearRefreshCookie(res);
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const session = await Session.findById(payload.sid);
    
    // Automatic Reuse Detection: if session does not exist or token hash doesn't match, revoke everything
    if (!session || session.refreshTokenHash !== payload.hash) {
      if (session) {
        await Session.deleteMany({ userId: payload.sub });
      }
      clearRefreshCookie(res);
      
      await logSecurityEvent({
        userId: payload.sub,
        event: "refresh_token_reuse_detected",
        status: "failure",
        req,
        details: { attemptedSessionId: payload.sid },
      });
      return res.status(401).json({ error: "Session revoked due to token reuse detection." });
    }

    if (session.expiresAt < new Date()) {
      await session.deleteOne();
      clearRefreshCookie(res);
      return res.status(401).json({ error: "Session has expired" });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      await session.deleteOne();
      clearRefreshCookie(res);
      return res.status(401).json({ error: "User no longer exists" });
    }

    // Refresh Token Rotation (RTR): rotate session token on access
    const newRawSessionToken = crypto.randomBytes(40).toString("hex");
    const newHashedSessionToken = hashToken(newRawSessionToken);
    
    session.refreshTokenHash = newHashedSessionToken;
    session.lastActivity = new Date();
    session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Reset sliding window expiration
    await session.save();

    const newAccessToken = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user, session._id, newHashedSessionToken);

    setRefreshCookie(res, newRefreshToken);

    res.json({ accessToken: newAccessToken });
  } catch (err) {
    next(err);
  }
};

/**
 * Fetch list of active sessions for current user
 */
export const getActiveSessions = async (req, res, next) => {
  try {
    const sessions = await Session.find({ userId: req.user._id }).sort({ lastActivity: -1 });

    const cookies = parseCookies(req);
    const token = cookies[process.env.SESSION_COOKIE_NAME || "pc_sid"];
    
    let currentSessionId = null;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        currentSessionId = payload.sid;
      } catch (_) {}
    }

    const mapped = sessions.map(s => ({
      id: s._id,
      device: s.device,
      browser: s.browser,
      ip: s.ip,
      lastActivity: s.lastActivity,
      isCurrent: currentSessionId && currentSessionId.toString() === s._id.toString(),
    }));

    res.json({ sessions: mapped });
  } catch (err) {
    next(err);
  }
};

/**
 * Terminate a single session
 */
export const terminateSession = async (req, res, next) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, userId: req.user._id });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    await session.deleteOne();

    await logSecurityEvent({
      userId: req.user._id,
      event: "session_revoked",
      status: "success",
      req,
      details: { sessionId: req.params.id },
    });

    res.json({ message: "Session terminated successfully" });
  } catch (err) {
    next(err);
  }
};

/**
 * Terminate all other sessions except the current active session
 */
export const terminateAllOtherSessions = async (req, res, next) => {
  try {
    const cookies = parseCookies(req);
    const token = cookies[process.env.SESSION_COOKIE_NAME || "pc_sid"];

    let currentSessionId = null;
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        currentSessionId = payload.sid;
      } catch (_) {}
    }

    const query = { userId: req.user._id };
    if (currentSessionId) {
      query._id = { $ne: currentSessionId };
    }

    const deleteResult = await Session.deleteMany(query);

    await logSecurityEvent({
      userId: req.user._id,
      event: "all_other_sessions_revoked",
      status: "success",
      req,
      details: { terminatedCount: deleteResult.deletedCount },
    });

    res.json({ message: `Terminated ${deleteResult.deletedCount} active session(s)` });
  } catch (err) {
    next(err);
  }
};

/**
 * Verify Email Address using verification token
 */
export const verifyEmail = async (req, res, next) => {
  try {
    const token = req.params.token;
    const hashed = hashToken(token);

    const user = await User.findOne({
      verificationToken: hashed,
      verificationTokenExpires: { $gt: new Date() },
    }).select("+verificationToken +verificationTokenExpires");

    if (!user) {
      return res.status(400).json({ error: "Verification token is invalid or has expired" });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    await logSecurityEvent({
      userId: user._id,
      event: "email_verified",
      status: "success",
      req,
    });

    res.json({ message: "Email address verified successfully!" });
  } catch (err) {
    next(err);
  }
};

/**
 * Resend Email Verification Link
 */
export const resendVerificationEmail = async (req, res, next) => {
  try {
    let email = "";
    if (req.user) {
      email = req.user.email;
    } else {
      email = String(req.body.email || "").trim().toLowerCase();
    }

    if (!email || !EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: "A valid email address is required" });
    }

    const user = await User.findOne({ email }).select("+verificationToken +verificationTokenExpires");
    
    // Prevent email enumeration: return success even if user not found
    if (!user) {
      return res.json({ message: "If your account is not verified, a new verification link has been sent." });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "This email address is already verified." });
    }

    const verificationToken = generateToken();
    user.verificationToken = hashToken(verificationToken);
    user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    await user.save();

    emailService.sendVerificationEmail(user, verificationToken).catch((err) =>
      console.error("[EmailService] Failed to resend verification email:", err.message)
    );

    res.json({ message: "If your account is not verified, a new verification link has been sent." });
  } catch (err) {
    next(err);
  }
};

/**
 * Request Password Reset (Forgot Password)
 */
export const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    if (!email || !EMAIL_PATTERN.test(email)) {
      return res.status(400).json({ error: "A valid email address is required" });
    }

    const user = await User.findOne({ email });
    
    // Prevent email enumeration: return success even if user not found
    if (!user) {
      return res.json({ message: "If an account exists with this email, we have sent password reset instructions." });
    }

    const resetToken = generateToken();
    user.resetPasswordToken = hashToken(resetToken);
    user.resetPasswordExpires = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    await user.save();

    emailService.sendPasswordResetEmail(user, resetToken).catch((err) =>
      console.error("[EmailService] Failed to send password reset email:", err.message)
    );

    await logSecurityEvent({
      userId: user._id,
      event: "password_reset_requested",
      status: "success",
      req,
    });

    res.json({ message: "If an account exists with this email, we have sent password reset instructions." });
  } catch (err) {
    next(err);
  }
};

/**
 * Reset Password using token
 */
export const resetPassword = async (req, res, next) => {
  try {
    const token = req.params.token;
    const password = String(req.body.password || "");

    if (!COMPLEXITY_PATTERN.test(password)) {
      return res.status(400).json({
        error: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
      });
    }

    const hashed = hashToken(token);
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    }).select("+resetPasswordToken +resetPasswordExpires");

    if (!user) {
      return res.status(400).json({ error: "Password reset link is invalid or has expired" });
    }

    user.passwordHash = await bcrypt.hash(password, 12);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    // Reset failed login stats in case account was locked
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    await user.save();

    emailService.sendPasswordChangedEmail(user).catch((err) =>
      console.error("[EmailService] Failed to send password change confirmation:", err.message)
    );

    await logSecurityEvent({
      userId: user._id,
      event: "password_changed",
      status: "success",
      req,
    });

    res.json({ message: "Password has been reset successfully!" });
  } catch (err) {
    next(err);
  }
};

export const googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: "Firebase ID token is required" });
    }

    let decodedToken;
    try {
      decodedToken = await verifyIdToken(idToken);
    } catch (err) {
      console.error("[FirebaseAuth] Token verification failed:", err.message);
      return res.status(401).json({ 
        error: "Invalid or expired Google credential",
        details: err.message 
      });
    }

    const { uid, email, name, picture, email_verified } = decodedToken;

    if (!email) {
      return res.status(400).json({ error: "Email is not associated with this Google account" });
    }

    // Find user by providerId (Google account already linked/registered)
    let user = await User.findOne({ provider: "google", providerId: uid });

    if (!user) {
      // Check if there's an existing user with the same email
      user = await User.findOne({ email });

      if (user) {
        // Link existing email user to Google provider
        user.provider = "google";
        user.providerId = uid;
        if (picture) user.avatar = picture;
        user.emailVerified = email_verified || user.emailVerified;
        if (email_verified) user.isVerified = true;
        await user.save();

        await logSecurityEvent({
          userId: user._id,
          event: "account_linked_to_google",
          status: "success",
          req,
          details: { email },
        });
      } else {
        // Create a new user for Google Sign-in
        user = await User.create({
          name: name || email.split("@")[0],
          email,
          provider: "google",
          providerId: uid,
          avatar: picture,
          emailVerified: email_verified,
          isVerified: email_verified || false,
        });

        await logSecurityEvent({
          userId: user._id,
          event: "user_registered_via_google",
          status: "success",
          req,
          details: { email },
        });

        // Send welcome email
        emailService.sendWelcomeEmail(user).catch((err) =>
          console.error("[EmailService] Failed to send welcome email for Google user:", err.message)
        );
      }
    } else {
      // Refresh profile data if it changed
      let hasUpdates = false;
      if (picture && user.avatar !== picture) {
        user.avatar = picture;
        hasUpdates = true;
      }
      if (user.emailVerified !== email_verified) {
        user.emailVerified = email_verified;
        if (email_verified) user.isVerified = true;
        hasUpdates = true;
      }
      if (hasUpdates) {
        await user.save();
      }

      await logSecurityEvent({
        userId: user._id,
        event: "successful_login_via_google",
        status: "success",
        req,
      });
    }

    // Reset brute force login stats in case account was previously locked via email flow
    user.failedLoginAttempts = 0;
    user.lockoutUntil = undefined;
    await user.save();

    // Create session details
    const userAgent = req.headers["user-agent"] || "";
    const { browser, device } = parseUserAgent(userAgent);
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const rawSessionToken = crypto.randomBytes(40).toString("hex");
    const hashedSessionToken = hashToken(rawSessionToken);
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const session = await Session.create({
      userId: user._id,
      refreshTokenHash: hashedSessionToken,
      browser,
      device,
      ip,
      expiresAt: sessionExpiresAt,
    });

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user, session._id, hashedSessionToken);

    setRefreshCookie(res, refreshToken);

    res.json({ accessToken, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
};
