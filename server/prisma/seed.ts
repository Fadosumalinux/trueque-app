import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const zones = [
  { id: "zone-nunez", name: "Núñez", region: "Buenos Aires", latitude: -34.545, longitude: -58.465, multiplier: 1.0, description: "Barrio residencial del norte porteño." },
  { id: "zone-san-nicolas", name: "San Nicolás", region: "Buenos Aires", latitude: -34.603, longitude: -58.373, multiplier: 1.2, description: "Microcentro, precios de referencia altos." },
  { id: "zone-la-boca", name: "La Boca", region: "Buenos Aires", latitude: -34.635, longitude: -58.365, multiplier: 0.85, description: "Barrio histórico y popular." },
  { id: "zone-alta-cordoba", name: "Alta Córdoba", region: "Córdoba", latitude: -31.421, longitude: -64.188, multiplier: 0.9, description: "Barrio residencial cordobés." },
  { id: "zone-centro-rosario", name: "Centro Rosario", region: "Santa Fe", latitude: -32.941, longitude: -60.645, multiplier: 0.95, description: "Centro rosarino." },
  { id: "zone-mendoza", name: "Mendoza Capital", region: "Mendoza", latitude: -32.890, longitude: -68.844, multiplier: 0.9, description: "Ciudad cuyana." },
  { id: "zone-ushuaia", name: "Ushuaia", region: "Tierra del Fuego", latitude: -54.801, longitude: -68.303, multiplier: 0.7, description: "Zona austral, costos de logística altos." },
];

const categories = [
  { id: "cat-muebles", name: "Muebles", emoji: "🪑", type: "article", baseValue: 200, slug: "muebles" },
  { id: "cat-electronica", name: "Electrónica", emoji: "📱", type: "article", baseValue: 400, slug: "electronica" },
  { id: "cat-herramientas", name: "Herramientas", emoji: "🔧", type: "article", baseValue: 150, slug: "herramientas" },
  { id: "cat-alimentos", name: "Alimentos", emoji: "🍎", type: "article", baseValue: 50, slug: "alimentos" },
  { id: "cat-ropa", name: "Ropa", emoji: "👕", type: "article", baseValue: 80, slug: "ropa" },
  { id: "cat-libros", name: "Libros", emoji: "📚", type: "article", baseValue: 60, slug: "libros" },
  { id: "cat-jardineria", name: "Jardinería", emoji: "🌱", type: "service", baseValue: 90, slug: "jardineria" },
  { id: "cat-reparaciones", name: "Reparaciones", emoji: "🛠️", type: "service", baseValue: 200, slug: "reparaciones" },
  { id: "cat-salud", name: "Salud", emoji: "🩺", type: "service", baseValue: 300, slug: "salud" },
  { id: "cat-educacion", name: "Educación", emoji: "🎓", type: "service", baseValue: 120, slug: "educacion" },
  { id: "cat-logistica", name: "Logística", emoji: "📦", type: "service", baseValue: 150, slug: "logistica" },
  { id: "cat-arte", name: "Arte", emoji: "🎨", type: "article", baseValue: 250, slug: "arte" },
];

const PLATFORM_FEE_RATE = 0.03; // "el valor de un café": 3% del valor zonal

export function zonalValue(categoryBase: number, zoneMultiplier: number): number {
  return Math.round(categoryBase * zoneMultiplier);
}

