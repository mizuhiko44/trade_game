import { Router } from "express";
import { action, home, loginBonus, matchDetail, startCpu } from "../controllers/gameController";

const router = Router();

router.get("/home", home);
router.post("/login-bonus", loginBonus);
router.post("/matches/cpu", startCpu);
router.get("/matches/:matchId", matchDetail);
router.post("/matches/:matchId/actions", action);

export default router;
