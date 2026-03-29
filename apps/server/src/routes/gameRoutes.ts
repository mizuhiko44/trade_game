import { Router } from "express";
import {
  action,
  deleteDebugMessages,
  getDebugMessages,
  home,
  loginBonus,
  matchDetail,
  pvpQueue,
  pvpQueueStatus,
  positions,
  postDebugMessage,
  refillDebugLifePoints,
  rankings,
  closeMarketPosition,
  startCpu
} from "../controllers/gameController";
import { requireDebugEnabled } from "../middlewares/requireDebugEnabled";

const router = Router();

router.get("/home", home);
router.post("/login-bonus", loginBonus);
router.post("/matches/cpu", startCpu);
router.post("/matches/pvp/queue", pvpQueue);
router.get("/matches/pvp/queue/:ticketId", pvpQueueStatus);
router.get("/matches/:matchId", matchDetail);
router.get("/matches/:matchId/positions", positions);
router.post("/matches/:matchId/actions", action);
router.post("/positions/:positionId/close", closeMarketPosition);
router.get("/rankings", rankings);
router.get("/debug/messages", requireDebugEnabled, getDebugMessages);
router.post("/debug/messages", requireDebugEnabled, postDebugMessage);
router.delete("/debug/messages", requireDebugEnabled, deleteDebugMessages);
router.post("/debug/users/:userId/life-points/refill", requireDebugEnabled, refillDebugLifePoints);

export default router;
