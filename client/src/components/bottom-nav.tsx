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
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-outline-variant bg-surface/98 backdrop-blur-sm shadow-elevation-4 transition-all duration-300"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="mx-auto max-w-lg px-0 py-2 pb-[calc(env(safe-area-inset-bottom,0)+0.5rem)]">
        <div className="grid grid-cols-4 gap-1">
          {items.map(({ href, label, Icon }) => {
            const active = isActive(href, location);
            return (
              <Link
                key={href}
                href={href}
                className={`
                  relative flex flex-col items-center justify-center gap-1.5 px-2 py-2.5
                  transition-all duration-300 ease-out
                  focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary
                  outline-offset-0 rounded-lg
                  ${active ? "text-primary" : "text-on-surface-variant hover:text-on-surface"}
                `}
                aria-current={active ? "page" : undefined}
              >
                {/* Active indicator - Bottom line */}
                {active && (
                  <div className="absolute bottom-0 left-2 right-2 h-1 bg-primary rounded-t-full animate-scale-in" />
                )}

                {/* Icon with background */}
                <div
                  className={`
                    relative flex items-center justify-center rounded-full p-2.5
                    transition-all duration-300
                    ${active ? "bg-primary/15 shadow-elevation-1" : "hover:bg-surface-variant/60"}
                  `}
                >
                  <Icon className={`h-6 w-6 transition-all duration-300 ${active ? "scale-110" : "scale-100"}`} strokeWidth={active ? 2.5 : 2} />
                </div>

                {/* Label */}
                <span
                  className={`
                    text-xs font-medium leading-none
                    transition-all duration-300
                    ${active ? "font-semibold text-primary" : "text-on-surface-variant"}
                  `}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
