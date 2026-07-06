import Comment from "./comment.model.js";
import Board from "../board/board.model.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Verify the requesting user is a member of the board.
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
 * @desc    Get all root-level comments for a board, with replies embedded
 * @route   GET /api/boards/:boardId/comments
 * @access  Private — board member
 */
export const getComments = asyncHandler(async (req, res) => {
  await verifyBoardAccess(req.params.boardId, req.user.id);

  // Fetch root comments (no parent)
  const rootComments = await Comment.find({
    boardId: req.params.boardId,
    parentId: null,
  })
    .populate("author", "name email avatar")
    .populate("resolvedBy", "name email")
    .sort({ createdAt: 1 });

  // Fetch all replies for this board in one query
  const replies = await Comment.find({
    boardId: req.params.boardId,
    parentId: { $ne: null },
  })
    .populate("author", "name email avatar")
    .sort({ createdAt: 1 });

  // Group replies by parentId
  const replyMap = {};
  replies.forEach((reply) => {
    const pid = reply.parentId.toString();
    if (!replyMap[pid]) replyMap[pid] = [];
    replyMap[pid].push(reply);
  });

  // Attach replies to their root comment
  const threads = rootComments.map((comment) => ({
    ...comment.toObject(),
    replies: replyMap[comment._id.toString()] || [],
  }));

  res.status(200).json(
    new ApiResponse(200, { comments: threads, count: threads.length }, "Comments fetched successfully")
  );
});

/**
 * @desc    Create a new pinned comment on the board canvas
 * @route   POST /api/boards/:boardId/comments
 * @access  Private — board member
 */
export const createComment = asyncHandler(async (req, res) => {
  await verifyBoardAccess(req.params.boardId, req.user.id);

  const { content, position } = req.body;

  const comment = await Comment.create({
    boardId: req.params.boardId,
    author: req.user.id,
    content,
    position,
    parentId: null,
  });

  await comment.populate("author", "name email avatar");

  res.status(201).json(new ApiResponse(201, { comment }, "Comment created successfully"));
});

/**
 * @desc    Reply to an existing comment (creates a threaded reply)
 * @route   POST /api/boards/:boardId/comments/:commentId/replies
 * @access  Private — board member
 */
export const replyToComment = asyncHandler(async (req, res) => {
  await verifyBoardAccess(req.params.boardId, req.user.id);

  const parentComment = await Comment.findOne({
    _id: req.params.commentId,
    boardId: req.params.boardId,
    parentId: null, // Can only reply to root comments, not other replies
  });

  if (!parentComment) {
    throw new ApiError(404, "Comment not found or cannot reply to a reply");
  }

  const reply = await Comment.create({
    boardId: req.params.boardId,
    author: req.user.id,
    content: req.body.content,
    position: parentComment.position, // Inherits parent position
    parentId: parentComment._id,
  });

  await reply.populate("author", "name email avatar");

  res.status(201).json(new ApiResponse(201, { reply }, "Reply added successfully"));
});

/**
 * @desc    Update a comment's content (author only)
 * @route   PUT /api/boards/:boardId/comments/:commentId
 * @access  Private — comment author
 */
export const updateComment = asyncHandler(async (req, res) => {
  await verifyBoardAccess(req.params.boardId, req.user.id);

  const comment = await Comment.findOne({
    _id: req.params.commentId,
    boardId: req.params.boardId,
  });

  if (!comment) throw new ApiError(404, "Comment not found");

  if (comment.author.toString() !== req.user.id) {
    throw new ApiError(403, "You can only edit your own comments");
  }

  comment.content = req.body.content;
  await comment.save();
  await comment.populate("author", "name email avatar");

  res.status(200).json(new ApiResponse(200, { comment }, "Comment updated successfully"));
});

/**
 * @desc    Mark a comment as resolved / unresolved
 * @route   PATCH /api/boards/:boardId/comments/:commentId/resolve
 * @access  Private — board editor or owner
 */
export const resolveComment = asyncHandler(async (req, res) => {
  const board = await verifyBoardAccess(req.params.boardId, req.user.id);

  if (!board.isOwnerOrEditor(req.user.id)) {
    throw new ApiError(403, "Only editors and owners can resolve comments");
  }

  const comment = await Comment.findOne({
    _id: req.params.commentId,
    boardId: req.params.boardId,
    parentId: null, // Only root comments can be resolved
  });

  if (!comment) throw new ApiError(404, "Comment not found");

  const isResolving = !comment.isResolved;
  comment.isResolved = isResolving;
  comment.resolvedBy = isResolving ? req.user.id : null;
  comment.resolvedAt = isResolving ? new Date() : null;
  await comment.save();

  await comment.populate("author", "name email avatar");
  await comment.populate("resolvedBy", "name email");

  const message = isResolving ? "Comment resolved" : "Comment unresolved";
  res.status(200).json(new ApiResponse(200, { comment }, message));
});

/**
 * @desc    Delete a comment (author, board owner, or editor)
 * @route   DELETE /api/boards/:boardId/comments/:commentId
 * @access  Private — comment author OR board editor/owner
 */
export const deleteComment = asyncHandler(async (req, res) => {
  const board = await verifyBoardAccess(req.params.boardId, req.user.id);

  const comment = await Comment.findOne({
    _id: req.params.commentId,
    boardId: req.params.boardId,
  });

  if (!comment) throw new ApiError(404, "Comment not found");

  const isAuthor = comment.author.toString() === req.user.id;
  const canModerate = board.isOwnerOrEditor(req.user.id);

  if (!isAuthor && !canModerate) {
    throw new ApiError(403, "You do not have permission to delete this comment");
  }

  // If deleting a root comment, also delete all its replies
  if (!comment.parentId) {
    await Comment.deleteMany({ parentId: comment._id });
  }

  await comment.deleteOne();

  res.status(200).json(new ApiResponse(200, null, "Comment deleted successfully"));
});
