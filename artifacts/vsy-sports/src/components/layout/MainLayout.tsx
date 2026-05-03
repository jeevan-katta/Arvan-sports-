import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { PushPrompt } from "@/components/PushPrompt";

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-md bg-background min-h-screen pb-16 relative shadow-2xl">
        {children}
        <BottomNav />
        <PushPrompt />
      </div>
    </div>
  );
}
