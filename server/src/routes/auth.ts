import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { config } from "../config/constants.js";

const router = Router();

export const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  role: true,
  bio: true,
  avatarUrl: true,
  verificationStatus: true,
  biometricVerified: true,
  dniVerified: true,
  zoneId: true,
  coverageZone: true,
  maxTravelKm: true,
  credits: true,
  ratingAvg: true,
  ratingCount: true,
  totalExchanges: true,
  likesCount: true,
  zone: { select: { id: true, name: true, region: true } },
} as const;

router.post("/register", async (req, res) => {
  const { email, username, password, displayName, role = "user", zoneId } = req.body;
  if (!email || !username || !password || !displayName) {
    res.status(400).json({ error: "Faltan datos obligatorios" });
    return;
  }
  const exists = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (exists) {
    res.status(409).json({ error: "El email o usuario ya está registrado" });
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password: hash,
      displayName,
      role,
      zoneId: zoneId || null,
      credits: config.welcomeCredits,
      ledger: {
        create: {
          amount: config.welcomeCredits,
          type: "welcome",
          label: "Fieles de bienvenida. La moneda nace del intercambio.",
        },
      },
    },
  });
  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: "7d" });
  res.status(201).json({ token, user: await prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect }) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Credenciales inválidas" });
    return;
  }
  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: "7d" });
  res.json({ token, user: await prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect }) });
});

// Acceso demo en un clic: entra a una cuenta de muestra sin email ni contraseña.
// Ideal para que cualquiera pueda probar la app sin crear nada.
router.post("/demo", async (req, res) => {
  const demoIds: Record<string, string> = {
    marta: "user-marta",
    ramiro: "user-ramiro",
    tito: "user-tito",
    cacho: "user-cacho",
  };
  const id = demoIds[(req.body?.as as string) || "marta"];
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    res.status(404).json({ error: "Cuenta demo no disponible. Corré la base de datos demo (seed)." });
    return;
  }
  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: "7d" });
  res.json({ token, user: await prisma.user.findUnique({ where: { id: user.id }, select: publicUserSelect }) });
});

router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: publicUserSelect });
  if (!user) {
    res.status(404).json({ error: "Usuario no encontrado" });
    return;
  }
  res.json(user);
});

export default router;
