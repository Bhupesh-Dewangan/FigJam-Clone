import { Router } from "express";
import { protect } from "../../middlewares/auth.middleware.js";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createBoardSchema,
  updateBoardSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from "./board.validations.js";
import {
  getBoards,
  createBoard,
  getBoard,
  updateBoard,
  deleteBoard,
  addMember,
  removeMember,
  updateMemberRole,
} from "./board.controller.js";
import { elementRoutes } from "../element/element.routes.js";
import { commentRoutes } from "../comment/comment.routes.js";

const router = Router();

// All board routes require authentication
router.use(protect);

// ─── Board CRUD ────────────────────────────────────────────────────────────────
router.get("/", getBoards);
router.post("/", validate(createBoardSchema), createBoard);
router.get("/:boardId", getBoard);
router.put("/:boardId", validate(updateBoardSchema), updateBoard);
router.delete("/:boardId", deleteBoard);

// ─── Board Members ─────────────────────────────────────────────────────────────
router.post("/:boardId/members", validate(addMemberSchema), addMember);
router.delete("/:boardId/members/:userId", removeMember);
router.patch("/:boardId/members/:userId", validate(updateMemberRoleSchema), updateMemberRole);

// ─── Nested Modules ────────────────────────────────────────────────────────────
// Elements: /api/boards/:boardId/elements
router.use("/:boardId/elements", elementRoutes);

// Comments: /api/boards/:boardId/comments
router.use("/:boardId/comments", commentRoutes);

export { router as boardRoutes };