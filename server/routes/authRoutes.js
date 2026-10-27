import express from "express";
import {
  getMe,
  login,
  register,
  verifyEmail,
  resendVerificationEmail,
  forgotPassword,
  resetPassword,
  refresh,
  logout,
  getActiveSessions,
  terminateSession,
  terminateAllOtherSessions,
  googleAuth
} from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { loginLimiter, registerLimiter, emailLimiter, apiWriteLimiter } from "../middleware/rateLimits.js";

const router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/google", loginLimiter, googleAuth);
router.post("/logout", logout);
router.post("/refresh", refresh);
router.get("/me", requireAuth, getMe);

// Session Management
router.get("/sessions", requireAuth, getActiveSessions);
router.delete("/sessions/:id", requireAuth, apiWriteLimiter, terminateSession);
router.delete("/sessions", requireAuth, apiWriteLimiter, terminateAllOtherSessions);

// Transactional Email / Verification Flows
router.get("/verify-email/:token", emailLimiter, verifyEmail);
router.post("/verify-email/resend", emailLimiter, resendVerificationEmail);
router.post("/forgot-password", emailLimiter, forgotPassword);
router.post("/reset-password/:token", emailLimiter, resetPassword);

export default router;
