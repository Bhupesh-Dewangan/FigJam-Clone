import Joi from "joi";

export const createBoardSchema = Joi.object({
  title: Joi.string().trim().max(150).default("Untitled Board"),
  description: Joi.string().trim().max(500).allow("").default(""),
  background: Joi.string()
    .pattern(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .default("#F0F0F0")
    .messages({
      "string.pattern.base": "background must be a valid hex color (e.g. #F0F0F0)",
    }),
  isPublic: Joi.boolean().default(false),
});

export const updateBoardSchema = Joi.object({
  title: Joi.string().trim().max(150),
  description: Joi.string().trim().max(500).allow(""),
  background: Joi.string()
    .pattern(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
    .messages({
      "string.pattern.base": "background must be a valid hex color (e.g. #F0F0F0)",
    }),
  thumbnail: Joi.string().uri().allow(null, ""),
  isPublic: Joi.boolean(),
}).min(1);

export const addMemberSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required().messages({
    "string.email": "A valid email address is required",
    "any.required": "email is required",
  }),
  role: Joi.string().valid("editor", "viewer").default("viewer"),
});

export const updateMemberRoleSchema = Joi.object({
  role: Joi.string().valid("editor", "viewer").required().messages({
    "any.required": "role is required",
    "any.only": "role must be editor or viewer",
  }),
});
