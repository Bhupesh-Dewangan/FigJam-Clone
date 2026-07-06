import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware.js";
import {
  createElementSchema,
  updateElementSchema,
  bulkUpdateSchema,
  bulkDeleteSchema,
} from "./element.validations.js";
import {
  getElements,
  createElement,
  updateElement,
  bulkUpdateElements,
  deleteElement,
  bulkDeleteElements,
} from "./element.controller.js";

/**
 * Element routes are mounted as a nested router under:
 *   /api/boards/:boardId/elements
 *
 * Express mergeParams: true ensures :boardId is accessible in controllers.
 */
const router = Router({ mergeParams: true });

// GET  /api/boards/:boardId/elements         — list all elements
router.get("/", getElements);

// POST /api/boards/:boardId/elements         — create a new element
router.post("/", validate(createElementSchema), createElement);

// PATCH /api/boards/:boardId/elements/bulk   — bulk update (must come before /:elementId)
router.patch("/bulk", validate(bulkUpdateSchema), bulkUpdateElements);

// DELETE /api/boards/:boardId/elements/bulk  — bulk delete (must come before /:elementId)
router.delete("/bulk", validate(bulkDeleteSchema), bulkDeleteElements);

// PUT    /api/boards/:boardId/elements/:elementId — update single element
router.put("/:elementId", validate(updateElementSchema), updateElement);

// DELETE /api/boards/:boardId/elements/:elementId — delete single element
router.delete("/:elementId", deleteElement);

export { router as elementRoutes };
