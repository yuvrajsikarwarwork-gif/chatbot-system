import express from "express";
import { ENV } from "../config/env";
import { processMessage } from "./processController";
import { loadContext } from "../services/contextManager";

const app = express();

app.use(express.json());

app.post("/process", processMessage);

app.get("/health", (_, res) => {
  res.send("bot-engine running");
});

app.listen(ENV.PORT, () => {
  console.log("Bot Engine running on port", ENV.PORT);
});