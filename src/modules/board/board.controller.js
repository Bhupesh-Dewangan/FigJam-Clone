import Board from "./board.model.js";
import User from "../user/user.model.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";

// ─── Helper ────────────────────────────────────────────────────────────────────

/**
 * Fetch a board by ID and verify the requesting user is a member.
 * Throws ApiError if not found or not a member.
 */
const getBoardAndVerifyAccess = async (boardId, userId) => {
  const board = await Board.findById(boardId).populate(
    "members.user",
    "name email avatar"
  );
  if (!board) throw new ApiError(404, "Board not found");
  if (!board.isMember(userId)) throw new ApiError(403, "Access denied");
  return board;
};

// ─── Controllers ───────────────────────────────────────────────────────────────

/**
 * @desc    Get all boards the logged-in user owns or is a member of
 * @route   GET /api/boards
 * @access  Private
 */
export const getBoards = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
  const skip = (page - 1) * limit;

  const filter = { "members.user": req.user.id };

  const [boards, total] = await Promise.all([
    Board.find(filter)
      .populate("owner", "name email avatar")
      .populate("members.user", "name email avatar")
      .sort({ lastActivityAt: -1 })
      .skip(skip)
      .limit(limit),
    Board.countDocuments(filter),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      boards,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    }, "Boards fetched successfully")
  );
});

/**
 * @desc    Create a new board
 * @route   POST /api/boards
 * @access  Private
 */
export const createBoard = asyncHandler(async (req, res) => {
  const { title, description, background, isPublic } = req.body;

  const board = await Board.create({
    title,
    description,
    background,
    isPublic,
    owner: req.user.id,
    // Owner is automatically added as a member with role "owner"
    members: [{ user: req.user.id, role: "owner" }],
  });

  await board.populate("owner", "name email avatar");
  await board.populate("members.user", "name email avatar");

  res.status(201).json(new ApiResponse(201, { board }, "Board created successfully"));
});

/**
 * @desc    Get a single board by ID (with members populated)
 * @route   GET /api/boards/:boardId
 * @access  Private
 */
export const getBoard = asyncHandler(async (req, res) => {
  const board = await getBoardAndVerifyAccess(req.params.boardId, req.user.id);

  res.status(200).json(new ApiResponse(200, { board }, "Board fetched successfully"));
});

/**
 * @desc    Update board metadata (title, description, background, etc.)
 * @route   PUT /api/boards/:boardId
 * @access  Private — owner or editor
 */
export const updateBoard = asyncHandler(async (req, res) => {
  const board = await getBoardAndVerifyAccess(req.params.boardId, req.user.id);

  if (!board.isOwnerOrEditor(req.user.id)) {
    throw new ApiError(403, "Only editors and owners can update the board");
  }

  const allowedFields = ["title", "description", "background", "thumbnail", "isPublic"];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) board[field] = req.body[field];
  });
  board.lastActivityAt = new Date();
  await board.save();

  await board.populate("members.user", "name email avatar");

  res.status(200).json(new ApiResponse(200, { board }, "Board updated successfully"));
});

/**
 * @desc    Delete a board (and cascades are handled by pre-hook or manually)
 * @route   DELETE /api/boards/:boardId
 * @access  Private — owner only
 */
export const deleteBoard = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.boardId);
  if (!board) throw new ApiError(404, "Board not found");

  if (!board.isOwner(req.user.id)) {
    throw new ApiError(403, "Only the board owner can delete it");
  }

  await board.deleteOne();

  res.status(200).json(new ApiResponse(200, null, "Board deleted successfully"));
});

/**
 * @desc    Add a member to a board by email
 * @route   POST /api/boards/:boardId/members
 * @access  Private — owner only
 */
export const addMember = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.boardId);
  if (!board) throw new ApiError(404, "Board not found");

  if (!board.isOwner(req.user.id)) {
    throw new ApiError(403, "Only the board owner can add members");
  }

  const { email, role } = req.body;

  const userToAdd = await User.findOne({ email });
  if (!userToAdd) {
    throw new ApiError(404, `No user found with email: ${email}`);
  }

  const userId = userToAdd._id.toString();

  if (board.isMember(userId)) {
    throw new ApiError(409, "User is already a member of this board");
  }

  board.members.push({ user: userToAdd._id, role });
  board.lastActivityAt = new Date();
  await board.save();

  await board.populate("members.user", "name email avatar");

  res.status(201).json(new ApiResponse(201, { board }, "Member added successfully"));
});

/**
 * @desc    Remove a member from a board
 * @route   DELETE /api/boards/:boardId/members/:userId
 * @access  Private — owner only (a user can also remove themselves)
 */
export const removeMember = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.boardId);
  if (!board) throw new ApiError(404, "Board not found");

  const targetUserId = req.params.userId;
  const requesterId = req.user.id;

  // Owner can remove anyone; a user can remove themselves
  const isSelf = targetUserId === requesterId;
  if (!board.isOwner(requesterId) && !isSelf) {
    throw new ApiError(403, "You do not have permission to remove this member");
  }

  // Cannot remove the owner via this route
  if (targetUserId === board.owner.toString()) {
    throw new ApiError(400, "Cannot remove the board owner");
  }

  if (!board.isMember(targetUserId)) {
    throw new ApiError(404, "User is not a member of this board");
  }

  board.members = board.members.filter(
    (m) => m.user.toString() !== targetUserId
  );
  board.lastActivityAt = new Date();
  await board.save();

  res.status(200).json(new ApiResponse(200, null, "Member removed successfully"));
});

/**
 * @desc    Update a member's role
 * @route   PATCH /api/boards/:boardId/members/:userId
 * @access  Private — owner only
 */
export const updateMemberRole = asyncHandler(async (req, res) => {
  const board = await Board.findById(req.params.boardId);
  if (!board) throw new ApiError(404, "Board not found");

  if (!board.isOwner(req.user.id)) {
    throw new ApiError(403, "Only the board owner can change member roles");
  }

  const targetUserId = req.params.userId;

  if (targetUserId === board.owner.toString()) {
    throw new ApiError(400, "Cannot change the owner's role");
  }

  const member = board.members.find((m) => m.user.toString() === targetUserId);
  if (!member) throw new ApiError(404, "Member not found on this board");

  member.role = req.body.role;
  board.lastActivityAt = new Date();
  await board.save();

  await board.populate("members.user", "name email avatar");

  res.status(200).json(new ApiResponse(200, { board }, "Member role updated"));
});
