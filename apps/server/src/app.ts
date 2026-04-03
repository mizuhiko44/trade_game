import cors from "cors";
import express from "express";
import { errorHandler, requestLogger } from "./middlewares/errorHandler";
import gameRoutes from "./routes/gameRoutes";
import { checkDbConnection, summarizeDatabaseUrl } from "./utils/dbHealth";

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/health/db", async (_req, res) => {
  const summary = summarizeDatabaseUrl(process.env.DATABASE_URL);
  const checked = await checkDbConnection();
  if (checked.ok) {
    return res.json({ ok: true, database: summary });
  }
  return res.status(503).json({
    ok: false,
    code: "DB_UNREACHABLE",
    database: summary,
    message: checked.message,
    hint: "Start PostgreSQL (Docker Desktop or local service) and verify apps/server/.env DATABASE_URL host:port."
  });
});

app.use("/api", gameRoutes);
app.use(errorHandler);

export default app;
