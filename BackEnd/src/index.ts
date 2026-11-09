import { createApp } from "./app.js";
const app = createApp(process.env.SESSION_SECRET || "");
const port = Number(process.env.PORT) || 3001;
app.listen(port, () => console.log(`Backend listening on port ${port}`));
