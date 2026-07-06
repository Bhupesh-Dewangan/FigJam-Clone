import User from "../user/user.model.js";
import ApiError from "../../utils/ApiError.js";
import {
  createAccessToken,
  createRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  TOKEN_DURATIONS,
} from "../../utils/generateToken.js";

const issueTokenPair = async (user) => {
  const accessToken = createAccessToken(user._id);
  const refreshToken = createRefreshToken(user._id);
  const expiresAt = new Date(Date.now() + TOKEN_DURATIONS.refreshMs);

  await user.storeRefreshToken(refreshToken, expiresAt);

  return { accessToken, refreshToken };
};

export const registerUser = async ({ name, email, password }) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const user = await User.create({ name, email, password });
  const tokens = await issueTokenPair(user);

  return { user: user.toPublicJSON(), ...tokens };
};

export const authenticateUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid email or password");
  }

  user.lastActiveAt = new Date();
  await user.save({ validateBeforeSave: false });

  const tokens = await issueTokenPair(user);

  return { user: user.toPublicJSON(), ...tokens };
};

export const refreshTokens = async (refreshToken) => {
  const decoded = verifyRefreshToken(refreshToken);

  const user = await User.findById(decoded.sub);
  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  if (!user.hasRefreshToken(refreshToken)) {
    throw new ApiError(401, "Refresh token revoked or invalid");
  }

  await user.removeRefreshToken(refreshToken);
  const tokens = await issueTokenPair(user);

  return { user: user.toPublicJSON(), ...tokens };
};

export const logoutUser = async (refreshToken) => {
  if (!refreshToken) {
    throw new ApiError(400, "Refresh token is required");
  }

  const decoded = verifyRefreshToken(refreshToken);
  const user = await User.findById(decoded.sub);

  if (user) {
    await user.removeRefreshToken(refreshToken);
  }
};

export { verifyAccessToken };
