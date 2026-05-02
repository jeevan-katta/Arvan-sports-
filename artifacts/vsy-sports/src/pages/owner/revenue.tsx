import { useQuery } from "@tanstack/react-query";
import { TrendingUp, IndianRupee, CheckCircle2, Clock, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface RevenueStats {
  totalRevenue: number;
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  perTurf: { turfId: number; turfName: string; totalBookings: number; confirmedBookings: number; revenue: number }[];
}

const COLORS = ["#FF6B35", "#1B3A5C", "#FF9A6C", "#2D5F8A", "#FFB899"];

export default function OwnerRevenue() {
  const token = localStorage.getItem("vsy_token") || "";

  const { data: revenue, isLoading } = useQuery<RevenueStats>({
    queryKey: ["owner-revenue"],
    queryFn: () =>
      fetch("/api/owner/revenue", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Loading revenue data...</div>;

  const chartData = (revenue?.perTurf || []).map(t => ({
    name: t.turfName.length > 12 ? t.turfName.slice(0, 12) + "…" : t.turfName,
    revenue: t.revenue,
    bookings: t.totalBookings,
  }));

  return (
    <div className="p-4 space-y-5 pb-8">
      <div className="pt-2">
        <h2 className="text-xl font-display font-bold">Revenue Overview</h2>
        <p className="text-muted-foreground text-sm">Track your earnings across all turfs</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 border-none shadow-sm bg-primary text-primary-foreground">
          <IndianRupee className="h-5 w-5 mb-2 opacity-80" />
          <p className="text-2xl font-bold">₹{revenue?.totalRevenue?.toLocaleString() || 0}</p>
          <p className="text-xs opacity-80 mt-1">Total Revenue</p>
        </Card>

        <Card className="p-4 border-none shadow-sm">
          <TrendingUp className="h-5 w-5 mb-2 text-primary" />
          <p className="text-2xl font-bold">{revenue?.totalBookings || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Bookings</p>
        </Card>

        <Card className="p-4 border-none shadow-sm">
          <CheckCircle2 className="h-5 w-5 mb-2 text-green-500" />
          <p className="text-2xl font-bold">{revenue?.confirmedBookings || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Confirmed</p>
        </Card>

        <Card className="p-4 border-none shadow-sm">
          <Clock className="h-5 w-5 mb-2 text-yellow-600" />
          <p className="text-2xl font-bold">{revenue?.pendingBookings || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Pending</p>
        </Card>
      </div>

      {/* Bar Chart */}
      {chartData.length > 0 && (
        <Card className="p-4 border-none shadow-sm">
          <h3 className="font-bold mb-4">Revenue by Turf</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip
                formatter={(v: number) => [`₹${v}`, "Revenue"]}
                contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              />
              <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                {chartData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Per Turf Table */}
      {revenue?.perTurf && revenue.perTurf.length > 0 && (
        <div>
          <h3 className="font-bold mb-3">Turf Breakdown</h3>
          <div className="space-y-2">
            {revenue.perTurf.map((t, i) => (
              <Card key={t.turfId} className="p-4 border-none shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center"
                      style={{ background: COLORS[i % COLORS.length] + "20", color: COLORS[i % COLORS.length] }}
                    >
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">{t.turfName}</p>
                      <p className="text-xs text-muted-foreground">{t.confirmedBookings}/{t.totalBookings} confirmed</p>
                    </div>
                  </div>
                  <p className="font-bold text-primary">₹{t.revenue.toLocaleString()}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
