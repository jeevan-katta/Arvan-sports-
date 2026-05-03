import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  Building2, MapPin, IndianRupee, Edit3, Star, ExternalLink,
  Plus, X, Trash2, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronUp, Image, Link, Sun, Moon, Upload, Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TurfPricing {
  weekdayDay: number;
  weekdayNight: number;
  weekendDay: number;
  weekendNight: number;
}

interface Turf {
  id: string;
  name: string;
  description: string;
  pricePerHour: number;
  pricing?: TurfPricing;
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
  pending:  { label: "Pending Approval", color: "bg-amber-500/10 text-amber-600 border-amber-500/30",       icon: Clock        },
  approved: { label: "Live",             color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle2 },
  rejected: { label: "Rejected",         color: "bg-red-500/10 text-red-600 border-red-500/30",             icon: AlertCircle  },
};

const PRICING_SLOTS = [
  { key: "weekdayDay",   label: "Weekday Day",   sub: "Mon – Fri · 6 AM – 6 PM", icon: Sun,  day: true  },
  { key: "weekdayNight", label: "Weekday Night",  sub: "Mon – Fri · 6 PM – 6 AM", icon: Moon, day: false },
  { key: "weekendDay",   label: "Weekend Day",   sub: "Sat – Sun · 6 AM – 6 PM", icon: Sun,  day: true  },
  { key: "weekendNight", label: "Weekend Night",  sub: "Sat – Sun · 6 PM – 6 AM", icon: Moon, day: false },
] as const;

// Compress image using Canvas API and return a base64 data URL
// Max 1200px on longest side, JPEG quality 0.82 → ~80-150 KB per image
function compressImage(file: File, maxPx = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        if (width > height) { height = Math.round((height / width) * maxPx); width = maxPx; }
        else { width = Math.round((width / height) * maxPx); height = maxPx; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Failed to load image")); };
    img.src = objectUrl;
  });
}

function apiFetch(path: string, token: string, method = "GET", body?: object) {
  return fetch(path, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  }).then(r => r.json());
}

const emptyPricing = (): Record<string, string> => ({
  weekdayDay: "", weekdayNight: "", weekendDay: "", weekendNight: "",
});

const emptyForm = () => ({
  name: "", description: "", area: "",
  address: "", latitude: "", longitude: "",
  amenities: [] as string[],
  images: [] as string[],
  pricing: emptyPricing(),
});

