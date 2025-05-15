// /src/routes/sessionRoutes.ts
import { Router } from "express";
import {
  getOrCreateSessionHandler,
  confirmSessionHandler,
  getSessionStatusHandler,
} from "../controllers/sessionController";
import { authMiddleware } from "../middlewares/authMiddleware";

const sessionRouter = Router();

sessionRouter.get("/", authMiddleware, getOrCreateSessionHandler);
sessionRouter.post("/confirm", authMiddleware, confirmSessionHandler);
sessionRouter.get("/status", authMiddleware, getSessionStatusHandler);

export default sessionRouter;
