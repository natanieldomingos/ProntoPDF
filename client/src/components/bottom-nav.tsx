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
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-outline-variant bg-surface/95 backdrop-blur-md shadow-elevation-3"
      role="navigation"
      aria-label="Navegação principal"
    >
      <div className="mx-auto max-w-lg px-0 py-1 pb-[calc(env(safe-area-inset-bottom,0)+0.25rem)]">
        <div className="grid grid-cols-4 gap-0.5">
          {items.map(({ href, label, Icon }) => {
            const active = isActive(href, location);
            return (
              <Link
                key={href}
                href={href}
                className={`
                  relative flex flex-col items-center justify-center gap-1.5 px-3 py-3
                  transition-all duration-200 ease-out
                  focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-primary
                  outline-offset-0
                  ${active ? "text-primary" : "text-on-surface-variant hover:text-on-surface"}
                `}
                aria-current={active ? "page" : undefined}
              >
                {/* Active indicator */}
                {active && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-primary rounded-b-full animate-in fade-in duration-200" />
                )}

                {/* Icon with Material ripple effect simulation */}
                <div
                  className={`
                    relative flex items-center justify-center rounded-full p-2
                    transition-all duration-200
                    ${active ? "bg-primary/10" : "hover:bg-surface-variant"}
                  `}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.5} />
                </div>

                {/* Label */}
                <span
                  className={`
                    text-xs font-medium leading-none
                    transition-all duration-200
                    ${active ? "font-semibold text-primary" : "text-on-surface-variant text-xs"}
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
