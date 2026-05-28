import { Router } from "express";
import { chat, getMessages } from "../controllers/chatController.js";

const router = Router({ mergeParams: true });

router.post("/chat", chat);
router.get("/messages", getMessages);

export default router;
