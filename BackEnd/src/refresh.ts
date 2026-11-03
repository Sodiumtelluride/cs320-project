import { refreshMenus } from "./db/refreshMenus.js";

let running = false;
async function run() {
  if (running) return;
  running = true;
  try {
    const failures = await refreshMenus();
    if (failures.length) {
      console.error(`Menu refresh: ${failures.length} failed`, failures);
      process.exitCode = 1;
    } else {
      console.log("Menu refresh completed");
      process.exitCode = 0;
    }
  } catch (error) { console.error("Menu refresh failed", error); process.exitCode = 1; }
  finally { running = false; }
}

await run();
if (process.argv.includes("--watch")) {
  const minutes = Number(process.env.MENU_REFRESH_MINUTES ?? 60);
  if (!Number.isFinite(minutes) || minutes < 5) throw new Error("MENU_REFRESH_MINUTES must be at least 5");
  setInterval(() => { void run(); }, minutes * 60_000);
}
