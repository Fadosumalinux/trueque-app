import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import { config } from "../config/constants.js";

const router = Router();

// Fleteros disponibles: usuarios verificados con rol deliverer
router.get("/deliverers", authMiddleware, async (_req, res) => {
  const deliverers = await prisma.user.findMany({
    where: { role: "deliverer", verificationStatus: "verified" },
    select: {
      id: true, displayName: true, avatarUrl: true, username: true,
      coverageZone: true, maxTravelKm: true, ratingAvg: true, ratingCount: true, totalExchanges: true,
      zone: { select: { name: true } },
    },
  });
  res.json(deliverers);
});

// El fletero ofrece su servicio para un intercambio aceptado
router.post("/:exchangeId/offer", authMiddleware, async (req: AuthRequest, res) => {
  const { costCredits = 25, costBarter, pickupNote } = req.body;
  const me = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!me || me.role !== "deliverer") {
    res.status(403).json({ error: "Solo repartidores verificados pueden ofrecer entregas" });
    return;
  }
  const exchange = await prisma.exchange.findUnique({
    where: { id: req.params.exchangeId as string },
    include: { delivery: true },
  });
  if (!exchange) {
    res.status(404).json({ error: "Intercambio no encontrado" });
    return;
  }
  if (exchange.status !== "accepted") {
    res.status(400).json({ error: "Solo se puede ofrecer entrega en intercambios aceptados" });
    return;
  }
  if (exchange.delivery) {
    res.status(400).json({ error: "Este intercambio ya tiene un fletero asignado" });
    return;
  }

  const delivery = await prisma.delivery.create({
    data: {
      exchangeId: exchange.id,
      delivererId: me.id,
      costCredits: Number(costCredits) || 0,
      costBarter: costBarter || null,
      pickupNote: pickupNote || null,
    },
  });

  // Actualizar el intercambio con el fletero y el reparto de comisión
  const split = JSON.stringify(config.feeSplitWithDeliverer);
  await prisma.exchange.update({
    where: { id: exchange.id },
    data: { delivererId: me.id, deliveryCost: Number(costCredits) || 0, deliveryMode: costBarter ? "barter" : "credits", feeSplit: split },
  });

  for (const uid of [exchange.fromUserId, exchange.toUserId]) {
    await prisma.notification.create({
      data: { userId: uid, exchangeId: exchange.id, type: "delivery_offer", title: "Un fletero quiere tu entrega", body: `${me.displayName} ofrece entregar (${costCredits} créditos${costBarter ? ` o ${costBarter}` : ""}).` },
    });
  }

  res.status(201).json(delivery);
});

// Las partes aceptan la entrega (opcional: confirmación explícita)
router.post("/:id/accept", authMiddleware, async (req: AuthRequest, res) => {
  const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id as string }, include: { exchange: true } });
  if (!delivery) {
    res.status(404).json({ error: "Entrega no encontrada" });
    return;
  }
  const exchange = delivery.exchange;
  if (![exchange.fromUserId, exchange.toUserId].includes(req.userId!)) {
    res.status(403).json({ error: "Solo las partes del intercambio aceptan la entrega" });
    return;
  }
  await prisma.delivery.update({ where: { id: delivery.id }, data: { status: "accepted" } });
  await prisma.exchange.update({ where: { id: exchange.id }, data: { status: "accepted" } });
  res.json({ ok: true });
});

// El fletero marca la entrega como realizada
router.post("/:id/deliver", authMiddleware, async (req: AuthRequest, res) => {
  const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id as string } });
  if (!delivery) {
    res.status(404).json({ error: "Entrega no encontrada" });
    return;
  }
  if (delivery.delivererId !== req.userId) {
    res.status(403).json({ error: "Solo el fletero asignado puede marcar la entrega" });
    return;
  }
  const updated = await prisma.delivery.update({
    where: { id: delivery.id },
    data: { status: "delivered", deliveredAt: new Date() },
  });
  const exchange = await prisma.exchange.findUnique({ where: { id: delivery.exchangeId } });
  if (exchange) {
    for (const uid of [exchange.fromUserId, exchange.toUserId]) {
      await prisma.notification.create({
        data: { userId: uid, exchangeId: exchange.id, type: "delivery_status", title: "Entrega realizada", body: "Tu intercambio fue entregado. Podés completarlo." },
      });
    }
  }
  res.json(updated);
});

export default router;
