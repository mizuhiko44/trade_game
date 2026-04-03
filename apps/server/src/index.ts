import dotenv from "dotenv";
import app from "./app";
import { checkDbConnection, summarizeDatabaseUrl } from "./utils/dbHealth";

dotenv.config();

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => {
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
