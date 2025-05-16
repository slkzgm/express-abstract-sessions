// /src/routes/sessionRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import {
  createSessionHandler,
  getSessionStatusHandler,
} from "../controllers/sessionController";

const sessionRouter = Router();

sessionRouter.post("/create", authMiddleware, createSessionHandler);
sessionRouter.get("/status", authMiddleware, getSessionStatusHandler);

export default sessionRouter;
