import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { resolveAuction } from "./bids.js";

const router = Router();

export function computeZonalValue(baseValue: number, multiplier: number): number {
  return Math.round(baseValue * multiplier);
}

const topBidSelect = {
  bids: { orderBy: [{ amount: "desc" }, { createdAt: "asc" }], take: 1, include: { bidder: { select: { id: true, displayName: true, verificationStatus: true } } } },
};

router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  const { categoryId, zoneId, type, q } = req.query;
  const listings = await prisma.listing.findMany({
    where: {
      status: "active",
      categoryId: (categoryId as string) || undefined,
      zoneId: (zoneId as string) || undefined,
      type: (type as string) || undefined,
      ...(q ? { OR: [{ title: { contains: q as string } }, { description: { contains: q as string } }] } : {}),
    },
    include: {
      user: { select: { id: true, displayName: true, username: true, avatarUrl: true, verificationStatus: true, ratingAvg: true, zone: { select: { name: true } } } },
      category: true,
      zone: { select: { id: true, name: true, multiplier: true } },
      mode: true,
      bids: { orderBy: [{ amount: "desc" }, { createdAt: "asc" }], take: 1, include: { bidder: { select: { id: true, displayName: true, verificationStatus: true } } } },
      _count: { select: { likes: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  await Promise.all(listings.map((l) => (l.auctionEnd && l.auctionEnd <= new Date() && l.status === "active" ? resolveAuction(l.id) : Promise.resolve(null))));
  res.json(listings.map((l) => ({ ...l, likeCount: l._count.likes })));
});

router.get("/mine", authMiddleware, async (req: AuthRequest, res) => {
  const listings = await prisma.listing.findMany({
    where: { userId: req.userId },
    include: { category: true, zone: { select: { name: true } }, mode: true, likes: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(listings.map((l) => ({ ...l, likeCount: l.likes.length })));
});

// Precio sugerido por la app: promedio real de lo publicado en esa categoría
// (+ valor zonal de referencia). No inventa "el valor real del mercado": muestra
// de dónde sale el número y con cuántas muestras.
router.get("/suggested-price", authMiddleware, async (req: AuthRequest, res) => {
  const { categoryId, zoneId } = req.query;
  if (!categoryId) {
    res.status(400).json({ error: "Falta categoryId" });
    return;
  }
  const [category, zone] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId as string } }),
    zoneId
      ? prisma.zone.findUnique({ where: { id: zoneId as string } })
      : Promise.resolve(null),
  ]);
  if (!category) {
    res.status(404).json({ error: "Categoría no encontrada" });
    return;
  }
  const zonal = computeZonalValue(category.baseValue, (zone?.multiplier ?? 1) as number);

  const sameCat = await prisma.listing.findMany({
    where: { categoryId: categoryId as string, status: "active", priceAmount: { not: null } },
    select: { priceAmount: true, zoneId: true },
  });
  const sameZone = zone ? sameCat.filter((l) => l.zoneId === zone.id) : [];

  const stats = (rows: typeof sameCat) => {
    const xs = rows.map((r) => r.priceAmount as number).sort((a, b) => a - b);
    if (!xs.length) return null;
    const avg = xs.reduce((a, b) => a + b, 0) / xs.length;
    return { avg: Math.round(avg), min: xs[0], max: xs[xs.length - 1], samples: xs.length };
  };

  const inZone = stats(sameZone);
  const inCat = stats(sameCat);
  // con 3+ muestras en la zona se usa el promedio local; si no, el de la categoría
  const base = inZone && inZone.samples >= 3 ? inZone : inCat;
  const basis = base === inZone ? "promedio-zona" : base === inCat ? "promedio-categoria" : "valor-zonal";

  res.json({
    suggested: Math.round(base ? base.avg : zonal),
    basis,
    samples: base ? base.samples : 0,
    avg: inCat?.avg ?? null,
    min: inCat?.min ?? null,
    max: inCat?.max ?? null,
    zonal: Math.round(zonal),
    category: { name: category.name, emoji: category.emoji },
  });
});

router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  await resolveAuction(req.params.id as string);
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id as string },
    include: {
      user: { select: { id: true, displayName: true, username: true, avatarUrl: true, bio: true, verificationStatus: true, ratingAvg: true, ratingCount: true, coverageZone: true, maxTravelKm: true, role: true, zone: { select: { name: true } } } },
      category: true,
      zone: { select: { id: true, name: true, multiplier: true } },
      mode: true,
      likes: true,
    },
  });
  if (!listing) {
    res.status(404).json({ error: "Listado no encontrado" });
    return;
  }
  res.json({ ...listing, likeCount: listing.likes.length });
});

