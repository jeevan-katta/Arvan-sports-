import React, { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { MainLayout } from "@/components/layout/MainLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { OwnerLayout } from "@/components/layout/OwnerLayout";

import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Turfs from "@/pages/turfs";
import TurfDetail from "@/pages/turfs/detail";
import Bookings from "@/pages/bookings";
import BookingDetail from "@/pages/bookings/detail";
import Community from "@/pages/community";
import PostDetail from "@/pages/community/detail";
import Events from "@/pages/events";
import EventDetail from "@/pages/events/detail";
import Shop from "@/pages/shop";
import ProductDetail from "@/pages/shop/detail";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import Orders from "@/pages/orders";
import Profile from "@/pages/profile";
import MatchManager from "@/pages/profile/match";

import AdminDashboard from "@/pages/admin";
import AdminUsers from "@/pages/admin/users";
import AdminTurfs from "@/pages/admin/turfs";
import AdminEvents from "@/pages/admin/events";
import AdminShop from "@/pages/admin/shop";
import AdminOwners from "@/pages/admin/owners";
import AdminBookings from "@/pages/admin/bookings";
import AdminPayout from "@/pages/admin/payout";

import OwnerDashboard from "@/pages/owner";
import OwnerTurfs from "@/pages/owner/turfs";
import OwnerBookings from "@/pages/owner/bookings";
import OwnerRevenue from "@/pages/owner/revenue";
import OwnerPayout from "@/pages/owner/payout";
import OwnerEvents from "@/pages/owner/events";

import AdminAnnouncements from "@/pages/admin/announcements";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AdminRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) setLocation("/");
  }, [user, isLoading]);
  if (isLoading) return <div className="flex items-center justify-center h-screen bg-[#0f1117]"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!user || user.role !== "admin") return null;
  return <Component />;
}

function OwnerRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  useEffect(() => {
    if (!isLoading && (!user || (user.role !== "turf_owner" && user.role !== "admin"))) setLocation("/");
  }, [user, isLoading]);
  if (isLoading) return <div className="flex items-center justify-center h-screen"><div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>;
  if (!user || (user.role !== "turf_owner" && user.role !== "admin")) return null;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* ── Owner Routes (flat — no nested Switch inside wildcard) ── */}
      <Route path="/owner">
        <OwnerLayout><OwnerRoute component={OwnerDashboard} /></OwnerLayout>
      </Route>
      <Route path="/owner/turfs">
        <OwnerLayout><OwnerRoute component={OwnerTurfs} /></OwnerLayout>
      </Route>
      <Route path="/owner/bookings">
        <OwnerLayout><OwnerRoute component={OwnerBookings} /></OwnerLayout>
      </Route>
      <Route path="/owner/revenue">
        <OwnerLayout><OwnerRoute component={OwnerRevenue} /></OwnerLayout>
      </Route>
      <Route path="/owner/payout">
        <OwnerLayout><OwnerRoute component={OwnerPayout} /></OwnerLayout>
      </Route>
      <Route path="/owner/events">
        <OwnerLayout><OwnerRoute component={OwnerEvents} /></OwnerLayout>
      </Route>

      {/* ── Admin Routes (flat — no nested Switch inside wildcard) ── */}
      <Route path="/admin">
        <AdminLayout><AdminRoute component={AdminDashboard} /></AdminLayout>
      </Route>
      <Route path="/admin/owners">
        <AdminLayout><AdminRoute component={AdminOwners} /></AdminLayout>
      </Route>
      <Route path="/admin/users">
        <AdminLayout><AdminRoute component={AdminUsers} /></AdminLayout>
      </Route>
      <Route path="/admin/payout">
        <AdminLayout><AdminRoute component={AdminPayout} /></AdminLayout>
      </Route>
      <Route path="/admin/shop">
        <AdminLayout><AdminRoute component={AdminShop} /></AdminLayout>
      </Route>
      <Route path="/admin/turfs">
        <AdminLayout><AdminRoute component={AdminTurfs} /></AdminLayout>
      </Route>
      <Route path="/admin/events">
        <AdminLayout><AdminRoute component={AdminEvents} /></AdminLayout>
      </Route>
      <Route path="/admin/bookings">
        <AdminLayout><AdminRoute component={AdminBookings} /></AdminLayout>
      </Route>
      <Route path="/admin/announcements">
        <AdminLayout><AdminRoute component={AdminAnnouncements} /></AdminLayout>
      </Route>

      {/* ── Main App Routes ── */}
      <Route path="/">
        <MainLayout><Home /></MainLayout>
      </Route>
      <Route path="/turfs">
        <MainLayout><Turfs /></MainLayout>
      </Route>
      <Route path="/turfs/:id">
        <MainLayout><TurfDetail /></MainLayout>
      </Route>
      <Route path="/bookings">
        <MainLayout><Bookings /></MainLayout>
      </Route>
      <Route path="/booking/:id">
        <MainLayout><BookingDetail /></MainLayout>
      </Route>
      <Route path="/community">
        <MainLayout><Community /></MainLayout>
      </Route>
      <Route path="/community/:id">
        <MainLayout><PostDetail /></MainLayout>
      </Route>
      <Route path="/events">
        <MainLayout><Events /></MainLayout>
      </Route>
      <Route path="/events/:id">
        <MainLayout><EventDetail /></MainLayout>
      </Route>
      <Route path="/shop">
        <MainLayout><Shop /></MainLayout>
      </Route>
      <Route path="/shop/:id">
        <MainLayout><ProductDetail /></MainLayout>
      </Route>
      <Route path="/cart">
        <MainLayout><Cart /></MainLayout>
      </Route>
      <Route path="/checkout">
        <MainLayout><Checkout /></MainLayout>
      </Route>
      <Route path="/orders">
        <MainLayout><Orders /></MainLayout>
      </Route>
      <Route path="/profile">
        <MainLayout><Profile /></MainLayout>
      </Route>
      <Route path="/profile/match/:id">
        <MainLayout><MatchManager /></MainLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
