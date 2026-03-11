import { config } from "dotenv";
// Load .env when not running on Replit (Replit uses its own secrets).
// This module must be imported first so env vars are available before db/routes etc.
if (!process.env.REPL_SLUG && !process.env.REPL_ID) {
  config();
}
