import express from "express";
import usersRouter from "./routes/users.js";

const app = express();

app.use("/api/users", usersRouter);

app.get("/", (req, res) => {});

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});