import Element from "./element.model.js";
import Board from "../board/board.model.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Verify the requesting user has access to the board.
 * Returns the board document.
 */
const verifyBoardAccess = async (boardId, userId, requireEdit = false) => {
  const board = await Board.findById(boardId);
  if (!board) throw new ApiError(404, "Board not found");
  if (!board.isMember(userId)) throw new ApiError(403, "Access denied");
  if (requireEdit && !board.isOwnerOrEditor(userId)) {
    throw new ApiError(403, "Edit access required");
  }
  return board;
};

// ─── Controllers ───────────────────────────────────────────────────────────────

/**
 * @desc    Get all elements for a board
 * @route   GET /api/boards/:boardId/elements
 * @access  Private — board member
 */
export const getElements = asyncHandler(async (req, res) => {
  await verifyBoardAccess(req.params.boardId, req.user.id);

  const elements = await Element.find({ boardId: req.params.boardId })
    .populate("createdBy", "name email avatar")
    .sort({ zIndex: 1, createdAt: 1 });

  res.status(200).json(
    new ApiResponse(200, { elements, count: elements.length }, "Elements fetched successfully")
  );
});

/**
 * @desc    Create a new element on a board
 * @route   POST /api/boards/:boardId/elements
 * @access  Private — board editor or owner
 */
export const createElement = asyncHandler(async (req, res) => {
  await verifyBoardAccess(req.params.boardId, req.user.id, true);

  const element = await Element.create({
    ...req.body,
    boardId: req.params.boardId,
    createdBy: req.user.id,
  });

  await element.populate("createdBy", "name email avatar");

  // Update board activity timestamp
  await Board.findByIdAndUpdate(req.params.boardId, { lastActivityAt: new Date() });

  res.status(201).json(new ApiResponse(201, { element }, "Element created successfully"));
});

/**
 * @desc    Update a single element
 * @route   PUT /api/boards/:boardId/elements/:elementId
 * @access  Private — board editor or owner
 */
export const updateElement = asyncHandler(async (req, res) => {
  await verifyBoardAccess(req.params.boardId, req.user.id, true);

  const element = await Element.findOne({
    _id: req.params.elementId,
    boardId: req.params.boardId,
  });

  if (!element) throw new ApiError(404, "Element not found");

  if (element.isLocked) {
    throw new ApiError(423, "Element is locked and cannot be modified");
  }

  const allowedFields = [
    "content", "url", "position", "size", "style",
    "rotation", "zIndex", "isLocked", "connectedTo",
  ];

  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) element[field] = req.body[field];
  });

  await element.save();
  await element.populate("createdBy", "name email avatar");

  await Board.findByIdAndUpdate(req.params.boardId, { lastActivityAt: new Date() });

  res.status(200).json(new ApiResponse(200, { element }, "Element updated successfully"));
});

/**
 * @desc    Bulk update multiple elements at once (e.g., drag-move, multi-select resize)
 * @route   PATCH /api/boards/:boardId/elements/bulk
 * @access  Private — board editor or owner
 */
export const bulkUpdateElements = asyncHandler(async (req, res) => {
  await verifyBoardAccess(req.params.boardId, req.user.id, true);

  const { updates } = req.body; // validated by Joi: [{elementId, changes}]

  const bulkOps = updates.map(({ elementId, changes }) => ({
    updateOne: {
      filter: { _id: elementId, boardId: req.params.boardId, isLocked: false },
      update: { $set: changes },
    },
  }));

  const result = await Element.bulkWrite(bulkOps, { ordered: false });

  await Board.findByIdAndUpdate(req.params.boardId, { lastActivityAt: new Date() });

  res.status(200).json(
    new ApiResponse(200, {
      matched: result.matchedCount,
      modified: result.modifiedCount,
    }, "Elements updated successfully")
  );
});

/**
 * @desc    Delete a single element
 * @route   DELETE /api/boards/:boardId/elements/:elementId
 * @access  Private — board editor or owner
 */
export const deleteElement = asyncHandler(async (req, res) => {
  await verifyBoardAccess(req.params.boardId, req.user.id, true);

  const element = await Element.findOneAndDelete({
    _id: req.params.elementId,
    boardId: req.params.boardId,
  });

  if (!element) throw new ApiError(404, "Element not found");

  await Board.findByIdAndUpdate(req.params.boardId, { lastActivityAt: new Date() });

  res.status(200).json(new ApiResponse(200, null, "Element deleted successfully"));
});

/**
 * @desc    Bulk delete multiple elements
 * @route   DELETE /api/boards/:boardId/elements/bulk
 * @access  Private — board editor or owner
 */
export const bulkDeleteElements = asyncHandler(async (req, res) => {
  await verifyBoardAccess(req.params.boardId, req.user.id, true);

  const { elementIds } = req.body;

  const result = await Element.deleteMany({
    _id: { $in: elementIds },
    boardId: req.params.boardId,
  });

  await Board.findByIdAndUpdate(req.params.boardId, { lastActivityAt: new Date() });

  res.status(200).json(
    new ApiResponse(200, { deleted: result.deletedCount }, "Elements deleted successfully")
  );
});
