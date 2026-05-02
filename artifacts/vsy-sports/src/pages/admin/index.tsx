import { useGetAdminStats, useGetRevenueStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MapPin, Calendar, ShoppingBag, TrendingUp, IndianRupee } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function AdminDashboard() {
  const { data: stats, isLoading: loadingStats } = useGetAdminStats();
  const { data: revenue, isLoading: loadingRevenue } = useGetRevenueStats({ period: 'month' });

  if (loadingStats || loadingRevenue) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  const statCards = [
    { title: "Total Users", value: stats?.totalUsers || 0, icon: Users, color: "text-blue-500" },
    { title: "Active Turfs", value: stats?.activeTurfs || 0, icon: MapPin, color: "text-green-500" },
    { title: "Total Bookings", value: stats?.totalBookings || 0, icon: Calendar, color: "text-orange-500" },
    { title: "Total Orders", value: stats?.totalOrders || 0, icon: ShoppingBag, color: "text-purple-500" },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard Overview</h2>
          <p className="text-muted-foreground">Welcome back, Admin.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1 border-none shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-bold flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-primary" /> Revenue Chart
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-4">
            <div className="h-[250px] w-full">
              {revenue?.chartData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenue.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.2} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} tickFormatter={(value) => `₹${value}`} />
                    <Tooltip />
                    <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 border-none shadow-sm">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-base font-bold flex items-center">
              <IndianRupee className="h-4 w-4 mr-2 text-primary" /> Revenue Split
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-4">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-primary/10 p-4 rounded-xl text-center border border-primary/20">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Turf Bookings</p>
                <p className="text-xl font-bold text-primary">₹{revenue?.bookingRevenue || 0}</p>
              </div>
              <div className="bg-secondary/10 p-4 rounded-xl text-center border border-secondary/20">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Shop Sales</p>
                <p className="text-xl font-bold text-secondary">₹{revenue?.shopRevenue || 0}</p>
              </div>
            </div>
            
            <div className="h-[150px] w-full">
              {revenue?.chartData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenue.chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#333" opacity={0.1} />
                    <XAxis dataKey="label" hide />
                    <Tooltip cursor={{fill: 'transparent'}} />
                    <Bar dataKey="bookings" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardHeader className="p-4 bg-muted/20 border-b border-border">
          <CardTitle className="text-base font-bold">Recent Bookings</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Turf</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {stats?.recentBookings?.map((booking) => (
                <tr key={booking.id} className="hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">#{booking.id}</td>
                  <td className="px-4 py-3">{booking.userName}</td>
                  <td className="px-4 py-3">{booking.turfName}</td>
                  <td className="px-4 py-3">{booking.date}</td>
                  <td className="px-4 py-3 font-bold">₹{booking.totalPrice}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                      booking.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {booking.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}