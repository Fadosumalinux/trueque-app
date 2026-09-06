import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { config } from "../config/constants.js";

const router = Router();

// Listar modos: plantillas de la app (presets) + modos propios del usuario
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  const modes = await prisma.tradeMode.findMany({
    where: {
      isActive: true,
      OR: [{ isPreset: true }, { createdById: req.userId }],
    },
    include: { createdBy: { select: { id: true, displayName: true, avatarUrl: true } } },
    orderBy: [{ isPreset: "desc" }, { createdAt: "asc" }],
  });
  res.json(modes);
});

// Ver un modo
router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  const mode = await prisma.tradeMode.findUnique({
    where: { id: req.params.id as string },
    include: { createdBy: { select: { id: true, displayName: true, avatarUrl: true } } },
  });
  if (!mode) {
    res.status(404).json({ error: "Modo no encontrado" });
    return;
  }
  res.json(mode);
});

// Crear un modo propio (trato a medida). Las plantillas (preset) las crean los creadores (plataforma).
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  const {
    name,
    description,
    type = "custom",
    audienceScope = "public",
    allowBarter = true,
    allowFieles = true,
    minBid,
    maxBid,
    bidStep,
    durationHours,
    maxParticipants,
  } = req.body;

  const isPreset = req.userId === config.platformUserId && req.body.isPreset === true;

  if (!name) {
    res.status(400).json({ error: "El modo necesita un nombre" });
    return;
  }
  if (!["barter", "sale", "auction", "custom"].includes(type)) {
    res.status(400).json({ error: "Tipo de modo inválido (barter|sale|auction|custom)" });
    return;
  }

  const mode = await prisma.tradeMode.create({
    data: {
      name,
      description: description || "",
      type,
      isPreset,
      createdById: req.userId!,
      audienceScope,
      allowBarter,
      allowFieles,
      minBid: minBid != null ? Number(minBid) : null,
      maxBid: maxBid != null ? Number(maxBid) : null,
      bidStep: bidStep != null ? Number(bidStep) : null,
      durationHours: durationHours != null ? Number(durationHours) : null,
      maxParticipants: maxParticipants != null ? Number(maxParticipants) : null,
    },
  });
  res.status(201).json(mode);
});

// Editar: solo el creador del modo; los presets solo su creador (la plataforma)
router.put("/:id", authMiddleware, async (req: AuthRequest, res) => {
  const mode = await prisma.tradeMode.findUnique({ where: { id: req.params.id as string } });
  if (!mode) {
    res.status(404).json({ error: "Modo no encontrado" });
    return;
  }
  const isOwner = mode.createdById === req.userId;
  const isPlatformEditingPreset = mode.isPreset && req.userId === config.platformUserId;
  if (!isOwner && !isPlatformEditingPreset) {
    res.status(403).json({ error: "Solo el creador puede editar este modo" });
    return;
  }
  const { name, description, type, audienceScope, allowBarter, allowFieles, minBid, maxBid, bidStep, durationHours, maxParticipants, isActive } = req.body;
  const updated = await prisma.tradeMode.update({
    where: { id: mode.id },
    data: {
      name: name ?? undefined,
      description: description ?? undefined,
      type: type ?? undefined,
      audienceScope: audienceScope ?? undefined,
      allowBarter: allowBarter ?? undefined,
      allowFieles: allowFieles ?? undefined,
      minBid: minBid != null ? Number(minBid) : undefined,
      maxBid: maxBid != null ? Number(maxBid) : undefined,
      bidStep: bidStep != null ? Number(bidStep) : undefined,
      durationHours: durationHours != null ? Number(durationHours) : undefined,
      maxParticipants: maxParticipants != null ? Number(maxParticipants) : undefined,
      isActive: isActive ?? undefined,
    },
  });
  res.json(updated);
});

// Eliminar: solo el creador, y solo si no está en uso por listados activos
router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  const mode = await prisma.tradeMode.findUnique({ where: { id: req.params.id as string } });
  if (!mode) {
    res.status(404).json({ error: "Modo no encontrado" });
    return;
  }
  if (mode.createdById !== req.userId || mode.isPreset) {
    res.status(403).json({ error: "Solo el creador puede eliminar este modo (los presets no se eliminan)" });
    return;
  }
  const inUse = await prisma.listing.count({ where: { modeId: mode.id, status: "active" } });
  if (inUse > 0) {
    res.status(400).json({ error: "Hay listados activos usando este modo; pausalo en lugar de eliminarlo" });
    return;
  }
  await prisma.tradeMode.delete({ where: { id: mode.id } });
  res.json({ ok: true });
});

export default router;