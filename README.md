# Arvan Sports - Premium Box Cricket & Sports Management Platform

Arvan Sports is a comprehensive, professional-grade platform designed for box cricket enthusiasts, turf owners, and administrators. It streamlines the entire sports ecosystem from turf booking and live match scoring to community engagement and equipment shopping.

## 🚀 Key Features

### 🏏 Real-time Live Scoring
- **Dynamic Scoreboard**: Professional-grade live match interface with ball-by-ball updates.
- **WebSocket Integration**: Instant synchronization of scores across all connected clients.
- **Detailed Analytics**: Track individual player runs, balls faced, strike rates, and bowler metrics (wickets, economy, etc.).
- **Match History**: Persistent storage of match results and statistics.

### 📅 Advanced Turf Booking
- **Smart Scheduling**: Intuitive calendar interface for viewing and booking available slots.
- **Contiguous Selection**: Select multiple consecutive time slots in a single transaction.
- **Dynamic Pricing**: Support for different rates based on peak hours and days.
- **Automated Payouts**: Streamlined revenue distribution for turf owners.

### 👥 Community & Social
- **Social Feed**: Share updates, photos, and match results with the community.
- **Matchmaking**: Find players or teams for upcoming matches.
- **Announcements**: Stay updated with the latest news and tournaments from Arvan Sports.

### 🛍️ Integrated Shop
- **Premium Gear**: Direct access to high-quality cricket equipment and sports apparel.
- **Cart & Checkout**: Seamless shopping experience with secure payment processing.
- **Order Tracking**: Keep tabs on your equipment purchases from order to delivery.

### 🏆 Tournament Management
- **Event Creation**: Admins and owners can organize and manage local tournaments.
- **Participant Tracking**: Manage team registrations and player participation.
- **Standings**: Live leaderboards and tournament brackets.

### 🛠️ Powerful Dashboards
- **Admin Panel**: Complete control over users, turfs, shops, and platform-wide settings.
- **Owner Dashboard**: Dedicated interface for turf owners to track revenue, manage bookings, and monitor turf performance.
- **User Profile**: Personalized space for users to view their booking history, orders, and match statistics.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS 4, Framer Motion (Animations), Lucide React (Icons).
- **Backend**: Node.js, Express 5, TypeScript.
- **Database**: MongoDB Atlas with Mongoose ODM.
- **Real-time**: WebSockets (`ws`) for live scoring and updates.
- **Payments**: Razorpay Integration.
- **Notifications**: Web Push API for real-time alerts.
- **Monorepo Management**: pnpm Workspaces.

---

## 📁 Project Structure

```text
Arvan/
├── frontend/          # React + Vite application
│   ├── src/
│   │   ├── components/ # UI components (shadcn/ui based)
│   │   ├── hooks/      # Custom React hooks (auth, live-scores, etc.)
│   │   ├── pages/      # Route-level components
│   │   └── lib/        # Frontend utilities
├── backend/           # Express application
│   ├── api/           # Vercel serverless entry point
│   ├── src/
│   │   ├── routes/     # API route handlers
│   │   ├── lib/        # Backend logic (live-scores, payouts, etc.)
│   │   └── app.ts      # Express app configuration
├── lib/               # Shared Workspace Packages
│   └── db/            # Shared Database models and connection
├── scripts/           # Utility scripts (Seeding, etc.)
└── vercel.json        # Deployment configuration
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm (v8+)
- MongoDB Atlas account

### Local Setup
1. **Clone the repository**:
   ```bash
   git clone https://github.com/jeevan-katta/Arvan-sports-.git
   cd Arvan-sports-
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the `backend/` directory with the following:
   ```env
   PORT=5000
   MONGODB_URI=your_mongodb_atlas_uri
   JWT_SECRET=your_jwt_secret
   RAZORPAY_KEY_ID=your_razorpay_id
   RAZORPAY_KEY_SECRET=your_razorpay_secret
   VAPID_PUBLIC_KEY=your_vapid_public
   VAPID_PRIVATE_KEY=your_vapid_private
   VAPID_EMAIL=mailto:admin@yourdomain.com
   ```

4. **Run the development server**:
   ```bash
   pnpm run dev
   ```
   The backend will run on `http://localhost:5000` and the frontend on `http://localhost:5173`.

---

## ☁️ Deployment

### Vercel (Current Configuration)
The project is configured for Vercel deployment. However, please note:
- **WebSocket Limitations**: Vercel Serverless Functions do not support long-running WebSockets. Live scoring will revert to HTTP polling or require a dedicated WebSocket relay (e.g., Pusher) for production real-time updates.
- **State Management**: In-memory state is not persistent on Vercel. All match data is persisted to MongoDB.

For full real-time WebSocket support, deployment to **Render** or **Railway** is recommended for the backend.

---

## 📄 License
This project is licensed under the MIT License.
