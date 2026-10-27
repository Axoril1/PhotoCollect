import mongoose from "mongoose";

const photoModerationCommentSchema = new mongoose.Schema(
  {
    photoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Photo",
      required: true,
      index: true,
    },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    adminName: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
  },
  { timestamps: true }
);

photoModerationCommentSchema.index({ photoId: 1, createdAt: -1 });

export default mongoose.model("PhotoModerationComment", photoModerationCommentSchema);
