import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import routes from "./routes"; 
import botRoutes from "./routes/botRoutes"; 
import webhookRoutes from "./routes/webhookRoutes"; // Uses the controller
import flowRoutes from "./routes/flowRoutes"; 
import leadRoutes from "./routes/leadRoutes"; 
import uploadRoutes from "./routes/uploadRoutes"; 
import templateRoutes from "./routes/templateRoutes";
import { errorMiddleware } from "./middleware/errorMiddleware";

dotenv.config();
export const app = express();

app.set("trust proxy", 1);

app.use(cors({
  origin: ["http://localhost:3000", "*.trycloudflare.com"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ✅ Routes are clean
app.use("/api/templates", templateRoutes);
app.use("/api/bots", botRoutes); 
app.use("/api/flows", flowRoutes);
app.use("/api/webhook", webhookRoutes); // Logic is now in controller -> engine
app.use("/api/leads", leadRoutes); 
app.use("/api/upload", uploadRoutes); 
app.use("/api", routes); 

app.use(errorMiddleware);