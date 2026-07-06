import User from "../modules/user/user.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { verifyAccessToken } from "../utils/generateToken.js";

const extractAccessToken = (req) => {
  if (req.cookies?.accessToken) {
    return req.cookies.accessToken;
  }

  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.split(" ")[1];
  }

  return null;
};

export const protect = asyncHandler(async (req, _res, next) => {
  const token = extractAccessToken(req);

  if (!token) {
    throw new ApiError(401, "Authentication required");
  }

  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.sub);

  if (!user) {
    throw new ApiError(401, "User no longer exists");
  }

  req.user = user.toPublicJSON();
  next();
});
