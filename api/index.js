// Función serverless de Vercel: expone la API de Express.
// El cliente estático lo sirve la CDN de Vercel (ver vercel.json).
import app from "../server/dist/app.js";

export default app;