import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { hashToken } from "../../utils/generateToken.js";

const refreshTokenSchema = new mongoose.Schema(
  {
    tokenHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    avatar: {
      type: String,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    refreshTokens: {
      type: [refreshTokenSchema],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.storeRefreshToken = async function (refreshToken, expiresAt) {
  this.refreshTokens.push({ tokenHash: hashToken(refreshToken), expiresAt });
  this.refreshTokens = this.refreshTokens.filter((entry) => entry.expiresAt > new Date());
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.removeRefreshToken = async function (refreshToken) {
  const tokenHash = hashToken(refreshToken);
  this.refreshTokens = this.refreshTokens.filter((entry) => entry.tokenHash !== tokenHash);
  await this.save({ validateBeforeSave: false });
};

userSchema.methods.hasRefreshToken = function (refreshToken) {
  const tokenHash = hashToken(refreshToken);
  return this.refreshTokens.some(
    (entry) => entry.tokenHash === tokenHash && entry.expiresAt > new Date()
  );
};

userSchema.methods.toPublicJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    avatar: this.avatar,
    lastActiveAt: this.lastActiveAt,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const User = mongoose.model("User", userSchema);

export default User;
