import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import videoRoutes from "./routes/videoRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import { AppError } from "./utils/AppError.js";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.js";

const app = express();
const allowedOrigins = env.frontendUrl.split(",").map((origin) => origin.trim()).filter(Boolean);

function isDevOrigin(origin = "") {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname)
    );
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin) || isDevOrigin(origin)) {
        callback(null, true);
        return;
      }

      callback(new AppError("CORS blocked this request.", 403));
    },
  })
);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/videos/:videoId", chatRoutes);
app.use("/api/videos", videoRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
