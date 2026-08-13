import { Router } from "express";
import { PrismaClient, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { config } from "../config/constants.js";

const router = Router();

// Comisión "el valor de un café": porcentaje del valor zonal (seguro de transacción).
export function platformFee(estimatedValue: number): number {
  return Math.round(estimatedValue * config.platformFeeRate);
}

// Determinamos quién paga créditos según el tipo de listado.
function parties(listingType: string, fromUserId: string, toUserId: string) {
  // "offer": el dueño ofrece → el interesado (from) paga al dueño (to).
  // "want":  el dueño busca → el que responde (from) entrega y el dueño (to) paga.
  const payerId = listingType === "offer" ? fromUserId : toUserId;
  const receiverId = listingType === "offer" ? toUserId : fromUserId;
  return { payerId, receiverId };
}

function feeSplit(delivererId: string | null) {
  return delivererId ? config.feeSplitWithDeliverer : config.feeSplitBase;
}

export async function settleExchange(tx: Prisma.TransactionClient, exchange: any) {
  const V = exchange.estimatedValue;
  const F = platformFee(V);
  const split = feeSplit(exchange.delivererId);
  const { payerId, receiverId } = parties(exchange.listing.type, exchange.fromUserId, exchange.toUserId);
  // Rol económico: el dueño del listado "offer" es el vendedor; en "want", el que responde.
  const sellerId = exchange.listing.type === "offer" ? exchange.toUserId : exchange.fromUserId;
  const buyerId = exchange.listing.type === "offer" ? exchange.fromUserId : exchange.toUserId;

  // 1) La moneda nace del trueque: cada parte recibe el valor zonal en créditos generados.
  const generated: { userId: string; label: string }[] = [
    { userId: sellerId, label: "Vendedor" },
    { userId: buyerId, label: "Comprador" },
  ];
  if (exchange.delivererId) {
    generated.push({ userId: exchange.delivererId, label: "Fletero" });
  }
  for (const g of generated) {
    await tx.user.update({ where: { id: g.userId }, data: { credits: { increment: V } } });
    await tx.creditLedger.create({
      data: { userId: g.userId, exchangeId: exchange.id, amount: V, type: "generated_barter", label: `Créditos generados por trueque (${g.label})` },
    });
  }

  // 2) La comisión "el valor de un café" se reparte como carga entre las partes
  //    y el total ingresa a la plataforma (seguro de transacción + identidad).
  const charges: { userId: string; roleKey: "seller" | "buyer" | "deliverer"; label: string }[] = [
    { userId: sellerId, roleKey: "seller", label: "Vendedor" },
    { userId: buyerId, roleKey: "buyer", label: "Comprador" },
  ];
  if (exchange.delivererId) {
    charges.push({ userId: exchange.delivererId, roleKey: "deliverer", label: "Fletero" });
  }
  let chargedTotal = 0;
  for (const c of charges) {
    const share = Math.round(F * (split as Record<string, number>)[c.roleKey]);
    chargedTotal += share;
    await tx.user.update({ where: { id: c.userId }, data: { credits: { decrement: share } } });
    await tx.creditLedger.create({
      data: { userId: c.userId, exchangeId: exchange.id, amount: -share, type: "commission", label: `Comisión "el café" — ${c.label}` },
    });
  }
  await tx.user.update({ where: { id: config.platformUserId }, data: { credits: { increment: chargedTotal } } });
  await tx.creditLedger.create({
    data: { userId: config.platformUserId, exchangeId: exchange.id, amount: chargedTotal, type: "commission", label: `Comisión "el café" recibida por la plataforma` },
  });

  // 3) Pago en créditos (modo credits/mixed): transferencia entre partes.
  if (exchange.creditsAmount > 0) {
    await tx.user.update({ where: { id: payerId }, data: { credits: { decrement: exchange.creditsAmount } } });
    await tx.user.update({ where: { id: receiverId }, data: { credits: { increment: exchange.creditsAmount } } });
    await tx.creditLedger.create({
      data: { userId: payerId, exchangeId: exchange.id, amount: -exchange.creditsAmount, type: "payment", label: "Pago en créditos del trueque" },
    });
    await tx.creditLedger.create({
      data: { userId: receiverId, exchangeId: exchange.id, amount: exchange.creditsAmount, type: "payment", label: "Recibido en créditos del trueque" },
    });
  }

  // 4) Logística: el fletero cobra su costo si hubo entrega.
  if (exchange.delivererId && exchange.deliveryCost > 0) {
    await tx.user.update({ where: { id: exchange.delivererId }, data: { credits: { increment: exchange.deliveryCost } } });
    await tx.creditLedger.create({
      data: { userId: exchange.delivererId, exchangeId: exchange.id, amount: exchange.deliveryCost, type: "delivery_fee", label: "Costo de entrega" },
    });
  }

  // 5) Estadísticas de confianza.
  for (const uid of [exchange.fromUserId, exchange.toUserId]) {
    await tx.user.update({ where: { id: uid }, data: { totalExchanges: { increment: 1 } } });
  }
  if (exchange.delivererId) {
    await tx.user.update({ where: { id: exchange.delivererId }, data: { totalExchanges: { increment: 1 } } });
  }
}

// Iniciar un intercambio sobre un listado
router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  const { listingId, mode = "barter", offerTerms, creditsAmount = 0 } = req.body;
  if (!listingId || !["barter", "credits", "mixed"].includes(mode)) {
    res.status(400).json({ error: "Datos inválidos (listingId, mode: barter|credits|mixed)" });
    return;
  }
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { user: { select: { id: true, credits: true } } },
  });
  if (!listing) {
    res.status(404).json({ error: "Listado no encontrado" });
    return;
  }
  if (listing.userId === req.userId) {
    res.status(400).json({ error: "No puedes intercambiar con tu propio listado" });
    return;
  }
  if (listing.status !== "active") {
    res.status(400).json({ error: "El listado ya no está activo" });
    return;
  }

  const exchange = await prisma.exchange.create({
    data: {
      listingId,
      fromUserId: req.userId!,
      toUserId: listing.userId,
      mode,
      offerTerms: offerTerms || "",
      estimatedValue: listing.estimatedValue,
      creditsAmount: Number(creditsAmount) || 0,
      platformFee: platformFee(listing.estimatedValue),
      feeSplit: JSON.stringify(feeSplit(null)),
    },
    include: { listing: { include: { category: true } }, toUser: { select: { displayName: true, username: true } } },
  });

  await prisma.notification.create({
    data: {
      userId: listing.userId,
      exchangeId: exchange.id,
      type: "exchange_offer",
      title: "Nueva propuesta de trueque",
      body: `${req.userId} quiere intercambiar: ${listing.title}`,
    },
  });

  res.status(201).json(exchange);
});

