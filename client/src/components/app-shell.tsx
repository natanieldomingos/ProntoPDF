import React from "react";
import BottomNav from "@/components/bottom-nav";

type Props = {
  children: React.ReactNode;
  hideBottomNav?: boolean;
};

export default function AppShell({ children, hideBottomNav }: Props) {
  return (
    <div className="min-h-screen bg-background">
      <div className={hideBottomNav ? "" : "pb-24"}>{children}</div>
      {!hideBottomNav ? <BottomNav /> : null}
    </div>
  );
}
