// /src/routes/index.ts
import { Router, Request, Response } from "express";
import {
  getSiweMessageHandler,
  siweLoginHandler,
  logoutHandler,
} from "../controllers/authController";
import { authMiddleware } from "../middlewares/authMiddleware";
import sessionRouter from "./sessionRoutes";
import mintRouter from "./mintRoutes";

const router = Router();

// Public
router.get("/challenge", getSiweMessageHandler);
router.post("/login", siweLoginHandler);

// Protected example
router.get("/protected", authMiddleware, (req: Request, res: Response) => {
  res.json({ message: "You are authorized to see this!" });
});

// Session
router.use("/session", sessionRouter);

// Logout
router.post("/logout", logoutHandler);

// Actions
router.use("/actions", mintRouter);

export default router;
