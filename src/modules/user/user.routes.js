import express from "express";
import {
  getUserProfile,
  updateUserProfile,
  getUsers,
} from "./user.controller.js";
import { protect } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// Apply protect middleware to all routes in this file
router.use(protect);

router
  .route("/profile")
  .get(getUserProfile)
  .put(updateUserProfile);

// Get all users (Private/Admin)
router.route("/").get(getUsers);

export default router;
