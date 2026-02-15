import React from "react";
import { Link, useLocation } from "wouter";
import { Home, FolderOpen, HelpCircle, UserCircle2, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

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

export default function SidebarNav() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();

  return (
    <nav className="fixed left-0 top-0 h-screen w-64 bg-surface border-r border-outline-variant shadow-elevation-1 flex flex-col p-4 gap-6">
      {/* Logo/Branding */}
      <div className="flex items-center gap-2 pt-2">
        <div className="w-10 h-10 rounded-lg bg-primary/90 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-white"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M13 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-8m-1-9h-6l1.5 1.5h4.5v4H7v5h6V8h4V3z" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-headline-small">ProntoPDF</h1>
          <p className="text-xs text-muted-foreground">v1.0</p>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 space-y-1">
        {items.map(({ href, label, Icon }) => {
          const active = isActive(href, location);
          return (
            <Link key={href} href={href} className="block">
              <div
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                  focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
                  ${
                    active
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-on-surface-variant hover:bg-surface-variant"
                  }
                `}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Footer */}
      <div className="space-y-3 border-t border-outline-variant pt-4">
        {user && (
          <div className="px-4 py-3 bg-surface-variant rounded-lg">
            <p className="text-xs text-muted-foreground">Conectado como</p>
            <p className="text-sm font-semibold text-foreground truncate">
              {user.email}
            </p>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className={`
            w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm
            text-on-surface-variant hover:bg-surface-variant transition-colors
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary
          `}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </nav>
  );
}
