import express from "express";
import usersRouter from "./routes/users.js";
import searchRouter from "./routes/search.js";
import session from "express-session";
import menuRouter from "./routes/menu.js";
import authRouter from "./routes/auth.js";

// Technically not necessary
// But here's a useful reference for status codes !!
// https://en.wikipedia.org/wiki/List_of_HTTP_status_codes

// Express JS tutorial
// https://www.youtube.com/watch?v=Be7X6QJusJA
const app = express();

// Cookie / session handling tutorail
// Setup session before routes are configured
// https://www.youtube.com/watch?v=oExWh86IgHA

// ----- Each user's request contains a userId field ------
app.use(
  session({
    name: "sessionID",
    secret: process.env.SESSION_SECRET!,
    saveUninitialized: false,
    resave: false,
    cookie: {
      // Session lasts one whole hour
      maxAge: 60000 * 60,
    }
  })
);

// All user related requests
app.use("/api/users", usersRouter);

// Auth related requests (Sign in, sign out, login, logout)
app.use("/api/auth", authRouter);

// All search related requests
app.use("/api/search", searchRouter);

// All menu related requests
app.use("/api/menu", menuRouter);

// Ensure doesn't run on same port as Front End
// Front End runs on 3000
const PORT = 3001;

// Start the server
app.listen(PORT, () => {
  console.log(`UMass Dining Common Backend is running on port ${PORT}`);

  // Automated scrape call would go here
  // Find some way to do that once in the morning or something later
});