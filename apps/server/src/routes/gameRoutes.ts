import { Router } from "express";
import {
  action,
  deleteDebugMessages,
  getDebugMessages,
  home,
  loginBonus,
  matchDetail,
  postDebugMessage,
  startCpu
} from "../controllers/gameController";
import { requireDebugEnabled } from "../middlewares/requireDebugEnabled";

const router = Router();

router.get("/home", home);
router.post("/login-bonus", loginBonus);
router.post("/matches/cpu", startCpu);
router.get("/matches/:matchId", matchDetail);
router.post("/matches/:matchId/actions", action);
router.get("/debug/messages", requireDebugEnabled, getDebugMessages);
router.post("/debug/messages", requireDebugEnabled, postDebugMessage);
router.delete("/debug/messages", requireDebugEnabled, deleteDebugMessages);

export default router;
