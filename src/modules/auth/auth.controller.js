import * as authService from "./auth.service.js";
import ApiResponse from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";
import { TOKEN_DURATIONS } from "../../utils/generateToken.js";

const ACCESS_COOKIE = "accessToken";
const REFRESH_COOKIE = "refreshToken";

const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: TOKEN_DURATIONS.accessMs,
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: TOKEN_DURATIONS.refreshMs,
};

const setAuthCookies = (res, accessToken, refreshToken) => {
  res
    .cookie(ACCESS_COOKIE, accessToken, accessCookieOptions)
    .cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions);
};

const clearAuthCookies = (res) => {
  res
    .clearCookie(ACCESS_COOKIE, accessCookieOptions)
    .clearCookie(REFRESH_COOKIE, refreshCookieOptions);
};

const sendAuthResponse = (res, statusCode, user, accessToken, refreshToken, message) => {
  setAuthCookies(res, accessToken, refreshToken);

  return res.status(statusCode).json(
    new ApiResponse(statusCode, { user, accessToken, refreshToken }, message)
  );
};

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.registerUser({
    name,
    email,
    password,
  });

  sendAuthResponse(res, 201, user, accessToken, refreshToken, "Account created successfully");
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, accessToken, refreshToken } = await authService.authenticateUser({
    email,
    password,
  });

  sendAuthResponse(res, 200, user, accessToken, refreshToken, "Logged in successfully");
});

export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

  const { user, accessToken, refreshToken: newRefreshToken } =
    await authService.refreshTokens(refreshToken);

  sendAuthResponse(res, 200, user, accessToken, newRefreshToken, "Tokens refreshed successfully");
});

export const logout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
  await authService.logoutUser(refreshToken);

  clearAuthCookies(res);
  res.status(200).json(new ApiResponse(200, null, "Logged out successfully"));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});
