import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import connectDB from "./src/config/db.js";
import authRoutes from "./src/modules/auth/auth.routes.js";
import ApiError from "./src/utils/ApiError.js";
import userRoutes from "./src/modules/user/user.routes.js";
import { boardRoutes } from "./src/modules/board/board.routes.js";
// Note: element & comment routes are nested inside boardRoutes


const PORT = process.env.PORT || 5000;
const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const startServer = async () => {
  await connectDB();

  app.use("/api/auth", authRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/boards", boardRoutes);

  app.get("/", (_req, res) => {
    res.json({ message: "FigJam API is running" });
  });

  app.use((_req, _res, next) => {
    next(new ApiError(404, "Route not found"));
  });

  app.use((err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      statusCode,
      message: err.message || "Internal server error",
      success: false,
      errors: err.errors || [],
    });
  });

  app.listen(PORT, () => {
    console.log(`FigJam server running on port ${PORT}`);
  });
};

startServer();
