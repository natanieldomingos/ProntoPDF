import React from "react";
import { Link, useLocation } from "wouter";
import { Home, FolderOpen, HelpCircle, UserCircle2 } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

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

export default function TopAppBar() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full bg-surface/98 border-b border-outline-variant shadow-elevation-1 backdrop-blur-sm flex items-center h-16 px-6 transition-all duration-300">
      {/* Título */}
      <div className="flex items-center gap-3 mr-8">
        <span className="font-bold text-lg text-primary tracking-tight">ProntoPDF</span>
      </div>
      {/* Navegação */}
      <nav className="flex gap-1 flex-1">
        {items.map(({ href, label, Icon }) => {
          const active = isActive(href, location);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined}>
              <button
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary text-sm font-medium ${
                  active 
                    ? "bg-primary/15 text-primary shadow-elevation-1" 
                    : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
                }`}
                tabIndex={0}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
                <span>{label}</span>
              </button>
            </Link>
          );
        })}
      </nav>
      {/* Usuário */}
      <div className="ml-auto flex items-center gap-3">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all duration-200 hover:shadow-elevation-2">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary font-semibold">{user.email?.[0]?.toUpperCase() ?? "U"}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 animate-scale-in">
              <div className="px-4 py-3 border-b border-outline-variant">
                <div className="font-medium text-sm truncate text-on-surface">{user.email}</div>
              </div>
              <DropdownMenuItem asChild>
                <Link href="/account" className="cursor-pointer">Conta</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/account#preferences" className="cursor-pointer">Preferências</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut} className="text-error cursor-pointer">Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </header>
  );
}
