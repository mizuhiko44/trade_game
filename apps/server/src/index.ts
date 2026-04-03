import dotenv from "dotenv";
import app from "./app";
import { checkDbConnection, summarizeDatabaseUrl } from "./utils/dbHealth";

dotenv.config();

const port = Number(process.env.PORT ?? 4000);
const server = app.listen(port, () => {
  console.log(`server started on :${port}`);
  void (async () => {
    const summary = summarizeDatabaseUrl(process.env.DATABASE_URL);
    const checked = await checkDbConnection();
    if (checked.ok) {
      console.log("[startup] database connection ok", summary);
      return;
    }
    console.warn("[startup] database unreachable", {
      database: summary,
      message: checked.message
    });
  })();
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(`[startup] port ${port} is already in use.`);
    console.error("[startup] stop the existing process or start with another port.");
    console.error("[startup] Windows: netstat -ano | findstr :4000");
    console.error("[startup] then: taskkill /PID <PID> /F");
    console.error("[startup] or run with a different port: PORT=4001 npm run dev");
    process.exit(1);
  }
  throw err;
});
