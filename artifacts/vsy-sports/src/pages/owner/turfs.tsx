import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, MapPin, IndianRupee, Edit3, CheckCircle2, Clock, Star, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Turf {
  id: number;
  name: string;
  description: string;
  pricePerHour: number;
  area: string;
  address: string;
  latitude?: number;
  longitude?: number;
  status: string;
  rating: number;
  reviewCount: number;
  amenities: string[];
  images: string[];
}

function apiFetch(path: string, token: string, method = "GET", body?: object) {
  return fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

export default function OwnerTurfs() {
  const token = localStorage.getItem("vsy_token") || "";
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<Turf>>({});

  const { data: turfs = [], isLoading } = useQuery<Turf[]>({
    queryKey: ["owner-turfs"],
    queryFn: () => apiFetch("/api/owner/turfs", token),
    enabled: !!token,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Turf> }) =>
      apiFetch(`/api/owner/turfs/${id}`, token, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-turfs"] });
      setEditingId(null);
      toast({ title: "Turf updated successfully" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update turf" }),
  });

  const startEdit = (turf: Turf) => {
    setEditingId(turf.id);
    setEditForm({ name: turf.name, description: turf.description, pricePerHour: turf.pricePerHour, area: turf.area, address: turf.address, latitude: turf.latitude, longitude: turf.longitude });
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Loading your turfs...</div>;

  return (
    <div className="p-4 space-y-4 pb-8">
      <div className="pt-2">
        <h2 className="text-xl font-display font-bold">My Turfs</h2>
        <p className="text-muted-foreground text-sm">Manage your registered turfs</p>
      </div>

      {turfs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-12 w-12 text-muted-foreground/30 mb-3" />
          <p className="font-bold text-muted-foreground">No turfs registered yet</p>
          <p className="text-sm text-muted-foreground">Contact admin to register your turf</p>
        </div>
      ) : (
        turfs.map(turf => (
          <Card key={turf.id} className="border-none shadow-sm overflow-hidden">
            {turf.images?.[0] && (
              <div className="h-36 relative">
                <img src={turf.images[0]} alt={turf.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                  <h3 className="text-white font-bold">{turf.name}</h3>
                  <Badge variant={turf.status === "approved" ? "default" : "secondary"} className="text-xs">
                    {turf.status}
                  </Badge>
                </div>
              </div>
            )}

            <div className="p-4">
              {!turf.images?.[0] && (
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-bold">{turf.name}</h3>
                  <Badge variant={turf.status === "approved" ? "default" : "secondary"} className="text-xs">
                    {turf.status}
                  </Badge>
                </div>
              )}

              {editingId === turf.id ? (
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Name</Label>
                    <Input value={editForm.name || ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-9 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Area</Label>
                    <Input value={editForm.area || ""} onChange={e => setEditForm(f => ({ ...f, area: e.target.value }))} className="h-9 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Price per Hour (₹)</Label>
                    <Input type="number" value={editForm.pricePerHour || ""} onChange={e => setEditForm(f => ({ ...f, pricePerHour: parseFloat(e.target.value) }))} className="h-9 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Address</Label>
                    <Input value={editForm.address || ""} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className="h-9 mt-1" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Latitude</Label>
                      <Input type="number" step="any" placeholder="17.3850" value={editForm.latitude ?? ""} onChange={e => setEditForm(f => ({ ...f, latitude: e.target.value ? parseFloat(e.target.value) : undefined }))} className="h-9 mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Longitude</Label>
                      <Input type="number" step="any" placeholder="78.4867" value={editForm.longitude ?? ""} onChange={e => setEditForm(f => ({ ...f, longitude: e.target.value ? parseFloat(e.target.value) : undefined }))} className="h-9 mt-1" />
                    </div>
                  </div>
                  {editForm.latitude && editForm.longitude && (
                    <a
                      href={`https://maps.google.com/?q=${editForm.latitude},${editForm.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Preview on Google Maps
                    </a>
                  )}
                  <div className="flex gap-2 mt-4">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={updateMutation.isPending}
                      onClick={() => updateMutation.mutate({ id: turf.id, data: editForm })}
                    >
                      {updateMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {turf.latitude && turf.longitude ? (
                      <a
                        href={`https://maps.google.com/?q=${turf.latitude},${turf.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-primary hover:underline"
                      >
                        {turf.area} <ExternalLink className="h-3 w-3 opacity-60" />
                      </a>
                    ) : (
                      <span>{turf.area}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold text-primary">
                    <IndianRupee className="h-3.5 w-3.5" />{turf.pricePerHour}/hr
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{turf.rating}</span>
                    <span>{turf.reviewCount} reviews</span>
                  </div>
                  <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => startEdit(turf)}>
                    <Edit3 className="h-3.5 w-3.5 mr-1" /> Edit Details
                  </Button>
                </div>
              )}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
