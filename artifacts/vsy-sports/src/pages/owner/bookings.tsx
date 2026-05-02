import { useQuery } from "@tanstack/react-query";
import { CalendarDays, User, Clock, IndianRupee } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO } from "date-fns";

interface Booking {
  id: number;
  turfName: string;
  turfArea: string;
  userName: string;
  userEmail: string;
  userPhone: string;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  status: string;
  paymentStatus: string;
}

export default function OwnerBookings() {
  const token = localStorage.getItem("vsy_token") || "";

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["owner-bookings"],
    queryFn: () =>
      fetch("/api/owner/bookings", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  const sorted = [...bookings].sort((a, b) => b.id - a.id);

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Loading bookings...</div>;

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="pt-2">
        <h2 className="text-xl font-display font-bold">All Bookings</h2>
        <p className="text-muted-foreground text-sm">{bookings.length} total bookings for your turfs</p>
      </div>

      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CalendarDays className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-bold text-muted-foreground">No bookings yet</p>
        </div>
      ) : (
        sorted.map(b => (
          <Card key={b.id} className="p-4 border-none shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-sm">{b.turfName}</p>
                <p className="text-xs text-muted-foreground">{b.turfArea}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={b.status === "confirmed" ? "default" : b.status === "cancelled" ? "destructive" : "secondary"} className="text-[10px]">
                  {b.status}
                </Badge>
                <Badge variant={b.paymentStatus === "paid" ? "default" : "outline"} className="text-[10px]">
                  {b.paymentStatus === "paid" ? "Paid" : "Unpaid"}
                </Badge>
              </div>
            </div>

            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3.5 w-3.5" />
                <span>{b.userName || "—"}</span>
                {b.userPhone && <span className="text-xs">• {b.userPhone}</span>}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{b.date ? format(parseISO(b.date), "MMM dd, yyyy") : "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>{b.startTime} – {b.endTime}</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-primary">
                <IndianRupee className="h-3.5 w-3.5" />
                <span>₹{b.totalPrice}</span>
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
