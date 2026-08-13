import { Router } from "express";
import { prisma } from "../lib/prisma.js";

const router = Router();

router.get("/zones", async (_req, res) => {
  res.json(await prisma.zone.findMany({ orderBy: { name: "asc" } }));
});

router.get("/categories", async (_req, res) => {
  res.json(await prisma.category.findMany({ orderBy: { name: "asc" } }));
});

export default router;
