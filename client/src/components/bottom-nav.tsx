import React from "react";
import { Link, useLocation } from "wouter";
import { Home, FolderOpen, HelpCircle, UserCircle2 } from "lucide-react";

const items = [
  { href: "/", label: "Início", Icon: Home },
  { href: "/files", label: "Arquivos", Icon: FolderOpen },
  { href: "/account", label: "Conta", Icon: UserCircle2 },
  { href: "/help", label: "Ajuda", Icon: HelpCircle },
] as const;

const isActive = (path: string, current: string) => {
  if (path === "/") return current === "/";
  return current.startsWith(path);
};

export default function BottomNav() {
  const [location] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto max-w-md px-3 py-2 pb-[calc(env(safe-area-inset-bottom,0)+0.5rem)]">
        <div className="grid grid-cols-4 gap-2">
          {items.map(({ href, label, Icon }) => {
            const active = isActive(href, location);
            return (
              <Link key={href} href={href} className="block">
                <div
                  className={[
                    "flex flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs transition-colors",
                    active ? "border-primary bg-primary/5 text-primary" : "border-transparent text-muted-foreground hover:bg-accent",
                  ].join(" ")}
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
