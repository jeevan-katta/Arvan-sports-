import { useState, useRef } from "react";
import { Upload, X, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  className?: string;
  label?: string;
  token?: string;
}

export function ImageUpload({ value, onChange, className, label = "Upload Image", token }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/upload/image", { method: "POST", headers, body: form });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-white/10 group">
          <img src={value} alt="Uploaded" className="w-full h-40 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
            >
              Change
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              className="bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
            >
              <X className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "w-full h-36 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
            "border-white/10 hover:border-primary/50 hover:bg-primary/5 text-white/30 hover:text-primary",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-7 w-7 animate-spin" />
              <span className="text-xs font-bold">Uploading…</span>
            </>
          ) : (
            <>
              <div className="h-10 w-10 rounded-xl bg-white/5 flex items-center justify-center">
                <ImageIcon className="h-5 w-5" />
              </div>
              <span className="text-xs font-bold">{label}</span>
              <span className="text-[10px] opacity-60">PNG, JPG up to 10MB</span>
            </>
          )}
        </button>
      )}
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// Light-theme variant for owner portal
export function ImageUploadLight({ value, onChange, className, label = "Upload Photo", token }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/upload/image", { method: "POST", headers, body: form });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      onChange(data.url);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
      />
      {value ? (
        <div className="relative rounded-xl overflow-hidden border border-border group">
          <img src={value} alt="Uploaded" className="w-full h-36 object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button type="button" onClick={() => inputRef.current?.click()} className="bg-white/80 text-black text-xs font-bold px-3 py-1.5 rounded-lg">Change</button>
            <button type="button" onClick={() => onChange("")} className="bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1">
              <X className="h-3 w-3" /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={cn(
            "w-full h-32 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all",
            "border-border hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary",
            uploading && "opacity-50 cursor-not-allowed"
          )}
        >
          {uploading ? (
            <><Loader2 className="h-6 w-6 animate-spin" /><span className="text-xs font-bold">Uploading…</span></>
          ) : (
            <>
              <Upload className="h-6 w-6" />
              <span className="text-xs font-bold">{label}</span>
              <span className="text-[10px] opacity-60">PNG, JPG up to 10MB</span>
            </>
          )}
        </button>
      )}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
}
