import { Bell, MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGeolocation } from "@/hooks/use-geolocation";

interface HeaderProps {
  title?: string;
  showLocation?: boolean;
}

export function Header({ title = "Vsy Sports", showLocation = true }: HeaderProps) {
  const { city, loading, request, lat } = useGeolocation(true);

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border h-14 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {showLocation ? (
          <button onClick={request} className="flex flex-col text-left">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Current Location</span>
            <div className="flex items-center text-sm font-semibold">
              {loading ? (
                <><Loader2 className="h-3 w-3 mr-1 text-primary animate-spin" /> Locating…</>
              ) : (
                <><MapPin className="h-3 w-3 mr-1 text-primary" />{city ?? "Hyderabad"}</>
              )}
            </div>
          </button>
        ) : (
          <h1 className="text-lg font-display font-bold tracking-wide">{title}</h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-full">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
        </Button>
      </div>
    </header>
  );
}