function ImageSection({
  images,
  onChange,
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
}) {
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed || images.includes(trimmed) || images.length >= 6) { setUrlInput(""); return; }
    onChange([...images, trimmed]);
    setUrlInput("");
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = 6 - images.length;
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    setUploadError("");
    const uploaded: string[] = [];
    for (const file of toUpload) {
      try {
        const dataUrl = await compressImage(file);
        uploaded.push(dataUrl);
      } catch {
        setUploadError("One or more images failed to process. Try a different photo.");
      }
    }
    if (uploaded.length) onChange([...images, ...uploaded]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeImage = (i: number) => onChange(images.filter((_, j) => j !== i));

  return (
    <div className="space-y-3">
      <Label className="text-xs flex items-center gap-1.5">
        <Image className="h-3.5 w-3.5 text-primary" /> Photos
        <span className="text-muted-foreground">({images.length}/6)</span>
      </Label>

      {/* Thumbnail grid — always-visible remove button */}
      {images.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {images.map((url, i) => (
            <div key={i} className="relative">
              <img
                src={url}
                alt={`photo-${i + 1}`}
                className="h-20 w-24 rounded-xl object-cover border border-border"
                referrerPolicy="no-referrer"
                onError={e => {
                  const el = e.target as HTMLImageElement;
                  el.style.display = "none";
                  el.nextElementSibling?.classList.remove("hidden");
                }}
              />
              {/* Error placeholder */}
              <div className="hidden h-20 w-24 rounded-xl bg-muted border border-border flex items-center justify-center">
                <p className="text-[10px] text-muted-foreground text-center px-1">Cannot<br/>preview</p>
              </div>
              {/* Always-visible remove button */}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-1.5 -right-1.5 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center shadow-md"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[9px] font-black bg-black/70 text-white px-1.5 py-0.5 rounded">
                  COVER
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length < 6 && (
        <div className="space-y-2">
          {/* Upload from device */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => handleFiles(e.target.files)}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 text-xs border-dashed gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="h-4 w-4" /> Upload from Device / Camera</>
            )}
          </Button>

          {/* URL paste fallback */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Or paste a direct image URL…"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addUrl(); } }}
                className="pl-8 h-9 text-xs"
              />
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 text-xs flex-shrink-0"
              onClick={addUrl}
              disabled={!urlInput.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {uploadError && (
        <p className="text-[10px] text-destructive">{uploadError}</p>
      )}

      <p className="text-[10px] text-muted-foreground">
        Photos are compressed automatically in your browser and saved securely — no external service needed.
        Max 6 photos · paste a direct URL as an alternative.
      </p>
    </div>
  );
}

function PricingSection({
  pricing,
  onChange,
}: {
  pricing: Record<string, string>;
  onChange: (p: Record<string, string>) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs flex items-center gap-1.5">
        <IndianRupee className="h-3.5 w-3.5 text-primary" /> Slot Pricing (₹/hour)
      </Label>
      <div className="grid grid-cols-2 gap-2">
        {PRICING_SLOTS.map(slot => (
          <div
            key={slot.key}
            className={cn(
              "rounded-xl border p-2.5 space-y-1",
              slot.day
                ? "bg-amber-500/5 border-amber-500/20"
                : "bg-blue-500/5 border-blue-500/20"
            )}
          >
            <div className="flex items-center gap-1.5">
              <slot.icon className={cn("h-3.5 w-3.5 flex-shrink-0", slot.day ? "text-amber-500" : "text-blue-400")} />
              <div>
                <p className="text-[11px] font-bold leading-tight">{slot.label}</p>
                <p className="text-[9px] text-muted-foreground leading-tight">{slot.sub}</p>
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">₹</span>
              <Input
                type="number"
                placeholder="0"
                value={pricing[slot.key]}
                onChange={e => onChange({ ...pricing, [slot.key]: e.target.value })}
                className="pl-5 h-7 text-xs"
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Leave blank to use the same rate for all slots.
      </p>
    </div>
  );
}

export default function OwnerTurfs() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm());
  const [amenityInput, setAmenityInput] = useState("");

  const { data: turfs = [], isLoading } = useQuery<Turf[]>({
    queryKey: ["owner-turfs"],
    queryFn: () => apiFetch("/api/owner/turfs", token || ""),
    enabled: !!token,
  });

  const buildPayload = (form: ReturnType<typeof emptyForm>) => {
    const pricing: Record<string, number> = {};
    let anyPricing = false;
    for (const slot of PRICING_SLOTS) {
      const val = Number(form.pricing[slot.key]);
      if (val > 0) { pricing[slot.key] = val; anyPricing = true; }
      else pricing[slot.key] = 0;
    }
    // pricePerHour = minimum non-zero slot price (or weekdayDay)
    const nonZero = Object.values(pricing).filter(v => v > 0);
    const pricePerHour = nonZero.length ? Math.min(...nonZero) : 0;
    return {
      name: form.name, description: form.description,
      area: form.area, address: form.address,
      latitude: form.latitude ? Number(form.latitude) : undefined,
      longitude: form.longitude ? Number(form.longitude) : undefined,
      amenities: form.amenities,
      images: form.images,
      pricePerHour,
      pricing: anyPricing ? pricing : undefined,
    };
  };

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

  const toggleAmenity = (list: string[], item: string, setter: (v: string[]) => void) =>
    setter(list.includes(item) ? list.filter(a => a !== item) : [...list, item]);

  const startEdit = (turf: Turf) => {
    setEditingId(turf.id);
    setExpandedId(turf.id);
    const p = turf.pricing;
    setEditForm({
      name: turf.name, description: turf.description,
      area: turf.area, address: turf.address,
      latitude: turf.latitude, longitude: turf.longitude,
      amenities: [...turf.amenities],
      images: [...(turf.images || [])],
      pricing: {
        weekdayDay:   String(p?.weekdayDay   || ""),
        weekdayNight: String(p?.weekdayNight || ""),
        weekendDay:   String(p?.weekendDay   || ""),
        weekendNight: String(p?.weekendNight || ""),
      },
    });
  };

  const buildEditPayload = () => {
    const pricing: Record<string, number> = {};
    let anyPricing = false;
    for (const slot of PRICING_SLOTS) {
      const val = Number(editForm.pricing?.[slot.key] || 0);
      if (val > 0) anyPricing = true;
      pricing[slot.key] = val;
    }
    const nonZero = Object.values(pricing).filter(v => v > 0);
    const pricePerHour = nonZero.length ? Math.min(...nonZero) : (editForm.pricePerHour || 0);
    return {
      name: editForm.name, description: editForm.description,
      area: editForm.area, address: editForm.address,
      latitude: editForm.latitude, longitude: editForm.longitude,
      amenities: editForm.amenities,
      images: editForm.images,
      pricePerHour,
      pricing: anyPricing ? pricing : undefined,
    };
  };

  const fmtINR = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

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
        <Card className="border-2 border-primary/30 border-dashed p-5 space-y-5">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> New Turf Details
          </h3>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Turf Name *</Label>
              <Input placeholder="e.g. Green Arena Turf" value={addForm.name}
                onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className="h-9 mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Description</Label>
              <Input placeholder="Brief description of your turf" value={addForm.description}
                onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Area / Locality *</Label>
              <Input placeholder="e.g. Madhapur" value={addForm.area}
                onChange={e => setAddForm(f => ({ ...f, area: e.target.value }))} className="h-9 mt-1" />
            </div>
            <div className="col-span-2">
              <Label className="text-xs">Full Address</Label>
              <Input placeholder="Street, landmark, city" value={addForm.address}
                onChange={e => setAddForm(f => ({ ...f, address: e.target.value }))} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Latitude</Label>
              <Input type="number" step="any" placeholder="17.3850" value={addForm.latitude}
                onChange={e => setAddForm(f => ({ ...f, latitude: e.target.value }))} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Longitude</Label>
              <Input type="number" step="any" placeholder="78.4867" value={addForm.longitude}
                onChange={e => setAddForm(f => ({ ...f, longitude: e.target.value }))} className="h-9 mt-1" />
            </div>
          </div>

          {/* 4-tier pricing */}
          <PricingSection
            pricing={addForm.pricing}
            onChange={pricing => setAddForm(f => ({ ...f, pricing }))}
          />

          {/* Image URLs */}
          <ImageSection
            images={addForm.images}
            onChange={images => setAddForm(f => ({ ...f, images }))}
          />

          {/* Amenities */}
          <div>
            <Label className="text-xs mb-2 block">Amenities</Label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {COMMON_AMENITIES.map(a => (
                <button key={a} type="button"
                  onClick={() => toggleAmenity(addForm.amenities, a, v => setAddForm(f => ({ ...f, amenities: v })))}
                  className={cn("text-xs px-2.5 py-1 rounded-full border transition-all",
                    addForm.amenities.includes(a)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted text-muted-foreground border-border"
                  )}
                >{a}</button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input placeholder="Custom amenity..." value={amenityInput}
                onChange={e => setAmenityInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && amenityInput.trim()) { setAddForm(f => ({ ...f, amenities: [...f.amenities, amenityInput.trim()] })); setAmenityInput(""); } }}
                className="h-8 text-xs" />
              <Button size="sm" variant="outline" className="h-8 text-xs"
                onClick={() => { if (amenityInput.trim()) { setAddForm(f => ({ ...f, amenities: [...f.amenities, amenityInput.trim()] })); setAmenityInput(""); } }}>Add</Button>
            </div>
            {addForm.amenities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {addForm.amenities.map(a => (
                  <span key={a} className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {a}
                    <button onClick={() => setAddForm(f => ({ ...f, amenities: f.amenities.filter(x => x !== a) }))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
            <strong>Note:</strong> Your turf will be submitted for admin review. It will appear as "Pending" until approved.
          </div>

          <Button className="w-full"
            disabled={createMutation.isPending || !addForm.name || !addForm.area}
            onClick={() => createMutation.mutate(buildPayload(addForm))}>
            {createMutation.isPending ? "Submitting..." : "Submit for Approval"}
          </Button>
        </Card>
      )}

      {/* ── Turf List ── */}
      {turfs.length === 0 && !showAddForm ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-14 w-14 text-muted-foreground/20 mb-4" />
          <p className="font-bold text-lg">No turfs yet</p>
          <p className="text-sm text-muted-foreground mt-1 mb-5">Add your first turf to start accepting bookings</p>
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
          const p = turf.pricing;
          const hasPricing = p && (p.weekdayDay || p.weekdayNight || p.weekendDay || p.weekendNight);

          return (
            <Card key={turf.id} className="border-none shadow-sm overflow-hidden">
              {/* Cover photo */}
              {turf.images?.[0] && (
                <div className="h-36 relative">
                  <img src={turf.images[0]} alt={turf.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex justify-between items-end">
                    <div>
                      <h3 className="text-white font-bold text-sm leading-tight">{turf.name}</h3>
                      {turf.images.length > 1 && (
                        <p className="text-white/60 text-[10px]">{turf.images.length} photos</p>
                      )}
                    </div>
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

                {/* Quick info */}
                <div className="flex items-center gap-3 flex-wrap text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {turf.latitude && turf.longitude ? (
                      <a href={`https://maps.google.com/?q=${turf.latitude},${turf.longitude}`} target="_blank" rel="noopener noreferrer" className="hover:text-primary hover:underline flex items-center gap-0.5">
                        {turf.area} <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    ) : turf.area}
                  </span>
                  {turf.status === "approved" && turf.reviewCount > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      {turf.rating || 0} ({turf.reviewCount || 0})
                    </span>
                  )}
                </div>

                {/* Pricing summary */}
                {hasPricing ? (
                  <div className="grid grid-cols-2 gap-1.5 mt-3">
                    {PRICING_SLOTS.map(slot => {
                      const val = p?.[slot.key] || 0;
                      return val > 0 ? (
                        <div key={slot.key} className={cn("rounded-lg px-2 py-1.5 flex items-center gap-1.5", slot.day ? "bg-amber-500/8" : "bg-blue-500/8")}>
                          <slot.icon className={cn("h-3 w-3 flex-shrink-0", slot.day ? "text-amber-500" : "text-blue-400")} />
                          <div>
                            <p className="text-[9px] text-muted-foreground leading-tight">{slot.label}</p>
                            <p className="text-xs font-bold text-primary leading-tight">{fmtINR(val)}/hr</p>
                          </div>
                        </div>
                      ) : null;
                    })}
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-2 font-bold text-primary text-xs">
                    <IndianRupee className="h-3 w-3" />{fmtINR(turf.pricePerHour)}/hr
                  </div>
                )}

                {/* Expand toggle */}
                <button className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground mt-3 py-1"
                  onClick={() => setExpandedId(isExpanded ? null : turf.id)}>
                  {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  {isExpanded ? "Less" : "Details & Edit"}
                </button>

                {/* Expanded: view mode */}
                {isExpanded && !isEditing && (
                  <div className="mt-3 space-y-3 border-t border-border pt-3">
                    {turf.description && <p className="text-xs text-muted-foreground">{turf.description}</p>}
                    {turf.address && (
                      <p className="text-xs text-muted-foreground flex items-start gap-1">
                        <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />{turf.address}
                      </p>
                    )}
                    {/* Photo strip */}
                    {turf.images?.length > 1 && (
                      <div className="flex gap-2 overflow-x-auto pb-1">
                        {turf.images.slice(1).map((img, i) => (
                          <img key={i} src={img} alt="" className="h-16 w-20 rounded-xl object-cover flex-shrink-0" />
                        ))}
                      </div>
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
                        <Button size="sm" variant="destructive" className="h-8 text-xs px-3"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(turf.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Edit form */}
                {isEditing && (
                  <div className="mt-3 border-t border-border pt-3 space-y-4">
                    {/* Basic fields */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="col-span-2">
                        <Label className="text-xs">Name</Label>
                        <Input value={editForm.name || ""} onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} className="h-8 mt-1 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Area</Label>
                        <Input value={editForm.area || ""} onChange={e => setEditForm((f: any) => ({ ...f, area: e.target.value }))} className="h-8 mt-1 text-xs" />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs">Address</Label>
                        <Input value={editForm.address || ""} onChange={e => setEditForm((f: any) => ({ ...f, address: e.target.value }))} className="h-8 mt-1 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Latitude</Label>
                        <Input type="number" step="any" value={editForm.latitude ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, latitude: e.target.value ? parseFloat(e.target.value) : undefined }))} className="h-8 mt-1 text-xs" />
                      </div>
                      <div>
                        <Label className="text-xs">Longitude</Label>
                        <Input type="number" step="any" value={editForm.longitude ?? ""} onChange={e => setEditForm((f: any) => ({ ...f, longitude: e.target.value ? parseFloat(e.target.value) : undefined }))} className="h-8 mt-1 text-xs" />
                      </div>
                    </div>

                    {/* Pricing */}
                    <PricingSection
                      pricing={editForm.pricing || emptyPricing()}
                      onChange={pricing => setEditForm((f: any) => ({ ...f, pricing }))}
                    />

                    {/* Images */}
                    <ImageSection
                      images={editForm.images || []}
                      onChange={images => setEditForm((f: any) => ({ ...f, images }))}
                    />

                    {/* Amenities */}
                    <div>
                      <Label className="text-xs mb-1.5 block">Amenities</Label>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {COMMON_AMENITIES.map(a => (
                          <button key={a} type="button"
                            onClick={() => toggleAmenity(editForm.amenities || [], a, v => setEditForm((f: any) => ({ ...f, amenities: v })))}
                            className={cn("text-[10px] px-2 py-0.5 rounded-full border transition-all",
                              (editForm.amenities || []).includes(a)
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-muted text-muted-foreground border-border"
                            )}
                          >{a}</button>
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
                        onClick={() => updateMutation.mutate({ id: turf.id, data: buildEditPayload() })}>
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
