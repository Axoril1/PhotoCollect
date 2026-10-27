/**
 * QR Snap - One-time Super Admin Bootstrap CLI Script
 * Usage: npm run bootstrap-admin
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

dotenv.config();

// Fix DNS resolution for SRV records if needed
dns.setServers(["1.1.1.1", "8.8.8.8"]);

export async function bootstrapSuperAdmin() {
  const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://localhost:27017/qrsnap";

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  const existingSuperAdmin = await User.findOne({ role: "SUPER_ADMIN" });
  if (existingSuperAdmin) {
    console.log(`[Bootstrap] Super Admin already exists (${existingSuperAdmin.email}). Bootstrap skipped.`);
    return existingSuperAdmin;
  }

  const name = process.env.SUPER_ADMIN_NAME || "Super Administrator";
  const email = process.env.SUPER_ADMIN_EMAIL || "admin@qrsnap.com";
  const password = process.env.SUPER_ADMIN_PASSWORD || "SuperAdmin123!";

  const passwordHash = await bcrypt.hash(password, 10);

  const superAdmin = new User({
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    role: "SUPER_ADMIN",
    status: "active",
    emailVerified: true,
    isVerified: true,
  });

  await superAdmin.save();
  console.log(`[Bootstrap] SUCCESS: Super Admin created successfully!`);
  console.log(`Email: ${superAdmin.email}`);
  console.log(`Role: ${superAdmin.role}`);

  return superAdmin;
}

// Execute CLI script if called directly
if (process.argv[1]?.endsWith("bootstrapSuperAdmin.js")) {
  bootstrapSuperAdmin()
    .then(() => mongoose.disconnect())
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Bootstrap] ERROR:", err.message);
      process.exit(1);
    });
}
