import { createApp } from "./app.js";
const app = createApp(process.env.SESSION_SECRET || "");
const port = Number(process.env.PORT) || 3001;
if (process.env.LOCAL_MENU_PREVIEW === "1") app.listen(port, "127.0.0.1", () => console.log(`Backend listening on port ${port}`));
else app.listen(port, () => console.log(`Backend listening on port ${port}`));
if (process.env.LOCAL_MENU_PREVIEW === "1") {
  const { warmLocalToday } = await import("./db/localSnapshotStore.js");
  void warmLocalToday();
  setInterval(() => { void warmLocalToday(); }, 30 * 60_000);
}
