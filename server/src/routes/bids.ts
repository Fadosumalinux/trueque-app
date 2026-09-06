import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";

const router = Router();

// Resolver una subasta vencida: cierra la puja, marca ganador/perdedores
// y crea automáticamente el pacto entre el mejor postor y el dueño.
export async function resolveAuction(listingId: string, force = false) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { bids: { orderBy: [{ amount: "desc" }, { createdAt: "asc" }] } },
  });
  if (!listing || listing.status !== "active") return null;
  if (!force && (!listing.auctionEnd || listing.auctionEnd > new Date())) return null;

  const winner = listing.bids[0];
  const result = await prisma.$transaction(async (tx) => {
    if (winner) {
      const otherBids = listing.bids.filter((b) => b.id !== winner.id).map((b) => b.id);
      await tx.bid.updateMany({ where: { listingId, id: { in: otherBids } }, data: { status: "lost" } });
      await tx.bid.update({ where: { id: winner.id }, data: { status: "won" } });

      const pacto = await tx.exchange.create({
        data: {
          listingId: listing.id,
          fromUserId: winner.bidderId,
          toUserId: listing.userId,
          mode: "auction",
          offerTerms: `Puja ganadora (${winner.amount} fieles)${winner.article ? ` + ${winner.article}` : ""}${winner.note ? ` · ${winner.note}` : ""}`,
          estimatedValue: listing.estimatedValue,
          creditsAmount: winner.amount,
          platformFee: Math.round(listing.estimatedValue * 0.03),
          feeSplit: "{\"seller\":0.5,\"buyer\":0.5}",
          status: "accepted",
        },
      });
      return pacto;
    }
    return null;
  });

  await prisma.listing.update({ where: { id: listingId }, data: { status: "auction_closed" } });

  if (winner && result) {
    const [seller, bidder] = await Promise.all([
      prisma.user.findUnique({ where: { id: listing.userId } }),
      prisma.user.findUnique({ where: { id: winner.bidderId } }),
    ]);
    await prisma.notification.create({
      data: {
        userId: listing.userId,
        exchangeId: result.id,
        type: "auction_won",
        title: "Subasta cerrada",
        body: `Tu subasta terminó. Ganó ${bidder?.displayName} con ${winner.amount} fieles.`,
      },
    });
    await prisma.notification.create({
      data: {
        userId: winner.bidderId,
        exchangeId: result.id,
        type: "auction_winner",
        title: `Ganaste la subasta: ${listing.title}`,
        body: "El pacto quedó aceptado. Coordiná la entrega y completalo.",
      },
    });
  }

  return { closed: true, winner: winner ? { userId: winner.bidderId, amount: winner.amount, article: winner.article } : null };
}

