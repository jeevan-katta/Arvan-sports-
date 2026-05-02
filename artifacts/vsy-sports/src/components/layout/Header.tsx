import { Bell, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header({ title = "Vsy Sports", showLocation = true }) {
  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border h-14 flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        {showLocation ? (
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Current Location</span>
            <div className="flex items-center text-sm font-semibold">
              <MapPin className="h-3 w-3 mr-1 text-primary" />
              Hyderabad
            </div>
          </div>
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
