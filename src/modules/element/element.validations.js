import Joi from "joi";
import { ELEMENT_TYPES } from "./element.model.js";

const positionSchema = Joi.object({
  x: Joi.number().default(0),
  y: Joi.number().default(0),
});

const sizeSchema = Joi.object({
  width: Joi.number().positive().default(200),
  height: Joi.number().positive().default(200),
});

const styleSchema = Joi.object().unknown(true);

const connectionSchema = Joi.object({
  elementId: Joi.string().hex().length(24).required(),
  anchor: Joi.string()
    .valid("top", "right", "bottom", "left", "center")
    .default("center"),
});

export const createElementSchema = Joi.object({
  type: Joi.string()
    .valid(...ELEMENT_TYPES)
    .required()
    .messages({
      "any.required": "type is required",
      "any.only": `type must be one of: ${ELEMENT_TYPES.join(", ")}`,
    }),
  content: Joi.string().max(5000).allow("").default(""),
  url: Joi.string().uri().allow(null, "").default(null),
  position: positionSchema.default({ x: 0, y: 0 }),
  size: sizeSchema.default({ width: 200, height: 200 }),
  style: styleSchema.default({}),
  rotation: Joi.number().min(0).max(360).default(0),
  zIndex: Joi.number().integer().default(0),
  isLocked: Joi.boolean().default(false),
  connectedTo: Joi.array().items(connectionSchema).default([]),
});

export const updateElementSchema = Joi.object({
  content: Joi.string().max(5000).allow(""),
  url: Joi.string().uri().allow(null, ""),
  position: positionSchema,
  size: sizeSchema,
  style: styleSchema,
  rotation: Joi.number().min(0).max(360),
  zIndex: Joi.number().integer(),
  isLocked: Joi.boolean(),
  connectedTo: Joi.array().items(connectionSchema),
}).min(1);

export const bulkUpdateSchema = Joi.object({
  updates: Joi.array()
    .items(
      Joi.object({
        elementId: Joi.string().hex().length(24).required().messages({
          "any.required": "elementId is required in each update",
        }),
        changes: updateElementSchema.required(),
      })
    )
    .min(1)
    .required()
    .messages({
      "array.min": "At least one update is required",
      "any.required": "updates array is required",
    }),
});

export const bulkDeleteSchema = Joi.object({
  elementIds: Joi.array()
    .items(Joi.string().hex().length(24))
    .min(1)
    .required()
    .messages({
      "array.min": "At least one elementId is required",
      "any.required": "elementIds is required",
    }),
});
