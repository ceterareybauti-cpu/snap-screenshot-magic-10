import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, BarChart3, Dumbbell, Home, User } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/home", label: "Inicio", icon: Home },
  { to: "/workout", label: "Entrenar", icon: Activity },
  { to: "/progress", label: "Progreso", icon: BarChart3 },
  { to: "/program", label: "Programa", icon: Dumbbell },
  { to: "/profile", label: "Perfil", icon: User },
] as const;

export function ClientShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-md px-4 pt-6">{children}</div>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md">
          {items.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
