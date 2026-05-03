# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: MongoDB + Mongoose (lib/db)
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Frontend**: React + Vite + Tailwind CSS + Wouter routing + TanStack Query
- **Build**: esbuild (CJS bundle for API)

## Artifacts

### Vsy Sports (`artifacts/vsy-sports`)
- Full-stack sports turf booking mobile-style web app
- Preview path: `/`
- Features:
  - Turf booking with slot selection and availability
  - Community posts with likes/comments
  - Events & Tournaments listing with Tournaments/Events/All tabs, featured banner, registration dialog
  - Tournament leaderboard/standings viewer per tournament card
  - Shop/cart/orders
  - Live scores via WebSocket
  - User notification bell (announcements, general, booking updates)

### API Server (`artifacts/api-server`)
- Express 5 backend for Vsy Sports
- Routes: auth, turfs, bookings, community, events, shop/cart/orders, admin, owner, live-scores, announcements
- Auth: JWT tokens via Bearer header
- WebSocket: live-scores updates
- User notifications: GET/PUT /api/user/notifications (any authenticated user)

## Owner Portal (`/owner`)
- Dashboard, My Turfs, Bookings, Events, Revenue, Payout
- **Events page** (`/owner/events`): Create events/tournaments/maintenance blocks, view applications, manage standings/leaderboard, make announcements
- **NotificationBell**: Shows payout, account, turf approval, and announcement notifications

## Admin Portal (`/admin`)
- Dashboard, Owners, Turfs, Users, Bookings, Events, Announcements, Payout, Shop
- **Events page** (`/admin/events`): View all events (admin + owner created), filter by type, feature/unfeature toggle, delete
- **Announcements page** (`/admin/announcements`): Full CRUD for platform-wide announcements, pin/unpin
- Feature toggle endpoints: PUT /api/admin/turfs/:id/feature, PUT /api/admin/events/:id/feature

## DB Models (lib/db)
- User, Turf, Booking, Notification, Community, Event, EventParticipant, LiveMatch, ShopItem, Order, Announcement

## Announcements System
- POST /api/announcements — creates announcement + fans out Notification to all non-blocked users
- PUT /api/announcements/:id/pin — toggles pinned state
- DELETE /api/announcements/:id — removes announcement
- GET /api/announcements — public listing (sorted by pinned, then date)
- GET /api/admin/announcements — admin full listing

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Key Notes

- Admin credentials: admin@vsysports.com / Admin@123
- Owner credentials: owner@vsysports.com / Owner@123
- Wouter v3.3.5 — NEVER nest Switch inside wildcard route; navigation uses useLocation() NOT useNavigate()
- Dark admin theme: bg-[#0d0f18] header, bg-[#111420] main, bg-[#161924] cards
- All admin routes use raw fetch() with Authorization: Bearer token header
- lucide-react exports `Image` icon — always import as `Image as ImageIcon` in turfs.tsx
- Event type field: "event" | "tournament" | "maintenance"; public GET /events excludes "maintenance"
- owner.ts imports: `import { Types } from "mongoose"` + `import { Turf, Booking, User, Notification, Event, EventParticipant } from "@workspace/db"`
