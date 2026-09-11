// Arranque para producción (Render / Railway / etc.):
//  1. Sincroniza el schema (crea tablas si faltan).
//  2. Si la base está vacía, siembra los datos demo (idempotente).
//  3. Levanta el server Express que sirve API + cliente compilado.
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

console.log("• Sincronizando schema…");
execSync("npx prisma db push", { stdio: "inherit", env: process.env });

let zones = 0;
try {
  zones = await prisma.zone.count();
} catch {
  zones = 0;
}
await prisma.$disconnect();

if (zones === 0) {
  console.log("• Base vacía, sembrando datos demo…");
  execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: process.env });
} else {
  console.log("• Base con datos, omitiendo seed.");
}

console.log("• Levantando app…");
execSync("node dist/index.js", { stdio: "inherit", env: process.env });