import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: false, // Optional for Google Auth users
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    phoneVerified: {
      type: Boolean,
      default: false,
    },
    organizationName: {
      type: String,
      trim: true,
      default: "",
    },
    provider: {
      type: String,
      enum: ["email", "google"],
      default: "email",
    },
    providerId: {
      type: String,
      index: true,
    },
    avatar: {
      type: String,
    },
    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },
    plan: {
      type: String,
      enum: ["free", "pro", "studio"],
      default: "free",
      index: true,
    },
    role: {
      type: String,
      enum: ["SUPER_ADMIN", "ADMIN", "ORGANIZER", "GUEST", "super_admin", "admin", "organizer", "guest"],
      default: "ORGANIZER",
      set: (v) => (v ? v.toUpperCase() : "ORGANIZER"),
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "suspended", "pending", "deleted", "banned", "ACTIVE", "SUSPENDED", "PENDING", "DELETED", "BANNED"],
      default: "active",
      set: (v) => (v ? v.toLowerCase() : "active"),
      index: true,
    },
    permissionsVersion: {
      type: Number,
      default: 1,
    },
    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    lastLoginAt: {
      type: Date,
    },
    verificationToken: {
      type: String,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      select: false,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockoutUntil: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Indexes for high-performance server-side querying, searching, and sorting
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });

export default mongoose.model("User", userSchema);
