import express from "express";
import usersRouter from "./routes/users.js";
import searchRouter from "./routes/search.js";
import menuRouter from "./routes/menus.js";
import foodRouter from "./routes/foods.js"
import session from "express-session";
import cors from "cors";


// https://www.youtube.com/watch?v=Be7X6QJusJA
const app = express();


app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

app.use(express.json());
// Setup session before routes are configured
// https://www.youtube.com/watch?v=oExWh86IgHA
app.use(
  session({
    secret: "temporary secret, very secure",
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

// All search related requests
app.use("/api/search", searchRouter);

app.use("/api/menus", menuRouter);

app.use("/api/foods", foodRouter);

// Example request
//app.get("/", (req, res) => {});

// Ensure doesn't run on same port as Front End
// Front End runs on 3000
const PORT = 3001;

// Start the server
app.listen(PORT, () => {
  console.log(`UMass Dining Common Backend is running on port ${PORT}`);

  // Automated scrape call would go here
  // Find some way to do that once in the morning or something later
});