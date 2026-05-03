import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Building2, MapPin, IndianRupee, Edit3, Star, ExternalLink,
  Plus, X, Trash2, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Turf {
  id: string;
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

const COMMON_AMENITIES = [
  "Floodlights", "Parking", "Changing Rooms", "Washrooms",
  "Drinking Water", "First Aid", "Equipment Rental", "Cafeteria",
  "CCTV", "Wi-Fi", "Shower", "Scoreboard",
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:  { label: "Pending Approval", color: "bg-amber-500/10 text-amber-600 border-amber-500/30",  icon: Clock },
  approved: { label: "Live",             color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  rejected: { label: "Rejected",         color: "bg-red-500/10 text-red-600 border-red-500/30",        icon: AlertCircle },
};

function apiFetch(path: string, token: string, method = "GET", body?: object) {
  return fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

const emptyForm = () => ({
  name: "", description: "", pricePerHour: "", area: "",
  address: "", latitude: "", longitude: "", amenities: [] as string[],
});

export default function OwnerTurfs() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Turf & { pricePerHour: any }>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm());
  const [amenityInput, setAmenityInput] = useState("");

  const { data: turfs = [], isLoading } = useQuery<Turf[]>({
    queryKey: ["owner-turfs"],
    queryFn: () => apiFetch("/api/owner/turfs", token || ""),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => apiFetch("/api/owner/turfs", token || "", "POST", data),
    onSuccess: (res) => {
      if (res.error) { toast({ variant: "destructive", title: res.error }); return; }
      queryClient.invalidateQueries({ queryKey: ["owner-turfs"] });
      setShowAddForm(false);
      setAddForm(emptyForm());
      toast({ title: "Turf submitted for approval", description: "Admin will review and approve your turf." });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to submit turf" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) =>
      apiFetch(`/api/owner/turfs/${id}`, token || "", "PUT", data),
    onSuccess: (res) => {
      if (res.error) { toast({ variant: "destructive", title: res.error }); return; }
      queryClient.invalidateQueries({ queryKey: ["owner-turfs"] });
      setEditingId(null);
      toast({ title: "Turf updated successfully" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to update turf" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/owner/turfs/${id}`, token || "", "DELETE"),
    onSuccess: (res) => {
      if (res.error) { toast({ variant: "destructive", title: res.error }); return; }
      queryClient.invalidateQueries({ queryKey: ["owner-turfs"] });
      toast({ title: "Turf removed" });
    },
    onError: () => toast({ variant: "destructive", title: "Failed to delete turf" }),
  });

  const toggleAmenity = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter(a => a !== item) : [...list, item]);
  };

  const startEdit = (turf: Turf) => {
    setEditingId(turf.id);
    setExpandedId(turf.id);
    setEditForm({
      name: turf.name, description: turf.description,
      pricePerHour: turf.pricePerHour, area: turf.area, address: turf.address,
      latitude: turf.latitude, longitude: turf.longitude, amenities: [...turf.amenities],
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-10">
      {/* Header */}
      <div className="pt-2 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-display font-bold">My Turfs</h2>
          <p className="text-muted-foreground text-sm">
            {turfs.length} turf{turfs.length !== 1 ? "s" : ""} registered
          </p>
        </div>
        <Button
          size="sm"
          className="flex items-center gap-1.5"
          onClick={() => { setShowAddForm(v => !v); setExpandedId(null); setEditingId(null); }}
        >
          {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showAddForm ? "Cancel" : "Add Turf"}
        </Button>
      </div>

      {/* ── Add Turf Form ── */}
      {showAddForm && (
        <Card className="border-2 border-primary/30 border-dashed p-5 space-y-4">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> New Turf Details
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Turf Name *</Label>
              <Input
                placeholder="e.g. Green Arena Turf"
                value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))}
                className="h-9 mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Description</Label>
              <Input
                placeholder="Brief description of your turf"
                value={addForm.description}
                onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Area / Locality *</Label>
              <Input
                placeholder="e.g. Madhapur"
                value={addForm.area}
                onChange={e => setAddForm(f => ({ ...f, area: e.target.value }))}
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Price / Hour (₹) *</Label>
              <Input
                type="number"
                placeholder="800"
                value={addForm.pricePerHour}
                onChange={e => setAddForm(f => ({ ...f, pricePerHour: e.target.value }))}
                className="h-9 mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Full Address</Label>
              <Input
                placeholder="Street, landmark, city"
                value={addForm.address}
                onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))}
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input
                type="number"
                step="any"
                placeholder="17.3850"
                value={addForm.latitude}
                onChange={e => setAddForm(f => ({ ...f, latitude: e.target.value }))}
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input
                type="number"
                step="any"
                placeholder="78.4867"
                value={addForm.longitude}
                onChange={e => setAddForm(f => ({ ...f, longitude: e.target.value }))}
                className="h-9 mt-1"
              />
            </div>
          </div>

          {/* Amenities */}
          <div>
            <Label className="text-xs mb-2 block">Amenities</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_AMENITIES.map(a => (
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(addForm.amenities, a, v => setAddForm(f => ({ ...f, amenities: v })))}
                  className={cn(
                    "text-xs px-2.5 py-1 rounded-full border transition-all",
                    addForm.amenities.includes(a)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {a}
                </button>
              ))}
            </div>
            {/* Custom amenity */}
            <div className="flex gap-2">
              <Input
                placeholder="Custom amenity..."
                value={amenityInput}
                onChange={e => setAmenityInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && amenityInput.trim()) {
                    setAddForm(f => ({ ...f, amenities: [...f.amenities, amenityInput.trim()] }));
                    setAmenityInput("");
                  }
                }}
                className="h-8 text-xs"
              />
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs"
                onClick={() => {
                  if (amenityInput.trim()) {
                    setAddForm(f => ({ ...f, amenities: [...f.amenities, amenityInput.trim()] }));
                    setAmenityInput("");
                  }
                }}
              >
                Add
              </Button>
            </div>
            {addForm.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {addForm.amenities.map(a => (
                  <span key={a} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {a}
                    <button onClick={() => setAddForm(f => ({ ...f, amenities: f.amenities.filter(x => x !== a) }))}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
            <strong>Note:</strong> Your turf will be submitted for admin review. It will appear as "Pending" until approved and won't be visible to customers until then.
          </div>

          <Button
            className="w-full"
            disabled={createMutation.isPending || !addForm.name || !addForm.area || !addForm.pricePerHour}
            onClick={() => {
              createMutation.mutate({
                name: addForm.name,
                description: addForm.description,
                area: addForm.area,
                address: addForm.address,
                pricePerHour: Number(addForm.pricePerHour),
                latitude: addForm.latitude ? Number(addForm.latitude) : undefined,
                longitude: addForm.longitude ? Number(addForm.longitude) : undefined,
                amenities: addForm.amenities,
              });
            }}
          >
            {createMutation.isPending ? "Submitting..." : "Submit for Approval"}
          </Button>
        </Card>
      )}

      {/* ── Turf List ── */}
      {turfs.length === 0 && !showAddForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-14 w-14 text-muted-foreground/20 mb-4" />
          <p className="font-bold text-lg">No turfs yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            Add your first turf to start accepting bookings
          </p>
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Add Your First Turf
          </Button>
        </div>
      ) : (
        turfs.map(turf => {
          const statusCfg = STATUS_CONFIG[turf.status] || STATUS_CONFIG.pending;
          const StatusIcon = statusCfg.icon;
          const isExpanded = expandedId === turf.id;
          const isEditing = editingId === turf.id;

          return (
            <Card key={turf.id} className="border-none shadow-sm overflow-hidden">
              {/* Thumbnail */}
              {turf.images?.[0] && (
                <div className="h-32 relative">
                  <img src={turf.images[0]} alt={turf.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                    <h3 className="text-white font-bold text-sm">{turf.name}</h3>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1", statusCfg.color)}>
                      <StatusIcon className="h-2.5 w-2.5" />{statusCfg.label}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4">
                {!turf.images?.[0] && (
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold">{turf.name}</h3>
                    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1", statusCfg.color)}>
                      <StatusIcon className="h-2.5 w-2.5" />{statusCfg.label}
                    </span>
                  </div>
                )}

                {/* Quick info row */}
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className="flex items-center gap-1 text-muted-foreground text-xs">
                    <MapPin className="h-3 w-3" />
                    {turf.latitude && turf.longitude ? (
                      <a
                        href={`https://maps.google.com/?q=${turf.latitude},${turf.longitude}`}
                        target="_blank" rel="noopener noreferrer"
                        className="hover:text-primary hover:underline flex items-center gap-0.5"
                      >
                        {turf.area} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : turf.area}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-primary text-xs">
                    <IndianRupee className="h-3 w-3" />{(turf.pricePerHour || 0).toLocaleString("en-IN")}/hr
                  </span>
                  {turf.status === "approved" && (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {turf.rating || 0} ({turf.reviewCount || 0})
                    </span>
                  )}
                </div>

                {/* Expand / Collapse */}
                <button
                  className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground mt-3 py-1"
                  onClick={() => setExpandedId(isExpanded ? null : turf.id)}
                >
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {isExpanded ? "Less" : "Details & Edit"}
                </button>

                {isExpanded && !isEditing && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    {turf.description && (
                      <p className="text-xs text-muted-foreground">{turf.description}</p>
                    )}
                    {turf.address && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />{turf.address}
                      </p>
                    )}
                    {turf.amenities?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {turf.amenities.map(a => (
                          <span key={a} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{a}</span>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      <Button size="sm" className="flex-1 h-8 text-xs" onClick={() => startEdit(turf)}>
                        <Edit3 className="h-3 w-3 mr-1" /> Edit
                      </Button>
                      {turf.status !== "approved" && (
                        <Button
                          size="sm" variant="destructive"
                          className="h-8 text-xs px-3"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(turf.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Edit Form */}
                {isEditing && (
                  <div className="mt-3 border-t border-border pt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Label className="text-xs">Name</Label>
                        <Input value={editForm.name || ""} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-8 mt-1 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Area</Label>
                        <Input value={editForm.area || ""} onChange={e => setEditForm(f => ({ ...f, area: e.target.value }))} className="h-8 mt-1 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">₹/Hour</Label>
                        <Input type="number" value={editForm.pricePerHour || ""} onChange={e => setEditForm(f => ({ ...f, pricePerHour: parseFloat(e.target.value) }))} className="h-8 mt-1 text-xs" />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Address</Label>
                        <Input value={editForm.address || ""} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className="h-8 mt-1 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Latitude</Label>
                        <Input type="number" step="any" placeholder="17.3850" value={editForm.latitude ?? ""} onChange={e => setEditForm(f => ({ ...f, latitude: e.target.value ? parseFloat(e.target.value) : undefined }))} className="h-8 mt-1 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Longitude</Label>
                        <Input type="number" step="any" placeholder="78.4867" value={editForm.longitude ?? ""} onChange={e => setEditForm(f => ({ ...f, longitude: e.target.value ? parseFloat(e.target.value) : undefined }))} className="h-8 mt-1 text-xs" />
                      </div>
                    </div>

                    {/* Amenities edit */}
                    <div>
                      <Label className="text-xs mb-1.5 block">Amenities</Label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {COMMON_AMENITIES.map(a => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => toggleAmenity(editForm.amenities || [], a, v => setEditForm(f => ({ ...f, amenities: v })))}
                            className={cn(
                              "text-[10px] px-2 py-0.5 rounded-full border transition-all",
                              (editForm.amenities || []).includes(a)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </div>

                    {editForm.latitude && editForm.longitude && (
                      <a href={`https://maps.google.com/?q=${editForm.latitude},${editForm.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> Preview on Maps
                      </a>
                    )}

                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 h-8 text-xs" disabled={updateMutation.isPending}
                        onClick={() => updateMutation.mutate({ id: turf.id, data: editForm })}>
                        {updateMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 h-8 text-xs" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
