# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Auth**: JWT (jsonwebtoken) + bcryptjs

## Artifacts

### Vsy Sports (`artifacts/vsy-sports`)
- Full-stack sports turf booking mobile-style web app
- Features: turf booking, community posts, events, shop/cart, live scores, admin/owner dashboards
- Preview path: `/`
- Frontend: React + Vite + Tailwind CSS + Wouter routing
- Orange & dark navy color scheme

### API Server (`artifacts/api-server`)
- Express 5 backend for Vsy Sports
- Routes: auth, turfs, bookings, community, events, shop/cart/orders, admin, owner, live-scores
- Auth: JWT tokens via Bearer header
- WebSocket: live-scores updates

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Database Schema

Tables: users, turfs, turf_slots, bookings, community_posts, post_participants, post_messages, events, event_participants, products, cart_items, orders, order_items, reviews

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
