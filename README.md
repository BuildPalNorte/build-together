# Build Together

*"El talento existe. Solo falta conectarlo."* App en vivo de Build Pa'l Norte para el taller del Instituto Tecnológico de Matamoros. Los estudiantes escanean un QR, se registran en el celular y aparecen como nodos en una red; un motor determinista dibuja hilos entre quienes tienen habilidades complementarias e intereses en común.

## Pantallas

- `/` Inicio: la red, registro y fichas de cada persona.
- `/stage` Proyector: cifras, actividad y QR.
- `?demo=1` muestra datos de ensayo mientras el salón está vacío.

No hay panel de anfitrión ni canal en tiempo real. Los clientes se actualizan **cada 5 segundos** consultando `GET /api/events/[slug]` (en pausa si la pestaña está oculta).

## Puesta en marcha

```bash
pnpm install
cp .env.example .env.local   # DATABASE_URL: cadena POOLED de Neon
pnpm db:init                 # crea tablas y el evento (usa el host directo, sin -pooler)
pnpm dev
```

## Scripts

| Script | Qué hace |
| --- | --- |
| `pnpm db:init` | Crea tablas y el evento por defecto |
| `pnpm db:push` | `drizzle-kit push` contra el host directo |
| `pnpm test:concurrency` | 50 registros simultáneos contra `TEST_BASE_URL` (por defecto `http://localhost:3000`) en un evento temporal |
| `pnpm lint`, `pnpm build` | Calidad y compilación |

## Vaciar el salón entre sesiones

Fuera de la app, por SQL en Neon: `DELETE FROM participants WHERE event_id = (SELECT id FROM events WHERE slug = 'tec-matamoros-2026');` (las conexiones se borran en cascada).

## Diseño

La especificación visual está en [`docs/design.md`](docs/design.md). Si el código y el documento difieren, manda el código.
