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

import OwnerDashboard from "@/pages/owner";
import OwnerTurfs from "@/pages/owner/turfs";
import OwnerBookings from "@/pages/owner/bookings";
import OwnerRevenue from "@/pages/owner/revenue";

import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AdminRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  if (isLoading) return <div>Loading...</div>;
  if (!user || user.role !== "admin") { setLocation("/"); return null; }
  return <Component />;
}

function OwnerRoute({ component: Component }: { component: React.ComponentType<any> }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  if (isLoading) return <div>Loading...</div>;
  if (!user || (user.role !== "turf_owner" && user.role !== "admin")) { setLocation("/"); return null; }
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Owner Routes */}
      <Route path="/owner*">
        <OwnerLayout>
          <Switch>
            <Route path="/owner" component={() => <OwnerRoute component={OwnerDashboard} />} />
            <Route path="/owner/turfs" component={() => <OwnerRoute component={OwnerTurfs} />} />
            <Route path="/owner/bookings" component={() => <OwnerRoute component={OwnerBookings} />} />
            <Route path="/owner/revenue" component={() => <OwnerRoute component={OwnerRevenue} />} />
            <Route component={NotFound} />
          </Switch>
        </OwnerLayout>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin*">
        <AdminLayout>
          <Switch>
            <Route path="/admin" component={() => <AdminRoute component={AdminDashboard} />} />
            <Route path="/admin/users" component={() => <AdminRoute component={AdminUsers} />} />
            <Route path="/admin/turfs" component={() => <AdminRoute component={AdminTurfs} />} />
            <Route path="/admin/events" component={() => <AdminRoute component={AdminEvents} />} />
            <Route path="/admin/shop" component={() => <AdminRoute component={AdminShop} />} />
            <Route component={NotFound} />
          </Switch>
        </AdminLayout>
      </Route>

      {/* Main App Routes */}
      <Route path="*">
        <MainLayout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/turfs" component={Turfs} />
            <Route path="/turfs/:id" component={TurfDetail} />
            <Route path="/booking/:id" component={BookingDetail} />
            <Route path="/bookings" component={Bookings} />
            <Route path="/community" component={Community} />
            <Route path="/community/:id" component={PostDetail} />
            <Route path="/events" component={Events} />
            <Route path="/events/:id" component={EventDetail} />
            <Route path="/shop" component={Shop} />
            <Route path="/shop/:id" component={ProductDetail} />
            <Route path="/cart" component={Cart} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/orders" component={Orders} />
            <Route path="/profile" component={Profile} />
            <Route path="/profile/match/:id" component={MatchManager} />
            <Route component={NotFound} />
          </Switch>
        </MainLayout>
      </Route>
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
