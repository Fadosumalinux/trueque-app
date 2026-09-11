import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.js";
import catalogRoutes from "./routes/catalog.js";
import profileRoutes from "./routes/profile.js";
import listingRoutes from "./routes/listings.js";
import discoveryRoutes from "./routes/discovery.js";
import exchangeRoutes from "./routes/exchanges.js";
import deliveryRoutes from "./routes/deliveries.js";
import reviewRoutes from "./routes/reviews.js";
import walletRoutes from "./routes/wallet.js";
import notificationRoutes from "./routes/notifications.js";
import modeRoutes from "./routes/modes.js";
import bidRoutes from "./routes/bids.js";

// La misma app Express corre en dos modos:
//  - Local/native (index.ts): Express además sirve client/dist + escucha.
//  - Vercel (api/index.js): se exporta como función serverless; el cliente
//    estático lo sirve la CDN de Vercel.
export const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", game: "pacto-app", version: "1.0.0" });
});

app.use("/api/auth", authRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/listings", listingRoutes);
app.use("/api/discovery", discoveryRoutes);
app.use("/api/exchanges", exchangeRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/modes", modeRoutes);
app.use("/api/bids", bidRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Server error" });
});