async function main() {
  console.log("Seeding database (idempotent)...");

  for (const z of zones) {
    await prisma.zone.upsert({ where: { id: z.id }, update: z, create: z });
  }
  console.log(`  ✓ ${zones.length} zones`);

  for (const c of categories) {
    await prisma.category.upsert({ where: { id: c.id }, update: c, create: c });
  }
  console.log(`  ✓ ${categories.length} categories`);

  const hash = await bcrypt.hash("demo1234", 10);

  const users = [
    {
      id: "user-marta", email: "marta@demo.app", username: "marta", password: hash,
      displayName: "Marta", role: "user", bio: "Vecina de Núñez. Me gusta reciclar muebles y las plantas.",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=marta",
      verificationStatus: "verified", biometricVerified: true, dniVerified: true,
      zoneId: "zone-nunez", credits: 120, ratingAvg: 4.8, ratingCount: 4, totalExchanges: 4, likesCount: 12,
      verifiedAt: new Date(),
    },
    {
      id: "user-ramiro", email: "ramiro@demo.app", username: "dramiro", password: hash,
      displayName: "Dr. Ramiro", role: "professional", bio: "Médico clínico. Visito a domicilio en barrios del norte porteño.",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=ramiro",
      verificationStatus: "verified", biometricVerified: true, dniVerified: true,
      zoneId: "zone-nunez", coverageZone: "Núñez, Belgrano, Colegiales, Palermo", maxTravelKm: 12,
      latitude: -34.545, longitude: -58.465, credits: 320, ratingAvg: 4.9, ratingCount: 9, totalExchanges: 9, likesCount: 25,
      verifiedAt: new Date(),
    },
    {
      id: "user-tito", email: "tito@demo.app", username: "tito", password: hash,
      displayName: "Tito", role: "deliverer", bio: "Repartidor en bici. Llego hasta donde haga falta. Acepto créditos o una buena vianda.",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=tito",
      verificationStatus: "verified", biometricVerified: true, dniVerified: true,
      zoneId: "zone-la-boca", coverageZone: "Toda CABA + Lanús", maxTravelKm: 20,
      latitude: -34.635, longitude: -58.365, credits: 210, ratingAvg: 4.7, ratingCount: 6, totalExchanges: 6, likesCount: 18,
      verifiedAt: new Date(),
    },
    {
      id: "user-cacho", email: "cacho@demo.app", username: "cacho", password: hash,
      displayName: "Cacho", role: "user", bio: "Manos para todo. Arreglo lo que sea, tengo herramientas y tiempo.",
      avatarUrl: "https://api.dicebear.com/9.x/avataaars/svg?seed=cacho",
      verificationStatus: "pending", biometricVerified: false, dniVerified: true,
      zoneId: "zone-la-boca", credits: 45, ratingAvg: 4.2, ratingCount: 2, totalExchanges: 2, likesCount: 7,
    },
  ];

  // Cuenta de la plataforma: recibe su parte de la comisión (financia el seguro
  // de transacción y la validación de identidad).
  await prisma.user.upsert({
    where: { id: "user-plataforma" },
    update: {},
    create: {
      id: "user-plataforma",
      email: "plataforma@trueque.app",
      username: "plataforma",
      password: hash,
      displayName: "La Mesa Común",
      role: "user",
      bio: "Custodia el seguro de transacción y valida identidades.",
      verificationStatus: "verified",
      biometricVerified: true,
      dniVerified: true,
      credits: 0,
    },
  });

  for (const u of users) {
    await prisma.user.upsert({ where: { id: u.id }, update: u, create: u });
  }
  console.log(`  ✓ ${users.length} demo users + plataforma`);

  const listings = [
    {
      id: "list-mesa", userId: "user-marta", categoryId: "cat-muebles", zoneId: "zone-nunez",
      type: "offer", title: "Mesa de roble maciza (4 sillas)",
      description: "Mesa familiar de 1.80m en excelente estado. Fue de mi abuela, necesita una casa nueva.",
      acceptTerms: "Acepto caja de herramientas a estrenar o 180 créditos. También escucho ofertas de arte.",
      estimatedValue: zonalValue(200, 1.0), currency: "both", photos: JSON.stringify([]), status: "active",
    },
    {
      id: "list-consulta", userId: "user-ramiro", categoryId: "cat-salud", zoneId: "zone-nunez",
      type: "offer", title: "Consulta médica a domicilio",
      description: "Atención clínica general en casa. Recetario y seguimiento. Zona de cobertura: norte de CABA.",
      acceptTerms: "Acepto pago en créditos (300) o trueque de alimentos y conservas por igual valor.",
      estimatedValue: zonalValue(300, 1.0), currency: "both", photos: JSON.stringify([]), status: "active",
    },
    {
      id: "list-reparto", userId: "user-tito", categoryId: "cat-logistica", zoneId: "zone-la-boca",
      type: "offer", title: "Reparto en bici (CABA + Lanús)",
      description: "Llevo y traigo cualquier cosa que entre en la bici. Cuidado esmerado de los paquetes.",
      acceptTerms: "Cobro 25 créditos por entrega o una vianda/café en trueque. Escribime y coordinamos.",
      estimatedValue: zonalValue(150, 0.85), currency: "both", photos: JSON.stringify([]), status: "active",
    },
    {
      id: "list-taladro", userId: "user-cacho", categoryId: "cat-herramientas", zoneId: "zone-la-boca",
      type: "offer", title: "Taladro inalámbrico + juego de mechas",
      description: "Funciona perfecto, batería nueva. Lo usé para mi laburo, está impecable.",
      acceptTerms: "Cambio por parlante bluetooth o 120 créditos.",
      estimatedValue: zonalValue(150, 0.85), currency: "both", photos: JSON.stringify([]), status: "active",
    },
    {
      id: "list-plantas", userId: "user-marta", categoryId: "cat-jardineria", zoneId: "zone-nunez",
      type: "want", title: "Busco quién plante un cantero",
      description: "Tengo las plantas y la tierra, necesito manos que me ayuden a armar el cantero del fondo.",
      acceptTerms: "Ofrezco empanadas caseras (12 unidades) o 50 créditos.",
      estimatedValue: zonalValue(90, 1.0), currency: "both", photos: JSON.stringify([]), status: "active",
    },
    {
      id: "list-libros", userId: "user-ramiro", categoryId: "cat-libros", zoneId: "zone-nunez",
      type: "offer", title: "Colección de Borges + Cortázar",
      description: "12 libros usados en buen estado. Ideal para quien quiera literatura argentina.",
      acceptTerms: "Cambio por vino artesanal o 90 créditos.",
      estimatedValue: zonalValue(60, 1.0), currency: "both", photos: JSON.stringify([]), status: "active",
    },
  ];

  for (const l of listings) {
    await prisma.listing.upsert({ where: { id: l.id }, update: l, create: l });
  }
  console.log(`  ✓ ${listings.length} listings`);

  console.log(`\nSeeding complete! Fee base: ${PLATFORM_FEE_RATE * 100}% del valor zonal (repartido).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
