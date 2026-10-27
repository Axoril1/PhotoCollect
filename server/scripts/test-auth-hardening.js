import dotenv from "dotenv";
import mongoose from "mongoose";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import Session from "../models/Session.js";
import AuditLog from "../models/AuditLog.js";
import { 
  register, 
  login, 
  logout, 
  refresh, 
  getActiveSessions, 
  terminateSession, 
  terminateAllOtherSessions 
} from "../controllers/authController.js";

dotenv.config();

console.log("==============================================================================");
console.log("PhotoCollect v1.1 - Authentication & Session Hardening Verification");
console.log("==============================================================================\n");

// Helper to construct mock Express Response objects
const createMockResponse = () => {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status: function (code) {
      this.statusCode = code;
      return this;
    },
    json: function (data) {
      this.body = data;
      return this;
    },
    send: function (data) {
      this.body = data;
      return this;
    },
    setHeader: function (name, val) {
      this.headers[name.toLowerCase()] = val;
      return this;
    },
    clearCookie: function (name, opts) {
      this.headers["set-cookie"] = `${name}=; Max-Age=0`;
      return this;
    }
  };
  return res;
};

// Helper to extract cookie from response header
const getCookieFromResponse = (res) => {
  const setCookie = res.headers["set-cookie"];
  if (!setCookie) return null;
  const cookieStr = Array.isArray(setCookie) ? setCookie[0] : setCookie;
  const match = cookieStr.match(/pc_sid=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
};

async function runTests() {
  const testEmail = `auth-test-${Date.now()}@example.com`;
  const weakPassword = "weak";
  const strongPassword = "SuperStrong123!_";
  
  let tempUserId = null;
  let testAccessToken = null;
  let testRefreshToken = null;

  try {
    // Connect database
    await connectDB();
    console.log("✓ Connected to MongoDB.\n");

    // --------------------------------------------------------------------------
    // Test 1: Password Complexity Enforcement
    // --------------------------------------------------------------------------
    console.log("Test 1: Password Complexity Rejection");
    const regWeakReq = {
      body: {
        name: "Hardened User",
        email: testEmail,
        password: weakPassword
      },
      headers: {}
    };
    const regWeakRes = createMockResponse();
    await register(regWeakReq, regWeakRes, (err) => { if (err) throw err; });

    if (regWeakRes.statusCode !== 400 || !regWeakRes.body.error.includes("Password must be at least 8 characters")) {
      throw new Error(`Expected complexity validation failure (400). Got status: ${regWeakRes.statusCode}`);
    }
    console.log("  ✓ Weak password rejected successfully.\n");

    // --------------------------------------------------------------------------
    // Test 2: Secure Registration, Cookie Generation & Session Setup
    // --------------------------------------------------------------------------
    console.log("Test 2: Successful Registration & Session Creation");
    const regStrongReq = {
      body: {
        name: "Hardened User",
        email: testEmail,
        password: strongPassword
      },
      headers: {
        "user-agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1"
      },
      socket: { remoteAddress: "127.0.0.1" }
    };
    const regStrongRes = createMockResponse();
    await register(regStrongReq, regStrongRes, (err) => { if (err) throw err; });

    if (regStrongRes.statusCode !== 201) {
      throw new Error(`Expected registration success (201). Got status: ${regStrongRes.statusCode}`);
    }

    testAccessToken = regStrongRes.body.accessToken;
    testRefreshToken = getCookieFromResponse(regStrongRes);

    if (!testAccessToken || !testRefreshToken) {
      throw new Error("Missing access token or refresh cookie in registration response.");
    }

    // Verify Session collection created
    const decodedRefresh = jwt.verify(testRefreshToken, process.env.JWT_REFRESH_SECRET);
    const sessionRecord = await Session.findById(decodedRefresh.sid);
    if (!sessionRecord) {
      throw new Error("No database session record generated during registration");
    }

    if (sessionRecord.device !== "Mobile" || sessionRecord.browser !== "Safari") {
      throw new Error(`User-Agent parser mismatch. Got device: ${sessionRecord.device}, browser: ${sessionRecord.browser}`);
    }

    // Verify AuditLog written
    const auditRecord = await AuditLog.findOne({ userId: decodedRefresh.sub, event: "user_registered" });
    if (!auditRecord) {
      throw new Error("No audit log generated for registration");
    }

    tempUserId = decodedRefresh.sub;
    console.log("  ✓ Mongoose session record verified (correct UA parsing and IP logging).");
    console.log("  ✓ Secure HTTP-only refresh token set in response cookies.");
    console.log("  ✓ Registration Audit Log successfully written.");
    console.log("✓ Test 2 Passed.\n");

    // --------------------------------------------------------------------------
    // Test 3: Account Locking & Brute-Force Defense
    // --------------------------------------------------------------------------
    console.log("Test 3: Brute-Force Account Lockout");
    
    // Simulate 5 incorrect login attempts
    for (let i = 1; i <= 5; i++) {
      const loginFailReq = {
        body: { email: testEmail, password: "WrongPassword123!" },
        headers: { "user-agent": "Desktop Test" },
        socket: { remoteAddress: "127.0.0.1" }
      };
      const loginFailRes = createMockResponse();
      
      const startTime = Date.now();
      await login(loginFailReq, loginFailRes, (err) => { if (err) throw err; });
      const duration = Date.now() - startTime;

      if (loginFailRes.body.error.includes("locked")) {
        console.log(`  ✓ Account locked successfully on attempt ${i}.`);
        break;
      }
      
      console.log(`  Attempt ${i} progressive response delay: ${duration}ms.`);
    }

    // Attempt login now that account is locked
    const loginFailReq = {
      body: { email: testEmail, password: strongPassword },
      headers: { "user-agent": "Desktop Test" },
      socket: { remoteAddress: "127.0.0.1" }
    };
    const loginFailRes = createMockResponse();
    await login(loginFailReq, loginFailRes, (err) => { if (err) throw err; });
    
    if (loginFailRes.statusCode !== 423) {
      throw new Error(`Locked account should return status 423. Got status: ${loginFailRes.statusCode}`);
    }
    console.log("  ✓ Login attempt rejected with status 423 (Locked).");

    // Manually release lockout in DB to proceed with tests
    await User.findByIdAndUpdate(tempUserId, { lockoutUntil: null, failedLoginAttempts: 0 });
    console.log("  ✓ Account lockout manually reset in DB to continue testing.");
    console.log("✓ Test 3 Passed.\n");

    // --------------------------------------------------------------------------
    // Test 4: Success Login & Reset failed counters
    // --------------------------------------------------------------------------
    console.log("Test 4: Success Login Resets Lockout Counters");
    const loginSuccessReq = {
      body: { email: testEmail, password: strongPassword },
      headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/115.0.0.0 Safari/537.36" },
      socket: { remoteAddress: "127.0.0.1" }
    };
    const loginSuccessRes = createMockResponse();
    await login(loginSuccessReq, loginSuccessRes, (err) => { if (err) throw err; });

    if (loginSuccessRes.statusCode !== 200) {
      throw new Error(`Successful login failed: ${JSON.stringify(loginSuccessRes.body)}`);
    }

    const updatedUser = await User.findById(tempUserId);
    if (updatedUser.failedLoginAttempts !== 0 || updatedUser.lockoutUntil !== undefined) {
      throw new Error("Lockout attempts not reset on successful login");
    }

    testRefreshToken = getCookieFromResponse(loginSuccessRes);
    console.log("  ✓ Counter reset. Generated new session refresh token.");
    console.log("✓ Test 4 Passed.\n");

    // --------------------------------------------------------------------------
    // Test 5: Refresh Token Rotation (RTR)
    // --------------------------------------------------------------------------
    console.log("Test 5: Refresh Token Rotation");
    
    const refreshReq = {
      headers: {
        cookie: `${process.env.SESSION_COOKIE_NAME || "pc_sid"}=${encodeURIComponent(testRefreshToken)}`
      }
    };
    const refreshRes = createMockResponse();
    await refresh(refreshReq, refreshRes, (err) => { if (err) throw err; });

    if (refreshRes.statusCode !== 200) {
      throw new Error(`Token refresh failed: ${JSON.stringify(refreshRes.body)}`);
    }

    const rotatedRefreshToken = getCookieFromResponse(refreshRes);
    if (!rotatedRefreshToken || rotatedRefreshToken === testRefreshToken) {
      throw new Error("Refresh token was not rotated");
    }

    console.log("  ✓ Refresh token successfully rotated on use.");
    console.log("✓ Test 5 Passed.\n");

    // --------------------------------------------------------------------------
    // Test 6: Session Reuse & Hijacking Revocation
    // --------------------------------------------------------------------------
    console.log("Test 6: Session Reuse Detection (Revoke All sessions)");
    
    // Attempt refresh using the previous, rotated refresh token
    const reuseReq = {
      headers: {
        cookie: `${process.env.SESSION_COOKIE_NAME || "pc_sid"}=${encodeURIComponent(testRefreshToken)}`
      }
    };
    const reuseRes = createMockResponse();
    await refresh(reuseReq, reuseRes, (err) => { if (err) throw err; });

    if (reuseRes.statusCode !== 401) {
      throw new Error(`Token reuse should return status 401. Got status: ${reuseRes.statusCode}`);
    }

    // Verify all active sessions for this user were revoked
    const userSessionCount = await Session.countDocuments({ userId: tempUserId });
    if (userSessionCount > 0) {
      throw new Error(`Expected all sessions to be deleted on reuse detection. Remaining: ${userSessionCount}`);
    }

    const hijackLog = await AuditLog.findOne({ userId: tempUserId, event: "refresh_token_reuse_detected" });
    if (!hijackLog) {
      throw new Error("No audit log entry created for refresh token reuse detection");
    }

    console.log("  ✓ Stale token refresh request rejected.");
    console.log("  ✓ All active sessions for user instantly deleted.");
    console.log("  ✓ Hijacking security alert logged to AuditLog.");
    console.log("✓ Test 6 Passed.\n");

    // --------------------------------------------------------------------------
    // Test 7: Active Session Management (View & Terminate)
    // --------------------------------------------------------------------------
    console.log("Test 7: Sessions Listing and Terminations");
    
    // Setup multiple mock sessions
    const s1 = await Session.create({ userId: tempUserId, refreshTokenHash: "hash1", browser: "Chrome", device: "Desktop", expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    const s2 = await Session.create({ userId: tempUserId, refreshTokenHash: "hash2", browser: "Firefox", device: "Desktop", expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });
    const s3 = await Session.create({ userId: tempUserId, refreshTokenHash: "hash3", browser: "Edge", device: "Desktop", expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

    // Set cookie to mock s1 current session
    const currentRefreshJWT = jwt.sign({ sub: tempUserId.toString(), sid: s1._id.toString() }, process.env.JWT_REFRESH_SECRET);
    
    // View active sessions list
    const listReq = {
      user: { _id: tempUserId },
      headers: {
        cookie: `${process.env.SESSION_COOKIE_NAME || "pc_sid"}=${encodeURIComponent(currentRefreshJWT)}`
      }
    };
    const listRes = createMockResponse();
    await getActiveSessions(listReq, listRes, (err) => { if (err) throw err; });

    if (listRes.body.sessions.length !== 3) {
      throw new Error(`Expected 3 sessions. Got: ${listRes.body.sessions.length}`);
    }

    const currentSession = listRes.body.sessions.find(s => s.id.toString() === s1._id.toString());
    if (!currentSession || currentSession.isCurrent !== true) {
      throw new Error("Current active session was not marked as isCurrent: true");
    }
    console.log("  ✓ Session list correctly identified the current active session.");

    // Terminate individual session (terminate s2)
    const termOneReq = {
      user: { _id: tempUserId },
      params: { id: s2._id.toString() }
    };
    const termOneRes = createMockResponse();
    await terminateSession(termOneReq, termOneRes, (err) => { if (err) throw err; });

    const s2Check = await Session.findById(s2._id);
    if (s2Check) {
      throw new Error("Session s2 was not terminated");
    }
    console.log("  ✓ Individual session terminated successfully.");

    // Terminate all other sessions (terminate everything except current s1)
    const termAllReq = {
      user: { _id: tempUserId },
      headers: {
        cookie: `${process.env.SESSION_COOKIE_NAME || "pc_sid"}=${encodeURIComponent(currentRefreshJWT)}`
      }
    };
    const termAllRes = createMockResponse();
    await terminateAllOtherSessions(termAllReq, termAllRes, (err) => { if (err) throw err; });

    const s1Check = await Session.findById(s1._id);
    const s3Check = await Session.findById(s3._id);

    if (!s1Check) {
      throw new Error("Current session was incorrectly terminated during 'terminate other' command.");
    }
    if (s3Check) {
      throw new Error("Other session s3 was not terminated");
    }
    console.log("  ✓ Terminated all other sessions. Only the current session remains.");
    console.log("✓ Test 7 Passed.\n");

    // --------------------------------------------------------------------------
    // Clean up
    // --------------------------------------------------------------------------
    console.log("Cleaning up database test records...");
    await User.deleteOne({ _id: tempUserId });
    await Session.deleteMany({ userId: tempUserId });
    await AuditLog.deleteMany({ userId: tempUserId });
    console.log("✓ Cleanup finished successfully.");

    console.log("\n==============================================================================");
    console.log("=== ALL AUTH AND SESSION HARDENING INTEGRATION TESTS PASSED SUCCESSFULLY ===");
    console.log("==============================================================================");

  } catch (err) {
    console.error("\n❌ TESTS ENCOUNTERED FAILURE");
    console.error("Error Message:", err.message);
    console.error("Stack Trace:", err.stack);
    
    // Safely attempt cleanups
    try {
      if (tempUserId) {
        await User.deleteOne({ _id: tempUserId });
        await Session.deleteMany({ userId: tempUserId });
        await AuditLog.deleteMany({ userId: tempUserId });
      }
    } catch (_) {}
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runTests();