// Aceptar la propuesta (el dueño del listado o el proponente)
router.post("/:id/accept", authMiddleware, async (req: AuthRequest, res) => {
  const exchange = await prisma.exchange.findUnique({ where: { id: req.params.id as string } });
  if (!exchange) {
    res.status(404).json({ error: "Intercambio no encontrado" });
    return;
  }
  if (![exchange.fromUserId, exchange.toUserId].includes(req.userId!)) {
    res.status(403).json({ error: "No participas en este intercambio" });
    return;
  }
  if (exchange.status !== "pending") {
    res.status(400).json({ error: `El intercambio ya está ${exchange.status}` });
    return;
  }
  const updated = await prisma.exchange.update({ where: { id: exchange.id }, data: { status: "accepted" } });
  res.json(updated);
});

// Completar el intercambio → liquidación de créditos + comisión repartida
router.post("/:id/complete", authMiddleware, async (req: AuthRequest, res) => {
  const exchange = await prisma.exchange.findUnique({
    where: { id: req.params.id as string },
    include: { listing: { select: { type: true } } },
  });
  if (!exchange) {
    res.status(404).json({ error: "Intercambio no encontrado" });
    return;
  }
  if (![exchange.fromUserId, exchange.toUserId].includes(req.userId!)) {
    res.status(403).json({ error: "No participas en este intercambio" });
    return;
  }
  if (exchange.status !== "accepted") {
    res.status(400).json({ error: `El intercambio debe estar 'accepted' (está ${exchange.status})` });
    return;
  }

  // Validar créditos suficientes para el pago si corresponde
  if (exchange.creditsAmount > 0) {
    const { payerId } = parties(exchange.listing.type, exchange.fromUserId, exchange.toUserId);
    const payer = await prisma.user.findUnique({ where: { id: payerId } });
    if (!payer || payer.credits < exchange.creditsAmount + platformFee(exchange.estimatedValue)) {
      res.status(400).json({ error: "El comprador no tiene créditos suficientes para el pago y la comisión" });
      return;
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.exchange.update({ where: { id: exchange.id }, data: { status: "completed" } });
    await settleExchange(tx, exchange);
    return updated;
  });

  res.json({ ok: true, message: "Trueque completado. La moneda nace del intercambio.", exchange: result });
});

// Cancelar
router.post("/:id/cancel", authMiddleware, async (req: AuthRequest, res) => {
  const exchange = await prisma.exchange.findUnique({ where: { id: req.params.id as string } });
  if (!exchange) {
    res.status(404).json({ error: "Intercambio no encontrado" });
    return;
  }
  if (![exchange.fromUserId, exchange.toUserId].includes(req.userId!)) {
    res.status(403).json({ error: "No participas en este intercambio" });
    return;
  }
  if (exchange.status === "completed") {
    res.status(400).json({ error: "Un intercambio completado no se puede cancelar" });
    return;
  }
  const updated = await prisma.exchange.update({ where: { id: exchange.id }, data: { status: "cancelled" } });
  res.json(updated);
});

// Mis intercambios
router.get("/", authMiddleware, async (req: AuthRequest, res) => {
  const exchanges = await prisma.exchange.findMany({
    where: { OR: [{ fromUserId: req.userId }, { toUserId: req.userId }, { delivererId: req.userId }] },
    include: {
      listing: { include: { category: true } },
      fromUser: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      toUser: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      deliverer: { select: { id: true, displayName: true, username: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json(exchanges);
});

router.get("/:id", authMiddleware, async (req: AuthRequest, res) => {
  const exchange = await prisma.exchange.findUnique({
    where: { id: req.params.id as string },
    include: {
      listing: { include: { category: true } },
      fromUser: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      toUser: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      deliverer: { select: { id: true, displayName: true, username: true } },
      reviews: true,
    },
  });
  if (!exchange || ![exchange.fromUserId, exchange.toUserId, exchange.delivererId].includes(req.userId!)) {
    res.status(404).json({ error: "Intercambio no encontrado" });
    return;
  }
  res.json(exchange);
});

export default router;