// Pujar sobre un listado en subasta
router.post("/listings/:id/bids", authMiddleware, async (req: AuthRequest, res) => {
  const { amount, article, note } = req.body;
  const listing = await prisma.listing.findUnique({
    where: { id: req.params.id as string },
    include: { mode: true, bids: { orderBy: [{ amount: "desc" }, { createdAt: "asc" }] } },
  });
  if (!listing) {
    res.status(404).json({ error: "Listado no encontrado" });
    return;
  }
  if (listing.userId === req.userId) {
    res.status(400).json({ error: "No podes pujar sobre tu propio listado" });
    return;
  }
  if (listing.status !== "active") {
    res.status(400).json({ error: "La subasta ya está cerrada o el listado no está activo" });
    return;
  }

  const now = new Date();
  if (listing.auctionStart && now < listing.auctionStart) {
    res.status(400).json({ error: `La puja todavía no abrió. Arranca ${listing.auctionStart.toLocaleString("es-AR")}` });
    return;
  }
  if (listing.auctionEnd && now > listing.auctionEnd) {
    const outcome = await resolveAuction(listing.id);
    res.status(400).json({ error: "La subasta ya venció y se cerró", auctionClosed: true, outcome });
    return;
  }

  // Límites de público según el modo
  if (listing.audienceScope === "verified") {
    const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { verificationStatus: true } });
    if (!me || me.verificationStatus !== "verified") {
      res.status(403).json({ error: "Esta subasta es solo para identidades validadas" });
      return;
    }
  }
  if (listing.audienceScope === "zone" && listing.zoneId) {
    const me = await prisma.user.findUnique({ where: { id: req.userId }, select: { zoneId: true } });
    if (!me || me.zoneId !== listing.zoneId) {
      res.status(403).json({ error: "Esta subasta es solo para tu zona" });
      return;
    }
  }
  if (listing.maxParticipants) {
    const already = await prisma.bid.count({ where: { listingId: listing.id, status: { in: ["active", "won"] } } });
    const mine = await prisma.bid.findUnique({ where: { listingId_bidderId: { listingId: listing.id, bidderId: req.userId! } } });
    if (!mine && already >= listing.maxParticipants) {
      res.status(403).json({ error: `Se alcanzó el cupo de ${listing.maxParticipants} participantes` });
      return;
    }
  }

  const amountVal = Number(amount);
  const bid = Number(amountVal);
  const minBid = listing.minBid ?? (listing.mode?.minBid ?? listing.estimatedValue);
  const maxBid = listing.maxBid ?? listing.mode?.maxBid;
  const bidStep = listing.bidStep ?? listing.mode?.bidStep ?? 1;

  if (!bid || bid < 1) {
    res.status(400).json({ error: "La puja debe ser mayor a 0 fieles" });
    return;
  }
  if (minBid && bid < minBid) {
    res.status(400).json({ error: `La puja mínima es ${minBid} fieles` });
    return;
  }
  if (maxBid && bid > maxBid) {
    res.status(400).json({ error: `No se puede pujar por encima de ${maxBid} fieles` });
    return;
  }
  const highest = listing.bids[0];
  if (highest && highest.bidderId !== req.userId && bid <= highest.amount) {
    res.status(400).json({ error: `Ya hay una puja de ${highest.amount} fieles. Subí al menos ${highest.amount + bidStep} para ganar la punta` });
    return;
  }
  if (highest && highest.bidderId === req.userId) {
    const minRaise = Math.min(bidStep, highest.amount);
    if (bid < highest.amount + minRaise) {
      res.status(400).json({ error: "Tu nueva puja debe superar a tu propia oferta" });
      return;
    }
  }

  // Marcar las pujas anteriores (ajenas) superadas por esta
  const saved = await prisma.$transaction(async (tx) => {
    if (highest && highest.bidderId !== req.userId) {
      await tx.bid.updateMany({ where: { listingId: listing.id, status: "active", bidderId: { not: req.userId } }, data: { status: "outbid" } });
    }
    return tx.bid.upsert({
      where: { listingId_bidderId: { listingId: listing.id, bidderId: req.userId! } },
      update: { amount: bid, article: article || null, note: note || null, status: "active" },
      create: { listingId: listing.id, bidderId: req.userId!, amount: bid, article: article || null, note: note || null, status: "active" },
    });
  });

  await prisma.notification.create({
    data: {
      userId: listing.userId,
      type: "auction_bid",
      title: "Nueva puja en tu subasta",
      body: `${req.userId} pujó ${bid} fieles por ${listing.title}`,
    },
  });

  res.status(201).json(saved);
});

// Historial de pujas de un listado
router.get("/listings/:id/bids", authMiddleware, async (req: AuthRequest, res) => {
  const bids = await prisma.bid.findMany({
    where: { listingId: req.params.id as string },
    include: { bidder: { select: { id: true, displayName: true, avatarUrl: true, verificationStatus: true } } },
    orderBy: [{ amount: "desc" }, { createdAt: "asc" }],
  });
  res.json(bids);
});

// El dueño cierra la subasta manualmente (calienta fin)
router.post("/listings/:id/bids/close", authMiddleware, async (req: AuthRequest, res) => {
  const listing = await prisma.listing.findUnique({ where: { id: req.params.id as string } });
  if (!listing) {
    res.status(404).json({ error: "Listado no encontrado" });
    return;
  }
  if (listing.userId !== req.userId) {
    res.status(403).json({ error: "Solo el dueño puede cerrar la subasta" });
    return;
  }
  const outcome = await resolveAuction(listing.id, true);
  if (!outcome) {
    res.status(400).json({ error: "La subasta ya se cerró" });
    return;
  }
  res.json(outcome);
});

export default router;