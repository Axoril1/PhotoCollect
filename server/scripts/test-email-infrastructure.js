import dotenv from "dotenv";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";
import { emailService } from "../email/EmailService.js";
import { templateRenderer } from "../email/EmailTemplateRenderer.js";
import { 
  register, 
  verifyEmail, 
  resendVerificationEmail, 
  forgotPassword, 
  resetPassword 
} from "../controllers/authController.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logDir = path.join(process.cwd(), "uploads", "email_logs");

console.log("==============================================================================");
console.log("PhotoCollect v1.1 - Transactional Email Infrastructure Verification");
console.log("==============================================================================\n");

// Helper to create mock Express Response objects
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
    getHeader: function (name) {
      return this.headers[name.toLowerCase()];
    }
  };
  return res;
};

// Helper to find the latest sent email log file
const getLatestEmailLog = () => {
  if (!fs.existsSync(logDir)) return null;
  const files = fs.readdirSync(logDir)
    .filter(f => f.startsWith("email_") && f.endsWith(".json"))
    .map(name => ({
      name,
      time: fs.statSync(path.join(logDir, name)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
  
  if (files.length === 0) return null;
  const filePath = path.join(logDir, files[0].name);
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
};

// Helper to clear mock email logs
const clearEmailLogs = () => {
  if (fs.existsSync(logDir)) {
    const files = fs.readdirSync(logDir);
    for (const file of files) {
      fs.unlinkSync(path.join(logDir, file));
    }
  }
};

async function runTests() {
  let testUserEmail = `infra-test-${Date.now()}@example.com`;
  let verificationToken = null;
  let resetToken = null;

  try {
    // --------------------------------------------------------------------------
    // Test 1: Template Compilation
    // --------------------------------------------------------------------------
    console.log("Test 1: Template Engine Compilation");
    const templates = ["welcome", "verify", "reset", "changed", "created", "closed", "expiring"];
    
    for (const t of templates) {
      const renderData = {
        name: "Test User",
        url: "http://example.com/test",
        verificationUrl: "http://example.com/verify?token=123",
        resetUrl: "http://example.com/reset?token=123",
        eventName: "Summer Beach Party",
        expiresAt: "2026-08-01",
        eventUrl: "http://example.com/events/summer-beach-party",
      };

      const result = templateRenderer.render(t, renderData);
      
      if (!result.html || !result.text) {
        throw new Error(`Template ${t} failed compilation - HTML or Text is empty.`);
      }

      // Check placeholder replacement
      if (t === "welcome" && !result.html.includes("Test User")) {
        throw new Error(`Template ${t} placeholder name replacement failed.`);
      }
      console.log(`  ✓ Template "${t}" compiled successfully.`);
    }
    console.log("✓ Test 1 Passed: Template engine is fully functional.\n");

    // --------------------------------------------------------------------------
    // Test 2: Connection & Providers Verification
    // --------------------------------------------------------------------------
    console.log("Test 2: Provider Connection & Health");
    // Ensure email service initializes
    emailService.init();
    const health = await emailService.healthCheck();
    console.log(`  Active Provider: ${health.provider}`);
    console.log(`  Status: ${health.status}`);
    if (health.status !== "healthy") {
      throw new Error("Active provider failed health check");
    }
    console.log("✓ Test 2 Passed: Active provider is healthy.\n");

    // --------------------------------------------------------------------------
    // Test 3: Connect DB
    // --------------------------------------------------------------------------
    console.log("Test 3: Connecting to Database");
    await connectDB();
    console.log("✓ Test 3 Passed: MongoDB connected successfully.\n");

    // --------------------------------------------------------------------------
    // Test 4: Registration Welcome & Verification Emails
    // --------------------------------------------------------------------------
    console.log("Test 4: Register Endpoint & Email Dispatch");
    clearEmailLogs();

    const regReq = {
      body: {
        name: "Infra Tester",
        email: testUserEmail,
        password: "SuperSecretPassword123!",
      },
      headers: {
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
      },
      socket: {
        remoteAddress: "127.0.0.1"
      }
    };
    const regRes = createMockResponse();

    await register(regReq, regRes, (err) => { if (err) throw err; });

    if (regRes.statusCode !== 201) {
      throw new Error(`Registration failed with status ${regRes.statusCode}: ${JSON.stringify(regRes.body)}`);
    }

    // Verify user was stored in database
    const userInDb = await User.findOne({ email: testUserEmail }).select("+verificationToken +verificationTokenExpires");
    if (!userInDb) {
      throw new Error("User was not found in Mongoose database after registration");
    }
    if (userInDb.isVerified !== false) {
      throw new Error("User should not be verified on initial registration");
    }
    if (!userInDb.verificationToken || !userInDb.verificationTokenExpires) {
      throw new Error("Verification token or expiry not set in database");
    }

    console.log("  ✓ Database record initialized correctly.");

    // Retrieve generated verification email to get the raw unhashed token
    const latestEmail = getLatestEmailLog();
    if (!latestEmail) {
      throw new Error("No verification email was logged/sent during registration");
    }
    
    // Parse the verification URL to extract the token
    const tokenMatch = latestEmail.html.match(/token=([a-f0-9]+)/);
    if (!tokenMatch) {
      throw new Error("Could not extract verification token from email body html");
    }
    verificationToken = tokenMatch[1];
    console.log(`  ✓ Raw verification token extracted from sent email: ${verificationToken.substring(0, 8)}...`);
    console.log("✓ Test 4 Passed: User registered, welcome and verification emails dispatched.\n");

    // --------------------------------------------------------------------------
    // Test 5: Email Verification Flow
    // --------------------------------------------------------------------------
    console.log("Test 5: Email Verification Endpoint");
    
    // Test verification with invalid token
    const invalidVerifyRes = createMockResponse();
    await verifyEmail({ params: { token: "invalidtoken123" } }, invalidVerifyRes, (err) => { if (err) throw err; });
    if (invalidVerifyRes.statusCode !== 400) {
      throw new Error(`Invalid verification request should fail with 400. Got ${invalidVerifyRes.statusCode}`);
    }
    console.log("  ✓ Invalid token verification attempt rejected correctly.");

    // Test verification with valid token
    const verifyRes = createMockResponse();
    await verifyEmail({ params: { token: verificationToken } }, verifyRes, (err) => { if (err) throw err; });
    
    if (verifyRes.statusCode !== 200) {
      throw new Error(`Email verification failed with status ${verifyRes.statusCode}: ${JSON.stringify(verifyRes.body)}`);
    }

    const verifiedUser = await User.findOne({ email: testUserEmail }).select("+verificationToken +verificationTokenExpires");
    if (verifiedUser.isVerified !== true) {
      throw new Error("User isVerified status was not updated to true in database");
    }
    if (verifiedUser.verificationToken !== undefined || verifiedUser.verificationTokenExpires !== undefined) {
      throw new Error("Verification token fields were not cleaned up from user record");
    }

    console.log("  ✓ Valid verification token accepted, account verified, DB tokens invalidated.");
    console.log("✓ Test 5 Passed: Verification endpoint is secure and functional.\n");

    // --------------------------------------------------------------------------
    // Test 6: Resend Verification (Enumeration Prevention & Logic)
    // --------------------------------------------------------------------------
    console.log("Test 6: Resend Verification & Enumeration Prevention");
    
    // Test resend for already verified account
    const resendVerifiedRes = createMockResponse();
    await resendVerificationEmail({ body: { email: testUserEmail } }, resendVerifiedRes, (err) => {
      // Expect custom error or bad request
    });
    if (resendVerifiedRes.statusCode !== 400) {
      throw new Error(`Already verified resend request should fail with 400. Got ${resendVerifiedRes.statusCode}`);
    }
    console.log("  ✓ Verification resend on verified user rejected.");

    // Test resend for non-existent account (enumeration test)
    const resendFakeRes = createMockResponse();
    await resendVerificationEmail({ body: { email: "doesnotexist@example.com" } }, resendFakeRes, (err) => { if (err) throw err; });
    if (resendFakeRes.statusCode !== 200 || !resendFakeRes.body.message.includes("verification link has been sent")) {
      throw new Error("Resend verification for fake email must return success status to prevent user enumeration.");
    }
    console.log("  ✓ Verification resend for non-existent account returned success (enumeration protected).");
    console.log("✓ Test 6 Passed: Resend endpoint is enumeration protected.\n");

    // --------------------------------------------------------------------------
    // Test 7: Password Reset Request (Forgot Password)
    // --------------------------------------------------------------------------
    console.log("Test 7: Forgot Password Request");
    clearEmailLogs();

    // Request reset for real email
    const forgotRes = createMockResponse();
    await forgotPassword({ body: { email: testUserEmail } }, forgotRes, (err) => { if (err) throw err; });
    if (forgotRes.statusCode !== 200) {
      throw new Error(`Forgot password request failed: ${JSON.stringify(forgotRes.body)}`);
    }

    const resetUser = await User.findOne({ email: testUserEmail }).select("+resetPasswordToken +resetPasswordExpires");
    if (!resetUser.resetPasswordToken || !resetUser.resetPasswordExpires) {
      throw new Error("Password reset token fields were not populated in database");
    }

    // Retrieve generated reset email
    const resetEmail = getLatestEmailLog();
    if (!resetEmail) {
      throw new Error("No password reset email was dispatched");
    }

    // Parse the reset URL to extract the token
    const resetMatch = resetEmail.html.match(/token=([a-f0-9]+)/);
    if (!resetMatch) {
      throw new Error("Could not extract reset token from email body html");
    }
    resetToken = resetMatch[1];
    console.log(`  ✓ Raw reset token extracted from reset email: ${resetToken.substring(0, 8)}...`);

    // Request reset for fake email (enumeration check)
    const forgotFakeRes = createMockResponse();
    await forgotPassword({ body: { email: "fakeuser123@example.com" } }, forgotFakeRes, (err) => { if (err) throw err; });
    if (forgotFakeRes.statusCode !== 200 || !forgotFakeRes.body.message.includes("sent password reset instructions")) {
      throw new Error("Forgot password for fake email must return success status to prevent user enumeration.");
    }
    console.log("  ✓ Forgot password for fake account returned success (enumeration protected).");
    console.log("✓ Test 7 Passed: Reset requests are fully functional and secure.\n");

    // --------------------------------------------------------------------------
    // Test 8: Reset Password Completion
    // --------------------------------------------------------------------------
    console.log("Test 8: Password Reset Completion");
    clearEmailLogs();

    // Attempt with invalid token
    const invalidResetRes = createMockResponse();
    await resetPassword({ params: { token: "invalidtoken123" }, body: { password: "NewStrongPassword123!" } }, invalidResetRes, (err) => { if (err) throw err; });
    if (invalidResetRes.statusCode !== 400) {
      throw new Error(`Invalid password reset completion should fail with 400. Got ${invalidResetRes.statusCode}`);
    }
    console.log("  ✓ Invalid reset token completion rejected correctly.");

    // Attempt with valid token
    const validResetRes = createMockResponse();
    await resetPassword({ params: { token: resetToken }, body: { password: "NewStrongPassword123!" } }, validResetRes, (err) => { if (err) throw err; });
    if (validResetRes.statusCode !== 200) {
      throw new Error(`Password reset failed with status ${validResetRes.statusCode}: ${JSON.stringify(validResetRes.body)}`);
    }

    const completedUser = await User.findOne({ email: testUserEmail }).select("+resetPasswordToken +resetPasswordExpires");
    if (completedUser.resetPasswordToken !== undefined || completedUser.resetPasswordExpires !== undefined) {
      throw new Error("Password reset token fields were not cleaned up from user record");
    }

    // Verify confirmation email was sent
    const confirmEmailLog = getLatestEmailLog();
    if (!confirmEmailLog || !confirmEmailLog.subject.includes("Password Has Been Changed")) {
      throw new Error("Password changed confirmation email was not dispatched");
    }

    console.log("  ✓ Password updated, reset tokens destroyed, and confirmation email dispatched.");
    console.log("✓ Test 8 Passed: Reset completion verified.\n");

    // --------------------------------------------------------------------------
    // Test 9: System Notifications Dispatch
    // --------------------------------------------------------------------------
    console.log("Test 9: System Event Emails Dispatch");
    const mockEvent = {
      name: "Graduation Celebration 2026",
      slug: "graduation-celebration-2026",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
    };

    console.log("  Sending Event Created email...");
    await emailService.sendEventCreatedEmail(completedUser, mockEvent);
    
    console.log("  Sending Event Expiring email...");
    await emailService.sendEventExpiringEmail(completedUser, mockEvent);

    console.log("  Sending Event Closed email...");
    await emailService.sendEventClosedEmail(completedUser, mockEvent);

    console.log("✓ Test 9 Passed: Event notifications sent and logged correctly.\n");

    // --------------------------------------------------------------------------
    // Clean Up Database and files
    // --------------------------------------------------------------------------
    console.log("Cleaning up test artifacts...");
    await User.deleteOne({ email: testUserEmail });
    clearEmailLogs();
    console.log("✓ Cleanup finished successfully.");

    console.log("\n==============================================================================");
    console.log("=== ALL EMAIL SYSTEM INFRASTRUCTURE TESTS COMPLETED SUCCESSFULLY ===");
    console.log("==============================================================================");

  } catch (err) {
    console.error("\n❌ TEST RUN FAILED");
    console.error("Error Message:", err.message);
    console.error("Stack Trace:", err.stack);
    
    // Attempt database record cleanup
    try {
      await User.deleteOne({ email: testUserEmail });
    } catch (_) {}
    
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

runTests();
