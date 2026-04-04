import cors from "cors";
import express from "express";
import { errorHandler, requestLogger } from "./middlewares/errorHandler";
import gameRoutes from "./routes/gameRoutes";
import { checkDbConnection, checkDbSchema, summarizeDatabaseUrl } from "./utils/dbHealth";

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/health/db", async (_req, res) => {
  const summary = summarizeDatabaseUrl(process.env.DATABASE_URL);
  const connection = await checkDbConnection();
  if (!connection.ok) {
    return res.status(503).json({
      ok: false,
      code: "DB_UNREACHABLE",
      database: summary,
      message: connection.message,
      hint: "Start PostgreSQL (Docker Desktop or local service) and verify apps/server/.env DATABASE_URL host:port."
    });
  }

  const schema = await checkDbSchema();
  if (!schema.ok) {
    return res.status(503).json({
      ok: false,
      code: "DB_SCHEMA_NOT_READY",
      database: summary,
      message: schema.message,
      hint: "Run `cd apps/server && npx prisma migrate dev --name init && npm run seed`."
    });
  }

  return res.json({ ok: true, database: summary });
});

app.use("/api", gameRoutes);
app.use(errorHandler);

export default app;
