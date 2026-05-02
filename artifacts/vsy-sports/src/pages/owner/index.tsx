import { useQuery } from "@tanstack/react-query";
import { Building2, CalendarDays, TrendingUp, IndianRupee, Clock, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { format, parseISO } from "date-fns";

interface RevenueStats {
  totalRevenue: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  perTurf: { turfId: number; turfName: string; totalBookings: number; confirmedBookings: number; revenue: number }[];
}

interface Booking {
  id: number;
  turfName: string;
  turfArea: string;
  userName: string;
  userEmail: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
}

function apiFetch(path: string, token?: string) {
  return fetch(path, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(r => r.json());
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const token = localStorage.getItem("vsy_token") || "";

  const { data: revenue } = useQuery<RevenueStats>({
    queryKey: ["owner-revenue"],
    queryFn: () => apiFetch("/api/owner/revenue", token),
    enabled: !!token,
  });

  const { data: bookings } = useQuery<Booking[]>({
    queryKey: ["owner-bookings"],
    queryFn: () => apiFetch("/api/owner/bookings", token),
    enabled: !!token,
  });

  const recentBookings = (bookings || []).slice(-5).reverse();

  return (
    <div className="p-4 space-y-5 pb-8">
      <div className="pt-2">
        <h2 className="text-2xl font-display font-bold">Welcome back,</h2>
        <p className="text-primary font-bold text-lg">{user?.name}</p>
        <p className="text-muted-foreground text-sm mt-1">Here's your turf performance overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
              <IndianRupee className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase">Revenue</span>
          </div>
          <p className="text-2xl font-bold">₹{revenue?.totalRevenue?.toLocaleString() || 0}</p>
          <p className="text-xs text-muted-foreground">{revenue?.confirmedBookings || 0} paid bookings</p>
        </Card>

        <Card className="p-4 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary">
              <CalendarDays className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase">Bookings</span>
          </div>
          <p className="text-2xl font-bold">{revenue?.totalBookings || 0}</p>
          <p className="text-xs text-muted-foreground">{revenue?.pendingBookings || 0} pending</p>
        </Card>

        <Card className="p-4 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 bg-green-500/10 rounded-lg flex items-center justify-center text-green-500">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase">Confirmed</span>
          </div>
          <p className="text-2xl font-bold">{revenue?.confirmedBookings || 0}</p>
          <p className="text-xs text-muted-foreground">paid & confirmed</p>
        </Card>

        <Card className="p-4 border-none shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 bg-yellow-500/10 rounded-lg flex items-center justify-center text-yellow-600">
              <Clock className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-muted-foreground uppercase">Pending</span>
          </div>
          <p className="text-2xl font-bold">{revenue?.pendingBookings || 0}</p>
          <p className="text-xs text-muted-foreground">awaiting payment</p>
        </Card>
      </div>

      {/* Per Turf Breakdown */}
      {revenue?.perTurf && revenue.perTurf.length > 0 && (
        <div>
          <h3 className="font-bold mb-3">Per Turf Performance</h3>
          <div className="space-y-2">
            {revenue.perTurf.map(t => (
              <Card key={t.turfId} className="p-4 border-none shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    <span className="font-bold text-sm">{t.turfName}</span>
                  </div>
                  <span className="font-bold text-primary">₹{t.revenue.toLocaleString()}</span>
                </div>
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>{t.totalBookings} bookings</span>
                  <span>•</span>
                  <span>{t.confirmedBookings} confirmed</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      {recentBookings.length > 0 && (
        <div>
          <h3 className="font-bold mb-3">Recent Bookings</h3>
          <div className="space-y-2">
            {recentBookings.map(b => (
              <Card key={b.id} className="p-3 border-none shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-sm">{b.userName || "User"}</p>
                    <p className="text-xs text-muted-foreground">{b.turfName} • {b.startTime}</p>
                    <p className="text-xs text-muted-foreground">{b.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm text-primary">₹{b.totalPrice}</p>
                    <Badge variant={b.paymentStatus === "paid" ? "default" : "secondary"} className="text-[10px] mt-1">
                      {b.paymentStatus === "paid" ? "Paid" : "Pending"}
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
