import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const items = [
  { to: "/admin", label: "Panel", exact: true },
  { to: "/admin/clients", label: "Clientes", exact: false },
  { to: "/admin/programs", label: "Programas", exact: false },
  { to: "/admin/exercises", label: "Ejercicios", exact: false },
] as const;

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-5 py-4 lg:px-10">
          <p className="font-display text-[11px] font-semibold uppercase tracking-[0.4em] text-primary">
            Vanta
          </p>
          <nav className="flex flex-wrap items-center gap-1">
            {items.map((item) => {
              const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-medium",
                    active ? "bg-primary/15 text-primary" : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => void signOut()}>
            <LogOut className="size-4" /> Salir
          </Button>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 py-8 lg:px-10">{children}</main>
    </div>
  );
}
