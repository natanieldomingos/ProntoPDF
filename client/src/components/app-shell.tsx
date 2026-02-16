import React from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import BottomNav from "@/components/bottom-nav";
import TopAppBar from "@/components/top-app-bar";

type Props = {
  children: React.ReactNode;
  hideBottomNav?: boolean;
};

export default function AppShell({ children, hideBottomNav }: Props) {
  const isMobile = useIsMobile();

  // Mobile: BottomNav (pb-24 leaves space at bottom)
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <main className="flex-1 overflow-y-auto">
          <div className={hideBottomNav ? "" : "pb-[calc(4rem+env(safe-area-inset-bottom,0))]"}>
            {children}
          </div>
        </main>
        {!hideBottomNav && <BottomNav />}
      </div>
    );
  }

  // Desktop: Top App Bar + main content
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TopAppBar />
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
