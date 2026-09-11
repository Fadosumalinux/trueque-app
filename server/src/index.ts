import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config/constants.js";
import { app } from "./app.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// En producción el cliente ya compilado vive en <repo>/client/dist
// y Express lo sirve junto a la API en un solo origen.
const clientDist = path.resolve(__dirname, "../../client/dist");

// Cliente compilado (PWA) en el mismo origen.
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, "index.html")));

app.listen(config.port, () => {
  console.log(`🔄  Pacto app running at http://localhost:${config.port}`);
});