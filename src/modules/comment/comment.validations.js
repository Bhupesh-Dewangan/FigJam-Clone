import Joi from "joi";

export const createCommentSchema = Joi.object({
  content: Joi.string().trim().max(2000).required().messages({
    "any.required": "content is required",
    "string.max": "Comment cannot exceed 2000 characters",
  }),
  position: Joi.object({
    x: Joi.number().default(0),
    y: Joi.number().default(0),
  }).default({ x: 0, y: 0 }),
});

export const replySchema = Joi.object({
  content: Joi.string().trim().max(2000).required().messages({
    "any.required": "content is required",
    "string.max": "Reply cannot exceed 2000 characters",
  }),
});

export const updateCommentSchema = Joi.object({
  content: Joi.string().trim().max(2000).required().messages({
    "any.required": "content is required",
    "string.max": "Comment cannot exceed 2000 characters",
  }),
});
