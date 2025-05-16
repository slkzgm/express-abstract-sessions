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

// Public endpoints
router.get("/challenge", getSiweMessageHandler);
router.post("/login", siweLoginHandler);

// Example protected route
router.get("/protected", authMiddleware, (req: Request, res: Response) => {
  res.json({ message: "You are authorized to see this!" });
});

// Session endpoints
router.use("/session", sessionRouter);

// Logout
router.post("/logout", logoutHandler);

// Actions
router.use("/actions", mintRouter);

export default router;
