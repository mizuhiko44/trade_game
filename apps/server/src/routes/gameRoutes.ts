import { Router } from "express";
import {
  action,
  getDebugMessages,
  home,
  loginBonus,
  matchDetail,
  postDebugMessage,
  startCpu
} from "../controllers/gameController";

const router = Router();

router.get("/home", home);
router.post("/login-bonus", loginBonus);
router.post("/matches/cpu", startCpu);
router.get("/matches/:matchId", matchDetail);
router.post("/matches/:matchId/actions", action);
router.get("/debug/messages", getDebugMessages);
router.post("/debug/messages", postDebugMessage);

export default router;
