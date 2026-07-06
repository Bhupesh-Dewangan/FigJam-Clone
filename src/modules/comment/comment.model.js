import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Comment content is required"],
      trim: true,
      maxlength: [2000, "Comment cannot exceed 2000 characters"],
    },
    // Board canvas coordinates where the comment is pinned.
    // Only required for root comments (parentId === null).
    position: {
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 },
    },
    // null means this is a root comment; ObjectId means it's a reply
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
      default: null,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
commentSchema.index({ boardId: 1, parentId: 1, createdAt: 1 });
commentSchema.index({ boardId: 1, isResolved: 1 });

const Comment = mongoose.model("Comment", commentSchema);

export default Comment;
