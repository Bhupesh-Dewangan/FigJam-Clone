import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createCommentSchema,
  replySchema,
  updateCommentSchema,
} from "./comment.validations.js";
import {
  getComments,
  createComment,
  replyToComment,
  updateComment,
  resolveComment,
  deleteComment,
} from "./comment.controller.js";

/**
 * Comment routes are mounted as a nested router under:
 *   /api/boards/:boardId/comments
 *
 * mergeParams: true ensures :boardId is accessible in controllers.
 */
const router = Router({ mergeParams: true });

// GET    /api/boards/:boardId/comments                          — list all threads
router.get("/", getComments);

// POST   /api/boards/:boardId/comments                          — create pinned comment
router.post("/", validate(createCommentSchema), createComment);

// POST   /api/boards/:boardId/comments/:commentId/replies       — reply to a comment
router.post("/:commentId/replies", validate(replySchema), replyToComment);

// PUT    /api/boards/:boardId/comments/:commentId               — edit own comment
router.put("/:commentId", validate(updateCommentSchema), updateComment);

// PATCH  /api/boards/:boardId/comments/:commentId/resolve       — toggle resolve
router.patch("/:commentId/resolve", resolveComment);

// DELETE /api/boards/:boardId/comments/:commentId               — delete comment
router.delete("/:commentId", deleteComment);

export { router as commentRoutes };
