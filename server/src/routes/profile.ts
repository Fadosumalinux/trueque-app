import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { publicUserSelect } from "./auth.js";

const router = Router();

// Actualizar perfil (lo que ofrezco, lo que busco, zona de cobertura, etc.)
router.put("/", authMiddleware, async (req: AuthRequest, res) => {
  const { displayName, bio, avatarUrl, zoneId, coverageZone, maxTravelKm, role, latitude, longitude } = req.body;
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      displayName: displayName ?? undefined,
      bio: bio ?? undefined,
      avatarUrl: avatarUrl ?? undefined,
      zoneId: zoneId ?? undefined,
      coverageZone: coverageZone ?? undefined,
      maxTravelKm: maxTravelKm !== undefined ? Number(maxTravelKm) : undefined,
      role: role ?? undefined,
      latitude: latitude !== undefined ? Number(latitude) : undefined,
      longitude: longitude !== undefined ? Number(longitude) : undefined,
    },
    select: publicUserSelect,
  });
  res.json(user);
});

// Validación de identidad (simulada): biometría + DNI.
// En producción se integraría un proveedor (Renaper, etc.) y verificación liveness real.
router.post("/verify-identity", authMiddleware, async (req: AuthRequest, res) => {
  const { dni } = req.body;
  if (!dni) {
    res.status(400).json({ error: "Falta el número de DNI" });
    return;
  }
  if (!/^\d{7,8}$/.test(String(dni))) {
    res.status(400).json({ error: "DNI inválido (debe tener 7 u 8 dígitos)" });
    return;
  }
  const user = await prisma.user.update({
    where: { id: req.userId },
    data: {
      dniVerified: true,
      biometricVerified: true,
      verificationStatus: "verified",
      verifiedAt: new Date(),
    },
    select: publicUserSelect,
  });
  res.json({ ok: true, message: "Identidad validada", user });
});

export default router;
