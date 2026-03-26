import cors from "cors";
import express from "express";
import { errorHandler, requestLogger } from "./middlewares/errorHandler";
import gameRoutes from "./routes/gameRoutes";

const app = express();
app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", gameRoutes);
app.use(errorHandler);

export default app;
