import { Router } from "express";
import {
  deleteVideo,
  getVideo,
  getVideoChunks,
  indexVideo,
  listVideos,
} from "../controllers/videoController.js";

const router = Router();

router.post("/index", indexVideo);
router.get("/", listVideos);
router.get("/:videoId", getVideo);
router.get("/:videoId/chunks", getVideoChunks);
router.delete("/:videoId", deleteVideo);

export default router;
