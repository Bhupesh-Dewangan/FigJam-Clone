import jwt from "jsonwebtoken";
import crypto from "crypto";
import ApiError from "./ApiError.js";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET;
const ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const assertSecrets = () => {
  if (!ACCESS_SECRET || !REFRESH_SECRET) {
    throw new ApiError(500, "JWT secrets are not configured");
  }
};

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createAccessToken = (userId) => {
  assertSecrets();
  return jwt.sign({ sub: userId, type: "access" }, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
  });
};

export const createRefreshToken = (userId) => {
  assertSecrets();
  return jwt.sign({ sub: userId, type: "refresh" }, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
  });
};

export const verifyAccessToken = (token) => {
  assertSecrets();
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET);
    if (decoded.type !== "access") {
      throw new ApiError(401, "Invalid access token");
    }
    return decoded;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Access token expired or invalid");
  }
};

export const verifyRefreshToken = (token) => {
  assertSecrets();
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET);
    if (decoded.type !== "refresh") {
      throw new ApiError(401, "Invalid refresh token");
    }
    return decoded;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(401, "Refresh token expired or invalid");
  }
};

export const TOKEN_DURATIONS = {
  accessMs: 15 * 60 * 1000,
  refreshMs: 7 * 24 * 60 * 60 * 1000,
};
