// /src/routes/mintRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware";
import { sessionMiddleware } from "../middlewares/sessionMiddleware";
import { mintHandler } from "../controllers/mintController";

const mintRouter = Router();

mintRouter.post("/mint", authMiddleware, sessionMiddleware, mintHandler);

export default mintRouter;
