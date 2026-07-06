import mongoose from "mongoose";

/**
 * Element types supported by the FigJam canvas.
 */
export const ELEMENT_TYPES = [
  "sticky_note",
  "shape",
  "text",
  "image",
  "arrow",
  "frame",
  "pen",
];

const positionSchema = new mongoose.Schema(
  {
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
  },
  { _id: false }
);

const sizeSchema = new mongoose.Schema(
  {
    width: { type: Number, default: 200 },
    height: { type: Number, default: 200 },
  },
  { _id: false }
);

const elementSchema = new mongoose.Schema(
  {
    boardId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Board",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ELEMENT_TYPES,
      required: [true, "Element type is required"],
    },
    // Text content for sticky notes, text boxes, labels etc.
    content: {
      type: String,
      default: "",
      maxlength: [5000, "Content cannot exceed 5000 characters"],
    },
    // URL for image type elements
    url: {
      type: String,
      default: null,
    },
    position: {
      type: positionSchema,
      default: () => ({ x: 0, y: 0 }),
    },
    size: {
      type: sizeSchema,
      default: () => ({ width: 200, height: 200 }),
    },
    // Flexible style map: color, backgroundColor, fontSize, fontWeight,
    // borderColor, borderWidth, borderRadius, opacity, shapeType, etc.
    style: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Rotation in degrees (0-360)
    rotation: {
      type: Number,
      default: 0,
      min: 0,
      max: 360,
    },
    // Stack order on the canvas
    zIndex: {
      type: Number,
      default: 0,
    },
    // Prevent accidental moves/edits
    isLocked: {
      type: Boolean,
      default: false,
    },
    // For arrows: IDs of source and target elements
    connectedTo: {
      type: [
        {
          elementId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Element",
          },
          anchor: {
            type: String,
            enum: ["top", "right", "bottom", "left", "center"],
            default: "center",
          },
          _id: false,
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

// ─── Indexes ───────────────────────────────────────────────────────────────────
elementSchema.index({ boardId: 1, zIndex: 1 });
elementSchema.index({ boardId: 1, createdBy: 1 });

const Element = mongoose.model("Element", elementSchema);

export default Element;
