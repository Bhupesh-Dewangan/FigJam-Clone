import mongoose from "mongoose";

/**
 * Embedded sub-schema for board members.
 * Each member has a reference to a User and a role.
 */
const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "editor", "viewer"],
      default: "viewer",
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const boardSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Board title is required"],
      trim: true,
      maxlength: [150, "Title cannot exceed 150 characters"],
      default: "Untitled Board",
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    members: {
      type: [memberSchema],
      default: [],
    },
    background: {
      type: String,
      default: "#F0F0F0",
    },
    thumbnail: {
      type: String,
      default: null,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
boardSchema.index({ owner: 1, createdAt: -1 });
boardSchema.index({ "members.user": 1 });

// ─── Instance Methods ──────────────────────────────────────────────────────────

/**
 * Check if a userId is a member of this board (including owner).
 */
boardSchema.methods.isMember = function (userId) {
  const id = userId.toString();
  return this.members.some((m) => m.user.toString() === id);
};

/**
 * Get the role of a userId on this board. Returns null if not a member.
 */
boardSchema.methods.getMemberRole = function (userId) {
  const id = userId.toString();
  const entry = this.members.find((m) => m.user.toString() === id);
  return entry ? entry.role : null;
};

/**
 * Returns true if the userId has edit permissions (owner or editor role).
 */
boardSchema.methods.isOwnerOrEditor = function (userId) {
  const role = this.getMemberRole(userId);
  return role === "owner" || role === "editor";
};

/**
 * Returns true if userId is the owner.
 */
boardSchema.methods.isOwner = function (userId) {
  return this.owner.toString() === userId.toString();
};

const Board = mongoose.model("Board", boardSchema);

export default Board;
