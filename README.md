# Pacto — tu valor es fiel

Mercado de trueque y servicios donde la moneda es **fiel**: vales que nacen del propio intercambio, no del dinero que reparten los bancos. Cada transacción es un **pacto** entre partes, con contratos digitales estrictos, validación de identidad y un seguro que cubre cada movimiento.

## Idea central

> Escapar del control económico del gobierno sin caer en nada ilegal. Crear un sistema económico propio, "underground" en el buen sentido: fuera del sistema bancario, con moneda complementaria (los **fieles**) que se genera cuando dos personas cierran un pacto real. Todo legal, transparente y respaldado por contratos digitales inquebrantables.

- **Los fieles no se compran ni se venden por dinero de banco.** Nacen cuando un trueque o servicio se completa: cada parte recibe el *valor zonal* (estudio de mercado por categoría × zona) en fieles generados.
- **La comisión "el valor de un café"** (3% del valor zonal estimado) se reparte como carga entre las partes del pacto y **toda ingresa a la plataforma**, que la usa para financiar el seguro de transacción, la validación de identidad y el soporte de la comunidad.
- **Confianza**: identidad validada (DNI + biometría simulada), reseñas con rating, notificaciones y un libro de movimientos público por usuario.
- **Gamificación**: descubrimiento tipo swipe (estilo app de citas) con likes y matches mutuos.

## Stack

| Capa | Tecnología |
|------|------------|
| Cliente | React + Vite + TypeScript (PWA instalable) |
| Servidor | Express 5 + Prisma ORM |
| Base de datos | SQLite (fácil de migrar a Postgres) |

## Estructura

```
trueque-app/
├── server/
│   ├── prisma/schema.prisma    # modelo de datos completo
│   ├── prisma/seed.ts          # zonas, categorías, usuarios demo, plataforma
│   └── src/
│       ├── config/constants.ts # comisión, fee split, plataforma
│       ├── middleware/auth.ts  # JWT
│       ├── lib/prisma.ts
│       └── routes/             # auth, profile, catalog, listings,
│                               # discovery, exchanges, deliveries, reviews,
│                               # wallet, notifications, modes, bids
└── client/
    └── src/
        ├── utils/theme.ts      # identidad visual
        ├── utils/api.ts        # cliente API tipado
        ├── context/AuthContext.tsx
        ├── components/         # BottomNav, ListingModal
        └── pages/              # Login, Onboarding, Discover, Listings,
                                # Exchanges, Wallet, Profile, Modes
```

## Modelo económico

1. Una persona publica un artículo o servicio (listado) con un precio estimado en fieles (valor zonal).
2. Otra persona descubre el listado, da "me gusta" o propone un pacto.
3. Al aceptar, el pacto queda en curso. Puede ser:
   - **Trueque puro**: artículo por artículo, sin fieles.
   - **Con fieles**: pago parcial o total en la moneda de la comunidad.
   - **Con fletero**: un repartidor oferta la entrega y cobra en fieles o en trueque.
4. Al **completar** el pacto:
   - Cada parte **recibe el valor zonal en fieles generados** (es acá donde nace la moneda).
   - Se **reparte la comisión "el café"** (3%) como carga entre vendedor/comprador/fletero y el total va a la plataforma (seguro + identidad + soporte).
   - Si hubo pago en fieles, se transfieren entre las partes.
5. Tras completar, las partes se **reseñan** y el rating del perfil se recalcula.

### Modos de comercio y subastas

- **Modos**: cada pacto usa un modo de comercio. La app provee plantillas (`🅿️` Trueque directo, Feria fija, Subasta del barrio) y cada usuario puede **crear su trato a medida** (`🛠️`) con su propio público (todo el mundo / validados / zona), formas de pago aceptadas, y reglas de puja. Las plantillas solo las edita su creador (la plataforma); los modos propios los edita su dueño.
- **Subastas**: un listado en modo subasta abre la puja en una ventana de tiempo (arranque + duración). Reglas por ronda: piso, techo y paso mínimo en fieles, y cupo de participantes. Al cerrarse, el mayor pujante gana, se genera el pacto automáticamente y el pago sale de su saldo en fieles; el resto queda avisado.

## Roles

- **Vecino** (`user`): intercambia artículos, servicios y alimentos.
- **Profesional** (`professional`): ofrece servicios con zona de cobertura y kilómetros máximos de viaje.
- **Fletero** (`deliverer`): oferta entregas de los pactos y cobra en fieles o en trueque.

## Cuentas demo (`demo1234`)

| Email | Rol | Nota |
|-------|-----|------|
| marta@demo.app | Vecina | Muebles reciclados y plantas, Núñez |
| ramiro@demo.app | Profesional | Médico clínico a domicilio |
| tito@demo.app | Fletero | Repartidor en bici |
| cacho@demo.app | Vecino | Arreglos con herramientas |
| plataforma@pacto.app | Plataforma | Custodia el seguro, valida identidades |

## Correr en local

```bash
# Servidor (puerto 3002)
cd server
npm install
npx prisma db push            # crea la base
npx prisma db seed            # datos demo
npm run dev

# Cliente (puerto 5173, proxy a 3002)
cd ../client
npm install
npm run dev
```

## Roadmap

- [x] Trueque, servicios y entrega con fleteros
- [x] Moneda propia (fieles) generada por el intercambio
- [x] Comisión "el valor de un café" repartida y destinada al seguro
- [x] Descubrimiento con likes/match, reseñas, validación de identidad
- [x] **Modos configurados**: el usuario crea SU tipo de comercio (trato a medida) o usa plantillas preconfiguradas de la app (editables solo por creadores)
- [x] **Subastas**: venta en puja con horario de inicio/fin, público limitado, piso y techo por ronda
- [ ] Modalidades tipo "partida online" / "vivo" para comercializar en tiempo real
- [ ] Integración conceptual con el proyecto *merchant-quest* (inventario estilo bóveda de RPG: mesa de cambalache, inventario visual tipo Diablo/Mu)