router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  const { categoryId, zoneId, type = "offer", title, description, acceptTerms, currency = "both", photos, modeId, priceAmount, priceNote } = req.body;
  if (!categoryId || !zoneId || !title) {
    res.status(400).json({ error: "Faltan datos obligatorios (categoría, zona, título)" });
    return;
  }
  const [category, zone] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId } }),
    prisma.zone.findUnique({ where: { id: zoneId } }),
  ]);
  if (!category || !zone) {
    res.status(404).json({ error: "Categoría o zona no encontrada" });
    return;
  }

  // Modo de comercio: si viene modeId, se copian sus reglas al listado
  let modeRules: any = {};
  if (modeId) {
    const mode = await prisma.tradeMode.findUnique({ where: { id: modeId } });
    if (!mode || !mode.isActive) {
      res.status(404).json({ error: "Modo de comercio no encontrado" });
      return;
    }
    modeRules = {
      modeId: mode.id,
      audienceScope: req.body.audienceScope ?? mode.audienceScope,
      allowBarter: mode.allowBarter,
      allowFieles: mode.allowFieles,
      minBid: req.body.minBid != null ? Number(req.body.minBid) : mode.minBid,
      maxBid: req.body.maxBid != null ? Number(req.body.maxBid) : mode.maxBid,
      bidStep: req.body.bidStep != null ? Number(req.body.bidStep) : mode.bidStep,
      maxParticipants: req.body.maxParticipants != null ? Number(req.body.maxParticipants) : mode.maxParticipants,
    };
    if (mode.type === "auction") {
      const start = req.body.auctionStart ? new Date(req.body.auctionStart) : new Date();
      const end = req.body.auctionEnd ? new Date(req.body.auctionEnd) : new Date(start.getTime() + (mode.durationHours || 24) * 3600000);
      modeRules.auctionStart = start;
      modeRules.auctionEnd = end;
    }
  }

  const listing = await prisma.listing.create({
    data: {
      userId: req.userId!,
      categoryId,
      zoneId,
      type,
      title,
      description: description || "",
      acceptTerms: acceptTerms || "",
      currency,
      photos: photos ? JSON.stringify(photos) : "[]",
      estimatedValue: computeZonalValue(category.baseValue, zone.multiplier),
      priceAmount: priceAmount != null && priceAmount !== "" ? Number(priceAmount) : null,
      priceNote: priceNote || null,
      ...modeRules,
    },
    include: { category: true, zone: true },
  });
  res.status(201).json(listing);
});

router.put("/:id", authMiddleware, async (req: AuthRequest, res) => {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id as string } });
  if (!listing) {
    res.status(404).json({ error: "Listado no encontrado" });
    return;
  }
  if (listing.userId !== req.userId) {
    res.status(403).json({ error: "No puedes modificar este listado" });
    return;
  }
  const { title, description, acceptTerms, currency, status, photos, categoryId, zoneId, modeId, audienceScope, minBid, maxBid, bidStep, auctionStart, auctionEnd, maxParticipants, priceAmount, priceNote } = req.body;
  let estimatedValue = listing.estimatedValue;
  if (categoryId || zoneId) {
    const [category, zone] = await Promise.all([
      prisma.category.findUnique({ where: { id: categoryId || listing.categoryId } }),
      prisma.zone.findUnique({ where: { id: zoneId || listing.zoneId } }),
    ]);
    if (category && zone) estimatedValue = computeZonalValue(category.baseValue, zone.multiplier);
  }
  const updated = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      title: title ?? undefined,
      description: description ?? undefined,
      acceptTerms: acceptTerms ?? undefined,
      currency: currency ?? undefined,
      status: status ?? undefined,
      categoryId: categoryId ?? undefined,
      zoneId: zoneId ?? undefined,
      estimatedValue,
      photos: photos ? JSON.stringify(photos) : undefined,
      priceAmount: priceAmount === null ? null : priceAmount != null ? Number(priceAmount) : undefined,
      priceNote: priceNote ?? undefined,
      modeId: modeId ?? undefined,
      audienceScope: audienceScope ?? undefined,
      minBid: minBid != null ? Number(minBid) : undefined,
      maxBid: maxBid != null ? Number(maxBid) : undefined,
      bidStep: bidStep != null ? Number(bidStep) : undefined,
      auctionStart: auctionStart ? new Date(auctionStart) : undefined,
      auctionEnd: auctionEnd ? new Date(auctionEnd) : undefined,
      maxParticipants: maxParticipants != null ? Number(maxParticipants) : undefined,
    },
    include: { category: true, zone: true },
  });
  res.json(updated);
});

router.delete("/:id", authMiddleware, async (req: AuthRequest, res) => {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id as string } });
  if (!listing) {
    res.status(404).json({ error: "Listado no encontrado" });
    return;
  }
  if (listing.userId !== req.userId) {
    res.status(403).json({ error: "No puedes eliminar este listado" });
    return;
  }
  await prisma.listing.delete({ where: { id: listing.id } });
  res.json({ ok: true });
});

export default router;
